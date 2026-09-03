import { useQueries, useQuery } from '@tanstack/react-query'
import { useApi } from '~contexts/ApiContext'
import { organizationMetaFrom, type OrganizationMeta } from '~hooks/useVoconeApi'
import type { OrganizationAccount, OrganizationsList, OrganizationSummary } from '~types/api'
import { fetchJson } from '~utils/http'

const q = (base: string, path: string) => `${base}${path}`

// Slowly-moving account fields (balance, nonce, activity counters, metadata) —
// a page visit refresh is enough, no need to poll faster than that.
const ORG_STATS_STALE_MS = 5 * 60 * 1000

export interface OrgStats extends OrganizationMeta {
  balance?: number
  nonce?: number
  transfersCount?: number
  feesCount?: number
}

/**
 * Batch-resolves per-organization account stats (balance, nonce, activity
 * counters) and metadata (name/avatar) for a page of list rows, mirroring
 * `useElectionTitles`. Each id gets its own cache entry so a row already
 * rendered elsewhere (e.g. the org detail page) resolves instantly.
 *
 * There is no bulk endpoint — `GET /chain/organizations` returns only
 * `organizationID`/`electionCount` — so this fans out one `/accounts/{id}`
 * request per row. The id list is capped to bound that fan-out, and this
 * never polls: these numbers move slowly, so a page visit refresh suffices.
 */
export const useOrgStats = (ids: string[]) => {
  const { apiUrl } = useApi()
  // 24 covers the largest list page (20) with headroom; react-query
  // deduplicates repeats across pages/other views of the same organization.
  const capped = ids.filter(Boolean).slice(0, 24)

  return useQueries({
    queries: capped.map((id) => ({
      queryKey: ['organization', apiUrl, id],
      queryFn: () => fetchJson<OrganizationAccount>(q(apiUrl, `/accounts/${id}`)),
      staleTime: ORG_STATS_STALE_MS,
      gcTime: ORG_STATS_STALE_MS,
      retry: false,
      refetchInterval: false as const,
    })),
    combine: (results) => {
      const stats: Record<string, OrgStats | undefined> = {}
      capped.forEach((id, i) => {
        const account = results[i]?.data
        if (!account) return
        stats[id] = {
          balance: account.balance,
          nonce: account.nonce,
          transfersCount: account.transfersCount,
          feesCount: account.feesCount,
          ...organizationMetaFrom(account.metadata),
        }
      })
      return { stats, capped, isLoading: results.some((r) => r.isLoading) }
    },
  })
}

/** Number of list pages swept when a text query is active, and their size. */
export const ORG_SEARCH_PAGES = 8
export const ORG_SEARCH_PAGE_SIZE = 25
/** How many organizations a name query can reach. */
export const ORG_SEARCH_DEPTH = ORG_SEARCH_PAGES * ORG_SEARCH_PAGE_SIZE

/** Case- and accent-insensitive form, so "plataforma" finds "Plataforma per la Llengua". */
export const foldForSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export interface OrgSearchMatch {
  org: OrganizationSummary
  stats?: OrgStats
}

/**
 * Searches organizations by their human-readable name.
 *
 * The chain index has no name column: `GET /chain/organizations` filters on a
 * hex substring of the organization ID only, and names live in off-chain
 * metadata reachable exclusively through `/accounts/{id}`. So a name search has
 * to be assembled here — sweep the first {@link ORG_SEARCH_DEPTH} organizations
 * of the index, resolve each one's metadata, and match locally.
 *
 * That is a bounded approximation, not a complete search, and the UI says so.
 * Every account lookup reuses the same cache entry as {@link useOrgStats}, so a
 * row already rendered costs nothing and no request is repeated within the
 * stale window.
 */
export const useOrgNameSearch = (query: string, gate = true) => {
  const { apiUrl } = useApi()
  const needle = foldForSearch(query)
  const active = needle.length > 0 && gate

  const directory = useQueries({
    queries: Array.from({ length: ORG_SEARCH_PAGES }, (_, page) => ({
      queryKey: ['organizations', apiUrl, page, ORG_SEARCH_PAGE_SIZE, undefined],
      queryFn: () =>
        fetchJson<OrganizationsList>(q(apiUrl, `/chain/organizations?page=${page}&limit=${ORG_SEARCH_PAGE_SIZE}`)),
      enabled: active,
      staleTime: ORG_STATS_STALE_MS,
      gcTime: ORG_STATS_STALE_MS,
      retry: false,
      refetchInterval: false as const,
    })),
    combine: (results) => ({
      orgs: results.flatMap((r) => r.data?.organizations ?? []),
      isLoading: results.some((r) => r.isPending && r.fetchStatus !== 'idle'),
    }),
  })

  const ids = directory.orgs.map((o) => o.organizationID)

  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['organization', apiUrl, id],
      queryFn: () => fetchJson<OrganizationAccount>(q(apiUrl, `/accounts/${id}`)),
      enabled: active,
      staleTime: ORG_STATS_STALE_MS,
      gcTime: ORG_STATS_STALE_MS,
      retry: false,
      refetchInterval: false as const,
    })),
    combine: (results) => {
      const matches: OrgSearchMatch[] = []
      ids.forEach((_, i) => {
        const account = results[i]?.data
        if (!account) return
        const stats: OrgStats = {
          balance: account.balance,
          nonce: account.nonce,
          transfersCount: account.transfersCount,
          feesCount: account.feesCount,
          ...organizationMetaFrom(account.metadata),
        }
        if (!stats.name || !foldForSearch(stats.name).includes(needle)) return
        const org = directory.orgs[i]
        if (org) matches.push({ org, stats })
      })
      return {
        active,
        matches,
        scanned: ids.length,
        // Resolving names is the slow half; report progress across both stages
        // so the page can keep a spinner up until the answer is trustworthy.
        isLoading: directory.isLoading || results.some((r) => r.isPending && r.fetchStatus !== 'idle'),
      }
    },
  })
}

