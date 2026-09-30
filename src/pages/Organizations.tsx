import { Button, Grid, HStack, Input, Link, NativeSelect, Skeleton, Spinner, Table, Text } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { AddressAvatar } from '~components/account/AddressAvatar'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { PaginationControls } from '~components/shared/PaginationControls'
import type { OrgStats } from '~hooks/useOrgStats'
import { useOrgStats } from '~hooks/useOrgStats'
import { useOrgSortSupport } from '~hooks/useGatewayCapabilities'
import { useUrlListState } from '~hooks/useUrlListState'
import { useOrganizations } from '~hooks/useVoconeApi'
import type { OrgSort } from '~hooks/useVoconeApi'
import type { OrganizationSummary } from '~types/api'
import { totalPagesOf } from '~utils/pagination'

/** Each option is one `sortBy`/`order` pair the gateway ranks the whole index by. */
const SORTS = {
  'elections-desc': { label: 'Most elections', sort: { by: 'electionCount', order: 'desc' } },
  'elections-asc': { label: 'Fewest elections', sort: { by: 'electionCount', order: 'asc' } },
  'created-desc': { label: 'Newest first', sort: { by: 'createdAt', order: 'desc' } },
  'created-asc': { label: 'Oldest first', sort: { by: 'createdAt', order: 'asc' } },
  'name-asc': { label: 'Name, A to Z', sort: { by: 'name', order: 'asc' } },
  'name-desc': { label: 'Name, Z to A', sort: { by: 'name', order: 'desc' } },
} satisfies Record<string, { label: string; sort: OrgSort }>

type SortKey = keyof typeof SORTS
const isSortKey = (value: string): value is SortKey => value in SORTS

const DEFAULTS = { page: '0', q: '', sort: 'elections-desc' }

const PAGE_SIZE = 24

/** Right-aligned numeric cell: a skeleton while its row's stats are still
 * loading, '—' with a tooltip when the id fell outside the enrichment cap. */
const StatCell = ({ value, loaded }: { value?: string; loaded: boolean }) => {
  if (!loaded) return <Table.Cell textAlign='end'><Skeleton height='14px' width='40%' display='inline-block' /></Table.Cell>
  if (value === undefined) return (
    <Table.Cell textAlign='end' title='not loaded'>
      —
    </Table.Cell>
  )
  return <Table.Cell textAlign='end'>{value}</Table.Cell>
}

const OrgListRow = ({ org, stats, statsLoading, enriched }: {
  org: OrganizationSummary
  stats?: OrgStats
  statsLoading: boolean
  enriched: boolean
}) => {
  const loaded = enriched && !statsLoading
  return (
    <Table.Row>
      <Table.Cell minW='0'>
        <Link asChild variant='unstyled'>
          <RouterLink to={`/account/${org.organizationID}`}>
            <HStack gap={3}>
              <AddressAvatar address={org.organizationID} avatarUrl={stats?.avatar} size='32px' />
              {stats?.name ? (
                <Grid gap={0}>
                  <Text fontWeight='semibold'>{stats.name}</Text>
                  <HashDisplay value={org.organizationID} copyLabel='Organization ID' withCopy={false} />
                </Grid>
              ) : (
                <HashDisplay value={org.organizationID} copyLabel='Organization ID' withCopy={false} />
              )}
            </HStack>
          </RouterLink>
        </Link>
      </Table.Cell>
      <Table.Cell textAlign='end'>
        {org.electionCount.toLocaleString()} {org.electionCount === 1 ? 'election' : 'elections'}
      </Table.Cell>
      <StatCell value={stats?.balance !== undefined ? stats.balance.toLocaleString() : undefined} loaded={loaded} />
      <StatCell value={stats?.feesCount !== undefined ? stats.feesCount.toLocaleString() : undefined} loaded={loaded} />
      <Table.Cell>
        <Button asChild variant='link' size='sm'>
          <RouterLink to={`/processes?organizationId=${org.organizationID}`}>See elections</RouterLink>
        </Button>
      </Table.Cell>
    </Table.Row>
  )
}

/** An organization ID fragment, as opposed to words: only hex, long enough that
 *  a real word ("beadface" aside) is unlikely to be mistaken for one. */
const looksLikeId = (value: string) => /^(0x)?[0-9a-f]{4,}$/i.test(value.trim())

