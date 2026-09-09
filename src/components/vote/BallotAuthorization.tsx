import { HStack, Tag, Text, VStack } from '@chakra-ui/react'
import { LuSignature, LuVenetianMask } from 'react-icons/lu'
import { PageSection } from '~components/shared/PageSection'
import { caProofMeaning } from '~utils/anonymity'

/**
 * How the census authority authorized this one ballot.
 *
 * The election record cannot answer this: both CSP census origins accept both
 * signed and blind-signed proofs, so `proof.ca.type` on the vote transaction is
 * the only authoritative statement that a *particular* ballot is unlinkable.
 * Rendered only for CSP votes — every other census proves membership a
 * different way and has nothing to say here.
 */
export const BallotAuthorization = ({ proofType }: { proofType?: string }) => {
  const meaning = caProofMeaning(proofType)
  if (!meaning) return null

  return (
    <PageSection
      title='How this ballot was authorized'
      subtitle='Taken from the vote transaction’s census proof, not from the election’s configuration.'
    >
      <VStack align='flex-start' gap={3}>
        <HStack gap={3} flexWrap='wrap'>
          <Tag.Root colorPalette={meaning.blind ? 'blue' : 'gray'}>
            <Tag.StartElement>{meaning.blind ? <LuVenetianMask /> : <LuSignature />}</Tag.StartElement>
            <Tag.Label>{meaning.label}</Tag.Label>
          </Tag.Root>
          <Text fontSize='xs' color='texts.subtle' fontFamily='mono'>
            proof.ca.type = {proofType}
          </Text>
        </HStack>
        <Text fontSize='sm'>{meaning.description}</Text>
      </VStack>
    </PageSection>
  )
}
