import type { Election, ElectionMetadata } from '~types/api'
// Relative and extensioned, unlike the `~utils/http` used elsewhere: this module is
// loaded directly under Node by `scripts/check-results.mjs`, which resolves neither the
// `~*` alias nor an extensionless specifier. `allowImportingTsExtensions` in tsconfig
// makes it valid, and Vite resolves it unchanged.
import { fetchJson } from './http.ts'

/**
 * Finding an election's metadata document, wherever the gateway left it.
 *
 * The gateway resolves `ipfs://` metadata into `election.metadata` but leaves
 * `https://` documents — the ones the SaaS API writes — as a bare URL. Roughly a fifth
 * of recent elections on the LTS gateway are in that state, and without the document
 * there is no title, no question wording, and no way to read the results matrix, so
 * they render as bare ids and an uninterpreted tally.
 */

/**
 * The document URL to follow, or undefined when there is nothing to fetch.
 *
 * `metadataURL` is written by whoever created the election, so it is untrusted input:
 * only `http(s)` is followed, which rules out `data:`, `file:` and `javascript:`.
 * `ipfs://` is deliberately not resolved — the gateway already inlines those, and
 * picking a public IPFS gateway here would send the reader's browser to a third party
 * this app never chose.
 */
export const remoteMetadataUrl = (election: Election): string | undefined => {
  if (election.metadata) return undefined
  const raw = election.metadataURL?.trim()
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

/**
 * Inline metadata when the gateway resolved it, otherwise the document it points at.
 *
 * Never throws: an unreachable or malformed document leaves the election exactly as
 * unreadable as it was before, and every consumer already handles missing metadata.
 * Failing the whole election record over it would be worse than degrading.
 */
export const resolveElectionMetadata = async (election: Election): Promise<ElectionMetadata | undefined> => {
  if (election.metadata) return election.metadata
  const url = remoteMetadataUrl(election)
  if (!url) return undefined
  try {
    const document = await fetchJson<unknown>(url, { credentials: 'omit' })
    // A metadata document is an object. Anything else — an array, a string, an error
    // page that happened to parse — is not something to render an election from.
    if (!document || typeof document !== 'object' || Array.isArray(document)) return undefined
    return document as ElectionMetadata
  } catch {
    return undefined
  }
}

/** The election with its metadata document inlined, if one could be found. */
export const withMetadata = (election: Election, metadata?: ElectionMetadata | null): Election =>
  election.metadata || !metadata ? election : { ...election, metadata }
