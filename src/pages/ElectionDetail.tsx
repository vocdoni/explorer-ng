import {
  Alert,
  Button,
  Grid,
  HStack,
  Link,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { Link as RouterLink, useParams } from 'react-router'
import { BallotConfigCard } from '~components/election/BallotConfigCard'
import { ElectionCostPanel } from '~components/election/ElectionCostPanel'
import { LifecycleTimeline } from '~components/election/LifecycleTimeline'
import { QuestionResultsCard } from '~components/election/QuestionResults'
import { RawResultsMatrix } from '~components/election/RawResultsMatrix'
import { ResultsSummary } from '~components/election/ResultsSummary'
import { TurnoutGauge } from '~components/election/TurnoutGauge'
import { VoteActivityChart } from '~components/election/VoteActivityChart'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { PageHeader } from '~components/shared/PageHeader'
import { PaginationControls } from '~components/shared/PaginationControls'
import { RelativeTime } from '~components/shared/RelativeTime'
import { StatTile } from '~components/shared/StatTile'
import { TechnicalDetails, TechnicalField } from '~components/shared/TechnicalDetails'
import { useElectionAnalytics } from '~hooks/useElectionAnalytics'
import { useUrlListState } from '~hooks/useUrlListState'
import {
  electionMetaFrom,
  useDateToBlock,
  useElectionWithMetadata,
  useElectionKeys,
  useElectionScrutiny,
  useElectionVotes,
  useOrganizationMeta,
} from '~hooks/useVoconeApi'
import { buildElectionResults } from '~utils/ballotResults'
import { formatDate, shortHex } from '~utils/format'

const DEFAULTS = { tab: 'questions', votesPage: '0', feesPage: '0' }

const ElectionDetailPage = () => {
  const { electionId = '' } = useParams()
  const { state, setState, num } = useUrlListState(DEFAULTS)
  const page = num('votesPage')
  const feesPage = num('feesPage')
  const election = useElectionWithMetadata(electionId)
  // A single 300-row sample backs both the analytics timeline and the votes
  // tab for its first 15 pages (300 / 20) — one request instead of two
  // overlapping ones. Only pages beyond that fall back to a small dedicated
  // fetch, which is the rare case (elections with 300+ votes, viewer paging
  // deep into them).
  const voteAnalytics = useElectionVotes(electionId, 0, 300)
  const needsDeepVotesPage = (page + 1) * 20 > 300
  const deepVotes = useElectionVotes(electionId, page, 20, needsDeepVotesPage)
  const votesRows = needsDeepVotesPage
    ? (deepVotes.data?.votes ?? [])
    : (voteAnalytics.data?.votes ?? []).slice(page * 20, page * 20 + 20)
  const votesLoading = needsDeepVotesPage ? deepVotes.isLoading : voteAnalytics.isLoading
  const votesTotalPages =
    election.data?.voteCount !== undefined ? Math.max(1, Math.ceil(election.data.voteCount / 20)) : undefined
  const keys = useElectionKeys(electionId)
  const scrutiny = useElectionScrutiny(electionId)
  const createdBlock = useDateToBlock(election.data?.creationTime)
  const meta = electionMetaFrom(election.data?.metadata)
  const organization = useOrganizationMeta(election.data?.organizationId ?? '')
  // Memoized: a fresh [] fallback on every render would invalidate the analytics
  // memo, recomputing the whole timeline on unrelated renders.
  const sampleVotes = useMemo(() => voteAnalytics.data?.votes ?? [], [voteAnalytics.data])
  const analytics = useElectionAnalytics(electionId, election.data, sampleVotes)

  // How the raw `result` histogram should be read depends on the ballot type — a row
  // is a ballot field, not a question. See `~utils/ballotResults`.
  const results = useMemo(() => buildElectionResults(election.data), [election.data])

  // `voteMode.encryptedVotes` is authoritative; a published keys document is a
  // useful fallback for elections that predate the flag.
  const encrypted = election.data?.voteMode?.encryptedVotes === true || !!keys.data
  const orgLabel = organization.meta.name || shortHex(election.data?.organizationId, 10, 6)

  return (
    <Grid gap={6}>
      <PageHeader
        title={meta.title || shortHex(electionId, 12, 8)}
        status={election.data?.status}
        subtitle={
          <>
            Voting from <RelativeTime value={election.data?.startDate} mode='relative' /> until{' '}
            <RelativeTime value={election.data?.endDate} mode='relative' />
          </>
        }
        actions={
          <>
            <Button asChild size='sm'>
              <RouterLink to={`/envelopes?electionId=${electionId}`}>All votes</RouterLink>
            </Button>
            <Button asChild size='sm' variant='outline'>
              <RouterLink to='/verify'>Verify vote</RouterLink>
            </Button>
          </>
        }
      />

      {meta.description && (
        <Text color='texts.subtle' maxW='3xl'>
          {meta.description}
        </Text>
      )}

      <HStack gap={4} flexWrap='wrap' fontSize='sm' color='texts.subtle'>
        <Text>
          Organized by{' '}
          <Link asChild variant='plain'>
            <RouterLink to={`/account/${election.data?.organizationId}`}>{orgLabel}</RouterLink>
          </Link>
        </Text>
        <HashDisplay value={electionId} copyLabel='Election ID' />
      </HStack>

      {election.error && (
        <Alert.Root status='error'>
          <Alert.Indicator />
          <Alert.Title>Could not fetch election details</Alert.Title>
        </Alert.Root>
      )}

      <Tabs.Root value={state.tab} onValueChange={(e) => setState({ tab: e.value })} lazyMount>
        <Tabs.List mb={6}>
          <Tabs.Trigger value='questions'>Questions &amp; results</Tabs.Trigger>
          <Tabs.Trigger value='participation'>Participation</Tabs.Trigger>
          <Tabs.Trigger value='votes'>Votes</Tabs.Trigger>
          <Tabs.Trigger value='operations'>Operations</Tabs.Trigger>
          <Tabs.Trigger value='technical'>Technical details</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value='questions' p={0}>
          <Stack gap={6}>
            {results && <ResultsSummary results={results} election={election.data} encrypted={encrypted} />}

            {results && results.matrix.length === 0 ? (
              // Only when the chain published no tally at all. An all-zero matrix is a
              // real result — nobody voted — and saying "no results yet" about a closed
              // election would be false.
              encrypted && election.data?.finalResults !== true ? (
                <EmptyState
                  title='Results are sealed'
                  hint='Ballots are encrypted. The tally becomes available once voting closes and the decryption keys are published.'
                />
              ) : (
                <EmptyState
                  title='No results yet'
                  hint='Results appear once voting closes and the tally is published.'
                />
              )
            ) : results?.raw ? (
              <RawResultsMatrix matrix={results.matrix} />
            ) : (
              results?.questions.map((question, qi) => (
                <QuestionResultsCard
                  key={qi}
                  question={question}
                  index={qi}
                  results={results}
                  total={results.questions.length}
                />
              ))
            )}

            <BallotConfigCard election={election.data} results={results} />
          </Stack>
        </Tabs.Content>

        <Tabs.Content value='participation' p={0}>
          <Stack gap={6}>
            <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4}>
              <StatTile label='Votes cast' value={analytics.totalVotes.toLocaleString()} />
              <StatTile label='Unique voters' value={analytics.uniqueVoters} />
              <StatTile
                label='Votes changed by voters'
                value={analytics.overwrittenVotes}
                help='How many times a voter overwrote an earlier vote.'
              />
            </SimpleGrid>

            <TurnoutGauge
              votes={analytics.totalVotes}
              capacity={analytics.capacity}
              censusOrigin={election.data?.census?.censusOrigin}
            />

            <VoteActivityChart electionId={electionId} chainId={election.data?.chainId} analytics={analytics} />

            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
              <StatTile
                label='Average votes per hour'
                value={analytics.avgVotesPerHour.toFixed(2)}
                help='Votes cast per hour across the full voting window.'
              />
              <StatTile
                label='First vote'
                value={analytics.firstVote ? formatDate(analytics.firstVote.toISOString()) : '—'}
                help='From the loaded votes.'
              />
            </SimpleGrid>
          </Stack>
        </Tabs.Content>

        <Tabs.Content value='votes' p={0}>
          <Table.ScrollArea>
            <Table.Root size='sm' variant='outline'>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Vote ID</Table.ColumnHeader>
                  <Table.ColumnHeader>Voter</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign='end'>Height</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign='end'>Cast</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {votesRows.map((v) => (
                  <Table.Row key={v.voteID}>
                    <Table.Cell>
                      <HashDisplay value={v.voteID} copyLabel='Vote ID' to={`/envelope#${v.voteID}`} />
                    </Table.Cell>
                    <Table.Cell>
                      <HashDisplay value={v.voterID} copyLabel='Voter ID' />
                    </Table.Cell>
                    <Table.Cell textAlign='end'>{v.blockHeight ?? 0}</Table.Cell>
                    <Table.Cell textAlign='end'>
                      <RelativeTime value={v.blockTime ?? v.date} mode='relative' fontSize='sm' />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
          {!votesLoading && votesRows.length === 0 && (
            <EmptyState title='No votes yet' hint='Votes will appear here as they are cast.' />
          )}
          <PaginationControls
            page={page}
            totalPages={votesTotalPages}
            onChange={(next) => setState({ votesPage: String(next) })}
          />
        </Tabs.Content>

        <Tabs.Content value='operations' p={0}>
          <Stack gap={6}>
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
              <StatTile label='Creation block' value={createdBlock.data?.height ? `#${createdBlock.data.height}` : '—'} />
              <StatTile
                label='Ballot privacy'
                value={encrypted ? 'Encrypted' : 'In the clear'}
                help={
                  encrypted
                    ? 'Ballots stayed hidden until the tally.'
                    : 'Individual ballots are readable on chain.'
                }
              />
            </SimpleGrid>

            <ElectionCostPanel
              electionId={electionId}
              page={feesPage}
              onPageChange={(next) => setState({ feesPage: String(next) })}
            />

            <LifecycleTimeline
              electionId={electionId}
              election={election.data}
              encrypted={encrypted}
              creationHeight={createdBlock.data?.height}
            />

          </Stack>
        </Tabs.Content>

        <Tabs.Content value='technical' p={0}>
          <Stack gap={4}>
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
              <TechnicalField label='Election ID'>
                <HashDisplay value={electionId} copyLabel='Election ID' full />
              </TechnicalField>
              <TechnicalField label='Organization'>
                <HashDisplay value={election.data?.organizationId} copyLabel='Organization ID' full />
              </TechnicalField>
              <TechnicalField label='Census root'>
                <HashDisplay value={election.data?.census?.censusRoot} copyLabel='Census root' full />
              </TechnicalField>
              <TechnicalField label='Census URI'>{election.data?.census?.censusURL || '—'}</TechnicalField>
              <TechnicalField label='Created'>{formatDate(election.data?.creationTime)}</TechnicalField>
              <TechnicalField label='Voting opens'>{formatDate(election.data?.startDate)}</TechnicalField>
              <TechnicalField label='Voting closes'>{formatDate(election.data?.endDate)}</TechnicalField>
              <TechnicalField label='Results published'>{String(election.data?.finalResults ?? false)}</TechnicalField>
            </SimpleGrid>

            {scrutiny.data && <TechnicalDetails title='Raw results / tally payload' json={scrutiny.data} />}
            {keys.data && <TechnicalDetails title='Raw encryption keys' json={keys.data} />}
            <TechnicalDetails title='Raw election data' json={election.data ?? {}} />
          </Stack>
        </Tabs.Content>
      </Tabs.Root>
    </Grid>
  )
}

export default ElectionDetailPage
