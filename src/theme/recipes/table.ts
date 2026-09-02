import { defineSlotRecipe } from '@chakra-ui/react'
import { tableAnatomy } from '@chakra-ui/react/anatomy'

export const table = defineSlotRecipe({
  slots: tableAnatomy.keys(),
  base: {
    caption: {
      p: 4,
    },
  },
  // Chakra's md size pads cells 12px per side; at six columns that is enough
  // to push dense list tables (elections, with their untruncated status
  // chips) past the panel and into a horizontal scroll. 8px reads the same.
  variants: {
    size: {
      md: {
        cell: { px: 2 },
        columnHeader: { px: 2 },
      },
    },
  },
})
