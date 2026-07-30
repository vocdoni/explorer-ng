import { useQueries, useQuery } from '@tanstack/react-query'
import { useApi } from '~contexts/ApiContext'
import type {
  Block,
  BlockList,
  ChainInfo,
  CountResult,
  Election,
  ElectionMetadata,
  LocalizedText,
  ElectionsList,
  OrganizationAccount,
  OrganizationsList,
  GenericTransactionWithInfo,
  TransactionMetadata,
  TransactionsList,
  ValidatorList,
  Vote,
  VotesList,
} from '~types/api'
import { ApiError, fetchJson } from '~utils/http'

const q = (base: string, path: string) => `${base}${path}`

export const useChainInfo = () => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({ queryKey: ['chain-info', apiUrl], queryFn: () => fetchJson<ChainInfo>(q(apiUrl, '/chain/info')), refetchInterval: refreshMs })
}

export const useElections = (page: number, limit: number, status?: string, organizationId?: string, electionId?: string) => {
  const { apiUrl, refreshMs } = useApi()
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) params.set('status', status)
  if (organizationId) params.set('organizationId', organizationId)
  if (electionId) params.set('electionId', electionId)
  return useQuery({
    queryKey: ['elections', apiUrl, page, limit, status, organizationId, electionId],
    queryFn: () => fetchJson<ElectionsList>(q(apiUrl, `/elections?${params.toString()}`)),
    refetchInterval: refreshMs,
  })
}

export const useElection = (electionId: string) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['election', apiUrl, electionId],
    queryFn: () => fetchJson<Election>(q(apiUrl, `/elections/${electionId}`)),
    enabled: !!electionId,
    refetchInterval: refreshMs,
  })
}

/** Pick the readable string out of a metadata field that may be a bare string
 *  or a `{ default, en, es, … }` map. */
const localized = (value?: LocalizedText | string): string | undefined => {
  if (!value) return undefined
  if (typeof value === 'string') return value.trim() || undefined
  const preferred = value.default ?? Object.values(value).find((v) => typeof v === 'string' && v.trim())
  return preferred?.trim() || undefined
}

export interface ElectionMeta {
  title?: string
  description?: string
}

export const electionMetaFrom = (metadata?: ElectionMetadata): ElectionMeta => ({
  title: localized(metadata?.title),
  description: localized(metadata?.description),
})

const ELECTION_META_STALE_MS = 30 * 60 * 1000

/**
 * Human-readable title/description for an election. Metadata is immutable once
 * an election is created, so this is cached hard and never polled — unlike the
 * election record itself, which carries the live vote count.
 */
export const useElectionMeta = (electionId?: string) => {
  const { apiUrl } = useApi()
  return useQuery({
    queryKey: ['election-meta', apiUrl, electionId],
    queryFn: async () => {
      const election = await fetchJson<Election>(q(apiUrl, `/elections/${electionId}`))
      return electionMetaFrom(election.metadata)
    },
    enabled: !!electionId,
    staleTime: ELECTION_META_STALE_MS,
    gcTime: ELECTION_META_STALE_MS,
    retry: false,
  })
}

/**
 * Batch-resolves titles for a page of list rows. Each id gets its own cache
 * entry, so a row already rendered elsewhere resolves instantly. The id list is
 * capped because the API has no bulk-metadata endpoint and one page of results
 * would otherwise fan out into an unbounded burst of requests.
 */
export const useElectionTitles = (ids: string[]) => {
  const { apiUrl } = useApi()
  // 24 covers the largest list page (20) plus dashboard panels; react-query
  // deduplicates repeats, so the practical burst stays well below the cap.
  const capped = ids.filter(Boolean).slice(0, 24)

  return useQueries({
    queries: capped.map((id) => ({
      queryKey: ['election-meta', apiUrl, id],
      queryFn: async () => {
        const election = await fetchJson<Election>(q(apiUrl, `/elections/${id}`))
        return electionMetaFrom(election.metadata)
      },
      staleTime: ELECTION_META_STALE_MS,
      gcTime: ELECTION_META_STALE_MS,
      retry: false,
    })),
    combine: (results) => {
      const titles: Record<string, string | undefined> = {}
      capped.forEach((id, i) => {
        titles[id] = results[i]?.data?.title
      })
      return { titles, isLoading: results.some((r) => r.isLoading) }
    },
  })
}

export const useElectionVotes = (electionId: string, page: number, limit: number) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['election-votes', apiUrl, electionId, page, limit],
    queryFn: () => fetchJson<VotesList>(q(apiUrl, `/votes?page=${page}&limit=${limit}&electionId=${electionId}`)),
    enabled: !!electionId,
    refetchInterval: refreshMs,
  })
}

