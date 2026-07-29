import { Box, Flex, Heading, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { StatusTag } from '~components/shared/StatusTag'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  /** Raw API status; rendered as a plain-English tag next to the title. */
  status?: string
  breadcrumb?: ReactNode
  actions?: ReactNode
}

/**
 * The universal page-header pattern: 24px heading at weight 400 in a flex row,
 * immediately followed by a muted subheading.
 */
export const PageHeader = ({ title, subtitle, status, breadcrumb, actions }: Props) => (
  <Box mb={6}>
    {breadcrumb && <Box mb={2}>{breadcrumb}</Box>}
    <Flex justify='space-between' align='flex-start' gap={4} wrap='wrap'>
      <Box minW={0} flex='1'>
        <Heading size='2xl' fontWeight='bold' display='flex' gap={3} alignItems='center' flexWrap='wrap'>
          {title}
          {status && <StatusTag status={status} />}
        </Heading>
        {subtitle && (
          <Text mt={2} fontSize='md' color='texts.subtle' display='flex' gap={2} alignItems='center' flexWrap='wrap'>
            {subtitle}
          </Text>
        )}
      </Box>
      {actions && (
        <Flex gap={2} align='center' wrap='wrap'>
          {actions}
        </Flex>
      )}
    </Flex>
  </Box>
)
