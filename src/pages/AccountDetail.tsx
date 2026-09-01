import { Button, Flex, Grid, Link, SimpleGrid, Table, Tabs, Text } from '@chakra-ui/react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { AddressAvatar } from '~components/account/AddressAvatar'
import { FeesTable } from '~components/account/FeesTable'
import { TransfersTable } from '~components/account/TransfersTable'
import { ElectionListRow } from '~components/election-list/ElectionListRow'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { StatTile } from '~components/shared/StatTile'
import { TechnicalDetails, TechnicalField } from '~components/shared/TechnicalDetails'
import { useUrlListState } from '~hooks/useUrlListState'
import { useElectionTitles, useElections, useOrganizationMeta } from '~hooks/useVoconeApi'
import { shortHex } from '~utils/format'

const DEFAULTS = { tab: '' }

/**
 * One address, one page — `/account/{address}`, as the old explorer had it.
 *
 * "Organization" and "account" are not two resources: both are
 * `GET /accounts/{address}`, and an account becomes an organization the moment
 * it creates its first election. Splitting them across two URLs only ever asked
 * the visitor to know which of the two an address was before they could look it
 * up. So the Elections tab appears when there is something to put in it, and the
 * default tab follows suit: an organization opens on its elections, a plain
 * account on its transfers.
 */
const AccountDetailPage = () => {
  const { address = '' } = useParams()
  const { state, setState } = useUrlListState(DEFAULTS)
  const org = useOrganizationMeta(address)
  const elections = useElections(0, 12, undefined, address)
  const rows = elections.data?.elections ?? []
  const { titles } = useElectionTitles(rows.map((e) => e.electionId))

  const isOrganization = (org.data?.electionIndex ?? 0) > 0 || rows.length > 0
  // Which tab an address opens on is a fact about the address, so it cannot be
  // decided before the account loads. Selecting nothing in the meantime beats
  // guessing: `lazyMount` means an unselected tab fetches nothing, so a wrong
  // guess would cost both a wasted request and a visible jump.
  // A `?tab=elections` link carried to an address that has none would name a
  // tab that is not rendered, selecting nothing — fall through to the default.
  const requested = state.tab === 'elections' && !org.isLoading && !isOrganization ? '' : state.tab
  const tab = requested || (org.isLoading ? '' : isOrganization ? 'elections' : 'transfers')

  const subtitle =
    org.meta.description ||
    (isOrganization
      ? 'Elections, token balance, transfers and fees for this Vocdoni organization.'
      : 'Token balance, transfers and fees for a single Vocdoni blockchain account.')

  return (
    <Grid gap={6}>
      <PageHeader
        title={org.meta.name || shortHex(address, 12, 8)}
        subtitle={subtitle}
        breadcrumb={
          <Flex align='center' gap={4}>
            <AddressAvatar address={address} avatarUrl={org.meta.avatar} />
          </Flex>
        }
        actions={
          isOrganization ? (
            <Button asChild size='sm'>
              <RouterLink to={`/processes?organizationId=${address}`}>All elections</RouterLink>
            </Button>
          ) : undefined
        }
      />

      <Flex align='center' gap={2} fontSize='sm' color='texts.subtle'>
        <Text>{isOrganization ? 'Organization address' : 'Account address'}</Text>
        <HashDisplay value={org.data?.address ?? address} copyLabel='Address' />
      </Flex>

      {/* The union of what the two former pages showed: an organization is an
          account, so it gets the account's counters as well as its own. */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: isOrganization ? 5 : 4 }} gap={4}>
        {isOrganization && (
          <StatTile
            label='Elections created'
            value={org.data?.electionIndex ?? rows.length}
            help='Elections this organization has created on the chain.'
          />
        )}
        <StatTile
          label='Token balance'
          value={(org.data?.balance ?? 0).toLocaleString()}
          help='VOC tokens held by this account.'
        />
        <StatTile label='Nonce' value={org.data?.nonce ?? 0} help='Number of transactions sent so far.' />
        <StatTile label='Token transfers' value={org.data?.transfersCount ?? 0} help='Transfers sent and received.' />
        <StatTile
          label='Fees paid'
          value={org.data?.feesCount ?? 0}
          help='Transactions this account paid a fee for.'
        />
      </SimpleGrid>

      <Tabs.Root value={tab} onValueChange={(e) => setState({ tab: e.value })} lazyMount>
        <Tabs.List mb={6}>
          {isOrganization && <Tabs.Trigger value='elections'>Elections</Tabs.Trigger>}
          <Tabs.Trigger value='transfers'>Token transfers</Tabs.Trigger>
          <Tabs.Trigger value='fees'>Fees paid</Tabs.Trigger>
          <Tabs.Trigger value='technical'>Technical details</Tabs.Trigger>
        </Tabs.List>

        {isOrganization && (
          <Tabs.Content value='elections' p={0}>
            <PageSection title='Elections' subtitle='Elections run by this organization'>
              {!elections.isLoading && rows.length === 0 && (
                <EmptyState title='No elections yet' hint='This organization has not created any elections.' />
              )}
              {(elections.isLoading || rows.length > 0) && (
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
                      {elections.isLoading && <TableRowsSkeleton columns={6} />}
                      {rows.map((e) => (
                        <ElectionListRow key={e.electionId} election={e} title={titles[e.electionId]} />
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Table.ScrollArea>
              )}
            </PageSection>
          </Tabs.Content>
        )}

        <Tabs.Content value='transfers' p={0}>
          <PageSection title='Token transfers' subtitle='Every VOC transfer this account has sent or received.'>
            <TransfersTable address={address} />
          </PageSection>
        </Tabs.Content>

        <Tabs.Content value='fees' p={0}>
          <PageSection title='Fees paid' subtitle='Tokens burnt by this account to execute transactions.'>
            <FeesTable address={address} />
          </PageSection>
        </Tabs.Content>

        <Tabs.Content value='technical' p={0}>
          <TechnicalDetails json={org.data ?? {}}>
            <TechnicalField label='Address'>
              <HashDisplay value={org.data?.address ?? address} copyLabel='Address' full />
            </TechnicalField>
            <TechnicalField label='Balance'>{org.data?.balance ?? 0}</TechnicalField>
            <TechnicalField label='Nonce'>{org.data?.nonce ?? 0}</TechnicalField>
            <TechnicalField label='Election index'>{org.data?.electionIndex ?? 0}</TechnicalField>
            <TechnicalField label='Transfers'>{org.data?.transfersCount ?? 0}</TechnicalField>
            <TechnicalField label='Fees'>{org.data?.feesCount ?? 0}</TechnicalField>
            <TechnicalField label='SIK'>{org.data?.sik || '—'}</TechnicalField>
            {org.data?.infoURL && (
              <TechnicalField label='Metadata source'>
                <Link href={org.data.infoURL} target='_blank' rel='noreferrer'>
                  {org.data.infoURL}
                </Link>
              </TechnicalField>
            )}
          </TechnicalDetails>
        </Tabs.Content>
      </Tabs.Root>
    </Grid>
  )
}

export default AccountDetailPage
