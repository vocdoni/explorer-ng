import { Link, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router'
import { DetailGrid, DetailRow } from '~components/shared/DetailGrid'
import { HashDisplay } from '~components/shared/HashDisplay'
import { StatusTag } from '~components/shared/StatusTag'
import { toNumber } from '~utils/format'

/** Loose shapes for the protobuf-derived JSON the API returns under `tx.<type>`.
 *  Only the fields this component reads are declared — everything else stays
 *  in the raw-JSON fallback the caller renders alongside this. */
interface VoteTx {
  processId?: string
  nullifier?: string
  votePackage?: string
  encryptionKeyIndexes?: number[]
  proof?: { ca?: { bundle?: { voteWeight?: string } } }
}

interface NewProcessTx {
  process?: {
    processId?: string
    entityId?: string
    censusRoot?: string
    censusURI?: string
    duration?: number
    maxCensusSize?: string | number
    status?: string
  }
}

interface SetProcessTx {
  txtype?: string
  processId?: string
  status?: string
  censusRoot?: string
  censusURI?: string
  duration?: number
  censusSize?: string | number
}

interface AdminTx {
  txtype?: string
  processId?: string
  keyIndex?: number
}

interface SendTokensTx {
  from?: string
  to?: string
  value?: string | number
}

interface SetAccountTx {
  txtype?: string
  account?: string
  infoURI?: string
  name?: string
}

interface Props {
  /** Raw `type` from `txInfo.type` — selects which nested key of `tx` to read. */
  type?: string
  /** `subtype` from `txInfo.type`, e.g. `set_process_status`, `create_account`. */
  subtype?: string
  /** The `tx` object from `GenericTransactionWithInfo` — an object keyed by tx type. */
  tx?: unknown
}

/** Transaction types this component renders a decoded summary for. Anything
 *  else falls back to the raw-JSON view the caller already has. */
export const DECODABLE_TX_TYPES = ['vote', 'newProcess', 'setProcess', 'admin', 'sendTokens', 'setAccount', 'createAccount']

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

/** `SET_PROCESS_STATUS` etc. read better as plain words than shouted enum tokens. */
const humanizeTxtype = (txtype?: string) => {
  if (!txtype) return undefined
  return txtype
    .toLowerCase()
    .split('_')
    .join(' ')
    .replace(/^\w/, (c) => c.toUpperCase())
}

const ElectionLink = ({ processId }: { processId?: string }) =>
  processId ? (
    <Link asChild variant='plain'>
      <RouterLink to={`/process/${processId}`}>
        <HashDisplay value={processId} copyLabel='Election ID' withCopy={false} />
      </RouterLink>
    </Link>
  ) : (
    <>—</>
  )

const AccountLink = ({ address, copyLabel }: { address?: string; copyLabel: string }) =>
  address ? (
    <Link asChild variant='plain'>
      <RouterLink to={`/account/${address}`}>
        <HashDisplay value={address} copyLabel={copyLabel} withCopy={false} />
      </RouterLink>
    </Link>
  ) : (
    <>—</>
  )

/**
 * Per-transaction-type decoded summary, rendered above the raw-JSON
 * `TechnicalDetails` block. Shapes are verified against live
 * `api.vocdoni.io/v2/chain/transactions/{hash}` responses for each type
 * (vote, newProcess, setProcess, admin, sendTokens, setAccount/createAccount)
 * rather than guessed from the .proto alone. Unrecognized types render
 * nothing here, leaving the raw JSON as the only view — the existing,
 * always-correct fallback.
 */
export const DecodedTx = ({ type, subtype, tx }: Props) => {
  const body = asRecord(tx)

  if (type === 'vote') {
    const vote = body.vote as VoteTx | undefined
    if (!vote) return null
    const weightHex = vote.proof?.ca?.bundle?.voteWeight
    const weight = weightHex ? parseInt(weightHex, 16) : undefined
    const encrypted = (vote.encryptionKeyIndexes?.length ?? 0) > 0
    return (
      <DetailGrid>
        <DetailRow label='Election'>
          <ElectionLink processId={vote.processId} />
        </DetailRow>
        <DetailRow label='Vote / nullifier'>
          {vote.nullifier ? <HashDisplay value={vote.nullifier} copyLabel='Nullifier' /> : 'Not exposed (CSP proof)'}
        </DetailRow>
        {weight !== undefined && !Number.isNaN(weight) && <DetailRow label='Vote weight'>{weight}</DetailRow>}
        <DetailRow label='Ballot contents'>
          {encrypted ? 'Encrypted until the election closes and keys are revealed' : 'Not decodable client-side'}
        </DetailRow>
      </DetailGrid>
    )
  }

  if (type === 'newProcess') {
    const np = body.newProcess as NewProcessTx | undefined
    const process = np?.process
    if (!process) return null
    return (
      <DetailGrid>
        <DetailRow label='Election'>
          <ElectionLink processId={process.processId} />
        </DetailRow>
        <DetailRow label='Created by'>
          <AccountLink address={process.entityId} copyLabel='Organization address' />
        </DetailRow>
        <DetailRow label='Census size'>{toNumber(process.maxCensusSize).toLocaleString() || '—'}</DetailRow>
        <DetailRow label='Duration'>
          {process.duration ? `${Math.round(process.duration / 3600)} hours` : '—'}
        </DetailRow>
        <DetailRow label='Census root'>
          <HashDisplay value={process.censusRoot} copyLabel='Census root' />
        </DetailRow>
        <DetailRow label='Initial status'>{process.status ? <StatusTag status={process.status} /> : '—'}</DetailRow>
      </DetailGrid>
    )
  }

  if (type === 'setProcess') {
    const sp = body.setProcess as SetProcessTx | undefined
    if (!sp) return null
    const changed = humanizeTxtype(sp.txtype)
    return (
      <DetailGrid>
        <DetailRow label='Election'>
          <ElectionLink processId={sp.processId} />
        </DetailRow>
        <DetailRow label='What changed'>{changed ?? '—'}</DetailRow>
        {sp.status && (
          <DetailRow label='New status'>
            <StatusTag status={sp.status} />
          </DetailRow>
        )}
        {sp.censusRoot && (
          <DetailRow label='New census root'>
            <HashDisplay value={sp.censusRoot} copyLabel='Census root' />
          </DetailRow>
        )}
        {sp.censusSize !== undefined && <DetailRow label='New census size'>{toNumber(sp.censusSize).toLocaleString()}</DetailRow>}
        {sp.duration !== undefined && <DetailRow label='New duration'>{`${Math.round(sp.duration / 3600)} hours`}</DetailRow>}
      </DetailGrid>
    )
  }

  if (type === 'admin') {
    const admin = body.admin as AdminTx | undefined
    if (!admin) return null
    return (
      <DetailGrid>
        <DetailRow label='Election'>
          <ElectionLink processId={admin.processId} />
        </DetailRow>
        <DetailRow label='Action'>{humanizeTxtype(admin.txtype) ?? '—'}</DetailRow>
        {admin.keyIndex !== undefined && <DetailRow label='Key index'>{admin.keyIndex}</DetailRow>}
        <DetailRow label='Purpose'>
          <Text fontSize='sm'>
            Part of the encrypted-vote workflow: encryption keys are published when the election starts and revealed
            once it ends, so ballots can be tallied.
          </Text>
        </DetailRow>
      </DetailGrid>
    )
  }

  if (type === 'sendTokens') {
    const send = body.sendTokens as SendTokensTx | undefined
    if (!send) return null
    return (
      <DetailGrid>
        <DetailRow label='From'>
          <AccountLink address={send.from} copyLabel='Sender address' />
        </DetailRow>
        <DetailRow label='To'>
          <AccountLink address={send.to} copyLabel='Recipient address' />
        </DetailRow>
        <DetailRow label='Amount'>{toNumber(send.value).toLocaleString()} tokens</DetailRow>
      </DetailGrid>
    )
  }

  if (type === 'setAccount' || type === 'createAccount') {
    const sa = (body.setAccount ?? body.createAccount) as SetAccountTx | undefined
    if (!sa) return null
    const isCreate = subtype === 'create_account'
    return (
      <DetailGrid>
        <DetailRow label='Account'>
          <AccountLink address={sa.account} copyLabel='Account address' />
        </DetailRow>
        <DetailRow label='What happened'>{isCreate ? 'Account created' : humanizeTxtype(sa.txtype) ?? 'Account updated'}</DetailRow>
        {sa.name && <DetailRow label='Name'>{sa.name}</DetailRow>}
        {sa.infoURI && (
          <DetailRow label='Metadata URI'>
            <Text fontSize='sm' wordBreak='break-all'>
              {sa.infoURI}
            </Text>
          </DetailRow>
        )}
      </DetailGrid>
    )
  }

  return null
}
