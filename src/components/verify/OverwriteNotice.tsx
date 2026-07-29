import { Box, Flex, Icon, Text } from '@chakra-ui/react'
import { LuRepeat } from 'react-icons/lu'

interface Props {
  overwriteCount: number
  maxVoteOverwrites: number
}

/**
 * Overwrites are the single most alarming thing a voter can find on their own
 * receipt — "why does it say my vote was replaced?" — so it gets said in plain
 * words rather than left as a number in a table. When the election never
 * allowed overwrites there is nothing to explain, and this renders nothing.
 */
export const OverwriteNotice = ({ overwriteCount, maxVoteOverwrites }: Props) => {
  if (overwriteCount === 0 && maxVoteOverwrites === 0) return null

  const times = (n: number) => `${n} time${n === 1 ? '' : 's'}`

  return (
    <Box borderWidth='1px' borderColor='border' borderRadius='md' p={4} bg='bg.subtle'>
      <Flex gap={3} align='flex-start'>
        <Icon as={LuRepeat} boxSize={5} color='texts.subtle' mt={1} />
        <Box>
          <Text fontWeight='bold' fontSize='sm' mb={1}>
            {overwriteCount > 0 ? 'You changed your vote' : 'You could have changed your vote'}
          </Text>
          {overwriteCount > 0 ? (
            <Text fontSize='sm' color='texts.subtle'>
              You changed your vote {times(overwriteCount)}. Only your most recent ballot was counted — that is
              this one. The earlier ballots were replaced on the chain, not deleted, which is why the count is
              visible here.
            </Text>
          ) : (
            <Text fontSize='sm' color='texts.subtle'>
              This election let you change your vote up to {times(maxVoteOverwrites)}; you did not. The ballot
              recorded here is the one that counts.
            </Text>
          )}
        </Box>
      </Flex>
    </Box>
  )
}
