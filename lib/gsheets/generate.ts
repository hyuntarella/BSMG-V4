/**
 * Phase 5 — Google Sheets 네이티브 템플릿 기반 견적서 생성
 *
 * 흐름:
 *   1. drive.files.copy(템플릿) → 작업용 사본 생성
 *   2. spreadsheets.batchUpdate (구조 + 서식, 단일 호출):
 *      - insertDimension (items > 11 시 행 삽입)
 *      - repeatCell (B7..B(7+N-1) wrapStrategy=WRAP — PM 회귀 [1])
 *      - updateCells (D19 특기사항 RichText 빨간 볼드 첫 줄 — PM 회귀 [3])
 *   3. spreadsheets.values.batchUpdate (셀 값 일괄):
 *      - 갑지 D6/D7/D8/D9/J9/E11 (E11=toKoreanAmount — PM 회귀 [2] NUMBERSTRING 미지원 회피)
 *      - 을지 C3 + 11×12 = 133 셀
 *   4. docs.google.com/spreadsheets/d/{id}/export?format=pdf
 *   5. drive.files.export(mimeType=xlsx)
 *   6. drive.files.delete (작업용 사본 정리, finally)
 *
 * PM 회귀 (UAT 1차) 대응:
 *   [1] 품명 셀 침범: 템플릿 B열 wrap 이 일관되지 않음 (일부 OVERFLOW_CELL).
 *       repeatCell 로 B열 전 품목 행에 wrapStrategy=WRAP 강제.
 *   [2] 갑지 #NAME?: NUMBERSTRING 은 Excel 한국어판 전용, Sheets 미지원.
 *       toKoreanAmount(grandTotal) 직접 계산 후 E11 plain string 주입.
 *   [3] 빨간 볼드 유실: values.batchUpdate 가 textFormatRuns 보존 안 함.
 *       D19 만 spreadsheets.batchUpdate.updateCells 로 RichText 명시 주입.
 *
 * Sheets API 호출 횟수: 견적서 1건 = copy(1) + spreadsheets.batchUpdate(1) +
 *   values.batchUpdate(1) + PDF export(1) + xlsx export(1) + delete(1) = 6 calls.
 *   복합/우레탄 양쪽 = 12 calls. quota 60/min/project 대비 충분히 여유.
 */
import type { Estimate, EstimateSheet, EstimateItem, Method } from '@/lib/estimate/types'
import { getDriveClient, getSheetsClient, getTemplateId } from '@/lib/gsheets/client'
import { getAuth } from '@/lib/gdrive/client'
import { calc } from '@/lib/estimate/calc'
import { toKoreanAmount } from '@/lib/utils/numberToKorean'

// ── 셀 매핑 (PoC + UAT 1차 검증 후 좌표) ──
const COVER_SHEET = 'Sheet1 (2)'   // 갑지
const DETAIL_SHEET = 'Sheet2'      // 을지

const ITEM_START_ROW = 7           // 1-based
const ITEM_TEMPLATE_ZONE = 11      // 7..17
const SUMMARY_FIRST_ROW = 18       // 소계
const SPECIAL_NOTE_ROW = 19        // D19 — 특기사항 (RichText)

const PDF_EXPORT_PARAMS = {
  format: 'pdf',
  portrait: 'false',
  size: 'A4',
  fitw: 'true',
  gridlines: 'false',
  horizontal_alignment: 'CENTER',
  scale: '4',
} as const

interface ValueRange {
  range: string
  values: (string | number)[][]
}

function buildSpecialNote(sheet: EstimateSheet, memo: string): string {
  return (
    `  1. 하자보수기간 ${sheet.warranty_years}년 (하자이행증권 ${sheet.warranty_bond}년)\n` +
    `  2. 견적서 제출 30일 유효\n` +
    `  3. ${memo}`
  )
}

/**
 * 갑지 (Sheet1) 셀 주입 데이터 — D19 제외 (별도 RichText 주입).
 * E11 한글금액은 NUMBERSTRING 미지원 회피로 toKoreanAmount 결과 직접 주입.
 */
