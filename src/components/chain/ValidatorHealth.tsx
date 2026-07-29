import { HStack, Progress, Text } from '@chakra-ui/react'
import { Tooltip } from '~components/ui/Tooltip'

const scoreTone = (score: number) => (score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red')

/**
 * Compact health meter for a validator's 0-100 reliability score. The score
 * reflects the CometBFT-derived signing/proposing participation rate — a
 * validator that misses blocks it was scheduled to sign or propose drifts
 * down from 100, so this is the "is this node pulling its weight" signal for
 * a non-technical reader.
 */
export const ValidatorHealth = ({ score }: { score: number }) => (
  <Tooltip
    content={`Reliability score ${score}/100 — how consistently this validator has signed and proposed the blocks it was scheduled for. Lower scores mean missed or late participation.`}
    showArrow
  >
    <HStack gap={2} minW='110px'>
      <Progress.Root value={score} max={100} size='sm' colorPalette={scoreTone(score)} flex='1'>
        <Progress.Track borderRadius='full'>
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>
      <Text fontSize='xs' fontWeight='bold' minW='26px' textAlign='end'>
        {score}
      </Text>
    </HStack>
  </Tooltip>
)
