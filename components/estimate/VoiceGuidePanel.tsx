'use client'

interface VoiceGuidePanelProps {
  open: boolean
  onClose: () => void
}

export default function VoiceGuidePanel({ open, onClose }: VoiceGuidePanelProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[60] w-80 bg-white shadow-elevated overflow-y-auto">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-bold text-ink">음성 입력 가이드</span>
          <button onClick={onClose} className="rounded p-1 text-ink-muted hover:bg-surface-muted">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-5 text-xs text-ink-secondary">
          {/* 숫자 순서 규칙 */}
          <section>
            <h3 className="text-sm font-bold text-ink mb-2">숫자 입력 순서</h3>
            <p className="mb-1.5">필드명 생략 시 앞에서부터:</p>
            <div className="flex gap-1.5 mb-2">
              <span className="rounded bg-blue-100 px-2 py-1 font-semibold text-blue-700">1. 재료비</span>
              <span className="rounded bg-green-100 px-2 py-1 font-semibold text-green-700">2. 노무비</span>
              <span className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-700">3. 경비</span>
            </div>
            <p className="text-ink-muted">&quot;바탕정리 500 1000&quot; → 재료비 500, 노무비 1000</p>
          </section>

          {/* 0 입력 */}
          <section>
            <h3 className="text-sm font-bold text-ink mb-2">빈 칸 = &quot;0&quot;</h3>
            <p>&quot;바탕정리 0 1000&quot; → 재료비 0, 노무비 1000</p>
          </section>

          {/* 규격별 규칙 */}
          <section>
            <h3 className="text-sm font-bold text-ink mb-2">규격��� 입력 방식</h3>
            <div className="space-y-2">
              <div className="rounded border border-gray-200 p-2.5">
                <p className="font-semibold text-ink mb-1">m² (면적 항목)</p>
                <p>숫자 = <span className="font-bold text-blue-600">단가</span></p>
                <p className="text-ink-muted">금액 = 단가 x 수량 (자동)</p>
              </div>
              <div className="rounded border border-gray-200 p-2.5">
                <p className="font-semibold text-ink mb-1">식 (일식 항목)</p>
                <p>숫자 = <span className="font-bold text-blue-600">금액</span> (단가 비움)</p>
                <p className="text-ink-muted">수량 고정 1</p>
              </div>
              <div className="rounded border border-gray-200 p-2.5">
                <p className="font-semibold text-ink mb-1">일 (장비)</p>
                <p>숫자 = <span className="font-bold text-amber-600">경비 단가</span></p>
                <p className="text-ink-muted">&quot;사다리차 12만 2일&quot; → 경비 12만 x 2일</p>
              </div>
            </div>
          </section>

          {/* 수량 특별 규칙 */}
          <section>
            <h3 className="text-sm font-bold text-ink mb-2">수량 자동 계산</h3>
            <div className="space-y-1">
              <p><span className="font-semibold">하도 프라이머</span> = 면적 + 벽체</p>
              <p><span className="font-semibold">우레탄 상도</span> = 면적 + 벽체</p>
              <p><span className="font-semibold">벽체 우레탄</span> = 벽체만</p>
              <p><span className="font-semibold">나머지</span> = 면적만</p>
            </div>
          </section>

          {/* 공종 추가/삭제 */}
          <section>
            <h3 className="text-sm font-bold text-ink mb-2">공종 추가/삭제</h3>
            <p>&quot;9번에 크랙보수 추가&quot;</p>
            <p>&quot;사다리차 삭제&quot;</p>
          </section>

          {/* 교정 */}
          <section>
            <h3 className="text-sm font-bold text-ink mb-2">교정</h3>
            <p>&quot;아니&quot; → 직전 입력 취소</p>
            <p>&quot;아니 35&quot; → 값 교정</p>
            <p>&quot;아니 노무비&quot; → 필드 교정</p>
          </section>

          {/* 줄임말 */}
          <section>
            <h3 className="text-sm font-bold text-ink mb-2">줄임말</h3>
            <div className="grid grid-cols-2 gap-1">
              <p>복방 = 복합방수</p>
              <p>우방 = 우레탄방수</p>
              <p>바미 = 바탕조정제미장</p>
              <p>드비 = 드라이비트</p>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
