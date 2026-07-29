export interface Pagination {
  totalItems: number
  totalPages: number
  previousPage?: number | null
  currentPage: number
  nextPage?: number | null
  lastPage: number
}

export interface ChainInfo {
  chainId: string
  blockTime: number[]
  electionCount: number
  organizationCount: number
  genesisTime: string
  initialHeight: number
  height: number
  blockStoreBase: number
  syncing: boolean
  blockTimestamp: string | number
  transactionCount: number
  validatorCount: number
  voteCount: number
  circuitVersion: string
  maxCensusSize: number
  networkCapacity: number
}

export interface OrganizationSummary {
  organizationID: string
  electionCount: number
}

export interface OrganizationsList {
  organizations: OrganizationSummary[]
  pagination: Pagination
}

export interface OrganizationAccount {
  address: string
  nonce: number
  balance: number
  electionIndex: number
  transfersCount?: number
  feesCount?: number
  infoURL?: string
  metadata?: Record<string, unknown>
  sik?: string
}

export interface ElectionSummary {
  electionId: string
  organizationId: string
  status: string
  startDate: string
  endDate: string
  voteCount: number
  finalResults: boolean
  result?: string[][]
  manuallyEnded: boolean
  chainId: string
}

/**
 * Multilingual string as carried by the Vocdoni metadata schema: a map of
 * language code to text, always with a `default` entry.
 */
export type LocalizedText = { default?: string } & Record<string, string | undefined>

export interface ElectionMetadata {
  title?: LocalizedText | string
  description?: LocalizedText | string
  media?: { header?: string; streamUri?: string }
  questions?: Array<{
    title?: LocalizedText | string
    description?: LocalizedText | string
    choices?: Array<{ title?: LocalizedText | string; value?: number }>
  }>
  [key: string]: unknown
}

export interface Election {
  electionId: string
  organizationId: string
  status: string
  startDate: string
  endDate: string
  voteCount: number
  finalResults: boolean
  result?: string[][]
  manuallyEnded: boolean
  chainId: string
  metadataURL: string
  creationTime: string
  voteMode?: Record<string, unknown>
  electionMode?: Record<string, unknown>
  tallyMode?: Record<string, unknown>
  /** Inline election metadata (title, description, questions) — the only source
   *  of human-readable names anywhere in the API. */
  metadata?: ElectionMetadata
  census?: {
    censusOrigin: string
    censusRoot: string
    postRegisterCensusRoot?: string
    censusURL?: string
    maxCensusSize?: number
  }
}

export interface ElectionsList {
  elections: ElectionSummary[]
  pagination: Pagination
}

export interface Vote {
  txHash?: string
  voteID?: string
  electionID?: string
  voterID?: string
  blockHeight?: number
  transactionIndex?: number
  overwriteCount?: number
  date?: string
  package?: unknown
  weight?: string
  encryptionKeys?: number[]
}

export interface VotesList {
  votes: Vote[]
  pagination: Pagination
}

export interface TransactionMetadata {
  hash: string
  height: number
  index: number
  type: string
  subtype: string
  signer: string
}

export interface TransactionsList {
  transactions: TransactionMetadata[]
  pagination: Pagination
}

export interface GenericTransactionWithInfo {
  tx: unknown
  txInfo: {
    hash: string
    height: number
    index: number
    type: string
    subtype: string
    signer: string
  }
  signature: string
}

export interface Block {
  header: {
    chainId: string
    height: number
    time: string
    proposerAddress: string
    lastBlockId?: { hash: string }
  }
  hash: string
  txCount: number
}

export interface BlockListItem {
  chainId: string
  height: number
  time: string
  hash: string
  proposer: string
  lastBlockHash?: string
  txCount: number
}

export interface BlockList {
  blocks: BlockListItem[]
  pagination: Pagination
}

export interface Validator {
  power: number
  pubKey: string
  address: string
  name: string
  validatorAddress: string
  joinHeight: number
  votes: number
  proposals: number
  score: number
}

export interface ValidatorList {
  validators: Validator[]
}

export interface CountResult {
  count: number
}
