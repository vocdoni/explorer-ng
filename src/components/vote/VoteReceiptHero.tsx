import { Box, Flex, Heading, Icon, Link, Text } from '@chakra-ui/react'
import { LuCircleCheck } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router'
import { HashDisplay } from '~components/shared/HashDisplay'
import { RelativeTime } from '~components/shared/RelativeTime'
import { parseApiDate } from '~utils/format'

interface Props {
  voteId: string
  electionId?: string
  electionTitle?: string
  date?: string
  blockHeight?: number
}

/**
 * The first thing a voter should see is the answer to the question they came
 * with — "did my ballot arrive?" — stated once, in a sentence, before any
 * identifier appears.
 */
export const VoteReceiptHero = ({ voteId, electionId, electionTitle, date, blockHeight }: Props) => {
  const cast = parseApiDate(date)
  const election = electionTitle ?? 'this election'

  return (
    <Box
      borderWidth='1px'
      borderColor='green.500'
      borderRadius='md'
      bg='green.subtle'
      p={{ base: 5, md: 7 }}
      position='relative'
      overflow='hidden'
    >
      {/* A quiet watermark rather than a second, competing icon */}
      <Icon
        as={LuCircleCheck}
        boxSize={{ base: 40, md: 56 }}
        color='green.500'
        opacity={0.06}
        position='absolute'
        top={{ base: -12, md: -16 }}
        right={{ base: -10, md: -12 }}
        pointerEvents='none'
        aria-hidden
      />

      <Flex gap={{ base: 4, md: 5 }} align='flex-start' position='relative'>
        <Flex
          boxSize={{ base: 12, md: 14 }}
          flexShrink={0}
          align='center'
          justify='center'
          borderRadius='full'
          bg='bg'
          borderWidth='1px'
          borderColor='green.500'
          color='green.600'
        >
          <Icon as={LuCircleCheck} boxSize={{ base: 7, md: 8 }} />
        </Flex>

        <Box minW={0} flex='1'>
          <Heading size='2xl' fontWeight='bold' lineHeight={1.15}>
            Vote recorded
          </Heading>
          <Text mt={2} fontSize='md' color='fg'>
            A ballot for{' '}
            {electionId ? (
              <Link asChild variant='plain' fontWeight='bold'>
                <RouterLink to={`/process/${electionId}`}>{election}</RouterLink>
              </Link>
            ) : (
              <Text as='span' fontWeight='bold'>
                {election}
              </Text>
            )}{' '}
            was cast <RelativeTime value={date} mode='relative' fontWeight='bold' />
            {cast && ` (${cast.toLocaleDateString()} at ${cast.toLocaleTimeString()})`}
            {blockHeight !== undefined && (
              <>
                {' '}
                and written into block{' '}
                <Link asChild variant='plain' fontWeight='bold'>
                  <RouterLink to={`/block/${blockHeight}`}>{blockHeight.toLocaleString()}</RouterLink>
                </Link>
              </>
            )}
            . It cannot be removed or altered.
          </Text>
          <Box mt={3}>
            <HashDisplay value={voteId} copyLabel='Vote ID' full />
          </Box>
        </Box>
      </Flex>
    </Box>
  )
}
