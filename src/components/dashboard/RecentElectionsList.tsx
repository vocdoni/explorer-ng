import { Link, Table, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { RelativeTime } from '~components/shared/RelativeTime'
import { StatusTag } from '~components/shared/StatusTag'
import type { ElectionSummary } from '~types/api'

interface Props {
  elections: ElectionSummary[]
  titles: Record<string, string | undefined>
  isLoading: boolean
}

/**
 * Recent elections as a row list rather than cards. Cards gave every election a
 * block of dashboard real estate and made five of them read as the page's main
 * event; a table puts them on the same footing as the votes, blocks and
 * transactions feeds — a scannable "what just happened", with the election page
 * one click away for anything more.
 */
export const RecentElectionsList = ({ elections, titles, isLoading }: Props) => {
  if (!isLoading && elections.length === 0)
    return <EmptyState title='No elections yet' hint='Elections created on this chain will show up here.' py={6} />

  return (
    <Table.ScrollArea>
      <Table.Root size='sm' variant='outline'>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Election</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader textAlign='end'>Votes</Table.ColumnHeader>
            <Table.ColumnHeader textAlign='end'>Started</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading && elections.length === 0 && <TableRowsSkeleton rows={5} columns={4} />}
          {elections.map((e) => {
            const title = titles[e.electionId]
            return (
              <Table.Row key={e.electionId}>
                {/* overflow must be clipped at the cell AND the anchor must be a
                    block, otherwise the inline link lets long titles paint over
                    the neighbouring status column in the auto-layout table */}
                <Table.Cell maxW='320px' overflow='hidden'>
                  {title ? (
                    <Link asChild variant='plain' display='block' minW={0} overflow='hidden'>
                      <RouterLink to={`/elections/${e.electionId}`}>
                        <Text truncate fontSize='sm' title={title}>
                          {title}
                        </Text>
                      </RouterLink>
                    </Link>
                  ) : (
                    <HashDisplay
                      value={e.electionId}
                      copyLabel='Election ID'
                      to={`/elections/${e.electionId}`}
                    />
                  )}
                </Table.Cell>
                <Table.Cell>
                  <StatusTag status={e.status} size='sm' />
                </Table.Cell>
                <Table.Cell textAlign='end'>{(e.voteCount ?? 0).toLocaleString()}</Table.Cell>
                <Table.Cell textAlign='end'>
                  <RelativeTime value={e.startDate} mode='relative' fontSize='sm' />
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  )
}
