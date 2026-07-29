import { Grid, Link, SimpleGrid, Table, Text } from '@chakra-ui/react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { ValidatorHealth } from '~components/chain/ValidatorHealth'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { RelativeTime } from '~components/shared/RelativeTime'
import { StatTile } from '~components/shared/StatTile'
import { TechnicalDetails, TechnicalField } from '~components/shared/TechnicalDetails'
import { useValidator } from '~hooks/useValidators'
import { useBlocks } from '~hooks/useVoconeApi'

const ValidatorDetailPage = () => {
  const { address = '' } = useParams()
  const { validator, isLoading } = useValidator(address)
  const proposed = useBlocks(0, 10, undefined, undefined, address)
  const rows = proposed.data?.blocks ?? []

  return (
    <Grid gap={6}>
      {/* subtitle renders inside a <p>; HashDisplay is block-level, so it sits below the header instead */}
      <PageHeader title={validator?.name || 'Validator'} />
      <HashDisplay value={validator?.address ?? address} copyLabel='Validator address' full />

      {!isLoading && !validator && (
        <EmptyState
          title='Validator not found'
          hint='This address is not part of the current validator set — it may have left, or the address may be wrong.'
        />
      )}

      {validator && (
        <>
          <Text fontSize='sm' color='texts.subtle'>
            Validators are the nodes that run consensus for the Vocdoni chain: they take turns proposing blocks and
            every validator signs off on the blocks proposed by others before they are confirmed. Voting power sets
            how much weight a validator's signature carries; the score below reflects how reliably it has kept up
            with that duty.
          </Text>

          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
            <StatTile label='Voting power' value={validator.power.toLocaleString()} help="This validator's weight in consensus." />
            <StatTile label='Blocks proposed' value={validator.proposals.toLocaleString()} help='Blocks this validator has authored.' />
            <StatTile label='Votes signed' value={validator.votes.toLocaleString()} help='Blocks this validator has confirmed.' />
            <StatTile
              label='Reliability score'
              value={<ValidatorHealth score={validator.score} />}
              help='0-100 participation rating.'
            />
          </SimpleGrid>

          <StatTile
            label='Joined at block'
            value={
              <Link asChild variant='plain'>
                <RouterLink to={`/blocks/${validator.joinHeight}`}>{validator.joinHeight.toLocaleString()}</RouterLink>
              </Link>
            }
            help='The block height at which this validator entered the active set.'
          />

          <PageSection
            title='Recently proposed blocks'
            subtitle='The most recent blocks this validator authored.'
          >
            <Table.ScrollArea>
              <Table.Root size='sm' variant='outline'>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Height</Table.ColumnHeader>
                    <Table.ColumnHeader>Hash</Table.ColumnHeader>
                    <Table.ColumnHeader>Time</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign='end'>Txs</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {rows.map((b) => (
                    <Table.Row key={b.hash}>
                      <Table.Cell>
                        <Link asChild variant='plain'>
                          <RouterLink to={`/blocks/${b.height}`}>{b.height}</RouterLink>
                        </Link>
                      </Table.Cell>
                      <Table.Cell>
                        <HashDisplay value={b.hash} copyLabel='Block hash' />
                      </Table.Cell>
                      <Table.Cell>
                        <RelativeTime value={b.time} mode='relative' fontSize='sm' />
                      </Table.Cell>
                      <Table.Cell textAlign='end'>{b.txCount}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
            {!proposed.isLoading && rows.length === 0 && (
              <EmptyState title='No recent blocks found' hint='This validator has not proposed a block recently.' />
            )}
          </PageSection>

          <TechnicalDetails json={validator}>
            <TechnicalField label='Public key'>
              <HashDisplay value={validator.pubKey} copyLabel='Public key' full />
            </TechnicalField>
            <TechnicalField label='Validator address'>
              <HashDisplay value={validator.validatorAddress} copyLabel='Validator address' full />
            </TechnicalField>
          </TechnicalDetails>
        </>
      )}
    </Grid>
  )
}

export default ValidatorDetailPage
