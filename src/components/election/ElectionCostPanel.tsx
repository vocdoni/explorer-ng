import { HStack, Link, Table, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { txCostLabel } from '~components/account/txCostLabels'
import { EmptyState } from '~components/shared/EmptyState'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { PageSection } from '~components/shared/PageSection'
import { PaginationControls } from '~components/shared/PaginationControls'
import { RelativeTime } from '~components/shared/RelativeTime'
import { useElectionFees } from '~hooks/useElectionAnalytics'

interface Props {
  electionId: string
  page: number
  onPageChange: (page: number) => void
}

/**
 * Every fee charged against this election — `GET
 * /chain/fees/reference/{electionId}/page/{p}`.
 *
 * The `reference` field is an election id for election transactions but an
 * IPFS URI for account-metadata ones, so rows whose reference is not this
 * election are dropped rather than trusted.
 */
export const ElectionCostPanel = ({ electionId, page, onPageChange }: Props) => {
  const fees = useElectionFees(electionId, page)
  const rows = (fees.data?.fees ?? []).filter((fee) => fee.reference?.toLowerCase() === electionId.toLowerCase())
  const total = rows.reduce((sum, fee) => sum + (fee.cost ?? 0), 0)

  return (
    <PageSection
      title='Cost & fees'
      subtitle='Tokens the organizer spent on this election'
      right={
        rows.length > 0 ? (
          <HStack gap={2}>
            <Text fontSize='sm' color='texts.subtle'>
              Total on this page
            </Text>
            <Text fontSize='lg' fontWeight='bold'>
              {total.toLocaleString()}
            </Text>
          </HStack>
        ) : undefined
      }
    >
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
            {rows.map((fee, i) => (
              <Table.Row key={`${fee.height}-${fee.txType}-${i}`}>
                <Table.Cell>{txCostLabel(fee.txType)}</Table.Cell>
                <Table.Cell textAlign='end'>{fee.cost.toLocaleString()}</Table.Cell>
                <Table.Cell>
                  <Link asChild variant='plain'>
                    <RouterLink to={`/blocks/${fee.height}`}>{fee.height.toLocaleString()}</RouterLink>
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <RelativeTime value={fee.timestamp} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
      {!fees.isLoading && rows.length === 0 && (
        <EmptyState title='No fees recorded' hint='No token cost has been charged against this election.' />
      )}
      <PaginationControls page={page} totalPages={fees.data?.pagination?.totalPages} onChange={onPageChange} />
    </PageSection>
  )
}
