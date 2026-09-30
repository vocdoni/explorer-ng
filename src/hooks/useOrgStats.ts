import { useQueries } from '@tanstack/react-query'
import { useApi } from '~contexts/ApiContext'
import { organizationMetaFrom, type OrganizationMeta } from '~hooks/useVoconeApi'
import type { OrganizationAccount } from '~types/api'
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
