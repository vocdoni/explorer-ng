import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { normalizeId } from '~utils/format'

/**
 * The identifiers in the URL fragment, normalized.
 *
 * `/verify#<voteId>` and `/envelope#<voteId>` keep their identifier out of the
 * path on purpose. A vote ID is a nullifier — the value that ties a person to
 * their ballot receipt — and the fragment is the one part of a URL a browser
 * never sends, so it appears in no access log, no proxy trace and no referrer.
 * Everything else about these pages is a normal route.
 *
 * Segments are split on `/`, so a single-identifier form and the
 * `#<electionId>/<voteId>` permalink both parse here.
 *
 * The `hashchange` listener is not redundant. React Router's browser history
 * subscribes to `popstate` only; a fragment typed into the address bar of an
 * already-open tab fires `hashchange`, and whether `popstate` follows is
 * inconsistent across browsers. That case — pasting a receipt link over a tab
 * that is already on this page — is exactly the one the fragment exists for, so
 * it gets an explicit sync. `replace` because the browser has already pushed its
 * own entry for that navigation.
 */
export const useHashIds = (): string[] => {
  const { hash } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const sync = () => {
      if (window.location.hash === hash) return
      navigate(window.location.pathname + window.location.search + window.location.hash, { replace: true })
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [hash, navigate])

  return useMemo(() => hash.replace(/^#/, '').split('/').filter(Boolean).map(normalizeId), [hash])
}
