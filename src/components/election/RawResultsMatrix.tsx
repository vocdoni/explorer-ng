import { Table, Text } from '@chakra-ui/react'
import { PageSection } from '~components/shared/PageSection'

/**
 * The tally exactly as the chain returned it, for elections whose layout the explorer
 * will not guess at.
 *
 * A row is a ballot field and a column is a value — deliberately labelled that way
 * rather than as questions and choices, because which is which is precisely what is
 * unknown here. Showing the matrix is honest; inventing a reading for it is not.
 */
export const RawResultsMatrix = ({ matrix }: { matrix: number[][] }) => {
  const columns = matrix.reduce((widest, row) => Math.max(widest, row.length), 0)

  return (
    <PageSection
      title='Raw tally'
      subtitle='Counted units per ballot field and value, as returned by the chain'
    >
      <Table.ScrollArea>
        <Table.Root size='sm' variant='outline'>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Field</Table.ColumnHeader>
              {Array.from({ length: columns }, (_column, value) => (
                <Table.ColumnHeader key={value} textAlign='end'>
                  Value {value}
                </Table.ColumnHeader>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {matrix.map((row, field) => (
              <Table.Row key={field}>
                <Table.Cell fontWeight='bold'>Field {field}</Table.Cell>
                {Array.from({ length: columns }, (_column, value) => (
                  <Table.Cell key={value} textAlign='end' fontFamily='mono'>
                    {(row[value] ?? 0).toLocaleString()}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
      <Text mt={3} fontSize='xs' color='texts.subtle'>
        A field is one position on the ballot and a value is what a voter put there. Without the election’s published
        ballot type there is no way to say which options those map to, so no tally is derived from them here.
      </Text>
    </PageSection>
  )
}
