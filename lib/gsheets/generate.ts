/**
 * Phase 5 — Google Sheets 네이티브 템플릿 기반 견적서 생성
 *
 * 흐름:
 *   1. drive.files.copy(템플릿) → 작업용 사본 생성
 *   2. (optional) spreadsheets.batchUpdate({insertDimension}) — 11 행 초과 시 행 삽입
 *   3. sheets.spreadsheets.values.batchUpdate — 갑지/을지 셀 값 일괄 주입
 *   4. docs.google.com/spreadsheets/d/{id}/export?format=pdf — landscape PDF
 *   5. drive.files.export(mimeType=xlsx) — xlsx 다운로드용
 *   6. drive.files.delete — 작업용 사본 정리 (성공/실패 무관)
 *
 * 반환: { pdfBuffer, xlsxBuffer } — 호출자가 upsertToDrive 로 영구 보관.
 *
 * Sheets API quota: 분당 60 write/project. 견적서 1건 = batchUpdate 2회 (복합+우레탄)
 *   = 30 견적서/분 한계. 일 견적서 10-30건 (PM 2026-04-13) 이라 여유 충분.
 */
import type { Estimate, EstimateSheet, EstimateItem, Method } from '@/lib/estimate/types'
import { getDriveClient, getSheetsClient, getTemplateId } from '@/lib/gsheets/client'
import { getAuth } from '@/lib/gdrive/client'

// ── 셀 매핑 (PoC 검증된 좌표) ──
const COVER_SHEET = 'Sheet1 (2)'   // 갑지
const DETAIL_SHEET = 'Sheet2'      // 을지

// 을지 품목 zone
const ITEM_START_ROW = 7
const ITEM_TEMPLATE_ZONE = 11      // 7..17
const SUMMARY_FIRST_ROW = 18       // 소계

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

/**
 * 갑지 (Sheet1) 셀 주입 데이터.
 *
 * E11 한글금액, K14/K18 합계는 템플릿 수식 (NUMBERSTRING/=Sheet2!*) 가
 * Google Sheets 에서 정상 평가되므로 주입하지 않는다 (xlsx 엔진의 toKoreanAmount
 * hack 폐기).
 */
function buildCoverInjections(estimate: Estimate, sheet: EstimateSheet): ValueRange[] {
  const memo = (estimate.memo ?? '').trim()
  const special =
    `  1. 하자보수기간 ${sheet.warranty_years}년 (하자이행증권 ${sheet.warranty_bond}년)\n` +
    `  2. 견적서 제출 30일 유효\n` +
    `  3. ${memo}`

  return [
    { range: `${COVER_SHEET}!D6`, values: [[estimate.mgmt_no ?? '']] },
    { range: `${COVER_SHEET}!D7`, values: [[estimate.date ?? '']] },
    { range: `${COVER_SHEET}!D8`, values: [[estimate.customer_name ? `${estimate.customer_name} 귀하` : '귀하']] },
    { range: `${COVER_SHEET}!D9`, values: [[estimate.site_name ?? '방수공사']] },
    { range: `${COVER_SHEET}!J9`, values: [[estimate.site_name ?? '']] },
    { range: `${COVER_SHEET}!D19`, values: [[special]] },
  ]
}

/**
 * 을지 (Sheet2) 셀 주입 데이터.
 *
 * 행 7..(7+count-1) 에 품목 11개 입력값 + 행 단위 수식 명시 주입.
 * count < 11 면 남은 행은 빈값으로 클리어 (템플릿 기본 데이터 제거).
 * count > 11 처리는 호출자가 사전에 insertDimension 으로 행 삽입 후 호출.
 */
function buildDetailInjections(estimate: Estimate, sheet: EstimateSheet, items: EstimateItem[]): ValueRange[] {
  const c3Title = sheet.type === '복합'
    ? `${estimate.site_name ?? '방수공사'} 이중복합방수 3.8mm (제 1안)`
    : `${estimate.site_name ?? '방수공사'} 우레탄방수 3mm (제 2안)`

  const data: ValueRange[] = [
    { range: `${DETAIL_SHEET}!C3`, values: [[c3Title]] },
  ]

  // 품목 zone — count 만큼은 실제 값, 나머지는 빈값
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
        // 행 수식 명시 — 템플릿이 일부 행에 G/I/K/L/M 수식이 누락된 경우 방어.
        { range: `${DETAIL_SHEET}!G${r}`, values: [[`=E${r}*F${r}`]] },
        { range: `${DETAIL_SHEET}!I${r}`, values: [[`=E${r}*H${r}`]] },
        { range: `${DETAIL_SHEET}!K${r}`, values: [[`=E${r}*J${r}`]] },
        { range: `${DETAIL_SHEET}!L${r}`, values: [[`=F${r}+H${r}+J${r}`]] },
        { range: `${DETAIL_SHEET}!M${r}`, values: [[`=G${r}+I${r}+K${r}`]] },
      )
    } else {
      // 빈 행 — 템플릿 잔존 값/수식 클리어
      for (const col of ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']) {
        data.push({ range: `${DETAIL_SHEET}!${col}${r}`, values: [['']] })
      }
    }
  }
  return data
}

