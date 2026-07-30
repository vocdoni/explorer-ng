import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/** The shape both the defaults and the resolved state take: every list-state
 *  value is stored as a string, since that is what a URL can carry. */
export type UrlListState<K extends string> = Record<K, string>

export interface UrlListStateApi<K extends string> {
  /** Current value of every key — the URL value when present, else the default. */
  state: UrlListState<K>
  /** Merge a partial update into the URL. Values equal to their default are
   *  removed so the address bar stays clean, and the entry is always replaced
   *  so filter edits never pile up in the history stack. */
  setState: (patch: Partial<UrlListState<K>>) => void
  /** Numeric read of a key, falling back to the default (and to 0 if that is
   *  not a number either) so a hand-edited `?page=abc` cannot break the list. */
  num: (key: K) => number
}

const toNumber = (value: string, fallback: string): number => {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) return parsed
  const parsedFallback = Number(fallback)
  return Number.isFinite(parsedFallback) ? parsedFallback : 0
}

/**
 * List state (page, filters, sort, active tab) kept in the URL search params so
 * the browser's history restores it for free: navigating into a detail page and
 * pressing Back lands on the very same list view, and any such view is a
 * shareable link.
 *
 * Updates always use `replace`, because the history entry that matters is the
 * one the router pushes when navigating away — intra-list changes must not put
 * fifteen keystrokes between the list and wherever the user came from.
 */
export const useUrlListState = <K extends string>(defaults: UrlListState<K>): UrlListStateApi<K> => {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo(() => {
    const resolved = {} as UrlListState<K>
    for (const key of Object.keys(defaults) as K[]) {
      resolved[key] = searchParams.get(key) ?? defaults[key]
    }
    return resolved
  }, [searchParams, defaults])

  const setState = useCallback(
    (patch: Partial<UrlListState<K>>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(patch) as [K, string | undefined][]) {
            if (value === undefined) continue
            if (value === defaults[key]) next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams, defaults]
  )

  const num = useCallback((key: K) => toNumber(state[key], defaults[key]), [state, defaults])

  return { state, setState, num }
}
