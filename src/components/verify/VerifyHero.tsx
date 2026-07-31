import { Box, Button, Flex, Heading, Icon, Input, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuShieldCheck } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import { normalizeId } from '~utils/format'

/**
 * The front door for the one visitor who is not here to browse a blockchain: a
 * voter who wants to know their ballot arrived. Previously `/verify` was
 * reachable only from the nav, so arriving cold meant guessing.
 *
 * The election ID is not asked for — `GET /votes/{id}` resolves it — because a
 * second field is exactly where a nervous voter gives up.
 */
export const VerifyHero = () => {
  const navigate = useNavigate()
  const [voteId, setVoteId] = useState('')
  // `/verify#{voteId}`: one identifier, election resolved on arrival, and the
  // identifier after the `#` so it never reaches a server log.
  const go = () => {
    const id = normalizeId(voteId)
    navigate(id ? `/verify#${id}` : '/verify')
  }

  return (
    <Box borderWidth='1px' borderColor='border' borderRadius='md' p={{ base: 4, md: 5 }} bg='bg.subtle'>
      <Flex gap={4} align={{ base: 'flex-start', lg: 'center' }} direction={{ base: 'column', lg: 'row' }}>
        <Flex gap={3} align='center' flex='1' minW={0}>
          <Icon as={LuShieldCheck} boxSize={8} color='green.600' />
          <Box minW={0}>
            <Heading size='md'>Voted? Verify it counted.</Heading>
            <Text fontSize='sm' color='texts.subtle' mt={1}>
              Paste the vote ID from your voting app to see where your ballot is stored and download a proof.
            </Text>
          </Box>
        </Flex>
        <Flex gap={3} w={{ base: '100%', lg: 'auto' }} minW={{ lg: '380px' }}>
          <Input
            placeholder='Vote ID'
            aria-label='Vote ID'
            fontFamily='mono'
            fontSize='sm'
            bg='bg'
            value={voteId}
            onChange={(e) => setVoteId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
          />
          <Button onClick={go} flexShrink={0}>
            Verify my vote
          </Button>
        </Flex>
      </Flex>
    </Box>
  )
}
