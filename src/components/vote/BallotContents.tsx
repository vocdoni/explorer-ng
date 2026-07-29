import { Box, Flex, Heading, Icon, Spinner, Text } from '@chakra-ui/react'
import { LuFileQuestion, LuLockOpen, LuVote } from 'react-icons/lu'
import type { VoteContent } from '~hooks/useVoteContent'
import { BallotQuestionCard } from './BallotQuestionCard'
import { SealedBallot } from './SealedBallot'

const RawValues = ({ votes }: { votes: number[] }) => (
  <Flex gap={2} wrap='wrap'>
    {votes.map((value, index) => (
      <Flex
        key={index}
        direction='column'
        align='center'
        minW={14}
        px={3}
        py={2}
        borderRadius='sm'
        borderWidth='1px'
        borderColor='border'
        bg='bg.subtle'
      >
        <Text fontSize='2xs' color='texts.subtle' textTransform='uppercase' letterSpacing='wide'>
          #{index + 1}
        </Text>
        <Text fontSize='lg' fontWeight='bold' fontFamily='mono'>
          {value}
        </Text>
      </Flex>
    ))}
  </Flex>
)

const Explainer = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize='sm' color='texts.subtle' mt={4}>
    {children}
  </Text>
)

/**
 * The centrepiece: what this ballot actually says.
 *
 * A vote package is an array of numbers, which is meaningless on its own — the
 * election metadata is what turns `[2]` into "you chose Yes". When the two do
 * not line up (no metadata published, a ballot shape the explorer cannot map,
 * a still-sealed envelope) the numbers are shown anyway, with a sentence
 * explaining why that is all there is. Nothing is silently dropped.
 */
export const BallotContents = ({ content }: { content: VoteContent }) => {
  const body = () => {
    if (content.status === 'loading') {
      return (
        <Flex align='center' gap={3} py={6} justify='center' color='texts.subtle'>
          <Spinner size='sm' />
          <Text fontSize='sm'>Reading the ballot…</Text>
        </Flex>
      )
    }

    if (content.status === 'sealed' || content.status === 'unsealable') {
      return <SealedBallot content={content} />
    }

    if (content.status === 'unavailable' || !content.votes) {
      return (
        <Flex direction='column' align='center' textAlign='center' gap={3} py={8}>
          <Icon as={LuFileQuestion} boxSize={10} color='fg.muted' />
          <Text fontWeight='bold'>The ballot contents are not available</Text>
          <Text fontSize='sm' color='texts.subtle' maxW='md'>
            The chain has the vote — everything above still holds — but this node did not return a readable vote
            package for it. Another Vocdoni node may serve it.
          </Text>
        </Flex>
      )
    }

    const showCards =
      (content.shape === 'choices' || content.shape === 'multi-choice') && content.questions.length > 0

    if (showCards) {
      return (
        <Flex direction='column' gap={4}>
          {content.questions.map((question) => (
            <BallotQuestionCard key={question.position} question={question} total={content.questions.length} />
          ))}
        </Flex>
      )
    }

    return (
      <Box borderWidth='1px' borderColor='border' borderRadius='md' p={{ base: 4, md: 5 }}>
        <Text fontWeight='bold' mb={3}>
          {content.shape === 'weighted' ? 'The values on this ballot' : 'The numbers on this ballot'}
        </Text>
        <RawValues votes={content.votes} />
        {content.shape === 'weighted' ? (
          <Explainer>
            This election does not ask for a single pick per question — each number is an amount the voter spread
            across the options, and the cost of an amount grows faster than the amount itself. The values above are
            exactly what was recorded; the election page shows how they were tallied.
          </Explainer>
        ) : content.hasMetadata ? (
          <Explainer>
            This ballot carries {content.votes.length} value{content.votes.length === 1 ? '' : 's'}, which does not
            line up with the {content.questions.length || 'published'} question wording for this election, so the
            raw numbers are shown rather than a guess at what they mean.
          </Explainer>
        ) : (
          <Explainer>
            This election published no question wording, so there is nothing to translate these numbers into. Each
            entry is one answer, in the order the ballot defines.
          </Explainer>
        )}
      </Box>
    )
  }

  const decoded = content.status === 'readable' && !!content.votes

  return (
    <Box>
      <Flex align='center' gap={3} mb={4}>
        <Icon as={LuVote} boxSize={6} color='fg.muted' />
        <Heading size='lg'>What this ballot says</Heading>
        <Box flex='1' h='1px' bg='border' />
      </Flex>

      {content.decryptedLocally && (
        <Flex
          gap={2}
          align='center'
          mb={4}
          px={3}
          py={2}
          borderRadius='sm'
          borderWidth='1px'
          borderColor='green.500'
          bg='green.subtle'
          fontSize='sm'
        >
          <Icon as={LuLockOpen} boxSize={4} color='green.600' />
          <Text>Opened in your browser with the election&rsquo;s published decryption keys.</Text>
        </Flex>
      )}

      {body()}

      {decoded && (
        <Text fontSize='xs' color='texts.subtle' mt={4}>
          This is what this ballot contains, decoded from the {content.decryptedLocally ? 'decrypted' : 'public'}{' '}
          vote package.
        </Text>
      )}
    </Box>
  )
}
