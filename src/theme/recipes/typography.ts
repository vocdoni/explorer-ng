import { defineRecipe } from '@chakra-ui/react'

/**
 * Headings are the Fraunces display serif at its single weight, 400 — never
 * bolded. SOFT maxed rounds the serifs into the warm editorial voice; WONK
 * stays off for legibility. This mirrors the vocdoni.io base layer.
 */
export const heading = defineRecipe({
  base: {
    fontFamily: 'heading',
    fontWeight: 'normal',
    fontVariationSettings: "'SOFT' 100, 'WONK' 0",
    letterSpacing: '-0.02em',
    textWrap: 'balance',
  },
})

export const link = defineRecipe({
  base: {
    color: 'primary',
    textDecoration: 'underline',
    textDecorationThickness: 'from-font',
    textUnderlineOffset: '0.15em',
    _hover: {
      color: 'primary.emphasized',
    },
  },
  variants: {
    variant: {
      // Chakra's default `plain`/`underline` variants repaint `colorPalette.fg`
      // over the base (variants apply after base), and `plain` fades the
      // underline to currentColor/20 on hover — restate the green here.
      plain: {
        color: 'primary',
        _hover: {
          color: 'primary.emphasized',
          textDecorationColor: 'currentColor',
          textUnderlineOffset: '0.15em',
        },
      },
      underline: {
        color: 'primary',
        _hover: {
          color: 'primary.emphasized',
        },
      },
      // A link dressed as its content (wordmark, card titles): no underline,
      // and no green — it inherits the surrounding ink.
      unstyled: {
        color: 'inherit',
        textDecoration: 'none',
        _hover: { color: 'inherit', textDecoration: 'none' },
      },
      icon: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 'sm',
        minW: '30px',
        h: '30px',
        border: '1px solid',
        cursor: 'pointer',
        textDecoration: 'none',
      },
      footer: {
        textDecoration: 'none',
        color: 'fg.muted',
        _hover: { textDecoration: 'underline' },
      },
      button: {
        textDecoration: 'none',
      },
    },
  },
})

// Line heights are unitless so text keeps proportional spacing even when a
// consumer overrides fontSize without changing the size variant.
const sizes = {
  xs: { fontSize: '12px', lineHeight: 1.5 },
  sm: { fontSize: '14px', lineHeight: 1.43 },
  md: { fontSize: '16px', lineHeight: 1.5 },
  lg: { fontSize: '18px', lineHeight: 1.56 },
  xl: { fontSize: '20px', lineHeight: 1.5 },
  '2xl': { fontSize: '24px', lineHeight: 1.3 },
}

export const text = defineRecipe({
  variants: {
    size: sizes,
    variant: {
      subheader: {
        color: 'texts.subtle',
        fontWeight: 'normal',
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
})
