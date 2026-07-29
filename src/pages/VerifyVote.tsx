import { Box, Button, Flex, Grid, Icon, Input, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuCircleCheck, LuTriangleAlert } from 'react-icons/lu'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { EvidenceChain } from '~components/verify/EvidenceChain'
import { OverwriteNotice } from '~components/verify/OverwriteNotice'
import { ProofActions } from '~components/verify/ProofActions'
import { normalizeId, useVerification } from '~hooks/useVerification'

const VerifyVotePage = () => {
  const params = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  // The vote ID is the only thing a voter is ever asked for. It arrives three
  // ways: `/verify/{voteId}` (the explorer.vote-compatible short form), the
  // legacy `/verify/{electionId}/{voteId}` permalink printed in older proofs,
  // and `?vote=` from the dashboard hero. The election, when not in the URL, is
  // resolved from `GET /votes/{id}`.
  const queryVoteId = search.get('vote') ?? undefined
  const initialVoteId = params.voteId ?? queryVoteId ?? ''

  const [form, setForm] = useState(initialVoteId)
  // What we are actually verifying, as opposed to what is currently typed.
  const [target, setTarget] = useState({
    electionId: normalizeId(params.electionId),
    voteId: normalizeId(initialVoteId),
  })

  // Arriving by link (or navigating between permalinks) verifies immediately —
  // a voter who followed a receipt link should never have to press a button.
  useEffect(() => {
    const incoming = params.voteId ?? queryVoteId
    if (!incoming) return
    setForm(incoming)
    setTarget({ electionId: normalizeId(params.electionId), voteId: normalizeId(incoming) })
  }, [params.electionId, params.voteId, queryVoteId])

  const verification = useVerification(target.electionId, target.voteId)
  const { electionId, voteId, verify, vote, chain, complete, pending } = verification

  // A `?vote=` arrival becomes the canonical short permalink once it verifies.
  // Two-segment URLs are left alone: rewriting them would break the back button
  // for proofs already in circulation.
  useEffect(() => {
    if (!voteId || !queryVoteId || params.voteId) return
    if (!verify.isSuccess) return
    navigate(`/verify/${voteId}`, { replace: true })
  }, [voteId, queryVoteId, params.voteId, verify.isSuccess, navigate])

  const submit = () => {
    const next = normalizeId(form)
    if (!next) return
    navigate(`/verify/${next}`)
  }

  // A vote ID with no election attached is a dead end in the same way a 404 on
  // the verify endpoint is, so both surface the same honest panel.
  const unresolvedElection = !electionId && vote.isError
  const failed = verify.isError || unresolvedElection
  const avgBlockSecs = ((chain.data?.blockTime ?? []).find((ms) => ms > 0) ?? 0) / 1000

  return (
    <Grid gap={6}>
      <PageHeader
        title='Verify a vote'
        subtitle='Check that your ballot reached the blockchain, see the evidence behind it, and download a proof you can keep.'
      />

      <PageSection title='Your vote receipt'>
        <Text mb={3} fontSize='sm' color='texts.subtle'>
          A Vote ID is the one-time code your voting app showed you after you voted. It proves the ballot was cast
          without revealing who you are or how you voted. It is all we need — the election it belongs to is looked up
          for you.
        </Text>
        <Stack direction={{ base: 'column', md: 'row' }} gap={3}>
          <Input
            placeholder='Vote ID'
            aria-label='Vote ID'
            fontFamily='mono'
            fontSize='sm'
            value={form}
            onChange={(e) => setForm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <Button onClick={submit} disabled={!normalizeId(form) || pending} loading={pending}>
            Verify
          </Button>
        </Stack>
      </PageSection>

      {verify.isSuccess && (
        <Box borderWidth='1px' borderColor='green.500' bg='green.subtle' borderRadius='md' p={6}>
          <Flex align='center' gap={3}>
            <Icon as={LuCircleCheck} boxSize={8} color='green.600' />
            <Box>
              <Text fontWeight='bold' fontSize='lg'>
                Your vote was counted
              </Text>
              <Text fontSize='sm' color='texts.subtle'>
                The Vocdoni chain confirms this ballot is registered and permanently stored.
              </Text>
            </Box>
          </Flex>
        </Box>
      )}

      {target.voteId && !failed && (
        <PageSection title='The evidence' subtitle='Every claim below links to the record it came from.'>
          <EvidenceChain verification={verification} />
        </PageSection>
      )}

      {verify.isSuccess && (
        <OverwriteNotice
          overwriteCount={verification.overwriteCount}
          maxVoteOverwrites={verification.maxVoteOverwrites}
        />
      )}

      {complete && (
        <PageSection title='Keep the proof'>
          <ProofActions verification={verification} />
        </PageSection>
      )}

      {failed && (
        <Box borderWidth='1px' borderColor='orange.500' bg='orange.subtle' borderRadius='md' p={6}>
          <Flex align='flex-start' gap={3}>
            <Icon as={LuTriangleAlert} boxSize={8} color='orange.600' />
            <Box>
              <Text fontWeight='bold' fontSize='lg' mb={2}>
                We could not confirm this vote
              </Text>
              <Text fontSize='sm' mb={2} color='texts.subtle'>
                That does not necessarily mean anything went wrong. The three usual reasons:
              </Text>
              <Stack as='ul' gap={1} pl={4} fontSize='sm' color='texts.subtle'>
                <li>A character is missing or mistyped — vote IDs are 64 hex characters.</li>
                <li>The ID belongs to a chain this explorer is not connected to.</li>
                <li>
                  The ballot was cast seconds ago and is not in a block yet. Blocks are sealed roughly every{' '}
                  {avgBlockSecs > 0 ? `${avgBlockSecs.toFixed(0)} seconds` : '10 seconds'} — try again shortly.
                </li>
              </Stack>
              {verify.error instanceof Error && (
                <Text mt={3} fontSize='xs' fontFamily='mono' color='texts.subtle'>
                  {verify.error.message}
                </Text>
              )}
            </Box>
          </Flex>
        </Box>
      )}
    </Grid>
  )
}

export default VerifyVotePage
