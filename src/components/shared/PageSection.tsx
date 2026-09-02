import { Box, Flex, Heading, Text, type BoxProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

// `right` here is a header slot for actions, which collides with Chakra's CSS
// `right` positioning prop — omit the latter so the slot keeps its ReactNode type.
interface Props extends Omit<BoxProps, 'right' | 'title'> {
  title: string
  subtitle?: string
  right?: ReactNode
}

/**
 * The workhorse content panel: 16px radius, 1px hairline, no shadow. Every
 * section title carries the signal-yellow eyebrow dot — the vocdoni.io section
 * rhythm, and the only place that yellow exists.
 */
export const PageSection = ({ title, subtitle, right, children, ...rest }: Props) => (
  <Box bg='bg.panel' borderRadius='lg' border='1px solid' borderColor='border' p={4} minW={0} {...rest}>
    <Flex
      justify='space-between'
      align={{ base: 'flex-start', md: 'center' }}
      gap={3}
      flexDir={{ base: 'column', md: 'row' }}
      mb={4}
    >
      <Box>
        <Flex align='center' gap={2}>
          <Box boxSize='8px' borderRadius='full' bg='signal' flexShrink={0} aria-hidden />
          <Heading size='md'>{title}</Heading>
        </Flex>
        {subtitle && (
          <Text mt={1} fontSize='sm' color='texts.subtle'>
            {subtitle}
          </Text>
        )}
      </Box>
      {right}
    </Flex>
    {children}
  </Box>
)
