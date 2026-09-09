import { useQuery } from '@tanstack/react-query'
import { useApi } from '~contexts/ApiContext'
import { ApiError, fetchJson } from '~utils/http'

export interface ChainStats {
  txCountByType: Record<string, number>
  electionCountByStatus: Record<string, number>
  accountCount: number
  electionCount: number
  voteCount: number
}

/**
 * Single, session-cached probe for `GET /chain/stats` — the aggregate/counts
 * endpoint that only new gateways expose (older ones answer 404/error). This
 * is the one detection point the rest of the app feature-detects against:
 * once resolved, hooks reuse `isNew` instead of each running their own
 * probe, so a single request replaces the eleven `limit=1` breakdown calls
 * that used to stand in for a missing aggregation endpoint.
 *
 * React Query already dedupes by `queryKey`, so every caller across the app
 * shares this one in-flight/cached request regardless of how many
 * components call the hook — "once per session" falls out of that for free.
 * `retry: false` + `staleTime: Infinity` mean an old gateway is asked
 * exactly once, not re-probed on every remount.
 */
export const useGatewayCapabilities = () => {
  const { apiUrl } = useApi()
  const stats = useQuery({
    queryKey: ['chain-stats', apiUrl],
    queryFn: () => fetchJson<ChainStats>(`${apiUrl}/chain/stats`),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  })

  return {
    /** True once the probe has confirmed the gateway exposes `/chain/stats`.
     *  False while unresolved *and* on confirmed-old gateways alike — callers
     *  that need to distinguish "still checking" from "known old" should also
     *  read `isLoading`. */
    isNew: stats.isSuccess,
    isLoading: stats.isFetching && !stats.isSuccess && !stats.isError,
    stats: stats.data,
  }
}

/** A `sortBy` value no gateway version accepts. A gateway that parses `sortBy`
 *  rejects it with 400 (`code 4063`); one that predates the parameter treats it
 *  as any other unknown query param and answers 200. That difference is the
 *  probe — it needs no assumption about what the index contains. */
const SORT_PROBE = '__unsupported__'

/**
 * Whether `GET /chain/organizations` orders rows server-side
 * (`?sortBy=electionCount&order=desc`, vocdoni-node #1451).
 *
 * This cannot ride on {@link useGatewayCapabilities}: `/chain/stats` and the
 * `?name=` filter shipped before sorting did, so a gateway can be "new" by that
 * probe and still ignore `sortBy`. And ignoring it is exactly the dangerous
 * failure — the response is a valid 200 in index order, which a caller would
 * then label "most elections". So sorting is asked for only once a gateway has
 * proven it parses the parameter.
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
