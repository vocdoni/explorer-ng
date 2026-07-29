import { Button, Grid, Input, NativeSelect, Stack, Table } from '@chakra-ui/react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { GoToInput } from '~components/chain/GoToInput'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { PaginationControls } from '~components/shared/PaginationControls'
import { RelativeTime } from '~components/shared/RelativeTime'
import { TechnicalDetails } from '~components/shared/TechnicalDetails'
import { useBlocks, useValidators } from '~hooks/useVoconeApi'

const BlocksPage = () => {
  const [page, setPage] = useState(0)
  const [chainId, setChainId] = useState('')
  const [hashFilter, setHashFilter] = useState('')
  const [proposer, setProposer] = useState('')
  const [onlyWithTxs, setOnlyWithTxs] = useState<'all' | 'withTx'>('all')
  const blocks = useBlocks(page, 25, chainId || undefined, hashFilter || undefined, proposer || undefined)
  const validators = useValidators()
  // The block list only carries proposer addresses; the validator list is the
  // only place a human-readable name exists, so join them here.
  const nameByAddress = new Map((validators.data?.validators ?? []).map((v) => [v.address.toLowerCase(), v.name]))
  const rows = (blocks.data?.blocks ?? []).filter((b) => (onlyWithTxs === 'withTx' ? b.txCount > 0 : true))

  return (
    <Grid gap={4}>
      <PageHeader
        title='Blocks'
        subtitle='Each block bundles the transactions confirmed at that point in the chain.'
        actions={
          <GoToInput
            placeholder='Go to height'
            buttonLabel='Go'
            toPath={(v) => `/blocks/${v}`}
            validate={(v) => /^[0-9]+$/.test(v)}
          />
        }
      />
      <Stack direction={{ base: 'column', md: 'row' }} gap={3}>
        <Input
          placeholder='Block hash (partial)'
          value={hashFilter}
          onChange={(e) => {
            setHashFilter(e.target.value)
            setPage(0)
          }}
        />
        <Input
          placeholder='Proposer address'
          value={proposer}
          onChange={(e) => {
            setProposer(e.target.value)
            setPage(0)
          }}
        />
        <NativeSelect.Root maxW={{ md: '200px' }}>
          <NativeSelect.Field value={onlyWithTxs} onChange={(e) => setOnlyWithTxs(e.target.value as 'all' | 'withTx')}>
            <option value='all'>All blocks</option>
            <option value='withTx'>At least 1 transaction</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Button
          variant='outline'
          onClick={() => {
            setChainId('')
            setHashFilter('')
            setProposer('')
            setOnlyWithTxs('all')
            setPage(0)
          }}
        >
          Reset
        </Button>
      </Stack>

      <TechnicalDetails title='Advanced filters'>
        <Input
          placeholder='Chain ID'
          value={chainId}
          onChange={(e) => {
            setChainId(e.target.value)
            setPage(0)
          }}
        />
      </TechnicalDetails>

      <PageSection title='Block list'>
        <Table.ScrollArea>
          <Table.Root size='sm' variant='outline'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Height</Table.ColumnHeader>
                <Table.ColumnHeader>Hash</Table.ColumnHeader>
                <Table.ColumnHeader>Time</Table.ColumnHeader>
                <Table.ColumnHeader>Proposed by</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Txs</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {blocks.isLoading && <TableRowsSkeleton columns={5} />}
              {rows.map((b) => (
                <Table.Row key={b.hash}>
                  <Table.Cell>
                    <Button asChild variant='link' size='sm'>
                      <RouterLink to={`/blocks/${b.height}`}>{b.height}</RouterLink>
                    </Button>
                  </Table.Cell>
                  <Table.Cell>
                    <HashDisplay value={b.hash} copyLabel='Block hash' />
                  </Table.Cell>
                  <Table.Cell>
                    <RelativeTime value={b.time} mode='relative' fontSize='sm' />
                  </Table.Cell>
                  <Table.Cell>
                    {nameByAddress.get(b.proposer?.toLowerCase() ?? '') ?? (
                      <HashDisplay value={b.proposer} copyLabel='Proposer address' />
                    )}
                  </Table.Cell>
                  <Table.Cell textAlign='end'>{b.txCount}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
        {!blocks.isLoading && rows.length === 0 && (
          <EmptyState title='No blocks found' hint='Nothing matches these filters.' />
        )}
      </PageSection>
      <PaginationControls page={page} totalPages={blocks.data?.pagination?.totalPages} onChange={setPage} />
    </Grid>
  )
}

export default BlocksPage
