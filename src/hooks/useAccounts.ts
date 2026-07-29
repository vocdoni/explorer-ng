import { useQuery } from '@tanstack/react-query'
import { useApi } from '~contexts/ApiContext'
import type { OrganizationAccount, Pagination } from '~types/api'
import { fetchJson } from '~utils/http'

const q = (base: string, path: string) => `${base}${path}`

/** Same shape as `OrganizationAccount` — accounts and organizations are the
 *  same underlying resource (`GET /accounts/{address}`), just viewed from
 *  different pages. */
export type Account = OrganizationAccount

export interface Transfer {
  amount: number
  from: string
  to: string
  height: number
  txHash: string
  timestamp: string
}

export interface TransfersList {
  transfers: Transfer[]
  pagination: Pagination
}

export interface Fee {
  cost: number
  from: string
  height: number
  reference: string
  timestamp: string
  txType: string
}

export interface FeesList {
  fees: Fee[]
  pagination: Pagination
}

/** `GET /chain/transactions/cost` — base tx costs, keyed by PascalCase name
 *  (e.g. "NewProcess", "SendTokens"), see `genesis.TxCostNameToTxTypeMap`. */
export interface TxCosts {
  costs: Record<string, number>
}

/** `GET /chain/info/electionPriceFactors` — the k1-k7 election-price formula. */
export interface PriceFactors {
  basePrice: number
  capacity: number
  factors: Record<string, number>
}

/** `GET /accounts/{address}` — an account's balance, nonce and aggregate counters. */
export const useAccount = (address: string) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['account', apiUrl, address],
    queryFn: () => fetchJson<Account>(q(apiUrl, `/accounts/${address}`)),
    enabled: !!address,
    refetchInterval: refreshMs,
  })
}

/** `GET /accounts/{address}/transfers/page/{page}` — paginated token transfers
 *  in and out of this account. */
export const useAccountTransfers = (address: string, page: number) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['account-transfers', apiUrl, address, page],
    queryFn: () => fetchJson<TransfersList>(q(apiUrl, `/accounts/${address}/transfers/page/${page}`)),
    enabled: !!address,
    refetchInterval: refreshMs,
  })
}

/** `GET /accounts/{address}/fees/page/{page}` — paginated fees spent by this account. */
export const useAccountFees = (address: string, page: number) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['account-fees', apiUrl, address, page],
    queryFn: () => fetchJson<FeesList>(q(apiUrl, `/accounts/${address}/fees/page/${page}`)),
    enabled: !!address,
    refetchInterval: refreshMs,
  })
}

/** `GET /chain/transfers` — chain-wide paginated token transfers, optionally
 *  filtered to transfers touching (or sent by, or received by) one account. */
export const useChainTransfers = (page: number, accountId?: string) => {
  const { apiUrl, refreshMs } = useApi()
  const params = new URLSearchParams({ page: String(page), limit: '25' })
  if (accountId) params.set('accountId', accountId)
  return useQuery({
    queryKey: ['chain-transfers', apiUrl, page, accountId],
    queryFn: () => fetchJson<TransfersList>(q(apiUrl, `/chain/transfers?${params.toString()}`)),
    refetchInterval: refreshMs,
  })
}

/** Base transaction costs are protocol constants — they only change on a
 *  chain-parameter transaction, so this is cached hard rather than polled. */
const COSTS_STALE_MS = 5 * 60 * 1000

export const useTxCosts = () => {
  const { apiUrl } = useApi()
  return useQuery({
    queryKey: ['tx-costs', apiUrl],
    queryFn: () => fetchJson<TxCosts>(q(apiUrl, '/chain/transactions/cost')),
    staleTime: COSTS_STALE_MS,
    gcTime: COSTS_STALE_MS,
  })
}

export const useElectionPriceFactors = () => {
  const { apiUrl } = useApi()
  return useQuery({
    queryKey: ['election-price-factors', apiUrl],
    queryFn: () => fetchJson<PriceFactors>(q(apiUrl, '/chain/info/electionPriceFactors')),
    staleTime: COSTS_STALE_MS,
    gcTime: COSTS_STALE_MS,
  })
}

export interface AccountsList {
  accounts: Account[]
  pagination: Pagination
}

const ACCOUNTS_LIST_STALE_MS = 60 * 1000

/** `GET /accounts?page={page}&limit={limit}` — the indexer already sorts this
 *  by balance descending, so page 0 doubles as the "top holders" ranking with
 *  no client-side sort required. */
export const useAccountsList = (page: number, limit = 25) => {
  const { apiUrl, refreshMs } = useApi()
  return useQuery({
    queryKey: ['accounts-list', apiUrl, page, limit],
    queryFn: () => fetchJson<AccountsList>(q(apiUrl, `/accounts?page=${page}&limit=${limit}`)),
    staleTime: ACCOUNTS_LIST_STALE_MS,
    refetchInterval: refreshMs,
  })
}
