'use client'

import { useEffect, useState } from 'react'
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

type CategoryKey = 'items' | 'price' | 'area' | 'correct' | 'stop'

interface ExampleRow { say: string; result: string }
interface ExampleGroup {
  key: CategoryKey
  label: string
  icon: string
  description: string
  rows: ExampleRow[]
}

// 빈도순 탭: 공종 → 단가 → 면적 → 교정 → 종료
const GROUPS: ExampleGroup[] = [
  {
    key: 'items',
    label: '공종 수정',
    icon: '🔧',
    description: '공종별 금액·수량을 추가하거나 바꿉니다. 가장 자주 쓰이는 명령입니다.',
    rows: [
      { say: '"사다리차 12만원"', result: '사다리차 경비 = 120,000' },
      { say: '"폐기물처리 식1 경비25만 추가"', result: '폐기물 1식 · 경비 250,000 추가' },
      { say: '"9번에 크랙보수 추가"', result: '9번 행에 크랙보수 공종 추가' },
      { say: '"사다리차 삭제"', result: '사다리차 행 제거' },
    ],
  },
  {
    key: 'price',
    label: '단가 지정',
    icon: '💰',
    description: '복합/우레탄의 평단가나 마진율을 설정합니다.',
    rows: [
      { say: '"복합 3만5천"', result: '복합 평단가 = 35,000원' },
      { say: '"우레탄 마진 50"', result: '우레탄 마진율 = 50%' },
    ],
  },
  {
    key: 'area',
    label: '면적 입력',
    icon: '📐',
    description: '현장 면적과 벽체 면적을 m² 또는 평으로 입력합니다.',
    rows: [
      { say: '"100헤베"', result: '면적 = 100 m²' },
      { say: '"50평"', result: '면적 = 165 m² (평→m² 환산)' },
      { say: '"487헤베 벽체 87헤베"', result: '면적 487, 벽체 87' },
    ],
  },
  {
    key: 'correct',
    label: '교정',
    icon: '✏️',
    description: '직전 입력이 잘못됐을 때 "아니" 패턴으로 바로 정정합니다.',
    rows: [
      { say: '"아니 600원"', result: '직전 금액 → 600원으로 재적용' },
      { say: '"아니 재료비"', result: '직전 분류 → 재료비로 재분류' },
      { say: '"아니"', result: '직전 입력 취소' },
    ],
  },
  {
    key: 'stop',
    label: '녹음 종료',
    icon: '⏹',
    description: '말로 녹음 세션을 종료합니다.',
    rows: [
      { say: '"됐어" / "끝" / "그만"', result: '녹음 세션 종료' },
    ],
  },
]

const DEFAULT_TAB: CategoryKey = 'items'

export default function VoiceRulesPage() {
  const [tab, setTab] = useState<CategoryKey>(DEFAULT_TAB)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // 딥링크 해시 지원 (#voice-rule-items 등)
  useEffect(() => {
    const hash = window.location.hash.replace('#voice-rule-', '')
    if (hash && GROUPS.some(g => g.key === hash)) {
      setTab(hash as CategoryKey)
    }
  }, [])

  const active = GROUPS.find(g => g.key === tab) ?? GROUPS[0]

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800 ring-1 ring-amber-200">
        <strong className="font-semibold">읽기 전용</strong> · 음성 규칙은 코드에서 관리됩니다. 변경하려면 개발팀에 요청해 주세요.
      </div>

      {/* ── 음성으로 할 수 있는 5가지 — 가로 탭 ── */}
      <section className="rounded-xl bg-white shadow-card ring-1 ring-ink-faint/20">
        <header className="border-b border-ink-faint/20 px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-ink">음성으로 할 수 있는 5가지</h3>
          <p className="mt-0.5 text-[11px] text-ink-muted">탭을 눌러 각 카테고리의 말하기 예시를 확인하세요.</p>
        </header>

        {/* 가로 탭 5개 */}
        <div role="tablist" className="flex gap-1 overflow-x-auto px-4 pt-3">
          {GROUPS.map(g => {
            const isActive = g.key === tab
            return (
              <button
                key={g.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(g.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-v-accent bg-v-accent/5 text-v-accent'
                    : 'border-transparent text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                <span aria-hidden>{g.icon}</span>
                <span>{g.label}</span>
              </button>
            )
          })}
        </div>

        {/* 선택된 탭 내용 */}
        <div className="border-t border-ink-faint/20 p-4" role="tabpanel" id={`voice-rule-${active.key}`}>
          <div className="mb-3 flex items-start gap-2">
            <span className="text-lg" aria-hidden>{active.icon}</span>
            <div>
              <h4 className="text-sm font-bold text-ink">{active.label}</h4>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{active.description}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg ring-1 ring-ink-faint/20">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-muted text-left">
                  <th className="w-[45%] px-3 py-1.5 font-semibold text-ink-muted">말하기</th>
                  <th className="px-3 py-1.5 font-semibold text-ink-muted">결과</th>
                </tr>
              </thead>
              <tbody>
                {active.rows.map((row, i) => (
                  <tr
                    key={row.say}
                    className={i < active.rows.length - 1 ? 'border-b border-ink-faint/20' : ''}
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
          </div>
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
