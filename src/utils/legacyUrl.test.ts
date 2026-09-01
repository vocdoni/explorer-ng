import { describe, expect, it } from 'vitest'
import { resolveLegacyUrl } from '~utils/legacyUrl'

/**
 * The redirect table is the one part of this app whose whole job is to honour
 * URLs nothing in the codebase links to any more. Nothing else exercises it, and
 * a wrong answer is invisible until someone follows a two-year-old link, so it
 * is pinned here case by case.
 *
 * Placeholders are shaped like the real thing, because shape is load-bearing:
 * several rules tell a list page number from an identifier by counting hex
 * digits.
 */
const ELECTION = '1'.repeat(64)
const VOTE = 'a'.repeat(64)
const TX = 'c'.repeat(64)
const ADDRESS = 'b'.repeat(40)

/** `null` means "already current — must be returned untouched". */
const check = (input: string, expected: string | null) => {
  expect(resolveLegacyUrl(input) ?? input).toBe(expected ?? input)
}

describe('resolveLegacyUrl', () => {
  describe('leaves current URLs alone', () => {
    it.each([
      '/',
      '/blocks',
      '/block/1234',
      '/processes',
      `/process/${ELECTION}`,
      '/accounts',
      `/account/${ADDRESS}`,
      '/envelopes',
      `/envelope#${VOTE}`,
      '/verify',
      `/verify#${VOTE}`,
      `/verify#${ELECTION}/${VOTE}`,
      '/transactions',
      `/transactions/${TX}`,
      '/transactions/1234/2',
      '/validators',
      `/validator/${ADDRESS}`,
      '/tokens',
      '/monitoring',
      '/search',
      '/blocks?page=2&txs=withTx',
      `/account/${ADDRESS}?tab=fees`,
      // Unknown paths belong to the router's 404, not to us.
      '/nonsense/path',
      // A trailing slash is matched by the router either way.
      '/verify/',
    ])('%s', (url) => check(url, null))
  })

  describe('old explorer: adopted paths, shedding the tab segment', () => {
    // Old tabs were numeric indices into a tab list whose order has changed, so
    // there is nothing faithful to map them to.
    it.each([
      [`/process/${ELECTION}/2`, `/process/${ELECTION}`],
      [`/account/${ADDRESS}/1/0`, `/account/${ADDRESS}`],
      ['/block/1234/0/0', '/block/1234'],
      [`/validator/${ADDRESS}/1`, `/validator/${ADDRESS}`],
      [`/account/${ADDRESS}/1?tab=fees`, `/account/${ADDRESS}?tab=fees`],
    ])('%s -> %s', check)
  })

  describe('old explorer: list pages moved from the path to the query', () => {
    // The path number was 1-based; `useUrlListState` is 0-based and omits the
    // param at its default.
    it.each([
      ['/processes/3', '/processes?page=2'],
      ['/processes/1', '/processes'],
      ['/processes/0', '/processes'],
      ['/accounts/3', '/accounts?page=2'],
      ['/blocks/3', '/blocks?page=2'],
      ['/blocks/1', '/blocks'],
      ['/transactions/5', '/transactions?page=4'],
      ['/processes/2?status=ACTIVE', '/processes?status=ACTIVE&page=1'],
    ])('%s -> %s', check)
  })

  describe('old explorer: forms that could not be adopted', () => {
    it.each([
      [`/transactions/id/${TX}/1`, `/transactions/${TX}`],
      ['/transactions/1234/2/0', '/transactions/1234/2'],
      ['/stats', '/'],
      ['/dashboard', '/'],
      ['/transfers', '/tokens'],
    ])('%s -> %s', check)
  })

  describe('vote IDs move out of the path and into the fragment', () => {
    // The reason this module exists: a vote ID is a nullifier, and a path is
    // written to every access log between the voter and the site.
    it.each([
      [`/envelope/${VOTE}/1`, `/envelope#${VOTE}`],
      [`/verify/${VOTE}`, `/verify#${VOTE}`],
      [`/verify?vote=${VOTE}`, `/verify#${VOTE}`],
      // Two 64-hex segments are this app's own election/vote permalink, already
      // printed into proof PDFs. A second segment of any other shape is an old
      // tab index and is dropped instead.
      [`/verify/${ELECTION}/${VOTE}`, `/verify#${ELECTION}/${VOTE}`],
      [`/verify/${VOTE}/0`, `/verify#${VOTE}`],
    ])('%s -> %s', check)
  })

  describe('pre-1.0 explorer: identifier hidden behind /show/#/', () => {
    it.each([
      ['/blocks/show/#/1234', '/block/1234'],
      [`/envelopes/show/#/${VOTE}`, `/envelope#${VOTE}`],
      [`/organizations/show/#/${ADDRESS}`, `/account/${ADDRESS}`],
      [`/processes/show/#/${ELECTION}`, `/process/${ELECTION}`],
      ['/transactions/show/#/1234/2', '/transactions/1234/2'],
      [`/verify/#/${VOTE}`, `/verify#${VOTE}`],
      [`/organization/${ADDRESS}`, `/account/${ADDRESS}`],
      ['/organizations', '/accounts'],
      ['/organizations/3', '/accounts?page=2'],
    ])('%s -> %s', check)

    it('resolves /verify/#/ before the generic fragment rule', () => {
      // Both this and an explorer-ng hash link start `…#/`. Getting the order
      // wrong reads the nullifier as a path and 404s.
      check(`/verify/#/${VOTE}`, `/verify#${VOTE}`)
    })
  })

  describe("explorer-ng's own hash-router phase", () => {
    it.each([
      ['/#/elections', '/processes'],
      [`/#/elections/${ELECTION}`, `/process/${ELECTION}`],
      [`/#/organizations/${ADDRESS}`, `/account/${ADDRESS}`],
      [`/#/accounts/${ADDRESS}`, `/account/${ADDRESS}`],
      [`/#/votes/${VOTE}`, `/envelope#${VOTE}`],
      [`/#/votes?electionId=${ELECTION}`, `/envelopes?electionId=${ELECTION}`],
      [`/#/verify/${VOTE}`, `/verify#${VOTE}`],
      [`/#/verify/${ELECTION}/${VOTE}`, `/verify#${ELECTION}/${VOTE}`],
      [`/#/validators/${ADDRESS}`, `/validator/${ADDRESS}`],
      [`/#/transactions/${TX}`, `/transactions/${TX}`],
      ['/#/blocks', '/blocks'],
      ['/#/dashboard', '/'],
      ['/#/transfers', '/tokens'],
      ['/#/tokens', '/tokens'],
    ])('%s -> %s', check)

    it('reads /#/blocks/<n> as a height, not a list page', () => {
      // The one genuinely ambiguous shape. explorer-ng meant block height n and
      // the old explorer meant list page n, and both are bare integers — so the
      // `#/` prefix is the only evidence of provenance, and it is used while it
      // is still there.
      check('/#/blocks/1234', '/block/1234')
      check('/blocks/1234', '/blocks?page=1233')
    })
  })

  describe('identifier normalization', () => {
    it.each([
      [`/#/elections/0x${ELECTION.toUpperCase()}`, `/process/${ELECTION}`],
      [`/verify?vote=0x${VOTE.toUpperCase()}`, `/verify#${VOTE}`],
      [`/transactions/id/0x${TX.toUpperCase()}`, `/transactions/${TX}`],
      // A `0x` prefix is stripped even on a path that is otherwise current.
      [`/process/0x${ELECTION}`, `/process/${ELECTION}`],
    ])('%s -> %s', check)
  })

  describe('chains passes until the URL settles', () => {
    it('unwraps a hash link, renames the route, then strips the prefix', () => {
      check(`/#/verify/0x${VOTE.toUpperCase()}`, `/verify#${VOTE}`)
    })
  })

  it('never throws, whatever it is handed', () => {
    // It runs above the root, where there is no error boundary and a throw
    // would leave a blank page.
    for (const url of ['', '#', '?', '///', '/#/', '/%', '/verify#', '/verify?vote=', '/blocks/NaN']) {
      expect(() => resolveLegacyUrl(url)).not.toThrow()
    }
  })
})