const OrganizationsPage = () => {
  const { state, setState, num } = useUrlListState(DEFAULTS)
  const page = num('page')
  const query = state.q
  const sort: SortKey = isSortKey(state.sort) ? state.sort : 'elections-desc'
  const [queryInput, setQueryInput] = useState(query)

  // Re-seed the input when the URL moves under us (Back/Forward, Reset).
  useEffect(() => {
    setQueryInput(query)
  }, [query])

  // Each settled query is a request, so wait for the typist to pause before it
  // reaches the URL — and reset the page in the same write.
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = queryInput.trim()
      if (trimmed === query) return
      setState({ q: trimmed, page: DEFAULTS.page })
    }, 400)
    return () => clearTimeout(timer)
  }, [queryInput, query, setState])

  const idFilter = looksLikeId(query) ? query.replace(/^0x/i, '').toLowerCase() : ''
  const nameQuery = query && !idFilter ? query : ''

  // `?sortBy=` shipped in a later release than `?name=` (vocdoni-node #1451)
  // and is *silently ignored* where absent, so it is not sent until its probe
  // has answered. The name filter is relied on unconditionally.
  const orgSort = useOrgSortSupport()

  // One paged, ordered request: the API filters and ranks the whole index, so
  // no page of it is ever sorted or sliced here.
  const list = useOrganizations(
    page,
    PAGE_SIZE,
    idFilter || undefined,
    nameQuery || undefined,
    undefined,
    !orgSort.isLoading,
    orgSort.supported ? SORTS[sort].sort : undefined
  )

  const rows = useMemo(() => list.data?.organizations ?? [], [list.data?.organizations])
  const totalPages = totalPagesOf(list.data?.pagination)
  const totalItems = list.data?.pagination?.totalItems

  // Balance/fees have no list-row equivalent, so they still need one
  // `/accounts/{id}` request per row.
  const pageStats = useOrgStats(rows.map((o) => o.organizationID))

  // Rows that already carry `name`/`avatar` from the list response render
  // immediately without waiting on `pageStats`; rows without them fall back to
  // the account metadata.
  const stats = useMemo(() => {
    const merged: Record<string, OrgStats | undefined> = {}
    rows.forEach((o) => {
      const base = pageStats.stats[o.organizationID]
      if (o.name !== undefined || o.avatar !== undefined || base) {
        merged[o.organizationID] = { ...base, name: o.name ?? base?.name, avatar: o.avatar ?? base?.avatar }
      }
    })
    return merged
  }, [rows, pageStats.stats])

  // A row with a server-provided name is treated as enriched right away —
  // balance/fees may still show "—" rather than block on the full fan-out.
  const enrichedIds = rows.filter((o) => o.name !== undefined).map((o) => o.organizationID)
  const enrichedSet = new Set([...enrichedIds, ...pageStats.capped])
  const listLoading = orgSort.isLoading || list.isLoading

  return (
    <Grid gap={6}>
      <PageHeader title='Organizations' subtitle='The accounts that create and run elections on this chain.' />

      <Grid templateColumns={{ base: '1fr', md: orgSort.supported ? '2fr 1fr auto' : '3fr auto' }} gap={2}>
        <Input
          placeholder='Search by name or organization ID'
          aria-label='Search organizations by name or ID'
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
        />
        {/* Only offered once the gateway has proven it can order the index.
            Without that, the control would relabel index order as a ranking. */}
        {orgSort.supported && (
          <NativeSelect.Root>
            <NativeSelect.Field value={sort} onChange={(e) => setState({ sort: e.target.value, page: DEFAULTS.page })}>
              {Object.entries(SORTS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        )}
        <Button
          variant='outline'
          onClick={() => {
            setQueryInput('')
            setState({ ...DEFAULTS })
          }}
        >
          Reset
        </Button>
      </Grid>

      {!orgSort.supported && !orgSort.isLoading && (
        <HStack gap={2} fontSize='sm' color='texts.subtle'>
          <Text>
            This gateway cannot order organizations server-side, so they are listed in the index's own order rather
            than ranked by election count.
          </Text>
        </HStack>
      )}

      {nameQuery && (
        <HStack gap={2} fontSize='sm' color='texts.subtle'>
          {listLoading && <Spinner size='xs' />}
          <Text>
            {listLoading
              ? 'Searching organization names…'
              : `${(totalItems ?? rows.length).toLocaleString()} ${
                  (totalItems ?? rows.length) === 1 ? 'match' : 'matches'
                } for "${nameQuery}".`}
          </Text>
        </HStack>
      )}

      <PageSection title='Organization list'>
        <Table.ScrollArea>
          <Table.Root size='md' variant='outline'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Organization</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Elections</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Balance (tokens)</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Fees paid (count)</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {listLoading && <TableRowsSkeleton columns={5} />}
              {rows.map((o) => (
                <OrgListRow
                  key={o.organizationID}
                  org={o}
                  stats={stats[o.organizationID]}
                  statsLoading={pageStats.isLoading}
                  enriched={enrichedSet.has(o.organizationID)}
                />
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
        {!listLoading && rows.length === 0 && (
          <EmptyState
            title='No organizations found'
            hint={
              nameQuery
                ? 'No organization name contains this text. Accents must match, so try the exact spelling or fewer words, or paste the organization ID.'
                : 'Nothing matches this filter.'
            }
          />
        )}
      </PageSection>

      <PaginationControls page={page} totalPages={totalPages} onChange={(next) => setState({ page: String(next) })} />
    </Grid>
  )
}

export default OrganizationsPage
