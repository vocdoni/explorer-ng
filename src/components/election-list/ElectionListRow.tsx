import { Link, Table, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { HashDisplay } from '~components/shared/HashDisplay'
import { RelativeTime } from '~components/shared/RelativeTime'
import { StatusTag } from '~components/shared/StatusTag'
import type { ElectionSummary } from '~types/api'
import { shortHex } from '~utils/format'

interface Props {
  election: ElectionSummary
  /** Human title resolved from election metadata; falls back to the hex id. */
  title?: string
}

/** One dense row of the elections list table: title is the dominant, clickable
 *  cell, with status/timing/votes as scannable columns and a copy affordance
 *  for the raw id. Row height comes from the table's `md` size, not from
 *  padding added here. */
export const ElectionListRow = ({ election, title }: Props) => (
  <Table.Row>
    <Table.Cell minW='0'>
      <Link asChild variant='unstyled'>
        <RouterLink to={`/process/${election.electionId}`}>
          <Text fontWeight='semibold' wordBreak='break-word'>
            {title || shortHex(election.electionId, 12, 8)}
          </Text>
        </RouterLink>
      </Link>
    </Table.Cell>
    <Table.Cell>
      <StatusTag status={election.status} />
    </Table.Cell>
    <Table.Cell>
      <RelativeTime value={election.startDate} mode='relative' fontSize='sm' />
    </Table.Cell>
    <Table.Cell>
      <RelativeTime value={election.endDate} mode='relative' fontSize='sm' />
    </Table.Cell>
    <Table.Cell textAlign='end'>
      {election.voteCount.toLocaleString()} {election.voteCount === 1 ? 'vote' : 'votes'}
    </Table.Cell>
    <Table.Cell>
      <HashDisplay value={election.electionId} copyLabel='Election ID' />
    </Table.Cell>
  </Table.Row>
)
