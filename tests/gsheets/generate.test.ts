/**
 * Phase 5 — generateGSheetEstimate Mock 단위 테스트.
 *
 * 검증 포인트:
 *   1. drive.files.copy 가 templateId 로 호출되는가
 *   2. spreadsheets.batchUpdate 가 호출되어 repeatCell(B wrap) + updateCells(D19 RichText) 포함
 *   3. spreadsheets.values.batchUpdate 가 USER_ENTERED 로 호출 + E11 한글금액 + D19 미포함
 *   4. 11 행 초과 시 spreadsheets.batchUpdate 의 requests 에 insertDimension 추가
 *   5. 작업용 사본이 finally 에서 삭제되는가
 *   6. PDF/xlsx Buffer 가 반환되는가
 *   7. PDF export 실패 시에도 사본 정리
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
    data: {
      sheets: [
        { properties: { sheetId: 11, title: 'Sheet1 (2)' } },
        { properties: { sheetId: 22, title: 'Sheet2' } },
      ],
    },
  })
})

function mkItem(overrides: Partial<EstimateItem> = {}): EstimateItem {
  return {
    sort_order: 1, name: '프라이머', spec: '', unit: 'm²',
    qty: 100, mat: 1000, labor: 500, exp: 200,
    mat_amount: 100000, labor_amount: 50000, exp_amount: 20000, total: 170000,
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
  it('템플릿 사본 → 구조 batchUpdate → values batchUpdate → PDF/xlsx 반환', async () => {
    const { generateGSheetEstimate } = await import('@/lib/gsheets/generate')
    const result = await generateGSheetEstimate(mkEstimate(8), '복합')

    // 1. copy
    expect(mockCopy).toHaveBeenCalledTimes(1)
    expect(mockCopy.mock.calls[0][0].fileId).toBe('tpl-복합')

    // 2. spreadsheets.batchUpdate (구조 + 서식)
    expect(mockSheetsBatchUpdate).toHaveBeenCalledTimes(1)
    const structRequests: object[] = mockSheetsBatchUpdate.mock.calls[0][0].requestBody.requests
    const hasRepeatCell = structRequests.some((r: { repeatCell?: { range?: { startColumnIndex?: number } } }) =>
      r.repeatCell?.range?.startColumnIndex === 1
    )
    expect(hasRepeatCell).toBe(true) // B 열 wrap 강제 ([1])

    const updateCellsReq = structRequests.find((r: { updateCells?: object }) => 'updateCells' in r) as {
      updateCells: { rows: { values: { textFormatRuns: { format: { bold?: boolean; foregroundColorStyle?: { rgbColor?: { red?: number } } } }[] }[] }[] }
    }
    expect(updateCellsReq).toBeDefined()
    const runs = updateCellsReq.updateCells.rows[0].values[0].textFormatRuns
    expect(runs[0].format.bold).toBe(true)
    expect(runs[0].format.foregroundColorStyle?.rgbColor?.red).toBe(1) // 빨간 ([3])

    // 3. values.batchUpdate
    expect(mockValuesBatchUpdate).toHaveBeenCalledTimes(1)
    const valuesReq = mockValuesBatchUpdate.mock.calls[0][0]
    expect(valuesReq.requestBody.valueInputOption).toBe('USER_ENTERED')
    const ranges: string[] = valuesReq.requestBody.data.map((d: { range: string }) => d.range)
    expect(ranges).toContain('Sheet1 (2)!E11')   // 한글금액 ([2])
    expect(ranges).toContain('Sheet1 (2)!D6')
    expect(ranges).toContain('Sheet1 (2)!D9')
    expect(ranges).toContain('Sheet2!C3')
    expect(ranges).toContain('Sheet2!B7')
    expect(ranges).not.toContain('Sheet1 (2)!D19') // RichText 별도 주입 ([3])

    // E11 값이 toKoreanAmount 결과 (일금 ... 원 정 ...)
    const e11 = valuesReq.requestBody.data.find((d: { range: string }) => d.range === 'Sheet1 (2)!E11')
    expect(e11.values[0][0]).toMatch(/^일금/)

    // 4. 8 < 11 이므로 insertDimension 미포함
    const hasInsert = structRequests.some((r: { insertDimension?: object }) => 'insertDimension' in r)
    expect(hasInsert).toBe(false)

    // 5. cleanup
    expect(mockDelete).toHaveBeenCalledWith({ fileId: 'work-sheet-id', supportsAllDrives: true })

    // 6. Buffer 반환
    expect(result.pdfBuffer).toBeInstanceOf(Buffer)
    expect(result.xlsxBuffer).toBeInstanceOf(Buffer)
  })

  it('11 행 초과 시 insertDimension 이 structuralRequests 에 포함', async () => {
    const { generateGSheetEstimate } = await import('@/lib/gsheets/generate')
    await generateGSheetEstimate(mkEstimate(15, '우레탄'), '우레탄')

    const requests = mockSheetsBatchUpdate.mock.calls[0][0].requestBody.requests
    const insertReq = requests.find((r: { insertDimension?: object }) => 'insertDimension' in r) as {
      insertDimension: { range: { dimension: string; startIndex: number; endIndex: number; sheetId: number }; inheritFromBefore: boolean }
    }
    expect(insertReq).toBeDefined()
    expect(insertReq.insertDimension.range.dimension).toBe('ROWS')
    expect(insertReq.insertDimension.range.endIndex - insertReq.insertDimension.range.startIndex).toBe(15 - 11)
    expect(insertReq.insertDimension.range.sheetId).toBe(22) // detail
    expect(insertReq.insertDimension.inheritFromBefore).toBe(true)
  })

  it('템플릿 ID 가 method 별로 다르게 선택됨', async () => {
    const { generateGSheetEstimate } = await import('@/lib/gsheets/generate')
    await generateGSheetEstimate(mkEstimate(5, '우레탄'), '우레탄')
    expect(mockCopy.mock.calls[0][0].fileId).toBe('tpl-우레탄')
  })

  it('PDF export 실패 시에도 작업용 사본 정리', async () => {
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
