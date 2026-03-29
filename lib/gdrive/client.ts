/**
 * Google Drive 서비스 계정 클라이언트
 * 파일 업로드 + 버전 관리 ((2), (3) 표기)
 */

import { google } from 'googleapis'

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY 환경변수 필요')
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })
}

/** 파일 업로드 (같은 이름 있으면 (2), (3) 자동 부여) */
export async function uploadToDrive(
  folderId: string,
  fileName: string,
  mimeType: string,
  content: Buffer | string,
): Promise<{ id: string; name: string; url: string }> {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  // 같은 이름 파일 확인
  const existingName = await getVersionedName(drive, folderId, fileName)

  const media = {
    mimeType,
    body: typeof content === 'string'
      ? require('stream').Readable.from([content])
      : require('stream').Readable.from([content]),
  }

  const res = await drive.files.create({
    requestBody: {
      name: existingName,
      parents: [folderId],
    },
    media,
    fields: 'id, name, webViewLink',
  })

  return {
    id: res.data.id ?? '',
    name: res.data.name ?? existingName,
    url: res.data.webViewLink ?? '',
  }
}

/** 폴더 내 같은 이름 확인 → 버전 번호 부여 */
async function getVersionedName(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  baseName: string,
): Promise<string> {
  const ext = baseName.includes('.') ? baseName.slice(baseName.lastIndexOf('.')) : ''
  const nameOnly = baseName.includes('.')
    ? baseName.slice(0, baseName.lastIndexOf('.'))
    : baseName

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and name contains '${nameOnly}'`,
    fields: 'files(name)',
    pageSize: 100,
  })

  const existing = res.data.files?.map(f => f.name ?? '') ?? []

  if (!existing.includes(baseName)) return baseName

  // 버전 번호 찾기
  let version = 2
  while (existing.includes(`${nameOnly}(${version})${ext}`)) {
    version++
  }

  return `${nameOnly}(${version})${ext}`
}

/** 견적서 폴더 ID */
export function getEstimateFolderId(): string {
  return process.env.GOOGLE_DRIVE_FOLDER_ID ?? '1Y5uAIrIFlVmu_SfqHf5RAVpDVUCiFO1U'
}

/** 제안서 폴더 ID */
export function getProposalFolderId(): string {
  return process.env.GOOGLE_DRIVE_PROPOSAL_FOLDER_ID ?? '1hbYG54iUmpFDj2ikpoBOT0oLrJsz2IS4'
}
