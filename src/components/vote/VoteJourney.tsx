import { Box, Flex, Icon, Text } from '@chakra-ui/react'
import type { IconType } from 'react-icons'
import { LuBoxes, LuCheck, LuClock, LuScale, LuSend } from 'react-icons/lu'

type State = 'done' | 'waiting'

interface Step {
  icon: IconType
  title: string
  detail: string
  state: State
}

const Marker = ({ icon, state }: { icon: IconType; state: State }) => (
  <Flex
    boxSize={10}
    flexShrink={0}
    align='center'
    justify='center'
    borderRadius='full'
    borderWidth='1px'
    borderColor={state === 'done' ? 'green.500' : 'border'}
    bg={state === 'done' ? 'green.subtle' : 'bg.subtle'}
    color={state === 'done' ? 'green.600' : 'texts.subtle'}
    position='relative'
  >
    <Icon as={icon} boxSize={5} />
    {state === 'done' && (
      <Flex
        position='absolute'
        bottom='-2px'
        right='-2px'
        boxSize={4}
        align='center'
        justify='center'
        borderRadius='full'
        bg='green.600'
        color='white'
      >
        <Icon as={LuCheck} boxSize={2.5} />
      </Flex>
    )}
  </Flex>
)

interface Props {
  castDone: boolean
  blockHeight?: number
  counted: boolean
  electionEnded: boolean
}

/**
 * Three static steps, connected, so the receipt reads as a journey rather than
 * a set of unrelated facts. Deliberately not the verify page's evidence chain:
 * nothing here expands, because none of it is a claim that needs proving — the
 * proof lives one click away under "Verify this vote".
 */
export const VoteJourney = ({ castDone, blockHeight, counted, electionEnded }: Props) => {
  const steps: Step[] = [
    {
      icon: LuSend,
      title: 'Cast',
      detail: castDone ? 'Your ballot reached the network' : 'Waiting for the network',
      state: castDone ? 'done' : 'waiting',
    },
    {
      icon: LuBoxes,
      title: 'Sealed in a block',
      detail:
        blockHeight !== undefined
          ? `Block ${blockHeight.toLocaleString()} — permanent from here on`
          : 'Not yet in a block',
      state: blockHeight !== undefined ? 'done' : 'waiting',
    },
    {
      icon: counted ? LuScale : LuClock,
      title: 'Counted',
      detail: counted
        ? 'Included in the published election results'
        : electionEnded
          ? 'Results are still being computed'
          : 'Counted when the election ends',
      state: counted ? 'done' : 'waiting',
    },
  ]

  return (
    <Flex direction={{ base: 'column', md: 'row' }} align='stretch' gap={0}>
      {steps.map((step, index) => (
        <Flex
          key={step.title}
          flex='1'
          minW={0}
          gap={3}
          align={{ base: 'flex-start', md: 'center' }}
          direction={{ base: 'row', md: 'column' }}
          textAlign={{ base: 'left', md: 'center' }}
          position='relative'
          pb={{ base: index === steps.length - 1 ? 0 : 5, md: 0 }}
        >
          {/* Connector: down the gutter on mobile, across the markers on desktop */}
          {index < steps.length - 1 && (
            <>
              <Box
                display={{ base: 'block', md: 'none' }}
                position='absolute'
                left='19px'
                top={10}
                bottom={0}
                w='1px'
                bg='border'
              />
              <Box
                display={{ base: 'none', md: 'block' }}
                position='absolute'
                top='20px'
                left='calc(50% + 24px)'
                right='calc(-50% + 24px)'
                h='1px'
                bg='border'
              />
            </>
          )}
          <Marker icon={step.icon} state={step.state} />
          <Box minW={0} mt={{ md: 3 }}>
            <Text fontWeight='bold' fontSize='sm'>
              {step.title}
            </Text>
            <Text fontSize='xs' color='texts.subtle' mt={0.5}>
              {step.detail}
            </Text>
          </Box>
        </Flex>
      ))}
    </Flex>
  )
}
