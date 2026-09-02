import { defineSlotRecipe } from '@chakra-ui/react'
import { menuAnatomy } from '@chakra-ui/react/anatomy'

// Dropdown panels follow the site's popover chrome: rounded panel, hairline
// border, layered shadow, cream surface; items get soft ink-tint hovers.
const baseStyle = {
  content: {
    p: 1,
    borderRadius: 'lg',
    boxShadow: 'lg',
    border: '1px solid',
    borderColor: 'border',
    bg: 'bg.panel',
  },
  item: {
    borderRadius: 'sm',
    bg: 'transparent',
    _selected: {
      bg: 'bg.muted',
      color: 'fg',
    },
    _focus: {
      bg: 'bg.muted',
      color: 'fg',
    },
  },
  separator: {
    m: 0,
  },
}

export const menu = defineSlotRecipe({ slots: menuAnatomy.keys(), base: baseStyle })
