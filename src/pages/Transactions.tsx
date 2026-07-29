import { Grid, Input, NativeSelect, Stack, Table, Tag } from '@chakra-ui/react'
import { useState } from 'react'
import { GoToInput } from '~components/chain/GoToInput'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { PaginationControls } from '~components/shared/PaginationControls'
import { useTransactions } from '~hooks/useVoconeApi'
import { TX_TYPE_OPTIONS, transactionTypeLabel, transactionTypePalette } from '~utils/txLabels'

const TransactionsPage = () => {
  const [page, setPage] = useState(0)
  const [height, setHeight] = useState('')
  const [type, setType] = useState('')
  const [signer, setSigner] = useState('')
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
          value={height}
          onChange={(e) => {
            setHeight(e.target.value)
            setPage(0)
          }}
        />
        <NativeSelect.Root>
          <NativeSelect.Field
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setPage(0)
            }}
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
          value={signer}
          onChange={(e) => {
            setSigner(e.target.value)
            setPage(0)
          }}
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
      <PaginationControls page={page} totalPages={txs.data?.pagination?.totalPages} onChange={setPage} />
    </Grid>
  )
}

export default TransactionsPage
