export class ApiError extends Error {
  status?: number
  payload?: unknown
  /** Vocdoni API error code (e.g. 4023 malformed voteId), when the body carries one. */
  code?: number
}

interface ApiErrorBody {
  error?: string
  code?: number
}

export const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const resp = await fetch(url, init)

  if (!resp.ok) {
    // Read the body once: calling .json() then .text() on the same response
    // throws "body stream already read" and masks the original failure.
    const raw = await resp.text()
    let parsed: unknown = raw
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Non-JSON error body (proxy HTML, plain text): keep the raw string.
    }
    const body = parsed as ApiErrorBody
    // Prefer the API's own message over a bare status code.
    const detail = typeof body?.error === 'string' ? body.error : `Request failed (${resp.status})`
    const error = new ApiError(detail)
    error.status = resp.status
    error.payload = parsed
    error.code = body?.code
    throw error
  }

  // Several endpoints (notably /votes/verify/{electionId}/{voteId}) signal
  // success with a 200 whose body is empty or a bare newline — both of which
  // JSON.parse rejects with "Unexpected end of JSON input".
  const text = (await resp.text()).trim()
  if (!text) return {} as T
  return JSON.parse(text) as T
}
