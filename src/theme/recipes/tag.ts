import { defineSlotRecipe } from '@chakra-ui/react'
import { tagAnatomy } from '@chakra-ui/react/anatomy'

// Pills, per the vocdoni.io reference: tags and chips are rounded-full.
const baseStyle = {
  root: {
    width: 'fit-content',
    // Chakra's base caps the root at 100%, which lets table auto-layout
    // squeeze the status column and ellipsize short chips like "Voting open".
    // Status labels are short; let them size the column instead.
    maxWidth: 'max-content',
    display: 'flex',
    justifyContent: 'center',
    borderRadius: 'full',
    fontWeight: 'medium',
    py: 1,
    px: 3,
  },
  // Chakra's label slot allows wrapping and line-clamps to one line, which
  // ellipsizes chips inside auto-layout tables. Status labels never wrap.
  label: {
    whiteSpace: 'nowrap',
  },
}

export const tag = defineSlotRecipe({ slots: tagAnatomy.keys(), base: baseStyle })
