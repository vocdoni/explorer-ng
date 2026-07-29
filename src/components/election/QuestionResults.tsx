import { Badge, Box, HStack, Progress, Table, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { PageSection } from '~components/shared/PageSection'
import { SegmentedControl } from './SegmentedControl'

export interface QuestionResult {
  title: string
  values: number[]
  total: number
  choiceLabels: string[]
}

type View = 'chart' | 'table'

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
]

/**
 * One question's tally, as bars or as a table.
 *
 * `result[q][c]` is the aggregated weight per choice, which equals the voter
 * count only for an unweighted census — hence "of counted weight" in the
 * footnote rather than "of voters".
 */
export const QuestionResultsCard = ({ question, index }: { question: QuestionResult; index: number }) => {
  const [view, setView] = useState<View>('chart')
  const winner = question.total > 0 ? question.values.indexOf(Math.max(...question.values)) : -1
  const pctOf = (value: number) => (question.total > 0 ? (value / question.total) * 100 : 0)

  return (
    <PageSection
      title={question.title}
      subtitle={`Question ${index + 1} · ${question.total.toLocaleString()} counted`}
      right={
        <SegmentedControl aria-label='Results view' value={view} options={VIEW_OPTIONS} onChange={setView} />
      }
    >
      {view === 'chart' ? (
        <VStack align='stretch' gap={3}>
          {question.values.map((value, idx) => {
            const pct = pctOf(value)
            return (
              <Box key={idx}>
                <HStack justify='space-between' mb={1} fontSize='sm' gap={3}>
                  <HStack gap={2} minW={0}>
                    <Text truncate>{question.choiceLabels[idx]}</Text>
                    {idx === winner && question.total > 0 && (
                      <Badge colorPalette='green' flexShrink={0}>
                        most voted
                      </Badge>
                    )}
                  </HStack>
                  <Text color='texts.subtle' whiteSpace='nowrap'>
                    <strong>{pct.toFixed(1)}%</strong> · {value.toLocaleString()}
                  </Text>
                </HStack>
                <Progress.Root value={pct} colorPalette={idx === winner ? 'green' : 'blue'} size='lg'>
                  <Progress.Track borderRadius='full'>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Box>
            )
          })}
        </VStack>
      ) : (
        <Table.ScrollArea>
          <Table.Root size='sm' variant='outline'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Choice</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Count</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Share</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {question.values.map((value, idx) => (
                <Table.Row key={idx}>
                  <Table.Cell>
                    <HStack gap={2}>
                      <Text>{question.choiceLabels[idx]}</Text>
                      {idx === winner && question.total > 0 && <Badge colorPalette='green'>most voted</Badge>}
                    </HStack>
                  </Table.Cell>
                  <Table.Cell textAlign='end'>{value.toLocaleString()}</Table.Cell>
                  <Table.Cell textAlign='end'>{pctOf(value).toFixed(1)}%</Table.Cell>
                </Table.Row>
              ))}
              <Table.Row>
                <Table.Cell fontWeight='bold'>Total</Table.Cell>
                <Table.Cell textAlign='end' fontWeight='bold'>
                  {question.total.toLocaleString()}
                </Table.Cell>
                <Table.Cell textAlign='end' fontWeight='bold'>
                  100%
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      )}
      <Text mt={3} fontSize='xs' color='texts.subtle'>
        Percentages are shares of the weight counted for this question. On a weighted census a counted unit is not the
        same thing as a voter.
      </Text>
    </PageSection>
  )
}