/**
 * Detail 시트의 시트 ID (gid) 조회 — insertDimension 호출 시 필요.
 */
async function getDetailSheetId(spreadsheetId: string): Promise<number> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties(sheetId,title))' })
  const detail = (res.data.sheets ?? []).find(s => s.properties?.title === DETAIL_SHEET)
  if (!detail?.properties?.sheetId && detail?.properties?.sheetId !== 0) {
    throw new Error(`시트 "${DETAIL_SHEET}" 를 찾을 수 없음`)
  }
  return detail.properties.sheetId
}

/**
 * 11 행 초과 시 을지에 행 삽입 (소계 행 위에). 템플릿 SUM 범위는 자동 확장됨.
 */
async function insertExtraRows(spreadsheetId: string, extraRows: number): Promise<void> {
  const sheets = getSheetsClient()
  const detailSheetId = await getDetailSheetId(spreadsheetId)
  // 0-based: 17 = 행 18(소계) 직전. inheritFromBefore=true 로 행 17 의 서식/수식 복제.
  const startIndex = SUMMARY_FIRST_ROW - 1
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        insertDimension: {
          range: { sheetId: detailSheetId, dimension: 'ROWS', startIndex, endIndex: startIndex + extraRows },
          inheritFromBefore: true,
        },
      }],
    },
  })
}

async function getAccessToken(): Promise<string> {
  const tok = await getAuth().getAccessToken()
  const token = typeof tok === 'string' ? tok : tok?.token
  if (!token) throw new Error('Google 인증 토큰 획득 실패')
  return token
}

/**
 * 작업용 사본의 PDF 와 xlsx Buffer 생성.
 *
 * @param estimate 견적서 전체
 * @param method   '복합' | '우레탄'
 * @returns { pdfBuffer, xlsxBuffer } — 호출자가 upsertToDrive 로 보관
 */
export async function generateGSheetEstimate(
  estimate: Estimate,
  method: Method,
): Promise<{ pdfBuffer: Buffer; xlsxBuffer: Buffer }> {
  const sheet = estimate.sheets.find(s => s.type === method)
  if (!sheet) throw new Error(`시트 타입 '${method}' 를 찾을 수 없음`)

  // is_hidden 만 제외. is_locked 는 단가 잠금이지 출력 제외 아님.
  const items = sheet.items.filter(it => !it.is_hidden)

  const drive = getDriveClient()
  const sheets = getSheetsClient()
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
    // 2. 11 행 초과 시 행 삽입
    if (items.length > ITEM_TEMPLATE_ZONE) {
      await insertExtraRows(sheetId, items.length - ITEM_TEMPLATE_ZONE)
    }

    // 3. 셀 값 일괄 주입 (1 batchUpdate request)
    const data = [...buildCoverInjections(estimate, sheet), ...buildDetailInjections(estimate, sheet, items)]
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { valueInputOption: 'USER_ENTERED', data },
    })

    // 4. PDF export — docs.google.com/spreadsheets/d/{id}/export
    const accessToken = await getAccessToken()
    const params = new URLSearchParams(PDF_EXPORT_PARAMS)
    const pdfUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?${params.toString()}`
    const pdfRes = await fetch(pdfUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!pdfRes.ok) {
      const body = await pdfRes.text().catch(() => '')
      throw new Error(`PDF export 실패 (${pdfRes.status}): ${body.slice(0, 200)}`)
    }
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())

    // 5. xlsx export — drive.files.export
    const xlsxRes = await drive.files.export(
      { fileId: sheetId, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { responseType: 'arraybuffer' },
    )
    const xlsxBuffer = Buffer.from(xlsxRes.data as ArrayBuffer)

    return { pdfBuffer, xlsxBuffer }
  } finally {
    // 6. 작업용 사본 삭제 (성공/실패 무관)
    try {
      await drive.files.delete({ fileId: sheetId, supportsAllDrives: true })
    } catch (err) {
      console.warn('[gsheets] 작업용 사본 삭제 실패:', err)
    }
  }
}
