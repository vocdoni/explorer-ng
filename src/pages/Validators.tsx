import { Link, Table } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { ValidatorHealth } from '~components/chain/ValidatorHealth'
import { EmptyState } from '~components/shared/EmptyState'
import { HashDisplay } from '~components/shared/HashDisplay'
import { TableRowsSkeleton } from '~components/shared/LoadingSkeleton'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { useSortedValidators } from '~hooks/useValidators'

const ValidatorsPage = () => {
  const { validators, isLoading } = useSortedValidators()

  return (
    <>
      <PageHeader
        title='Validators'
        subtitle='The nodes that propose and confirm blocks on the Vocdoni chain, ranked by voting power.'
      />

      <PageSection title='Validator list'>
        <Table.ScrollArea>
          <Table.Root size='sm' variant='outline'>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>Address</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Voting power</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Blocks proposed</Table.ColumnHeader>
                <Table.ColumnHeader textAlign='end'>Votes signed</Table.ColumnHeader>
                <Table.ColumnHeader>Score</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {isLoading && <TableRowsSkeleton columns={6} />}
              {validators.map((v) => (
                <Table.Row key={v.validatorAddress}>
                  <Table.Cell>
                    <Link asChild variant='plain'>
                      <RouterLink to={`/validators/${v.address}`}>{v.name || 'Unnamed validator'}</RouterLink>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <HashDisplay value={v.address} copyLabel='Validator address' to={`/validators/${v.address}`} />
                  </Table.Cell>
                  <Table.Cell textAlign='end'>{v.power.toLocaleString()}</Table.Cell>
                  <Table.Cell textAlign='end'>{v.proposals.toLocaleString()}</Table.Cell>
                  <Table.Cell textAlign='end'>{v.votes.toLocaleString()}</Table.Cell>
                  <Table.Cell>
                    <ValidatorHealth score={v.score} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
        {!isLoading && validators.length === 0 && (
          <EmptyState title='No validators reported' hint='The connected node has not returned a validator set.' />
        )}
      </PageSection>
    </>
  )
}

export default ValidatorsPage
