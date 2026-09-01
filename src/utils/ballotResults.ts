import type { Question, VoteType } from '@vocdoni/api-types'
import { BallotType, decodeResults, inferBallotType, unsatisfiableProtocolReason } from '@vocdoni/ballot'
import type { Election, ElectionMetadata, LocalizedText } from '~types/api'

/**
 * Turning the raw results histogram into a tally a reader can trust.
 *
 * `election.result` is `result[field][value]` — the number of counted units that put
 * `value` into ballot field `field`. A field is *not* a question and a value is *not*
 * a choice: for a multichoice ballot the fields are pick-slots, for a budget ballot
 * they are the options themselves. Reading it as "row = question, column = choice"
 * (which this explorer did until now) produces a confidently wrong tally for every
 * election that is not plain single-choice.
 *
 * The per-branch arithmetic lives in `@vocdoni/ballot`, which is the same package the
 * Vocdoni voting stack encodes ballots with. What lives here is everything the package
 * cannot know from a gateway payload: which branch applies, whether the metadata's
 * choice values are wire values, and what a percentage should be a share *of*.
 */

/* --------------------------------------------------------------- ballot kind */

/** The ballot layouts this explorer can interpret, plus the ones it refuses to guess at. */
export type ResultsKind = 'single-choice' | 'approval' | 'multichoice' | 'budget' | 'quadratic'

/**
 * `metadata.type.name` — written by the SDK that created the election — mapped to the
 * layout its ballots actually use.
 *
 * This is preferred over the package's `inferBallotType` because inference cannot
 * separate the ambiguous shapes. A legacy two-option multichoice is encoded
 * `maxValue = numChoices - 1 = 1`, which is indistinguishable by shape from an approval
 * ballot; and a ranked ballot is byte-identical to a pick-slot multichoice that fills
 * every slot. The creator's own label is the only signal that resolves either.
 */
const KIND_BY_TYPE_NAME: Record<string, ResultsKind> = {
  'single-choice-multiquestion': 'single-choice',
  singlechoice: 'single-choice',
  'multiple-choice': 'multichoice',
  multichoice: 'multichoice',
  approval: 'approval',
  'budget-based': 'budget',
  budget: 'budget',
  quadratic: 'quadratic',
}

/**
 * Whether `tallyMode` actually backs up the type the metadata claims.
 *
 * The legacy SDK derived both from the same call, so its label is reliable (71 of 71
 * sampled agree). The SaaS API does not: it writes `single-choice-multiquestion` into
 * every document it produces, including ballots that are plainly something else — one
 * sampled election titled "test ranked" carries that label, and another, an approval
 * ballot over three options, would decode as single-choice reading only the first
 * matrix row and dropping its third option entirely.
 *
 * So the label is a hint that has to survive a check against the on-chain
 * configuration, which cannot lie: it is what the scrutinizer actually applied.
 */
const corroborated = (kind: ResultsKind, questionCount: number, choiceCounts: number[], tally: BallotBounds): boolean => {
  const { maxCount, maxValue } = tally
  if (maxCount === undefined || maxValue === undefined) return false
  const widest = choiceCounts.length ? Math.max(...choiceCounts) : 0

  switch (kind) {
    case 'single-choice':
      // One field per question, each holding a choice index.
      return maxCount === questionCount && maxValue === widest - 1
    case 'multichoice':
      // One field per pick-slot; the alphabet has to address every choice.
      return questionCount === 1 && maxCount > 1 && maxValue >= widest - 1
    case 'approval':
      // Dense 0/1 vector: one field per option.
      return questionCount === 1 && maxValue === 1 && maxCount === widest
    case 'budget':
    case 'quadratic':
      // `maxValue === 0` is the aggregated-amounts marker.
      return maxValue === 0
  }
}

/**
 * The shape a ranked ballot takes: distinct values, and enough of them to rank every
 * field. It is byte-identical to a pick-slot multichoice that fills every slot — the
 * package's own README says telling them apart "needs an explicit signal, not better
 * inference" — so without a label we can corroborate, neither reading is defensible
 * and the matrix is shown instead.
 */
const looksRanked = (tally: BallotBounds, uniqueValues: boolean): boolean => {
  const { maxCount, maxValue } = tally
  if (!uniqueValues || maxCount === undefined || maxValue === undefined) return false
  return maxValue > 0 && maxCount > 1 && maxValue >= maxCount - 1
}

