import { Link, Table } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { RelativeTime } from '~components/shared/RelativeTime'
import type { Transfer } from '~hooks/useAccounts'

interface Props {
  transfers: Transfer[]
  isLoading: boolean
}

/** Compact "latest token transfers" table for the dashboard — from, to, amount,
 *  when, and a link to the transaction. Chain-wide, unlike the per-account
 *  `TransfersTable` on account/organization pages. */
export const LatestTransfersList = ({ transfers, isLoading }: Props) => {
  if (!isLoading && transfers.length === 0) {
    return <EmptyState title='No token transfers yet' hint='No tokens have moved on this chain yet.' py={6} />
  }

  return (
    <Table.ScrollArea>
      <Table.Root size='sm' variant='outline'>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>From</Table.ColumnHeader>
            <Table.ColumnHeader>To</Table.ColumnHeader>
            <Table.ColumnHeader textAlign='end'>Amount</Table.ColumnHeader>
            <Table.ColumnHeader>When</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading && transfers.length === 0 && <TableRowsSkeleton rows={5} columns={4} />}
          {transfers.map((t, i) => (
            <Table.Row key={`${t.txHash}-${i}`}>
              <Table.Cell>
                <HashDisplay value={t.from} copyLabel='Account address' to={`/account/${t.from}`} left={6} right={4} />
              </Table.Cell>
              <Table.Cell>
                <HashDisplay value={t.to} copyLabel='Account address' to={`/account/${t.to}`} left={6} right={4} />
              </Table.Cell>
              <Table.Cell textAlign='end'>{t.amount.toLocaleString()} tokens</Table.Cell>
              <Table.Cell>
                <Link asChild variant='plain'>
                  <RouterLink to={`/transactions/${t.txHash}`}>
                    <RelativeTime value={t.timestamp} mode='relative' fontSize='sm' />
                  </RouterLink>
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  )
}
