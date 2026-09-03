# "Top organizations" shows 17 while the list shows far more

**Verdict: the bug is ours, in three places. vocdoni-node is exonerated on both
counts and pagination.** The gateway's numbers are internally consistent and its
paging is exact; what it does *not* offer is any way to order
`/chain/organizations`, and the explorer ranked a single response page as if it
had. Fixes are in this branch.

Probed against the default gateway from `src/contexts/ApiContext.tsx`,
`https://api.vocdoni.io/v2`, on 2026-09-03.

## What the symptom actually was

`GET /chain/organizations` returns rows in the index's own order — not by
election count, not by anything a reader would recognise. Both views sorted the
rows *they happened to have* and presented the result as a ranking:

- the dashboard card sorted its 8-row window, so "#1" meant "largest of an
  arbitrary 8 out of 275";
- the list sorted each 24-row page, so every page looked internally ordered
  while the global order stayed arbitrary — which is exactly why paging turned
  up bigger organizations than the card's "#1".

## Evidence: the app's own request, reproduced

Dashboard, before the fix — `useOrganizations(0, 8, …)`:

```console
$ curl -s 'https://api.vocdoni.io/v2/chain/organizations?page=0&limit=8'
{"organizations":[
  {"organizationID":"4566700d…1713","electionCount":1},
  {"organizationID":"2a292590…80f7","electionCount":1},
  {"organizationID":"39c10094…0531","electionCount":1},
  {"organizationID":"6f235378…b978","electionCount":3},
  {"organizationID":"f6e21d73…d9a9","electionCount":1},
  {"organizationID":"9bc85085…7e31","electionCount":2},
  {"organizationID":"8f71faa8…928e","electionCount":17},   <-- the card's "#1"
  {"organizationID":"8ee92aa8…11f3a","electionCount":2}],
 "pagination":{"totalItems":275,"currentPage":0,"nextPage":1,"lastPage":34}}
```

17 is simply the largest of those eight. Sweeping the whole index (3 requests at
the server's `limit` cap of 100) gives the real ranking:

```console
$ for p in 0 1 2; do curl -s "…/chain/organizations?page=$p&limit=100"; done
  #1 63f9e285…a35b  569
  #2 a52f5588…edea  320
  #3 0cff75f5…cd22  164
  #4 7bf87ae5…e212d 137
  #5 93f362db…e8b9  111
```

The true leader has **569** elections. The card was off by a factor of 33.

## Why upstream is not at fault

**Counts are correct** — three independent routes agree on the leader:

```console
$ curl -s '…/chain/organizations?page=0&limit=100' | …   # electionCount     -> 569
$ curl -s '…/elections?limit=1&organizationId=63f9e285…' # pagination.totalItems -> 569
$ curl -s '…/accounts/63f9e285…'                         # electionIndex     -> 569
```

**Pagination is correct** — limit-independent, no overlap, no gaps:

```console
page=0&limit=24  == rows  0..23 of the limit=100 sweep   -> true
page=1&limit=24  == rows 24..47 of the limit=100 sweep   -> true
overlap(page0, page1) -> empty ;  275 unique ids across 3 pages of 100
```

**What upstream genuinely lacks** (a limitation, not a bug, but the reason the
fix has to be client-side): `/chain/organizations` accepts no ordering
parameter. `sort=electionCount&order=desc`, `orderBy=electionCount` and
`sortBy=…&sortOrder=desc` all return byte-identical unordered results — unknown
params are silently ignored, the same behaviour already documented for `?name=`.
`limit` is capped at 100 server-side (`limit=500` and `limit=1000` both return
100 rows).

A `?sort=` / `?order=` on this endpoint would let the explorer drop the sweep
entirely; worth an upstream feature request, but nothing here is a node defect.

## The three defects, and the fixes

### 1. Dashboard card ranked an 8-row window — `src/pages/Dashboard.tsx:71,80`

```ts
const organizations = useOrganizations(0, 8, undefined, undefined, IDLE_POLL_MS)
const topOrganizations = [...(organizations.data?.organizations ?? [])]
  .sort((a, b) => b.electionCount - a.electionCount)   // sorts 8 of 275
  .slice(0, ROWS)
```

Subtitled "Ranked by number of elections created", which the data never was.

**Fix:** new `useRankedOrganizations` in `src/hooks/useOrgStats.ts` sweeps the
whole index and sorts it. Page 0 is fetched for `pagination.lastPage`, the
remaining pages fan out in parallel — 3 requests for today's 275 organizations.
Capped at `ORG_INDEX_MAX_PAGES` (12 requests / 1200 organizations); past that it
sets `truncated` so the UI says the ranking is partial instead of over-claiming.
It shares cache entries with `useOrganizations` and never polls (the index moves
slowly; `staleTime` 5 min). Net request rate on the dashboard actually *drops* —
3 requests per 5 min replaces 1 per 60 s.

### 2. List sorted per page — `src/pages/Organizations.tsx`

The "Most elections" dropdown sorted only the current 24 rows, so each page
looked ordered and the sequence across pages was arbitrary. The unfiltered list
now draws from the ranked sweep and paginates locally; the ID-filter and
name-search paths keep their existing (necessarily partial) row sets.

### 3. `pagination.totalPages` does not exist — `src/types/api.ts:3`

The `Pagination` interface declared a required `totalPages` that **no v2
endpoint returns**. Checked `/chain/organizations`, `/elections`,
`/chain/blocks`, `/chain/transactions`, `/accounts`: every one returns
`lastPage` — the *0-based* index of the final page — and no `totalPages`.

So all ten `totalPages={x.data?.pagination?.totalPages}` call sites passed
`undefined`, and `PaginationControls` reads that as "length unknown": the
"of N" never rendered and `canNext` never went false, so a reader could page
forever past the end of every list in the app. (`ElectionDetail` was the one
page with a working counter — it derives it from `voteCount` instead.)

**Fix:** `totalPagesOf` in `src/utils/pagination.ts` returns `lastPage + 1`, and
the field is gone from the type so it cannot be read again by accident.

## Verification

Logic replayed against the live gateway (`requests: 3`, `rows swept: 275/275`,
`truncated: false`, monotonic descending, `card #1 === global max: 569`), then
the app itself driven in a browser:

| View | Before | After |
|---|---|---|
| Dashboard card #1 | 17 | **569**, then 320, 164, 137, 111 |
| List page 1 | arbitrary page, sorted within | 569 → 13, **"Page 1 of 12"** |
| List page 2 | unrelated to page 1 | continues 13 → … |
| Last page | Next always enabled | **Next disabled**, "Page 12 of 12" |
| `?sort=elections-asc` | per-page | globally ascending from 1 |
| `?q=63f9e2` (ID filter) | worked | unchanged, "Page 1 of 1" |
| `?q=plataforma` (name) | worked | unchanged, 1 match |

`pnpm lint` and `pnpm test` (78 passing) are clean; `pnpm build` succeeds. The
only console error on the page is a pre-existing `forwardRef` warning from the
search icon in `GlobalSearch.tsx`, unrelated to this change.

## Residual risk

- The ranking is a **client-side sweep**, so it is only complete while the index
  fits in `ORG_INDEX_DEPTH` (1200). It is 275 today; past the cap the UI says so
  rather than lying, but the honest fix is server-side ordering upstream.
- Sorting the full index on every render is O(n log n) over ~275 rows — free at
  this size, worth memoising if the cap is ever raised much.
- The legacy name search still sweeps 200 organizations in 8 requests of 25; it
  could reach the whole index in 3 at `limit=100`. Left alone as out of scope.
