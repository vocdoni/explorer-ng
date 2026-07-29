import { Button, HStack } from '@chakra-ui/react'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  size?: 'xs' | 'sm'
  'aria-label': string
}

/**
 * Muted track with a raised active pill — the same segmented-control shape the
 * app uses for tabs, at a size that fits inside a card header.
 */
export const SegmentedControl = <T extends string>({
  value,
  options,
  onChange,
  size = 'xs',
  'aria-label': ariaLabel,
}: Props<T>) => (
  <HStack
    role='group'
    aria-label={ariaLabel}
    gap={1}
    p={1}
    borderRadius='md'
    bgColor='bg.muted'
    border='1px solid'
    borderColor='border'
  >
    {options.map((option) => {
      const selected = option.value === value
      return (
        <Button
          key={option.value}
          size={size}
          variant='plain'
          aria-pressed={selected}
          onClick={() => onChange(option.value)}
          px={3}
          borderRadius='sm'
          fontWeight='medium'
          bgColor={selected ? 'bg.panel' : 'transparent'}
          boxShadow={selected ? 'xs' : 'none'}
          color={selected ? 'fg' : 'texts.subtle'}
        >
          {option.label}
        </Button>
      )
    })}
  </HStack>
)
