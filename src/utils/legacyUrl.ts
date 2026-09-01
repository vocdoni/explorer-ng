/**
 * The URL forms this explorer answers to but does not use.
 *
 * Its own paths are `vocdoni/explorer`'s, adopted verbatim so that published
 * links keep working — see `~router`. What is left over is handled here:
 *
 *   1. the pre-1.0 explorer, which hid the identifier behind `/show/#/`
 *      (`/processes/show/#/<pid>`);
 *   2. the parts of `vocdoni/explorer` that could not be kept — list pages
 *      numbered in the path (`/blocks/3`), and `/transactions/id/<hash>`;
 *   3. explorer-ng's own hash-router phase (`/#/elections/<id>`), which this
 *      change ends.
 *
 * All of it is rewritten by `resolveLegacyUrl`, a pure function of the URL — no
 * router, no network, no React. `applyLegacyUrl` runs it against
 * `window.location` before the app mounts, so a legacy link never reaches the
 * router and the address bar never shows an intermediate state.
 *
 * Two rewrites are not cosmetic. A vote ID is a nullifier: the value tying a
 * person to their ballot receipt. `/verify/<nullifier>` and
 * `/envelope/<nullifier>` put it in the request line, where every proxy and
 * access log on the way records it. Both now land on a URL fragment, which
 * browsers never transmit. Being client-side, this cannot un-log the *first*
 * request for a legacy link — only links issued from here on carry the
 * guarantee.
 */

interface Loc {
  /** Always starts with `/`. */
  pathname: string
  /** Includes the leading `?`, or empty. */
  search: string
  /** Includes the leading `#`, or empty. */
  hash: string
}

/** Split without `new URL()`, which would percent-encode identifiers we then
 *  have to decode again. */
const split = (url: string): Loc => {
  const hashAt = url.indexOf('#')
  const hash = hashAt === -1 ? '' : url.slice(hashAt)
  const rest = hashAt === -1 ? url : url.slice(0, hashAt)
  const queryAt = rest.indexOf('?')
  return {
    pathname: queryAt === -1 ? rest : rest.slice(0, queryAt),
    search: queryAt === -1 ? '' : rest.slice(queryAt),
    hash,
  }
}

const join = (loc: Loc) => `${loc.pathname || '/'}${loc.search}${loc.hash}`

const segments = (pathname: string) => pathname.split('/').filter(Boolean)

/** Identifiers arrive from QR scans and printed receipts with `0x` prefixes and
 *  mixed case; the API only accepts bare lowercase hex. Mirrors `normalizeId`
 *  in `~utils/format`, kept local so this module stays dependency-free. */
const hex = (raw = '') => raw.trim().replace(/^0x/i, '').toLowerCase()

const isInt = (value = '') => /^\d+$/.test(value)
const isHex64 = (value = '') => /^[0-9a-f]{64}$/.test(hex(value))

/** The old explorer numbered list pages from 1 in the path; `useUrlListState`
 *  numbers them from 0 in the query and drops the param at its default. */
const withPage = (pathname: string, search: string, humanPage: string): Loc => {
  const page = Math.max(0, Number(humanPage) - 1)
  const params = new URLSearchParams(search)
  if (page > 0) params.set('page', String(page))
  else params.delete('page')
  const query = params.toString()
  return { pathname, search: query ? `?${query}` : '', hash: '' }
}

/**
 * Pass A — the pre-1.0 explorer, where the identifier lived after `/show/#/`.
 *
 * These only ever rewrite to the `vocdoni/explorer` form, exactly as that repo's
 * own `RouteRedirector` did, and let pass C finish the job. Mapping straight to
 * the modern path would mean maintaining every rule twice.
 */
const SHOW_PREFIXES: [from: string, to: string][] = [
  ['/blocks/show/#/', '/block/'],
  ['/envelopes/show/#/', '/envelope/'],
  ['/organizations/show/#/', '/account/'],
  ['/processes/show/#/', '/process/'],
  ['/transactions/show/#/', '/transactions/'],
  ['/verify/#/', '/verify/'],
]

