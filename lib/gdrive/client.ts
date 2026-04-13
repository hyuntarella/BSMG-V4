/**
 * Google Drive 서비스 계정 클라이언트
 * 파일 업로드 + upsert(덮어쓰기) + 버전 관리
 */

import { google } from 'googleapis'
import { Readable } from 'stream'

export function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/^["']|["']$/g, '').trim()

  if (!email || !key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY 환경변수 필요')
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  })
}

/**
 * 파일을 '링크가 있는 모든 사용자 — 뷰어' 로 공유.
 *
 * 왜 필요한가:
 *   서비스 계정이 생성한 파일의 소유자는 서비스 계정 자신이라,
 *   권한 부여 없이 webViewLink 로 접근하면 Google 로그인 프롬프트가 뜬다.
 *   이 헬퍼가 생성/업데이트 직후 anyone reader 권한을 부여해 링크 공유를 보장.
 *
 * 보안 절충안:
 *   type='anyone' 은 링크가 있으면 누구나 접근 가능. 견적서는 내부용 민감 자료라
 *   이상적이지 않지만, 링크는 서비스 계정/사원만 접근하는 Drive 폴더의 webViewLink
 *   이므로 유출 경로는 제한적. 완전 보안은 PDF buffer stream 전환 (별건 hotfix) 로.
 *
 * 멱등성: Drive 는 파일당 단 하나의 'anyone' 권한만 유지. 중복 호출 시 기존 권한을
 *   반환하거나 갱신할 뿐 중복 생성되지 않는다. 실패는 경고 로그만 남기고 통과 —
 *   제한된 Shared Drive 처럼 조직 정책으로 anyone 공유가 막힌 환경에서도 파일
 *   생성 자체는 성공하도록.
 */
async function ensureAnyoneReader(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
): Promise<void> {
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    })
  } catch (err) {
    console.warn('[gdrive] anyone reader 권한 부여 실패:', err)
  }
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
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
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

  const body = Readable.from([typeof content === 'string' ? Buffer.from(content) : content])
  const media = { mimeType, body }

  const existingId = await findFileByName(drive, folderId, fileName)

  if (existingId) {
    // 기존 파일 업데이트
    const res = await drive.files.update({
      fileId: existingId,
      media,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    })
    const id = res.data.id ?? existingId
    await ensureAnyoneReader(drive, id)
    return {
      id,
      name: res.data.name ?? fileName,
      url: res.data.webViewLink ?? '',
    }
  }

  // 신규 생성
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media,
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  })
  const id = res.data.id ?? ''
  if (id) await ensureAnyoneReader(drive, id)
  return {
    id,
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
    supportsAllDrives: true,
  })

  const id = res.data.id ?? ''
  if (id) await ensureAnyoneReader(drive, id)
  return {
    id,
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
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
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
  return (process.env.GOOGLE_DRIVE_FOLDER_ID ?? '1Y5uAIrIFlVmu_SfqHf5RAVpDVUCiFO1U').trim()
}

/** 제안서 폴더 ID */
export function getProposalFolderId(): string {
  return (process.env.GOOGLE_DRIVE_PROPOSAL_FOLDER_ID ?? '1hbYG54iUmpFDj2ikpoBOT0oLrJsz2IS4').trim()
}
