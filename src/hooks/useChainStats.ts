import { useQueries, useQuery } from '@tanstack/react-query'
import { useApi } from '~contexts/ApiContext'
import type { BlockListItem, ElectionsList, TransactionsList } from '~types/api'
import type { TransfersList } from '~hooks/useAccounts'
import { useGatewayCapabilities } from '~hooks/useGatewayCapabilities'
import { useBlocks } from '~hooks/useVoconeApi'
import { transactionTypeLabel } from '~utils/txLabels'
import { fetchJson } from '~utils/http'
import { parseApiDate } from '~utils/format'

const q = (base: string, path: string) => `${base}${path}`

/**
 * Breakdown queries lean on a single property of the API: `pagination.totalItems`
 * respects the list filters. So `?limit=1&type=vote` returns one throwaway row
 * plus an exact total — a full census of the chain for the price of the smallest
 * possible response. There is no aggregation endpoint; this is the cheap
 * substitute for one.
 *
 * Totals move slowly relative to a dashboard glance, so they are cached for five
 * minutes rather than polled at the page refresh interval.
 */
const BREAKDOWN_STALE_MS = 5 * 60 * 1000

export interface BreakdownSlice {
  key: string
  label: string
  value: number
  color: string
}

/** Transaction families follow `~utils/txLabels`: vote green, election blue,
 *  account gray, tokens orange. Two shades per family keep sibling types apart
 *  without introducing a hue the design system does not already use. */
const TX_TYPE_SLICES: Array<{ key: string; color: string }> = [
  { key: 'vote', color: '#22c55e' },
  { key: 'setProcess', color: '#3b82f6' },
  { key: 'newProcess', color: '#60a5fa' },
  { key: 'setAccount', color: '#a1a1aa' },
  { key: 'registerSIK', color: '#d4d4d8' },
  { key: 'sendTokens', color: '#f97316' },
]

/** Status hues mirror `StatusTag`: green voting open, blue results published,
 *  yellow paused, gray closed, red canceled. */
const ELECTION_STATUS_SLICES: Array<{ key: string; label: string; color: string }> = [
  { key: 'READY', label: 'Voting open', color: '#22c55e' },
  { key: 'RESULTS', label: 'Results published', color: '#3b82f6' },
  { key: 'PAUSED', label: 'Paused', color: '#eab308' },
  { key: 'ENDED', label: 'Closed', color: '#a1a1aa' },
  { key: 'CANCELED', label: 'Canceled', color: '#ef4444' },
]

export interface Breakdown {
  slices: BreakdownSlice[]
  total: number
  isLoading: boolean
}

/** Zero-count buckets are dropped rather than rendered: a donut segment of size
 *  zero is invisible anyway, and its legend entry is pure noise. */
