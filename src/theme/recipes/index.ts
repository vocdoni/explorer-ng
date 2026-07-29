import type { RecipeDefinition, SlotRecipeDefinition } from '@chakra-ui/react'
import { badge } from './badge'
import { button } from './button'
import { card } from './card'
import { input, textarea } from './form'
import { list } from './list'
import { menu } from './menu'
import { progress } from './progress'
import { table } from './table'
import { tabs } from './tabs'
import { tag } from './tag'
import { heading, link, text } from './typography'

export const recipes: Record<string, RecipeDefinition> = {
  badge,
  button,
  heading,
  input,
  link,
  text,
  textarea,
}

export const slotRecipes: Record<string, SlotRecipeDefinition> = {
  card,
  list,
  menu,
  progress,
  table,
  tabs,
  tag,
}
