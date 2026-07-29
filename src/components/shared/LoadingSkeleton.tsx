import { Box, Skeleton, Stack, Table } from '@chakra-ui/react'
import { CardGrid } from '~components/shared/CardGrid'

/**
 * Net-new to the explorer (vocdoni-app uses bare spinners), so it stays in
 * character: borderless, `bg.muted`, 6px radius, no shimmer accent.
 */
export const CardGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <CardGrid>
    {Array.from({ length: count }, (_, i) => (
      <Box key={i} border='1px solid' borderColor='border' borderRadius='sm' p={4}>
        <Stack gap={3}>
          <Skeleton height='20px' width='70%' borderRadius='sm' />
          <Skeleton height='14px' width='40%' borderRadius='sm' />
          <Skeleton height='14px' width='55%' borderRadius='sm' />
        </Stack>
      </Box>
    ))}
  </CardGrid>
)

export const TableRowsSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <>
    {Array.from({ length: rows }, (_, r) => (
      <Table.Row key={r}>
        {Array.from({ length: columns }, (_, c) => (
          <Table.Cell key={c}>
            <Skeleton height='14px' borderRadius='sm' />
          </Table.Cell>
        ))}
      </Table.Row>
    ))}
  </>
)
