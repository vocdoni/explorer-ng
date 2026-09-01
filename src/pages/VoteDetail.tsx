import { Box, Button, Flex, Grid, Icon, Link, SimpleGrid, Spinner, Text } from '@chakra-ui/react'
import { LuBoxes, LuCalendarClock, LuReceipt, LuScale, LuShieldCheck } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { JsonViewer } from '~components/shared/JsonViewer'
import { PageSection } from '~components/shared/PageSection'
import { RelativeTime } from '~components/shared/RelativeTime'
import { StatTile } from '~components/shared/StatTile'
import { TechnicalDetails, TechnicalField } from '~components/shared/TechnicalDetails'
import { OverwriteNotice } from '~components/verify/OverwriteNotice'
import { BallotContents } from '~components/vote/BallotContents'
import { VoteJourney } from '~components/vote/VoteJourney'
import { VoteReceiptHero } from '~components/vote/VoteReceiptHero'
import { useHashIds } from '~hooks/useHashIds'
import { electionMetaFrom, useElectionWithMetadata, useVote } from '~hooks/useVoconeApi'
import { useVoteContent } from '~hooks/useVoteContent'

const ENDED_STATUSES = ['ENDED', 'RESULTS', 'CANCELED']

/**
 * A vote page has two very different readers: an explorer user auditing the
 * chain, and a voter checking that their own ballot arrived and says what they
 * meant it to say. The page is laid out for the second one — receipt first,
 * ballot contents next, protocol data folded away at the bottom — because the
 * first reader can always open the technical section, while the voter cannot
 * decode a vote package on their own.
 */
