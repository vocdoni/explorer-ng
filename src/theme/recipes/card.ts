import { defineSlotRecipe } from '@chakra-ui/react'
import { cardAnatomy } from '@chakra-ui/react/anatomy'

// The canonical "row as a card" used for list items on narrow screens:
// transparent fill, 1px hairline, 6px radius, 16px padding.
const dataListItem = {
  root: {
    w: 'full',
    bgColor: 'transparent',
    border: '1px solid',
    borderColor: 'border.dashboard',
    borderRadius: 'sm',
    p: 4,
    gap: 2,
  },
  header: {
    p: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 2,
  },
  body: {
    p: 0,
    gap: 1,
    fontSize: 'sm',
    color: 'texts.subtle',
  },
}

export const card = defineSlotRecipe({
  slots: cardAnatomy.keys(),
  variants: {
    variant: {
      'data-list-item': dataListItem,
      empty: { root: { bgColor: 'bg.panel' } },
    },
  },
})
