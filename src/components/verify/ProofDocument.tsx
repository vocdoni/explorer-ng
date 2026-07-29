import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

/**
 * Everything the proof states, resolved to plain strings before it gets here.
 *
 * The document is deliberately data-only: no hooks, no react-query, no theme.
 * That is what lets the whole `@react-pdf/renderer` dependency — and this file
 * with it — stay out of the main bundle until someone clicks download.
 */
export interface ProofData {
  electionTitle: string
  electionId: string
  voteId: string
  txHash: string
  blockHeight: string
  blockTime: string
  chainId: string
  validatorCount: number
  verificationUrl: string
  apiUrl: string
  verifyEndpoint: string
  qrDataUrl?: string
  generatedAt: string
  overwriteCount: number
}

/**
 * react-pdf hyphenates on wrap by default, so a 64-character election id comes
 * out as "…aadd-cde…". Someone retyping an identifier off a printed proof has
 * no way to know that hyphen is not part of the value, so hyphenation is off
 * everywhere and long values are chunked by hand instead (see `chunk`).
 */
Font.registerHyphenationCallback((word) => [word])

const GRAY = '#6b6b6b'
const RULE = '#d4d4d4'
const INK = '#111111'

const styles = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 64, paddingHorizontal: 48, fontSize: 10, fontFamily: 'Helvetica', color: INK },

  wordmark: { fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 3, color: INK },
  title: { fontSize: 19, fontFamily: 'Helvetica-Bold', marginTop: 6 },
  headerMeta: { fontSize: 9, color: GRAY, marginTop: 6 },
  headerRule: { borderBottomWidth: 1, borderBottomColor: INK, marginTop: 10, marginBottom: 16 },

  columns: { flexDirection: 'row', marginBottom: 12 },
  fields: { flex: 1, paddingRight: 24 },
  field: { marginBottom: 10 },
  label: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY, letterSpacing: 1.2, marginBottom: 3 },
  value: { fontSize: 10.5, lineHeight: 1.3 },
  mono: { fontSize: 9, fontFamily: 'Courier', lineHeight: 1.35 },

  qrColumn: { width: 148, alignItems: 'center' },
  qrBox: { borderWidth: 1, borderColor: RULE, padding: 8, borderRadius: 4 },
  qr: { width: 124, height: 124 },
  qrCaption: { fontSize: 7.5, color: GRAY, marginTop: 6, textAlign: 'center' },

  sectionRule: { borderBottomWidth: 1, borderBottomColor: RULE, marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  paragraph: { fontSize: 9.5, lineHeight: 1.5, textAlign: 'left', marginBottom: 10 },

  codeBox: { backgroundColor: '#f4f4f4', borderRadius: 3, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 6 },
  codeCaption: { fontSize: 7.5, color: GRAY },

  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 8,
  },
  footerText: { fontSize: 7.5, color: GRAY, lineHeight: 1.4, textAlign: 'left' },
})

/** Split a value into fixed-width segments so react-pdf never has to wrap it. */
const chunk = (value: string, size: number): string[] => {
  if (!value) return ['—']
  const out: string[] = []
  for (let i = 0; i < value.length; i += size) out.push(value.slice(i, i + size))
  return out
}

/**
 * Break a URL onto several lines at path boundaries, so each line still reads
 * as a URL fragment rather than an arbitrary cut. Any single segment that is
 * still too wide falls back to hard chunking.
 */
const splitUrl = (url: string, max: number): string[] => {
  if (!url) return ['—']
  if (url.length <= max) return [url]

  const lines: string[] = []
  let current = ''
  url.split('/').forEach((part, index) => {
    const piece = index === 0 ? part : `/${part}`
    if (current && current.length + piece.length > max) {
      lines.push(current)
      current = piece
    } else {
      current += piece
    }
  })
  if (current) lines.push(current)

  return lines.flatMap((line) => (line.length > max ? chunk(line, max) : [line]))
}

const MonoLines = ({ lines }: { lines: string[] }) => (
  <>
    {lines.map((line, index) => (
      <Text key={index} style={styles.mono}>
        {line}
      </Text>
    ))}
  </>
)

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
)

