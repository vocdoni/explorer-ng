import { Box, Flex, Skeleton, Stack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { EmptyState } from '~components/shared/EmptyState'
import { PageSection } from '~components/shared/PageSection'
import type { Breakdown } from '~hooks/useChainStats'

interface Props {
  title: string
  subtitle?: string
  breakdown: Breakdown
  /** Word for what the centre number counts, e.g. "transactions". */
  unit: string
  right?: ReactNode
}

const percent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0)

/**
 * Donut plus legend, for a categorical split of a chain-wide total.
 *
 * The centre carries the total so the chart answers "how many, and of what mix"
 * in one look, and the legend repeats every exact count — the ring communicates
 * proportion, the numbers carry the precision. No axes, gridlines or tooltips:
 * with at most six slices there is nothing a hover would reveal that the legend
 * does not already state.
 */
export const BreakdownDonut = ({ title, subtitle, breakdown, unit, right }: Props) => {
  const { slices, total, isLoading } = breakdown

  return (
    <PageSection title={title} subtitle={subtitle} right={right} h='100%'>
      {isLoading && slices.length === 0 ? (
        <Skeleton h='180px' borderRadius='md' />
      ) : slices.length === 0 ? (
        <EmptyState title='Nothing to break down yet' py={6} />
      ) : (
        <Flex gap={5} align='center' direction={{ base: 'column', sm: 'row' }}>
          <Box position='relative' w='168px' h='168px' flexShrink={0}>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey='value'
                  nameKey='label'
                  innerRadius={54}
                  outerRadius={80}
                  paddingAngle={1.5}
                  stroke='none'
                  isAnimationActive={false}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.key} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <Flex
              position='absolute'
              inset={0}
              direction='column'
              align='center'
              justify='center'
              pointerEvents='none'
              textAlign='center'
            >
              <Text fontSize='xl' fontWeight='bold' lineHeight={1.1}>
                {total.toLocaleString()}
              </Text>
              <Text fontSize='xs' color='texts.subtle'>
                {unit}
              </Text>
            </Flex>
          </Box>

          <Stack gap={2} flex='1' minW={0} w='100%'>
            {slices.map((slice) => (
              <Flex key={slice.key} align='center' gap={2.5} minW={0}>
                <Box w='8px' h='8px' borderRadius='full' bg={slice.color} flexShrink={0} />
                <Text fontSize='sm' truncate flex='1' minW={0}>
                  {slice.label}
                </Text>
                <Text fontSize='sm' fontWeight='bold' whiteSpace='nowrap'>
                  {slice.value.toLocaleString()}
                </Text>
                <Text fontSize='xs' color='texts.subtle' w='44px' textAlign='end' whiteSpace='nowrap'>
                  {percent(slice.value, total)}%
                </Text>
              </Flex>
            ))}
          </Stack>
        </Flex>
      )}
    </PageSection>
  )
}
