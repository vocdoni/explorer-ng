import { Box, Flex, Icon, Link, Spinner, Text } from '@chakra-ui/react'
import { useState, type ReactNode } from 'react'
import { LuCheck, LuChevronDown, LuChevronRight, LuTriangleAlert } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router-dom'
import { DetailGrid, DetailRow } from '~components/shared/DetailGrid'
import { HashDisplay } from '~components/shared/HashDisplay'
import { RelativeTime } from '~components/shared/RelativeTime'
import { StatusTag } from '~components/shared/StatusTag'
import type { Verification } from '~hooks/useVerification'
import { formatDate } from '~utils/format'

type StepState = 'pending' | 'ok' | 'failed'

interface Step {
  key: string
  state: StepState
  headline: string
  /** Shown when the step could not be resolved — never blames the voter. */
  evidence: ReactNode
}

const Marker = ({ state }: { state: StepState }) => {
  if (state === 'pending') {
    return (
      <Flex boxSize={7} align='center' justify='center' borderRadius='full' borderWidth='1px' borderColor='border'>
        <Spinner size='xs' />
      </Flex>
    )
  }
  const failed = state === 'failed'
  return (
    <Flex
      boxSize={7}
      align='center'
      justify='center'
      borderRadius='full'
      bg={failed ? 'orange.subtle' : 'green.subtle'}
      borderWidth='1px'
      borderColor={failed ? 'orange.500' : 'green.500'}
      color={failed ? 'orange.600' : 'green.600'}
    >
      <Icon as={failed ? LuTriangleAlert : LuCheck} boxSize={4} />
    </Flex>
  )
}

const StepRow = ({ step, last }: { step: Step; last: boolean }) => {
  const [open, setOpen] = useState(false)
  return (
    <Flex gap={3} align='stretch'>
      <Flex direction='column' align='center'>
        <Marker state={step.state} />
        {!last && <Box flex='1' w='1px' bg='border' minH={4} my={1} />}
      </Flex>
      <Box flex='1' minW={0} pb={last ? 0 : 5}>
        <Flex
          as='button'
          align='center'
          gap={2}
          w='100%'
          textAlign='left'
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <Text fontWeight='bold' fontSize='sm' flex='1' minW={0}>
            {step.headline}
          </Text>
          <Icon as={open ? LuChevronDown : LuChevronRight} boxSize={4} color='texts.subtle' />
        </Flex>
        {open && (
          <Box mt={3} borderWidth='1px' borderColor='border' borderRadius='md' p={3} bg='bg.subtle'>
            {step.evidence}
          </Box>
        )}
      </Box>
    </Flex>
  )
}

const CouldNotFetch = ({ what }: { what: string }) => (
  <Text fontSize='sm' color='orange.600'>
    We could not fetch {what} right now. That does not undo anything above — the earlier evidence still
    stands. Try again in a moment, or ask a different Vocdoni node.
  </Text>
)

/**
 * The centrepiece of the voter journey: a sequential account of what happened
 * to a ballot, each claim backed by the raw record it came from.
 *
 * Steps resolve independently and out of order, which is honest — a slow block
 * lookup should not hold back the confirmation the voter came for.
 */
