import { Card, Flex, Heading, Link, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router'
import { HashDisplay } from '~components/shared/HashDisplay'
import { RelativeTime } from '~components/shared/RelativeTime'
import { StatusTag } from '~components/shared/StatusTag'
import type { ElectionSummary } from '~types/api'
import { shortHex } from '~utils/format'

interface Props {
  election: ElectionSummary
  /** Human title resolved from election metadata; falls back to the id. */
  title?: string
}

export const ElectionCard = ({ election, title }: Props) => (
  <Card.Root>
    <Card.Body gap={4}>
      <Flex justify='space-between' align='flex-start' gap={3} wrap='wrap'>
        <Link asChild variant='unstyled' minW={0} flex='1'>
          <RouterLink to={`/process/${election.electionId}`}>
            <Heading size='md' lineHeight={1.3} wordBreak='break-word'>
              {title || shortHex(election.electionId, 12, 8)}
            </Heading>
          </RouterLink>
        </Link>
        <StatusTag status={election.status} />
      </Flex>

      <Flex direction='column' gap={1} fontSize='sm' color='texts.subtle'>
        <Text as='span'>
          Starts <RelativeTime value={election.startDate} mode='relative' />
        </Text>
        <Text as='span'>
          Ends <RelativeTime value={election.endDate} mode='relative' />
        </Text>
      </Flex>
    </Card.Body>

    <Card.Footer justifyContent='space-between' gap={3} flexWrap='wrap'>
      <Text fontSize='sm'>
        {election.voteCount.toLocaleString()} {election.voteCount === 1 ? 'vote' : 'votes'} cast
      </Text>
      <HashDisplay value={election.electionId} copyLabel='Election ID' />
    </Card.Footer>
  </Card.Root>
)
