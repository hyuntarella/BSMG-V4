/**
 * Google Drive API를 이용한 XLSX → PDF 변환
 *
 * 흐름: XLSX 업로드 → Google Sheets로 복사(변환) → PDF export → PDF 업로드 → 중간 시트 삭제
 */

import { google } from 'googleapis'
import { Readable } from 'stream'
import { getAuth } from '@/lib/gdrive/client'

/**
 * XLSX Buffer를 Drive에 업로드 후 PDF로 변환하여 반환
 *
 * @returns PDF Buffer
 */
export async function convertXlsxToPdf(
  xlsxBuffer: Buffer,
  fileName: string,
  folderId: string,
): Promise<Buffer> {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  // 1. XLSX를 Drive에 업로드 (Google Sheets로 자동 변환)
  const uploadRes = await drive.files.create({
    requestBody: {
      name: fileName.replace(/\.xlsx$/i, ''),
      parents: [folderId],
      mimeType: 'application/vnd.google-apps.spreadsheet',
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: Readable.from([xlsxBuffer]),
    },
    fields: 'id',
    supportsAllDrives: true,
  })

  const sheetFileId = uploadRes.data.id
  if (!sheetFileId) {
    throw new Error('Google Sheets 변환 실패: 파일 ID 없음')
  }

  try {
    // 2. Google Sheets → PDF export
    const pdfRes = await drive.files.export(
      { fileId: sheetFileId, mimeType: 'application/pdf' },
      { responseType: 'arraybuffer' },
    )

    const pdfBuffer = Buffer.from(pdfRes.data as ArrayBuffer)
    return pdfBuffer
  } finally {
    // 3. 중간 Google Sheets 삭제 (성공/실패 무관)
    try {
      await drive.files.delete({ fileId: sheetFileId, supportsAllDrives: true })
    } catch (err) {
      console.warn('[convert] 중간 Google Sheets 삭제 실패:', err)
    }
  }
}
