import { Box, Flex, Skeleton, Text } from '@chakra-ui/react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '~components/shared/EmptyState'
import { PageSection } from '~components/shared/PageSection'
import type { BlockActivity } from '~hooks/useChainStats'
import { parseApiDate } from '~utils/format'

interface Props {
  activity: BlockActivity
  right?: React.ReactNode
}

const AXIS = '#a1a1aa'
const LINE = '#3b82f6'
const BAR = '#a1a1aa'

interface ChartPoint {
  height: number
  label: string
  blockTimeSecs: number
  txCount: number
}

interface TooltipPayload {
  active?: boolean
  payload?: Array<{ payload: ChartPoint }>
}

const BlockTimeTooltip = ({ active, payload }: TooltipPayload) => {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <Box bg='bg.panel' border='1px solid' borderColor='border' borderRadius='sm' px={3} py={2} fontSize='xs'>
      <Text fontWeight='bold'>Block {point.height.toLocaleString()}</Text>
      <Text color='texts.subtle'>{point.blockTimeSecs.toFixed(1)}s block time</Text>
      <Text color='texts.subtle'>
        {point.txCount} {point.txCount === 1 ? 'transaction' : 'transactions'}
      </Text>
    </Box>
  )
}

/**
 * Per-block time (line, left axis) alongside transaction count (bars, right
 * axis) over the most recent stretch of chain. Block time is derived
 * client-side as the gap between consecutive blocks' timestamps — the API has
 * no such series directly. The oldest block in the window has no predecessor
 * to measure a gap against, so it is dropped rather than shown as a false zero.
 */
export const BlockTimeChart = ({ activity, right }: Props) => {
  const { points, isLoading } = activity
  const chartPoints: ChartPoint[] = points
    .filter((p) => p.blockTimeSecs !== undefined)
    .map((p) => ({
      height: p.height,
      label: parseApiDate(p.time)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? '',
      blockTimeSecs: p.blockTimeSecs ?? 0,
      txCount: p.txCount,
    }))
  const span = chartPoints.length
  const windowMinutes = span > 0 ? Math.max(1, Math.round((span * 10) / 60)) : 0

  return (
    <PageSection
      title='Block time & transactions'
      subtitle={
        span > 0
          ? `Seconds between each of the last ${span} blocks, with how many transactions each carried — about ${windowMinutes} minutes of chain at ~10s blocks.`
          : 'Time between blocks and transactions per block.'
      }
      right={right}
    >
      {isLoading && span === 0 ? (
        <Skeleton h='220px' borderRadius='md' />
      ) : span === 0 ? (
        <EmptyState title='Not enough blocks to chart yet' py={6} />
      ) : (
        <>
          <Flex gap={4} mb={2} fontSize='xs' color='texts.subtle'>
            <Flex align='center' gap={1.5}>
              <Box w={3} h='2px' bg={LINE} />
              <Text>Block time (s, left)</Text>
            </Flex>
            <Flex align='center' gap={1.5}>
              <Box w={2.5} h={2.5} bg={BAR} opacity={0.6} borderRadius='2px' />
              <Text>Transactions (right)</Text>
            </Flex>
          </Flex>
          <Box h='220px' w='100%'>
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart data={chartPoints} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={AXIS} strokeOpacity={0.18} vertical={false} />
              <XAxis dataKey='label' tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis
                yAxisId='time'
                allowDecimals={false}
                width={36}
                tick={{ fontSize: 10, fill: AXIS }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId='txs'
                orientation='right'
                allowDecimals={false}
                width={32}
                tick={{ fontSize: 10, fill: AXIS }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<BlockTimeTooltip />} cursor={{ fill: AXIS, fillOpacity: 0.08 }} />
              <Bar yAxisId='txs' dataKey='txCount' fill={BAR} fillOpacity={0.5} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Line
                yAxisId='time'
                type='monotone'
                dataKey='blockTimeSecs'
                stroke={LINE}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </Box>
        </>
      )}
    </PageSection>
  )
}
