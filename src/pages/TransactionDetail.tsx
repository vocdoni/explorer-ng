import { Grid, Link, Text } from '@chakra-ui/react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { DECODABLE_TX_TYPES, DecodedTx } from '~components/chain/DecodedTx'
import { DetailGrid, DetailRow } from '~components/shared/DetailGrid'
import { HashDisplay } from '~components/shared/HashDisplay'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { RelativeTime } from '~components/shared/RelativeTime'
import { TechnicalDetails } from '~components/shared/TechnicalDetails'
import { useBlock, useTransaction } from '~hooks/useVoconeApi'
import { transactionTypeLabel } from '~utils/txLabels'

const TransactionDetailPage = () => {
  const { hash = '' } = useParams()
  const tx = useTransaction(hash)
  const info = tx.data?.txInfo
  const block = useBlock(info?.height !== undefined ? String(info.height) : '')
  const typeLabel = transactionTypeLabel(info?.type)

  return (
    <Grid gap={6}>
      <PageHeader
        title={`${typeLabel} transaction`}
        subtitle={<HashDisplay value={hash} copyLabel='Transaction hash' full />}
      />

      {info && (
        <PageSection title='Summary'>
          <Text fontSize='sm'>
            Signed by <HashDisplay value={info.signer} copyLabel='Signer address' /> and included in{' '}
            <Link asChild variant='plain'>
              <RouterLink to={`/block/${info.height}`}>block {info.height.toLocaleString()}</RouterLink>
            </Link>
            , <RelativeTime value={block.data?.header.time} mode='relative' />.
          </Text>
        </PageSection>
      )}

      <DetailGrid>
        <DetailRow label='Action'>{typeLabel}</DetailRow>
        <DetailRow label='Subtype'>{info?.subtype || '—'}</DetailRow>
        <DetailRow label='Block height'>
          {info ? (
            <Link asChild variant='plain'>
              <RouterLink to={`/block/${info.height}`}>{info.height}</RouterLink>
            </Link>
          ) : (
            '—'
          )}
        </DetailRow>
        <DetailRow label='Position in block'>{info?.index ?? '—'}</DetailRow>
        <DetailRow label='Signer'>
          <HashDisplay value={info?.signer} copyLabel='Signer address' />
        </DetailRow>
        <DetailRow label='Hash'>
          <HashDisplay value={info?.hash} copyLabel='Transaction hash' />
        </DetailRow>
      </DetailGrid>

      {info && DECODABLE_TX_TYPES.includes(info.type) && (
        <PageSection title='What this transaction did'>
          <DecodedTx type={info.type} subtype={info.subtype} tx={tx.data?.tx} />
        </PageSection>
      )}

      <TechnicalDetails title='Raw transaction data' json={tx.data ?? {}} />
    </Grid>
  )
}

export default TransactionDetailPage
