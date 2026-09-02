import { defineRecipe, defineStyle } from '@chakra-ui/react'

const baseStyle = defineStyle({
  minW: 0,
  fontWeight: 'bold',
  borderRadius: 'sm',
  fontSize: 'sm',
  // The site-wide press-down micro-interaction (`.press-scale`). Scoped to
  // named properties — never `transition: all`.
  transition: 'transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
  _active: {
    transform: 'scale(0.96)',
  },
  _currentPage: {
    fontWeight: 'bold',
    backgroundColor: {
      _dark: 'colorPalette.800',
      _light: 'colorPalette.200',
    },
  },
  _selected: {
    fontWeight: 'bold',
  },
})

const listmenu = defineStyle({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontWeight: 'normal',
  borderRadius: 'sm',
  _active: {
    fontWeight: 'bold',
  },
  _hover: {
    bg: 'bg.muted',
  },
})

const unstyled = defineStyle({
  textAlign: 'left',
})

const link = defineStyle({
  textAlign: 'left',
  w: 'auto',
  h: 'auto',
  p: 0,
  verticalAlign: 'unset',
  _hover: {
    textDecoration: 'underline',
  },
})

const navbar = defineStyle({
  textAlign: 'left',
  fontWeight: 'normal',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'start',
  fontSize: 'sm',
  h: 'fit-content',
  px: 3,
  py: 1.5,
  borderRadius: 'sm',
  color: 'fg.muted',
  _hover: { bg: 'bg.muted', color: 'fg' },
  _currentPage: { bg: 'bg.muted', color: 'fg', fontWeight: 'bolder' },
})

// The signature CTA from vocdoni.io: solid buttons render as dark ink pills
// (`rounded-full font-semibold`). The ink fill itself comes from the warm
// gray ramp via the pinned `colorPalette`.
const solid = defineStyle({
  borderRadius: 'full',
})

export const button = defineRecipe({
  base: baseStyle,
  variants: {
    variant: {
      solid,
      unstyled,
      navbar,
      link,
      listmenu,
    },
  },
})
