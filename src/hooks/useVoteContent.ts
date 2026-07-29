import * as blakeNamespace from 'blakejs'
import { useCallback, useMemo, useState } from 'react'
import * as naclNamespace from 'tweetnacl'
import { useElectionKeys } from '~hooks/useVoconeApi'
import type { Election, ElectionMetadata, LocalizedText, Vote } from '~types/api'

// tweetnacl and blakejs are CommonJS. Depending on which interop the bundler
// applies, the functions land either directly on the namespace or under
// `default`; resolving both keeps this working under Vite and under plain node
// (which is how the implementation below was checked against the Go fixture).
const nacl = (naclNamespace as unknown as { default?: typeof naclNamespace }).default ?? naclNamespace
const blake = (blakeNamespace as unknown as { default?: typeof blakeNamespace }).default ?? blakeNamespace

/* ------------------------------------------------------------------ crypto */

/**
 * NaCl anonymous sealed box, the exact scheme the protocol uses.
 *
 * `crypto/nacl/nacl.go` seals vote packages with `box.SealAnonymous` from
 * golang.org/x/crypto, whose wire format is `ephemeralPublicKey || box` with
 * the nonce derived as `blake2b-24(ephemeralPublicKey || recipientPublicKey)`.
 * That is libsodium's `crypto_box_seal`, so it can be reproduced here with
 * tweetnacl plus a BLAKE2b.
 */
const sealNonce = (ephemeralPub: Uint8Array, recipientPub: Uint8Array) => {
  const ctx = blake.blake2bInit(nacl.box.nonceLength, undefined)
  blake.blake2bUpdate(ctx, ephemeralPub)
  blake.blake2bUpdate(ctx, recipientPub)
  return blake.blake2bFinal(ctx)
}

const sealOpen = (sealed: Uint8Array, publicKey: Uint8Array, secretKey: Uint8Array) => {
  if (sealed.length <= nacl.box.publicKeyLength) return null
  const ephemeralPub = sealed.subarray(0, nacl.box.publicKeyLength)
  const body = sealed.subarray(nacl.box.publicKeyLength)
  return nacl.box.open(body, sealNonce(ephemeralPub, publicKey), ephemeralPub, secretKey)
}

const hexToBytes = (hex: string) => {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  if (clean.length % 2 !== 0) throw new Error('odd-length hex string')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
    if (Number.isNaN(byte)) throw new Error('invalid hex string')
    out[i] = byte
  }
  return out
}

