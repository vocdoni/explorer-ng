import { Clipboard, HStack, IconButton, Link, Text, type TextProps } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { shortHex } from '~utils/format'

interface Props extends Omit<TextProps, 'title' | 'children'> {
  /** The complete identifier. Truncation happens inside, so the copy button and
   *  hover title always carry the full value. */
  value?: string
  copyLabel?: string
  withCopy?: boolean
  /** Leading / trailing characters to keep when abbreviating. */
  left?: number
  right?: number
  /** Render the identifier in full (detail headers, single-value rows). */
  full?: boolean
  /** Router path to link the value to. */
  to?: string
}

export const HashDisplay = ({
  value,
  copyLabel = 'Value',
  withCopy = true,
  left = 8,
  right = 6,
  full = false,
  to,
  ...rest
}: Props) => {
  const label = full ? value || '—' : shortHex(value, left, right)

  const text = (
    <Text
      as='span'
      fontFamily='mono'
      fontSize='xs'
      title={value}
      wordBreak={full ? 'break-all' : 'normal'}
      whiteSpace={full ? 'normal' : 'nowrap'}
      display='inline'
      {...rest}
    >
      {label}
    </Text>
  )

  return (
    <HStack gap={1} align='center' display='inline-flex'>
      {to ? (
        <Link asChild variant='plain'>
          <RouterLink to={to}>{text}</RouterLink>
        </Link>
      ) : (
        text
      )}
      {withCopy && value && (
        <Clipboard.Root value={value}>
          <Clipboard.Trigger asChild>
            <IconButton size='2xs' variant='ghost' aria-label={`Copy ${copyLabel.toLowerCase()}`}>
              <Clipboard.Indicator />
            </IconButton>
          </Clipboard.Trigger>
        </Clipboard.Root>
      )}
    </HStack>
  )
}
