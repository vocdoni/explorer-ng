import { Flex, Spinner, Text } from '@chakra-ui/react'
import { Navigate, useParams } from 'react-router-dom'
import { useTransactions } from '~hooks/useVoconeApi'

/** One page of the block's transactions is enough for every block the chain has
 *  produced so far; the guard is for the day that stops being true. */
const PAGE_SIZE = 200

/**
 * `/transactions/{height}/{index}` — the old explorer's by-position permalink.
 *
 * Every other legacy URL is rewritten before the app mounts (`~utils/legacyUrl`),
 * but a position is not an identifier: only the indexer can say which hash sits
 * at index N of block H. So this one keeps a route, resolves the hash, and
 * hands over to the real transaction page.
 *
 * A block that has no such index is not an error worth a page of its own — the
 * block itself is the most useful thing to show instead.
 */
const TransactionByIndexPage = () => {
  const { height = '', index = '' } = useParams()
  const txs = useTransactions(0, PAGE_SIZE, height)

  if (txs.isLoading) {
    return (
      <Flex align='center' justify='center' gap={3} py={20} color='texts.subtle'>
        <Spinner />
        <Text fontSize='sm'>Looking up transaction {index} of block {height}…</Text>
      </Flex>
    )
  }

  const match = (txs.data?.transactions ?? []).find((tx) => String(tx.index) === index)
  if (match) return <Navigate to={`/transactions/${match.hash}`} replace />

  return <Navigate to={`/block/${height}`} replace />
}

export default TransactionByIndexPage
