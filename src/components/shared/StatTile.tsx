import { Box, Card, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { HashDisplay } from '~components/shared/HashDisplay'

interface Props {
  label: string
  value: ReactNode
  help?: string
  icon?: ReactNode
  /** Render the value as a copyable, truncated hex identifier. */
  hash?: string
}

/** Compact KPI tile: muted uppercase label, weight-400 value. */
export const StatTile = ({ label, value, help, icon, hash }: Props) => (
  <Card.Root size='sm'>
    <Card.Body>
      <Flex justify='space-between' align='center' gap={2} mb={1}>
        <Box fontSize='xs' color='texts.subtle' textTransform='uppercase' letterSpacing='wide'>
          {label}
        </Box>
        {icon}
      </Flex>
      <Box fontSize='xl' fontWeight='bold' wordBreak='break-word'>
        {hash ? <HashDisplay value={hash} copyLabel={label} fontSize='sm' /> : value}
      </Box>
      {help && (
        <Box fontSize='xs' color='texts.subtle' mt={1}>
          {help}
        </Box>
      )}
    </Card.Body>
  </Card.Root>
)
