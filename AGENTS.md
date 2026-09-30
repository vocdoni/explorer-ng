# AGENTS.md

Guidance for anyone working in this repository, whether a person or a coding agent. `CLAUDE.md` is a
symlink to this file, so edit this one.

## Commands

```bash
pnpm install       # runs postinstall -> chakra typegen (required before lint/build)
pnpm dev           # vite dev server on :3000
pnpm build         # chakra typegen + vite build -> dist/
pnpm lint          # tsc --noEmit + eslint, --max-warnings 0
pnpm test          # vitest, single run
pnpm test:watch    # vitest, watching
pnpm preview       # serve the production build on :4173
pnpm check:results # replay real elections through the results adapter (Node >= 22.18, hits the network)

pnpm test src/utils/legacyUrl.test.ts   # one test file
pnpm test -t 'resolveAnonymity'         # tests whose name matches
```

The repo pins `pnpm@11` (`packageManager`). `pnpm-workspace.yaml` holds only settings (`allowBuilds`,
`overrides`) and has no `packages:` key. Older pnpm versions reject it with `packages field missing or
empty`, even for `pnpm --version`. Use corepack or pnpm >= 11, not a fix to the yaml.

Equivalent `make` targets exist (`install` — which uses `--frozen-lockfile`, `dev`, `build`, `lint`,
`test`, `preview`, `docker-*`).

The test suite is vitest and deliberately small: it pins pure functions whose failures would be
invisible in the UI. `src/utils/legacyUrl.test.ts` covers the legacy-URL redirect table, which nothing
in the app links to, so a bad rewrite only shows up when someone follows an old link. `src/utils/anonymity.test.ts`
covers `resolveAnonymity`: a wrong answer there silently mislabels how an election protects its voters.
Tests are colocated as `*.test.ts` next to their module. `pnpm lint` (type-check + ESLint at zero warnings) is the
other automated gate. The Netlify workflow runs `pnpm lint` and `pnpm test` before `pnpm build`
(`vite build` itself does not type-check), so run both locally before pushing.

`chakra typegen ./src/theme/system.ts` generates the Chakra UI type map into `node_modules`; it is not
committed. Re-run it (`pnpm chakra:typegen`) after changing anything under `src/theme/` — recipe
variants and token names are type-checked against that generated output.

Code style is Prettier-shaped and enforced only by convention: no semicolons, single quotes (including
JSX string props), 120-column lines. TypeScript is `strict` with `noUnusedLocals`/`noUnusedParameters`,
so dead imports and unused params fail `pnpm lint`. Components are PascalCase and hooks are `useX`.

Commits follow Conventional Commits (`feat:`, `fix:`, `chore(deps):`, `ci:`, `test:`, `docs:`), one
concern each. `main` auto-deploys a Netlify preview; `lts` is the production branch. Dependabot PRs
skip the deploy step, so no secrets are exposed to them.

## Architecture

Static SPA, no backend of its own. Every byte of data comes from a Vocdoni gateway's **v2 REST API**
(`/v2`), read-only — the explorer never signs or submits transactions and holds no keys.

### Configuration and the API endpoint

`src/contexts/ApiContext.tsx` is the single resolution point for `apiUrl` and `refreshMs`. Precedence:
`localStorage` (`vocone-webui.apiUrl`, set from the header field) → `window.__RUNTIME_CONFIG__`
(rewritten at container start by `docker/entrypoint.sh`, so one pre-built image can be repointed at
another gateway without a rebuild) → build-time `VOCONE_*` / `VITE_VOCONE_*` →
public gateway default. `vite.config.ts` sets `envPrefix: ['VITE_', 'VOCONE_']` so both spellings work.

Two rules that follow from this:

- **`MIN_REFRESH_MS = 15000` is a hard floor**, not a default. Polling hooks must take `refreshMs` from
  `useApi()`; never hardcode a `refetchInterval`. The floor exists to bound load on shared public gateways.
- **Every query key includes `apiUrl`.** Switching endpoints at runtime must not serve one chain's data
  from another chain's cache. Any new query has to carry it.

`public/runtime-config.js` is deliberately inert in the repo — putting values there would shadow `.env`
during development.

### Data layer

`src/hooks/useVoconeApi.ts` is the API surface: one thin `useQuery` wrapper per endpoint, all going
through `fetchJson` from `src/utils/http.ts`. Response shapes live in `src/types/api.ts`. New endpoints
belong here rather than as ad-hoc `fetch` calls in components.

Three behaviours in this layer encode real API quirks — preserve them:

