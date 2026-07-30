import { Button, Flex, Grid, Link, SimpleGrid, Tabs, Text } from '@chakra-ui/react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { AddressAvatar } from '~components/account/AddressAvatar'
import { FeesTable } from '~components/account/FeesTable'
import { TransfersTable } from '~components/account/TransfersTable'
import { HashDisplay } from '~components/shared/HashDisplay'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { StatTile } from '~components/shared/StatTile'
import { TechnicalDetails, TechnicalField } from '~components/shared/TechnicalDetails'
import { organizationMetaFrom } from '~hooks/useVoconeApi'
import { useAccount } from '~hooks/useAccounts'
import { useUrlListState } from '~hooks/useUrlListState'
import { shortHex } from '~utils/format'

const DEFAULTS = { tab: 'transfers' }

const AccountDetailPage = () => {
  const { address = '' } = useParams()
  const { state, setState } = useUrlListState(DEFAULTS)
  const account = useAccount(address)
  const meta = organizationMetaFrom(account.data?.metadata)
  const isOrganization = (account.data?.electionIndex ?? 0) > 0

  return (
    <Grid gap={6}>
      <PageHeader
        title={meta.name || shortHex(address, 12, 8)}
        subtitle='Token balance, transfers and fees for a single Vocdoni blockchain account.'
        breadcrumb={<AddressAvatar address={address} avatarUrl={meta.avatar} />}
        actions={
          isOrganization ? (
            <Button asChild size='sm' variant='outline'>
              <RouterLink to={`/organizations/${address}`}>View as organization →</RouterLink>
            </Button>
          ) : undefined
        }
      />

      <Flex align='center' gap={2} fontSize='sm' color='texts.subtle'>
        <Text>Account address</Text>
        <HashDisplay value={account.data?.address ?? address} copyLabel='Address' />
      </Flex>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
        <StatTile label='Token balance' value={(account.data?.balance ?? 0).toLocaleString()} help='VOC tokens held by this account.' />
        <StatTile label='Nonce' value={account.data?.nonce ?? 0} help='Number of transactions sent so far.' />
        <StatTile label='Token transfers' value={account.data?.transfersCount ?? 0} help='Transfers sent and received.' />
        <StatTile label='Fees paid' value={account.data?.feesCount ?? 0} help='Transactions this account paid a fee for.' />
      </SimpleGrid>

      <Tabs.Root value={state.tab} onValueChange={(e) => setState({ tab: e.value })} lazyMount>
        <Tabs.List mb={6}>
          <Tabs.Trigger value='transfers'>Token transfers</Tabs.Trigger>
          <Tabs.Trigger value='fees'>Fees paid</Tabs.Trigger>
          <Tabs.Trigger value='technical'>Technical details</Tabs.Trigger>
        </Tabs.List>

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
          <TechnicalDetails json={account.data ?? {}}>
            <TechnicalField label='Address'>
              <HashDisplay value={account.data?.address ?? address} copyLabel='Address' full />
            </TechnicalField>
            <TechnicalField label='Balance'>{account.data?.balance ?? 0}</TechnicalField>
            <TechnicalField label='Nonce'>{account.data?.nonce ?? 0}</TechnicalField>
            <TechnicalField label='Election index'>{account.data?.electionIndex ?? 0}</TechnicalField>
            <TechnicalField label='Transfers'>{account.data?.transfersCount ?? 0}</TechnicalField>
            <TechnicalField label='Fees'>{account.data?.feesCount ?? 0}</TechnicalField>
            <TechnicalField label='SIK'>{account.data?.sik || '—'}</TechnicalField>
            {account.data?.infoURL && (
              <TechnicalField label='Metadata source'>
                <Link href={account.data.infoURL} target='_blank' rel='noreferrer'>
                  {account.data.infoURL}
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
