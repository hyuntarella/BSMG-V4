import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getAuth, getEstimateFolderId, upsertToDrive } from '@/lib/gdrive/client'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const probe = url.searchParams.get('probe') === '1'

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

  const folderId = getEstimateFolderId()

  const meta = {
    email,
    emailLength: email.length,
    emailRawHasSurroundingWs: rawEmail !== email,
    emailHasAtSign: email.includes('@'),
    emailDomain: email.split('@')[1] ?? '',
    rawKeyLength: rawKey.length,
    processedKeyLength: key.length,
    keyStartsWithBegin: key.startsWith('-----BEGIN PRIVATE KEY-----'),
    keyEndsWithEnd: key.trimEnd().endsWith('-----END PRIVATE KEY-----'),
    keyNewlineCount: (key.match(/\n/g) || []).length,
    keyFingerprintSha256First16: fingerprint,
    rawKeyFingerprintSha256First16: rawFingerprint,
    folderId,
    folderIdRaw: process.env.GOOGLE_DRIVE_FOLDER_ID ?? '(fallback)',
    proposalFolderId: (process.env.GOOGLE_DRIVE_PROPOSAL_FOLDER_ID ?? '1hbYG54iUmpFDj2ikpoBOT0oLrJsz2IS4').trim(),
  }

  let auth
  try {
    auth = getAuth()
    const tokens = await auth.authorize()
    const base = {
      ok: true,
      meta,
      tokenReceived: !!tokens.access_token,
      tokenExpiresIn: tokens.expiry_date
        ? Math.round((tokens.expiry_date - Date.now()) / 1000)
        : null,
    }

    if (!probe) return NextResponse.json(base)

    // ── probe: 실제 Drive 업로드/삭제 테스트 ──
    const drive = google.drive({ version: 'v3', auth })
    const probeFileName = `_diag_probe_${Date.now()}.txt`
    const probeContent = `diagnostic probe at ${new Date().toISOString()}`

    let probeStep = 'upload'
    try {
      const uploaded = await upsertToDrive(
        folderId,
        probeFileName,
        'text/plain',
        probeContent,
      )

      probeStep = 'delete'
      await drive.files.delete({ fileId: uploaded.id })

      return NextResponse.json({
        ...base,
        probe: { ok: true, fileName: probeFileName, uploadedId: uploaded.id },
      })
    } catch (probeErr) {
      const msg = probeErr instanceof Error ? probeErr.message : String(probeErr)
      console.error(`[diag/gdrive probe] step=${probeStep} err=${msg}`)
      if (probeErr instanceof Error && probeErr.stack) console.error(probeErr.stack)
      return NextResponse.json({
        ...base,
        probe: { ok: false, step: probeStep, error: msg },
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[diag/gdrive] auth failed:', msg)
    if (err instanceof Error && err.stack) console.error(err.stack)
    return NextResponse.json({ ok: false, meta, error: msg })
  }
}
