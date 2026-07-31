# Vocdoni Explorer

A block explorer and vote-verification interface for the [Vocdoni](https://vocdoni.io) voting
protocol. It is a static single-page application that talks directly to a Vocdoni gateway's v2
REST API — there is no backend of its own, so any node exposing that API can serve as its data
source.

## Features

**Organizations and elections**
Browse organizations with their on-chain metadata (name, description, avatar) and their election
history. Election pages show configuration, census details, timing, encryption keys, live vote
counts, and results rendered per question with the correct ballot semantics.

**Vote receipts and verification**
Look up a vote by nullifier to get a receipt: whether it was registered, in which block, and
whether it was later overwritten. Ballot contents are decoded against the election's question
definitions rather than shown as raw integers. For encrypted elections whose keys have been
revealed after the count, the vote package is decrypted in the browser — the keys are fetched from
the API and the decryption happens client-side, so no plaintext ballot leaves the device.

**Printable vote proofs**
Any verified vote can be exported as a PDF containing the nullifier, election reference, block
inclusion data, and a QR code linking back to its verification page.

**Chain data**
Blocks, transactions, accounts, token balances and transfers, and the validator set with per-
validator block production. A unified search box resolves block heights, transaction hashes,
election IDs, organization IDs, account addresses, and vote nullifiers to the right page.

**Dashboard and monitoring**
Chain health at a glance — height, block time, transaction and vote throughput, active elections —
with time-series charts, plus a monitoring view covering validator status and runtime diagnostics.

## Stack

React 18, TypeScript, Vite 5, Chakra UI v3, TanStack Query, React Router (path routing), Recharts,
`@react-pdf/renderer`, TweetNaCl.

## URLs

The paths are the ones the previous explorer published — `/process/{id}`, `/account/{address}`,
`/blocks`, `/validator/{address}` — adopted verbatim so that links already in circulation resolve
here without a redirect. That is why the URLs speak the protocol's vocabulary while the interface
speaks the voter's. List state (page, filters, active tab) lives in search params, which the old
`/blocks/{page}` style path could not express alongside filters.

Two identifiers sit after a `#` instead:

```
/verify#{voteId}                  /verify#{electionId}/{voteId}
/envelope#{voteId}
```

A vote ID is a nullifier — the value tying a person to their ballot receipt — and the fragment is
the one part of a URL a browser never transmits. Putting it in the path, as the old explorer did,
wrote it into every access log, proxy trace and `Referer` header between the voter and the site.
This is also the link printed into proof PDFs and encoded in their QR codes.

Everything that could not be kept is rewritten client-side, before the router mounts, by
`src/utils/legacyUrl.ts` — the pre-1.0 `/processes/show/#/{id}` forms, the old list pagination
(`/blocks/3` → `/blocks?page=2`), `/transactions/id/{hash}`, and this app's own earlier
hash-router links (`/#/elections/{id}`). That file is one pure function and is the single place
the mapping lives. Note that a client-side rewrite cannot un-log the first request for a legacy
`/verify/{nullifier}` link; only links issued from here on carry the guarantee above.

## Quickstart

Requires Node.js 20 or newer and [pnpm](https://pnpm.io) 11 (`corepack enable` picks up the
version pinned in `package.json`).

```bash
pnpm install
pnpm dev
```

The dev server listens on <http://localhost:3000>. With no configuration it reads from the public
gateway at `https://api.vocdoni.io/v2`; see below to point it elsewhere.

`pnpm install` runs a `postinstall` step (`chakra typegen`) that generates the Chakra UI type map. That
output is not committed, so the install step is required before type-checking or building.

## Configuration

| Variable            | Default                      | Description                                                                                          |
| ------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `VOCONE_API_URL`    | `https://api.vocdoni.io/v2`  | Base URL of the gateway v2 API. A bare host is normalised, so `https://api.vocdoni.io` becomes `…/v2`. |
| `VOCONE_REFRESH_MS` | `15000`                      | Poll interval for live queries, in milliseconds. Values below `15000` are clamped to `15000`.          |
| `EXPLORER_PORT`     | `8080`                       | Host port published by Docker Compose. Not read by the application itself.                             |

Copy `.env.example` to `.env` to set these for local development. Both names are also accepted with
a `VITE_` prefix.

### Resolution order

Highest priority first:

1. **`localStorage` override** — the API endpoint field in the header. The choice persists across
   reloads; clear it with `localStorage.removeItem('vocone-webui.apiUrl')`.
2. **`window.__RUNTIME_CONFIG__`** — supplied by `public/runtime-config.js`. In container
   deployments this file is regenerated on every start by `docker/entrypoint.sh` from the
   environment, which is what allows one pre-built image to be repointed at a different gateway
   without rebuilding. In the repository the file is deliberately inert so it does not shadow `.env`
   during development.
3. **Build-time environment** — `VOCONE_*` / `VITE_VOCONE_*` from `.env`, inlined by Vite.
4. **Built-in defaults** — the values in the table above.

The 15-second polling floor is enforced in code and cannot be lowered by configuration. It exists to
keep load on shared public gateways bounded.

## Production deployment

### Docker Compose

```bash
cp .env.example .env      # optional; defaults are baked into the image
docker compose up -d --build
```

The explorer is then served at <http://localhost:8080>. To change the gateway, edit `.env` and
restart the container — no rebuild is needed, since the entrypoint rewrites the runtime config on
start.

### Docker without Compose

```bash
docker build -t vocdoni/explorer-ng .
docker run -d -p 8080:80 \
  -e VOCONE_API_URL=https://api.vocdoni.io/v2 \
  -e VOCONE_REFRESH_MS=15000 \
  vocdoni/explorer-ng
```

The image is a two-stage build: Node 22 compiles the bundle, and the result is served by nginx from
`/usr/share/nginx/html`. It exposes port 80, defines a healthcheck, and answers `/healthz` with a
plain-text `ok`.

### Static hosting

The build output is a plain static bundle with no server-side requirements:

```bash
pnpm install --frozen-lockfile
pnpm build             # writes dist/
```

Serve `dist/` from nginx, Caddy, S3/CloudFront, GitHub Pages, or any static host. Three deployment
notes:

- The app uses path routing, so the host must answer every unknown path with `index.html` at
  status 200. `public/_redirects` covers Netlify (Vite copies it into `dist/`) and
  `docker/nginx/default.conf` does it with `try_files`; any other host needs the equivalent rule.
- Send `Cache-Control: no-store` for `index.html` and `runtime-config.js`; everything under
  `/assets` is content-hashed and can be cached indefinitely. `docker/nginx/default.conf` is a
  working reference.
- To configure a static deployment, either build with a `.env` in place or replace
  `dist/runtime-config.js` after the build.

## API compatibility

The explorer requires a Vocdoni node exposing the **v2 REST API** (`/v2`), as implemented by
[vocdoni-node](https://github.com/vocdoni/vocdoni-node) in gateway mode. It works against the public
LTS gateway at `https://api.vocdoni.io/v2`, against a self-hosted gateway, and against a local
`voconed` instance (`http://localhost:9090/v2`).

The gateway must allow cross-origin requests from wherever the explorer is served. All queries are
read-only; the explorer never submits transactions and holds no keys.

## Development

```bash
pnpm dev           # dev server on :3000
pnpm build         # chakra typegen + vite build -> dist/
pnpm preview       # serve the production build on :4173
pnpm lint          # tsc --noEmit + eslint, zero warnings tolerated
pnpm test          # vitest, single run
pnpm test:watch    # vitest, watching
```

Tests cover `src/utils/legacyUrl.ts` — the redirect table described under [URLs](#urls). Nothing in
the app links to the URLs it handles, so a wrong answer there is invisible until someone follows an
old link; the cases are pinned one by one instead. CI runs `pnpm lint` and `pnpm test` before the
build, so a pull request that breaks either fails its check rather than shipping a deploy preview.

Equivalent `make` targets exist: `install`, `dev`, `build`, `lint`, `test`, `preview`, `docker-build`,
`docker-up`, `docker-down`, `docker-logs`.

Code style is enforced by ESLint and Prettier conventions: no semicolons, single quotes, 120-column
lines.

## License

GNU Affero General Public License v3.0 or later. See [LICENSE](LICENSE).
