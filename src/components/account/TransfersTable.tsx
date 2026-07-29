import { Icon, Link, Tag, Table } from '@chakra-ui/react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { LuArrowDownLeft, LuArrowUpRight } from 'react-icons/lu'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { PaginationControls } from '~components/shared/PaginationControls'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { RelativeTime } from '~components/shared/RelativeTime'
import { useAccountTransfers } from '~hooks/useAccounts'

interface Props {
  /** The account this table is scoped to — direction badges are relative to it. */
  address: string
}

/** Paginated token-transfer table for an account, shared between Account and
 *  Organization detail pages: `GET /accounts/{address}/transfers/page/{page}`. */
export const TransfersTable = ({ address }: Props) => {
  const [page, setPage] = useState(0)
  const transfers = useAccountTransfers(address, page)
  const rows = transfers.data?.transfers ?? []

  return (
    <>
      <Table.ScrollArea>
        <Table.Root size='sm' variant='outline'>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Direction</Table.ColumnHeader>
              <Table.ColumnHeader>Counterpart</Table.ColumnHeader>
              <Table.ColumnHeader textAlign='end'>Amount</Table.ColumnHeader>
              <Table.ColumnHeader>Transaction</Table.ColumnHeader>
              <Table.ColumnHeader>When</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {transfers.isLoading && <TableRowsSkeleton columns={5} />}
            {rows.map((t, i) => {
              const outgoing = t.from?.toLowerCase() === address.toLowerCase()
              const counterpart = outgoing ? t.to : t.from
              return (
                <Table.Row key={`${t.txHash}-${i}`}>
                  <Table.Cell>
                    <Tag.Root colorPalette={outgoing ? 'orange' : 'green'}>
                      <Icon boxSize={3}>{outgoing ? <LuArrowUpRight /> : <LuArrowDownLeft />}</Icon>
                      <Tag.Label>{outgoing ? 'Sent' : 'Received'}</Tag.Label>
                    </Tag.Root>
                  </Table.Cell>
                  <Table.Cell>
                    <HashDisplay value={counterpart} copyLabel='Account address' to={`/accounts/${counterpart}`} />
                  </Table.Cell>
                  <Table.Cell textAlign='end'>{t.amount.toLocaleString()}</Table.Cell>
                  <Table.Cell>
                    <Link asChild variant='plain'>
                      <RouterLink to={`/transactions/${t.txHash}`}>
                        <HashDisplay value={t.txHash} copyLabel='Transaction hash' />
                      </RouterLink>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <RelativeTime value={t.timestamp} />
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
      {!transfers.isLoading && rows.length === 0 && (
        <EmptyState title='No token transfers' hint='This account has not sent or received any tokens yet.' />
      )}
      <PaginationControls page={page} totalPages={transfers.data?.pagination?.totalPages} onChange={setPage} />
    </>
  )
}
