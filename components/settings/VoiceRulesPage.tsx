'use client'

import { useCallback, useEffect, useState } from 'react'
import { INPUT_MODE_LABELS, INPUT_MODE_FLAGS, type InputMode } from '@/lib/voice/inputMode'

const TRIGGER_WORDS = ['넣어', '바꿔', '해줘', '올려', '내려', '빼', '추가', '수정', '맞춰', '변경', '삭제', '제거']
const STOP_WORDS = ['됐어', '끝', '그만', '종료', '멈춰', '끝내']

const CONFIDENCE_LEVELS = [
  { label: '확실', range: '≥ 95%', action: '즉시 실행', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { label: '애매', range: '70 ~ 95%', action: '실행하고 "맞죠?" 질문', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { label: '불확실', range: '< 70%', action: '실행 안 함, 다시 물어봄', color: 'bg-red-50 text-red-700 ring-red-200' },
]

const MODE_KEYS: InputMode[] = ['field', 'driving']
const MODE_DESCRIPTIONS: Record<InputMode, string> = {
  field: '마이크 + 효과음 활성. TTS 비활성.',
  driving: '마이크 + TTS 활성. 핸즈프리 운전 시나리오.',
}

// ── 히어로 5카드 (빈도순: 공종 → 단가 → 면적 → 교정 → 종료) ──
type CategoryKey = 'items' | 'price' | 'area' | 'correct' | 'stop'

interface HeroCard {
  key: CategoryKey
  icon: string
  title: string
  oneLine: string
}

const HERO_CARDS: HeroCard[] = [
  { key: 'items', icon: '🔧', title: '공종 수정', oneLine: '"사다리차 12만원" → 경비 반영' },
  { key: 'price', icon: '💰', title: '단가 지정', oneLine: '"복합 3만5천" → 평단가 35,000' },
  { key: 'area', icon: '📐', title: '면적 입력', oneLine: '"100헤베" → 면적 100 m²' },
  { key: 'correct', icon: '✏️', title: '교정', oneLine: '"아니 600원" → 직전 값 정정' },
  { key: 'stop', icon: '⏹', title: '녹음 종료', oneLine: '"됐어 / 끝 / 그만"' },
]

interface ExampleRow { say: string; result: string }
interface ExampleGroup {
  key: CategoryKey
  title: string
  icon: string
  rows: ExampleRow[]
}

// 아코디언 (빈도순 동일)
const EXAMPLE_GROUPS: ExampleGroup[] = [
  {
    key: 'items',
    title: '공종 수정',
    icon: '🔧',
    rows: [
      { say: '"사다리차 12만원"', result: '사다리차 경비 = 120,000' },
      { say: '"폐기물처리 식1 경비25만 추가"', result: '폐기물 1식 · 경비 250,000 추가' },
      { say: '"9번에 크랙보수 추가"', result: '9번 행에 크랙보수 공종 추가' },
      { say: '"사다리차 삭제"', result: '사다리차 행 제거' },
    ],
  },
  {
    key: 'price',
    title: '단가 지정',
    icon: '💰',
    rows: [
      { say: '"복합 3만5천"', result: '복합 평단가 = 35,000원' },
      { say: '"우레탄 마진 50"', result: '우레탄 마진율 = 50%' },
    ],
  },
  {
    key: 'area',
    title: '면적 입력',
    icon: '📐',
    rows: [
      { say: '"100헤베"', result: '면적 = 100 m²' },
      { say: '"50평"', result: '면적 = 165 m² (평→m² 환산)' },
      { say: '"487헤베 벽체 87헤베"', result: '면적 487, 벽체 87' },
    ],
  },
  {
    key: 'correct',
    title: '교정 ("아니" 패턴)',
    icon: '✏️',
    rows: [
      { say: '"아니 600원"', result: '직전 금액 → 600원으로 재적용' },
      { say: '"아니 재료비"', result: '직전 분류 → 재료비로 재분류' },
      { say: '"아니"', result: '직전 입력 취소' },
    ],
  },
  {
    key: 'stop',
    title: '녹음 종료',
    icon: '⏹',
    rows: [
      { say: '"됐어" / "끝" / "그만"', result: '녹음 세션 종료' },
    ],
  },
]

const DEFAULT_OPEN: CategoryKey = 'items'

export default function VoiceRulesPage() {
  const [openKey, setOpenKey] = useState<CategoryKey>(DEFAULT_OPEN)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const handleHeroClick = useCallback((key: CategoryKey) => {
    setOpenKey(key)
    // 렌더 사이클 이후 스크롤
    requestAnimationFrame(() => {
      document.getElementById(`voice-rule-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  // 딥링크 해시 지원 (#voice-rule-items 등)
  useEffect(() => {
    const hash = window.location.hash.replace('#voice-rule-', '')
    if (hash && EXAMPLE_GROUPS.some(g => g.key === hash)) {
      setOpenKey(hash as CategoryKey)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800 ring-1 ring-amber-200">
        <strong className="font-semibold">읽기 전용</strong> · 음성 규칙은 코드에서 관리됩니다. 변경하려면 개발팀에 요청해 주세요.
      </div>

      {/* ── 히어로: 음성으로 할 수 있는 5가지 ── */}
      <section className="rounded-xl bg-white p-4 shadow-card ring-1 ring-ink-faint/20">
        <header className="mb-3">
          <h3 className="text-sm font-bold text-ink">음성으로 할 수 있는 5가지</h3>
          <p className="mt-0.5 text-[11px] text-ink-muted">카드를 누르면 아래에서 자세한 예시를 볼 수 있습니다.</p>
        </header>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {HERO_CARDS.map(card => {
            const active = openKey === card.key
            return (
              <button
                key={card.key}
                onClick={() => handleHeroClick(card.key)}
                className={`flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all ${
                  active
                    ? 'border-v-accent bg-v-accent/5 shadow-card'
                    : 'border-ink-faint/30 bg-surface hover:border-v-accent/50 hover:bg-v-accent/5'
                }`}
              >
                <span className="text-lg" aria-hidden>{card.icon}</span>
                <span className="text-xs font-bold text-ink">{card.title}</span>
                <span className="text-[11px] leading-snug text-ink-muted">{card.oneLine}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── 아코디언: 이렇게 말해보세요 ── */}
      <section className="rounded-xl bg-white p-4 shadow-card ring-1 ring-ink-faint/20">
        <header className="mb-3 border-b border-ink-faint/20 pb-2">
          <h3 className="text-sm font-bold text-ink">이렇게 말해보세요</h3>
          <p className="mt-0.5 text-[11px] text-ink-muted">말하기 → 결과 대응표. 실제 화면에서도 동일하게 동작합니다.</p>
        </header>
        <div className="space-y-2">
          {EXAMPLE_GROUPS.map(group => {
            const open = openKey === group.key
            return (
              <div
                key={group.key}
                id={`voice-rule-${group.key}`}
                className="overflow-hidden rounded-lg ring-1 ring-ink-faint/20"
              >
                <button
                  onClick={() => setOpenKey(open ? DEFAULT_OPEN : group.key)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${
                    open ? 'bg-v-accent/5' : 'bg-surface-muted hover:bg-v-accent/5'
                  }`}
                  aria-expanded={open}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span aria-hidden>{group.icon}</span>
                    {group.title}
                  </span>
                  <svg
                    className={`h-4 w-4 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white text-left border-b border-ink-faint/20">
                        <th className="w-[45%] px-3 py-1.5 font-semibold text-ink-muted">말하기</th>
                        <th className="px-3 py-1.5 font-semibold text-ink-muted">결과</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {group.rows.map((row, i) => (
                        <tr
                          key={row.say}
                          className={i < group.rows.length - 1 ? 'border-b border-ink-faint/20' : ''}
                        >
                          <td className="px-3 py-1.5">
                            <code className="rounded bg-surface-muted px-1.5 py-0.5 text-[11px] text-ink">
                              {row.say}
                            </code>
                          </td>
                          <td className="px-3 py-1.5 text-ink">{row.result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 고급 설정 보기 (접힘) ── */}
      <section className="rounded-xl bg-white shadow-card ring-1 ring-ink-faint/20">
        <button
          onClick={() => setAdvancedOpen(v => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          aria-expanded={advancedOpen}
        >
          <div>
            <h3 className="text-sm font-bold text-ink">고급 설정 보기</h3>
            <p className="mt-0.5 text-[11px] text-ink-muted">실행 트리거 단어, 종료 단어, 알아듣는 정도별 동작, 입력 모드</p>
          </div>
          <svg
            className={`h-4 w-4 text-ink-muted transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {advancedOpen && (
          <div className="space-y-4 border-t border-ink-faint/20 p-4">
            {/* 트리거/종료 단어 */}
            <div>
              <h4 className="mb-2 text-xs font-bold text-ink">실행 트리거 단어 · 종료 단어</h4>
              <p className="mb-2 text-[11px] text-ink-muted">말 끝에 이 단어가 붙으면 명령이 실행됩니다.</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold text-ink-muted">실행 트리거</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TRIGGER_WORDS.map(w => (
                      <span key={w} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                        {w}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-muted">+ &ldquo;~으로&rdquo; 패턴 (예: &ldquo;500원으로&rdquo;)</p>
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold text-ink-muted">종료 단어</div>
                  <div className="flex flex-wrap gap-1.5">
                    {STOP_WORDS.map(w => (
                      <span key={w} className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 알아듣는 정도 */}
            <div>
              <h4 className="mb-2 text-xs font-bold text-ink">알아듣는 정도별 동작</h4>
              <p className="mb-2 text-[11px] text-ink-muted">시스템이 명령을 얼마나 확실히 알아들었는지에 따라 다르게 동작합니다.</p>
              <div className="overflow-hidden rounded-lg ring-1 ring-ink-faint/20">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-muted text-left">
                      <th className="px-3 py-2 font-semibold text-ink-muted">정도</th>
                      <th className="px-3 py-2 font-semibold text-ink-muted">범위</th>
                      <th className="px-3 py-2 font-semibold text-ink-muted">동작</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONFIDENCE_LEVELS.map((cl, i) => (
                      <tr
                        key={cl.label}
                        className={i < CONFIDENCE_LEVELS.length - 1 ? 'border-b border-ink-faint/20' : ''}
                      >
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${cl.color}`}>
                            {cl.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-ink">{cl.range}</td>
                        <td className="px-3 py-2 text-ink">{cl.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 입력 모드 */}
            <div>
              <h4 className="mb-2 text-xs font-bold text-ink">입력 모드 (2종)</h4>
              <p className="mb-2 text-[11px] text-ink-muted">화면 좌하단 버튼으로 전환. 상황별 마이크/TTS 동작이 다릅니다.</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {MODE_KEYS.map(mode => {
                  const flags = INPUT_MODE_FLAGS[mode]
                  return (
                    <div key={mode} className="rounded-lg border border-ink-faint/30 bg-surface p-3">
                      <div className="mb-1 text-sm font-bold text-ink">
                        {INPUT_MODE_LABELS[mode]}
                      </div>
                      <p className="mb-3 text-[11px] leading-snug text-ink-muted">
                        {MODE_DESCRIPTIONS[mode]}
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        <Flag label="마이크" on={flags.showMicButton} />
                        <Flag label="TTS" on={flags.ttsEnabled} />
                        <Flag label="효과음" on={flags.soundEffectsEnabled} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${on ? 'bg-emerald-500' : 'bg-ink-faint'}`} />
      <span className={on ? 'font-medium text-ink' : 'text-ink-muted line-through'}>{label}</span>
    </div>
  )
}
