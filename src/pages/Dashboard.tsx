import { Alert, Flex, Grid, GridItem, Link, SimpleGrid, Table, Text } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import {
  LuArrowLeftRight,
  LuBlocks,
  LuBox,
  LuFileText,
  LuGauge,
  LuShieldCheck,
  LuUsers,
  LuVote,
} from 'react-icons/lu'
import { Link as RouterLink } from 'react-router'
import { BlockTimeChart } from '~components/dashboard/BlockTimeChart'
import { BreakdownDonut } from '~components/dashboard/BreakdownDonut'
import { LatestBlocksFeed } from '~components/dashboard/LatestBlocksFeed'
import { LatestTransfersList } from '~components/dashboard/LatestTransfersList'
import { RecentElectionsList } from '~components/dashboard/RecentElectionsList'
import { ValidatorNetworkPanel } from '~components/dashboard/ValidatorNetworkPanel'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { RelativeTime } from '~components/shared/RelativeTime'
import { StatTile } from '~components/shared/StatTile'
import { StatusTag } from '~components/shared/StatusTag'
import { VerifyHero } from '~components/verify/VerifyHero'
import {
  useAccountCount,
  useBlockActivity,
  useElectionStatusBreakdown,
  useLatestTransfers,
  useTxTypeBreakdown,
} from '~hooks/useChainStats'
import {
  useChainInfo,
  useElections,
  useOrganizations,
  useResolvedElectionTitles,
  useTransactions,
  useValidators,
  useVotes,
} from '~hooks/useVoconeApi'
import { parseApiDate } from '~utils/format'
import { transactionTypeLabel } from '~utils/txLabels'

/** Rendered as a plain link in a panel header, matching the "see all" affordance
 *  used across the list pages. */
const SeeAll = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link asChild variant='plain' fontSize='sm'>
    <RouterLink to={to}>{children}</RouterLink>
  </Link>
)

/** Every list panel on the dashboard shows the same number of rows and shares
 *  this height, so a 3-column grid of mixed-content panels still lines up. */
const ROWS = 5
const PANEL_MIN_H = '360px'
// Panels that are not the "is the chain alive" pulse (donuts feed off
// /chain/stats or a 5-minute-cached breakdown already; recent elections,
// transactions, validators and transfers change slowly enough that a minute
// of staleness is invisible) relax to this instead of the shared 15s floor.
const IDLE_POLL_MS = 60000