const base64ToBytes = (value: string) => {
  const binary = atob(value)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

/**
 * Peel the nested boxes off a vote package.
 *
 * The client seals once per encryption key in ascending index order
 * (`apiclient/vote.go` `prepareVotePackageBytes`), so unsealing walks the
 * indexes backwards — the same order as `decryptVotePackage` in
 * `api/helpers.go`.
 */
export const decryptVotePackage = (ciphertext: Uint8Array, keyIndexes: number[], privateKeys: EncryptionKey[]) => {
  const byIndex = new Map(privateKeys.map((k) => [k.index, k.key]))
  let current = ciphertext
  for (const index of [...keyIndexes].reverse()) {
    const hex = byIndex.get(index)
    if (!hex) throw new Error(`the decryption key with index ${index} has not been published`)
    const secretKey = hexToBytes(hex)
    const publicKey = nacl.box.keyPair.fromSecretKey(secretKey).publicKey
    const opened = sealOpen(current, publicKey, secretKey)
    if (!opened) throw new Error(`the key with index ${index} did not open this ballot`)
    current = opened
  }
  return new TextDecoder().decode(current)
}

/* ------------------------------------------------------------------ ballot */

export interface EncryptionKey {
  index: number
  key: string
}

export interface BallotChoice {
  /** Position in the metadata choice list. */
  position: number
  /** Encoded value this choice stands for — what actually travels in the package. */
  value: number
  label: string
  chosen: boolean
}

export interface BallotQuestion {
  position: number
  title: string
  description?: string
  choices: BallotChoice[]
  /** Raw package entries attributed to this question. */
  values: number[]
  /** Values that matched no choice — rendered as "Choice N" rather than dropped. */
  unmatched: number[]
}

export type BallotShape =
  /** One value per question, each naming a choice. */
  | 'choices'
  /** A single question the voter picked several entries in. */
  | 'multi-choice'
  /** Amounts rather than choice names (quadratic / weighted ballots). */
  | 'weighted'
  /** Package readable but its shape does not line up with the metadata. */
  | 'raw'

export type BallotStatus =
  | 'loading'
  | 'readable'
  /** Sealed, and the decryption keys are not published yet. */
  | 'sealed'
  /** Sealed, but the published private keys can open it in this browser. */
  | 'unsealable'
  | 'unavailable'

export interface VotePackage {
  votes: number[]
  nonce?: string
}

const localized = (value?: LocalizedText | string): string | undefined => {
  if (!value) return undefined
  if (typeof value === 'string') return value.trim() || undefined
  const preferred = value.default ?? Object.values(value).find((v) => typeof v === 'string' && v.trim())
  return preferred?.trim() || undefined
}

const numberField = (source: Record<string, unknown> | undefined, key: string) => {
  const raw = source?.[key]
  return typeof raw === 'number' ? raw : 0
}

const parsePackage = (value: unknown): VotePackage | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.votes)) return undefined
  const votes = record.votes.filter((v): v is number => typeof v === 'number')
  if (votes.length !== record.votes.length) return undefined
  return { votes, nonce: typeof record.nonce === 'string' ? record.nonce : undefined }
}

/** The API hands back `{"encrypted": "<base64>"}` when it could not open the box itself. */
const parseSealed = (value: unknown): Uint8Array | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const encrypted = (value as Record<string, unknown>).encrypted
  if (typeof encrypted !== 'string' || !encrypted) return undefined
  try {
    return base64ToBytes(encrypted)
  } catch {
    return undefined
  }
}

/** Distribute the package entries over the metadata questions. */
const buildQuestions = (votes: number[], metadata: ElectionMetadata | undefined, shape: BallotShape) => {
  const questions = metadata?.questions ?? []
  if (!questions.length || shape === 'weighted' || shape === 'raw') return []

  return questions.map((question, position) => {
    const values = shape === 'multi-choice' ? votes : votes.slice(position, position + 1)
    const choices = (question.choices ?? []).map((choice, choicePosition) => {
      // Metadata choices carry the encoded `value`; it usually equals the
      // position but the protocol does not require that, so honour it.
      const value = typeof choice.value === 'number' ? choice.value : choicePosition
      return {
        position: choicePosition,
        value,
        label: localized(choice.title) ?? `Choice ${value}`,
        chosen: values.includes(value),
      }
    })
    const known = new Set(choices.map((c) => c.value))
    return {
      position,
      title: localized(question.title) ?? `Question ${position + 1}`,
      description: localized(question.description),
      choices,
      values,
      unmatched: values.filter((v) => !known.has(v)),
    }
  })
}

export interface VoteContent {
  status: BallotStatus
  shape: BallotShape
  /** The decoded package, whether it arrived readable or was opened here. */
  votes?: number[]
  nonce?: string
  questions: BallotQuestion[]
  hasMetadata: boolean
  /** True once the ballot was opened in this browser rather than by the API. */
  decryptedLocally: boolean
  keyIndexes: number[]
  privateKeys: EncryptionKey[]
  publicKeys: EncryptionKey[]
  decrypt: () => void
  decryptError?: string
  /** Weighted census: the ballot counts for more (or less) than one vote. */
  weight: string
  weighted: boolean
  maxVoteOverwrites: number
}

