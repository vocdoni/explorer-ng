import { Badge, Box, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { PageSection } from '~components/shared/PageSection'
import { useElectionFees, useKeyRevealHeight } from '~hooks/useElectionAnalytics'
import type { Election } from '~types/api'
import { formatDate, parseApiDate } from '~utils/format'

interface Props {
  electionId: string
  election?: Election
  encrypted: boolean
  /** Block height of the election creation, already resolved by the page. */
  creationHeight?: number
}

interface Step {
  title: string
  date?: Date
  detail?: string
  height?: number
  done: boolean
}

/**
 * The election's life as a vertical stepper.
 *
 * Everything except the key-reveal step comes from data the page already has.
 * Key reveal has no endpoint of its own, so it is derived opportunistically and
 * degrades to a plain "keys were revealed" line when the block cannot be
 * pinned down.
 */
export const LifecycleTimeline = ({ electionId, election, encrypted, creationHeight }: Props) => {
  const fees = useElectionFees(electionId, 0)
  const feeRows = (fees.data?.fees ?? []).filter((fee) => fee.reference?.toLowerCase() === electionId.toLowerCase())
  const statusFee = feeRows.find((fee) => fee.txType === 'set_process_status')
  const creationFee = feeRows.find((fee) => fee.txType === 'new_process')
  // Gateways that index the election->key-reveal link report it directly on
  // the election record, skipping the block-scan heuristic entirely.
  const known =
    election?.keyRevealHeight !== undefined
      ? { height: election.keyRevealHeight, hash: election.keyRevealTxHash }
      : undefined
  const reveal = useKeyRevealHeight(encrypted, statusFee?.height, known)

  const now = Date.now()
  const created = parseApiDate(election?.creationTime)
  const start = parseApiDate(election?.startDate)
  const end = parseApiDate(election?.endDate)
  const closedAt = election?.manuallyEnded && statusFee ? parseApiDate(statusFee.timestamp) : end

  const steps: Step[] = [
    {
      title: 'Election created',
      date: created,
      height: creationFee?.height ?? creationHeight,
      detail: creationFee ? `cost ${creationFee.cost.toLocaleString()}` : undefined,
      done: !!created,
    },
    {
      title: 'Voting opened',
      date: start,
      done: !!start && start.getTime() <= now,
    },
    {
      title: election?.manuallyEnded ? 'Voting closed early by the organizer' : 'Voting closed',
      date: closedAt,
      height: election?.manuallyEnded ? statusFee?.height : undefined,
      detail: election?.manuallyEnded ? `scheduled close was ${formatDate(election?.endDate)}` : undefined,
      done: !!closedAt && closedAt.getTime() <= now,
    },
  ]

  if (encrypted) {
    steps.push({
      title: 'Encryption keys revealed',
      height: reveal.data?.height,
      detail: reveal.data
        ? undefined
        : reveal.isFetching
          ? 'locating the reveal transaction…'
          : 'exact block not determined',
      done: !!reveal.data || election?.finalResults === true,
    })
  }

  steps.push({
    title: 'Results published',
    date: election?.finalResults ? closedAt : undefined,
    detail: election?.finalResults ? undefined : 'results are not final yet',
    done: election?.finalResults === true,
  })

  return (
    <PageSection title='Lifecycle' subtitle='What happened to this election, and when'>
      <VStack align='stretch' gap={0}>
        {steps.map((step, i) => (
          <HStack key={step.title} align='flex-start' gap={4}>
            <VStack gap={0} alignSelf='stretch' pt={1}>
              <Box
                w='10px'
                h='10px'
                borderRadius='full'
                bgColor={step.done ? 'green.500' : 'bg.muted'}
                border='2px solid'
                borderColor={step.done ? 'green.500' : 'border'}
                flexShrink={0}
              />
              {i < steps.length - 1 && <Box w='2px' flex='1' minH='28px' bgColor='border' />}
            </VStack>
            <Box pb={i < steps.length - 1 ? 5 : 0} minW={0}>
              <HStack gap={2} flexWrap='wrap'>
                <Text fontWeight='medium'>{step.title}</Text>
                {!step.done && <Badge colorPalette='gray'>pending</Badge>}
              </HStack>
              <HStack gap={3} flexWrap='wrap' fontSize='sm' color='texts.subtle'>
                {step.date && <Text>{formatDate(step.date.toISOString())}</Text>}
                {step.height !== undefined && (
                  <Link asChild variant='plain'>
                    <RouterLink to={`/blocks/${step.height}`}>block {step.height.toLocaleString()}</RouterLink>
                  </Link>
                )}
                {step.detail && <Text>{step.detail}</Text>}
              </HStack>
            </Box>
          </HStack>
        ))}
      </VStack>
      <Text mt={4} fontSize='xs' color='texts.subtle'>
        {encrypted
          ? 'Ballots in this election were encrypted; they only became readable once the keys were published for the count.'
          : 'This election was not encrypted — ballots were recorded in the clear.'}
      </Text>
    </PageSection>
  )
}
