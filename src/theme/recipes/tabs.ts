import { defineSlotRecipe } from '@chakra-ui/react'
import { tabsAnatomy } from '@chakra-ui/react/anatomy'

// Segmented-control tabs: muted track, raised active pill. This is the *default*
// variant in vocdoni-app, so every Tabs.Root picks it up without opting in.
const settings = {
  root: {
    '--tabs-height': 'auto',
    // A flex or grid item's default `min-width: auto` would let the trigger row set
    // the parent's width, widening the page past the viewport on phones.
    minW: 0,
  },
  list: {
    p: 1,
    bgColor: 'tabs.bg',
    borderRadius: 'sm',
    w: 'fit-content',
    maxWidth: 'full',
    // Wrap rather than scroll on narrow screens: a scrolled strip hides the selected
    // tab when it arrives via `?tab=`, and shows a scrollbar inside the pill where
    // scrollbars are always visible.
    flexWrap: 'wrap',
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
