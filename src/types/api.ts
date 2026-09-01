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
  /** Optional: only present on gateways new enough to inline org metadata
   *  straight into the list row (see `useGatewayCapabilities`). */
  name?: string
  avatar?: string
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
  /** Optional: only present on gateways new enough to inline the metadata
   *  title straight into the list row (see `useGatewayCapabilities`). */
  title?: string
}

/**
 * Multilingual string as carried by the Vocdoni metadata schema: a map of
 * language code to text, always with a `default` entry.
 */
export type LocalizedText = { default?: string } & Record<string, string | undefined>

/**
 * The election-type discriminator the creating SDK writes into the metadata.
 *
 * This is the only authoritative statement of how an election's ballots were laid
 * out — `tallyMode` alone cannot tell a pick-slot multichoice from an approval
 * ballot, since both can present as `maxValue = 1`. `properties` is creator-written
 * JSON whose shape depends on `name`, so read it through narrowing, never as a
 * discriminated union.
 */
export interface ElectionMetadataType {
  name?: string
  properties?: Record<string, unknown>
}

export interface ElectionMetadata {
  title?: LocalizedText | string
  description?: LocalizedText | string
  media?: { header?: string; streamUri?: string }
  type?: ElectionMetadataType
  questions?: Array<{
    title?: LocalizedText | string
    description?: LocalizedText | string
    /** `value` is the *encoded* value only when it fits the wire alphabet
     *  (`0..tallyMode.maxValue`); some metadata carries 1-based display labels
     *  here instead. See `wireValuesUsable` in `~utils/ballotResults`. */
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
  /** The raw results histogram: `result[field][value]`. A row is a ballot *field*,
   *  not a question, and a column is a *value*, not a choice — how the two collapse
   *  into a per-choice tally depends on the ballot type. See `~utils/ballotResults`. */
  result?: string[][] | null
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
  /** Optional: block height/tx hash of the `reveal_process_keys` transaction,
   *  populated only on gateways that index election->key-reveal linkage (see
   *  `useGatewayCapabilities`). Absent elsewhere, including on unencrypted
   *  elections that never reveal keys. */
  keyRevealHeight?: number
  keyRevealTxHash?: string
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
  /** Optional: RFC3339 timestamp of the block this vote was sealed into, only
   *  on gateways new enough to inline it into list rows (see
   *  `useGatewayCapabilities`). List rows otherwise carry no timestamp at
   *  all — `date` is a detail-endpoint-only field. */
  blockTime?: string
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