- `fetchJson` reads an error body **once** as text then tries `JSON.parse` (calling `.json()` then
  `.text()` throws and masks the failure), and treats an empty/whitespace 200 body as `{}` — several
  endpoints, notably `/votes/verify/...`, signal success that way. Errors surface as `ApiError` with
  `status` and the Vocdoni `code`.
- `optionalResource` maps 404 and 500 to `null`: `/elections/{id}/scrutiny` answers 500 (`code 5024`)
  until results exist and `/elections/{id}/keys` answers 404 (`code 4047`) unless the election is
  encrypted. Both are normal states, not failures, and neither is polled.
- **Immutable resources are never polled.** Election metadata (`useElectionMetadata`, 30 min stale/gc),
  recorded votes, encryption keys, and `useVoteVerify` (`staleTime: Infinity`, `retry: false`) are all
  fetch-once. Only live chain state carries `refetchInterval: refreshMs`.

`/chain/stats` (`useChainStats`) is relied on unconditionally, and so is the `?name=` organization
filter. Both ship on the production gateway. The dashboard donuts are built from **every** key the endpoint
returns, never a fixed list, so they add up to `chain/info`'s totals (`txCountByType` sums to
`transactionCount`). New tx types need a label in `txLabels.ts`. `?name=` folds ASCII case only, so accents
must match. Sorting is still feature-detected, in `src/hooks/useGatewayCapabilities.ts`, because an old
gateway *ignores* an unknown `sortBy` (or `title`) and answers 200 with unsorted, unfiltered rows, which
would render as a false ranking or a false match count. `useOrgSortSupport` and `useElectionSortSupport`
send an invalid `sortBy` and treat only a 400 as proof it is honoured. `useOrgStatsSortSupport` (the
`lastElection`/`voteCount`/`balance` orderings of vocdoni-node #1485) needs a 200 *and* the `voteCount`
row field, since a pre-sorting gateway also answers 200. Nothing gated is sent or offered until its probe
settles, and a URL naming an unsupported sort falls back to the default. Optional row fields (`title`, `name`/`avatar`, `blockTime`,
`keyRevealHeight`) are used when present, with per-row fallbacks otherwise.

`useElectionTitles` batches per-row title lookups through `useQueries`, sharing the
`election-metadata` cache key with `useElectionMetadata`, and **caps the id list at 24** — there is no bulk-metadata endpoint,
so an uncapped page would fan out into an unbounded request burst.

### Election metadata

Titles, question wording, choice labels and the ballot type all live in the **metadata
document**, and the gateway only sometimes inlines it. `ipfs://` documents come back in
`election.metadata`; `https://` ones — what the SaaS API writes — are left as a bare
`metadataURL`, and about a fifth of recent elections on the LTS gateway are in that
state. Without following the URL those elections render as bare ids in every list and as
an uninterpretable tally on their own page.

`src/utils/electionMetadata.ts` resolves it, and `useElectionMetadata` /
`useElectionWithMetadata` / `useElectionTitles` in `useVoconeApi.ts` all share one cache
entry keyed `['election-metadata', apiUrl, id]`. Metadata is immutable, so it is cached
hard (30 min) and never polled — `useElectionWithMetadata` deliberately keeps it in a
separate query from the polled election record. **Pages needing question wording or the
ballot type must use `useElectionWithMetadata`, not `useElection`.**

`metadataURL` is written by whoever created the election, so it is untrusted input: only
`http(s)` is followed (never `data:`, `file:` or `javascript:`), no credentials are sent,
a non-object document is discarded, and any failure degrades to "no metadata" rather than
failing the election. `ipfs://` is deliberately not resolved — the gateway already inlines
those, and choosing a public IPFS gateway here would send readers to a third party.

### Results interpretation

`election.result` is a **histogram**, not a tally: `result[field][value]` counts the units
that put `value` into ballot *field* `field`. A row is not a question and a column is not
a choice. How they collapse into a per-option tally depends entirely on the ballot type —
for a multichoice ballot the rows are pick-slots (tally = **column** sums), for a budget
ballot the rows are the options (tally = `result[i][0]`). `GET /elections/{id}/scrutiny`
returns the same raw matrix, so the interpretation is necessarily client-side.

`src/utils/ballotResults.ts` owns this, and is the single resolver for both the results
page and the vote-detail page. The arithmetic comes from `@vocdoni/ballot`'s
`decodeResults`; what lives here is everything a gateway payload can't tell that package:

- **Ballot type comes from `metadata.type.name`, but only once `tallyMode` corroborates
  it.** Shape alone cannot separate a legacy two-option multichoice
  (`maxValue = numChoices - 1 = 1`) from an approval ballot, nor a ranked ballot from a
  pick-slot multichoice — those are byte-identical, so the creator's label is the only
  signal. But the label is not always honest: the legacy SDK derived both from one call
  and agrees 71/71, while the SaaS API stamps `single-choice-multiquestion` on every
  document it writes, contradicting `tallyMode` in 5 of 25 sampled. Trusting it there
  reads only the first matrix row and silently drops options. `corroborated()` checks the
  claim against the on-chain configuration, which cannot lie; `inferBallotType` is the
  fallback, and an uncorroborated ranked signature resolves to `raw` rather than a guess.
- **`BRANCH_VOTE_TYPE` synthesizes a `voteType` to steer `decodeResults`' internal
  branch** for the type we already resolved. Those numbers are not the election's real
  configuration and must never be passed to `voteTypeBounds`, `validateSelections` or
  `encodeBallot`, which read them for real.
- **`choice.value` is only a wire value when it fits `0..tallyMode.maxValue`.** Some
  elections publish 1-based display labels there; honouring them blindly drops ballots
  silently. See `wireValuesUsable`.
- **Percentages are computed here, not taken from the package.** For approval and
  multichoice the package divides by total selections; share of *ballots* is the
  meaningful figure, derived as `max(rowSum)`.
- Layouts that cannot be established resolve to `raw: true` and render the matrix rather
  than an invented reading.

Per-type wording lives in `src/components/election/resultsCopy.ts` — extend that table
rather than branching at a call site. A wrong denominator or a "most voted" badge on a
running tally is the failure mode this whole path exists to prevent, so the copy is part
of the logic, not decoration.

`pnpm check:results` (Node >= 22.18, for type stripping) replays real elections from the public gateway through the adapter
and asserts the expected tallies, including two regression guards (the legacy
`maxValue === 1` collision and the 1-based `choice.value` case). Run it after touching
anything in this path — it is the only automated check of this arithmetic.

### Vote decoding and verification

`src/hooks/useVoteContent.ts` turns a vote record into readable ballot contents. Its
layout comes from `resolveResultsKind` in `~utils/ballotResults`, so a single ballot and
the tally it was counted into cannot disagree; the vector-to-selections mapping itself is
local because `@vocdoni/ballot` encodes selections into a ballot but has no inverse. For encrypted
elections whose keys have been published, it opens the ballot **in the browser**: NaCl anonymous sealed
box (`ephemeralPublicKey || box`, nonce = `blake2b-24(ephemeralPub || recipientPub)`), unsealed in
*reverse* key-index order because the client seals in ascending order. This mirrors vocdoni-node's
`crypto/nacl/nacl.go` and `api/helpers.go`; changing it silently breaks decryption, so treat it as a
protocol implementation, not app code. The `BallotShape` heuristic (`choices` / `multi-choice` /
`weighted` / `raw`) decides how package entries map onto metadata questions — `costExponent >= 2` or
`maxTotalCost > 0` means the numbers are amounts, not choice indices.

`src/hooks/useVerification.ts` composes five **independent** queries on purpose: each step of the
evidence chain renders its own spinner and its own failure, so a gateway that cannot serve
`/chain/blocks/{n}` degrades one step instead of blanking a voter's proof. Identifiers are normalised
(`normalizeId`: strip `0x`, trim, lowercase) because they arrive from QR scans and hand typing.

`src/utils/anonymity.ts` (`resolveAnonymity`) decides what the UI says about voter anonymity. Two
unrelated mechanisms exist, and reading only one mislabels elections that use the other.
`zk` is a vote mode (`voteMode.anonymous`). `blind-csp` is a census origin, where the CSP signs a
blinded request, as with `OFF_CHAIN_CA*` censuses. Any anonymity wording belongs in that module.

### Routing and pages

Path router (`createBrowserRouter`) with lazy-loaded pages; every host must answer unknown paths with
`index.html` (`public/_redirects` covers Netlify, `try_files` in `docker/nginx/default.conf` covers the
container). The paths are the ones `vocdoni/explorer` published (`/process/:electionId`,
`/account/:address`, `/block/:height`), and every legacy form that could not be adopted is rewritten
before the router snapshots `window.location` by `src/utils/legacyUrl.ts` — the single place the
mapping lives, pinned case-by-case by its vitest suite. Every page is a default export under
`src/pages/`, mounted inside `AppLayout`. Vote nullifiers never ride in the path: `/verify#<voteId>`
(or `/verify#<electionId>/<voteId>`) and `/envelope#<voteId>` carry them in the URL fragment, which
browsers never transmit, and `useHashIds` reads them. So the identifier tying a person to their ballot
receipt never lands in an access log, proxy trace or `Referer` header. The same link is printed into proof
PDFs and their QR codes. A legacy `/verify/{nullifier}` link that was already followed has been logged
anyway; the rewrite only protects later visits.

`useUnifiedSearch` resolves any pasted identifier to a route. Shape alone is ambiguous at 64 hex chars
(election, nullifier, tx hash, block hash all match), so it probes the API in order of search frequency;
a missing transaction answers **204 with an empty body**, which is why "did not throw" is not enough and
it checks for a non-empty object.

List pages keep page/filters/tabs in the URL via `useUrlListState`, always with `replace: true` — Back
from a detail page must land on the same list view without fifteen keystrokes of filter edits in
between. Filter inputs hold local drafts and are committed on "Apply".

### Theme

Chakra UI v3 `createSystem` in `src/theme/system.ts`, implementing the vocdoni.io identity (see that
repo's `DESIGN.md`): warm cream surfaces — never pure white — with a single warm ink whose fixed alpha
tiers (64% muted, 55% faint, 10% hairlines) produce every text and line color; Fraunces serif headings
at their single weight 400 (never bolded — the heading recipe enforces it); Hanken Grotesk body;
JetBrains Mono for hashes and code; the deep Vocdoni green as the one chrome accent (links, focus
rings); and signal yellow existing only as the eyebrow dot on section titles. Dark mode mirrors the
recipe with ink and cream swapped. `html`'s `colorPalette` stays pinned to `gray` (a warm-tinted ramp),
and `colorPalette` should only be set at a call site to signal **state** (status tags, tx families).
Code/JSON surfaces render as dark "terminal windows" in both modes. Per-component styling lives in
`src/theme/recipes/`, not in inline props; `src/theme/semantic.ts` holds semantic tokens, several
marked `@deprecated` in favour of Chakra's built-ins (`bg`, `fg`, `fg.muted`, `border`). Raw hex or
oklch must never appear at a call site.

### Shared components and label mapping

Reuse the primitives in `src/components/shared/` — `PageHeader`, `PageSection`, `DetailGrid`/`DetailRow`,
`StatTile`, `HashDisplay`, `StatusTag`, `EmptyState`, `PaginationControls`, `LoadingSkeleton` — rather
than rebuilding panels or truncation logic.

Raw API enums are translated to plain English in exactly one place each: `statusMeaning` in
`StatusTag.tsx` (substring rules, so `READY` and `READY_FOR_VOTE` land on the same tone) and
`txTypeMeaning`/`txCostLabel` in `src/utils/txLabels.ts` and `src/components/account/txCostLabels.ts`.
Extend the rule tables; don't add a second mapping at a call site.

### Deployment and the CSP

Two deploy targets serve the same `dist/`. Netlify is deployed by `.github/workflows/deploy-netlify.yml`
through the API. The Docker image uses nginx (`docker/`), and `docker/entrypoint.sh` writes
`runtime-config.js` at start. On Netlify, response headers come **only** from `public/_headers`,
because an API deploy reads nothing outside `dist/` and a `netlify.toml` `[[headers]]` block would
silently not apply. Netlify concatenates same-named headers when rules overlap, which is why
`Cache-Control` appears only on non-overlapping paths. The nginx config sets its own, smaller header set
with no CSP, so a header change usually needs making in both places.

The CSP in `_headers` is strict, and each directive is justified inline. It constrains code:

- `script-src 'self'`: no inline `<script>` in `index.html`, ever.
- `@react-pdf/renderer` (the vote-proof PDF in `src/components/verify/ProofActions.tsx`) is the reason
  for `'wasm-unsafe-eval'`, `worker-src blob:` and `data:` in `connect-src`. It is loaded via dynamic
  `import()` on click, never at route load; keep it that way.
- `connect-src https:` is open on purpose (a user-configurable gateway, and untrusted `metadataURL`
  hosts). `img-src blob:` exists for chart PNG export.

A new third-party fetch, worker, WASM module or embed will fail in production but work under
`pnpm dev`, which serves no CSP. Update the policy and its comment together.

### Imports

Path alias `~*` → `./src/*` (tsconfig `paths` + `vite-tsconfig-paths`), used everywhere:
`~components`, `~hooks`, `~utils`, `~types`, `~contexts`, `~theme`.