const showPrefix = (loc: Loc): Loc | null => {
  const full = loc.pathname + loc.hash
  for (const [from, to] of SHOW_PREFIXES) {
    if (!full.startsWith(from)) continue
    return { pathname: to + full.slice(from.length), search: loc.search, hash: '' }
  }
  return null
}

/**
 * Pass B — explorer-ng's own hash-router links: the fragment *is* the route.
 *
 * Must run after pass A, or `/verify/#/<id>` reads as a link to `/<id>`. A
 * fragment that does not start with `/` is a payload, not a route — that is what
 * separates `/verify#<voteId>` from `/#/verify/<voteId>`.
 *
 * `/blocks/<n>` is resolved here rather than in pass C because it is the one
 * form whose meaning depends on which explorer emitted it: explorer-ng meant
 * block height n, the old explorer meant list page n, and both are bare
 * integers. Arriving inside a `#/` fragment is the only evidence of provenance
 * there is, so it is used while it is still available.
 */
const hashRouter = (loc: Loc): Loc | null => {
  if (!loc.hash.startsWith('#/')) return null
  const inner = split(loc.hash.slice(1))
  const parts = segments(inner.pathname)
  const pathname = parts.length === 2 && parts[0] === 'blocks' && isInt(parts[1]) ? `/block/${parts[1]}` : inner.pathname
  return { pathname, search: inner.search || loc.search, hash: inner.hash }
}

/**
 * Pass C — everything else, keyed on the first path segment.
 *
 * Covers `vocdoni/explorer` forms that could not be adopted and explorer-ng's
 * pre-migration names, which happen not to collide with each other.
 *
 * Trailing `:tab` segments are dropped throughout: the old explorer's tabs were
 * numeric indices (`RouteParamsTabs` read them with `parseInt`) while ours are
 * named slugs in a different order, so there is no faithful mapping. Redirects
 * land on the page's default tab.
 */
const legacyPath = (loc: Loc): Loc | null => {
  const parts = segments(loc.pathname)
  const [head, second, third] = parts
  const count = parts.length
  const path = (pathname: string): Loc => ({ pathname, search: loc.search, hash: '' })
  /** Moves an identifier out of the request line and into the fragment. */
  const fragment = (pathname: string, ...ids: string[]): Loc => ({
    pathname,
    search: '',
    hash: `#${ids.map(hex).join('/')}`,
  })

  switch (head) {
    // `/stats` was the pre-1.0 chain overview; `/dashboard` was explorer-ng's
    // duplicate of the index route.
    case 'stats':
    case 'dashboard':
      return count === 1 ? path('/') : null

    case 'transfers':
      return count === 1 ? path('/tokens') : null

    // ---- elections -------------------------------------------------------
    case 'process':
      // Adopted as-is; only the old tab index needs shedding.
      return count > 2 ? path(`/process/${hex(second)}`) : null
    case 'processes':
      return count === 2 && isInt(second) ? withPage('/processes', loc.search, second) : null
    case 'elections':
      return count === 1 ? path('/processes') : path(`/process/${hex(second)}`)

    // ---- organizations / accounts ---------------------------------------
    case 'account':
      return count > 2 ? path(`/account/${hex(second)}`) : null
    case 'accounts':
      if (count === 1) return null
      // `/accounts/<n>` is the old list page; `/accounts/<address>` is
      // explorer-ng's pre-migration account detail.
      return isInt(second) ? withPage('/accounts', loc.search, second) : path(`/account/${hex(second)}`)
    // Pre-1.0 used the singular for detail and the plural for the list.
    case 'organization':
      return second ? path(`/account/${hex(second)}`) : path('/accounts')
    case 'organizations':
      if (count === 1) return path('/accounts')
      return isInt(second) ? withPage('/accounts', loc.search, second) : path(`/account/${hex(second)}`)

    // ---- votes -----------------------------------------------------------
    case 'envelope':
      // `/envelope/<nullifier>` — the whole point of the fragment.
      return second ? fragment('/envelope', second) : null
    case 'envelopes':
      return count === 2 ? fragment('/envelope', second) : null
    case 'votes':
      return count === 1 ? path('/envelopes') : fragment('/envelope', second)

    // ---- chain -----------------------------------------------------------
    case 'block':
      return count > 2 ? path(`/block/${second}`) : null
    case 'blocks':
      // Old list pagination. Block *detail* is `/block/<height>`, so nothing
      // else claims this shape — except explorer-ng's own hash links, which
      // pass B has already resolved by the time we get here.
      return count === 2 && isInt(second) ? withPage('/blocks', loc.search, second) : null

    case 'transactions':
      // `/transactions/id/<hash>` — the old by-hash permalink, which needed the
      // `id` segment only because `/transactions/<n>` was the list page.
      if (second === 'id' && third) return path(`/transactions/${hex(third)}`)
      // `/transactions/<block>/<index>` is a live route (TransactionByIndex);
      // all it needs here is the tab segment shed.
      if (isInt(second) && isInt(third)) return count > 3 ? path(`/transactions/${second}/${third}`) : null
      if (count === 2 && isInt(second)) return withPage('/transactions', loc.search, second)
      return null

    case 'validator':
      return count > 2 ? path(`/validator/${hex(second)}`) : null
    case 'validators':
      return count === 2 ? path(`/validator/${hex(second)}`) : null

    case 'verify': {
      if (count === 1) {
        const vote = new URLSearchParams(loc.search).get('vote')
        return vote ? fragment('/verify', vote) : null
      }
      // Two 64-hex segments are explorer-ng's `<electionId>/<voteId>` permalink,
      // printed into proof PDFs already downloaded. The old explorer's second
      // segment was a tab index, so anything else is dropped.
      if (isHex64(second) && isHex64(third)) return fragment('/verify', second, third)
      return fragment('/verify', second)
    }

    default:
      return null
  }
}

