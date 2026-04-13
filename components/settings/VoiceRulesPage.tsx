'use client'

import { INPUT_MODE_LABELS, INPUT_MODE_FLAGS, type InputMode } from '@/lib/voice/inputMode'

const TRIGGER_WORDS = ['넣어', '바꿔', '해줘', '올려', '내려', '빼', '추가', '수정', '맞춰', '변경', '삭제', '제거']
const STOP_WORDS = ['됐어', '끝', '그만', '종료', '멈춰', '끝내']

const CONFIDENCE_LEVELS = [
  { label: '높음', range: '≥ 95%', action: '즉시 실행', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { label: '중간', range: '70 ~ 95%', action: '실행 + 확인 질문', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { label: '낮음', range: '< 70%', action: '실행 안 함 (되묻기)', color: 'bg-red-50 text-red-700 ring-red-200' },
]

const MODE_KEYS: InputMode[] = ['field', 'driving']
const MODE_DESCRIPTIONS: Record<InputMode, string> = {
  field: '마이크 + 효과음 활성. TTS 비활성.',
  driving: '마이크 + TTS 활성. 핸즈프리 운전 시나리오.',
}

interface ExampleRow {
  say: string
  result: string
}

const EXAMPLE_GROUPS: { category: string; rows: ExampleRow[] }[] = [
  {
    category: '면적 입력',
    rows: [
      { say: '"100헤베"', result: '면적 = 100 m²' },
      { say: '"50평"', result: '면적 = 165 m² (환산)' },
      { say: '"487헤베 벽체 87헤베"', result: '면적 487, 벽체 87' },
    ],
  },
  {
    category: '단가 지정',
    rows: [
      { say: '"복합 3만5천"', result: '복합 평단가 = 35,000원' },
      { say: '"우레탄 마진 50"', result: '우레탄 마진율 = 50%' },
    ],
  },
  {
    category: '공종 수정',
    rows: [
      { say: '"사다리차 12만원"', result: '사다리차 경비 = 120,000' },
      { say: '"폐기물처리 식1 경비25만 추가"', result: '폐기물 1식 · 경비 250,000 추가' },
    ],
  },
  {
    category: '교정',
    rows: [
      { say: '"아니 600원"', result: '직전 금액 → 600원으로 재적용' },
      { say: '"아니 재료비"', result: '직전 분류 → 재료비로 재분류' },
    ],
  },
  {
    category: '종료',
    rows: [
      { say: '"됐어" / "끝" / "그만"', result: '녹음 세션 종료' },
    ],
  },
]

export default function VoiceRulesPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800 ring-1 ring-amber-200">
        <strong className="font-semibold">읽기 전용</strong> · 음성 규칙은 코드에서 관리됩니다. 변경하려면 개발팀에 요청해 주세요.
      </div>

      <Card title="1. 웨이크워드 · 종결어" subtitle="말 끝에 이 단어가 붙으면 명령이 실행됩니다">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              실행 트리거
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {TRIGGER_WORDS.map(w => (
                <span key={w} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                  {w}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-muted">
              + &ldquo;~으로&rdquo; 패턴 (예: &ldquo;500원으로&rdquo;)
            </p>
          </div>
          <div>
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              종료 단어
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {STOP_WORDS.map(w => (
                <span key={w} className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                  {w}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-muted">
              이 단어를 말하면 녹음이 종료됩니다.
            </p>
          </div>
        </div>
      </Card>

      <Card title="2. 입력 모드 (2종)" subtitle="현장 / 운전 — 상황별 마이크·TTS 동작 차이">
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
      </Card>

      <Card title="3. 신뢰도 라우팅" subtitle="STT/LLM 신뢰도(%)에 따른 실행 정책">
        <div className="overflow-hidden rounded-lg ring-1 ring-ink-faint/20">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-muted text-left">
                <th className="px-3 py-2 font-semibold text-ink-muted">레벨</th>
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
      </Card>

      <Card title="4. 음성 명령 예시" subtitle='말하기 → 결과 대응표. 실제 화면에서도 동일하게 동작합니다.'>
        <div className="space-y-4">
          {EXAMPLE_GROUPS.map(group => (
            <div key={group.category}>
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                {group.category}
              </h4>
              <div className="overflow-hidden rounded-lg ring-1 ring-ink-faint/20">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-muted text-left">
                      <th className="w-[45%] px-3 py-1.5 font-semibold text-ink-muted">말하기</th>
                      <th className="px-3 py-1.5 font-semibold text-ink-muted">결과</th>
                    </tr>
                  </thead>
                  <tbody>
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
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-card ring-1 ring-ink-faint/20">
      <header className="mb-3 border-b border-ink-faint/20 pb-2">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11px] text-ink-muted">{subtitle}</p>}
      </header>
      {children}
    </section>
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
