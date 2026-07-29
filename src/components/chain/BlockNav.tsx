import { Button, HStack } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

interface Props {
  height: number
  /** Lowest height still available on this node — older blocks were pruned
   *  and are not fetchable, so prev must stop here rather than at 1. */
  minHeight?: number
  /** Current chain tip; next must stop here, a not-yet-produced block. */
  maxHeight?: number
}

/**
 * Sequential prev/next browsing for the block detail page, mirroring the
 * official explorer's `HeightNavigator`. Disabled at the node's pruned
 * history floor (`blockStoreBase` from `/chain/info`) and at the live tip, so
 * a click never lands on a 404.
 */
export const BlockNav = ({ height, minHeight, maxHeight }: Props) => {
  const canPrev = height > (minHeight ?? 1)
  const canNext = maxHeight === undefined || height < maxHeight

  return (
    <HStack gap={2}>
      <Button asChild size='sm' variant='outline' disabled={!canPrev}>
        <RouterLink to={canPrev ? `/blocks/${height - 1}` : '#'} aria-disabled={!canPrev}>
          <LuChevronLeft /> Previous block
        </RouterLink>
      </Button>
      <Button asChild size='sm' variant='outline' disabled={!canNext}>
        <RouterLink to={canNext ? `/blocks/${height + 1}` : '#'} aria-disabled={!canNext}>
          Next block <LuChevronRight />
        </RouterLink>
      </Button>
    </HStack>
  )
}
