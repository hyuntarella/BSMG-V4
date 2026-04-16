import '@/styles/estimate-pdf.css'
import Detail from '@/components/estimate/pdf/detail/Detail'
import type { DetailSheet } from '@/lib/estimate/pdf/types'

/** 12.png 재현 데이터 — lib 오염 방지용 페이지 내 const */
const SAMPLE: DetailSheet = {
  constructionName: '6층 주차장 고경질 우레탄 논슬립 3mm',
  overheadRate: 0.03,
  profitRate: 0.06,
  pageNumber: '2/3',
  rows: [
    {
      kind: 'item', name: '바탕정리', spec: '그라인더 연삭', unit: 'm²', quantity: 2257,
      material: { unitPrice: 96, amount: 216_000 },
      labor: { unitPrice: 144, amount: 324_000 },
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
      kind: 'item', name: '하도 프라이머', spec: '줄눈·크랙 실란트\n보강포 부착', unit: 'm²', quantity: 2257,
      material: { unitPrice: 132, amount: 297_000 },
      labor: { unitPrice: 192, amount: 432_000 },
      total: { amount: 729_000 },
    },
    {
      kind: 'item', name: '복합 시트', spec: '2.3mm', unit: 'm²', quantity: 2257,
      material: { unitPrice: 1316, amount: 2_970_000 },
      labor: { unitPrice: 838, amount: 1_890_000 },
      expense: { unitPrice: 60, amount: 135_000 },
      total: { amount: 4_995_000 },
    },
    {
      kind: 'item', name: '포인트 실란트\n보강포 부착', unit: 'm²', quantity: 2257,
      material: { unitPrice: 216, amount: 486_000 },
      labor: { unitPrice: 240, amount: 540_000 },
      total: { amount: 1_026_000 },
    },
    {
      kind: 'item', name: '노출 우레탄', spec: '중도 1.5mm(2회)', unit: 'm²', quantity: 2257,
      material: { unitPrice: 1077, amount: 2_430_000 },
      labor: { unitPrice: 539, amount: 1_215_000 },
      expense: { unitPrice: 60, amount: 135_000 },
      total: { amount: 3_780_000 },
    },
    {
      kind: 'item', name: '우레탄 상도', spec: '탑코팅', unit: 'm²', quantity: 2257,
      material: { unitPrice: 264, amount: 594_000 },
      labor: { unitPrice: 216, amount: 486_000 },
      total: { amount: 1_080_000 },
    },
    {
      kind: 'item', name: '사다리차', unit: '일', quantity: 1,
      expense: { amount: 150_000 },
      total: { amount: 150_000 },
    },
    {
      kind: 'item', name: '실외기 하부 벽돌작업', unit: '식', quantity: 1,
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
    {
      kind: 'callout',
      text: '※ 판넬도막방수는 하자보수기간 3년 적용됩니다',
      color: 'accent',
    },
  ],
}

export default function DetailSandboxPage() {
  return (
    <div className="min-h-screen bg-gray-200 py-10">
      <div className="flex items-center justify-center gap-4 mb-6">
        <h1 className="text-lg font-bold">을지 PDF 프리뷰</h1>
      </div>
      <div className="flex justify-center">
        <Detail sheet={SAMPLE} />
      </div>
    </div>
  )
}
