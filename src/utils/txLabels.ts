/**
 * Raw protocol transaction type tokens are meaningless outside the codebase.
 * Single source of truth for turning them into plain-English labels, plus a
 * loose "family" grouping used to color-code the type column/tag.
 */
export type TxFamily = 'vote' | 'election' | 'account' | 'tokens' | 'other'

interface TxTypeMeaning {
  label: string
  family: TxFamily
}

const TX_TYPES: Record<string, TxTypeMeaning> = {
  newProcess: { label: 'New election', family: 'election' },
  vote: { label: 'Vote cast', family: 'vote' },
  setProcess: { label: 'Election updated', family: 'election' },
  sendTokens: { label: 'Token transfer', family: 'tokens' },
  setAccount: { label: 'Account update', family: 'account' },
  createAccount: { label: 'Account created', family: 'account' },
  mintTokens: { label: 'Tokens minted', family: 'tokens' },
  setSIK: { label: 'Voter key registered', family: 'account' },
  registerSIK: { label: 'Voter key registered', family: 'account' },
}

/** Family -> Tag colorPalette, per the shared vocabulary (vote green, election
 *  blue, account gray, tokens orange). */
const FAMILY_PALETTE: Record<TxFamily, string> = {
  vote: 'green',
  election: 'blue',
  account: 'gray',
  tokens: 'orange',
  other: 'gray',
}

export const txTypeMeaning = (type?: string): TxTypeMeaning => {
  if (!type) return { label: '—', family: 'other' }
  return TX_TYPES[type] ?? { label: type, family: 'other' }
}

export const transactionTypeLabel = (type?: string) => txTypeMeaning(type).label

export const transactionTypePalette = (type?: string) => FAMILY_PALETTE[txTypeMeaning(type).family]

/** All known types, for building a friendly-labeled filter <select>. */
export const TX_TYPE_OPTIONS = Object.entries(TX_TYPES).map(([value, meaning]) => ({
  value,
  label: meaning.label,
}))
