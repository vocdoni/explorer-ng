import { Grid, Table, Tag } from '@chakra-ui/react'
import { useParams } from 'react-router-dom'
import { BlockNav } from '~components/chain/BlockNav'
import { DetailGrid, DetailRow } from '~components/shared/DetailGrid'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { RelativeTime } from '~components/shared/RelativeTime'
import { TechnicalDetails } from '~components/shared/TechnicalDetails'
import { useBlock, useChainInfo, useTransactions, useValidators } from '~hooks/useVoconeApi'
import { transactionTypeLabel, transactionTypePalette } from '~utils/txLabels'

const BlockDetailPage = () => {
  const { height = '' } = useParams()
  const block = useBlock(height)
  const validators = useValidators()
  const chain = useChainInfo()
  // Closes the loop for "I clicked Block from my vote — where is my transaction?"
  const txs = useTransactions(0, 50, height)
  const proposerAddress = block.data?.header.proposerAddress
  const proposerName = (validators.data?.validators ?? []).find(
    (v) => v.address.toLowerCase() === proposerAddress?.toLowerCase()
  )?.name
  const rows = txs.data?.transactions ?? []

  return (
    <Grid gap={6}>
      <PageHeader
        title={`Block #${height}`}
        subtitle={<RelativeTime value={block.data?.header.time} />}
        actions={
          <BlockNav height={Number(height)} minHeight={chain.data?.blockStoreBase} maxHeight={chain.data?.height} />
        }
      />

      <DetailGrid>
        <DetailRow label='Height'>{block.data?.header.height ?? height}</DetailRow>
        <DetailRow label='Hash'>
          <HashDisplay value={block.data?.hash} copyLabel='Block hash' left={12} right={10} />
        </DetailRow>
        <DetailRow label='Transactions'>{block.data?.txCount ?? 0}</DetailRow>
        <DetailRow label='Chain'>{block.data?.header.chainId ?? '—'}</DetailRow>
        <DetailRow label='Proposed by'>
          {proposerName ?? <HashDisplay value={proposerAddress} copyLabel='Proposer address' />}
        </DetailRow>
        <DetailRow label='Time'>
          <RelativeTime value={block.data?.header.time} fontWeight='bold' />
        </DetailRow>
      </DetailGrid>

      <PageSection title='Transactions in this block'>
        <Table.ScrollArea>
          <Table.Root size='sm' variant='outline'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Hash</Table.ColumnHeader>
                <Table.ColumnHeader>Action</Table.ColumnHeader>
                <Table.ColumnHeader>Signer</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
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
                  <Table.Cell>
                    <HashDisplay value={t.signer} copyLabel='Signer address' />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
        {!txs.isLoading && rows.length === 0 && <EmptyState title='This block carries no transactions' />}
      </PageSection>

      <TechnicalDetails json={block.data ?? {}} />
    </Grid>
  )
}

export default BlockDetailPage