function buildCoverInjections(estimate: Estimate, koreanAmount: string): ValueRange[] {
  return [
    { range: `${COVER_SHEET}!D6`, values: [[estimate.mgmt_no ?? '']] },
    { range: `${COVER_SHEET}!D7`, values: [[estimate.date ?? '']] },
    { range: `${COVER_SHEET}!D8`, values: [[estimate.customer_name ? `${estimate.customer_name} 귀하` : '귀하']] },
    { range: `${COVER_SHEET}!D9`, values: [[estimate.site_name ?? '방수공사']] },
    { range: `${COVER_SHEET}!J9`, values: [[estimate.site_name ?? '']] },
    { range: `${COVER_SHEET}!E11`, values: [[koreanAmount]] },
  ]
}

function buildDetailInjections(estimate: Estimate, sheet: EstimateSheet, items: EstimateItem[]): ValueRange[] {
  const c3Title = sheet.type === '복합'
    ? `${estimate.site_name ?? '방수공사'} 이중복합방수 3.8mm (제 1안)`
    : `${estimate.site_name ?? '방수공사'} 우레탄방수 3mm (제 2안)`

  const data: ValueRange[] = [
    { range: `${DETAIL_SHEET}!C3`, values: [[c3Title]] },
  ]

  const totalRows = Math.max(items.length, ITEM_TEMPLATE_ZONE)
  for (let i = 0; i < totalRows; i++) {
    const r = ITEM_START_ROW + i
    const item = items[i]
    if (item) {
      data.push(
        { range: `${DETAIL_SHEET}!B${r}`, values: [[item.name]] },
        { range: `${DETAIL_SHEET}!C${r}`, values: [[item.spec || '']] },
        { range: `${DETAIL_SHEET}!D${r}`, values: [[item.unit]] },
        { range: `${DETAIL_SHEET}!E${r}`, values: [[item.qty > 0 ? item.qty : '']] },
        { range: `${DETAIL_SHEET}!F${r}`, values: [[item.mat > 0 ? item.mat : '']] },
        { range: `${DETAIL_SHEET}!H${r}`, values: [[item.labor > 0 ? item.labor : '']] },
        { range: `${DETAIL_SHEET}!J${r}`, values: [[item.exp > 0 ? item.exp : '']] },
        { range: `${DETAIL_SHEET}!G${r}`, values: [[`=E${r}*F${r}`]] },
        { range: `${DETAIL_SHEET}!I${r}`, values: [[`=E${r}*H${r}`]] },
        { range: `${DETAIL_SHEET}!K${r}`, values: [[`=E${r}*J${r}`]] },
        { range: `${DETAIL_SHEET}!L${r}`, values: [[`=F${r}+H${r}+J${r}`]] },
        { range: `${DETAIL_SHEET}!M${r}`, values: [[`=G${r}+I${r}+K${r}`]] },
      )
    } else {
      for (const col of ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']) {
        data.push({ range: `${DETAIL_SHEET}!${col}${r}`, values: [['']] })
      }
    }
  }
  return data
}

async function getSheetIds(spreadsheetId: string): Promise<{ cover: number; detail: number }> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties(sheetId,title))' })
  const all = res.data.sheets ?? []
  const find = (title: string) => {
    const s = all.find(s => s.properties?.title === title)
    if (s?.properties?.sheetId === undefined || s.properties.sheetId === null) {
      throw new Error(`시트 "${title}" 를 찾을 수 없음`)
    }
    return s.properties.sheetId
  }
  return { cover: find(COVER_SHEET), detail: find(DETAIL_SHEET) }
}

/**
 * 구조 + 서식 변경 요청 생성:
 *   1) insertDimension (items > 11)
 *   2) repeatCell — B7..B(7+totalRows-1) wrap=WRAP
 *   3) updateCells — D19 특기사항 RichText (첫 줄 빨간 볼드)
 */
