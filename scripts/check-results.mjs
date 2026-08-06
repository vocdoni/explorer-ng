/**
 * Replays real elections from a live gateway through `buildElectionResults` and
 * asserts the invariants that distinguish a correct tally from a plausible one.
 *
 * There is no test runner in this repo, and the failure mode this guards against is
 * silent: a mis-read results matrix renders as a perfectly ordinary bar chart. So the
 * check is against real chain data, with expectations derived by hand from the raw
 * matrix rather than from the code under test.
 *
 *   node scripts/check-results.mjs [apiUrl]
 */
// Loaded straight from source: Node strips the types, and the module's only runtime
// import is `@vocdoni/ballot` (everything else is `import type`). No build step, so
// what runs here is exactly what the app runs.
import { buildElectionResults } from '../src/utils/ballotResults.ts'

const API = process.argv[2] ?? 'https://api.vocdoni.io/v2'

/**
 * Each case pins what a reader should see. `expect` receives the built view and
 * returns a list of failures, so one election can assert several things at once.
 */
const CASES = [
  {
    name: 'single-choice, weighted census',
    id: '6b342d99f2187fae0e2d41c7dcccc8dc01106d4b33f4addc4425030400000003',
    expect: (v) => [
      v.kind !== 'single-choice' && `kind=${v.kind}`,
      v.questions[0]?.choices.map((c) => c.value).join(',') !== '21184,39502' &&
        `values=${v.questions[0]?.choices.map((c) => c.value)}`,
      v.questions[0]?.total !== 60686 && `total=${v.questions[0]?.total}`,
    ],
  },
  {
    name: 'single-choice with 1-based metadata choice values',
    id: '6b342d99f218e3d32afaad11ef5d713d8e1c2355dfee5bc7d275020800000060',
    expect: (v) => [
      // The regression guard for honouring choice.value blindly: that reads 3 of the
      // 4 ballots as nothing. Positional is the only reading that totals 4.
      v.questions[0]?.total !== 4 && `total=${v.questions[0]?.total} (expected 4)`,
      v.questions[0]?.choices[0]?.value !== 3 && `first choice=${v.questions[0]?.choices[0]?.value} (expected 3)`,
    ],
  },
  {
    name: 'multi-question single-choice',
    id: '6b342d99f2180f423ada4d4336bc379468230adadab946f492c7030400000002',
    expect: (v) => [v.kind !== 'single-choice' && `kind=${v.kind}`, v.questions.length !== 3 && `questions=${v.questions.length}`],
  },
  {
    name: 'multichoice pick-slot, 5 candidates',
    id: '6b342d99f218cfe96bcde038829703bd9388bcdbeadbea91be99030c00000005',
    expect: (v) => [
      v.kind !== 'multichoice' && `kind=${v.kind}`,
      v.questions.length !== 1 && `questions=${v.questions.length} (expected 1, not one per pick-slot)`,
      v.questions[0]?.choices.map((c) => c.value).join(',') !== '36,20,9,10,23' &&
        `values=${v.questions[0]?.choices.map((c) => c.value)}`,
      v.questions[0]?.ballots !== 64 && `ballots=${v.questions[0]?.ballots} (expected 64)`,
    ],
  },
  {
    name: 'legacy 2-option multichoice (maxValue === 1 collision)',
    id: '6b342d99f2183f819e29a70019afee0ffdd0cd2f18d65657c620030c00000003',
    expect: (v) => [
      v.kind !== 'multichoice' && `kind=${v.kind} (inferBallotType would say approval)`,
      v.questions[0]?.choices.map((c) => c.value).join(',') !== '2,1' &&
        `values=${v.questions[0]?.choices.map((c) => c.value)} (expected 2,1)`,
    ],
  },
  {
    name: 'budget-based, 1-based choice values',
    id: '6b342d99f2183d500f14d30d468baee8f4125b02e93697d5d5ee020000000035',
    expect: (v) => [
      v.kind !== 'budget' && `kind=${v.kind}`,
      v.questions.length !== 1 && `questions=${v.questions.length} (expected 1, not one per option)`,
      v.questions[0]?.choices.map((c) => c.value).join(',') !== '109,178,70,143,0,0' &&
        `values=${v.questions[0]?.choices.map((c) => c.value)}`,
      v.questions[0]?.total !== 500 && `total=${v.questions[0]?.total} (expected 5 voters x 100 credits)`,
    ],
  },
  {
    // maxCount === 1 is the one no-metadata shape whose meaning is unambiguous, so
    // options are synthesized rather than falling back to the matrix.
    name: 'no published metadata, maxCount 1 (synthesized options)',
    id: '6b342d99f2188f71faa8771d4aaddcde1066d8e4486b677e928e030000000001',
    expect: (v) => [
      v.raw && 'expected synthesized questions, not a raw view',
      !v.synthesizedLabels && 'expected synthesized labels',
      v.questions[0]?.choices.map((c) => c.value).join(',') !== '2,0,0' &&
        `values=${v.questions[0]?.choices.map((c) => c.value)}`,
      v.questions[0]?.choices[0]?.label !== 'Option 1' && `label=${v.questions[0]?.choices[0]?.label}`,
    ],
  },
  {
    // maxCount > 1 with no metadata cannot be told apart (approval vs multichoice, and
    // the option count is unrecoverable) — it must refuse rather than guess.
    name: 'no published metadata, maxCount 3 (refuses to guess)',
    id: '6b342d99f21844aa920dc1a4f1170bc177d12de31abd2fd149d8030800000000',
    expect: (v) => [!v.raw && 'expected a raw view rather than an invented reading'],
  },
]

/** Invariants that must hold for every election, whatever its ballot type. */
const universal = (v, election) => [
  v.questions.some((q) => q.choices.some((c) => !Number.isFinite(c.value))) && 'non-finite tally value',
  v.questions.some((q) => q.choices.some((c) => c.percent !== null && (c.percent < 0 || !Number.isFinite(c.percent)))) &&
    'negative or non-finite percentage',
  // The tally may legitimately be below voteCount (discarded or overwritten ballots),
  // but a single-choice tally can never exceed the units the chain actually counted.
  v.kind === 'single-choice' &&
    v.questions.some((q, i) => q.total > (election.result?.[i] ?? []).reduce((s, c) => s + Number(c), 0)) &&
    'single-choice total exceeds its matrix row',
]

let failures = 0
for (const testCase of CASES) {
  const response = await fetch(`${API}/elections/${testCase.id}`)
  if (!response.ok) {
    console.log(`SKIP  ${testCase.name} — gateway returned ${response.status}`)
    continue
  }
  const election = await response.json()
  const view = buildElectionResults(election)
  const problems = [...testCase.expect(view), ...universal(view, election)].filter(Boolean)
  if (problems.length) {
    failures += problems.length
    console.log(`FAIL  ${testCase.name}`)
    problems.forEach((problem) => console.log(`        ${problem}`))
    console.log(`        raw: ${JSON.stringify(election.result)}`)
  } else {
    const summary = view.raw
      ? 'raw matrix'
      : view.questions.map((q) => q.choices.map((c) => `${c.label.slice(0, 18)}=${c.value}`).join(' ')).join(' | ')
    console.log(`ok    ${testCase.name}\n        ${view.kind} (${view.source}) — ${summary}`)
  }
}

console.log(failures ? `\n${failures} failed assertion(s)` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