/**
 * Name search on gateways new enough to filter `/chain/organizations` by
 * `?name=` server-side (see `useGatewayCapabilities`) — one request instead
 * of the up-to-{@link ORG_SEARCH_DEPTH}-organization sweep in
 * {@link useOrgNameSearch}. Only call this once the gateway is known-new;
 * an older gateway would silently ignore the filter and return everything.
 */
export const useOrgServerSearch = (query: string, gate = true) => {
  const { apiUrl } = useApi()
  const needle = query.trim()
  const active = needle.length > 0 && gate

  const result = useQuery({
    queryKey: ['organizations-search', apiUrl, needle],
    queryFn: () =>
      fetchJson<OrganizationsList>(
        q(apiUrl, `/chain/organizations?page=0&limit=${ORG_SEARCH_PAGE_SIZE}&name=${encodeURIComponent(needle)}`)
      ),
    enabled: active,
    staleTime: ORG_STATS_STALE_MS,
    gcTime: ORG_STATS_STALE_MS,
    retry: false,
    refetchInterval: false as const,
  })

  return {
    active,
    orgs: result.data?.organizations ?? [],
    isLoading: result.isLoading,
  }
}

/**
 * Page size for a full-index sweep. `GET /chain/organizations` caps `limit` at
 * 100 server-side — asking for 500 or 1000 still returns 100 — so this is the
 * fewest requests the whole index can be read in.
 */
export const ORG_INDEX_PAGE_SIZE = 100
/** Hard ceiling on a full-index sweep, in requests. */
export const ORG_INDEX_MAX_PAGES = 12
/** How many organizations a sweep can reach before it truncates. */
export const ORG_INDEX_DEPTH = ORG_INDEX_PAGE_SIZE * ORG_INDEX_MAX_PAGES

/**
 * The organization index, sorted by election count.
 *
 * `GET /chain/organizations` returns rows in the index's own order, which is
 * neither election-count nor anything else a reader would recognise, and it
 * accepts no ordering parameter — `sort`, `orderBy` and `sortBy` are all
 * silently ignored, like any unknown query param. So *any* "most elections"
 * claim has to be assembled from the whole index here: sorting one page of the
 * response ranks an arbitrary window, not the chain. On the public LTS gateway
 * page 0 of 275 organizations tops out at 17 elections while the real leader
 * has 569.
 *
 * Page 0 is fetched first for `pagination.lastPage`, then the remaining pages
 * fan out in parallel — three requests for today's index. The sweep is capped
 * at {@link ORG_INDEX_MAX_PAGES} requests; past that `truncated` is set so
 * callers can say the ranking only covers the first {@link ORG_INDEX_DEPTH}
 * organizations rather than implying a complete one. Each page shares its
 * cache entry with {@link useOrganizations}, and the index moves slowly enough
 * that this never polls.
 */
export const useRankedOrganizations = (gate = true) => {
  const { apiUrl } = useApi()

  const pageQuery = (page: number, enabled: boolean) => ({
    queryKey: ['organizations', apiUrl, page, ORG_INDEX_PAGE_SIZE, undefined, undefined],
    queryFn: () =>
      fetchJson<OrganizationsList>(q(apiUrl, `/chain/organizations?page=${page}&limit=${ORG_INDEX_PAGE_SIZE}`)),
    enabled,
    staleTime: ORG_STATS_STALE_MS,
    gcTime: ORG_STATS_STALE_MS,
    refetchInterval: false as const,
  })

  const first = useQuery(pageQuery(0, gate))

  // `lastPage` is the 0-based index of the final page, so page 0 alone means
  // lastPage === 0 and no follow-up requests.
  const lastPage = first.data?.pagination?.lastPage ?? 0
  const reachable = Math.min(lastPage, ORG_INDEX_MAX_PAGES - 1)

  const rest = useQueries({
    queries: Array.from({ length: Math.max(0, reachable) }, (_, i) => pageQuery(i + 1, gate && !!first.data)),
    combine: (results) => ({
      organizations: results.flatMap((r) => r.data?.organizations ?? []),
      isLoading: results.some((r) => r.isPending && r.fetchStatus !== 'idle'),
    }),
  })

  const rows = [...(first.data?.organizations ?? []), ...rest.organizations]
  // Ties broken on the id so the order cannot jitter between refetches.
  const organizations = rows.sort(
    (a, b) => b.electionCount - a.electionCount || a.organizationID.localeCompare(b.organizationID)
  )

  return {
    organizations,
    totalItems: first.data?.pagination?.totalItems ?? organizations.length,
    truncated: lastPage > ORG_INDEX_MAX_PAGES - 1,
    isLoading: first.isLoading || rest.isLoading,
    isError: first.isError,
  }
}
