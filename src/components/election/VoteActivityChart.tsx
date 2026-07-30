import { Alert, Badge, Box, Button, HStack, IconButton, Progress, Spinner, Text } from '@chakra-ui/react'
import { useMemo, useRef, useState } from 'react'
import { LuDownload } from 'react-icons/lu'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageSection } from '~components/shared/PageSection'
import { Tooltip } from '~components/ui/Tooltip'
import {
  buildActivityBuckets,
  buildServerActivityBuckets,
  defaultGranularity,
  type ElectionAnalytics,
  type Granularity,
} from '~hooks/useElectionAnalytics'
import { useVoteActivity } from '~hooks/useVoconeApi'
import { exportChartPng } from './chartExport'
import { SegmentedControl } from './SegmentedControl'

interface Props {
  electionId: string
  chainId?: string
  analytics: ElectionAnalytics
}

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
]

const BAR_COLOR = '#737373'
const LINE_COLOR = '#2563eb'

/**
 * Vote activity over the voting window: bars are votes per bin, the overlaid
 * line is the cumulative total on the right axis.
 *
 * The bin width is the reader's choice — an hour-by-hour view of a one-day
 * election and a day-by-day view of a three-month one are both legitimate
 * questions, and a fixed bucket count answered neither. Hours is the default
 * for windows up to two days.
 */
