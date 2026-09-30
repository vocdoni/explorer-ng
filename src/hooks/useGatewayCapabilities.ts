import { useQuery } from '@tanstack/react-query'
import { useApi } from '~contexts/ApiContext'
import type { OrganizationsList } from '~types/api'
import { ApiError, fetchJson } from '~utils/http'

/** A `sortBy` value no gateway version accepts. A gateway that parses `sortBy`
 *  rejects it with 400 (`code 4063`); one that predates the parameter treats it
 *  as any other unknown query param and answers 200. That difference is the
 *  probe — it needs no assumption about what the index contains. */
const SORT_PROBE = '__unsupported__'

/**
 * Whether `GET /chain/organizations` orders rows server-side
 * (`?sortBy=electionCount&order=desc`, vocdoni-node #1451).
 *
 * Unlike `/chain/stats` and the `?name=` filter, which the explorer relies on
 * unconditionally, sorting is still feature-detected: a gateway that predates
 * it ignores `sortBy`, and ignoring it is exactly the dangerous failure — the
 * response is a valid 200 in index order, which a caller would then label
 * "most elections". So sorting is asked for only once a gateway has proven it
 * parses the parameter.
 *
 * One `limit=1` request per endpoint per session (`staleTime: Infinity`,
 * deduplicated by `queryKey` across every caller). A failure that is not the
 * expected 400 is a broken gateway, not an answer: it surfaces as an error
 * rather than being cached as "unsupported" forever.
 */
export const useOrgSortSupport = () => {
  const { apiUrl } = useApi()
  const probe = useQuery({
    queryKey: ['org-sort-support', apiUrl],
    queryFn: async () => {
      try {
        await fetchJson(`${apiUrl}/chain/organizations?page=0&limit=1&sortBy=${SORT_PROBE}`)
        return false
      } catch (e) {
        // Any 400 here means the server read `sortBy` and refused the value;
        // an older gateway would have ignored it and returned rows.
        if (e instanceof ApiError && e.status === 400) return true
        throw e
      }
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  })

  return {
    /** True only once the gateway has demonstrably parsed `sortBy`. */
    supported: probe.data === true,
    /** True until the probe settles either way. Callers must not send `sortBy`
     *  (nor render a ranking) before it does. */
    isLoading: probe.isPending,
  }
}

/**
 * Whether `GET /chain/organizations` also ranks by `lastElection`, `voteCount`
 * and `balance`, and carries those values in every row (vocdoni-node #1485).
 *
 * A 200 alone proves nothing: a gateway that predates `sortBy` altogether
 * ignores it and answers in index order. So support needs both the 200 and the
 * `voteCount` field that shipped with these orderings. A 400 is the expected
 * answer of a gateway that sorts but not by these keys.
 */
export const useOrgStatsSortSupport = () => {
  const { apiUrl } = useApi()
  const probe = useQuery({
    queryKey: ['org-stats-sort-support', apiUrl],
    queryFn: async () => {
      try {
        const list = await fetchJson<OrganizationsList>(
          `${apiUrl}/chain/organizations?page=0&limit=1&sortBy=lastElection`
        )
        return list.organizations?.[0]?.voteCount !== undefined
      } catch (e) {
        if (e instanceof ApiError && e.status === 400) return false
        throw e
      }
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  })
  return { supported: probe.data === true, isLoading: probe.isPending }
}

/**
 * Whether `GET /elections` takes `sortBy`/`order` and the `title` filter
 * (vocdoni-node #1485, one release). Same probe as {@link useOrgSortSupport}:
 * a gateway that parses `sortBy` rejects an impossible value with 400, while
 * one that predates it ignores the parameter and answers 200 — and would
 * equally ignore `title`, returning every election as a "match".
 */
export const useElectionSortSupport = () => {
  const { apiUrl } = useApi()
  const probe = useQuery({
    queryKey: ['election-sort-support', apiUrl],
    queryFn: async () => {
      try {
        await fetchJson(`${apiUrl}/elections?page=0&limit=1&sortBy=${SORT_PROBE}`)
        return false
      } catch (e) {
        if (e instanceof ApiError && e.status === 400) return true
        throw e
      }
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  })
  return { supported: probe.data === true, isLoading: probe.isPending }
}
