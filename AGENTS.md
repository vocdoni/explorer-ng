# Repository Guidelines

## Project Structure & Module Organization

Static SPA, no backend of its own — every byte of data comes from a Vocdoni gateway's v2 REST API.
Source lives under `src/`: `pages/` (one default export per route, mounted inside `AppLayout`),
`components/` (feature components, plus reusable primitives in `components/shared/`), `hooks/`
(`useVoconeApi.ts` is the API surface), `contexts/` (`ApiContext.tsx` resolves the API endpoint),
`utils/`, `types/`, and `theme/` (Chakra UI v3 recipes and tokens). Path alias `~*` → `./src/*`
(`~components`, `~hooks`, `~utils`, etc.) is used everywhere instead of relative imports. See
`CLAUDE.md` for the full architecture write-up — config resolution, election metadata, results
interpretation, vote decoding, and routing are each documented there in depth and shouldn't be
re-derived from scratch.

## Build, Test, and Development Commands

```bash
pnpm install       # runs postinstall -> chakra typegen (required before lint/build)
pnpm dev           # vite dev server on :3000
pnpm build         # chakra typegen + vite build -> dist/
pnpm lint          # tsc --noEmit + eslint, --max-warnings 0
pnpm test          # vitest, single run
pnpm test:watch    # vitest, watching
pnpm preview       # serve the production build on :4173
pnpm check:results # replays real elections through the results adapter (needs Node >= 22.18)
```

Equivalent `make` targets exist: `install`, `dev`, `build`, `lint`, `preview`, `docker-build`,
`docker-up`, `docker-down`, `docker-logs`.

`chakra typegen ./src/theme/system.ts` generates the Chakra UI type map into `node_modules`; it isn't
committed, so re-run `pnpm chakra:typegen` after changing anything under `src/theme/` — recipe
variants and token names are type-checked against that generated output.

## Coding Style & Naming Conventions

Prettier-shaped, enforced by convention rather than a Prettier run: no semicolons, single quotes
(including JSX string props), 120-column lines. TypeScript is `strict` with
`noUnusedLocals`/`noUnusedParameters`, so dead imports and unused params fail `pnpm lint`. Components
are PascalCase, hooks are `useX`. Raw hex or oklch colors must never appear at a call site — go
through `theme/semantic.ts` tokens or a recipe. Enum-to-English translations (status labels,
transaction types) live in exactly one place each (`StatusTag.tsx`, `src/utils/txLabels.ts`) — extend
those rule tables instead of adding a second mapping elsewhere.

## Testing Guidelines

Vitest. The suite is deliberately small: it covers `src/utils/legacyUrl.ts`, the table that rewrites
every legacy URL form the previous explorer produced. Nothing in the app links to those paths, so a
wrong rewrite is invisible until someone follows an old link or QR code — each case is pinned
individually in the test file rather than inferred from behavior. `pnpm lint` (type-check + ESLint at
zero warnings) is the other automated gate. CI runs `pnpm lint` and `pnpm test` before `pnpm build`
(`vite build` itself does not type-check), so run both locally before pushing. `pnpm check:results`
is a separate, manual regression check for the ballot-results adapter (`src/utils/ballotResults.ts`)
— run it after touching anything in that path.

## Commit & Pull Request Guidelines

Conventional Commits, matching the existing history: `feat: …`, `fix: …`, `chore(deps): …`,
`ci: …`, referencing the PR number where relevant (`fix: rank organizations across the whole index (#16)`).
Keep commits scoped to one concern. PRs merge to `main`, which auto-deploys a preview via Netlify;
`lts` is the production branch. Dependabot PRs skip the deploy step (no secrets are exposed to them).

## Routing internals

The routes are the ones the previous explorer published (`/process/:electionId`, `/account/:address`,
`/block/:height`) so that links already in circulation keep working; every host must fall back unknown
paths to `index.html` (`public/_redirects` for Netlify, `try_files` in `docker/nginx/default.conf` for
the container). Legacy path forms that couldn't be kept as-is (`/processes/show/#/{id}`, old pagination,
this app's own earlier hash-router links) are rewritten client-side, before the router mounts, by
`src/utils/legacyUrl.ts` — the single place that mapping lives.

Vote nullifiers never ride in the URL path: `/verify#<voteId>` (or `/verify#<electionId>/<voteId>`)
and `/envelope#<voteId>` carry them after a `#`, which browsers never send to the server, so the
identifier tying a person to their ballot receipt never lands in an access log, proxy trace, or
`Referer` header. `useHashIds` reads them back out. This is also the link printed into proof PDFs and
encoded in their QR codes. A client-side rewrite can't retroactively un-log a legacy
`/verify/{nullifier}` link that was already followed — the guarantee only applies going forward.

## Configuration resolution order

`src/contexts/ApiContext.tsx` resolves `apiUrl` and `refreshMs` in this order (highest priority
first):

1. **`localStorage` override** — the API endpoint field in the header, persisted across reloads.
2. **`window.__RUNTIME_CONFIG__`** — rewritten by `docker/entrypoint.sh` on container start, which is
   what lets one pre-built image be repointed at a different gateway without a rebuild.
3. **Build-time environment** — `VOCONE_*` / `VITE_VOCONE_*` from `.env`, inlined by Vite.
4. **Built-in defaults**.

`public/runtime-config.js` is deliberately inert in the repo so it doesn't shadow `.env` during
development. `MIN_REFRESH_MS = 15000` is enforced in code, not just documented as a default — it
exists to bound load on shared public gateways and can't be lowered by configuration.