const toBreakdown = (
  slices: Array<{ key: string; label: string; color: string }>,
  counts: Array<number | undefined>,
  isLoading: boolean
): Breakdown => {
  const resolved = slices
    .map((slice, i) => ({ ...slice, value: counts[i] ?? 0 }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value)
  return {
    slices: resolved,
    total: resolved.reduce((sum, slice) => sum + slice.value, 0),
    isLoading,
  }
}

/**
 * Every transaction ever recorded, grouped by what it actually did.
 *
 * On a gateway new enough to expose `GET /chain/stats`, this reads straight
 * off `txCountByType` — the single probe already paid for elsewhere covers
 * it, so no further request is made. Older gateways fall back to one tiny
 * `limit=1` request per type (6), and that fan-out only starts once the
 * capability probe itself has settled, so the two paths never race.
 */
export const useTxTypeBreakdown = (): Breakdown => {
  const { apiUrl } = useApi()
  const gateway = useGatewayCapabilities()
  const legacyEnabled = !gateway.isLoading && !gateway.isNew
  const legacy = useQueries({
    queries: TX_TYPE_SLICES.map(({ key }) => ({
      queryKey: ['tx-type-count', apiUrl, key],
      queryFn: async () => {
        const list = await fetchJson<TransactionsList>(q(apiUrl, `/chain/transactions?limit=1&type=${key}`))
        return list.pagination?.totalItems ?? 0
      },
      enabled: legacyEnabled,
      staleTime: BREAKDOWN_STALE_MS,
      gcTime: BREAKDOWN_STALE_MS,
      retry: false,
    })),
    combine: (results) =>
      toBreakdown(
        TX_TYPE_SLICES.map(({ key, color }) => ({ key, label: transactionTypeLabel(key), color })),
        results.map((r) => r.data),
        results.some((r) => r.isLoading)
      ),
  })

  if (gateway.isNew && gateway.stats) {
    return toBreakdown(
      TX_TYPE_SLICES.map(({ key, color }) => ({ key, label: transactionTypeLabel(key), color })),
      TX_TYPE_SLICES.map(({ key }) => gateway.stats?.txCountByType?.[key]),
      false
    )
  }
  return legacy
}

/**
 * Every election ever created, grouped by where it is in its lifecycle.
 *
 * Same feature-detection as {@link useTxTypeBreakdown}: `electionCountByStatus`
 * from `/chain/stats` when available, otherwise one `limit=1` request per
 * status (5), deferred until the capability probe has an answer.
 */
export const useElectionStatusBreakdown = (): Breakdown => {
  const { apiUrl } = useApi()
  const gateway = useGatewayCapabilities()
  const legacyEnabled = !gateway.isLoading && !gateway.isNew
  const legacy = useQueries({
    queries: ELECTION_STATUS_SLICES.map(({ key }) => ({
      queryKey: ['election-status-count', apiUrl, key],
      queryFn: async () => {
        const list = await fetchJson<ElectionsList>(q(apiUrl, `/elections?limit=1&status=${key}`))
        return list.pagination?.totalItems ?? 0
      },
      enabled: legacyEnabled,
      staleTime: BREAKDOWN_STALE_MS,
      gcTime: BREAKDOWN_STALE_MS,
      retry: false,
    })),
    combine: (results) =>
      toBreakdown(
        ELECTION_STATUS_SLICES,
        results.map((r) => r.data),
        results.some((r) => r.isLoading)
      ),
  })

  if (gateway.isNew && gateway.stats) {
    return toBreakdown(
      ELECTION_STATUS_SLICES,
      ELECTION_STATUS_SLICES.map(({ key }) => gateway.stats?.electionCountByStatus?.[key]),
      false
    )
  }
  return legacy
}

export interface ActivityPoint {
  height: number
  txCount: number
  time: string
  /** Seconds since the previous block. `undefined` for the oldest point in the
   *  window, which has no predecessor to measure against. */
  blockTimeSecs?: number
}

export interface BlockActivity {
  points: ActivityPoint[]
  blocks: BlockListItem[]
  totalTxs: number
  busiest: number
  isLoading: boolean
}

/**
 * Recent chain activity, measured in transactions per block.
 *
 * There is no votes-per-day or transactions-per-hour endpoint, and reconstructing
 * one would mean walking six figures of transaction rows. Blocks, however, carry
 * their own `txCount`, so a single list request buys a real time series — just a
 * short one. At ~10s per block, 40 blocks is roughly the last seven minutes of
 * chain, which is what the chart says on its face rather than implying a longer
 * window it cannot support.
 *
 * The same request backs the latest-blocks feed, so the two cost one call between
 * them.
 */
export const useBlockActivity = (limit = 40): BlockActivity => {
  const blocks = useBlocks(0, limit)
  const rows = blocks.data?.blocks ?? []
  // The API returns newest first; a chart reads left-to-right as time passing.
  const sorted = [...rows].sort((a, b) => a.height - b.height)
  const points = sorted.map((b, i) => {
    const prev = sorted[i - 1]
    const curTime = parseApiDate(b.time)
    const prevTime = prev ? parseApiDate(prev.time) : undefined
    const blockTimeSecs =
      curTime && prevTime ? Math.max(0, (curTime.getTime() - prevTime.getTime()) / 1000) : undefined
    return { height: b.height, txCount: b.txCount ?? 0, time: b.time, blockTimeSecs }
  })
  return {
    points,
    blocks: rows,
    totalTxs: points.reduce((sum, p) => sum + p.txCount, 0),
    busiest: points.reduce((max, p) => Math.max(max, p.txCount), 0),
    isLoading: blocks.isLoading,
  }
}

/**
 * Total number of accounts that exist on chain. Distinct from
 * `chain/info.organizationCount`, which counts only the accounts that have
 * created at least one election.
 *
 * Reads `accountCount` off `/chain/stats` when the gateway exposes it —
 * folding this into the same probe used by the breakdown donuts — and falls
 * back to the `limit=1` counting trick on older gateways, again deferred
 * until the probe itself has settled.
 */
export const useAccountCount = () => {
  const { apiUrl } = useApi()
  const gateway = useGatewayCapabilities()
  const legacyEnabled = !gateway.isLoading && !gateway.isNew
  const legacy = useQuery({
    queryKey: ['account-count', apiUrl],
    queryFn: async () => {
      const list = await fetchJson<{ pagination?: { totalItems?: number } }>(q(apiUrl, '/accounts?limit=1'))
      return list.pagination?.totalItems ?? 0
    },
    enabled: legacyEnabled,
    staleTime: BREAKDOWN_STALE_MS,
    gcTime: BREAKDOWN_STALE_MS,
    retry: false,
  })

  if (gateway.isNew && gateway.stats) {
    return { ...legacy, data: gateway.stats.accountCount, isLoading: false, isSuccess: true }
  }
  return legacy
}

/**
 * The last few token transfers, chain-wide. `GET /chain/transfers` already
 * returns amount/from/to/height/timestamp/txHash in one call — no per-account
 * filter, no per-hash enrichment needed, unlike `/accounts/{id}/transfers`.
 * Amounts and parties are immutable once mined, but the *set* of latest rows
 * changes with every new block, so this rides the shared poll interval rather
 * than the hard-cached breakdown queries above.
 */
export const useLatestTransfers = (limit = 5, pollMs?: number) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['latest-transfers', apiUrl, limit],
    queryFn: () => fetchJson<TransfersList>(q(apiUrl, `/chain/transfers?page=0&limit=${limit}`)),
    refetchInterval: pollMs ?? refreshMs,
  })
}
