import type { Election } from '~types/api'

/**
 * The two unrelated mechanisms that unlink a Vocdoni ballot from the voter that
 * cast it.
 *
 * They are not variants of one setting, which is why reading only the first one
 * silently mislabels every election that uses the second:
 *
 * - `zk` is a **vote mode**: `voteMode.anonymous`, a zero-knowledge proof of
 *   census membership carried inside the vote transaction.
 * - `blind-csp` is a **census origin**: the credential service provider signs a
 *   blinded authorization request, so it authorises a ballot it cannot read and
 *   keeps no record tying the on-chain `voterID` — an ephemeral address it never
 *   saw — to the person it checked.
 *
 * Both can be set on the same election, so this resolves to a list rather than
 * to one label.
 */
export type AnonymityMechanism = 'zk' | 'blind-csp'

/**
 * The CSP census origin whose authorizations are blind-signed.
 *
 * Two caveats this constant exists to pin down, both verified against
 * vocdoni-node rather than assumed:
 *
 * 1. `OFF_CHAIN_CA` (v1) must **not** be treated as blind. Note that the
 *    turnout gauge's `/CA|CSP|OFF_CHAIN/` off-chain test matches both origins
 *    and several non-CSP ones, so it is not reusable as an anonymity check.
 * 2. The origin is strong evidence, not a protocol guarantee. `vochain/
 *    transaction/proof.go` routes both CA origins to the same `ProofVerifierCSP`
 *    — `V2` only selects a different salt derivation (per-process instead of the
 *    legacy per-organization one) — and that verifier accepts all four
 *    `ProofCA` types under either origin. Blindness is therefore only
 *    authoritative *per vote*, in `proof.ca.type`; see {@link caProofMeaning},
 *    which the vote page renders for exactly that reason. Every CSP election
 *    sampled on the public dev and LTS gateways agrees with the mapping below
 *    (20 v1 elections signed, 4 v2 elections blind-signed), so the origin is the
 *    right election-level reading — it just cannot be the only one offered.
 */
const BLIND_CSP_ORIGIN = 'OFF_CHAIN_CA_V2'

/** A statement about this election, and the raw fields it was derived from. */
export interface AnonymitySentence {
  text: string
  fields: string
}

interface MechanismCopy {
  /** Qualifier after "Anonymous" in the badge — names the technology. */
  badge: string
  /** Long-form explanation, for the badge tooltip. */
  description: string
  sentence: AnonymitySentence
}

/**
 * The single source of truth for anonymity copy. Both guarantees are real but
 * different, and a reader who cannot tell which one is in force cannot judge
 * what the chain does and does not reveal — so no call site paraphrases these.
 */
const MECHANISMS: Record<AnonymityMechanism, MechanismCopy> = {
  zk: {
    badge: 'zero-knowledge',
    description:
      'Voters proved they were on the census with a zero-knowledge proof, which reveals nothing beyond membership. Nothing on chain ties a ballot to the voter that cast it.',
    sentence: {
      text: 'Voters proved eligibility anonymously with a zero-knowledge proof, so ballots are not linked to an identity.',
      fields: 'voteMode.anonymous = true',
    },
  },
  'blind-csp': {
    badge: 'blind signature',
    description:
      'The census authority authorized each ballot with a blind signature: it signed a blinded request, so it never saw the ballot or the address that cast it and holds no link between a voter and their vote.',
    sentence: {
      text: 'The census authority authorized each ballot with a blind signature — it never saw the ballot or the address that cast it, so it holds no record linking a voter to their vote.',
      fields: `census.censusOrigin = ${BLIND_CSP_ORIGIN}`,
    },
  },
}

/** Printed only once both mechanisms have been ruled out. */
const SIGNED_SENTENCE: AnonymitySentence = {
  text: 'Voters signed their ballots, so each vote is linked to the voter identifier that cast it.',
  fields: 'voteMode.anonymous = false',
}

export interface AnonymityReading {
  /** Every mechanism in force, in the order they are explained. */
  mechanisms: AnonymityMechanism[]
  anonymous: boolean
  /** Badge text, `undefined` when the ballots are not anonymous. */
  badge?: string
  /** Badge tooltip: one paragraph per mechanism, so two never contradict. */
  description?: string
  /** What the ballot-config card should print; empty when nothing is known. */
  sentences: AnonymitySentence[]
}

