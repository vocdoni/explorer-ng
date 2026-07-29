import { Button, Flex, Grid, Link, Table, Tabs, Text } from '@chakra-ui/react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { AddressAvatar } from '~components/account/AddressAvatar'
import { FeesTable } from '~components/account/FeesTable'
import { TransfersTable } from '~components/account/TransfersTable'
import { ElectionListRow } from '~components/election-list/ElectionListRow'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { StatTile } from '~components/shared/StatTile'
import { TechnicalDetails, TechnicalField } from '~components/shared/TechnicalDetails'
import { useElectionTitles, useElections, useOrganizationMeta } from '~hooks/useVoconeApi'
import { shortHex } from '~utils/format'

const OrganizationDetailPage = () => {
  const { organizationId = '' } = useParams()
  const org = useOrganizationMeta(organizationId)
  const elections = useElections(0, 12, undefined, organizationId)
  const rows = elections.data?.elections ?? []
  const { titles } = useElectionTitles(rows.map((e) => e.electionId))

  return (
    <Grid gap={6}>
      <PageHeader
        title={org.meta.name || shortHex(organizationId, 12, 8)}
        subtitle={org.meta.description}
        breadcrumb={
          <Flex align='center' gap={4}>
            <AddressAvatar address={organizationId} avatarUrl={org.meta.avatar} />
          </Flex>
        }
        actions={
          <Flex gap={2} wrap='wrap'>
            <Button asChild size='sm' variant='outline'>
              <RouterLink to={`/accounts/${organizationId}`}>View as account →</RouterLink>
            </Button>
            <Button asChild size='sm'>
              <RouterLink to={`/elections?organizationId=${organizationId}`}>All elections</RouterLink>
            </Button>
          </Flex>
        }
      />

      <Flex align='center' gap={2} fontSize='sm' color='texts.subtle'>
        <Text>Organization address</Text>
        <HashDisplay value={org.data?.address ?? organizationId} copyLabel='Address' />
      </Flex>

      <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap={4}>
        <StatTile label='Account balance' value={org.data?.balance ?? 0} />
        <StatTile label='Nonce' value={org.data?.nonce ?? 0} help='Number of account transactions sent so far.' />
        <StatTile label='Elections created' value={org.data?.electionIndex ?? rows.length ?? 0} />
      </Grid>

      <Tabs.Root defaultValue='elections' lazyMount>
        <Tabs.List mb={6}>
          <Tabs.Trigger value='elections'>Elections</Tabs.Trigger>
          <Tabs.Trigger value='transfers'>Token transfers</Tabs.Trigger>
          <Tabs.Trigger value='fees'>Fees paid</Tabs.Trigger>
          <Tabs.Trigger value='technical'>Technical details</Tabs.Trigger>
        </Tabs.List>

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

        <Tabs.Content value='transfers' p={0}>
          <PageSection title='Token transfers' subtitle='Every VOC transfer this organization has sent or received.'>
            <TransfersTable address={organizationId} />
          </PageSection>
        </Tabs.Content>

        <Tabs.Content value='fees' p={0}>
          <PageSection title='Fees paid' subtitle='Tokens burnt by this organization to execute transactions.'>
            <FeesTable address={organizationId} />
          </PageSection>
        </Tabs.Content>

        <Tabs.Content value='technical' p={0}>
          <TechnicalDetails json={org.data ?? {}}>
            <TechnicalField label='Address'>
              <HashDisplay value={org.data?.address ?? organizationId} copyLabel='Address' full />
            </TechnicalField>
            <TechnicalField label='Balance'>{org.data?.balance ?? 0}</TechnicalField>
            <TechnicalField label='Nonce'>{org.data?.nonce ?? 0}</TechnicalField>
            <TechnicalField label='Election index'>{org.data?.electionIndex ?? 0}</TechnicalField>
            <TechnicalField label='Transfers'>{org.data?.transfersCount ?? 0}</TechnicalField>
            <TechnicalField label='Fees'>{org.data?.feesCount ?? 0}</TechnicalField>
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

export default OrganizationDetailPage
