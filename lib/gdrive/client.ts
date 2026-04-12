/**
 * Google Drive 서비스 계정 클라이언트
 * 파일 업로드 + upsert(덮어쓰기) + 버전 관리
 */

import { google } from 'googleapis'

export function getAuth() {
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

/** 폴더 내 파일 이름으로 검색 → 첫 번째 매칭 파일 ID 반환 */
async function findFileByName(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  fileName: string,
): Promise<string | null> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and name = '${fileName.replace(/'/g, "\\'")}'`,
    fields: 'files(id)',
    pageSize: 1,
  })
  return res.data.files?.[0]?.id ?? null
}

/**
 * 파일 upsert: 같은 이름 파일이 있으면 내용 덮어쓰기, 없으면 신규 생성
 */
export async function upsertToDrive(
  folderId: string,
  fileName: string,
  mimeType: string,
  content: Buffer | string,
): Promise<{ id: string; name: string; url: string }> {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const { Readable } = await import('stream')

  const body = Readable.from([typeof content === 'string' ? Buffer.from(content) : content])
  const media = { mimeType, body }

  const existingId = await findFileByName(drive, folderId, fileName)

  if (existingId) {
    // 기존 파일 업데이트
    const res = await drive.files.update({
      fileId: existingId,
      media,
      fields: 'id, name, webViewLink',
    })
    return {
      id: res.data.id ?? existingId,
      name: res.data.name ?? fileName,
      url: res.data.webViewLink ?? '',
    }
  }

  // 신규 생성
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media,
    fields: 'id, name, webViewLink',
  })
  return {
    id: res.data.id ?? '',
    name: res.data.name ?? fileName,
    url: res.data.webViewLink ?? '',
  }
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

  const { Readable } = await import('stream')
  const media = {
    mimeType,
    body: Readable.from([typeof content === 'string' ? Buffer.from(content) : content]),
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
