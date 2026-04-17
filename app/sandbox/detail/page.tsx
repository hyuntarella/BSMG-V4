import '@/styles/estimate-pdf.css'
import Detail from '@/components/estimate/pdf/detail/Detail'
import type { DetailSheet, DetailItem } from '@/lib/estimate/pdf/types'

/** Figma node 3:173 샘플 — 13행 동일 "조인트 실란트" */
const SAMPLE_ROW: DetailItem = {
  kind: 'item',
  name: '조인트 실란트',
  spec: '그라인더 연삭',
  unit: 'm2',
  quantity: 2257,
  material: { unitPrice: 11_700, amount: 2_550_000 },
  labor: { unitPrice: 300, amount: 677_100 },
  expense: { unitPrice: 300, amount: 677_100 },
  total: { unitPrice: 200_000, amount: 16_700_000 },
  note: '',
}

const SAMPLE: DetailSheet = {
  constructionName: '옥상 이중복합방수 3.8mm (제 1안)',
  overheadRate: 0.03,
  profitRate: 0.06,
  pageNumber: '2/3',
  rows: Array.from({ length: 13 }, () => ({ ...SAMPLE_ROW })),
}

export default function DetailSandboxPage() {
  return (
    <div className="min-h-screen bg-white py-10">
      <div className="flex justify-center">
        <Detail sheet={SAMPLE} />
      </div>
    </div>
  )
}
