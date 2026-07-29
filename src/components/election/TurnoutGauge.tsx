import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { LuInfo } from 'react-icons/lu'
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import { PageSection } from '~components/shared/PageSection'
import { Tooltip } from '~components/ui/Tooltip'

interface Props {
  votes: number
  /** `census.maxCensusSize` — the provisioned ceiling, not an electorate. */
  capacity?: number
  censusOrigin?: string
}

const FILL = '#16a34a'

/**
 * Votes cast against the election's provisioned capacity.
 *
 * Deliberately not called "turnout": `maxCensusSize` is the ceiling the
 * organizer paid for, and for CSP / off-chain censuses the number of eligible
 * voters is not on chain at all. Inventing a denominator here would be the
 * single easiest way for this explorer to publish a wrong number.
 */
export const TurnoutGauge = ({ votes, capacity, censusOrigin }: Props) => {
  const pct = capacity ? Math.min(100, (votes / Math.max(1, capacity)) * 100) : 0
  const offChain = !!censusOrigin && /CA|CSP|OFF_CHAIN/i.test(censusOrigin)

  return (
    <PageSection
      title='Participation vs. capacity'
      right={
        <Tooltip
          content={
            offChain
              ? 'This election uses an off-chain census, so the number of eligible voters is not published on chain. Only the provisioned capacity is.'
              : 'Capacity is the maximum census size the election was provisioned for, not a count of eligible voters.'
          }
        >
          <Box color='texts.subtle' aria-label='How this number is computed'>
            <LuInfo />
          </Box>
        </Tooltip>
      }
    >
      <HStack gap={6} align='center' flexWrap='wrap'>
        <Box w='170px' h='170px' position='relative'>
          <ResponsiveContainer width='100%' height='100%'>
            <RadialBarChart
              innerRadius='72%'
              outerRadius='100%'
              barSize={14}
              startAngle={90}
              endAngle={-270}
              data={[{ name: 'participation', value: capacity ? pct : 0, fill: FILL }]}
            >
              <PolarAngleAxis type='number' domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background dataKey='value' cornerRadius={8} isAnimationActive={false} />
            </RadialBarChart>
          </ResponsiveContainer>
          <VStack
            position='absolute'
            inset={0}
            justify='center'
            gap={0}
            pointerEvents='none'
            aria-hidden='true'
          >
            <Text fontSize='2xl' fontWeight='bold'>
              {capacity ? `${pct.toFixed(1)}%` : '—'}
            </Text>
            <Text fontSize='xs' color='texts.subtle'>
              of capacity
            </Text>
          </VStack>
        </Box>

        <VStack align='flex-start' gap={1} flex='1' minW='220px'>
          <Text fontSize='lg'>
            <strong>{votes.toLocaleString()}</strong> votes cast
            {capacity ? (
              <>
                {' '}
                of <strong>{capacity.toLocaleString()}</strong> provisioned capacity
              </>
            ) : null}
          </Text>
          <Text fontSize='sm' color='texts.subtle'>
            Capacity is the maximum census size this election was provisioned for. It is not necessarily the number of
            eligible voters, so this is not a turnout figure.
          </Text>
          {!capacity && (
            <Text fontSize='sm' color='texts.subtle'>
              This election does not publish a capacity, so no ratio can be shown.
            </Text>
          )}
        </VStack>
      </HStack>
    </PageSection>
  )
}
