import { Box, Button, Flex, Grid, Icon, Input, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuCircleCheck, LuTriangleAlert } from 'react-icons/lu'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '~components/shared/PageHeader'
import { PageSection } from '~components/shared/PageSection'
import { EvidenceChain } from '~components/verify/EvidenceChain'
import { OverwriteNotice } from '~components/verify/OverwriteNotice'
import { ProofActions } from '~components/verify/ProofActions'
import { useHashIds } from '~hooks/useHashIds'
import { useVerification } from '~hooks/useVerification'
import { normalizeId } from '~utils/format'

const VerifyVotePage = () => {
  const navigate = useNavigate()
  // The vote ID is the only thing a voter is ever asked for, and it never
  // touches the path: `/verify#{voteId}`, or `/verify#{electionId}/{voteId}` for
  // the permalink older proofs print. It is a nullifier, so it stays in the
  // fragment where no server sees it. The election, when the URL omits it, is
  // resolved from `GET /votes/{id}`.
  const [first, second] = useHashIds()
  const hashElectionId = second ? first : ''
  const hashVoteId = second ?? first ?? ''

  const [form, setForm] = useState(hashVoteId)
  // What we are actually verifying, as opposed to what is currently typed.
  const [target, setTarget] = useState({ electionId: hashElectionId, voteId: hashVoteId })

  // Arriving by link (or navigating between permalinks) verifies immediately —
  // a voter who followed a receipt link should never have to press a button.
  // The sync is unconditional: navigating to a bare `/verify` (the header link,
  // say) must clear the previous verification too, or the page keeps showing a
  // result its own URL no longer names.
  useEffect(() => {
    setForm(hashVoteId)
    setTarget({ electionId: hashElectionId, voteId: hashVoteId })
  }, [hashElectionId, hashVoteId])

  const verification = useVerification(target.electionId, target.voteId)
  const { electionId, verify, vote, chain, complete, pending } = verification

  const submit = () => {
    const next = normalizeId(form)
    if (!next) return
    navigate(`/verify#${next}`)
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
