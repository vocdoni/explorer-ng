import { useQuery } from '@tanstack/react-query'
import { useApi } from '~contexts/ApiContext'
import { electionMetaFrom, useBlock, useChainInfo, useElection, useVote } from '~hooks/useVoconeApi'
import { normalizeId } from '~utils/format'
import { fetchJson } from '~utils/http'

/**
 * The chain's own answer to "is this vote registered?": a bare 200 with an
 * empty body, or an error. Nothing about it can change once it is true, so it
 * is never polled and never retried — a 404 is a real answer, not a hiccup.
 */
export const useVoteVerify = (electionId?: string, voteId?: string) => {
  const { apiUrl } = useApi()
  const url = `${apiUrl}/votes/verify/${electionId}/${voteId}`
  return useQuery({
    queryKey: ['vote-verify', apiUrl, electionId, voteId],
    queryFn: async () => {
      await fetchJson<Record<string, never>>(url)
      return { url, verifiedAt: new Date().toISOString() }
    },
    enabled: !!electionId && !!voteId,
    retry: false,
    staleTime: Infinity,
  })
}

/**
 * Everything the evidence chain needs, as five independent queries.
 *
 * Independence is the point: each step of the chain renders its own spinner and
 * its own failure, so a node that cannot serve `/chain/blocks/{n}` degrades one
 * step rather than blanking a voter's proof.
 *
 * The election ID is optional. `GET /votes/{id}` returns `electionID`, so a
 * voter who kept only the vote ID is served by resolving it for them.
 */
export const useVerification = (electionIdInput?: string, voteIdInput?: string) => {
  const { apiUrl } = useApi()
  const voteId = normalizeId(voteIdInput)
  const givenElectionId = normalizeId(electionIdInput)

  const vote = useVote(voteId)
  const electionId = givenElectionId || normalizeId(vote.data?.electionID)

  const verify = useVoteVerify(electionId, voteId)
  const blockHeight = vote.data?.blockHeight

  // "Complete" means the artifact is worth generating: the chain confirmed the
  // vote and we know where it lives. Block and election lookups are enrichment.
  // Computed before the enrichment queries below so it can gate their polling
  // without depending on the very queries it gates.
  const complete = verify.isSuccess && vote.isSuccess && blockHeight !== undefined

  const election = useElection(electionId, { poll: !complete })
  const block = useBlock(blockHeight !== undefined ? String(blockHeight) : '', { poll: !complete })
  const chain = useChainInfo({ poll: !complete })

  const electionMeta = electionMetaFrom(election.data?.metadata)
  const overwriteCount = vote.data?.overwriteCount ?? 0
  const maxVoteOverwrites = Number((election.data?.tallyMode as Record<string, unknown>)?.maxVoteOverwrites ?? 0)

  return {
    apiUrl,
    voteId,
    electionId,
    vote,
    verify,
    election,
    block,
    chain,
    electionMeta,
    overwriteCount,
    maxVoteOverwrites: Number.isFinite(maxVoteOverwrites) ? maxVoteOverwrites : 0,
    complete,
    /** True while we still cannot say anything at all about this vote. */
    pending: !!voteId && (verify.isLoading || (!givenElectionId && vote.isLoading)),
  }
}

export type Verification = ReturnType<typeof useVerification>

/**
 * The canonical, shareable permalink for a verification.
 *
 * The vote ID sits after the `#` deliberately: it is a nullifier, and the
 * fragment is the only part of a URL that never leaves the browser. This is the
 * link printed into proof PDFs and encoded into their QR codes, so it is also
 * the one that decides whether a voter scanning their receipt announces that
 * nullifier to every hop in between.
 */
export const verificationUrl = (voteId: string) => `${window.location.origin}/verify#${voteId}`
