import { Button, Grid, Input, NativeSelect, Stack, Table } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
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
import { useUrlListState } from '~hooks/useUrlListState'
import { useBlocks, useValidators } from '~hooks/useVoconeApi'

const DEFAULTS = { page: '0', chainId: '', hash: '', proposer: '', txs: 'all' }

const BlocksPage = () => {
  const { state, setState, num } = useUrlListState(DEFAULTS)
  const page = num('page')
  const { chainId, hash: hashFilter, proposer } = state
  const onlyWithTxs = state.txs === 'withTx' ? 'withTx' : 'all'

  // The three text filters type into local drafts so keystrokes stay snappy;
  // the settled value is what reaches the URL (and the query).
  const [drafts, setDrafts] = useState({ chainId, hash: hashFilter, proposer })
  useEffect(() => {
    setDrafts({ chainId, hash: hashFilter, proposer })
  }, [chainId, hashFilter, proposer])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (drafts.chainId === chainId && drafts.hash === hashFilter && drafts.proposer === proposer) return
      setState({ ...drafts, page: DEFAULTS.page })
    }, 350)
    return () => clearTimeout(timer)
  }, [drafts, chainId, hashFilter, proposer, setState])

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
          value={drafts.hash}
          onChange={(e) => setDrafts({ ...drafts, hash: e.target.value })}
        />
        <Input
          placeholder='Proposer address'
          value={drafts.proposer}
          onChange={(e) => setDrafts({ ...drafts, proposer: e.target.value })}
        />
        <NativeSelect.Root maxW={{ md: '200px' }}>
          <NativeSelect.Field
            value={onlyWithTxs}
            onChange={(e) => setState({ txs: e.target.value, page: DEFAULTS.page })}
          >
            <option value='all'>All blocks</option>
            <option value='withTx'>At least 1 transaction</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Button variant='outline' onClick={() => setState({ ...DEFAULTS })}>
          Reset
        </Button>
      </Stack>

      <TechnicalDetails title='Advanced filters'>
        <Input
          placeholder='Chain ID'
          value={drafts.chainId}
          onChange={(e) => setDrafts({ ...drafts, chainId: e.target.value })}
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
      <PaginationControls
        page={page}
        totalPages={blocks.data?.pagination?.totalPages}
        onChange={(next) => setState({ page: String(next) })}
      />
    </Grid>
  )
}

export default BlocksPage
