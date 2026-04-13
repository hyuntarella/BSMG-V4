/**
 * Phase 5 — generateGSheetEstimate Mock 단위 테스트.
 *
 * 검증 포인트:
 *   1. drive.files.copy 가 templateId 로 호출되는가
 *   2. spreadsheets.values.batchUpdate 가 USER_ENTERED 로 호출되는가
 *   3. 기대 셀 매핑 (D6, D9, J9, D19, C3, B7..) 이 batchUpdate 데이터에 포함되는가
 *   4. 11 행 초과 시 spreadsheets.batchUpdate (insertDimension) 가 선행되는가
 *   5. 작업용 사본이 finally 에서 삭제되는가
 *   6. PDF/xlsx Buffer 가 반환되는가
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Estimate, EstimateItem } from '@/lib/estimate/types'

const mockCopy = vi.fn()
const mockDelete = vi.fn()
const mockExport = vi.fn()
const mockValuesBatchUpdate = vi.fn()
const mockSheetsBatchUpdate = vi.fn()
const mockSheetsGet = vi.fn()
const mockGetAccessToken = vi.fn(async () => ({ token: 'fake-token' }))

vi.mock('@/lib/gsheets/client', () => ({
  getDriveClient: () => ({
    files: { copy: mockCopy, delete: mockDelete, export: mockExport },
  }),
  getSheetsClient: () => ({
    spreadsheets: {
      get: mockSheetsGet,
      batchUpdate: mockSheetsBatchUpdate,
      values: { batchUpdate: mockValuesBatchUpdate },
    },
  }),
  getTemplateId: (m: string) => `tpl-${m}`,
}))

vi.mock('@/lib/gdrive/client', () => ({
  getAuth: () => ({ getAccessToken: mockGetAccessToken }),
}))

// PDF/xlsx export 응답 stub
const fakePdf = Buffer.from('%PDF-1.4 fake landscape')
const fakeXlsx = Buffer.from('PK fake xlsx')

global.fetch = vi.fn(async () => ({
  ok: true,
  arrayBuffer: async () => fakePdf.buffer.slice(fakePdf.byteOffset, fakePdf.byteOffset + fakePdf.byteLength),
  text: async () => '',
})) as unknown as typeof fetch

beforeEach(() => {
  mockCopy.mockReset().mockResolvedValue({ data: { id: 'work-sheet-id' } })
  mockDelete.mockReset().mockResolvedValue({})
  mockExport.mockReset().mockResolvedValue({ data: fakeXlsx.buffer })
  mockValuesBatchUpdate.mockReset().mockResolvedValue({ data: {} })
  mockSheetsBatchUpdate.mockReset().mockResolvedValue({ data: {} })
  mockSheetsGet.mockReset().mockResolvedValue({
    data: { sheets: [{ properties: { sheetId: 42, title: 'Sheet2' } }] },
  })
})

function mkItem(overrides: Partial<EstimateItem> = {}): EstimateItem {
  return {
    sort_order: 1, name: '프라이머', spec: '', unit: 'm²',
    qty: 100, mat: 1000, labor: 500, exp: 200,
    mat_amount: 0, labor_amount: 0, exp_amount: 0, total: 0,
    is_base: true, is_equipment: false, is_fixed_qty: false,
    ...overrides,
  }
}

function mkEstimate(itemCount: number, method: '복합' | '우레탄' = '복합'): Estimate {
  return {
    mgmt_no: 'TEST-001',
    status: 'draft',
    date: '2026-04-13',
    customer_name: '테스트 고객',
    site_name: '테스트 현장',
    m2: 100,
    wall_m2: 0,
    memo: '메모',
    sheets: [{
      type: method,
      title: `${method}방수`,
      price_per_pyeong: 32000,
      warranty_years: 5,
      warranty_bond: 3,
      grand_total: 0,
      sort_order: 1,
      items: Array.from({ length: itemCount }, (_, i) => mkItem({ name: `품목${i + 1}` })),
    }],
  } as Estimate
}

describe('generateGSheetEstimate', () => {
  it('템플릿 사본 생성 → batchUpdate → PDF/xlsx 반환', async () => {
    const { generateGSheetEstimate } = await import('@/lib/gsheets/generate')
    const result = await generateGSheetEstimate(mkEstimate(8), '복합')

    // 1. copy 호출 검증
    expect(mockCopy).toHaveBeenCalledTimes(1)
    expect(mockCopy.mock.calls[0][0].fileId).toBe('tpl-복합')

    // 2. batchUpdate (values) USER_ENTERED 검증
    expect(mockValuesBatchUpdate).toHaveBeenCalledTimes(1)
    const req = mockValuesBatchUpdate.mock.calls[0][0]
    expect(req.spreadsheetId).toBe('work-sheet-id')
    expect(req.requestBody.valueInputOption).toBe('USER_ENTERED')

    // 3. 핵심 셀 매핑 포함 검증
    const ranges: string[] = req.requestBody.data.map((d: { range: string }) => d.range)
    expect(ranges).toContain('Sheet1 (2)!D6')   // 관리번호
    expect(ranges).toContain('Sheet1 (2)!D7')   // 견적일
    expect(ranges).toContain('Sheet1 (2)!D8')   // 고객명
    expect(ranges).toContain('Sheet1 (2)!D9')   // 공사명
    expect(ranges).toContain('Sheet1 (2)!J9')   // 현장주소
    expect(ranges).toContain('Sheet1 (2)!D19')  // 특기사항
    expect(ranges).toContain('Sheet2!C3')       // 을지 공사명
    expect(ranges).toContain('Sheet2!B7')       // 첫 품목
    // E11 한글금액은 템플릿 수식에 위임 (주입 X)
    expect(ranges).not.toContain('Sheet1 (2)!E11')

    // 4. 8 < 11 이므로 insertDimension 미호출
    expect(mockSheetsBatchUpdate).not.toHaveBeenCalled()

    // 5. 작업용 사본 finally 삭제
    expect(mockDelete).toHaveBeenCalledWith({ fileId: 'work-sheet-id', supportsAllDrives: true })

    // 6. Buffer 반환
    expect(result.pdfBuffer).toBeInstanceOf(Buffer)
    expect(result.xlsxBuffer).toBeInstanceOf(Buffer)
  })

  it('11 행 초과 시 insertDimension 선행', async () => {
    const { generateGSheetEstimate } = await import('@/lib/gsheets/generate')
    await generateGSheetEstimate(mkEstimate(15, '우레탄'), '우레탄')

    expect(mockSheetsBatchUpdate).toHaveBeenCalledTimes(1)
    const req = mockSheetsBatchUpdate.mock.calls[0][0]
    const insertReq = req.requestBody.requests[0].insertDimension
    expect(insertReq.range.dimension).toBe('ROWS')
    expect(insertReq.range.endIndex - insertReq.range.startIndex).toBe(15 - 11)
    expect(insertReq.range.sheetId).toBe(42)
    expect(insertReq.inheritFromBefore).toBe(true)
  })

  it('템플릿 ID 가 method 별로 다르게 선택됨', async () => {
    const { generateGSheetEstimate } = await import('@/lib/gsheets/generate')
    await generateGSheetEstimate(mkEstimate(5, '우레탄'), '우레탄')
    expect(mockCopy.mock.calls[0][0].fileId).toBe('tpl-우레탄')
  })

  it('export 실패 시에도 작업용 사본 정리', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'server error',
      arrayBuffer: async () => new ArrayBuffer(0),
    })) as unknown as typeof fetch

    const { generateGSheetEstimate } = await import('@/lib/gsheets/generate')
    await expect(generateGSheetEstimate(mkEstimate(3), '복합')).rejects.toThrow(/PDF export 실패/)
    expect(mockDelete).toHaveBeenCalled()
  })
})