/**
 * Pass D — `0x` prefixes on current routes.
 *
 * Receipts, wallets and QR codes hand out `0x…`; every detail page feeds its
 * param straight to the API, which wants it bare. Case is left alone —
 * validator and account lookups already compare case-insensitively, and folding
 * it here would be a guess about identifiers this function never sees.
 */
const PREFIXED_ID_ROUTES = ['process', 'account', 'transactions', 'validator']

const stripHexPrefix = (loc: Loc): Loc | null => {
  const parts = segments(loc.pathname)
  if (parts.length !== 2 || !PREFIXED_ID_ROUTES.includes(parts[0])) return null
  if (!/^0x[0-9a-fA-F]+$/.test(parts[1])) return null
  return { ...loc, pathname: `/${parts[0]}/${parts[1].slice(2)}` }
}

const PASSES = [showPrefix, hashRouter, legacyPath, stripHexPrefix]

/**
 * The current URL for a legacy one, or `null` when the URL is already current.
 *
 * Takes and returns a `pathname + search + hash` string. Passes are re-run until
 * the URL stops changing, because they chain: `/#/elections/0xABC` is an
 * explorer-ng hash link (B) wrapping a name that moved (C) wrapping a prefixed
 * id (D).
 */
export const resolveLegacyUrl = (url: string): string | null => {
  let loc = split(url)

  for (let round = 0; round < PASSES.length; round++) {
    let changed = false
    for (const pass of PASSES) {
      const next = pass(loc)
      if (!next || join(next) === join(loc)) continue
      loc = next
      changed = true
    }
    if (!changed) break
  }

  const resolved = join(loc)
  return resolved === url ? null : resolved
}

/**
 * Rewrite the address bar in place, before React mounts.
 *
 * `replaceState` rather than a router redirect: a legacy URL is not somewhere
 * the user chose to be, so it has no business in the history stack, and doing it
 * pre-render means no flash of a 404 and no double navigation.
 *
 * Nothing here may throw. It runs above the root, where there is no error
 * boundary and a failure would leave a blank page.
 */
export const applyLegacyUrl = () => {
  try {
    const current = window.location.pathname + window.location.search + window.location.hash
    const resolved = resolveLegacyUrl(current)
    if (resolved) window.history.replaceState(null, '', resolved)
  } catch {
    // A URL we cannot parse is better served by the router's 404 than by a
    // blank screen.
  }
}
