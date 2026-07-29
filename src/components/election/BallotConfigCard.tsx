import { HStack, List, Text } from '@chakra-ui/react'
import { LuCircleDot } from 'react-icons/lu'
import { PageSection } from '~components/shared/PageSection'
import { Tooltip } from '~components/ui/Tooltip'
import type { Election } from '~types/api'

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

/**
 * Turn `tallyMode` / `voteMode` / `electionMode` into plain English.
 *
 * These flags are the difference between "an election" and "a pile of
 * transactions", and today they are only visible as a raw JSON dump in the
 * technical tab.
 */
const describeBallot = (election?: Election, choiceCount?: number): Sentence[] => {
  if (!election) return []
  const tally = election.tallyMode
  const vote = election.voteMode
  const mode = election.electionMode

  const sentences: Sentence[] = []

  const maxCount = num(tally, 'maxCount')
  const maxValue = num(tally, 'maxValue')
  if (maxCount !== undefined) {
    const options = choiceCount ? ` from ${choiceCount}` : ''
    sentences.push({
      text:
        maxCount === 1
          ? `Voters chose a single option${options}.`
          : `Voters chose up to ${maxCount} options${options}.`,
      fields: `tallyMode.maxCount = ${maxCount}${maxValue !== undefined ? `, maxValue = ${maxValue}` : ''}`,
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

  const costExponent = num(tally, 'costExponent')
  const maxTotalCost = num(tally, 'maxTotalCost')
  if (costExponent !== undefined && costExponent > 1) {
    sentences.push({
      text: `Ballots were priced with a cost exponent of ${costExponent}${
        maxTotalCost ? ` and a credit budget of ${maxTotalCost}` : ''
      }, so spreading support across options cost less than concentrating it.`,
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
export const BallotConfigCard = ({ election, choiceCount }: { election?: Election; choiceCount?: number }) => {
  const sentences = describeBallot(election, choiceCount)
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
