import type { Pagination } from '~types/api'
import { ApiError } from '~utils/http'

/**
 * Page count from a gateway list envelope.
 *
 * No v2 list endpoint returns a `totalPages` field — every one of them reports
 * `lastPage`, the **0-based** index of the final page, so the count is
 * `lastPage + 1`. Reading `pagination.totalPages` yields `undefined`, which
 * `PaginationControls` treats as "length unknown": the "of N" disappears and
 * Next never disables, letting a reader page forever past the end of the list.
 */
export const totalPagesOf = (pagination?: Pagination) =>
  typeof pagination?.lastPage === 'number' ? pagination.lastPage + 1 : undefined

/** Vocdoni API error code for a `page` beyond the last page of a list. */
const PAGE_NOT_FOUND = 4057

/**
 * Whether a list request failed only because `page` is past the last page.
 *
 * Query-param list endpoints (`/chain/fees`, `/chain/transfers`, ...) answer
 * that with a 404 code 4057 rather than an empty page; page 0 of an empty list
 * is still a 200 with an empty array.
 */
export const isPageNotFound = (err: unknown) => err instanceof ApiError && err.code === PAGE_NOT_FOUND
