import { Box, Icon, Text, type BoxProps } from '@chakra-ui/react'
import type { ElementType, ReactNode } from 'react'
import { LuInbox } from 'react-icons/lu'

interface Props extends BoxProps {
  icon?: ElementType
  title: string
  hint?: string
  children?: ReactNode
}

/**
 * Renders content only — no card, no border. The caller supplies the surface,
 * matching vocdoni-app's `ui/EmptyState`.
 */
export const EmptyState = ({ icon = LuInbox, title, hint, children, ...rest }: Props) => (
  <Box
    display='flex'
    flexDirection='column'
    alignItems='center'
    textAlign='center'
    gap={3}
    py={10}
    px={4}
    {...rest}
  >
    <Icon as={icon} boxSize={12} color='fg.muted' />
    <Text fontWeight='bold' fontSize='lg'>
      {title}
    </Text>
    {hint && (
      <Text color='fg.muted' fontSize='sm' maxW='md'>
        {hint}
      </Text>
    )}
    {children}
  </Box>
)
