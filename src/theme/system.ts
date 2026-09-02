import { createSystem, defaultConfig } from '@chakra-ui/react'
import { recipes, slotRecipes } from './recipes'
import semanticTokens from './semantic'
import tokens from './tokens'

/**
 * Pinning the html `colorPalette` to gray is what keeps the whole app on the
 * warm ink/cream neutrals: buttons, tags, tabs and inputs stay tone-on-tone
 * unless a component explicitly opts into a palette for a *state* signal.
 * (The gray ramp itself is re-tinted warm in `colors.ts`, per DESIGN.md.)
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
