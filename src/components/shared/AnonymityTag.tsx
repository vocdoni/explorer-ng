import { Tag } from '@chakra-ui/react'
import { LuVenetianMask } from 'react-icons/lu'
import { Tooltip } from '~components/ui/Tooltip'
import type { Election } from '~types/api'
import { resolveAnonymity } from '~utils/anonymity'

interface Props extends Omit<Tag.RootProps, 'children'> {
  election?: Election
}

/**
 * "Anonymous · <technology>", or nothing at all.
 *
 * Rendered only when a mechanism is actually in force: an absent badge has to
 * mean "not anonymous", so it must never stand for "still loading" or "this
 * gateway did not say".
 */
export const AnonymityTag = ({ election, ...rest }: Props) => {
  const reading = resolveAnonymity(election)
  if (!reading.badge) return null

  return (
    <Tooltip content={reading.description}>
      <Tag.Root colorPalette='blue' cursor='help' fontSize='sm' fontWeight='medium' {...rest}>
        <Tag.StartElement>
          <LuVenetianMask />
        </Tag.StartElement>
        <Tag.Label>{reading.badge}</Tag.Label>
      </Tag.Root>
    </Tooltip>
  )
}
