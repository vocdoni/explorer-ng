import { HStack, List, Text } from '@chakra-ui/react'
import { LuCircleDot } from 'react-icons/lu'
import { PageSection } from '~components/shared/PageSection'
import { Tooltip } from '~components/ui/Tooltip'
import type { Election } from '~types/api'
import type { ElectionResultsView } from '~utils/ballotResults'

interface Sentence {
  text: string
  /** Raw protocol fields this sentence was derived from. */
  fields: string
}

const num = (source: Record<string, unknown> | undefined, key: string): number | undefined => {
  const value = source?.[key]
  return typeof value === 'number' ? value : undefined
}

const bool = (source: Record<string, unknown> | undefined, key: string): boolean | undefined => {
  const value = source?.[key]
  return typeof value === 'boolean' ? value : undefined
}

/** Creator-written ballot options (`maxBudget`, `numChoices`, `forceFullBudget`, …). */
const properties = (election?: Election): Record<string, unknown> | undefined => election?.metadata?.type?.properties

/**
 * Turn `tallyMode` / `voteMode` / `electionMode` into plain English.
 *
 * These flags are the difference between "an election" and "a pile of
 * transactions", and today they are only visible as a raw JSON dump in the
 * technical tab.
 */
const describeBallot = (election?: Election, results?: ElectionResultsView): Sentence[] => {
  if (!election) return []
  const tally = election.tallyMode
  const vote = election.voteMode
  const mode = election.electionMode

  const sentences: Sentence[] = []

  const maxCount = num(tally, 'maxCount')
  const maxValue = num(tally, 'maxValue')
  const choiceCount = results?.questions[0]?.choices.length
  /** "… up to 2 of the 5 options" — a partitive tail, only valid after a quantity. */
  const ofOptions = choiceCount ? ` of the ${choiceCount} options` : ' of the options'
  /** "… across the 5 options" — a plain noun phrase, for sentences taking an object. */
  const theOptions = choiceCount ? `the ${choiceCount} options` : 'the options'
  const kindFields = results ? `${results.provenance}` : `tallyMode.maxCount = ${maxCount ?? '?'}`

  // A raw view means the ballot layout could not be established. Falling through to a
  // kind-specific sentence there would contradict the "uninterpreted" tally above it,
  // so only the field-level description is honest.
  const view = results && !results.raw ? results : undefined
  const kind = view?.kind

  // `maxCount` is the number of ballot *fields*, which only doubles as a pick limit for
  // multichoice. For budget, quadratic and approval it equals the option count, so the
  // old "voters chose up to N options from N" reading was simply wrong.
  if (view) {
    switch (view.kind) {
      case 'single-choice':
        sentences.push({
          text:
            view.questions.length > 1
              ? `Voters chose a single option per question, across ${view.questions.length} questions.`
              : `Voters chose a single option${choiceCount ? ` from ${choiceCount}` : ''}.`,
          fields: kindFields,
        })
        break
      case 'approval':
        sentences.push({
          text: `Voters approved or rejected each${choiceCount ? ofOptions : ' option'} independently.`,
          fields: kindFields,
        })
        break
      case 'multichoice': {
        const { minPicks, maxPicks } = view
        sentences.push({
          text:
            minPicks !== undefined && maxPicks !== undefined && minPicks !== maxPicks
              ? `Voters chose between ${minPicks} and ${maxPicks}${ofOptions}.`
              : `Voters chose up to ${maxPicks ?? maxCount}${ofOptions}.`,
          fields: kindFields,
        })
        break
      }
      case 'budget':
      case 'quadratic':
        sentences.push({
          text: view.budgetFromWeight
            ? `Voters distributed a credit budget equal to their census weight across ${theOptions}.`
            : `Voters distributed ${view.budget ? `${view.budget.toLocaleString()} credits` : 'a credit budget'} across ${theOptions}.`,
          fields: kindFields,
        })
        break
    }
  } else if (maxCount !== undefined) {
    sentences.push({
      text: `Each ballot carried ${maxCount} value${maxCount === 1 ? '' : 's'}${
        maxValue ? `, each between 0 and ${maxValue}` : ''
      }.`,
      fields: `tallyMode.maxCount = ${maxCount}${maxValue !== undefined ? `, maxValue = ${maxValue}` : ''}`,
    })
  }

  if (kind === 'multichoice' && bool(vote, 'uniqueValues')) {
    sentences.push({
      text: 'Voters could not name the same option twice.',
      fields: 'voteMode.uniqueValues = true',
    })
  }

  if ((kind === 'budget' || kind === 'quadratic') && bool(properties(election), 'forceFullBudget')) {
    sentences.push({
      text: 'Voters had to spend their whole budget — a partly-spent ballot was not accepted.',
      fields: 'metadata.type.properties.forceFullBudget = true',
    })
  }

  const overwrites = num(tally, 'maxVoteOverwrites')
  if (overwrites !== undefined) {
    sentences.push({
      text:
        overwrites === 0
          ? 'Vote changes were not allowed — the first ballot cast was final.'
          : `Voters could change their vote up to ${overwrites} time${overwrites === 1 ? '' : 's'}; only the final ballot counted.`,
      fields: `tallyMode.maxVoteOverwrites = ${overwrites}`,
    })
  }

  // Only true of quadratic pricing: with a linear cost, spreading and concentrating
  // cost exactly the same, so the sentence would be misleading on a plain budget ballot.
  const costExponent = num(tally, 'costExponent')
  const maxTotalCost = num(tally, 'maxTotalCost')
  if (kind === 'quadratic' && costExponent !== undefined && costExponent > 1) {
    sentences.push({
      text: `Support was priced with a cost exponent of ${costExponent} — buying n units of support for one option cost n^${costExponent} credits — so spreading support across options cost less than concentrating it.`,
      fields: `tallyMode.costExponent = ${costExponent}, maxTotalCost = ${maxTotalCost ?? 0}`,
    })
  }

  const encrypted = bool(vote, 'encryptedVotes')
  if (encrypted !== undefined) {
    sentences.push({
      text: encrypted
        ? 'Ballots were encrypted and stayed unreadable until the keys were revealed for the count.'
        : 'Ballots were recorded in the clear — anyone can read an individual ballot from the chain.',
      fields: `voteMode.encryptedVotes = ${encrypted}`,
    })
  }

  const anonymous = bool(vote, 'anonymous')
  if (anonymous !== undefined) {
    sentences.push({
      text: anonymous
        ? 'Voters proved eligibility anonymously with a zero-knowledge proof, so ballots are not linked to an identity.'
        : 'Voters signed their ballots, so each vote is linked to the voter identifier that cast it.',
      fields: `voteMode.anonymous = ${anonymous}`,
    })
  }

  const weighted = bool(vote, 'costFromWeight')
  if (weighted) {
    sentences.push({
      text: 'Voting power came from each voter’s census weight, so ballots did not all count equally.',
      fields: 'voteMode.costFromWeight = true',
    })
  }

  const interruptible = bool(mode, 'interruptible')
  if (interruptible !== undefined) {
    sentences.push({
      text: interruptible
        ? 'The organizer could pause or end the election before its scheduled close.'
        : 'The organizer could not interrupt the election once it started; it ran to its scheduled close.',
      fields: `electionMode.interruptible = ${interruptible}`,
    })
  }

  const autoStart = bool(mode, 'autoStart')
  if (autoStart === false) {
    sentences.push({
      text: 'Voting did not open automatically — the organizer had to start it.',
      fields: 'electionMode.autoStart = false',
    })
  }

  const dynamicCensus = bool(mode, 'dynamicCensus')
  if (dynamicCensus) {
    sentences.push({
      text: 'The census could be modified while voting was open.',
      fields: 'electionMode.dynamicCensus = true',
    })
  }

  return sentences
}

/** Plain-English reading of how this ballot was configured. */
export const BallotConfigCard = ({
  election,
  results,
}: {
  election?: Election
  results?: ElectionResultsView
}) => {
  const sentences = describeBallot(election, results)
  if (sentences.length === 0) return null

  return (
    <PageSection title='How this ballot worked' subtitle='Derived from the election’s on-chain configuration'>
      <List.Root gap={2} variant='plain'>
        {sentences.map((sentence) => (
          <List.Item key={sentence.fields}>
            <Tooltip content={sentence.fields}>
              <HStack align='flex-start' gap={2} cursor='help'>
                <Text as='span' color='texts.subtle' mt='2px' flexShrink={0}>
                  <LuCircleDot size={12} />
                </Text>
                <Text fontSize='sm'>{sentence.text}</Text>
              </HStack>
            </Tooltip>
          </List.Item>
        ))}
      </List.Root>
    </PageSection>
  )
}