interface BallotBounds {
  maxCount?: number
  maxValue?: number
}

const KIND_BY_BALLOT_TYPE: Record<BallotType, ResultsKind> = {
  [BallotType.SingleChoice]: 'single-choice',
  [BallotType.Approval]: 'approval',
  [BallotType.MultiChoice]: 'multichoice',
  [BallotType.Budget]: 'budget',
  [BallotType.Quadratic]: 'quadratic',
}

/**
 * A `voteType` synthesized for one purpose: steering which branch `decodeResults`
 * takes, for a kind we have already resolved.
 *
 * This is **not** the election's real configuration. `decodeResults` exposes no
 * ballot-type parameter, and its inference is tuned for elections the Vocdoni SaaS
 * backend creates, so an explorer decoding historical chain data has to reach the
 * branch some other way. Verified safe: no branch of the package's `decodeQuestion`
 * reads `voteType` — the fields below are inert once `inferBallotType` has run.
 *
 * Never pass these to `voteTypeBounds`, `multichoiceReservesAbstain`,
 * `validateSelections` or `encodeBallot`; those read the numbers for real.
 */
const INERT = { maxVoteOverwrites: 0, uniqueChoices: false, costFromWeight: false }
const BRANCH_VOTE_TYPE: Record<ResultsKind, VoteType> = {
  'single-choice': { maxCount: 1, maxValue: 1, costExponent: 1, ...INERT },
  approval: { maxCount: 2, maxValue: 1, costExponent: 1, ...INERT },
  multichoice: { maxCount: 2, maxValue: 2, costExponent: 1, ...INERT },
  budget: { maxCount: 1, maxValue: 0, costExponent: 1, ...INERT },
  quadratic: { maxCount: 1, maxValue: 0, costExponent: 2, ...INERT },
}

/* -------------------------------------------------------------- view model */

export interface ChoiceResult {
  /** Position in the published choice list, or `'abstain'` for the blank-pick bucket. */
  key: number | 'abstain'
  label: string
  /** Ballots, approvals, picks, credits or units of support — see `ResultsKind`. */
  value: number
  /** 0-100 against the denominator this kind calls for, or null when undefined. */
  percent: number | null
}

export interface QuestionResultView {
  title: string
  description?: string
  choices: ChoiceResult[]
  /** Sum of `value` across the real choices (blank picks excluded). */
  total: number
  /** Ballots counted for this question, when the matrix allows deriving it. */
  ballots?: number
  /** Pick-slots voters left empty. Multichoice only; 0 elsewhere. */
  blankPicks: number
  /** Index of the sole leader, or -1 when the tally is empty or tied. */
  leader: number
  /** Counted units on values no published choice claims — surfaced, never dropped. */
  unattributed: number
}

export interface ElectionResultsView {
  kind: ResultsKind
  /** Whether `kind` came from the creator's metadata or from shape inference. */
  source: 'metadata' | 'inferred'
  /** Raw fields the kind was read from, for the provenance tooltip. */
  provenance: string
  questions: QuestionResultView[]
  /** Nothing could be interpreted — render `matrix`, not `questions`. */
  raw: boolean
  matrix: number[][]
  /** Any non-zero cell: separates "no tally yet" from "a tally of zeroes". */
  hasResults: boolean
  /** The election published no questions; labels are synthesized from the matrix. */
  synthesizedLabels: boolean
  /** `finalResults !== true` — a running or unpublished tally. */
  provisional: boolean
  /** Credits each voter could spend (budget/quadratic), when fixed. */
  budget?: number
  budgetFromWeight: boolean
  /** Picks allowed per voter (multichoice). */
  maxPicks?: number
  minPicks?: number
  /** A voter could name the same option twice, so a share may exceed 100%. */
  repeatChoice: boolean
  costExponent?: number
  /** Set when the configuration guarantees every ballot was discarded at tally. */
  unsatisfiable?: string
}

/* ------------------------------------------------------------------ helpers */

type MetadataQuestion = NonNullable<ElectionMetadata['questions']>[number]
type MetadataChoice = NonNullable<MetadataQuestion['choices']>[number]

