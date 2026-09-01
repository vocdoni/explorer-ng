import type { ElectionResultsView, ResultsKind } from '~utils/ballotResults'

/**
 * The words each ballot type needs.
 *
 * Every kind renders the same bars and the same table; what separates a correct
 * results page from a misleading one is the vocabulary, the denominator, and whether
 * the shares are claimed to add up. Keeping those in one table follows the same
 * convention as `statusMeaning` and `txTypeMeaning`: extend the table, never add a
 * second mapping at a call site.
 */
export interface KindCopy {
  /** Badge shown beside the results heading. */
  label: string
  /** Table header for the tally column. */
  countColumn: string
  /** Table header for the share column. */
  shareColumn: string
  /** Badge on the leading option. */
  leaderBadge: string
  /** Whether the shares genuinely add up to 100% — decides the table footer. */
  sharesSumTo100: boolean
  /** The sentence under the tally explaining what a number here is. */
  footnote: string
}

const WEIGHTED_CAVEAT =
  'On a weighted census a counted unit is not the same thing as a voter.'

export const KIND_COPY: Record<ResultsKind, KindCopy> = {
  'single-choice': {
    label: 'Single choice',
    countColumn: 'Ballots',
    shareColumn: 'Share',
    leaderBadge: 'most voted',
    sharesSumTo100: true,
    footnote: `Each voter picked one option, so the shares add up to 100%. ${WEIGHTED_CAVEAT}`,
  },
  approval: {
    label: 'Approval',
    countColumn: 'Approvals',
    shareColumn: 'Share of ballots',
    leaderBadge: 'most approved',
    sharesSumTo100: false,
    footnote: `Each option was approved or rejected on its own, so the shares do not add up to 100%. ${WEIGHTED_CAVEAT}`,
  },
  multichoice: {
    label: 'Multiple choice',
    countColumn: 'Picks',
    shareColumn: 'Share of ballots',
    leaderBadge: 'most picked',
    sharesSumTo100: false,
    footnote: `Each voter picked several options, so the shares do not add up to 100%. ${WEIGHTED_CAVEAT}`,
  },
  budget: {
    label: 'Budget',
    countColumn: 'Credits',
    shareColumn: 'Share of credits',
    leaderBadge: 'most credits',
    sharesSumTo100: true,
    footnote:
      'These numbers are credits voters allocated, not voters. A large share means a large slice of the total budget spent, not that many people chose it.',
  },
  quadratic: {
    label: 'Quadratic',
    countColumn: 'Support',
    shareColumn: 'Share of support',
    leaderBadge: 'most support',
    sharesSumTo100: true,
    footnote:
      'These numbers are units of support, neither credits nor voters. Support was priced quadratically, so the credits a voter spent are not recoverable from the tally.',
  },
}

/**
 * The one sentence that tells a reader how to read the page. Written per kind because
 * the difference between "share of voters" and "share of credits" is exactly the
 * misreading this page exists to prevent.
 */
export const readingSentence = (results: ElectionResultsView): string => {
  const { kind, maxPicks, budget, budgetFromWeight, costExponent } = results

  switch (kind) {
    case 'single-choice':
      return 'Each voter picked one option per question. Shares are of the ballots counted for that question and add up to 100%.'
    case 'approval':
      return 'Each voter approved as many options as they wanted, and every option was counted on its own. Shares are of the ballots counted, so they do not add up to 100%.'
    case 'multichoice':
      return `Each voter picked ${maxPicks ? `up to ${maxPicks} options` : 'several options'}, and every option was counted on its own. Shares are of the ballots counted, so they do not add up to 100%.`
    case 'budget':
      return budgetFromWeight
        ? 'Each voter had a credit budget equal to their census weight and spread it across the options. The numbers below are credits allocated, not voters.'
        : `Each voter had ${budget ? `${budget.toLocaleString()} credits` : 'a credit budget'} to spread across the options. The numbers below are credits allocated, not voters.`
    case 'quadratic':
      return `Each voter spread ${budget ? `${budget.toLocaleString()} credits` : 'a credit budget'} across the options, and buying n units of support for one option cost n${costExponent && costExponent !== 2 ? `^${costExponent}` : '²'} credits. The numbers below are units of support — neither credits nor voters.`
  }
}

/**
 * Why the tally is not final yet. The three cases read very differently to a voter, so
 * they are not collapsed into one "provisional" line.
 */
export const provisionalSentence = (status: string | undefined, encrypted: boolean): string => {
  const state = (status ?? '').toLowerCase()
  if (encrypted) {
    return 'Ballots are encrypted. No meaningful tally exists until voting closes and the decryption keys are published.'
  }
  if (state.includes('ready') || state.includes('ongoing') || state.includes('pause')) {
    return 'Voting is still open. This is a running tally and it will change.'
  }
  return 'Voting has closed but the final tally has not been published yet. These numbers are provisional.'
}
