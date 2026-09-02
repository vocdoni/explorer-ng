import { defineTokens } from '@chakra-ui/react'
import { colors } from './colors'

/**
 * Design tokens aligned with the vocdoni.io reference (DESIGN.md).
 *
 * Typography carries the identity: Hanken Grotesk for body/UI, the Fraunces
 * display serif for headings (single weight 400, never bolded — the heading
 * recipe enforces it), JetBrains Mono for hashes and code. `bold` maps to 600
 * (semibold) so emphasis reads as labels/buttons do on the site, not as heavy
 * display type.
 */
const fonts = defineTokens.fonts({
  body: { value: `"Hanken Grotesk Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` },
  heading: { value: `"Fraunces Variable", Georgia, 'Times New Roman', serif` },
  mono: { value: `"JetBrains Mono Variable", 'Menlo', monospace` },
})

const fontWeights = defineTokens.fontWeights({
  normal: { value: '400' },
  medium: { value: '500' },
  bold: { value: '600' },
  bolder: { value: '650' },
})

// The reference radius scale: 16px panels, 10/12px controls, pills for chips.
const radii = defineTokens.radii({
  none: { value: '0rem' },
  xxs: { value: '3px' },
  xs: { value: '6px' },
  sm: { value: '10px' },
  md: { value: '12px' },
  lg: { value: '16px' },
  xl: { value: '20px' },
  '2xl': { value: '24px' },
  '3xl': { value: '28px' },
  '4xl': { value: '32px' },
  full: { value: '9999px' },
})

const sizes = defineTokens.sizes({
  'max-window-width': { value: '2560px' },
  'max-content-width': { value: '1200px' },
  navbar: { value: '1920px' },
  contents: { value: '1600px' },
})

const zIndex = defineTokens.zIndex({
  background: { value: 0 },
  contents: { value: 1 },
  sidebar: { value: 2 },
  topbar: { value: 3 },
  modal: { value: 1400 },
  hovering: { value: 1500 },
  top: { value: 9999 },
})

const tokens = defineTokens({
  colors,
  radii,
  sizes,
  zIndex,
  fonts,
  fontWeights,
})

export default tokens
