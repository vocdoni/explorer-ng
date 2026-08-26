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
// Loaded straight from source: Node strips the types, so what runs here is exactly
// what the app runs — including the metadata resolution, which is why elections whose
// document the gateway left as a URL are covered too.
import { buildElectionResults } from '../src/utils/ballotResults.ts'
import { remoteMetadataUrl, resolveElectionMetadata, withMetadata } from '../src/utils/electionMetadata.ts'

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
    // Before the metadata document was followed this rendered as "Option 1/2/3".
    name: 'gateway-less metadata resolves to real labels',
    id: '6b342d99f2188f71faa8771d4aaddcde1066d8e4486b677e928e030000000001',
    expect: (v) => [
      v.raw && 'expected the remote document to be resolved',
      v.synthesizedLabels && 'expected real labels, not synthesized ones',
      v.questions[0]?.choices.every((c) => /^Option \d+$/.test(c.label)) &&
        `labels are still synthesized: ${v.questions[0]?.choices.map((c) => c.label)}`,
    ],
  },
  {
    // A ranked ballot is byte-identical to a filled pick-slot multichoice. Its declared
    // type is contradicted by tallyMode, so there is no signal left and neither reading
    // is guessed at — this one is titled "test ranked" in its own metadata.
    name: 'ranked ballot with a contradicted type (refuses to guess)',
    id: '6b342d99f21844aa920dc1a4f1170bc177d12de31abd2fd149d8030800000000',
    expect: (v) => [!v.raw && `expected a raw view rather than an invented reading, got kind=${v.kind}`],
  },
  {
    // The gateway leaves SaaS-API metadata as an https URL; without following it there
    // is no title and no question wording at all.
    name: 'metadata behind an https metadataURL',
    id: '6b342d99f2188f71faa8771d4aaddcde1066d8e4486b677e928e03000000000e',
    expect: (v) => [
      v.raw && 'expected the remote document to be resolved',
      v.synthesizedLabels && 'expected real labels, not synthesized ones',
      v.questions[0]?.choices[0]?.label !== 'The resumed counter' &&
        `label=${v.questions[0]?.choices[0]?.label}`,
      v.questions[0]?.choices.map((c) => c.value).join(',') !== '7,1' &&
        `values=${v.questions[0]?.choices.map((c) => c.value)}`,
    ],
  },
  {
    // The SaaS API stamps `single-choice-multiquestion` on every document it writes,
    // including ballots that are plainly something else. Trusting it here reads only
    // the first matrix row — A=0, B=3 — and drops option C entirely.
    name: 'metadata type contradicted by tallyMode (approval)',
    id: '6b342d99f218454c6f39a8fbf6ec6e3730de441ce3c86f989ed0030000000001',
    expect: (v) => [
      v.kind !== 'approval' && `kind=${v.kind} (declared single-choice-multiquestion)`,
      v.source !== 'inferred' && `source=${v.source}`,
      v.questions[0]?.choices.length !== 3 && `dropped options: ${v.questions[0]?.choices.length} of 3`,
      v.questions[0]?.choices.map((c) => c.value).join(',') !== '3,0,3' &&
        `values=${v.questions[0]?.choices.map((c) => c.value)} (expected 3,0,3)`,
    ],
  },
]

/**
 * Cases with no live example. Every election on the gateway now resolves a metadata
 * document, so the fallbacks for one that does not are exercised from constructed
 * records rather than left untested.
 */
const LOCAL_CASES = [
  {
    name: 'no metadata at all, maxCount 1 (synthesizes options)',
    election: {
      electionId: 'local', finalResults: true, result: [['2', '0', '1']],
      tallyMode: { maxCount: 1, maxValue: 2, costExponent: 1 }, voteMode: {},
    },
    expect: (v) => [
      v.raw && 'expected synthesized questions, not a raw view',
      !v.synthesizedLabels && 'expected synthesized labels',
      v.questions[0]?.choices.map((c) => `${c.label}=${c.value}`).join(' ') !== 'Option 1=2 Option 2=0 Option 3=1' &&
        `got ${v.questions[0]?.choices.map((c) => `${c.label}=${c.value}`).join(' ')}`,
    ],
  },
  {
    name: 'no metadata at all, maxCount 3 (refuses to guess)',
    election: {
      electionId: 'local', finalResults: true, result: [['1', '1'], ['2', '0'], ['0', '2']],
      tallyMode: { maxCount: 3, maxValue: 1, costExponent: 1 }, voteMode: {},
    },
    expect: (v) => [!v.raw && `expected a raw view, got kind=${v.kind}`],
  },
  {
    name: 'budget with no metadata (rows are the options)',
    election: {
      electionId: 'local', finalResults: true, result: [['30'], ['70'], ['0']],
      tallyMode: { maxCount: 3, maxValue: 0, maxTotalCost: 100, costExponent: 1 }, voteMode: {},
    },
    expect: (v) => [
      v.kind !== 'budget' && `kind=${v.kind}`,
      v.questions[0]?.choices.map((c) => c.value).join(',') !== '30,70,0' &&
        `values=${v.questions[0]?.choices.map((c) => c.value)}`,
    ],
  },
  {
    name: 'a metadataURL that is not http(s) is never fetched',
    election: { electionId: 'local', metadataURL: 'ipfs://bafyfake', finalResults: true, result: [], tallyMode: {}, voteMode: {} },
    expect: () => [],
    checkUrl: true,
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
  const raw = await response.json()
  // Same resolution the app does, so elections whose metadata lives behind a URL are
  // checked as they actually render rather than as the gateway hands them over.
  const election = withMetadata(raw, await resolveElectionMetadata(raw))
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

for (const testCase of LOCAL_CASES) {
  const problems = []
  if (testCase.checkUrl) {
    // Only http(s) documents are followed — metadataURL is creator-written input.
    for (const scheme of ['ipfs://bafyfake', 'data:application/json,{}', 'file:///etc/passwd', 'javascript:alert(1)']) {
      const url = remoteMetadataUrl({ ...testCase.election, metadataURL: scheme })
      if (url !== undefined) problems.push(`would fetch ${scheme}`)
    }
    if (remoteMetadataUrl({ ...testCase.election, metadataURL: 'https://example.test/m.json' }) === undefined) {
      problems.push('refused a legitimate https URL')
    }
  } else {
    problems.push(...testCase.expect(buildElectionResults(testCase.election)).filter(Boolean))
  }
  if (problems.length) {
    failures += problems.length
    console.log(`FAIL  ${testCase.name}`)
    problems.forEach((problem) => console.log(`        ${problem}`))
  } else {
    console.log(`ok    ${testCase.name}`)
  }
}

console.log(failures ? `\n${failures} failed assertion(s)` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
