import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useApi } from '~contexts/ApiContext'
import type { FeesList } from '~hooks/useAccounts'
import type { Election, TransactionsList, Vote } from '~types/api'
import { parseApiDate } from '~utils/format'
import { ApiError, fetchJson } from '~utils/http'

/** Bin width for the vote-activity chart. The user picks this explicitly;
 *  `defaultGranularity` only chooses the initial value. */
export type Granularity = 'hours' | 'days'

/** Hard ceiling on rendered bins. An hourly view of a 90-day election would be
 *  2 160 bars — unreadable and slow — so it silently falls back to days and the
 *  chart says so. */
export const MAX_BINS = 180

export interface ActivityBin {
  /** ISO timestamp of the bin start, used as the recharts data key. */
  key: string
  /** Short axis label, matching the active unit. */
  label: string
  /** Full timestamp for the tooltip. */
  fullLabel: string
  votes: number
  cumulative: number
}

export interface ActivityBuckets {
  bins: ActivityBin[]
  /** Unit actually rendered — may differ from the requested one (see `downgraded`). */
  unit: Granularity
  requested: Granularity
  /** True when an hourly request was too wide and was rendered as days instead. */
  downgraded: boolean
  /** Units per bin. >1 when even the fallback unit would blow past `MAX_BINS`,
   *  so a decade-long election groups into multi-day blocks instead of losing
   *  its tail. */
  stride: number
  peakIndex: number
  peakVotes: number
}

const advance = (date: Date, unit: Granularity, steps = 1) => {
  const next = new Date(date)
  if (unit === 'hours') next.setHours(next.getHours() + steps)
  else next.setDate(next.getDate() + steps)
  return next
}

/** Snap to the enclosing calendar hour / calendar day in the viewer's local
 *  timezone, so a bin boundary is a round clock time rather than an offset from
 *  whenever the organizer happened to open the election. */
const floorTo = (date: Date, unit: Granularity) => {
  const floored = new Date(date)
  floored.setMinutes(0, 0, 0)
  if (unit === 'days') floored.setHours(0, 0, 0, 0)
  return floored
}

/** Number of calendar bins needed to cover [start, end] at this unit. Computed
 *  by walking the calendar rather than dividing by a fixed millisecond width,
 *  so DST transitions do not shift every later bin by an hour. */
const binCount = (start: Date, end: Date, unit: Granularity) => {
  let cursor = floorTo(start, unit)
  let count = 0
  while (cursor.getTime() <= end.getTime() && count <= MAX_BINS * 20) {
    cursor = advance(cursor, unit)
    count += 1
  }
  return Math.max(1, count)
}

/** Elections shorter than two days read as a flat line at day granularity;
 *  longer ones produce an unreadable forest of hourly bars. */
export const defaultGranularity = (start?: Date, end?: Date): Granularity => {
  if (!start || !end) return 'days'
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  return hours <= 48 ? 'hours' : 'days'
}

