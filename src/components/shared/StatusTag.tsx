import { Tag } from '@chakra-ui/react'

type Palette = 'green' | 'yellow' | 'red' | 'orange' | 'blue' | 'gray'

interface StatusMeaning {
  label: string
  palette: Palette
}

/**
 * The single source of truth for turning a raw API status into plain English.
 *
 * Keys are matched as lowercase substrings so both the canonical enum values
 * ("READY", "RESULTS") and the looser variants the indexer emits
 * ("READY_FOR_VOTE", "process_results") land on the same tone. Hue follows the
 * product convention: green live, yellow paused/closed, red canceled, orange
 * pending.
 */
const RULES: Array<[string, StatusMeaning]> = [
  ['cancel', { label: 'Canceled', palette: 'red' }],
  ['fail', { label: 'Failed', palette: 'red' }],
  ['invalid', { label: 'Invalid', palette: 'red' }],
  ['result', { label: 'Results published', palette: 'green' }],
  ['ongoing', { label: 'Voting open', palette: 'green' }],
  ['ready', { label: 'Voting open', palette: 'green' }],
  ['upcoming', { label: 'Not started yet', palette: 'green' }],
  ['success', { label: 'Confirmed', palette: 'green' }],
  ['pause', { label: 'Voting paused', palette: 'yellow' }],
  ['ended', { label: 'Voting closed', palette: 'yellow' }],
  ['end', { label: 'Voting closed', palette: 'yellow' }],
  ['pending', { label: 'Pending', palette: 'orange' }],
  ['sync', { label: 'Syncing', palette: 'orange' }],
]

export const statusMeaning = (status?: string): StatusMeaning => {
  if (!status) return { label: 'Unknown', palette: 'gray' }
  const s = status.toLowerCase()
  const hit = RULES.find(([needle]) => s.includes(needle))
  return hit ? hit[1] : { label: status, palette: 'gray' }
}

interface Props extends Omit<Tag.RootProps, 'children'> {
  status?: string
  /** Override the resolved plain-English label (rare — prefer extending RULES). */
  label?: string
}

export const StatusTag = ({ status, label, ...rest }: Props) => {
  const meaning = statusMeaning(status)
  return (
    <Tag.Root colorPalette={meaning.palette} title={status} {...rest}>
      <Tag.Label>{label ?? meaning.label}</Tag.Label>
    </Tag.Root>
  )
}
