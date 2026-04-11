'use client'

import CostEditor from './CostEditor'
import CalcRulesEditor from './CalcRulesEditor'
import EquipmentEditor from './EquipmentEditor'
import WarrantyEditor from './WarrantyEditor'

/**
 * "기타 설정" 페이지 — 탭 없이 섹션으로 나열.
 *
 * 구성:
 *   1) 원가 기준   (CostEditor)
 *   2) 견적 규칙   (CalcRulesEditor + EquipmentEditor 통합)
 *   3) 보증        (WarrantyEditor)
 */
export default function OtherSettingsPage() {
  return (
    <div className="space-y-8">
      <Section title="원가 기준" desc="면적 구간별 원가 설정 + 품셈/자재 상승률">
        <CostEditor />
      </Section>

      <Section title="견적 규칙" desc="공과잡비·이윤·절사 단위 + 장비 단가">
        <div className="space-y-6">
          <CalcRulesEditor />
          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">장비 단가</h3>
            <EquipmentEditor />
          </div>
        </div>
      </Section>

      <Section title="보증" desc="시트별 하자보증 기본값">
        <WarrantyEditor />
      </Section>
    </div>
  )
}

function Section({
  title,
  desc,
  children,
}: {
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <section>
      <header className="mb-3 border-b border-gray-200 pb-2">
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
      </header>
      <div>{children}</div>
    </section>
  )
}