/**
 * Scrutiny and keys are *optional* per election, and the API signals their
 * absence with a hard status rather than an empty body:
 *
 *   GET /elections/{id}/scrutiny -> 500 {"code":5024} until results exist
 *   GET /elections/{id}/keys     -> 404 {"code":4047} unless encrypted
 *
 * Both are the normal case for a live, unencrypted election, so they resolve to
 * null instead of an error. Polling is disabled: re-requesting a known-absent
 * resource every few seconds only produced a stream of console errors.
 */
const optionalResource = async <T>(url: string): Promise<T | null> => {
  try {
    return await fetchJson<T>(url)
  } catch (err) {
    const status = (err as ApiError).status
    if (status === 404 || status === 500) return null
    throw err
  }
}

export const useElectionScrutiny = (electionId: string) => {
  const { apiUrl } = useApi()
  return useQuery({
    queryKey: ['election-scrutiny', apiUrl, electionId],
    queryFn: () => optionalResource<Record<string, unknown>>(q(apiUrl, `/elections/${electionId}/scrutiny`)),
    enabled: !!electionId,
    retry: false,
  })
}

export const useElectionKeys = (electionId: string) => {
  const { apiUrl } = useApi()
  return useQuery({
    queryKey: ['election-keys', apiUrl, electionId],
    queryFn: () => optionalResource<Record<string, unknown>>(q(apiUrl, `/elections/${electionId}/keys`)),
    enabled: !!electionId,
    retry: false,
  })
}

export const useVotes = (page: number, limit: number, electionId?: string) => {
  const { apiUrl, refreshMs } = useApi()
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (electionId) params.set('electionId', electionId)
  return useQuery({
    queryKey: ['votes', apiUrl, page, limit, electionId],
    queryFn: () => fetchJson<VotesList>(q(apiUrl, `/votes?${params.toString()}`)),
    refetchInterval: refreshMs,
  })
}

export const useVote = (voteId: string) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['vote', apiUrl, voteId],
    queryFn: () => fetchJson<Vote>(q(apiUrl, `/votes/${voteId}`)),
    enabled: !!voteId,
    refetchInterval: refreshMs,
  })
}

export const useBlocks = (page: number, limit: number, chainId?: string, hash?: string, proposerAddress?: string) => {
  const { apiUrl, refreshMs } = useApi()
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (chainId) params.set('chainId', chainId)
  if (hash) params.set('hash', hash)
  if (proposerAddress) params.set('proposerAddress', proposerAddress)
  return useQuery({
    queryKey: ['blocks', apiUrl, page, limit, chainId, hash, proposerAddress],
    queryFn: () => fetchJson<BlockList>(q(apiUrl, `/chain/blocks?${params.toString()}`)),
    refetchInterval: refreshMs,
  })
}

export const useBlock = (height: string) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['block', apiUrl, height],
    queryFn: () => fetchJson<Block>(q(apiUrl, `/chain/blocks/${height}`)),
    enabled: !!height,
    refetchInterval: refreshMs,
  })
}

export const useBlockByHash = (hash: string) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['block-by-hash', apiUrl, hash],
    queryFn: () => fetchJson<Block>(q(apiUrl, `/chain/blocks/hash/${hash}`)),
    enabled: !!hash,
    refetchInterval: refreshMs,
  })
}

export const useDateToBlock = (timestamp?: string | number) => {
  const { apiUrl, refreshMs } = useApi()
  const unix = timestamp ? Math.floor(new Date(timestamp).getTime() / 1000) : 0
  return useQuery({
    queryKey: ['date-to-block', apiUrl, unix],
    queryFn: () => fetchJson<{ height: number }>(q(apiUrl, `/chain/dateToBlock/${unix}`)),
    enabled: unix > 0,
    refetchInterval: refreshMs,
  })
}

export const useOrganizations = (page: number, limit: number, organizationId?: string) => {
  const { apiUrl, refreshMs } = useApi()
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (organizationId) params.set('organizationId', organizationId)
  return useQuery({
    queryKey: ['organizations', apiUrl, page, limit, organizationId],
    queryFn: () => fetchJson<OrganizationsList>(q(apiUrl, `/chain/organizations?${params.toString()}`)),
    refetchInterval: refreshMs,
  })
}

export const useOrganization = (organizationId: string) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['organization', apiUrl, organizationId],
    queryFn: () => fetchJson<OrganizationAccount>(q(apiUrl, `/accounts/${organizationId}`)),
    enabled: !!organizationId,
    refetchInterval: refreshMs,
  })
}

