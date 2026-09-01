import { Grid, Input, Link, SimpleGrid, Table, Tabs, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { LuCoins, LuUsers } from 'react-icons/lu'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { PaginationControls } from '~components/shared/PaginationControls'
import { RelativeTime } from '~components/shared/RelativeTime'
import { StatTile } from '~components/shared/StatTile'
import { useAccountsList, useChainTransfers } from '~hooks/useAccounts'
import { useUrlListState } from '~hooks/useUrlListState'

const DEFAULTS = { tab: 'transfers', page: '0', account: '', holdersPage: '0' }

/** Chain-wide token-transfers list. Backed by `GET /chain/transfers`, which
 *  already returns amount/from/to/height/txHash/timestamp per row, so no
 *  per-row enrichment call is needed. An optional account filter narrows the
 *  same query via the `accountId` param (transfers sent or received by it). */
const TokenTransfersPage = () => {
  const { state, setState, num } = useUrlListState(DEFAULTS)
  const page = num('page')
  const holdersPage = num('holdersPage')
  const accountFilter = state.account

  // The address filter types locally and lands in the URL once typing settles.
  const [accountInput, setAccountInput] = useState(accountFilter)
  useEffect(() => {
    setAccountInput(accountFilter)
  }, [accountFilter])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (accountInput === accountFilter) return
      setState({ account: accountInput, page: DEFAULTS.page })
    }, 350)
    return () => clearTimeout(timer)
  }, [accountInput, accountFilter, setState])

  const transfers = useChainTransfers(page, accountFilter || undefined)
  const rows = transfers.data?.transfers ?? []

  const holders = useAccountsList(holdersPage)
  const holderRows = holders.data?.accounts ?? []
  // Page 0 is already sorted by balance descending, so its first row is the
  // chain's largest holder regardless of which page is currently browsed.
  const topHolders = useAccountsList(0, 1)
  const totalAccounts = topHolders.data?.pagination?.totalItems ?? 0
  const largestBalance = topHolders.data?.accounts?.[0]?.balance ?? 0

  return (
    <Grid gap={4}>
      <PageHeader title='Tokens' subtitle='VOC token transfers and the accounts holding them.' />

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        <StatTile label='Total accounts' value={totalAccounts.toLocaleString()} help='Addresses holding VOC' icon={<LuUsers />} />
        <StatTile
          label='Largest holder balance'
          value={largestBalance.toLocaleString()}
          help='Highest single account balance on chain'
          icon={<LuCoins />}
        />
      </SimpleGrid>

      <Tabs.Root value={state.tab} onValueChange={(e) => setState({ tab: e.value })} lazyMount>
        <Tabs.List mb={4}>
          <Tabs.Trigger value='transfers'>Transfers</Tabs.Trigger>
          <Tabs.Trigger value='holders'>Token holders</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value='transfers' p={0}>
          <Grid gap={4}>
            <Input
              placeholder='Filter by account address'
              value={accountInput}
              onChange={(e) => setAccountInput(e.target.value)}
            />
            <PageSection
              title='Transfer list'
              subtitle="Sorted by block height. The node's API does not support sorting transfers by amount."
            >
              <Table.ScrollArea>
                <Table.Root size='sm' variant='outline'>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>From</Table.ColumnHeader>
                      <Table.ColumnHeader>To</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign='end'>Amount</Table.ColumnHeader>
                      <Table.ColumnHeader>Block</Table.ColumnHeader>
                      <Table.ColumnHeader>When</Table.ColumnHeader>
                      <Table.ColumnHeader>Tx</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {transfers.isLoading && <TableRowsSkeleton columns={6} />}
                    {rows.map((t, i) => (
                      <Table.Row key={`${t.txHash}-${i}`}>
                        <Table.Cell>
                          <HashDisplay value={t.from} copyLabel='From account' to={`/account/${t.from}`} />
                        </Table.Cell>
                        <Table.Cell>
                          <HashDisplay value={t.to} copyLabel='To account' to={`/account/${t.to}`} />
                        </Table.Cell>
                        <Table.Cell textAlign='end'>{t.amount.toLocaleString()}</Table.Cell>
                        <Table.Cell>
                          <Link asChild variant='plain'>
                            <RouterLink to={`/block/${t.height}`}>{t.height}</RouterLink>
                          </Link>
                        </Table.Cell>
                        <Table.Cell>
                          <RelativeTime value={t.timestamp} />
                        </Table.Cell>
                        <Table.Cell>
                          <Link asChild variant='plain'>
                            <RouterLink to={`/transactions/${t.txHash}`}>
                              <HashDisplay value={t.txHash} copyLabel='Transaction hash' />
                            </RouterLink>
                          </Link>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
              {!transfers.isLoading && rows.length === 0 && (
                <EmptyState title='No token transfers found' hint='Nothing matches this filter yet.' />
              )}
            </PageSection>
            <PaginationControls
              page={page}
              totalPages={transfers.data?.pagination?.totalPages}
              onChange={(next) => setState({ page: String(next) })}
            />
          </Grid>
        </Tabs.Content>

        <Tabs.Content value='holders' p={0}>
          <Grid gap={4}>
            <PageSection title='Token holders' subtitle='Accounts holding VOC, largest balances first.'>
              <Table.ScrollArea>
                <Table.Root size='sm' variant='outline'>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>#</Table.ColumnHeader>
                      <Table.ColumnHeader>Account</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign='end'>Balance</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign='end'>Nonce</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {holders.isLoading && <TableRowsSkeleton columns={4} />}
                    {holderRows.map((a, i) => (
                      <Table.Row key={a.address}>
                        <Table.Cell>
                          <Text fontSize='sm' color='texts.subtle'>
                            {holdersPage * 25 + i + 1}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <HashDisplay value={a.address} copyLabel='Account address' to={`/account/${a.address}`} />
                        </Table.Cell>
                        <Table.Cell textAlign='end'>{a.balance.toLocaleString()}</Table.Cell>
                        <Table.Cell textAlign='end'>{a.nonce.toLocaleString()}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
              {!holders.isLoading && holderRows.length === 0 && (
                <EmptyState title='No accounts found' hint='No accounts exist on this chain yet.' />
              )}
            </PageSection>
            <PaginationControls
              page={holdersPage}
              totalPages={holders.data?.pagination?.totalPages}
              onChange={(next) => setState({ holdersPage: String(next) })}
            />
          </Grid>
        </Tabs.Content>
      </Tabs.Root>
    </Grid>
  )
}

export default TokenTransfersPage