const DashboardPage = () => {
  const chain = useChainInfo()
  const elections = useElections(0, ROWS, undefined, undefined, undefined, IDLE_POLL_MS)
  const votes = useVotes(0, ROWS)
  const txs = useTransactions(0, ROWS, undefined, undefined, undefined, IDLE_POLL_MS)
  const validators = useValidators(IDLE_POLL_MS)
  const organizations = useOrganizations(0, 8, undefined, undefined, IDLE_POLL_MS)
  const accountCount = useAccountCount()

  // One 40-block request feeds the block-time chart and the blocks feed.
  const activity = useBlockActivity(40)
  const txTypes = useTxTypeBreakdown()
  const electionStatus = useElectionStatusBreakdown()
  const transfers = useLatestTransfers(ROWS, IDLE_POLL_MS)

  const topOrganizations = [...(organizations.data?.organizations ?? [])]
    .sort((a, b) => b.electionCount - a.electionCount)
    .slice(0, ROWS)

  const electionRows = elections.data?.elections ?? []
  const { titles } = useResolvedElectionTitles(electionRows)

  const syncing = chain.data?.syncing ?? false
  // chain/info returns rolling block-time averages in ms (1m, 10m, 1h, 6h, 24h);
  // the first non-zero entry is the most recent meaningful sample.
  const avgBlockMs = (chain.data?.blockTime ?? []).find((ms) => ms > 0) ?? 0
  const avgBlockSecs = avgBlockMs / 1000

  const lastBlockDate = parseApiDate(chain.data?.blockTimestamp)
  const lastBlockAgo = lastBlockDate ? formatDistanceToNow(lastBlockDate, { addSuffix: true }) : undefined

  const validatorRows = validators.data?.validators ?? []
  const validatorCount = chain.data?.validatorCount ?? validatorRows.length

  const voteRows = (votes.data?.votes ?? []).slice(0, ROWS)
  const txRows = (txs.data?.transactions ?? []).slice(0, ROWS)
  const blockRows = activity.blocks.slice(0, ROWS)
  const transferRows = (transfers.data?.transfers ?? []).slice(0, ROWS)

  return (
    <Grid gap={6}>
      <PageHeader
        title='Vocdoni chain'
        subtitle={
          syncing ? 'This node is still catching up with the chain.' : 'The network is healthy and fully synced.'
        }
      />

      <Flex align='center' gap={3} wrap='wrap'>
        <Text fontSize='sm' fontWeight='bold' fontFamily='mono'>
          {chain.data?.chainId ?? '—'}
        </Text>
        <StatusTag status={syncing ? 'syncing' : 'success'} label={syncing ? 'Syncing' : 'Fully synced'} size='sm' />
        <Text fontSize='sm' color='texts.subtle'>
          Genesis <RelativeTime value={chain.data?.genesisTime} mode='absolute' fontSize='sm' />
        </Text>
      </Flex>

      <VerifyHero />

      {chain.error && (
        <Alert.Root status='error'>
          <Alert.Indicator />
          <Alert.Title>Failed to fetch chain info</Alert.Title>
        </Alert.Root>
      )}

      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        <StatTile
          label='Average block time'
          value={avgBlockSecs > 0 ? `${avgBlockSecs.toFixed(1)}s` : '—'}
          help='Over the last minute'
          icon={<LuGauge />}
        />
        <StatTile
          label='Block height'
          value={(chain.data?.height ?? 0).toLocaleString()}
          help={lastBlockAgo ? `Last block ${lastBlockAgo}` : 'Blocks sealed since genesis'}
          icon={<LuBox />}
        />
        <StatTile
          label='Transactions'
          value={(chain.data?.transactionCount ?? 0).toLocaleString()}
          help='Every action ever recorded'
          icon={<LuArrowLeftRight />}
        />
        <StatTile
          label='Validators'
          value={validatorCount.toLocaleString()}
          help='Nodes confirming every block'
          icon={<LuShieldCheck />}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        <StatTile
          label='Accounts'
          value={(accountCount.data ?? 0).toLocaleString()}
          help='Addresses that exist on chain'
          icon={<LuUsers />}
        />
        <StatTile
          label='Organizations'
          value={(chain.data?.organizationCount ?? 0).toLocaleString()}
          help='Accounts that have run an election'
          icon={<LuBlocks />}
        />
        <StatTile
          label='Elections'
          value={(chain.data?.electionCount ?? 0).toLocaleString()}
          help='Created since genesis'
          icon={<LuFileText />}
        />
        <StatTile
          label='Votes'
          value={(chain.data?.voteCount ?? 0).toLocaleString()}
          help='Ballots counted by the chain'
          icon={<LuVote />}
        />
      </SimpleGrid>

      <BlockTimeChart activity={activity} right={<SeeAll to='/blocks'>Browse blocks</SeeAll>} />

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
        <GridItem minW={0}>
          <BreakdownDonut
            title='What the chain is used for'
            subtitle='Every transaction ever recorded, by what it did.'
            breakdown={txTypes}
            unit='transactions'
            right={<SeeAll to='/transactions'>See all</SeeAll>}
          />
        </GridItem>
        <GridItem minW={0}>
          <BreakdownDonut
            title='Elections by status'
            subtitle='Where every election sits in its lifecycle.'
            breakdown={electionStatus}
            unit='elections'
            right={<SeeAll to='/processes'>See all</SeeAll>}
          />
        </GridItem>
      </SimpleGrid>

      <ValidatorNetworkPanel
        validators={validatorRows}
        isLoading={validators.isLoading}
        avgBlockSecs={avgBlockSecs}
        syncing={syncing}
        right={<SeeAll to='/validators'>See all</SeeAll>}
      />

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
        <GridItem minW={0}>
          <PageSection
            title='Recent elections'
            subtitle='The latest elections created on the chain.'
            right={<SeeAll to='/processes'>See all</SeeAll>}
            minH={PANEL_MIN_H}
          >
            <RecentElectionsList elections={electionRows} titles={titles} isLoading={elections.isLoading} />
          </PageSection>
        </GridItem>

        <GridItem minW={0}>
          <PageSection
            title='Recent votes'
            subtitle='Latest votes cast, across every election.'
            right={<SeeAll to='/envelopes'>See all</SeeAll>}
            minH={PANEL_MIN_H}
          >
            <Table.ScrollArea>
              <Table.Root size='sm' variant='outline'>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Vote</Table.ColumnHeader>
                    <Table.ColumnHeader>Election</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign='end'>Height</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign='end'>When</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {voteRows.map((v) => (
                    <Table.Row key={v.voteID}>
                      <Table.Cell>
                        <HashDisplay value={v.voteID} copyLabel='Vote ID' to={`/envelope#${v.voteID}`} left={6} right={4} />
                      </Table.Cell>
                      <Table.Cell>
                        <HashDisplay
                          value={v.electionID}
                          copyLabel='Election ID'
                          to={`/process/${v.electionID}`}
                          left={6}
                          right={4}
                        />
                      </Table.Cell>
                      <Table.Cell textAlign='end'>{(v.blockHeight ?? 0).toLocaleString()}</Table.Cell>
                      <Table.Cell textAlign='end'>
                        <RelativeTime value={v.blockTime ?? v.date} mode='relative' fontSize='sm' />
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
            {!votes.isLoading && voteRows.length === 0 && <EmptyState title='No votes yet' py={6} />}
          </PageSection>
        </GridItem>

        <GridItem minW={0}>
          <PageSection
            title='Latest blocks'
            subtitle='The most recently sealed blocks and who proposed them.'
            right={<SeeAll to='/blocks'>See all</SeeAll>}
            minH={PANEL_MIN_H}
          >
            <LatestBlocksFeed blocks={blockRows} validators={validatorRows} isLoading={activity.isLoading} />
          </PageSection>
        </GridItem>

        <GridItem minW={0}>
          <PageSection
            title='Recent transactions'
            subtitle='Plain-English action, not just a hash.'
            right={<SeeAll to='/transactions'>See all</SeeAll>}
            minH={PANEL_MIN_H}
          >
            <Table.ScrollArea>
              <Table.Root size='sm' variant='outline'>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Hash</Table.ColumnHeader>
                    <Table.ColumnHeader>Action</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign='end'>Height</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {txRows.map((t) => (
                    <Table.Row key={t.hash}>
                      <Table.Cell>
                        <HashDisplay
                          value={t.hash}
                          copyLabel='Transaction hash'
                          to={`/transactions/${t.hash}`}
                          left={6}
                          right={4}
                        />
                      </Table.Cell>
                      <Table.Cell>{transactionTypeLabel(t.type)}</Table.Cell>
                      <Table.Cell textAlign='end'>{t.height.toLocaleString()}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
            {!txs.isLoading && txRows.length === 0 && <EmptyState title='No transactions yet' py={6} />}
          </PageSection>
        </GridItem>

        <GridItem minW={0}>
          <PageSection
            title='Latest token transfers'
            subtitle='The most recent tokens moved between accounts, chain-wide.'
            right={<SeeAll to='/tokens'>See all</SeeAll>}
            minH={PANEL_MIN_H}
          >
            <LatestTransfersList transfers={transferRows} isLoading={transfers.isLoading} />
          </PageSection>
        </GridItem>

        <GridItem minW={0}>
          <PageSection
            title='Top organizations'
            subtitle='Ranked by number of elections created.'
            right={<SeeAll to='/accounts'>See all</SeeAll>}
            minH={PANEL_MIN_H}
          >
            <Table.ScrollArea>
              <Table.Root size='sm' variant='outline'>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Organization</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign='end'>Elections</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {topOrganizations.map((o) => (
                    <Table.Row key={o.organizationID}>
                      <Table.Cell>
                        <HashDisplay
                          value={o.organizationID}
                          copyLabel='Organization ID'
                          to={`/account/${o.organizationID}`}
                          left={6}
                          right={4}
                        />
                      </Table.Cell>
                      <Table.Cell textAlign='end'>{o.electionCount.toLocaleString()}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
            {topOrganizations.length === 0 && !organizations.isLoading && (
              <EmptyState title='No organizations yet' py={6} />
            )}
          </PageSection>
        </GridItem>
      </SimpleGrid>
    </Grid>
  )
}

export default DashboardPage
