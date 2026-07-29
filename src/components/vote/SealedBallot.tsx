import { Box, Button, Flex, Icon, Text } from '@chakra-ui/react'
import { LuKeyRound, LuLock, LuLockOpen, LuTriangleAlert } from 'react-icons/lu'
import { HashDisplay } from '~components/shared/HashDisplay'
import type { VoteContent } from '~hooks/useVoteContent'

const KeyList = ({ label, keys }: { label: string; keys: { index: number; key: string }[] }) => {
  if (!keys.length) return null
  return (
    <Box mt={4}>
      <Text fontSize='xs' color='texts.subtle' textTransform='uppercase' letterSpacing='wide' mb={2}>
        {label}
      </Text>
      <Flex direction='column' gap={1}>
        {keys.map((entry) => (
          <Flex key={entry.index} gap={2} align='center' fontSize='xs'>
            <Text color='texts.subtle' minW='4ch'>
              #{entry.index}
            </Text>
            <HashDisplay value={entry.key} copyLabel={`${label} ${entry.index}`} left={10} right={8} />
          </Flex>
        ))}
      </Flex>
    </Box>
  )
}

/**
 * What an encrypted ballot looks like before and after the election closes.
 *
 * Encrypted elections withhold the decryption keys until voting is over, which
 * is the point — but from the voter's side it looks like the receipt is broken.
 * So the sealed state is stated as a deliberate protocol guarantee, and the
 * moment the keys are public the ballot can be opened right here, in the
 * browser, with no help from the API.
 */
export const SealedBallot = ({ content }: { content: VoteContent }) => {
  const openable = content.status === 'unsealable'

  return (
    <Box
      borderWidth='1px'
      borderColor={openable ? 'border' : 'blue.500'}
      borderRadius='md'
      bg={openable ? 'bg.subtle' : 'blue.subtle'}
      p={{ base: 4, md: 5 }}
    >
      <Flex gap={4} align='flex-start'>
        <Flex
          boxSize={11}
          flexShrink={0}
          align='center'
          justify='center'
          borderRadius='full'
          bg='bg'
          borderWidth='1px'
          borderColor={openable ? 'border' : 'blue.500'}
          color={openable ? 'fg' : 'blue.600'}
        >
          <Icon as={openable ? LuLockOpen : LuLock} boxSize={5} />
        </Flex>

        <Box minW={0} flex='1'>
          <Text fontWeight='bold' mb={1}>
            {openable ? 'This ballot is encrypted — but it can now be opened' : 'This ballot is encrypted'}
          </Text>
          <Text fontSize='sm' color='texts.subtle'>
            {openable ? (
              <>
                The election is over and its decryption keys have been published on the chain. Opening happens in
                this browser: the sealed ballot and the published keys never leave your device.
              </>
            ) : (
              <>
                Its contents stay sealed until the election ends and the decryption keys are published. Nobody —
                not the organizer, not this explorer, not the node that stored it — can read which choices it
                carries before then.
              </>
            )}
          </Text>

          {openable && (
            <Button size='sm' mt={4} onClick={content.decrypt}>
              <LuKeyRound />
              Decrypt vote and check contents
            </Button>
          )}

          {content.decryptError && (
            <Flex gap={2} align='flex-start' mt={3} color='orange.600' fontSize='sm'>
              <Icon as={LuTriangleAlert} boxSize={4} mt={0.5} flexShrink={0} />
              <Text>
                The ballot could not be opened: {content.decryptError}. The record itself is unaffected — this only
                means the published keys do not match this envelope.
              </Text>
            </Flex>
          )}

          {content.keyIndexes.length > 0 && (
            <Text fontSize='xs' color='texts.subtle' mt={4}>
              Sealed with {content.keyIndexes.length} encryption key
              {content.keyIndexes.length === 1 ? '' : 's'} (index
              {content.keyIndexes.length === 1 ? ' ' : 'es '}
              {content.keyIndexes.join(', ')}), applied one after another.
            </Text>
          )}

          <KeyList label='Public keys' keys={content.publicKeys} />
          <KeyList label='Published private keys' keys={content.privateKeys} />
        </Box>
      </Flex>
    </Box>
  )
}
