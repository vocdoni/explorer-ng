import { createSystem, defaultConfig } from '@chakra-ui/react'
import { recipes, slotRecipes } from './recipes'
import semanticTokens from './semantic'
import tokens from './tokens'

/**
 * Pinning the html `colorPalette` to gray is what keeps the whole app
 * monochrome: buttons, tags, tabs and inputs stay grayscale unless a component
 * explicitly opts into a palette for a *state* signal.
 */
export const system = createSystem(defaultConfig, {
  globalCss: {
    html: {
      colorPalette: 'gray',
    },
  },
  theme: {
    tokens,
    semanticTokens,
    recipes,
    slotRecipes,
  },
})
