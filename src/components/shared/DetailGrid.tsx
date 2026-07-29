import { Box, SimpleGrid, Text, type SimpleGridProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

/**
 * Label-above-value rows for detail pages. The label is the muted, uppercase,
 * wide-tracked `Stat.Label` idiom from vocdoni-app; the value carries the weight.
 */
export const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <Box minW={0}>
    <Text fontSize='xs' color='texts.subtle' textTransform='uppercase' letterSpacing='wide' mb={1}>
      {label}
    </Text>
    <Box fontSize='md' fontWeight='bold' wordBreak='break-word'>
      {children}
    </Box>
  </Box>
)

export const DetailGrid = ({ children, ...rest }: SimpleGridProps) => (
  <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6} {...rest}>
    {children}
  </SimpleGrid>
)
