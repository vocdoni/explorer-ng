import { Grid, Input, NativeSelect, Stack, Table, Tag } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { GoToInput } from '~components/chain/GoToInput'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { PaginationControls } from '~components/shared/PaginationControls'
import { useUrlListState } from '~hooks/useUrlListState'
import { useTransactions } from '~hooks/useVoconeApi'
import { TX_TYPE_OPTIONS, transactionTypeLabel, transactionTypePalette } from '~utils/txLabels'

const DEFAULTS = { page: '0', height: '', type: '', signer: '' }

const TransactionsPage = () => {
  const { state, setState, num } = useUrlListState(DEFAULTS)
  const page = num('page')
  const { height, type, signer } = state

  // Local drafts for the two text filters, pushed to the URL once typing settles.
  const [drafts, setDrafts] = useState({ height, signer })
  useEffect(() => {
    setDrafts({ height, signer })
  }, [height, signer])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (drafts.height === height && drafts.signer === signer) return
      setState({ ...drafts, page: DEFAULTS.page })
    }, 350)
    return () => clearTimeout(timer)
  }, [drafts, height, signer, setState])

  const txs = useTransactions(page, 25, height || undefined, type || undefined, signer || undefined)
  const rows = txs.data?.transactions ?? []

  return (
    <Grid gap={4}>
      <PageHeader
        title='Transactions'
        subtitle='Every action recorded on the chain, newest first.'
        actions={
          <GoToInput
            placeholder='Go to tx hash'
            buttonLabel='Go'
            toPath={(v) => `/transactions/${v.replace(/^0x/i, '')}`}
            validate={(v) => /^(0x)?[0-9a-fA-F]{10,}$/.test(v)}
          />
        }
      />
      <Stack direction={{ base: 'column', md: 'row' }} gap={3}>
        <Input
          placeholder='Block height'
          value={drafts.height}
          onChange={(e) => setDrafts({ ...drafts, height: e.target.value })}
        />
        <NativeSelect.Root>
          <NativeSelect.Field
            value={type}
            onChange={(e) => setState({ type: e.target.value, page: DEFAULTS.page })}
          >
            <option value=''>All types</option>
            {TX_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Input
          placeholder='Signer address'
          value={drafts.signer}
          onChange={(e) => setDrafts({ ...drafts, signer: e.target.value })}
        />
      </Stack>
      <PageSection title='Transaction list'>
        <Table.ScrollArea>
          <Table.Root size='sm' variant='outline'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Hash</Table.ColumnHeader>
                <Table.ColumnHeader>Action</Table.ColumnHeader>
                <Table.ColumnHeader>Subtype</Table.ColumnHeader>
                <Table.ColumnHeader>Signer</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Height</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Index</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {txs.isLoading && <TableRowsSkeleton columns={6} />}
              {rows.map((t) => (
                <Table.Row key={t.hash}>
                  <Table.Cell>
                    <HashDisplay value={t.hash} copyLabel='Transaction hash' to={`/transactions/${t.hash}`} />
                  </Table.Cell>
                  <Table.Cell>
                    <Tag.Root colorPalette={transactionTypePalette(t.type)} size='sm'>
                      <Tag.Label>{transactionTypeLabel(t.type)}</Tag.Label>
                    </Tag.Root>
                  </Table.Cell>
                  <Table.Cell>{t.subtype || '—'}</Table.Cell>
                  <Table.Cell>
                    <HashDisplay value={t.signer} copyLabel='Signer address' />
                  </Table.Cell>
                  <Table.Cell textAlign='end'>{t.height}</Table.Cell>
                  <Table.Cell textAlign='end'>{t.index}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
        {!txs.isLoading && rows.length === 0 && (
          <EmptyState title='No transactions found' hint='Nothing matches these filters.' />
        )}
      </PageSection>
      <PaginationControls
        page={page}
        totalPages={txs.data?.pagination?.totalPages}
        onChange={(next) => setState({ page: String(next) })}
      />
    </Grid>
  )
}

export default TransactionsPage
