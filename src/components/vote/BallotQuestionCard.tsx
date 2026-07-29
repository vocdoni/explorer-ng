import { Box, Flex, Icon, Text } from '@chakra-ui/react'
import { LuCheck } from 'react-icons/lu'
import type { BallotChoice, BallotQuestion } from '~hooks/useVoteContent'

const ChoiceRow = ({ choice }: { choice: BallotChoice }) => (
  <Flex
    gap={3}
    align='center'
    px={3}
    py={2.5}
    borderRadius='sm'
    borderWidth='1px'
    borderColor={choice.chosen ? 'green.500' : 'transparent'}
    bg={choice.chosen ? 'green.subtle' : 'transparent'}
    color={choice.chosen ? 'fg' : 'texts.subtle'}
  >
    <Flex
      boxSize={5}
      flexShrink={0}
      align='center'
      justify='center'
      borderRadius='full'
      borderWidth='1px'
      borderColor={choice.chosen ? 'green.600' : 'border'}
      bg={choice.chosen ? 'green.600' : 'transparent'}
      color={choice.chosen ? 'white' : 'transparent'}
    >
      <Icon as={LuCheck} boxSize={3} />
    </Flex>
    <Text fontSize='sm' fontWeight={choice.chosen ? 'bold' : 'normal'} flex='1' minW={0}>
      {choice.label}
    </Text>
    {choice.chosen && (
      <Text fontSize='xs' color='green.600' fontWeight='bold' flexShrink={0}>
        Your choice
      </Text>
    )}
  </Flex>
)

/** One question, with every option listed and the picked one lit up. */
export const BallotQuestionCard = ({ question, total }: { question: BallotQuestion; total: number }) => (
  <Box borderWidth='1px' borderColor='border' borderRadius='md' p={{ base: 4, md: 5 }}>
    <Text fontSize='xs' color='texts.subtle' textTransform='uppercase' letterSpacing='wide' mb={1}>
      Question {question.position + 1} of {total}
    </Text>
    <Text fontWeight='bold' fontSize='lg' lineHeight={1.3}>
      {question.title}
    </Text>
    {question.description && (
      <Text fontSize='sm' color='texts.subtle' mt={1}>
        {question.description}
      </Text>
    )}

    <Flex direction='column' gap={1} mt={4}>
      {question.choices.map((choice) => (
        <ChoiceRow key={choice.position} choice={choice} />
      ))}
      {question.unmatched.map((value) => (
        <ChoiceRow
          key={`unmatched-${value}`}
          choice={{ position: -1 - value, value, label: `Choice ${value}`, chosen: true }}
        />
      ))}
    </Flex>

    {question.unmatched.length > 0 && (
      <Text fontSize='xs' color='texts.subtle' mt={3}>
        The ballot carries {question.unmatched.length === 1 ? 'a value' : 'values'} the published metadata has no
        wording for, so {question.unmatched.length === 1 ? 'it is' : 'they are'} shown as raw choice numbers.
      </Text>
    )}
    {!question.choices.some((c) => c.chosen) && question.unmatched.length === 0 && (
      <Text fontSize='xs' color='texts.subtle' mt={3}>
        No choice was recorded for this question.
      </Text>
    )}
  </Box>
)
