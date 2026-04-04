'use client'

import { useState } from 'react'

interface InitialGuideProps {
  onCreateSheets: () => void
}

const GUIDE_ITEMS = [
  { num: '1', label: '면적', example: '"150헤베" 또는 "50평"' },
  { num: '2', label: '벽체 면적', example: '"벽체 30미터" 또는 "없어"' },
  { num: '3', label: '복합 평단가', example: '"3만5천" 또는 "마진 50%에 맞춰줘"' },
  { num: '4', label: '우레탄 평단가', example: '"3만" 또는 마진 기반' },
]

export default function InitialGuide({ onCreateSheets }: InitialGuideProps) {
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <div className="mx-auto max-w-lg py-12 px-4">
      {/* 히어로 — 마이크 아이콘 */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
          <svg className="h-10 w-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-ink">음성으로 시작하세요</h2>
        <p className="mt-2 text-sm text-ink-secondary">아래 4가지 정보를 말해주시면 견적서가 자동 생성됩니다</p>
      </div>

      {/* 4단계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
        {GUIDE_ITEMS.map(item => (
          <div key={item.num} className="rounded-xl bg-white p-3.5 shadow-card text-center">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white mb-2">{item.num}</span>
            <p className="text-sm font-semibold text-ink">{item.label}</p>
            <p className="mt-1 text-xs text-ink-muted leading-relaxed">{item.example}</p>
          </div>
        ))}
      </div>

      {/* CTA — 작은 텍스트 링크 */}
      <div className="text-center">
        <button
          onClick={onCreateSheets}
          className="text-sm text-brand hover:text-brand-dark hover:underline transition-colors"
        >
          복합+우레탄 템플릿으로 시작하기 &rarr;
        </button>
      </div>

      {/* 음성 조작 방법 — 접이식 */}
      <div className="mt-6">
        <button
          onClick={() => setHelpOpen(!helpOpen)}
          className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-xs font-semibold text-ink-secondary shadow-card hover:shadow-card-hover transition-shadow"
        >
          <span>음성 조작 방법</span>
          <svg className={`h-4 w-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {helpOpen && (
          <div className="mt-2 rounded-xl bg-white p-4 shadow-card space-y-1.5 text-xs text-ink-secondary">
            <p><span className="font-bold text-brand">&quot;견적&quot;</span> — 녹음 시작 (웨이크워드)</p>
            <p><span className="font-bold text-brand">&quot;됐어&quot; / &quot;넘겨&quot;</span> — 마디 종료, 다음 항목</p>
            <p><span className="font-bold text-brand">&quot;그만&quot;</span> — 녹음 취소</p>
            <p><span className="font-bold text-accent">Space / 볼륨 버튼</span> — 수동 녹음 토글</p>
          </div>
        )}
      </div>
    </div>
  )
}