export const EvidenceChain = ({ verification }: { verification: Verification }) => {
  const { vote, verify, election, block, chain, electionId, voteId, electionMeta } = verification

  const blockHeight = vote.data?.blockHeight
  const chainHeight = chain.data?.height ?? 0
  const depth = blockHeight !== undefined && chainHeight > blockHeight ? chainHeight - blockHeight : 0
  const electionTitle = electionMeta.title ?? 'this election'
  const finalResults = election.data?.finalResults

  const steps: Step[] = [
    {
      key: 'registered',
      state: verify.isSuccess ? 'ok' : verify.isError ? 'failed' : 'pending',
      headline: verify.isSuccess ? 'Your vote is registered on the chain' : 'Checking the vote with the chain',
      evidence: verify.isError ? (
        <CouldNotFetch what='the chain’s confirmation' />
      ) : (
        <Box>
          <Text fontSize='sm' mb={3}>
            The chain answered <b>HTTP 200</b> for this vote, which is its way of saying the ballot exists and
            belongs to this election. Anyone can repeat this request without trusting this page.
          </Text>
          <DetailGrid columns={{ base: 1, sm: 2 }} gap={4}>
            <DetailRow label='Vote ID'>
              <HashDisplay value={voteId} copyLabel='Vote ID' full to={`/votes/${voteId}`} />
            </DetailRow>
            <DetailRow label='Endpoint used'>
              <Text fontFamily='mono' fontSize='xs' wordBreak='break-all' fontWeight='normal'>
                {verify.data?.url}
              </Text>
            </DetailRow>
          </DetailGrid>
        </Box>
      ),
    },
    {
      key: 'block',
      state: vote.isSuccess && blockHeight !== undefined ? 'ok' : vote.isError ? 'failed' : 'pending',
      headline:
        blockHeight !== undefined
          ? `Recorded in block ${blockHeight.toLocaleString()}`
          : 'Looking for the block that holds it',
      evidence: vote.isError ? (
        <CouldNotFetch what='the block and transaction details' />
      ) : (
        <DetailGrid columns={{ base: 1, sm: 2 }} gap={4}>
          <DetailRow label='Block'>
            <Link asChild variant='plain'>
              <RouterLink to={`/blocks/${blockHeight ?? ''}`}>{(blockHeight ?? 0).toLocaleString()}</RouterLink>
            </Link>
          </DetailRow>
          <DetailRow label='Transaction'>
            {vote.data?.txHash ? (
              <HashDisplay
                value={vote.data.txHash}
                copyLabel='Transaction hash'
                to={`/transactions/${vote.data.txHash}`}
              />
            ) : (
              '—'
            )}
          </DetailRow>
          <DetailRow label='Cast'>
            <RelativeTime value={vote.data?.date} />
          </DetailRow>
        </DetailGrid>
      ),
    },
    {
      key: 'sealed',
      state: block.isSuccess ? 'ok' : block.isError ? 'failed' : 'pending',
      headline: block.isSuccess ? 'That block was sealed by the chain' : 'Checking that the block was sealed',
      evidence: block.isError ? (
        <CouldNotFetch what='the block header' />
      ) : (
        <Box>
          <Text fontSize='sm' mb={3}>
            A sealed block cannot be edited without every validator agreeing to rewrite history.
            {depth > 0 && ` ${depth.toLocaleString()} blocks have been sealed on top of this one since.`}
          </Text>
          <DetailGrid columns={{ base: 1, sm: 2 }} gap={4}>
            <DetailRow label='Block hash'>
              <HashDisplay value={block.data?.hash} copyLabel='Block hash' full />
            </DetailRow>
            <DetailRow label='Sealed at'>
              <Text fontSize='sm' fontWeight='normal'>
                {formatDate(block.data?.header.time)}
              </Text>
            </DetailRow>
            <DetailRow label='Proposed by'>
              <HashDisplay value={block.data?.header.proposerAddress} copyLabel='Proposer address' />
            </DetailRow>
          </DetailGrid>
        </Box>
      ),
    },
    {
      key: 'election',
      state: election.isSuccess ? 'ok' : election.isError ? 'failed' : 'pending',
      headline: election.isSuccess ? `Part of “${electionTitle}”` : 'Identifying the election',
      evidence: election.isError ? (
        <CouldNotFetch what='the election record' />
      ) : (
        <DetailGrid columns={{ base: 1, sm: 2 }} gap={4}>
          <DetailRow label='Election'>
            <Link asChild variant='plain'>
              <RouterLink to={`/elections/${electionId}`}>{electionTitle}</RouterLink>
            </Link>
          </DetailRow>
          <DetailRow label='Election ID'>
            <HashDisplay value={electionId} copyLabel='Election ID' full />
          </DetailRow>
          <DetailRow label='Votes counted so far'>
            <Text fontSize='md' fontWeight='bold'>
              {(election.data?.voteCount ?? 0).toLocaleString()}
            </Text>
          </DetailRow>
        </DetailGrid>
      ),
    },
    {
      key: 'status',
      state: election.isSuccess ? 'ok' : election.isError ? 'failed' : 'pending',
      headline: election.isSuccess
        ? finalResults
          ? 'Voting is over and the results are final'
          : election.data?.status?.toUpperCase() === 'READY'
            ? 'Voting is still open — your ballot is waiting to be counted'
            : 'Voting has closed; the final count is not published yet'
        : 'Checking the election status',
      evidence: election.isError ? (
        <CouldNotFetch what='the current election status' />
      ) : (
        <Box>
          <Flex align='center' gap={2} mb={3}>
            <StatusTag status={election.data?.status} />
          </Flex>
          <Text fontSize='sm'>
            {finalResults
              ? 'The results have been published on the chain and can no longer change. Your ballot is part of that count.'
              : 'Results are not final yet. Your ballot is already stored on the chain and will be included when the count is published.'}
          </Text>
        </Box>
      ),
    },
  ]

  return (
    <Box>
      {steps.map((step, i) => (
        <StepRow key={step.key} step={step} last={i === steps.length - 1} />
      ))}
    </Box>
  )
}