const EMPTY: AnonymityReading = { mechanisms: [], anonymous: false, sentences: [] }

/**
 * Resolve how — and whether — this election's ballots are anonymous.
 *
 * The negative statement is only made when `voteMode.anonymous` is explicitly
 * `false`: an election record that omits the flag entirely says nothing, and
 * inventing "not anonymous" from its absence is the one wrong answer here.
 */
export const resolveAnonymity = (election?: Election): AnonymityReading => {
  if (!election) return EMPTY

  const mechanisms: AnonymityMechanism[] = []
  if (election.voteMode?.anonymous === true) mechanisms.push('zk')
  if (election.census?.censusOrigin === BLIND_CSP_ORIGIN) mechanisms.push('blind-csp')

  if (mechanisms.length === 0) {
    return {
      ...EMPTY,
      sentences: election.voteMode?.anonymous === false ? [SIGNED_SENTENCE] : [],
    }
  }

  const copy = mechanisms.map((m) => MECHANISMS[m])
  return {
    mechanisms,
    anonymous: true,
    // Two mechanisms make for a badge too long to sit beside a status pill and
    // a title; the tooltip names both.
    badge: copy.length === 1 ? `Anonymous · ${copy[0].badge}` : 'Anonymous',
    description: copy.map((c) => c.description).join(' '),
    sentences: copy.map((c) => c.sentence),
  }
}

interface CaProofMeaning {
  label: string
  description: string
  blind: boolean
}

/**
 * `proof.ca.type` — how the census authority authorized one ballot.
 *
 * This is the authoritative per-vote answer the election record cannot give:
 * `PIDSALTED` binds the authorization to this election, and `BLIND` is what
 * makes it unlinkable. Unknown types fall back to the `BLIND` substring rather
 * than to a claim, so a proof type added later is never reported as signed.
 */
const CA_PROOF_TYPES: Record<string, CaProofMeaning> = {
  ECDSA: {
    label: 'Signed by the census authority',
    description:
      'The authority signed this voter’s authorization directly, so it saw the address it authorized and can link it to the person it checked.',
    blind: false,
  },
  ECDSA_PIDSALTED: {
    label: 'Signed by the census authority, bound to this election',
    description:
      'The authority signed this voter’s authorization with a key salted for this election, so the authorization cannot be reused elsewhere. It still saw the address it authorized.',
    blind: false,
  },
  ECDSA_BLIND: {
    label: 'Blind-signed by the census authority',
    description:
      'The authority signed a blinded request, so it never saw this ballot or the address that cast it and holds no link between this vote and a person.',
    blind: true,
  },
  ECDSA_BLIND_PIDSALTED: {
    label: 'Blind-signed by the census authority, bound to this election',
    description:
      'The authority signed a blinded request with a key salted for this election, so the authorization cannot be reused elsewhere and the authority never saw this ballot or the address that cast it.',
    blind: true,
  },
}

export const caProofMeaning = (type?: string): CaProofMeaning | undefined => {
  if (!type) return undefined
  const known = CA_PROOF_TYPES[type]
  if (known) return known
  const blind = type.toUpperCase().includes('BLIND')
  return {
    label: type,
    description: blind
      ? 'A blind census-authority signature: the authority never saw this ballot or the address that cast it.'
      : 'A census-authority proof type this explorer does not have a plain-English reading for.',
    blind,
  }
}

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined

/**
 * Dig `tx.vote.proof.ca.type` out of a decoded transaction.
 *
 * `GenericTransactionWithInfo.tx` is deliberately `unknown` — it holds any of a
 * dozen transaction shapes — so this walks it defensively and answers
 * `undefined` for every transaction that is not a CSP-proofed vote.
 */
export const caProofTypeFrom = (tx: unknown): string | undefined => {
  const ca = record(record(record(record(tx)?.vote)?.proof)?.ca)
  return typeof ca?.type === 'string' && ca.type ? ca.type : undefined
}
