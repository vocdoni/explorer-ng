import { Box, Flex, Link, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router'
import { EmptyState } from '~components/shared/EmptyState'
import { PageSection } from '~components/shared/PageSection'
import { StatusTag } from '~components/shared/StatusTag'
import type { Validator } from '~types/api'

interface Props {
  validators: Validator[]
  isLoading: boolean
  avgBlockSecs: number
  syncing: boolean
  right?: React.ReactNode
}

/** Same thresholds as `ValidatorHealth` on the validator pages: green
 *  reliable, orange drifting, red missing its share of proposals. */
const scoreTone = (score: number) => (score >= 95 ? 'green' : score >= 85 ? 'orange' : 'red')

/** All-healthy only when every validator clears the "green" bar, the chain is
 *  producing blocks at a sane cadence, and this node is caught up — a single
 *  signal a non-technical reader can trust without inspecting each row. */
const networkStatus = (validators: Validator[], avgBlockSecs: number, syncing: boolean) => {
  if (syncing) return { status: 'syncing', label: 'Node syncing' } as const
  if (validators.length === 0) return { status: 'unknown', label: 'No data' } as const
  const allHealthy = validators.every((v) => v.score >= 95)
  const blockTimeSane = avgBlockSecs === 0 || avgBlockSecs <= 20
  if (allHealthy && blockTimeSane) return { status: 'ready', label: 'All healthy' } as const
  if (validators.some((v) => v.score < 85)) return { status: 'invalid', label: 'Degraded validators' } as const
  return { status: 'pause', label: 'Minor drift' } as const
}

/**
 * Compact visual for "is the validator set doing its job": a mini bar per
 * validator sized by its share of proposed blocks, colored by its reliability
 * score, plus a one-line network status derived from the same scores. This is
 * a glance, not the validator page — full detail (voting power, votes signed)
 * lives at /validators.
 */
export const ValidatorNetworkPanel = ({ validators, isLoading, avgBlockSecs, syncing, right }: Props) => {
  const totalProposals = validators.reduce((sum, v) => sum + (v.proposals ?? 0), 0)
  const ranked = [...validators].sort((a, b) => (b.proposals ?? 0) - (a.proposals ?? 0)).slice(0, 6)
  const status = networkStatus(validators, avgBlockSecs, syncing)

  return (
    <PageSection
      title='Validator network'
      subtitle='Share of blocks proposed by each validator, and how reliably it is participating.'
      right={right}
    >
      {!isLoading && validators.length === 0 ? (
        <EmptyState title='No validators reported' py={6} />
      ) : (
        <Stack gap={3}>
          <Flex align='center' justify='space-between' gap={3} wrap='wrap'>
            <Text fontSize='sm'>
              <Text as='span' fontWeight='bold'>
                {validators.length}
              </Text>{' '}
              {validators.length === 1 ? 'validator is' : 'validators are'} confirming votes and sealing blocks.
            </Text>
            <StatusTag status={status.status} label={status.label} />
          </Flex>

          <Stack gap={2}>
            {ranked.map((v) => {
              const share = totalProposals > 0 ? ((v.proposals ?? 0) / totalProposals) * 100 : 0
              return (
                <Flex key={v.validatorAddress} align='center' gap={3}>
                  <Text fontSize='xs' color='texts.subtle' minW='120px' truncate title={v.name}>
                    {v.name || 'Unnamed validator'}
                  </Text>
                  <Box flex='1' h='6px' bg='bg.muted' borderRadius='full' overflow='hidden'>
                    <Box h='100%' borderRadius='full' bg={`${scoreTone(v.score)}.500`} width={`${Math.max(share, 2)}%`} />
                  </Box>
                  <Text fontSize='xs' minW='34px' textAlign='end' color='texts.subtle'>
                    {share.toFixed(0)}%
                  </Text>
                </Flex>
              )
            })}
          </Stack>

          <Box>
            <Link asChild variant='plain' fontSize='sm'>
              <RouterLink to='/validators'>See the validator set</RouterLink>
            </Link>
          </Box>
        </Stack>
      )}
    </PageSection>
  )
}