const TextField = ({ label, value }: { label: string; value: string }) => (
  <Field label={label}>
    <Text style={styles.value}>{value || '—'}</Text>
  </Field>
)

const HexField = ({ label, value }: { label: string; value: string }) => (
  <Field label={label}>
    <MonoLines lines={chunk(value, 32)} />
  </Field>
)

/**
 * The document tree, as a pure function of its data — no React component
 * wrapper, so it can be rendered from Node (or a test) without a DOM.
 */
export const buildProofDocument = (data: ProofData) => (
  <Document
    title={`Vote registration proof ${data.voteId.slice(0, 8)}`}
    author='Vocdoni explorer'
    subject={`Vote ${data.voteId}`}
  >
    <Page size='A4' style={styles.page}>
      <Text style={styles.wordmark}>VOCDONI</Text>
      <Text style={styles.title}>Vote registration proof</Text>
      <Text style={styles.headerMeta}>Generated {data.generatedAt}</Text>
      <View style={styles.headerRule} />

      <View style={styles.columns}>
        <View style={styles.fields}>
          <TextField label='ELECTION' value={data.electionTitle} />
          <HexField label='ELECTION ID' value={data.electionId} />
          <HexField label='VOTE ID' value={data.voteId} />
          <HexField label='TRANSACTION' value={data.txHash} />
          <TextField label='BLOCK' value={data.blockHeight} />
          <TextField label='BLOCK TIME' value={data.blockTime} />
          <TextField label='CHAIN' value={data.chainId} />
          {data.overwriteCount > 0 ? (
            <TextField
              label='BALLOT CHANGES'
              value={`Changed ${data.overwriteCount} time${data.overwriteCount === 1 ? '' : 's'}. This is the ballot that counted.`}
            />
          ) : null}
        </View>

        <View style={styles.qrColumn}>
          <View style={styles.qrBox}>
            {data.qrDataUrl ? <Image src={data.qrDataUrl} style={styles.qr} /> : <View style={styles.qr} />}
          </View>
          <Text style={styles.qrCaption}>Scan to re-verify</Text>
        </View>
      </View>

      <View style={styles.sectionRule} />
      <Text style={styles.sectionTitle}>What this proves</Text>
      <Text style={styles.paragraph}>
        This document records that a ballot with the identifier above was accepted by the Vocdoni blockchain and
        permanently stored in block {data.blockHeight} of chain {data.chainId} on {data.blockTime}. It does not reveal
        how you voted, and it cannot be used to prove your identity.
      </Text>
      <Text style={styles.paragraph}>
        Anyone — including you, years from now — can confirm this independently, without trusting this document or the
        site that produced it: scan the QR code, or send the request below to any Vocdoni node. A response of HTTP 200
        means the vote is recorded. Because the record lives on a chain replicated across {data.validatorCount}{' '}
        independent validators, no single party — not the election organizer, not Vocdoni — can remove or alter it.
      </Text>

      <View style={styles.sectionRule} />
      <Text style={styles.sectionTitle}>Re-verify it yourself</Text>
      <Text style={styles.label}>VERIFICATION PAGE</Text>
      <View style={styles.codeBox}>
        <MonoLines lines={splitUrl(data.verificationUrl, 78)} />
      </View>
      <Text style={styles.label}>API REQUEST — ANY VOCDONI NODE</Text>
      <View style={styles.codeBox}>
        <MonoLines lines={splitUrl(`GET ${data.verifyEndpoint}`, 78)} />
      </View>
      <Text style={styles.codeCaption}>Line breaks are for printing only. Each value is a single unbroken URL.</Text>

      {/* `fixed` keeps the footer pinned to the bottom of every page instead of
          being laid out in the flow, where it would push a blank second page. */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>
          Generated {data.generatedAt} by the Vocdoni explorer. This document is a record, not a credential — it does
          not reveal how you voted and cannot be used to prove your identity.
        </Text>
      </View>
    </Page>
  </Document>
)

export const ProofDocument = ({ data }: { data: ProofData }) => buildProofDocument(data)

export default ProofDocument
