import { Button, Grid, HStack, Input, Link, NativeSelect, Skeleton, Spinner, Table, Text } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { AddressAvatar } from '~components/account/AddressAvatar'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { PaginationControls } from '~components/shared/PaginationControls'
import type { OrgStats } from '~hooks/useOrgStats'
import { ORG_SEARCH_DEPTH, useOrgNameSearch, useOrgStats } from '~hooks/useOrgStats'
import { useOrganizations } from '~hooks/useVoconeApi'
import type { OrganizationSummary } from '~types/api'

type SortKey = 'elections-desc' | 'elections-asc'

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
          <RouterLink to={`/organizations/${org.organizationID}`}>
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
          <RouterLink to={`/elections?organizationId=${org.organizationID}`}>See elections</RouterLink>
        </Button>
      </Table.Cell>
    </Table.Row>
  )
}

/** An organization ID fragment, as opposed to words: only hex, long enough that
 *  a real word ("beadface" aside) is unlikely to be mistaken for one. */
const looksLikeId = (value: string) => /^(0x)?[0-9a-f]{4,}$/i.test(value.trim())

const OrganizationsPage = () => {
  const [page, setPage] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('elections-desc')

  // Typing a name fans out account lookups, so wait for the typist to pause.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(queryInput.trim()), 400)
    return () => clearTimeout(timer)
  }, [queryInput])

  const idFilter = looksLikeId(query) ? query.replace(/^0x/i, '').toLowerCase() : ''
  const nameQuery = query && !idFilter ? query : ''

  const organizations = useOrganizations(page, 24, idFilter || undefined)
  const search = useOrgNameSearch(nameQuery)

  const sorted = useMemo(() => {
    const items = search.active
      ? search.matches.map((m) => m.org)
      : [...(organizations.data?.organizations ?? [])]
    items.sort((a, b) =>
      sort === 'elections-desc' ? b.electionCount - a.electionCount : a.electionCount - b.electionCount
    )
    return items
  }, [organizations.data?.organizations, search.active, search.matches, sort])

  const pageStats = useOrgStats(search.active ? [] : sorted.map((o) => o.organizationID))
  const searchStats = useMemo(() => {
    const byId: Record<string, OrgStats | undefined> = {}
    search.matches.forEach((m) => (byId[m.org.organizationID] = m.stats))
    return byId
  }, [search.matches])

  const stats = search.active ? searchStats : pageStats.stats
  const statsLoading = search.active ? search.isLoading : pageStats.isLoading
  const enrichedIds = search.active ? sorted.map((o) => o.organizationID) : pageStats.capped
  const listLoading = search.active ? search.isLoading : organizations.isLoading

  return (
    <Grid gap={6}>
      <PageHeader title='Organizations' subtitle='The accounts that create and run elections on this chain.' />

      <Grid templateColumns={{ base: '1fr', md: '2fr 1fr auto' }} gap={2}>
        <Input
          placeholder='Search by name or organization ID'
          aria-label='Search organizations by name or ID'
          value={queryInput}
          onChange={(e) => {
            setQueryInput(e.target.value)
            setPage(0)
          }}
        />
        <NativeSelect.Root>
          <NativeSelect.Field value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value='elections-desc'>Most elections</option>
            <option value='elections-asc'>Fewest elections</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Button
          variant='outline'
          onClick={() => {
            setQueryInput('')
            setQuery('')
            setSort('elections-desc')
            setPage(0)
          }}
        >
          Reset
        </Button>
      </Grid>

      {search.active && (
        <HStack gap={2} fontSize='sm' color='texts.subtle'>
          {search.isLoading && <Spinner size='xs' />}
          <Text>
            {search.isLoading
              ? `Reading names for the first ${ORG_SEARCH_DEPTH.toLocaleString()} organizations in the index…`
              : `Searched the names of the first ${search.scanned.toLocaleString()} organizations in the index — ` +
                `${sorted.length.toLocaleString()} ${sorted.length === 1 ? 'match' : 'matches'}. ` +
                'Names are stored off-chain, so this search cannot reach deeper; paste an organization ID to look one up directly.'}
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
              {sorted.map((o) => (
                <OrgListRow
                  key={o.organizationID}
                  org={o}
                  stats={stats[o.organizationID]}
                  statsLoading={statsLoading}
                  enriched={enrichedIds.includes(o.organizationID)}
                />
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
        {!listLoading && sorted.length === 0 && (
          <EmptyState
            title='No organizations found'
            hint={
              search.active
                ? 'No name in the searched range matches. Try fewer words, or paste the organization ID.'
                : 'Nothing matches this filter.'
            }
          />
        )}
      </PageSection>

      {!search.active && (
        <PaginationControls page={page} totalPages={organizations.data?.pagination?.totalPages} onChange={setPage} />
      )}
    </Grid>
  )
}

export default OrganizationsPage
