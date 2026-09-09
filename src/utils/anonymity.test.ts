import { describe, expect, it } from 'vitest'
import type { Election } from '~types/api'
import { caProofMeaning, caProofTypeFrom, resolveAnonymity } from '~utils/anonymity'

const election = (census: string | undefined, anonymous?: boolean): Election =>
  ({
    ...(census === undefined ? {} : { census: { censusOrigin: census, censusRoot: '0x00' } }),
    ...(anonymous === undefined ? {} : { voteMode: { anonymous } }),
  }) as Election

/** The sentence this issue exists to stop a blind-CSP election from printing. */
const LINKED = 'linked to the voter identifier'

describe('resolveAnonymity', () => {
  it('reads the zero-knowledge vote mode', () => {
    const r = resolveAnonymity(election('OFF_CHAIN_TREE_WEIGHTED', true))
    expect(r.mechanisms).toEqual(['zk'])
    expect(r.badge).toBe('Anonymous · zero-knowledge')
    expect(r.sentences.map((s) => s.fields)).toEqual(['voteMode.anonymous = true'])
  })

  it('reads blind-CSP anonymity off the census origin, not the vote mode', () => {
    // The regression: `voteMode.anonymous` is false here, yet the ballots are
    // anonymous — and the card used to print the exact opposite.
    const r = resolveAnonymity(election('OFF_CHAIN_CA_V2', false))
    expect(r.mechanisms).toEqual(['blind-csp'])
    expect(r.badge).toBe('Anonymous · blind signature')
    expect(r.sentences.map((s) => s.fields)).toEqual(['census.censusOrigin = OFF_CHAIN_CA_V2'])
    expect(r.sentences.some((s) => s.text.includes(LINKED))).toBe(false)
  })

  it('does not treat the v1 CSP origin as anonymous', () => {
    // `OFF_CHAIN_CA` matches the turnout gauge's /CA|CSP|OFF_CHAIN/ off-chain
    // test, so that regex must never be reused as the anonymity check.
    const r = resolveAnonymity(election('OFF_CHAIN_CA', false))
    expect(r.mechanisms).toEqual([])
    expect(r.anonymous).toBe(false)
    expect(r.badge).toBeUndefined()
    expect(r.sentences.some((s) => s.text.includes(LINKED))).toBe(true)
  })

  it('states both mechanisms without contradicting itself', () => {
    const r = resolveAnonymity(election('OFF_CHAIN_CA_V2', true))
    expect(r.mechanisms).toEqual(['zk', 'blind-csp'])
    expect(r.badge).toBe('Anonymous')
    expect(r.sentences).toHaveLength(2)
    expect(r.sentences.some((s) => s.text.includes(LINKED))).toBe(false)
  })

  it('says nothing when the record carries no anonymity signal at all', () => {
    expect(resolveAnonymity(election('OFF_CHAIN_TREE_WEIGHTED')).sentences).toEqual([])
    expect(resolveAnonymity(election(undefined)).sentences).toEqual([])
    expect(resolveAnonymity(undefined).sentences).toEqual([])
  })
})

describe('caProofTypeFrom', () => {
  // Shape copied from GET /v2/chain/transactions/5944215/0 on api-dev.
  const voteTx = {
    vote: {
      processId: '6be21a5a…',
      proof: { ca: { type: 'ECDSA_BLIND_PIDSALTED', bundle: { address: '7572…' } } },
    },
  }

  it('digs the proof type out of a CSP vote transaction', () => {
    expect(caProofTypeFrom(voteTx)).toBe('ECDSA_BLIND_PIDSALTED')
  })

  it('answers undefined for anything that is not a CSP-proofed vote', () => {
    expect(caProofTypeFrom({ vote: { proof: { arbo: { siblings: '00' } } } })).toBeUndefined()
    expect(caProofTypeFrom({ newProcess: {} })).toBeUndefined()
    expect(caProofTypeFrom(undefined)).toBeUndefined()
    expect(caProofTypeFrom('vote')).toBeUndefined()
  })
})

describe('caProofMeaning', () => {
  it('separates signed from blind-signed authorizations', () => {
    expect(caProofMeaning('ECDSA_PIDSALTED')?.blind).toBe(false)
    expect(caProofMeaning('ECDSA_BLIND_PIDSALTED')?.blind).toBe(true)
  })

  it('never reports an unknown proof type as signed when it says blind', () => {
    expect(caProofMeaning('ECDSA_BLIND_V3')?.blind).toBe(true)
    expect(caProofMeaning('ECDSA_BLIND_V3')?.label).toBe('ECDSA_BLIND_V3')
    expect(caProofMeaning(undefined)).toBeUndefined()
  })
})