function buildStructuralRequests(
  sheetIds: { cover: number; detail: number },
  totalRows: number,
  extraRows: number,
  specialNote: string,
): object[] {
  const requests: object[] = []

  if (extraRows > 0) {
    const startIndex = SUMMARY_FIRST_ROW - 1
    requests.push({
      insertDimension: {
        range: { sheetId: sheetIds.detail, dimension: 'ROWS', startIndex, endIndex: startIndex + extraRows },
        inheritFromBefore: true,
      },
    })
  }

  // B 열 (col index 1) 전 품목 행 wrap 강제
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetIds.detail,
        startRowIndex: ITEM_START_ROW - 1,
        endRowIndex: ITEM_START_ROW - 1 + totalRows,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      cell: { userEnteredFormat: { wrapStrategy: 'WRAP' } },
      fields: 'userEnteredFormat.wrapStrategy',
    },
  })

  // D19 RichText — 첫 \n 까지 빨간 볼드, 이후 plain black
  const firstNewline = specialNote.indexOf('\n')
  const firstLineEnd = firstNewline >= 0 ? firstNewline : specialNote.length
  requests.push({
    updateCells: {
      range: {
        sheetId: sheetIds.cover,
        startRowIndex: SPECIAL_NOTE_ROW - 1,
        endRowIndex: SPECIAL_NOTE_ROW,
        startColumnIndex: 3,
        endColumnIndex: 4,
      },
      rows: [{
        values: [{
          userEnteredValue: { stringValue: specialNote },
          textFormatRuns: [
            {
              startIndex: 0,
              format: { bold: true, fontSize: 12, foregroundColorStyle: { rgbColor: { red: 1, green: 0, blue: 0 } } },
            },
            {
              startIndex: firstLineEnd,
              format: { bold: false, fontSize: 12, foregroundColorStyle: { rgbColor: { red: 0, green: 0, blue: 0 } } },
            },
          ],
        }],
      }],
      fields: 'userEnteredValue,textFormatRuns',
    },
  })

  return requests
}

async function getAccessToken(): Promise<string> {
  const tok = await getAuth().getAccessToken()
  const token = typeof tok === 'string' ? tok : tok?.token
  if (!token) throw new Error('Google 인증 토큰 획득 실패')
  return token
}

export async function generateGSheetEstimate(
  estimate: Estimate,
  method: Method,
): Promise<{ pdfBuffer: Buffer; xlsxBuffer: Buffer }> {
  const sheet = estimate.sheets.find(s => s.type === method)
  if (!sheet) throw new Error(`시트 타입 '${method}' 를 찾을 수 없음`)

  const items = sheet.items.filter(it => !it.is_hidden)
  const grandTotal = calc(items).grandTotal
  const koreanAmount = toKoreanAmount(grandTotal)
  const memo = (estimate.memo ?? '').trim()
  const specialNote = buildSpecialNote(sheet, memo)

  const drive = getDriveClient()
  const sheetsApi = getSheetsClient()
  const templateId = getTemplateId(method)
  const folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID ?? '').trim()

  // 1. copy 템플릿
  const copyName = `__gsheet_work_${Date.now()}_${method}`
  const copy = await drive.files.copy({
    fileId: templateId,
    requestBody: { name: copyName, parents: folderId ? [folderId] : undefined },
    supportsAllDrives: true,
    fields: 'id',
  })
  const sheetId = copy.data.id
  if (!sheetId) throw new Error('템플릿 사본 생성 실패: 파일 ID 없음')

  try {
    // 2. 시트 ID 조회 (insertDimension/repeatCell/updateCells 모두 sheetId 필요)
    const sheetIds = await getSheetIds(sheetId)

    // 3. 구조 + 서식 일괄 (단일 spreadsheets.batchUpdate)
    const totalRows = Math.max(items.length, ITEM_TEMPLATE_ZONE)
    const extraRows = Math.max(0, items.length - ITEM_TEMPLATE_ZONE)
    const structuralRequests = buildStructuralRequests(sheetIds, totalRows, extraRows, specialNote)
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: structuralRequests },
    })

    // 4. 값 일괄 (D19 제외 — RichText 보호)
    const data = [...buildCoverInjections(estimate, koreanAmount), ...buildDetailInjections(estimate, sheet, items)]
    await sheetsApi.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { valueInputOption: 'USER_ENTERED', data },
    })

    // 5. PDF export
    const accessToken = await getAccessToken()
    const params = new URLSearchParams(PDF_EXPORT_PARAMS)
    const pdfUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?${params.toString()}`
    const pdfRes = await fetch(pdfUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!pdfRes.ok) {
      const body = await pdfRes.text().catch(() => '')
      throw new Error(`PDF export 실패 (${pdfRes.status}): ${body.slice(0, 200)}`)
    }
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())

    // 6. xlsx export
    const xlsxRes = await drive.files.export(
      { fileId: sheetId, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { responseType: 'arraybuffer' },
    )
    const xlsxBuffer = Buffer.from(xlsxRes.data as ArrayBuffer)

    return { pdfBuffer, xlsxBuffer }
  } finally {
    try {
      await drive.files.delete({ fileId: sheetId, supportsAllDrives: true })
    } catch (err) {
      console.warn('[gsheets] 작업용 사본 삭제 실패:', err)
    }
  }
}
