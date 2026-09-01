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
 * Chakra's built-in `*.fg` semantic tokens adapt to the color mode, unlike the
 * raw `green.500`-style values the legacy component used. This is syntax
 * color, not state, so it intentionally sits outside the monochrome
 * `colorPalette` rule.
 */
const tokenColor = (part: string): string | undefined => {
  if (part.startsWith('"')) return part.endsWith(':') ? 'fg.muted' : 'green.fg'
  if (part === 'true' || part === 'false') return 'blue.fg'
  if (part === 'null') return 'purple.fg'
  if (/^-?\d/.test(part)) return 'red.fg'
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
          <IconButton size='2xs' variant='ghost' aria-label='Copy JSON'>
            <Clipboard.Indicator />
          </IconButton>
        </Clipboard.Trigger>
      </Clipboard.Root>
      <Box
        as='pre'
        p={3}
        pr={10}
        bg='bg.muted'
        color='fg'
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
            <Box as='span' key={index} color={color}>
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
