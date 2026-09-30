import { Button, Grid, HStack, Input, NativeSelect, Stack, Table, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { ElectionListRow } from '~components/election-list/ElectionListRow'
import { EmptyState } from '~components/shared/EmptyState'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { PaginationControls } from '~components/shared/PaginationControls'
import { useUrlListState } from '~hooks/useUrlListState'
import { type ElectionFilters, useElections, useResolvedElectionTitles } from '~hooks/useVoconeApi'
import { totalPagesOf } from '~utils/pagination'

const DEFAULTS = {
  page: '0',
  status: '',
  organizationId: '',
  electionId: '',
  closedEarly: '',
  startFrom: '',
  startTo: '',
  endFrom: '',
  endTo: '',
}

type Draft = Omit<typeof DEFAULTS, 'page'>
const draftOf = (state: typeof DEFAULTS): Draft => {
  const draft: Partial<typeof DEFAULTS> = { ...state }
  delete draft.page
  return draft as Draft
}

/** The date inputs pick whole UTC days; the API's bounds are inclusive instants. */
const dayStart = (day: string) => (day ? `${day}T00:00:00Z` : undefined)
const dayEnd = (day: string) => (day ? `${day}T23:59:59Z` : undefined)

const filtersOf = (s: Draft): ElectionFilters => ({
  status: s.status || undefined,
  organizationId: s.organizationId || undefined,
  electionId: s.electionId || undefined,
  manuallyEnded: s.closedEarly === 'yes' ? true : s.closedEarly === 'no' ? false : undefined,
  startDateAfter: dayStart(s.startFrom),
  startDateBefore: dayEnd(s.startTo),
  endDateAfter: dayStart(s.endFrom),
  endDateBefore: dayEnd(s.endTo),
})

const DateBound = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <Stack gap={1}>
    <Text fontSize='xs' color='fg.muted'>
      {label}
    </Text>
    <Input type='date' aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
  </Stack>
)

const STATUS_OPTIONS = [
  { value: 'ready', label: 'Voting open' },
  { value: 'paused', label: 'Voting paused' },
  { value: 'ended', label: 'Voting closed' },
  { value: 'results', label: 'Results published' },
  { value: 'canceled', label: 'Canceled' },
]

const ElectionsPage = () => {
  // Applied filters + page live in the URL, so Back from an election restores
  // this exact view. The inputs keep a local draft until "Apply filters".
  const { state, setState, num } = useUrlListState(DEFAULTS)
  const page = num('page')
  const applied = draftOf(state)
  const appliedKey = JSON.stringify(applied)
  const [draft, setDraft] = useState<Draft>(applied)
  const edit = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }))

  // Re-seed the draft when the URL changes underneath us (Back/Forward, or a
  // link that arrives with ?organizationId= already set).
  useEffect(() => {
    setDraft(JSON.parse(appliedKey) as Draft)
  }, [appliedKey])

  const q = useElections(page, 20, filtersOf(applied))
  const elections = q.data?.elections ?? []
  const { titles } = useResolvedElectionTitles(elections)

  return (
    <Grid gap={6}>
      <PageHeader title='Elections' subtitle='Every election run on this chain — open one to see votes and results.' />

      <Stack gap={3}>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={2}>
          <NativeSelect.Root>
            <NativeSelect.Field aria-label='Status' value={draft.status} onChange={(e) => edit('status')(e.target.value)}>
              <option value=''>All statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <NativeSelect.Root>
            <NativeSelect.Field
              aria-label='How the election ended'
              value={draft.closedEarly}
              onChange={(e) => edit('closedEarly')(e.target.value)}
            >
              <option value=''>Any ending</option>
              <option value='yes'>Closed early by the organizer</option>
              <option value='no'>Not closed early</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Input
            placeholder='Organization ID'
            value={draft.organizationId}
            onChange={(e) => edit('organizationId')(e.target.value)}
          />
          <Input placeholder='Election ID' value={draft.electionId} onChange={(e) => edit('electionId')(e.target.value)} />
        </Grid>
        <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={2}>
          <DateBound label='Starts on or after' value={draft.startFrom} onChange={edit('startFrom')} />
          <DateBound label='Starts on or before' value={draft.startTo} onChange={edit('startTo')} />
          <DateBound label='Ends on or after' value={draft.endFrom} onChange={edit('endFrom')} />
          <DateBound label='Ends on or before' value={draft.endTo} onChange={edit('endTo')} />
        </Grid>
        <HStack gap={2} justify='space-between' wrap='wrap'>
          <Text fontSize='xs' color='fg.muted'>
            Dates are whole days in UTC.
          </Text>
          <HStack gap={2}>
            <Button variant='outline' onClick={() => setState({ ...DEFAULTS })}>
              Clear
            </Button>
            <Button onClick={() => setState({ ...draft, page: DEFAULTS.page })}>Apply filters</Button>
          </HStack>
        </HStack>
      </Stack>

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
        totalPages={totalPagesOf(q.data?.pagination)}
        onChange={(next) => setState({ page: String(next) })}
      />
    </Grid>
  )
}

export default ElectionsPage
