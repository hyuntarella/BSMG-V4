import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getAuth } from '@/lib/gdrive/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? ''
  const email = rawEmail.trim()
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? ''
  const key = rawKey
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/^["']|["']$/g, '')
    .trim()

  const fingerprint = key
    ? createHash('sha256').update(key).digest('hex').slice(0, 16)
    : ''
  const rawFingerprint = rawKey
    ? createHash('sha256').update(rawKey).digest('hex').slice(0, 16)
    : ''

  const meta = {
    email,
    emailLength: email.length,
    emailRawHasSurroundingWs: rawEmail !== email,
    emailHasAtSign: email.includes('@'),
    emailDomain: email.split('@')[1] ?? '',
    rawKeyLength: rawKey.length,
    processedKeyLength: key.length,
    keyStartsWithBegin: key.startsWith('-----BEGIN PRIVATE KEY-----'),
    keyEndsWithEnd:
      key.endsWith('-----END PRIVATE KEY-----') ||
      key.endsWith('-----END PRIVATE KEY-----\n'),
    keyNewlineCount: (key.match(/\n/g) || []).length,
    keyFingerprintSha256First16: fingerprint,
    rawKeyFingerprintSha256First16: rawFingerprint,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID ?? '(fallback)',
    proposalFolderId: process.env.GOOGLE_DRIVE_PROPOSAL_FOLDER_ID ?? '(fallback)',
  }

  try {
    const auth = getAuth()
    const tokens = await auth.authorize()
    return NextResponse.json({
      ok: true,
      meta,
      tokenReceived: !!tokens.access_token,
      tokenExpiresIn: tokens.expiry_date
        ? Math.round((tokens.expiry_date - Date.now()) / 1000)
        : null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[diag/gdrive] auth failed:', msg)
    if (err instanceof Error && err.stack) console.error(err.stack)
    return NextResponse.json({ ok: false, meta, error: msg })
  }
}
