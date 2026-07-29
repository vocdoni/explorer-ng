import { Button, Flex, Text } from '@chakra-ui/react'

interface Props {
  page: number
  totalPages?: number
  onChange: (page: number) => void
}

/**
 * "Page X of Y" plus prev/next. The total-results summary is deliberately
 * omitted — vocdoni-app hides it by CSS.
 */
export const PaginationControls = ({ page, totalPages, onChange }: Props) => {
  const canPrev = page > 0
  const canNext = totalPages === undefined || page + 1 < totalPages

  return (
    <Flex justify='flex-end' align='center' gap={3} mt={4} flexWrap='wrap'>
      <Text fontSize='sm' color='texts.subtle'>
        Page {page + 1}
        {typeof totalPages === 'number' ? ` of ${Math.max(1, totalPages)}` : ''}
      </Text>
      <Flex gap={2}>
        <Button size='xs' variant='outline' colorPalette='gray' onClick={() => onChange(page - 1)} disabled={!canPrev}>
          Previous
        </Button>
        <Button size='xs' variant='outline' colorPalette='gray' onClick={() => onChange(page + 1)} disabled={!canNext}>
          Next
        </Button>
      </Flex>
    </Flex>
  )
}