const localized = (value?: LocalizedText | string): string | undefined => {
  if (!value) return undefined
  if (typeof value === 'string') return value.trim() || undefined
  const preferred = value.default ?? Object.values(value).find((v) => typeof v === 'string' && v.trim())
  return preferred?.trim() || undefined
}

const num = (source: Record<string, unknown> | undefined, key: string): number | undefined => {
  const value = source?.[key]
  return typeof value === 'number' ? value : undefined
}

const bool = (source: Record<string, unknown> | undefined, key: string): boolean | undefined => {
  const value = source?.[key]
  return typeof value === 'boolean' ? value : undefined
}

const nested = (source: Record<string, unknown> | undefined, key: string): Record<string, unknown> | undefined => {
  const value = source?.[key]
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}

/**
 * Whether the metadata's `choice.value` fields can be trusted as *encoded* values.
 *
 * They usually equal the choice's position, but not always — and some elections carry
 * 1-based display labels there instead. Election
 * `…c7d275020800000060` publishes values 1/2/3 under `maxValue: 2` with the row
 * `["3","0","1"]`: honouring those values reads three of its four ballots as nothing at
 * all. The wire alphabet is `0..maxValue` by definition, so a value outside it cannot be
 * an encoding, and position is the only defensible reading.
 */
export const wireValuesUsable = (choices: MetadataChoice[], maxValue: number | undefined): boolean => {
  if (maxValue === undefined || maxValue <= 0) return false
  return choices.every((choice, index) => {
    const value = typeof choice.value === 'number' ? choice.value : index
    return Number.isInteger(value) && value >= 0 && value <= maxValue
  })
}

/**
 * Map the gateway's metadata questions onto the package's `Question` shape.
 *
 * `decodeResults` never reads titles, but the type requires them, so they are filled
 * with whatever the metadata has. The `value` is the part that matters: it selects the
 * column the single-choice and multichoice branches read.
 */
const toPackageQuestions = (metadata: ElectionMetadata | undefined, maxValue: number | undefined): Question[] =>
  (metadata?.questions ?? []).map((question) => {
    const choices = question.choices ?? []
    const useWireValues = wireValuesUsable(choices, maxValue)
    return {
      title: { default: localized(question.title) ?? '' },
      choices: choices.map((choice, index) => ({
        title: { default: localized(choice.title) ?? '' },
        value: useWireValues && typeof choice.value === 'number' ? choice.value : index,
      })),
    }
  })

/**
 * Ballots counted, read off the matrix rather than taken from `voteCount`.
 *
 * For approval each row is one option's `[rejected, approved]` pair, and for multichoice
 * every ballot fills at least its first pick-slot, so the widest row is the ballot count
 * in both. `voteCount` is not a substitute: it counts envelopes accepted by the chain,
 * including ones the scrutinizer later discarded.
 */
const ballotsFromMatrix = (matrix: number[][]): number =>
  matrix.reduce((most, row) => Math.max(most, row.reduce((sum, cell) => sum + cell, 0)), 0)

/** The sole leader's index, or -1 when the tally is empty or the top value is tied. */
const soleLeader = (values: number[]): number => {
  const top = Math.max(...values, 0)
  if (top <= 0) return -1
  const first = values.indexOf(top)
  return values.indexOf(top, first + 1) === -1 ? first : -1
}

/**
 * Questions for an election that published none.
 *
 * Only the shapes whose meaning is unambiguous from `tallyMode` are synthesized; the
 * rest fall through to the raw matrix rather than inventing a reading. Labels say
 * "Option N" because that is genuinely all that is known.
 */
const synthesizeQuestions = (
  matrix: number[][],
  maxCount: number | undefined,
  maxValue: number | undefined,
  costExponent: number | undefined
): { questions: Question[]; kind: ResultsKind } | undefined => {
  const label = (index: number) => ({ default: `Option ${index + 1}` })

  // One field per question, columns are that question's choices: today's rendering,
  // and correct precisely here.
  if (maxCount === 1) {
    return {
      kind: 'single-choice',
      questions: matrix.map((row) => ({
        title: { default: '' },
        choices: row.map((_cell, index) => ({ title: label(index), value: index })),
      })),
    }
  }

  // `maxValue === 0` marks aggregated amounts: rows are the options themselves.
  if (maxValue === 0 && matrix.length > 0) {
    return {
      kind: costExponent === 2 ? 'quadratic' : 'budget',
      questions: [
        {
          title: { default: '' },
          choices: matrix.map((_row, index) => ({ title: label(index), value: index })),
        },
      ],
    }
  }

  // Approval and multichoice are indistinguishable without `metadata.type`, and the
  // option count is not recoverable from `maxValue` — refuse rather than guess.
  return undefined
}

