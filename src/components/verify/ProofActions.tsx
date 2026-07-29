import { Box, Button, Clipboard, Flex, Icon, Text } from '@chakra-ui/react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { useRef, useState } from 'react'
import { LuDownload, LuTriangleAlert } from 'react-icons/lu'
import type { Verification } from '~hooks/useVerification'
import { parseApiDate, shortHex } from '~utils/format'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * One timestamp format for the whole proof, always UTC and always labelled as
 * such: "29 Jul 2026, 13:45:50 UTC". The on-screen views use the visitor's
 * locale, which is right for a screen and wrong for a document that may be
 * printed in one timezone and read in another.
 */
const formatProofDate = (value?: string | number) => {
  const date = parseApiDate(value)
  if (!date) return 'unknown'
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  return `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${time} UTC`
}

/**
 * The artifact half of the voter journey: something to keep, print, or attach
 * to a complaint.
 *
 * `@react-pdf/renderer` is hundreds of KB, and most visitors only ever want the
 * green check — so both it and the document that uses it are pulled in by a
 * dynamic `import()` on click, never at route load. The QR is generated locally
 * from a hidden canvas: a QR fetched from a remote service would quietly
 * contradict the "you don't have to trust this page" claim the proof makes.
 */
export const ProofActions = ({ verification }: { verification: Verification }) => {
  const { vote, election, block, chain, electionId, voteId, electionMeta, apiUrl, overwriteCount } = verification
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  // The short form keeps the printed URL (and the QR that encodes it) to one
  // identifier; the two-segment permalink in older proofs still resolves.
  const shareUrl = `${window.location.origin}${window.location.pathname}#/verify/${voteId}`
  const verifyEndpoint = `${apiUrl}/votes/verify/${electionId}/${voteId}`

  const download = async () => {
    setBusy(true)
    setFailed(false)
    try {
      const [{ pdf }, { ProofDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('~components/verify/ProofDocument'),
      ])

      const blob = await pdf(
        <ProofDocument
          data={{
            // No metadata title is common for programmatic elections; naming the
            // election by its (truncated) id beats a placeholder that says nothing.
            electionTitle: electionMeta.title ?? `Election ${shortHex(electionId)}`,
            electionId,
            voteId,
            txHash: vote.data?.txHash ?? 'unknown',
            blockHeight: (vote.data?.blockHeight ?? 0).toLocaleString('en-US'),
            blockTime: formatProofDate(block.data?.header.time ?? vote.data?.date),
            chainId: chain.data?.chainId ?? election.data?.chainId ?? 'unknown',
            validatorCount: chain.data?.validatorCount ?? 0,
            verificationUrl: shareUrl,
            apiUrl,
            verifyEndpoint,
            qrDataUrl: canvasRef.current?.toDataURL('image/png'),
            generatedAt: formatProofDate(Date.now()),
            overwriteCount,
          }}
        />
      ).toBlob()

      const href = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.download = `vocdoni-vote-proof-${voteId.slice(0, 8)}.pdf`
      anchor.click()
      URL.revokeObjectURL(href)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Flex gap={6} align='flex-start' direction={{ base: 'column', md: 'row' }}>
      <Box flex='1' minW={0}>
        <Text fontSize='sm' color='texts.subtle' mb={4}>
          Keep a copy of this. The PDF states what the chain recorded, names the block it lives in, and includes
          the exact request anyone can send to check it again — without trusting this page.
        </Text>
        <Flex gap={3} wrap='wrap'>
          <Button onClick={() => void download()} loading={busy} loadingText='Building PDF'>
            <Icon as={LuDownload} /> Download proof (PDF)
          </Button>
          <Clipboard.Root value={shareUrl}>
            <Clipboard.Trigger asChild>
              <Button variant='outline'>
                <Clipboard.Indicator /> Copy verification link
              </Button>
            </Clipboard.Trigger>
          </Clipboard.Root>
        </Flex>
        {failed && (
          <Flex mt={3} gap={2} align='center' color='orange.600'>
            <Icon as={LuTriangleAlert} boxSize={4} />
            <Text fontSize='sm'>The PDF could not be generated in this browser. The evidence above is unaffected.</Text>
          </Flex>
        )}
      </Box>

      <Box textAlign='center'>
        <Box borderWidth='1px' borderColor='border' borderRadius='md' p={3} bg='white' display='inline-block'>
          <QRCodeSVG value={shareUrl} size={128} level='M' />
        </Box>
        <Text fontSize='xs' color='texts.subtle' mt={2} maxW='36'>
          Scan to open this verification on another device
        </Text>
      </Box>

      {/* Off-screen twin of the QR above: canvas is the only variant with
          toDataURL(), which is what the PDF embeds. */}
      <Box position='absolute' left='-9999px' top='0' aria-hidden='true'>
        <QRCodeCanvas ref={canvasRef} value={shareUrl} size={512} level='M' marginSize={2} />
      </Box>
    </Flex>
  )
}
