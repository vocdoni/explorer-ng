<p align="center" width="100%">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://app-dev.vocdoni.io/assets/logo-classic-white.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://app-dev.vocdoni.io/assets/logo-classic.svg" />
      <img alt="Vocdoni logo" src="https://app-dev.vocdoni.io/assets/logo-classic.svg" />
  </picture>
</p>

<p align="center" width="100%">
    <a href="https://github.com/vocdoni/explorer-ng/commits/main/"><img src="https://img.shields.io/github/commit-activity/m/vocdoni/explorer-ng" /></a>
    <a href="https://github.com/vocdoni/explorer-ng/issues"><img src="https://img.shields.io/github/issues/vocdoni/explorer-ng" /></a>
    <a href="https://chat.vocdoni.io"><img src="https://img.shields.io/badge/discord-join%20chat-blue.svg" /></a>
    <a href="https://twitter.com/vocdoni"><img src="https://img.shields.io/twitter/follow/vocdoni.svg?style=social&label=Follow" /></a>
</p>

  <div align="center">
    Vocdoni is the first universally verifiable, censorship-resistant, anonymous, and self-sovereign governance protocol. <br />
    Our main aim is a trustless voting system where anyone can speak their voice and where everything is auditable. <br />
    We are engineering building blocks for a permissionless, private and censorship resistant democracy.
    <br />
    <a href="https://vocdoni.io/developers"><strong>Explore the developer portal »</strong></a>
    <br />
    <h3>More About Us</h3>
    <a href="https://vocdoni.io">Vocdoni Website</a>
    |
    <a href="https://vocdoni.app">Web Application</a>
    |
    <a href="https://explorer.vote/">Blockchain Explorer</a>
    |
    <a href="https://law.mit.edu/pub/remotevotingintheageofcryptography/release/1">MIT Law Publication</a>
    |
    <a href="https://vocdoni.io/contact">Contact Us</a>
    <br />
    <h3>Key Repositories</h3>
    <a href="https://github.com/vocdoni/vocdoni-app">Vocdoni App</a>
    |
    <a href="https://github.com/vocdoni/vocdoni-node">Vocdoni Node</a>
    |
    <a href="https://github.com/vocdoni/vocdoni-integrator-sdk">Vocdoni Integrator SDK</a>
    |
    <a href="https://github.com/vocdoni/explorer-ng">Vocdoni Explorer</a>
  </div>

# Vocdoni Explorer

A block explorer and vote-verification site for the Vocdoni protocol. Look up an organization, browse
its elections, check the live results, or take a vote receipt and confirm it was actually counted —
all backed directly by a Vocdoni gateway, with no server of its own in between.

## What you can do with it

**Browse organizations and elections**
See an organization's on-chain profile — name, description, avatar — and every election it has run.
Each election page shows its configuration, census, timing, and results, rendered per question with
the correct interpretation for that ballot type (single-choice, approval, ranked, budget, quadratic).

**Verify a vote**
Paste in a vote nullifier and get a receipt: was it registered, in which block, and was it later
replaced by a newer vote from the same voter? Ballot contents are shown as the actual choices made,
not raw numbers. For encrypted elections whose keys have since been published, the ballot is decrypted
right in your browser — nothing is sent anywhere to reveal it.

**Print a proof of your vote**
Any verified vote can be downloaded as a PDF receipt, with a QR code that links straight back to its
verification page.

**Explore the chain**
Blocks, transactions, accounts, balances and transfers, and the validator set. One search box accepts
a block height, a transaction hash, an election or organization ID, or a vote nullifier, and takes you
to the right page.

**Watch the network**
A dashboard with chain height, block time, and vote/transaction throughput over time, plus a
monitoring view for validator status.

## Quickstart

Requires Node.js 20+ and [pnpm](https://pnpm.io) (`corepack enable` picks up the version pinned in
`package.json`).

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. With no configuration it talks to the public gateway at
`https://api.vocdoni.io/v2` — see [Configuration](#configuration) to point it at a different one.

## Configuration

| Variable            | Default                     | Description                                                                 |
| ------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `VOCONE_API_URL`    | `https://api.vocdoni.io/v2`  | Base URL of the gateway's v2 API. A bare host is normalised, so `https://api.vocdoni.io` becomes `…/v2`. |
| `VOCONE_REFRESH_MS` | `15000`                      | Poll interval for live data, in milliseconds. Values below `15000` are ignored. |
| `EXPLORER_PORT`     | `8080`                       | Host port published by Docker Compose.                                       |

Copy `.env.example` to `.env` to set these locally. Both names also work with a `VITE_` prefix. You
can also switch the API endpoint at any time from the field in the app's header — that choice is
remembered in your browser and overrides everything else.

## Running it yourself

### Docker Compose

```bash
cp .env.example .env      # optional — sensible defaults are baked in
docker compose up -d --build
```

The explorer is then served at <http://localhost:8080>. Changing `.env` and restarting the container
is enough to point it at a different gateway — no rebuild required.

### Docker

```bash
docker build -t vocdoni/explorer-ng .
docker run -d -p 8080:80 \
  -e VOCONE_API_URL=https://api.vocdoni.io/v2 \
  -e VOCONE_REFRESH_MS=15000 \
  vocdoni/explorer-ng
```

### Static hosting

```bash
pnpm install --frozen-lockfile
pnpm build             # writes dist/
```

`dist/` is a plain static bundle you can serve from nginx, Caddy, S3/CloudFront, or similar. Two
things to get right:

- Serve it at the root of its domain (not a subpath) and make sure every unknown path falls back to
  `index.html` — the app uses client-side routing.
- To point a pre-built bundle at a different gateway without rebuilding, replace
  `dist/runtime-config.js` with your own values after the build.

## What it connects to

Any server exposing a Vocdoni gateway's **v2 REST API** — the public `https://api.vocdoni.io/v2`
gateway, a self-hosted one, or a local `voconed` instance. Everything the explorer does is read-only:
it never submits transactions and holds no keys, so pointing it at a gateway is always safe.

## Contributing

See [AGENTS.md](AGENTS.md) for the development setup, coding conventions, and testing guidelines.

## License

GNU Affero General Public License v3.0 or later. See [LICENSE](LICENSE).
