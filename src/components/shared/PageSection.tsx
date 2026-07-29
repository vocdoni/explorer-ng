import { Box, Flex, Heading, Text, type BoxProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'

// `right` here is a header slot for actions, which collides with Chakra's CSS
// `right` positioning prop — omit the latter so the slot keeps its ReactNode type.
interface Props extends Omit<BoxProps, 'right' | 'title'> {
  title: string
  subtitle?: string
  right?: ReactNode
}

/** The workhorse content panel: 8px radius, 1px hairline, no shadow. */
export const PageSection = ({ title, subtitle, right, children, ...rest }: Props) => (
  <Box borderRadius='md' border='1px solid' borderColor='border' p={4} minW={0} {...rest}>
    <Flex
      justify='space-between'
      align={{ base: 'flex-start', md: 'center' }}
      gap={3}
      flexDir={{ base: 'column', md: 'row' }}
      mb={4}
    >
      <Box>
        <Heading size='md'>{title}</Heading>
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
