import { Badge, Box, HStack, Progress, Table, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { PageSection } from '~components/shared/PageSection'
import { Tooltip } from '~components/ui/Tooltip'
import type { ElectionResultsView, QuestionResultView } from '~utils/ballotResults'
import { KIND_COPY } from './resultsCopy'
import { SegmentedControl } from './SegmentedControl'

type View = 'chart' | 'table'

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
]

/** What the subtitle should say depends entirely on what a row of the tally counts. */
const subtitle = (question: QuestionResultView, results: ElectionResultsView, index: number, total: number): string => {
  const parts: string[] = []
  if (total > 1) parts.push(`Question ${index + 1} of ${total}`)

  switch (results.kind) {
    case 'single-choice':
      parts.push(`${question.total.toLocaleString()} ballots counted`)
      break
    case 'approval':
      if (question.ballots) parts.push(`${question.ballots.toLocaleString()} ballots counted`)
      parts.push(`${question.total.toLocaleString()} approvals`)
      break
    case 'multichoice':
      if (question.ballots) parts.push(`${question.ballots.toLocaleString()} ballots counted`)
      parts.push(`${question.total.toLocaleString()} picks`)
      if (results.maxPicks) parts.push(`up to ${results.maxPicks} per voter`)
      break
    case 'budget':
      parts.push(`${question.total.toLocaleString()} credits allocated`)
      break
    case 'quadratic':
      parts.push(`${question.total.toLocaleString()} units of support`)
      break
  }

  return parts.join(' · ')
}

const formatPercent = (percent: number | null) => (percent === null ? '—' : `${percent.toFixed(1)}%`)

/**
 * One question's tally, as bars or as a table.
 *
 * Every figure here is a share of something, and which something differs by ballot
 * type — see `KIND_COPY`. The leader badge is deliberately withheld while the tally is
 * provisional or tied: naming a winner from a running count is the exact way a results
 * page misleads without ever looking wrong.
 */
export const QuestionResultsCard = ({
  question,
  index,
  results,
  total,
}: {
  question: QuestionResultView
  index: number
  results: ElectionResultsView
  total: number
}) => {
  const [view, setView] = useState<View>('chart')
  const copy = KIND_COPY[results.kind]
  const showLeader = question.leader >= 0 && !results.provisional

  const rows = [
    ...question.choices,
    // Blank picks count empty slots, not votes for anything — no bar, no share.
    ...(question.blankPicks > 0
      ? [{ key: 'abstain' as const, label: 'Blank picks', value: question.blankPicks, percent: null }]
      : []),
  ]

  return (
    <PageSection
      title={question.title}
      subtitle={subtitle(question, results, index, total)}
      right={<SegmentedControl aria-label='Results view' value={view} options={VIEW_OPTIONS} onChange={setView} />}
    >
      {question.description && (
        <Text fontSize='sm' color='texts.subtle' mb={4}>
          {question.description}
        </Text>
      )}

      {view === 'chart' ? (
        <VStack align='stretch' gap={3}>
          {rows.map((row, idx) => (
            <Box key={row.key}>
              <HStack justify='space-between' mb={1} fontSize='sm' gap={3}>
                <HStack gap={2} minW={0}>
                  <Text truncate color={row.key === 'abstain' ? 'texts.subtle' : undefined}>
                    {row.label}
                  </Text>
                  {idx === question.leader && showLeader && (
                    <Badge colorPalette='green' flexShrink={0}>
                      {copy.leaderBadge}
                    </Badge>
                  )}
                </HStack>
                <Text color='texts.subtle' whiteSpace='nowrap'>
                  {row.percent !== null && <strong>{formatPercent(row.percent)}</strong>}
                  {row.percent !== null && ' · '}
                  {row.value.toLocaleString()}
                </Text>
              </HStack>
              {row.percent !== null && (
                // Clamped: with repeatable picks a single ballot can name one option
                // several times, so a share of ballots can legitimately exceed 100%.
                // The bar saturates; the figure beside it stays truthful.
                <Progress.Root value={Math.min(row.percent, 100)} size='lg'>
                  <Progress.Track borderRadius='full'>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              )}
            </Box>
          ))}
        </VStack>
      ) : (
        <Table.ScrollArea>
          <Table.Root size='sm' variant='outline'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Option</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>{copy.countColumn}</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>{copy.shareColumn}</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row, idx) => (
                <Table.Row key={row.key}>
                  <Table.Cell color={row.key === 'abstain' ? 'texts.subtle' : undefined}>
                    <HStack gap={2}>
                      <Text>{row.label}</Text>
                      {idx === question.leader && showLeader && <Badge colorPalette='green'>{copy.leaderBadge}</Badge>}
                    </HStack>
                  </Table.Cell>
                  <Table.Cell textAlign='end'>{row.value.toLocaleString()}</Table.Cell>
                  <Table.Cell textAlign='end'>{formatPercent(row.percent)}</Table.Cell>
                </Table.Row>
              ))}
              <Table.Row>
                {/* Only claim a 100% total where the shares genuinely partition the
                    whole. For approval and multichoice they do not, and the old
                    hardcoded "100%" footer was simply false. */}
                <Table.Cell fontWeight='bold'>{copy.sharesSumTo100 ? 'Total' : 'Ballots counted'}</Table.Cell>
                <Table.Cell textAlign='end' fontWeight='bold'>
                  {(copy.sharesSumTo100 ? question.total : (question.ballots ?? 0)).toLocaleString()}
                </Table.Cell>
                <Table.Cell textAlign='end' fontWeight='bold'>
                  {copy.sharesSumTo100 ? '100%' : '—'}
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      )}

      {question.blankPicks > 0 && (
        <Tooltip content='Pick slots voters left empty. Not a vote against any option.'>
          <Text mt={3} fontSize='xs' color='texts.subtle' cursor='help' w='fit-content'>
            {question.blankPicks.toLocaleString()} pick slot{question.blankPicks === 1 ? ' was' : 's were'} left empty.
          </Text>
        </Tooltip>
      )}

      {question.unattributed > 0 && (
        <Text mt={2} fontSize='xs' color='texts.subtle'>
          {question.unattributed.toLocaleString()} counted unit
          {question.unattributed === 1 ? '' : 's'} fell on a value none of the published options uses, so
          {question.unattributed === 1 ? ' it is' : ' they are'} in the total but cannot be attributed to an option.
        </Text>
      )}

      <Text mt={3} fontSize='xs' color='texts.subtle'>
        {copy.footnote}
      </Text>
    </PageSection>
  )
}
