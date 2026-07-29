import { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface ApiContextType {
  apiUrl: string
  setApiUrl: (url: string) => void
  refreshMs: number
}

const ApiContext = createContext<ApiContextType | undefined>(undefined)

const STORAGE_KEY = 'vocone-webui.apiUrl'

const readStoredApiUrl = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? undefined
  } catch {
    // Private-mode / disabled storage: fall back to configured defaults.
    return undefined
  }
}

// Normalise so that both "https://host" and "https://host/v2/" resolve to the
// same base, and hooks can concatenate paths like `/chain/info` safely.
const normalizeApiUrl = (raw: string) => {
  const url = raw.trim().replace(/\/+$/, '')
  return /\/v\d+$/.test(url) ? url : `${url}/v2`
}

const getRuntimeApiUrl = () => {
  const stored = readStoredApiUrl()
  if (stored) return normalizeApiUrl(stored)
  // Docker injects runtime config at container start, so it wins over build-time env.
  if (window.__RUNTIME_CONFIG__?.VOCONE_API_URL) return normalizeApiUrl(window.__RUNTIME_CONFIG__.VOCONE_API_URL)
  if (import.meta.env.VOCONE_API_URL) return normalizeApiUrl(import.meta.env.VOCONE_API_URL)
  if (import.meta.env.VITE_VOCONE_API_URL) return normalizeApiUrl(import.meta.env.VITE_VOCONE_API_URL)
  // Nothing configured: use the public LTS gateway so a fresh checkout renders
  // real data without setup.
  return 'https://api.vocdoni.io/v2'
}

// Hard floor for API polling: at most one request per query per 15s, whatever a
// runtime override or .env asks for. Keeps load on shared public gateways
// bounded. Every polling hook inherits it through `refreshMs`.
const MIN_REFRESH_MS = 15000

const getRuntimeRefresh = () => {
  const raw =
    window.__RUNTIME_CONFIG__?.VOCONE_REFRESH_MS ??
    import.meta.env.VOCONE_REFRESH_MS ??
    import.meta.env.VITE_VOCONE_REFRESH_MS ??
    '15000'
  const n = Number(raw)
  const resolved = Number.isFinite(n) && n > 0 ? n : 15000
  return Math.max(resolved, MIN_REFRESH_MS)
}

export const ApiProvider = ({ children }: { children: React.ReactNode }) => {
  const [apiUrl, setApiUrlState] = useState(getRuntimeApiUrl)

  const setApiUrl = useCallback((url: string) => {
    const next = normalizeApiUrl(url)
    setApiUrlState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Persistence is best-effort; the in-memory value still applies.
    }
  }, [])

  const refreshMs = useMemo(getRuntimeRefresh, [])
  const value = useMemo(() => ({ apiUrl, setApiUrl, refreshMs }), [apiUrl, setApiUrl, refreshMs])
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

export const useApi = () => {
  const ctx = useContext(ApiContext)
  if (!ctx) throw new Error('useApi must be used within ApiProvider')
  return ctx
}

export const useApiConfig = () => {
  useApi()
}
