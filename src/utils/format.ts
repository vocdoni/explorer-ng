/**
 * Identifiers arrive from QR scans, receipt e-mails and hand typing, so they
 * turn up with `0x` prefixes, stray whitespace and mixed case. The API only
 * accepts bare lowercase hex.
 */
export const normalizeId = (raw?: string) => (raw ?? '').trim().replace(/^0x/i, '').toLowerCase()

/**
 * Abbreviate a long hex identifier for display, e.g.
 * "a8f7d95dd0de…9067ce37". Returns the value untouched when it is already
 * shorter than the requested window, so short ids are never padded or elided.
 *
 * Display only — never feed the result to a copy button or a route param.
 */
export const shortHex = (value?: string, left = 8, right = 6) => {
  if (!value) return '—'
  if (value.length <= left + right + 1) return value
  return `${value.slice(0, left)}…${value.slice(-right)}`
}

/**
 * Format an API timestamp for display.
 *
 * Accepts RFC3339 strings ("2026-07-28T14:07:52Z") as returned by most
 * endpoints, and bare unix values as returned by chain/info.blockTimestamp.
 * Unix input is in seconds, which Date() would otherwise read as milliseconds
 * and render as January 1970.
 */
export const parseApiDate = (value?: string | number | null): Date | undefined => {
  if (value === undefined || value === null || value === '') return undefined

  let date: Date
  if (typeof value === 'number') {
    // Anything below ~2001-09-09 expressed in ms is far more plausibly seconds.
    date = new Date(value < 1e12 ? value * 1000 : value)
  } else {
    date = new Date(value)
  }

  if (Number.isNaN(date.getTime())) return undefined
  // The zero timestamp is the API's "unset" marker; rendering 1970 is noise.
  if (date.getTime() <= 0) return undefined
  return date
}

export const formatDate = (value?: string | number) => {
  const date = parseApiDate(value)
  if (!date) return '—'
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

export const toNumber = (value: string | number | undefined) => {
  if (value === undefined) return 0
  if (typeof value === 'number') return value
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
