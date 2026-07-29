import { defineSlotRecipe } from '@chakra-ui/react'
import { tagAnatomy } from '@chakra-ui/react/anatomy'

// Rounded rectangles (6px), never pills.
const baseStyle = {
  root: {
    width: 'fit-content',
    display: 'flex',
    justifyContent: 'center',
    borderRadius: 'sm',
    fontWeight: 'bold',
    py: 1,
    px: 3,
  },
}

export const tag = defineSlotRecipe({ slots: tagAnatomy.keys(), base: baseStyle })