const readKeys = (source: unknown, field: 'privateKeys' | 'publicKeys'): EncryptionKey[] => {
  if (!source || typeof source !== 'object') return []
  const list = (source as Record<string, unknown>)[field]
  if (!Array.isArray(list)) return []
  return list.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, unknown>
    if (typeof record.index !== 'number' || typeof record.key !== 'string' || !record.key) return []
    return [{ index: record.index, key: record.key }]
  })
}

/**
 * Turns a vote record into something a voter can read: which choices the ballot
 * carries, or — when it is still sealed — what it would take to open it.
 *
 * Nothing here polls. A recorded vote and its election metadata are immutable,
 * and the encryption keys only ever appear once, when the election ends.
 */
export const useVoteContent = (vote?: Vote, election?: Election): VoteContent => {
  const [decrypted, setDecrypted] = useState<VotePackage>()
  const [decryptError, setDecryptError] = useState<string>()

  const readable = useMemo(() => parsePackage(vote?.package), [vote?.package])
  const sealed = useMemo(() => parseSealed(vote?.package), [vote?.package])

  const encryptedElection = election?.voteMode?.encryptedVotes === true
  const keyIndexes = useMemo(() => vote?.encryptionKeys ?? [], [vote?.encryptionKeys])
  const isEncrypted = !readable && (!!sealed || encryptedElection || keyIndexes.length > 0)

  // Only asked for when there is a sealed ballot to open — an unencrypted
  // election answers this endpoint with a 404.
  const keys = useElectionKeys(isEncrypted && vote?.electionID ? vote.electionID : '')
  const privateKeys = useMemo(() => readKeys(keys.data, 'privateKeys'), [keys.data])
  const publicKeys = useMemo(() => readKeys(keys.data, 'publicKeys'), [keys.data])

  const decrypt = useCallback(() => {
    if (!sealed) return
    try {
      const text = decryptVotePackage(sealed, keyIndexes, privateKeys)
      const parsed = parsePackage(JSON.parse(text))
      if (!parsed) throw new Error('the ballot opened but its contents were not a vote package')
      setDecrypted(parsed)
      setDecryptError(undefined)
    } catch (err) {
      setDecryptError(err instanceof Error ? err.message : 'the ballot could not be opened')
    }
  }, [sealed, keyIndexes, privateKeys])

  const pkg = readable ?? decrypted
  const tallyMode = election?.tallyMode
  const votes = pkg?.votes
  const questionCount = election?.metadata?.questions?.length ?? 0

  const shape: BallotShape = useMemo(() => {
    if (!votes) return 'choices'
    const costExponent = numberField(tallyMode, 'costExponent')
    const maxTotalCost = numberField(tallyMode, 'maxTotalCost')
    if (costExponent >= 2 || maxTotalCost > 0) return 'weighted'
    if (!questionCount) return 'raw'
    if (questionCount === votes.length) return 'choices'
    if (questionCount === 1) return 'multi-choice'
    return 'raw'
  }, [votes, tallyMode, questionCount])

  const questions = useMemo(
    () => (votes ? buildQuestions(votes, election?.metadata, shape) : []),
    [votes, election?.metadata, shape]
  )

  let status: BallotStatus = 'unavailable'
  if (pkg) status = 'readable'
  else if (!vote || (isEncrypted && keys.isLoading)) status = 'loading'
  else if (isEncrypted) status = sealed && privateKeys.length > 0 ? 'unsealable' : 'sealed'

  return {
    status,
    shape,
    votes,
    nonce: pkg?.nonce,
    questions,
    hasMetadata: questionCount > 0,
    decryptedLocally: !readable && !!decrypted,
    keyIndexes,
    privateKeys,
    publicKeys,
    decrypt,
    decryptError,
    weight: vote?.weight ?? '1',
    weighted: !!vote?.weight && vote.weight !== '1',
    maxVoteOverwrites: numberField(tallyMode, 'maxVoteOverwrites'),
  }
}
