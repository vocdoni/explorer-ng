import { defineRecipe } from '@chakra-ui/react'

const baseStyle = {
  textStyle: 'md',
  _placeholder: {
    color: 'input.placeholder',
    textStyle: 'md',
  },
}

// iOS Safari auto-zooms focused inputs with a font-size below 16px; keep base at
// `md` (16px) on mobile and restore the compact `sm` (14px) look from `md` up.
const mobileSafeFontSize = {
  fontSize: { base: 'md', md: 'sm' },
  _placeholder: {
    fontSize: { base: 'md', md: 'sm' },
  },
}

const sm = { borderRadius: 'sm', ...mobileSafeFontSize }
const md = { borderRadius: 'sm', ...mobileSafeFontSize }

export const input = defineRecipe({
  base: baseStyle,
  variants: {
    size: { sm, md },
    variant: {
      borderless: {
        border: 'none',
        px: 0,
        bg: 'transparent',
      },
    },
  },
})

export const textarea = defineRecipe({
  base: {
    fontSize: 'md',
    _placeholder: {
      color: 'input.placeholder',
      fontSize: 'md',
    },
  },
  variants: {
    size: { sm: mobileSafeFontSize, md: mobileSafeFontSize },
  },
})
