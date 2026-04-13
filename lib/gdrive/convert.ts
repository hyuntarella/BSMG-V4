/**
 * Google Drive API를 이용한 XLSX → PDF 변환
 *
 * 흐름: XLSX 업로드 (Sheets 로 자동 변환) → docs.google.com export URL 로 PDF GET → 중간 시트 삭제
 *
 * 왜 URL export 인가:
 *   drive.files.export 는 PDF 인쇄 옵션 파라미터를 받지 않아, Google Sheets 기본
 *   인쇄 설정 (portrait, Normal scale) 로 PDF 를 뽑는다. XLSX 의 pageSetup.orientation
 *   은 Sheets import 시점에 유실되므로, enforceLandscape() 로 주입한 landscape 설정이
 *   PDF 에 반영되지 않는다.
 *   docs.google.com/spreadsheets/d/{id}/export 엔드포인트만이 portrait/size/fit 등
 *   인쇄 옵션을 query 로 받는다.
 */

import { google } from 'googleapis'
import { Readable } from 'stream'
import { getAuth } from '@/lib/gdrive/client'

/** Sheets export PDF 기본 옵션 — landscape A4 fit-to-page. */
const PDF_EXPORT_PARAMS = {
  format: 'pdf',
  portrait: 'false',          // landscape
  size: 'A4',
  fitw: 'true',               // fit to width
  gridlines: 'false',
  horizontal_alignment: 'CENTER',
  scale: '4',                 // 4 = Fit to page (1=Normal, 2=FitWidth, 3=FitHeight)
} as const

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
    // 2. docs.google.com export URL 로 PDF GET (landscape 옵션 반영)
    const accessToken = await auth.getAccessToken()
    const token = typeof accessToken === 'string' ? accessToken : accessToken?.token
    if (!token) {
      throw new Error('Google 인증 토큰 획득 실패')
    }

    const params = new URLSearchParams(PDF_EXPORT_PARAMS)
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetFileId}/export?${params.toString()}`

    const pdfRes = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!pdfRes.ok) {
      const bodyText = await pdfRes.text().catch(() => '')
      throw new Error(`PDF export 실패 (${pdfRes.status}): ${bodyText.slice(0, 200)}`)
    }

    const arrayBuffer = await pdfRes.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } finally {
    // 3. 중간 Google Sheets 삭제 (성공/실패 무관)
    try {
      await drive.files.delete({ fileId: sheetFileId, supportsAllDrives: true })
    } catch (err) {
      console.warn('[convert] 중간 Google Sheets 삭제 실패:', err)
    }
  }
}