export const useTransactions = (page: number, limit: number, height?: string, type?: string, signer?: string) => {
  const { apiUrl, refreshMs } = useApi()
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (height) params.set('height', height)
  if (type) params.set('type', type)
  if (signer) params.set('signer', signer)
  return useQuery({
    queryKey: ['transactions', apiUrl, page, limit, height, type, signer],
    queryFn: () => fetchJson<TransactionsList>(q(apiUrl, `/chain/transactions?${params.toString()}`)),
    refetchInterval: refreshMs,
  })
}

export const useTransaction = (hash: string) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['transaction', apiUrl, hash],
    queryFn: () => fetchJson<GenericTransactionWithInfo>(q(apiUrl, `/chain/transactions/${hash}`)),
    enabled: !!hash,
    refetchInterval: refreshMs,
  })
}

export const useTransactionRef = (hash: string) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['transaction-ref', apiUrl, hash],
    queryFn: () => fetchJson<TransactionMetadata>(q(apiUrl, `/chain/transactions/reference/${hash}`)),
    enabled: !!hash,
    refetchInterval: refreshMs,
  })
}

export const useValidators = () => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({ queryKey: ['validators', apiUrl], queryFn: () => fetchJson<ValidatorList>(q(apiUrl, '/chain/validators')), refetchInterval: refreshMs })
}

export const useTransactionCount = () => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({ queryKey: ['tx-count', apiUrl], queryFn: () => fetchJson<CountResult>(q(apiUrl, '/chain/transactions/count')), refetchInterval: refreshMs })
}

/** Pick the readable string out of a value that may be a bare string or a
 *  `{ default, en, es, … }` map — same shape rule as election metadata, but
 *  kept local to avoid touching the un-exported `localized` above. */
const localizedValue = (value: unknown): string | undefined => {
  if (!value) return undefined
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const preferred = record.default ?? Object.values(record).find((v) => typeof v === 'string' && v.trim())
    return typeof preferred === 'string' ? preferred.trim() || undefined : undefined
  }
  return undefined
}

export interface OrganizationMeta {
  name?: string
  description?: string
  avatar?: string
}

/**
 * Human-readable name/description/avatar for an organization. Unlike
 * elections, this is never available from the list endpoint
 * (`OrganizationSummary` carries only `organizationID`/`electionCount`) — only
 * `/accounts/{id}` returns the `metadata` blob with a `name`. Callers on list
 * pages should not fan this out per-row; it is meant for detail pages that
 * already fetch the account.
 */
export const organizationMetaFrom = (metadata?: Record<string, unknown>): OrganizationMeta => {
  const name = localizedValue(metadata?.name)
  const description = localizedValue(metadata?.description)
  const media = metadata?.media
  const avatar =
    media && typeof media === 'object' && typeof (media as Record<string, unknown>).avatar === 'string'
      ? ((media as Record<string, unknown>).avatar as string)
      : undefined
  return { name, description, avatar }
}

/** Convenience wrapper around `useOrganization` that also resolves the
 *  human-readable metadata for the org detail hero section. */
export const useOrganizationMeta = (organizationId: string) => {
  const org = useOrganization(organizationId)
  return { ...org, meta: organizationMetaFrom(org.data?.metadata) }
}

export interface VoteActivityBucket {
  period: string
  count: number
}

export interface VoteActivityResponse {
  buckets: VoteActivityBucket[]
  totalVotes: number
  bucket: 'hour' | 'day'
}

/**
 * `GET /elections/{id}/votes/activity?bucket=hour|day` — server-side vote
 * timeline aggregation. Replaces the expensive client-side walk of every
 * `/votes` page for gateways that expose the route.
 *
 * Any failure (404 on an unknown election, or a 404/other error on an older
 * gateway that predates the route) is treated identically: the caller falls
 * back to the client-side timeline, so this never retries.
 *
 * `live` gates polling: only elections still accepting votes benefit from a
 * refresh, and polling a closed election's activity would just repeat the
 * same request forever.
 */
export const useVoteActivity = (electionId: string, bucket: 'hour' | 'day', options?: { live?: boolean }) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['election-vote-activity', apiUrl, electionId, bucket],
    queryFn: () => fetchJson<VoteActivityResponse>(q(apiUrl, `/elections/${electionId}/votes/activity?bucket=${bucket}`)),
    enabled: !!electionId,
    refetchInterval: options?.live ? refreshMs : false,
    retry: false,
    // Keep the previous bucket's bars on screen while the new one loads, so
    // toggling Hours/Days doesn't blank the chart during the round trip.
    placeholderData: (prev) => prev,
  })
}
