import type { Pagination } from '~types/api'

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
