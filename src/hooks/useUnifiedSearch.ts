import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { useApi } from '~contexts/ApiContext'
import { fetchJson } from '~utils/http'

export type SearchStatus = 'idle' | 'searching' | 'notfound'

/**
 * Resolves any pasted identifier to the route that renders it.
 *
 * Shared by the header search box and the dedicated Search page so both behave
 * identically.
 */
export const useUnifiedSearch = () => {
  const [status, setStatus] = useState<SearchStatus>('idle')
  const nav = useNavigate()
  const { apiUrl } = useApi()

  // A missing transaction answers 204 No Content rather than 404, so "did not
  // throw" is not enough — an empty body means the identifier did not resolve.
  const resolves = useCallback(
    async (path: string) => {
      try {
        const data = await fetchJson<Record<string, unknown>>(`${apiUrl}${path}`)
        return !!data && Object.keys(data).length > 0
      } catch {
        return false
      }
    },
    [apiUrl]
  )

  const search = useCallback(
    async (raw: string) => {
      const q = raw.trim().replace(/^0x/i, '')
      if (!q) return
      setStatus('searching')

      // Block height is the only purely numeric identifier.
      if (/^[0-9]+$/.test(q)) {
        setStatus('idle')
        nav(`/block/${q}`)
        return
      }

      if (!/^[0-9a-fA-F]+$/.test(q)) {
        setStatus('notfound')
        return
      }

      // 40 hex characters is an account / organization address.
      if (q.length === 40) {
        setStatus('idle')
        nav(`/account/${q}`)
        return
      }

      // Election IDs, vote nullifiers, transaction hashes and block hashes are
      // all 64 hex characters, so shape cannot tell them apart — ask the chain
      // which one actually exists, in order of how often it is searched for.
      //
      // The left side of each test is an API path and the right side is a route;
      // they read alike but are not interchangeable, least of all for votes,
      // whose route carries the nullifier in the fragment.
      if (q.length === 64) {
        const target = (await resolves(`/elections/${q}`))
          ? `/process/${q}`
          : (await resolves(`/votes/${q}`))
            ? `/envelope#${q}`
            : (await resolves(`/chain/transactions/${q}`))
              ? `/transactions/${q}`
              : undefined

        if (target) {
          setStatus('idle')
          nav(target)
          return
        }

        try {
          // No route renders a block by hash, so resolve it to a height first.
          const block = await fetchJson<{ height?: number }>(`${apiUrl}/chain/blocks/hash/${q}`)
          if (typeof block.height === 'number') {
            setStatus('idle')
            nav(`/block/${block.height}`)
            return
          }
        } catch {
          // Fall through to the not-found state below.
        }
      }

      setStatus('notfound')
    },
    [apiUrl, nav, resolves]
  )

  const reset = useCallback(() => setStatus('idle'), [])

  return { search, status, reset }
}
