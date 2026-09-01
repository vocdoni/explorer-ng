import { Link, Table, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { RelativeTime } from '~components/shared/RelativeTime'
import type { BlockListItem, Validator } from '~types/api'

interface Props {
  blocks: BlockListItem[]
  validators: Validator[]
  isLoading: boolean
}

/**
 * A block's `proposer` is the CometBFT consensus address (`validatorAddress`),
 * which is *not* the account address the validator pages are keyed on. Resolving
 * it through the already-loaded validator set turns an opaque hash into the
 * validator's name and a working link; anything unmatched falls back to the raw
 * address, unlinked, rather than pointing at a page that would not resolve.
 */
const buildProposerLookup = (validators: Validator[]) => {
  const byConsensusAddress = new Map<string, Validator>()
  validators.forEach((v) => {
    if (v.validatorAddress) byConsensusAddress.set(v.validatorAddress.toLowerCase(), v)
  })
  return (proposer?: string) => (proposer ? byConsensusAddress.get(proposer.toLowerCase()) : undefined)
}

export const LatestBlocksFeed = ({ blocks, validators, isLoading }: Props) => {
  const lookup = buildProposerLookup(validators)

  if (!isLoading && blocks.length === 0) return <EmptyState title='No blocks yet' py={6} />

  return (
    <Table.ScrollArea>
      <Table.Root size='sm' variant='outline'>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Height</Table.ColumnHeader>
            <Table.ColumnHeader>Proposed by</Table.ColumnHeader>
            <Table.ColumnHeader>Time</Table.ColumnHeader>
            <Table.ColumnHeader textAlign='end'>Txs</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading && blocks.length === 0 && <TableRowsSkeleton rows={6} columns={4} />}
          {blocks.map((b) => {
            const validator = lookup(b.proposer)
            return (
              <Table.Row key={b.hash}>
                <Table.Cell>
                  <Link asChild variant='plain'>
                    <RouterLink to={`/block/${b.height}`}>
                      <Text as='span' fontSize='sm'>
                        {b.height.toLocaleString()}
                      </Text>
                    </RouterLink>
                  </Link>
                </Table.Cell>
                <Table.Cell maxW='180px'>
                  {validator ? (
                    <Link asChild variant='plain'>
                      <RouterLink to={`/validator/${validator.address}`}>
                        <Text as='span' fontSize='sm' truncate title={validator.name}>
                          {validator.name || 'Validator'}
                        </Text>
                      </RouterLink>
                    </Link>
                  ) : (
                    <HashDisplay value={b.proposer} copyLabel='Proposer address' left={6} right={4} />
                  )}
                </Table.Cell>
                <Table.Cell>
                  <RelativeTime value={b.time} mode='relative' fontSize='sm' />
                </Table.Cell>
                <Table.Cell textAlign='end'>{b.txCount}</Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  )
}
