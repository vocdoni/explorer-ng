import { Link, Table } from '@chakra-ui/react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { EmptyState } from '~components/shared/EmptyState'
import { PaginationControls } from '~components/shared/PaginationControls'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { RelativeTime } from '~components/shared/RelativeTime'
import { useAccountFees } from '~hooks/useAccounts'
import { txCostLabel } from './txCostLabels'

interface Props {
  address: string
}

/** Paginated fees-spent table for an account, shared between Account and
 *  Organization detail pages: `GET /accounts/{address}/fees/page/{page}`. */
export const FeesTable = ({ address }: Props) => {
  const [page, setPage] = useState(0)
  const fees = useAccountFees(address, page)
  const rows = fees.data?.fees ?? []

  return (
    <>
      <Table.ScrollArea>
        <Table.Root size='sm' variant='outline'>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Action</Table.ColumnHeader>
              <Table.ColumnHeader textAlign='end'>Cost</Table.ColumnHeader>
              <Table.ColumnHeader>Block</Table.ColumnHeader>
              <Table.ColumnHeader>When</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {fees.isLoading && <TableRowsSkeleton columns={4} />}
            {rows.map((f, i) => (
              <Table.Row key={`${f.reference}-${i}`}>
                <Table.Cell>{txCostLabel(f.txType)}</Table.Cell>
                <Table.Cell textAlign='end'>{f.cost.toLocaleString()}</Table.Cell>
                <Table.Cell>
                  <Link asChild variant='plain'>
                    <RouterLink to={`/block/${f.height}`}>{f.height.toLocaleString()}</RouterLink>
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <RelativeTime value={f.timestamp} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
      {!fees.isLoading && rows.length === 0 && (
        <EmptyState title='No fees paid' hint='This account has not spent tokens on any transactions yet.' />
      )}
      <PaginationControls page={page} totalPages={fees.data?.pagination?.totalPages} onChange={setPage} />
    </>
  )
}
