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

React 18, TypeScript, Vite 5, Chakra UI v3, TanStack Query, React Router (hash routing), Recharts,
`@react-pdf/renderer`, TweetNaCl.

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

Serve `dist/` from nginx, Caddy, S3/CloudFront, GitHub Pages, or any static host. The application
uses hash routing (`/#/elections/…`), so no URL-rewrite rules are needed. Two deployment notes:

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
```

Equivalent `make` targets exist: `install`, `dev`, `build`, `lint`, `preview`, `docker-build`,
`docker-up`, `docker-down`, `docker-logs`.

Code style is enforced by ESLint and Prettier conventions: no semicolons, single quotes, 120-column
lines.

## License

GNU Affero General Public License v3.0 or later. See [LICENSE](LICENSE).
