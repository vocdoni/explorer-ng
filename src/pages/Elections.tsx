import { Button, Grid, Input, NativeSelect, Table } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { ElectionListRow } from '~components/election-list/ElectionListRow'
import { EmptyState } from '~components/shared/EmptyState'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { PaginationControls } from '~components/shared/PaginationControls'
import { useUrlListState } from '~hooks/useUrlListState'
import { useElectionTitles, useElections } from '~hooks/useVoconeApi'

const DEFAULTS = { page: '0', status: '', organizationId: '', electionId: '' }

const STATUS_OPTIONS = [
  { value: 'ready', label: 'Voting open' },
  { value: 'paused', label: 'Voting paused' },
  { value: 'ended', label: 'Voting closed' },
  { value: 'results', label: 'Results published' },
  { value: 'canceled', label: 'Canceled' },
]

const ElectionsPage = () => {
  // Applied filters + page live in the URL, so Back from an election restores
  // this exact view. The three inputs keep local drafts until "Apply filters".
  const { state, setState, num } = useUrlListState(DEFAULTS)
  const page = num('page')
  const [status, setStatus] = useState(state.status)
  const [organizationId, setOrganizationId] = useState(state.organizationId)
  const [electionId, setElectionId] = useState(state.electionId)

  // Re-seed the drafts when the URL changes underneath us (Back/Forward, or a
  // link that arrives with ?organizationId= already set).
  useEffect(() => {
    setStatus(state.status)
    setOrganizationId(state.organizationId)
    setElectionId(state.electionId)
  }, [state.status, state.organizationId, state.electionId])

  const q = useElections(
    page,
    20,
    state.status || undefined,
    state.organizationId || undefined,
    state.electionId || undefined
  )
  const elections = q.data?.elections ?? []
  const { titles } = useElectionTitles(elections.map((e) => e.electionId))

  return (
    <Grid gap={6}>
      <PageHeader title='Elections' subtitle='Every election run on this chain — open one to see votes and results.' />

      <Grid templateColumns={{ base: '1fr', md: 'repeat(5, 1fr)' }} gap={2}>
        <NativeSelect.Root>
          <NativeSelect.Field value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value=''>All statuses</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Input
          placeholder='Organization ID'
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
        />
        <Input placeholder='Election ID' value={electionId} onChange={(e) => setElectionId(e.target.value)} />
        <Button onClick={() => setState({ status, organizationId, electionId, page: DEFAULTS.page })}>
          Apply filters
        </Button>
        <Button variant='outline' onClick={() => setState({ ...DEFAULTS })}>
          Clear
        </Button>
      </Grid>

      <PageSection title='Election list'>
        <Table.ScrollArea>
          <Table.Root size='md' variant='outline'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Election</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Start</Table.ColumnHeader>
                <Table.ColumnHeader>End</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Votes</Table.ColumnHeader>
                <Table.ColumnHeader>Election ID</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {q.isLoading && <TableRowsSkeleton columns={6} />}
              {elections.map((e) => (
                <ElectionListRow key={e.electionId} election={e} title={titles[e.electionId]} />
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
        {!q.isLoading && elections.length === 0 && (
          <EmptyState title='No elections found' hint='Try clearing the filters above.' />
        )}
      </PageSection>

      <PaginationControls
        page={page}
        totalPages={q.data?.pagination?.totalPages}
        onChange={(next) => setState({ page: String(next) })}
      />
    </Grid>
  )
}

export default ElectionsPage