const VoteDetailPage = () => {
  // `/envelope#{voteId}`. The vote ID is a nullifier, so it rides in the
  // fragment rather than the path — see `~hooks/useHashIds`.
  const [voteId = ''] = useHashIds()
  const vote = useVote(voteId)
  const electionId = vote.data?.electionID
  const election = useElectionWithMetadata(electionId ?? '')
  // Read off the record this page already holds, rather than resolving the same
  // document through a second `/elections/{id}` fetch.
  const electionMeta = electionMetaFrom(election.data?.metadata)
  const content = useVoteContent(vote.data, election.data)

  const overwriteCount = vote.data?.overwriteCount ?? 0
  const blockHeight = vote.data?.blockHeight
  const electionStatus = election.data?.status ?? ''

  // `/envelope` with nothing after the `#` — a truncated paste, or the route
  // reached by hand. Nothing to look up, so point at the two pages that help.
  if (!voteId) {
    return (
      <Box borderWidth='1px' borderColor='border' borderRadius='md'>
        <EmptyState
          icon={LuReceipt}
          title='No vote ID in this link'
          hint='A vote link ends in the 64-character ID of the ballot it shows. Browse the recent votes, or look yours up on the verify page.'
        >
          <Flex gap={2} mt={2}>
            <Button asChild size='sm'>
              <RouterLink to='/verify'>Verify a vote</RouterLink>
            </Button>
            <Button asChild size='sm' variant='outline'>
              <RouterLink to='/envelopes'>Recent votes</RouterLink>
            </Button>
          </Flex>
        </EmptyState>
      </Box>
    )
  }

  if (vote.isLoading) {
    return (
      <Flex align='center' justify='center' gap={3} py={20} color='texts.subtle'>
        <Spinner />
        <Text fontSize='sm'>Looking up this vote…</Text>
      </Flex>
    )
  }

  if (vote.isError || !vote.data) {
    return (
      <Box borderWidth='1px' borderColor='border' borderRadius='md'>
        <EmptyState
          icon={LuReceipt}
          title='No vote with this ID'
          hint='The chain does not know this vote ID. Check for a missing character — vote IDs are 64 hex characters — or try the verify page, which searches every election.'
        >
          <Button asChild size='sm' mt={2}>
            <RouterLink to={`/verify#${voteId}`}>Try verifying it</RouterLink>
          </Button>
        </EmptyState>
      </Box>
    )
  }

  return (
    <Grid gap={8}>
      <VoteReceiptHero
        voteId={voteId}
        electionId={electionId}
        electionTitle={electionMeta.title}
        date={vote.data.date}
        blockHeight={blockHeight}
      />

      <Flex gap={2} wrap='wrap'>
        <Button asChild size='sm'>
          <RouterLink to={electionId ? `/verify#${electionId}/${voteId}` : `/verify#${voteId}`}>
            <LuShieldCheck />
            Verify this vote
          </RouterLink>
        </Button>
        {electionId && (
          <Button asChild size='sm' variant='outline'>
            <RouterLink to={`/process/${electionId}`}>Election</RouterLink>
          </Button>
        )}
        {blockHeight !== undefined && (
          <Button asChild size='sm' variant='outline'>
            <RouterLink to={`/block/${blockHeight}`}>Block</RouterLink>
          </Button>
        )}
        {vote.data.txHash && (
          <Button asChild size='sm' variant='outline'>
            <RouterLink to={`/transactions/${vote.data.txHash}`}>Transaction</RouterLink>
          </Button>
        )}
      </Flex>

      <PageSection
        title='How this ballot travelled'
        subtitle='Three things happen to every vote. All three are on the public record.'
      >
        <VoteJourney
          castDone
          blockHeight={blockHeight}
          counted={election.data?.finalResults === true}
          electionEnded={ENDED_STATUSES.includes(electionStatus)}
        />
      </PageSection>

      <BallotContents content={content} />

      <OverwriteNotice overwriteCount={overwriteCount} maxVoteOverwrites={content.maxVoteOverwrites} />

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
        <StatTile
          label='Counts as'
          value={content.weighted ? content.weight : '1 vote'}
          help={
            content.weighted
              ? `This census is weighted, so this ballot carries ${content.weight} units of voting power rather than one.`
              : 'Every voter in this census carries the same weight — one ballot, one vote.'
          }
          icon={<Icon as={LuScale} color='fg.muted' />}
        />
        <StatTile
          label='Cast'
          value={<RelativeTime value={vote.data.date} mode='relative' fontSize='xl' />}
          help={vote.data.date ? new Date(vote.data.date).toLocaleString() : undefined}
          icon={<Icon as={LuCalendarClock} color='fg.muted' />}
        />
        <StatTile
          label='Block'
          value={
            blockHeight !== undefined ? (
              <Link asChild variant='plain'>
                <RouterLink to={`/block/${blockHeight}`}>{blockHeight.toLocaleString()}</RouterLink>
              </Link>
            ) : (
              '—'
            )
          }
          help='The block this ballot was sealed into.'
          icon={<Icon as={LuBoxes} color='fg.muted' />}
        />
        <StatTile
          label='Re-cast'
          value={overwriteCount === 0 ? 'Never' : `${overwriteCount} time${overwriteCount === 1 ? '' : 's'}`}
          help={
            overwriteCount === 0
              ? 'This ballot was submitted once and never replaced.'
              : 'Only the most recent ballot counts — that is this one.'
          }
          icon={<Icon as={LuReceipt} color='fg.muted' />}
        />
      </SimpleGrid>

      <TechnicalDetails title='Technical details' json={vote.data}>
        <TechnicalField label='Vote ID'>
          <HashDisplay value={voteId} copyLabel='Vote ID' full />
        </TechnicalField>
        <TechnicalField label='Election ID'>
          <HashDisplay value={electionId} copyLabel='Election ID' full />
        </TechnicalField>
        <TechnicalField label='Voter ID'>
          <HashDisplay value={vote.data.voterID} copyLabel='Voter ID' full />
        </TechnicalField>
        <TechnicalField label='Transaction hash'>
          <HashDisplay value={vote.data.txHash} copyLabel='Transaction hash' full />
        </TechnicalField>
        <TechnicalField label='Vote package'>
          <JsonViewer json={vote.data.package ?? null} mt={1} />
        </TechnicalField>
      </TechnicalDetails>
    </Grid>
  )
}

export default VoteDetailPage
