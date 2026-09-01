import { Box, Collapsible, Icon, Stack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { LuChevronRight } from 'react-icons/lu'
import { JsonViewer } from '~components/shared/JsonViewer'

interface Props {
  /** Overrides the default "Technical details" trigger copy. */
  title?: string
  /** Raw payload rendered as a JSON block below `children`. */
  json?: unknown
  children?: ReactNode
}

/**
 * Progressive disclosure for protocol-level data. Every page that used to end in
 * a bare JSON dump now tucks it in here, collapsed, so the plain-English summary
 * above it stays the page.
 */
export const TechnicalDetails = ({ title = 'Technical details', json, children }: Props) => (
  <Collapsible.Root>
    <Collapsible.Trigger
      display='flex'
      alignItems='center'
      gap={2}
      w='full'
      textAlign='left'
      fontSize='sm'
      color='texts.subtle'
      cursor='pointer'
      py={2}
      _hover={{ color: 'fg' }}
    >
      <Icon transition='transform 0.15s ease' _open={{ transform: 'rotate(90deg)' }}>
        <LuChevronRight />
      </Icon>
      {title}
    </Collapsible.Trigger>
    <Collapsible.Content>
      <Stack gap={3} pt={2} pb={4}>
        {children}
        {json !== undefined && <JsonViewer json={json} />}
      </Stack>
    </Collapsible.Content>
  </Collapsible.Root>
)

/** Labeled key/value line for use inside a `TechnicalDetails` body. */
export const TechnicalField = ({ label, children }: { label: string; children: ReactNode }) => (
  <Box>
    <Text fontSize='xs' color='texts.subtle' textTransform='uppercase' letterSpacing='wide'>
      {label}
    </Text>
    <Box fontSize='sm'>{children}</Box>
  </Box>
)