const labelFor = (date: Date, unit: Granularity, multiDay: boolean) => {
  if (unit === 'days') return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  if (!multiDay) return time
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${time}`
}

/**
 * Bin sorted vote timestamps into calendar-aligned hour or day buckets spanning
 * the voting window, with a running cumulative total for the overlaid line.
 *
 * `voteDates` must be sorted ascending; the sweep below relies on it.
 */
export const buildActivityBuckets = (
  voteDates: Date[],
  start?: Date,
  end?: Date,
  requested: Granularity = 'days'
): ActivityBuckets => {
  const empty: ActivityBuckets = {
    bins: [],
    unit: requested,
    requested,
    downgraded: false,
    stride: 1,
    peakIndex: -1,
    peakVotes: 0,
  }
  if (!start || !end || end.getTime() <= start.getTime()) return empty

  const downgraded = requested === 'hours' && binCount(start, end, 'hours') > MAX_BINS
  const unit: Granularity = downgraded ? 'days' : requested
  const raw = binCount(start, end, unit)
  // Widen the bin rather than dropping bins: a truncated axis would quietly
  // hide the end of a long election.
  const stride = Math.max(1, Math.ceil(raw / MAX_BINS))
  const total = Math.max(1, Math.ceil(raw / stride))
  const multiDay = end.getTime() - start.getTime() > 24 * 60 * 60 * 1000

  const edges: Date[] = []
  let cursor = floorTo(start, unit)
  for (let i = 0; i < total; i++) {
    edges.push(cursor)
    cursor = advance(cursor, unit, stride)
  }
  const counts = new Array<number>(total).fill(0)

  // Single forward sweep: both the edges and the dates are ascending.
  let bin = 0
  for (const date of voteDates) {
    const t = date.getTime()
    if (t < edges[0].getTime()) continue
    while (bin + 1 < total && t >= edges[bin + 1].getTime()) bin += 1
    counts[bin] += 1
  }

  let running = 0
  const bins = counts.map((votes, i) => {
    running += votes
    return {
      key: edges[i].toISOString(),
      label: labelFor(edges[i], unit, multiDay),
      fullLabel: labelFor(edges[i], unit, true),
      votes,
      cumulative: running,
    }
  })

  const peakVotes = counts.reduce((max, n) => Math.max(max, n), 0)
  return {
    bins,
    unit,
    requested,
    downgraded,
    stride,
    peakIndex: peakVotes > 0 ? counts.indexOf(peakVotes) : -1,
    peakVotes,
  }
}

interface TimelineProgress {
  loaded: number
  total: number
}

/**
 * Walk every `/votes` page for an election, then re-fetch each row that came
 * back without a `date` from `/votes/{id}`.
 *
 * The list endpoint omits `date`, `weight` and `overwriteCount`, so there is no
 * cheaper way to plot when votes were cast. This is why it stays behind a
 * button. Logic preserved verbatim from the original ElectionDetail flow, with
 * a progress callback added.
 */
const loadFullTimeline = async (
  apiUrl: string,
  electionId: string,
  onProgress: (progress: TimelineProgress) => void
): Promise<Vote[]> => {
  const allVotes: Vote[] = []
  let pageCursor = 0
  const limit = 200
  for (;;) {
    const data = await fetchJson<{ votes: Vote[]; pagination?: { nextPage?: number | null; totalItems?: number } }>(
      `${apiUrl}/votes?page=${pageCursor}&limit=${limit}&electionId=${electionId}`
    )
    const pageVotes = data.votes ?? []
    allVotes.push(...pageVotes)
    onProgress({ loaded: allVotes.length, total: data.pagination?.totalItems ?? allVotes.length })
    const nextPage = data.pagination?.nextPage
    if (!Number.isInteger(nextPage) || (nextPage ?? -1) < 0) break
    pageCursor = nextPage as number
  }

  const votesMissingDate = allVotes.filter((v) => !v.date && v.voteID)
  if (votesMissingDate.length === 0) return allVotes

  const dateByVoteID = new Map<string, string>()
  const batchSize = 20
  for (let i = 0; i < votesMissingDate.length; i += batchSize) {
    const batch = votesMissingDate.slice(i, i + batchSize)
    const detailedVotes = await Promise.all(batch.map(async (vote) => fetchJson<Vote>(`${apiUrl}/votes/${vote.voteID}`)))
    detailedVotes.forEach((dv) => {
      if (dv.voteID && dv.date) dateByVoteID.set(dv.voteID, dv.date)
    })
    onProgress({ loaded: Math.min(allVotes.length, i + batch.length), total: votesMissingDate.length })
  }
  return allVotes.map((vote) =>
    !vote.date && vote.voteID && dateByVoteID.has(vote.voteID) ? { ...vote, date: dateByVoteID.get(vote.voteID) } : vote
  )
}

export interface ElectionAnalytics {
  totalVotes: number
  uniqueVoters: number
  overwrittenVotes: number
  /** Votes cast as a share of `census.maxCensusSize` — a provisioned capacity
   *  ceiling, *not* a turnout denominator. */
  capacityPct?: number
  capacity?: number
  avgVotesPerHour: number
  firstVote?: Date
  lastVote?: Date
  earlyVotes: number
  lateVotes: number
  hasWindow: boolean
  start?: Date
  end?: Date
  /** Timestamps recovered from the loaded votes, sorted ascending. */
  voteDates: Date[]
  /** How many of the loaded votes carried a usable timestamp. */
  datedVotes: number
  sampleSize: number
  /** True once the full walk has completed and the chart is no longer a sample. */
  timelineReady: boolean
  isTimelineLoading: boolean
  timelineError?: string
  timelineProgress: TimelineProgress
  loadTimeline: () => void
}

/**
 * Everything the analytics surfaces of ElectionDetail need: the sampled/full
 * vote timeline, the derived participation metrics, and the opt-in loader.
 *
 * `sampleVotes` is the cheap first page already fetched by the page; the full
 * walk replaces it once the user asks for it.
 */
export const useElectionAnalytics = (
  electionId: string,
  election?: Election,
  sampleVotes: Vote[] = []
): ElectionAnalytics => {
  const { apiUrl } = useApi()
  const [enabled, setEnabled] = useState(false)
  const [progress, setProgress] = useState<TimelineProgress>({ loaded: 0, total: 0 })

  const timeline = useQuery({
    queryKey: ['election-timeline', apiUrl, electionId],
    queryFn: () => loadFullTimeline(apiUrl, electionId, setProgress),
    enabled: enabled && !!electionId,
    // The walk is expensive and the answer only grows; never refetch on
    // remount or tab switch.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const timelineReady = !!timeline.data
  const votesForTimeline = useMemo(() => timeline.data ?? sampleVotes, [timeline.data, sampleVotes])

  return useMemo(() => {
    const start = parseApiDate(election?.startDate)
    const end = parseApiDate(election?.endDate)
    const hasWindow = !!start && !!end && end.getTime() > start.getTime()

    const voteDates = votesForTimeline
      .map((v) => parseApiDate(v.date))
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())

    const uniqueVoters = new Set(votesForTimeline.map((v) => v.voterID).filter(Boolean)).size
    const overwrittenVotes = votesForTimeline.filter((v) => (v.overwriteCount ?? 0) > 0).length
    const durationHours = hasWindow ? Math.max(0.01, (end!.getTime() - start!.getTime()) / (1000 * 60 * 60)) : 0
    const totalVotes = election?.voteCount ?? votesForTimeline.length
    const capacity = election?.census?.maxCensusSize
    const capacityPct = capacity ? (totalVotes / Math.max(1, capacity)) * 100 : undefined

    const mid = hasWindow ? start!.getTime() + (end!.getTime() - start!.getTime()) / 2 : 0
    const timelineError = timeline.error
      ? timeline.error instanceof ApiError
        ? `Could not compute full timeline (${timeline.error.status ?? 'request error'})`
        : 'Could not compute full timeline'
      : undefined

    return {
      totalVotes,
      uniqueVoters,
      overwrittenVotes,
      capacityPct,
      capacity,
      avgVotesPerHour: durationHours > 0 ? totalVotes / durationHours : 0,
      firstVote: voteDates[0],
      lastVote: voteDates[voteDates.length - 1],
      earlyVotes: hasWindow ? voteDates.filter((d) => d.getTime() <= mid).length : 0,
      lateVotes: hasWindow ? voteDates.filter((d) => d.getTime() > mid).length : 0,
      hasWindow,
      start,
      end,
      voteDates,
      datedVotes: voteDates.length,
      sampleSize: votesForTimeline.length,
      timelineReady,
      isTimelineLoading: timeline.isFetching,
      timelineError,
      timelineProgress: progress,
      loadTimeline: () => setEnabled(true),
    }
  }, [election, votesForTimeline, timeline.error, timeline.isFetching, timelineReady, progress])
}

/** `GET /chain/fees/reference/{electionId}/page/{p}` — the exact per-election
 *  cost breakdown. `reference` is the election id for election txs, but an IPFS
 *  URI for account-metadata txs, so rows are filtered defensively. */
export const useElectionFees = (electionId: string, page = 0) => {
  const { apiUrl } = useApi()
  return useQuery({
    queryKey: ['election-fees', apiUrl, electionId, page],
    queryFn: async () => {
      try {
        return await fetchJson<FeesList>(`${apiUrl}/chain/fees/reference/${electionId}/page/${page}`)
      } catch (err) {
        // No fees recorded reads as a 404/500 rather than an empty list.
        const status = (err as ApiError).status
        if (status === 404 || status === 500) return null
        throw err
      }
    },
    enabled: !!electionId,
    retry: false,
  })
}

/**
 * Best-effort block height at which this election's encryption keys were
 * revealed.
 *
 * There is no endpoint mapping an election to its key-reveal transactions, so
 * this probes the handful of blocks right after the `set_process_status` fee
 * (the close moment) for `reveal_process_keys` transactions. It is bounded to
 * a few requests, only runs for encrypted elections, and resolves to `null`
 * rather than erroring when the window turns up nothing.
 */
export const useKeyRevealHeight = (encrypted: boolean, closeHeight?: number) => {
  const { apiUrl } = useApi()
  return useQuery({
    queryKey: ['election-key-reveal', apiUrl, closeHeight],
    queryFn: async () => {
      for (let offset = 1; offset <= 5; offset++) {
        try {
          const list = await fetchJson<TransactionsList>(
            `${apiUrl}/chain/transactions?height=${(closeHeight ?? 0) + offset}&limit=20`
          )
          const found = (list.transactions ?? []).find((tx) => tx.subtype === 'reveal_process_keys')
          if (found) return { height: found.height, hash: found.hash }
        } catch {
          // A missing/empty block is expected while scanning; keep probing.
        }
      }
      return null
    },
    enabled: encrypted && !!closeHeight,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })
}
