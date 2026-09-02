import { Box, type BoxProps, Clipboard, IconButton } from '@chakra-ui/react'
import { Fragment } from 'react'

/**
 * Splits pretty-printed JSON into colorable tokens: quoted strings (optionally
 * followed by `:`, which marks them as keys), `true`/`false`/`null`, and
 * numbers. Ported from the legacy explorer's `Layout/JsonViewer`. Because the
 * regex has a single capture group, `split` returns unmatched punctuation and
 * matched tokens alternating — the unmatched parts never pass a color test, so
 * they render in the default foreground.
 */
const TOKEN_REGEX =
  /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g

/**
 * Code surfaces render in a dark "terminal window" regardless of the cream
 * page (the vocdoni.io code-block rule), so the syntax colors are fixed raw
 * palette values tuned for the dark ink surface — not mode-adaptive `*.fg`
 * tokens, which would go dark-on-dark in light mode. This is syntax color,
 * not state, so it intentionally sits outside the monochrome `colorPalette`
 * rule: emerald strings, amber numbers, blue booleans, purple null.
 */
const tokenColor = (part: string): string | undefined => {
  if (part.startsWith('"')) return part.endsWith(':') ? 'gray.300' : 'green.400'
  if (part === 'true' || part === 'false') return 'blue.300'
  if (part === 'null') return 'purple.300'
  if (/^-?\d/.test(part)) return 'orange.300'
  return undefined
}

interface Props extends BoxProps {
  json: unknown
  space?: number
}

/**
 * Syntax-highlighted JSON block, the single way raw payloads are printed.
 *
 * The copy button carries the exact `JSON.stringify` output — selecting the
 * highlighted spans by hand can pick up extra whitespace and line breaks, so
 * the button is the faithful way to copy the payload (the legacy explorer's
 * `RawContentBox` shipped the same affordance).
 */
export const JsonViewer = ({ json, space = 2, ...rest }: Props) => {
  const pretty = JSON.stringify(json, null, space) ?? ''
  return (
    <Box position='relative' {...rest}>
      <Clipboard.Root value={pretty} position='absolute' top={2} right={2}>
        <Clipboard.Trigger asChild>
          {/* Sits over the always-dark code surface, so it keeps light ink in
              both color modes instead of the adaptive ghost defaults. */}
          <IconButton
            size='2xs'
            variant='ghost'
            aria-label='Copy JSON'
            color='fg.code'
            _hover={{ bg: 'whiteAlpha.200', color: 'fg.code' }}
          >
            <Clipboard.Indicator />
          </IconButton>
        </Clipboard.Trigger>
      </Clipboard.Root>
      <Box
        as='pre'
        p={3}
        pr={10}
        bg='bg.code'
        color='fg.code'
        borderRadius='sm'
        border='1px solid'
        borderColor='border'
        overflowX='auto'
        fontSize='xs'
        fontFamily='mono'
        whiteSpace='pre-wrap'
        overflowWrap='anywhere'
      >
        {pretty.split(TOKEN_REGEX).map((part, index) => {
          const color = tokenColor(part)
          return color ? (
            <Box as='span' key={index} color={color} overflowWrap='anywhere'>
              {part}
            </Box>
          ) : (
            <Fragment key={index}>{part}</Fragment>
          )
        })}
      </Box>
    </Box>
  )
}