export const VoteActivityChart = ({ electionId, chainId, analytics }: Props) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const [override, setOverride] = useState<Granularity | undefined>()
  const [exportError, setExportError] = useState<string | undefined>()

  const fallback = defaultGranularity(analytics.start, analytics.end)
  const granularity = override ?? fallback
  const bucketParam = granularity === 'hours' ? 'hour' : 'day'

  // The server endpoint may 404 on an older gateway that predates the route,
  // or on any other request error — either way this falls back to the
  // client-side sampled timeline below, with no visual difference from before
  // this endpoint existed.
  const activity = useVoteActivity(electionId, bucketParam, { live: analytics.isLive })
  const serverAvailable = activity.isSuccess && !!activity.data

  const clientBuckets = useMemo(
    () => buildActivityBuckets(analytics.voteDates, analytics.start, analytics.end, granularity),
    [analytics.voteDates, analytics.start, analytics.end, granularity]
  )
  const serverBuckets = useMemo(
    () => buildServerActivityBuckets(activity.data, analytics.start, analytics.end, granularity),
    [activity.data, analytics.start, analytics.end, granularity]
  )
  const buckets = serverAvailable ? serverBuckets : clientBuckets

  const baseNoun = buckets.unit === 'hours' ? 'hour' : 'day'
  const unitNoun = buckets.stride > 1 ? `${buckets.stride} ${baseNoun}s` : baseNoun
  const peakBin = buckets.peakIndex >= 0 ? buckets.bins[buckets.peakIndex] : undefined
  const { loaded, total } = analytics.timelineProgress
  const progressPct = total > 0 ? Math.min(100, (loaded / total) * 100) : 0

  const handleExport = async () => {
    setExportError(undefined)
    const footer = [
      `Election ${electionId}`,
      chainId ? `Chain ${chainId}` : '',
      `Binned by ${unitNoun} · exported ${new Date().toLocaleString()}`,
    ].filter(Boolean)
    const ok = await exportChartPng(chartRef.current, {
      filename: `vote-activity-${electionId.slice(0, 12)}-${buckets.unit}`,
      title: 'Vote activity over time',
      footer,
    }).catch(() => false)
    if (!ok) setExportError('Could not render the chart as an image in this browser.')
  }

  return (
    <PageSection
      title='Vote activity over time'
      subtitle={`Votes per ${unitNoun} between opening and closing, with the running total`}
      right={
        <HStack gap={2}>
          <SegmentedControl
            aria-label='Chart granularity'
            value={granularity}
            options={GRANULARITY_OPTIONS}
            onChange={setOverride}
          />
          <Tooltip content='Download this chart as a PNG'>
            <IconButton
              aria-label='Download chart as PNG'
              size='sm'
              variant='outline'
              onClick={() => void handleExport()}
            >
              <LuDownload />
            </IconButton>
          </Tooltip>
        </HStack>
      }
    >
      {!serverAvailable && !analytics.timelineReady && (
        <HStack justify='space-between' mb={3} flexWrap='wrap' gap={3}>
          <Button size='sm' onClick={analytics.loadTimeline} disabled={analytics.isTimelineLoading}>
            {analytics.isTimelineLoading ? 'Loading vote activity…' : 'Show vote activity over time'}
          </Button>
          {analytics.isTimelineLoading && (
            <HStack gap={3} flex='1' minW='200px'>
              <Spinner size='sm' />
              <Progress.Root value={progressPct} colorPalette='blue' size='sm' flex='1'>
                <Progress.Track borderRadius='full'>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
              <Text fontSize='xs' color='texts.subtle' whiteSpace='nowrap'>
                {loaded.toLocaleString()} / {total.toLocaleString()} votes
              </Text>
            </HStack>
          )}
        </HStack>
      )}

      {!serverAvailable && analytics.timelineError && (
        <Alert.Root status='error' mb={3}>
          <Alert.Indicator />
          <Alert.Title>{analytics.timelineError}</Alert.Title>
        </Alert.Root>
      )}

      {exportError && (
        <Alert.Root status='warning' mb={3}>
          <Alert.Indicator />
          <Alert.Title>{exportError}</Alert.Title>
        </Alert.Root>
      )}

      {serverAvailable && (activity.data?.missingTimestamps ?? 0) > 0 && (
        <Alert.Root status='info' mb={3}>
          <Alert.Indicator />
          <Alert.Title>
            {activity.data?.missingTimestamps} votes lack a block timestamp on this gateway — counts may be
            incomplete.
          </Alert.Title>
        </Alert.Root>
      )}

      {!serverAvailable && !analytics.timelineError && analytics.datedVotes === 0 && analytics.totalVotes > 0 && (
        <Alert.Root status='info' mb={3}>
          <Alert.Indicator />
          <Alert.Title>
            The vote list does not carry timestamps — load the activity chart to plot when these{' '}
            {analytics.totalVotes} votes were cast.
          </Alert.Title>
        </Alert.Root>
      )}

      {!serverAvailable && buckets.downgraded && (
        <Alert.Root status='info' mb={3}>
          <Alert.Indicator />
          <Alert.Title>
            This election runs too long to chart hour by hour — showing days instead.
          </Alert.Title>
        </Alert.Root>
      )}

      <Box h='300px' w='100%' ref={chartRef}>
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart data={buckets.bins}>
            <CartesianGrid strokeDasharray='3 3' stroke='#e5e5e5' />
            <XAxis dataKey='label' tick={{ fontSize: 11, fill: BAR_COLOR }} minTickGap={16} />
            <YAxis yAxisId='rate' allowDecimals={false} tick={{ fontSize: 11, fill: BAR_COLOR }} />
            <YAxis
              yAxisId='cumulative'
              orientation='right'
              allowDecimals={false}
              tick={{ fontSize: 11, fill: LINE_COLOR }}
            />
            <RechartsTooltip
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullLabel ?? String(_label)}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {peakBin && (
              <ReferenceLine
                yAxisId='rate'
                x={peakBin.label}
                stroke='#16a34a'
                strokeDasharray='4 4'
                label={{ value: `peak ${peakBin.votes}`, position: 'top', fontSize: 11, fill: '#16a34a' }}
              />
            )}
            <Bar
              yAxisId='rate'
              dataKey='votes'
              name={`Votes per ${unitNoun}`}
              fill={BAR_COLOR}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId='cumulative'
              type='monotone'
              dataKey='cumulative'
              name='Cumulative votes'
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      <HStack mt={4} gap={3} flexWrap='wrap'>
        {peakBin && (
          <Badge colorPalette='green'>
            Busiest {baseNoun}: {peakBin.fullLabel} ({peakBin.votes})
          </Badge>
        )}
        {analytics.hasWindow && <Badge colorPalette='green'>Early votes {analytics.earlyVotes}</Badge>}
        {analytics.hasWindow && <Badge colorPalette='orange'>Late votes {analytics.lateVotes}</Badge>}
        {serverAvailable ? (
          <Badge colorPalette='green'>chart from server-aggregated activity ({activity.data?.totalVotes ?? 0})</Badge>
        ) : analytics.timelineReady ? (
          <Badge colorPalette='green'>timeline from all loaded votes ({analytics.sampleSize})</Badge>
        ) : (
          analytics.sampleSize > 0 &&
          analytics.sampleSize < analytics.totalVotes && (
            <Badge colorPalette='orange'>stats based on first {analytics.sampleSize} votes</Badge>
          )
        )}
      </HStack>
    </PageSection>
  )
}
