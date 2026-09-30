import { useQuery } from '@tanstack/react-query'
import { useApi } from '~contexts/ApiContext'
import type { BlockListItem } from '~types/api'
import type { TransfersList } from '~hooks/useAccounts'
import { useBlocks, useChainStats } from '~hooks/useVoconeApi'
import { statusMeaning } from '~components/shared/StatusTag'
import { txTypeMeaning, type TxFamily } from '~utils/txLabels'
import { fetchJson } from '~utils/http'
import { parseApiDate } from '~utils/format'

const q = (base: string, path: string) => `${base}${path}`

export interface BreakdownSlice {
  key: string
  label: string
  value: number
  color: string
}

/** Transaction families follow `~utils/txLabels`: vote green, election blue,
 *  account gray, tokens orange, anything else a darker neutral. Sibling types
 *  within a family take successive shades, so they stay apart without
 *  introducing a hue the design system does not already use. */
const TX_FAMILY_SHADES: Record<TxFamily, string[]> = {
  vote: ['#22c55e', '#86efac'],
  election: ['#3b82f6', '#60a5fa', '#93c5fd'],
  account: ['#a1a1aa', '#d4d4d8', '#e4e4e7'],
  tokens: ['#f97316', '#fdba74', '#fed7aa'],
  other: ['#71717a', '#52525b', '#3f3f46'],
}

/** Status hues mirror `StatusTag`: green voting open, blue results published,
 *  yellow paused, gray closed, red canceled. Labels come from `statusMeaning`. */
const ELECTION_STATUS_COLORS: Record<string, string> = {
  READY: '#22c55e',
  RESULTS: '#3b82f6',
  PAUSED: '#eab308',
  ENDED: '#a1a1aa',
  CANCELED: '#ef4444',
}
const UNKNOWN_STATUS_COLOR = '#71717a'

export interface Breakdown {
  slices: BreakdownSlice[]
  total: number
  isLoading: boolean
  isError: boolean
}

/**
 * Every bucket the endpoint reports becomes a slice — none is filtered through a
 * list of types known in advance, so the ring always sums to the chain-wide
 * total it claims to split (`/chain/stats` omits zero buckets itself, and a
 * zero-size segment would be invisible anyway). Largest first.
 */
const toBreakdown = (
  counts: Record<string, number> | undefined,
  describe: (key: string, rank: number) => { label: string; color: string },
  isLoading: boolean,
  isError: boolean
): Breakdown => {
  const slices = Object.entries(counts ?? {})
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([key, value], rank) => ({ key, value, ...describe(key, rank) }))
  return {
    slices,
    total: slices.reduce((sum, slice) => sum + slice.value, 0),
    isLoading,
    isError,
  }
}

/** Every transaction ever recorded, grouped by what it actually did. */
export const useTxTypeBreakdown = (): Breakdown => {
  const stats = useChainStats()
  const counts = stats.data?.txCountByType
  // Shades are handed out per family in slice order, so the biggest type of
  // each family gets its family's base color.
  const sorted = Object.entries(counts ?? {}).sort(([, a], [, b]) => b - a)
  const shadeOf: Record<string, string> = {}
  const used: Partial<Record<TxFamily, number>> = {}
  sorted.forEach(([key]) => {
    const family = txTypeMeaning(key).family
    const shades = TX_FAMILY_SHADES[family]
    const i = used[family] ?? 0
    shadeOf[key] = shades[i % shades.length]
    used[family] = i + 1
  })
  return toBreakdown(
    counts,
    (key) => ({ label: txTypeMeaning(key).label, color: shadeOf[key] }),
    stats.isLoading,
    stats.isError
  )
}

/** Every election ever created, grouped by where it is in its lifecycle. */
export const useElectionStatusBreakdown = (): Breakdown => {
  const stats = useChainStats()
  return toBreakdown(
    stats.data?.electionCountByStatus,
    (key) => ({ label: statusMeaning(key).label, color: ELECTION_STATUS_COLORS[key] ?? UNKNOWN_STATUS_COLOR }),
    stats.isLoading,
    stats.isError
  )
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
 */
export const useAccountCount = () => {
  const stats = useChainStats()
  return { ...stats, data: stats.data?.accountCount }
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
