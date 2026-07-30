import { useQuery } from '@tanstack/react-query'
import { useApi } from '~contexts/ApiContext'
import { fetchJson } from '~utils/http'

export interface ChainStats {
  txCountByType: Record<string, number>
  electionCountByStatus: Record<string, number>
  accountCount: number
  electionCount: number
  voteCount: number
}

/**
 * Single, session-cached probe for `GET /chain/stats` — the aggregate/counts
 * endpoint that only new gateways expose (older ones answer 404/error). This
 * is the one detection point the rest of the app feature-detects against:
 * once resolved, hooks reuse `isNew` instead of each running their own
 * probe, so a single request replaces the eleven `limit=1` breakdown calls
 * that used to stand in for a missing aggregation endpoint.
 *
 * React Query already dedupes by `queryKey`, so every caller across the app
 * shares this one in-flight/cached request regardless of how many
 * components call the hook — "once per session" falls out of that for free.
 * `retry: false` + `staleTime: Infinity` mean an old gateway is asked
 * exactly once, not re-probed on every remount.
 */
export const useGatewayCapabilities = () => {
  const { apiUrl } = useApi()
  const stats = useQuery({
    queryKey: ['chain-stats', apiUrl],
    queryFn: () => fetchJson<ChainStats>(`${apiUrl}/chain/stats`),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  })

  return {
    /** True once the probe has confirmed the gateway exposes `/chain/stats`.
     *  False while unresolved *and* on confirmed-old gateways alike — callers
     *  that need to distinguish "still checking" from "known old" should also
     *  read `isLoading`. */
    isNew: stats.isSuccess,
    isLoading: stats.isFetching && !stats.isSuccess && !stats.isError,
    stats: stats.data,
  }
}
