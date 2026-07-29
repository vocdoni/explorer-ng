import { Text, type TextProps } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { Tooltip } from '~components/ui/Tooltip'
import { parseApiDate } from '~utils/format'

interface Props extends Omit<TextProps, 'title' | 'children'> {
  value?: string | number
  /** Show "3 hours ago" as the primary text, with the absolute date on hover. */
  mode?: 'relative' | 'absolute' | 'both'
}

/**
 * Renders an API timestamp so a non-technical reader can place it in time.
 * Accepts both RFC3339 strings and the bare unix *seconds* that `chain/info`
 * returns for `blockTimestamp`.
 */
export const RelativeTime = ({ value, mode = 'both', ...rest }: Props) => {
  const date = parseApiDate(value)
  if (!date) {
    return (
      <Text as='span' {...rest}>
        —
      </Text>
    )
  }

  const absolute = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  const relative = formatDistanceToNow(date, { addSuffix: true })

  const primary = mode === 'absolute' ? absolute : relative
  const secondary = mode === 'absolute' ? relative : absolute

  return (
    <Tooltip content={secondary} showArrow>
      <Text as='span' whiteSpace='nowrap' {...rest}>
        {primary}
        {mode === 'both' && (
          <Text as='span' color='texts.subtle' ml={2} fontSize='xs'>
            {absolute}
          </Text>
        )}
      </Text>
    </Tooltip>
  )
}
