import { Alert, Grid, SimpleGrid, Table, Text } from '@chakra-ui/react'
import { txCostLabel } from '~components/account/txCostLabels'
import { HashDisplay } from '~components/shared/HashDisplay'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { RelativeTime } from '~components/shared/RelativeTime'
import { StatTile } from '~components/shared/StatTile'
import { TechnicalDetails, TechnicalField } from '~components/shared/TechnicalDetails'
import { Tooltip } from '~components/ui/Tooltip'
import { useElectionPriceFactors, useTxCosts } from '~hooks/useAccounts'
import { useChainInfo, useTransactionCount, useValidators } from '~hooks/useVoconeApi'

const PRICE_FACTOR_HINTS: Record<string, string> = {
  k1: 'Weight of census size on election price.',
  k2: 'Weight of election duration on election price.',
  k3: 'Weight of encrypted voting on election price.',
  k4: 'Weight of anonymous voting on election price.',
  k5: 'Weight of ballots being overwritable on election price.',
  k6: 'Weight of expected voter turnout on election price.',
  k7: 'Size threshold that triggers the growth factor.',
}

const VALIDATOR_HINTS: Record<string, string> = {
  Power: "This validator's voting weight in consensus — higher power means more influence over which blocks get confirmed.",
  Votes: 'Blocks this validator has voted to confirm.',
  Proposals: 'Blocks this validator has proposed.',
  Score: "Reliability score, 0-100, based on the validator's participation.",
}

const MonitoringPage = () => {
  const chain = useChainInfo()
  const validators = useValidators()
  const txCount = useTransactionCount()
  const txCosts = useTxCosts()
  const priceFactors = useElectionPriceFactors()
  const syncing = chain.data?.syncing ?? false
  const costEntries = Object.entries(txCosts.data?.costs ?? {}).sort(([a], [b]) => a.localeCompare(b))
  const factorEntries = Object.entries(priceFactors.data?.factors ?? {})

  // chain/info returns rolling block-time averages in ms (1m, 10m, 1h, 6h, 24h);
  // the first non-zero entry is the most recent meaningful sample.
  const avgBlockMs = (chain.data?.blockTime ?? []).find((ms) => ms > 0) ?? 0
  const avgBlockSecs = avgBlockMs / 1000

  return (
    <Grid gap={6}>
      <PageHeader
        title='Network status'
        subtitle='A full technical view of node sync, block production and the validator set.'
      />

      <Alert.Root status={syncing ? 'warning' : 'success'}>
        <Alert.Indicator />
        <Alert.Title>
          {syncing ? 'This node is still catching up with the chain.' : 'The network is healthy and fully synced.'}
        </Alert.Title>
      </Alert.Root>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
        <StatTile
          label='Sync state'
          value={syncing ? 'Catching up' : 'Fully synced'}
          help='Whether this node has caught up with the rest of the network.'
        />
        <StatTile
          label='Block time'
          value={avgBlockSecs > 0 ? `${avgBlockSecs.toFixed(2)}s` : '—'}
          help='Average time between blocks over the last minute — how fast the chain confirms activity.'
        />
        <StatTile
          label='Network capacity'
          value={(chain.data?.networkCapacity ?? 0).toLocaleString()}
          help='How many votes the network can process, by design.'
        />
        <StatTile
          label='Last block'
          value={<RelativeTime value={chain.data?.blockTimestamp} mode='relative' />}
          help={`Height ${(chain.data?.height ?? 0).toLocaleString()}`}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        <StatTile
          label='Validators'
          value={validators.data?.validators?.length ?? 0}
          help='Nodes that confirm votes and seal blocks into the chain.'
        />
        <StatTile
          label='Max census size'
          value={(chain.data?.maxCensusSize ?? 0).toLocaleString()}
          help='The largest voter list a single election on this chain can support.'
        />
        <StatTile
          label='Indexed transactions'
          value={(txCount.data?.count ?? 0).toLocaleString()}
          help='Total transactions recorded by this node so far.'
        />
      </SimpleGrid>

      <PageSection
        title='Validators'
        subtitle='Validators are the nodes that confirm votes and seal blocks into the chain. Power is voting weight; score is a 0-100 reliability rating.'
      >
        <Table.ScrollArea>
          <Table.Root size='sm' variant='outline'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>Address</Table.ColumnHeader>
                {Object.entries(VALIDATOR_HINTS).map(([label, hint]) => (
                  <Table.ColumnHeader key={label} textAlign='end'>
                    <Tooltip content={hint} showArrow>
                      <span>{label}</span>
                    </Tooltip>
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(validators.data?.validators ?? []).map((v) => (
                <Table.Row key={v.validatorAddress}>
                  <Table.Cell>{v.name || '—'}</Table.Cell>
                  <Table.Cell>
                    <HashDisplay value={v.address} copyLabel='Validator address' />
                  </Table.Cell>
                  <Table.Cell textAlign='end'>{v.power}</Table.Cell>
                  <Table.Cell textAlign='end'>{v.votes}</Table.Cell>
                  <Table.Cell textAlign='end'>{v.proposals}</Table.Cell>
                  <Table.Cell textAlign='end'>{v.score}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      </PageSection>

      <PageSection
        title='Transaction pricing'
        subtitle='What actions on this chain cost. Base costs are protocol constants; the election price also scales with census size, duration and voting options (see the factors below).'
      >
        <Text fontSize='sm' color='texts.subtle' mb={4}>
          For example, creating an election costs a base of{' '}
          {(txCosts.data?.costs?.NewProcess ?? 0).toLocaleString()} tokens, before the size/duration/encryption
          factors below are applied.
        </Text>
        <Table.ScrollArea>
          <Table.Root size='sm' variant='outline'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Action</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Base cost</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {costEntries.map(([name, cost]) => (
                <Table.Row key={name}>
                  <Table.Cell>{txCostLabel(name)}</Table.Cell>
                  <Table.Cell textAlign='end'>{cost.toLocaleString()}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>

        {factorEntries.length > 0 && (
          <>
            <Text fontSize='sm' color='texts.subtle' mt={6} mb={2}>
              Election-price factors — base price {(priceFactors.data?.basePrice ?? 0).toLocaleString()}, capacity{' '}
              {(priceFactors.data?.capacity ?? 0).toLocaleString()} votes.
            </Text>
            <Table.ScrollArea>
              <Table.Root size='sm' variant='outline'>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Factor</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign='end'>Value</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {factorEntries.map(([key, value]) => (
                    <Table.Row key={key}>
                      <Table.Cell>
                        <Tooltip content={PRICE_FACTOR_HINTS[key] ?? key} showArrow>
                          <span>{key}</span>
                        </Tooltip>
                      </Table.Cell>
                      <Table.Cell textAlign='end'>{value}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </>
        )}
      </PageSection>

      <TechnicalDetails json={chain.data ?? {}}>
        <TechnicalField label='Chain ID'>{chain.data?.chainId ?? '—'}</TechnicalField>
        <TechnicalField label='Circuit version'>{chain.data?.circuitVersion ?? '—'}</TechnicalField>
        <TechnicalField label='Network capacity'>{chain.data?.networkCapacity ?? 0}</TechnicalField>
        <TechnicalField label='Max census size'>{chain.data?.maxCensusSize ?? 0}</TechnicalField>
      </TechnicalDetails>
    </Grid>
  )
}

export default MonitoringPage
