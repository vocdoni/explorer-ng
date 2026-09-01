import { Badge, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { PageSection } from '~components/shared/PageSection'
import { StatTile } from '~components/shared/StatTile'
import { Tooltip } from '~components/ui/Tooltip'
import type { Election } from '~types/api'
import type { ElectionResultsView } from '~utils/ballotResults'
import { KIND_COPY, provisionalSentence, readingSentence } from './resultsCopy'

/** One figure when every question agrees on it, a range when they do not. */
const span = (values: (number | undefined)[]): string | undefined => {
  const known = values.filter((value): value is number => value !== undefined)
  if (!known.length) return undefined
  const low = Math.min(...known)
  const high = Math.max(...known)
  return low === high ? low.toLocaleString() : `${low.toLocaleString()}–${high.toLocaleString()}`
}

/**
 * How to read the numbers below — the panel that stops the tally being misread.
 *
 * The same bar at 60% means "three fifths of voters" on a single-choice ballot and
 * "three fifths of the credits spent" on a budget one. Nothing in the chart itself
 * carries that difference, so it is stated here, once, above the results.
 */
export const ResultsSummary = ({
  results,
  election,
  encrypted,
}: {
  results: ElectionResultsView
  election?: Election
  encrypted: boolean
}) => {
  const copy = KIND_COPY[results.kind]
  const questionCount = results.questions.length
  // Only single-choice ever reaches this panel with more than one question, and its
  // questions can carry different option counts. Reading either tile off question 1
  // and labelling it as an election-wide fact is the kind of quiet mis-statement the
  // rest of this page exists to avoid, so a varying figure is shown as a range.
  const ballots = span(results.questions.map((question) => question.ballots))
  const options = span(results.questions.map((question) => question.choices.length))

  return (
    <PageSection
      title='How to read these results'
      right={
        <HStack gap={2}>
          <Tooltip
            content={`${results.source === 'metadata' ? 'Published by the election' : 'Inferred from the ballot configuration'}: ${results.provenance}`}
          >
            <Badge cursor='help'>{results.raw ? 'Uninterpreted' : copy.label}</Badge>
          </Tooltip>
          {results.provisional && <Badge colorPalette='orange'>Provisional</Badge>}
        </HStack>
      }
    >
      <Stack gap={4}>
        <Text fontSize='sm'>
          {results.raw
            ? 'This tally could not be interpreted: the election’s published configuration does not say how its ballots were laid out. The raw matrix below is exactly what the chain returned.'
            : readingSentence(results)}
        </Text>

        {!results.raw && (
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
            {questionCount > 1 && <StatTile label='Questions' value={questionCount.toLocaleString()} />}
            {ballots !== undefined && (
              <StatTile label='Ballots counted' value={ballots} help={questionCount > 1 ? 'Per question' : undefined} />
            )}
            {options !== undefined && (
              <StatTile label='Options' value={options} help={questionCount > 1 ? 'Per question' : undefined} />
            )}
            {results.kind === 'multichoice' && results.maxPicks !== undefined && (
              <StatTile
                label='Picks allowed'
                value={
                  results.minPicks !== undefined && results.minPicks !== results.maxPicks
                    ? `${results.minPicks}–${results.maxPicks}`
                    : String(results.maxPicks)
                }
              />
            )}
            {(results.kind === 'budget' || results.kind === 'quadratic') && (
              <StatTile
                label='Credits per voter'
                value={results.budgetFromWeight ? 'Census weight' : (results.budget?.toLocaleString() ?? 'Unknown')}
              />
            )}
          </SimpleGrid>
        )}

        {results.provisional && (
          <Text fontSize='sm' color='texts.subtle'>
            {provisionalSentence(election?.status, encrypted)}
          </Text>
        )}

        {!results.hasResults && (
          <Text fontSize='sm' color='texts.subtle'>
            Every option in this tally is zero — the chain published a count, but no ballot it could attribute reached
            it.
          </Text>
        )}

        {results.synthesizedLabels && (
          <Text fontSize='sm' color='texts.subtle'>
            This election did not publish its questions to the chain, so options are shown by position rather than by
            name.
          </Text>
        )}

        {results.unsatisfiable && (
          <Text fontSize='sm' color='orange.fg'>
            This election’s ballot configuration cannot be satisfied, so every vote cast would have been discarded
            during the count even though it was accepted by the chain. {results.unsatisfiable}.
          </Text>
        )}
      </Stack>
    </PageSection>
  )
}
