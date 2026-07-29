import { defineSlotRecipe } from '@chakra-ui/react'
import { tabsAnatomy } from '@chakra-ui/react/anatomy'

// Segmented-control tabs: muted track, raised active pill. This is the *default*
// variant in vocdoni-app, so every Tabs.Root picks it up without opting in.
const settings = {
  root: {
    '--tabs-height': 'auto',
  },
  list: {
    p: 1,
    bgColor: 'tabs.bg',
    borderRadius: 'sm',
    w: 'fit-content',
    maxWidth: 'full',
    overflowX: 'auto',
  },
  trigger: {
    py: 1.5,
    px: 3,
    whiteSpace: 'nowrap',
    borderRadius: 'sm',
    fontWeight: 'medium',
    color: 'tabs.tab.color',
    fontSize: 'sm',
    _selected: {
      bgColor: 'tabs.tab.active.bg',
      color: 'tabs.tab.active.color',
      boxShadow: 'xs',
    },
  },
  content: {
    borderRadius: 'md',
    p: 6,
  },
}

export const tabs = defineSlotRecipe({
  slots: tabsAnatomy.keys(),
  variants: {
    variant: { settings },
  },
  defaultVariants: { variant: 'settings' },
})