/* -------------------------------------------------------------------- build */

/**
 * Interpret an election's published tally.
 *
 * Returns `undefined` only when there is no election yet. Every other state — no
 * results, no metadata, an uninterpretable layout — resolves to a view that says so,
 * because a public explorer showing nothing is worse than one showing what it knows.
 */
export const buildElectionResults = (election?: Election): ElectionResultsView | undefined => {
  if (!election) return undefined

  const tally = election.tallyMode
  const vote = election.voteMode
  const maxCount = num(tally, 'maxCount')
  const maxValue = num(tally, 'maxValue')
  const maxTotalCost = num(tally, 'maxTotalCost')
  const costExponent = num(tally, 'costExponent')

  const matrix = (election.result ?? []).map((row) => row.map((cell) => Number(cell ?? 0) || 0))
  const hasResults = matrix.some((row) => row.some((cell) => cell > 0))
  const provisional = election.finalResults !== true

  const typeName = election.metadata?.type?.name
  const properties = election.metadata?.type?.properties
  const numChoices = nested(properties, 'numChoices')

  const budgetProperty = num(properties, 'maxBudget')
  const budgetFromWeight = bool(properties, 'useCensusWeightAsBudget') ?? bool(vote, 'costFromWeight') ?? false
  const repeatChoice = bool(properties, 'repeatChoice') ?? bool(vote, 'uniqueValues') === false

  const unsatisfiable =
    maxCount !== undefined && maxValue !== undefined
      ? (unsatisfiableProtocolReason({ maxCount, maxValue, uniqueValues: bool(vote, 'uniqueValues') ?? false }) ??
        undefined)
      : undefined

  const base = {
    matrix,
    hasResults,
    provisional,
    budget: budgetProperty ?? (maxTotalCost || undefined),
    budgetFromWeight,
    maxPicks: num(numChoices, 'max') ?? (typeName && KIND_BY_TYPE_NAME[typeName] === 'multichoice' ? maxCount : undefined),
    minPicks: num(numChoices, 'min'),
    repeatChoice,
    costExponent,
    unsatisfiable,
  }

  const rawView = (kind: ResultsKind, source: 'metadata' | 'inferred', provenance: string): ElectionResultsView => ({
    ...base,
    kind,
    source,
    provenance,
    questions: [],
    raw: true,
    synthesizedLabels: true,
  })

  const questionCount = election.metadata?.questions?.length ?? 0
  const choiceCounts = (election.metadata?.questions ?? []).map((question) => (question.choices ?? []).length)
  const bounds: BallotBounds = { maxCount, maxValue }
  const uniqueValues = bool(vote, 'uniqueValues') ?? false

  // The creator's label wins only if the on-chain configuration backs it up.
  const claimed = typeName ? KIND_BY_TYPE_NAME[typeName] : undefined
  const claimHolds = claimed !== undefined && corroborated(claimed, questionCount, choiceCounts, bounds)

  let kind = claimHolds ? claimed : undefined
  let source: 'metadata' | 'inferred' = kind ? 'metadata' : 'inferred'
  const shapeFields = `tallyMode.maxCount = ${maxCount ?? '?'}, maxValue = ${maxValue ?? '?'}, costExponent = ${costExponent ?? '?'}`
  let provenance = kind
    ? `metadata.type.name = ${typeName}`
    : claimed !== undefined
      ? `metadata.type.name = ${typeName} contradicts ${shapeFields}, so the configuration was read instead`
      : shapeFields

  // A ranked ballot and a filled pick-slot multichoice are indistinguishable, and
  // nothing aggregates ranked results, so an uncorroborated one is not guessed at.
  if (kind === undefined && questionCount > 0 && looksRanked(bounds, uniqueValues)) {
    return rawView('single-choice', 'inferred', `${provenance}; ranked or multichoice cannot be told apart here`)
  }

  let questions = toPackageQuestions(election.metadata, maxValue)
  let synthesizedLabels = false

  if (questions.length === 0) {
    const synthesized = synthesizeQuestions(matrix, maxCount, maxValue, costExponent)
    if (!synthesized) {
      return rawView(kind ?? 'single-choice', 'inferred', `${provenance} — no published questions`)
    }
    questions = synthesized.questions
    synthesizedLabels = true
    if (!kind) kind = synthesized.kind
    source = 'inferred'
    provenance = `${provenance} — no published questions`
  }

  if (!kind) {
    const inferred = inferBallotType({
      questions,
      voteType: {
        maxCount: maxCount ?? 1,
        maxValue: maxValue ?? 1,
        costExponent: costExponent ?? 1,
        maxVoteOverwrites: 0,
        uniqueChoices: bool(vote, 'uniqueValues') ?? false,
        costFromWeight: budgetFromWeight,
      },
    })
    kind = KIND_BY_BALLOT_TYPE[inferred]
  }

  // `inferBallotType` short-circuits any multi-question election to single-choice, and
  // no synthesized `voteType` can override that. Rather than let a multi-question
  // election be silently decoded with the wrong branch, show the matrix.
  if (kind !== 'single-choice' && questions.length > 1) {
    return rawView(kind, source, `${provenance} — ${questions.length} questions with a ${kind} ballot`)
  }

  const decoded = decodeResults({ questions, voteType: BRANCH_VOTE_TYPE[kind], results: election.result ?? [] })
  const ballots = ballotsFromMatrix(matrix)
  const metadataQuestions = election.metadata?.questions ?? []

  const views: QuestionResultView[] = decoded.map((entries, questionIndex) => {
    const meta = metadataQuestions[questionIndex]
    const realChoices = entries.filter((entry) => entry.choice !== 'abstain')
    const blankPicks = entries.reduce((sum, entry) => (entry.choice === 'abstain' ? sum + entry.votes : sum), 0)
    const counts = realChoices.map((entry) => entry.votes)
    const total = counts.reduce((sum, value) => sum + value, 0)

    // Single-choice fills one field per question, so its row sum is that question's
    // electorate; every other kind spreads one ballot over many fields.
    const rowTotal = kind === 'single-choice' ? (matrix[questionIndex] ?? []).reduce((sum, cell) => sum + cell, 0) : 0
    const questionBallots = kind === 'single-choice' ? rowTotal : ballots

    // Share of ballots is the honest denominator wherever a ballot can name several
    // options: "36 of 64 ballots named Joan" says something; "36 of 98 selections"
    // invites the reader to treat it as 37% support. Budget and quadratic have no
    // ballot count to divide by, so they keep share of the total allocated.
    const useBallotShare = (kind === 'approval' || kind === 'multichoice') && questionBallots > 0
    const denominator = useBallotShare ? questionBallots : total
    const percentOf = (value: number) => (denominator > 0 ? (value / denominator) * 100 : null)

    const choices: ChoiceResult[] = realChoices.map((entry, choiceIndex) => ({
      key: choiceIndex,
      label: localized(meta?.choices?.[choiceIndex]?.title) || `Option ${choiceIndex + 1}`,
      value: entry.votes,
      percent: percentOf(entry.votes),
    }))

    return {
      title: localized(meta?.title) || (decoded.length > 1 ? `Question ${questionIndex + 1}` : 'Results'),
      description: localized(meta?.description),
      choices,
      total,
      ballots: questionBallots > 0 ? questionBallots : undefined,
      blankPicks,
      leader: soleLeader(counts),
      unattributed: Math.max(0, rowTotal - total - blankPicks),
    }
  })

  return { ...base, kind, source, provenance, questions: views, raw: false, synthesizedLabels }
}

/**
 * The resolved ballot layout on its own — shared with the vote-detail decoder.
 *
 * Undefined for a raw view: those carry a placeholder `kind` so the copy tables stay
 * total, but the layout was never actually established, and a caller decoding a single
 * ballot with it would produce exactly the confident mis-reading this module exists to
 * prevent.
 */
export const resolveResultsKind = (election?: Election): ResultsKind | undefined => {
  const view = buildElectionResults(election)
  return view && !view.raw ? view.kind : undefined
}
