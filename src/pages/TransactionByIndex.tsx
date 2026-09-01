import { Flex, Spinner, Text } from '@chakra-ui/react'
import { Navigate, useParams } from 'react-router'
import { EmptyState } from '~components/shared/EmptyState'
import { useTransactionByIndex } from '~hooks/useVoconeApi'

/**
 * `/transactions/{height}/{index}` — the old explorer's by-position permalink.
 *
 * Every other legacy URL is rewritten before the app mounts (`~utils/legacyUrl`),
 * but a position is not an identifier: only the indexer can say which hash sits
 * at index N of block H. So this one keeps a route, asks
 * `GET /chain/transactions/{height}/{index}`, and hands over to the real
 * transaction page.
 *
 * A block that has no such index answers 204 (`fetchJson` maps it to an object
 * without `txInfo`) — not an error worth a page of its own; the block itself is
 * the most useful thing to show instead. A gateway failure is different:
 * redirecting there too would silently claim the position is empty, so it
 * renders as an error.
 */
const TransactionByIndexPage = () => {
  const { height = '', index = '' } = useParams()
  const tx = useTransactionByIndex(height, index)

  if (tx.isLoading) {
    return (
      <Flex align='center' justify='center' gap={3} py={20} color='texts.subtle'>
        <Spinner />
        <Text fontSize='sm'>
          Looking up transaction {index} of block {height}…
        </Text>
      </Flex>
    )
  }

  if (tx.isError) {
    return (
      <EmptyState
        title='Could not look up the transaction'
        hint={`The gateway could not answer for position ${index} of block ${height}.${
          tx.error instanceof Error ? ` ${tx.error.message}` : ''
        }`}
      />
    )
  }

  const hash = tx.data?.txInfo?.hash
  if (hash) return <Navigate to={`/transactions/${hash}`} replace />

  return <Navigate to={`/block/${height}`} replace />
}

export default TransactionByIndexPage
