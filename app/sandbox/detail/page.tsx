import '@/styles/estimate-pdf.css'
import Detail from '@/components/estimate/pdf/detail/Detail'
import type { DetailSheet } from '@/lib/estimate/pdf/types'

/** 12.png 재현 데이터 — lib 오염 방지용 페이지 내 const */
const SAMPLE: DetailSheet = {
  constructionName: '옥상 이중복합방수 3.8mm (제 1안)',
  overheadRate: 0.03,
  profitRate: 0.06,
  pageNumber: '2/3',
  rows: [
    {
      kind: 'item', name: '바탕정리', unit: 'm2', quantity: 270,
      material: { unitPrice: 800, amount: 216_000 },
      labor: { unitPrice: 1_200, amount: 324_000 },
      total: { unitPrice: 2_000, amount: 540_000 },
    },
    {
      kind: 'item', name: '기존 바닥 돌뜸 부위\n부분 제거', unit: '식', quantity: 1,
      material: { amount: 100_000 },
      labor: { amount: 500_000 },
      expense: { amount: 200_000 },
      total: { amount: 800_000 },
    },
    {
      kind: 'item', name: '바탕조정제 부분미장', unit: '식', quantity: 1,
      material: { amount: 300_000 },
      labor: { amount: 800_000 },
      expense: { amount: 200_000 },
      total: { amount: 1_300_000 },
    },
    {
      kind: 'item', name: '하도 프라이머', unit: 'm2', quantity: 270,
      material: { unitPrice: 1_100, amount: 297_000 },
      labor: { unitPrice: 1_600, amount: 432_000 },
      total: { unitPrice: 2_700, amount: 729_000 },
    },
    {
      kind: 'item', name: '복합 시트', spec: '2.3mm', unit: 'm2', quantity: 270,
      material: { unitPrice: 11_000, amount: 2_970_000 },
      labor: { unitPrice: 7_000, amount: 1_890_000 },
      expense: { unitPrice: 500, amount: 135_000 },
      total: { unitPrice: 18_500, amount: 4_995_000 },
    },
    {
      kind: 'item', name: '포인트 실란트\n보강포 부착', unit: 'm2', quantity: 270,
      material: { unitPrice: 1_800, amount: 486_000 },
      labor: { unitPrice: 2_000, amount: 540_000 },
      total: { unitPrice: 3_800, amount: 1_026_000 },
    },
    {
      kind: 'item', name: '노출 우레탄', spec: '중도 1.5mm(2회)', unit: 'm2', quantity: 270,
      material: { unitPrice: 9_000, amount: 2_430_000 },
      labor: { unitPrice: 4_500, amount: 1_215_000 },
      expense: { unitPrice: 500, amount: 135_000 },
      total: { unitPrice: 14_000, amount: 3_780_000 },
    },
    {
      kind: 'item', name: '우레탄 상도', spec: '탑코팅', unit: 'm2', quantity: 270,
      material: { unitPrice: 2_200, amount: 594_000 },
      labor: { unitPrice: 1_800, amount: 486_000 },
      total: { unitPrice: 4_000, amount: 1_080_000 },
    },
    {
      kind: 'item', name: '사다리차', unit: '일', quantity: 1,
      expense: { amount: 150_000 },
      total: { amount: 150_000 },
    },
    {
      kind: 'item', name: '실외기 하부 벽돌작업', spec: '30대', unit: '식', quantity: 1,
      material: { amount: 100_000 },
      labor: { amount: 300_000 },
      total: { amount: 400_000 },
    },
    {
      kind: 'item', name: '폐기물 처리', unit: '식', quantity: 1,
      expense: { amount: 300_000 },
      total: { amount: 300_000 },
    },
    {
      kind: 'item', name: '판넬도막방수', unit: '식', quantity: 1,
      material: { amount: 600_000 },
      labor: { amount: 900_000 },
      expense: { amount: 300_000 },
      total: { amount: 1_800_000 },
      note: '3년',
    },
  ],
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
