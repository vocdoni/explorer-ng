import { Grid, Input, Link, Table } from '@chakra-ui/react'
import { useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { PaginationControls } from '~components/shared/PaginationControls'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { useVotes } from '~hooks/useVoconeApi'

const VotesPage = () => {
  const [searchParams] = useSearchParams()
  const initialElection = searchParams.get('electionId') ?? ''
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState(initialElection)
  const votes = useVotes(page, 25, filter || undefined)
  const rows = votes.data?.votes ?? []

  return (
    <Grid gap={4}>
      <PageHeader
        title='Votes'
        subtitle='Every ballot recorded on the chain. A vote ID is a one-time code proving a vote was cast, without revealing who cast it.'
      />
      <Input
        placeholder='Filter by election ID'
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value)
          setPage(0)
        }}
      />
      <PageSection title='Vote list'>
        <Table.ScrollArea>
          <Table.Root size='sm' variant='outline'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Vote ID</Table.ColumnHeader>
                <Table.ColumnHeader>Election</Table.ColumnHeader>
                <Table.ColumnHeader>Voter</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Cast</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {votes.isLoading && <TableRowsSkeleton columns={4} />}
              {rows.map((v) => (
                <Table.Row key={v.voteID}>
                  <Table.Cell>
                    <HashDisplay value={v.voteID} copyLabel='Vote ID' to={`/votes/${v.voteID}`} />
                  </Table.Cell>
                  <Table.Cell>
                    <HashDisplay value={v.electionID} copyLabel='Election ID' to={`/elections/${v.electionID}`} />
                  </Table.Cell>
                  <Table.Cell>
                    <HashDisplay value={v.voterID} copyLabel='Voter ID' />
                  </Table.Cell>
                  <Table.Cell textAlign='end'>
                    <Link asChild variant='plain'>
                      <RouterLink to={`/blocks/${v.blockHeight ?? ''}`}>block {v.blockHeight ?? 0}</RouterLink>
                    </Link>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
        {!votes.isLoading && rows.length === 0 && (
          <EmptyState title='No votes found' hint='Nothing matches this filter yet.' />
        )}
      </PageSection>
      <PaginationControls page={page} totalPages={votes.data?.pagination?.totalPages} onChange={setPage} />
    </Grid>
  )
}

export default VotesPage
