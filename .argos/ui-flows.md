# UI Flows

Human-reviewable description of the core user flows for the Vocdoni Explorer UI, used as the
source of truth for the automated Playwright suite under `.argos/ui/`.

## Setup

- install: `corepack enable && corepack prepare pnpm@11.15.1 --activate && pnpm install --frozen-lockfile`
- build: (none — the dev server runs the app directly; no production build is required for these flows)
- start: `pnpm dev`
- url: http://localhost:3000
- ready: `GET /` returns 200 and the page title is "Vocdoni Explorer"
- notes: |
    This is a static single-page app with no backend of its own — it talks directly to the public
    Vocdoni gateway v2 REST API at `https://api.vocdoni.io/v2` (the built-in default, no `.env`
    needed). All data shown is real, live chain data; there is no mock server or seed data.
    To keep flows deterministic despite the live backend, each flow either checks structural/
    always-true facts (a list renders with at least one row, navigation lands on the right page)
    or targets specific, already-finalized chain records (a closed election with published
    results, a counted vote, a historical block) that cannot change going forward:
    - Organization `8f71faa8771d4aaddcde1066d8e4486b677e928e` — a long-standing org with 17
      finalized elections.
    - Election `6b342d99f2188f71faa8771d4aaddcde1066d8e4486b677e928e03000000000d` — one of that
      org's elections, status "Results published".
    - Vote `ec4dcadb8a8a3a936aa32f7904748a36e243d794a733ce5505213e54dbfa2de8` — a vote counted in
      that election, sealed in block `8105235`.
    These IDs are permanent chain history and safe to hardcode. Requires network access to
    `api.vocdoni.io` from the container running the tests.

## Flow: Dashboard overview

Proves the landing page loads and renders live chain health data.

1. Open the app at its base URL.
2. Land on the Dashboard (the default route).
   - expect: the heading "Vocdoni chain" is visible.
3. Check the chain status summary.
   - expect: a synced/health status badge is visible (e.g. "Fully synced").
4. Check the stat cards.
   - expect: "Block height", "Transactions", "Organizations", and "Elections" stat cards are all
     visible, each showing a non-empty numeric value.

## Flow: Primary navigation

Proves the main navigation bar moves between the app's top-level sections and each renders content.

1. Start on the Dashboard.
2. Click "Organizations" in the top navigation.
   - expect: URL changes to the Organizations page and an "Organization list" table with at least
     one row is visible.
3. Click "Elections" in the top navigation.
   - expect: URL changes to the Elections page and an "Election list" table with at least one row
     is visible.
4. Open the "More" menu and click "Blocks".
   - expect: URL changes to the Blocks page and a table of recent blocks with at least one row is
     visible.

## Flow: Organization and election drill-down

Proves the browse path from an organization to one of its elections and its published results.

1. Open the detail page for organization `8f71faa8771d4aaddcde1066d8e4486b677e928e`.
   - expect: the page shows an "Elections created" stat card with a non-empty numeric value.
2. Open the "Elections" tab/table row for election
   `6b342d99f2188f71faa8771d4aaddcde1066d8e4486b677e928e03000000000d`.
   - expect: the election page shows a "Results published" status badge.
3. On the election page, check the "Questions & results" tab (shown by default).
   - expect: at least one question with per-option vote counts and percentages is visible.

## Flow: Verify a vote

Proves a voter can paste a vote ID and get a verifiable, permanent receipt.

1. Open the "Verify vote" page from the top navigation.
2. Paste vote ID `ec4dcadb8a8a3a936aa32f7904748a36e243d794a733ce5505213e54dbfa2de8` into the "Vote ID"
   field and submit.
   - expect: the URL updates to include the vote ID.
   - expect: a confirmation message "Your vote was counted" is visible.
3. Check the evidence list under the confirmation.
   - expect: an evidence line mentioning block "8,105,235" is visible.
4. Check that a downloadable proof is offered.
   - expect: a "Download proof (PDF)" button is visible.

## Flow: Unified search

Proves the header search box resolves a raw block height to the right detail page.

1. From any page, click the header search box.
2. Type the block height `8105235` and press Enter.
   - expect: the URL changes to the block detail route for that height.
   - expect: the heading "Block #8105235" is visible.
3. Check the block's transaction list.
   - expect: the "Transactions in this block" table shows at least one row with action "Vote cast".
