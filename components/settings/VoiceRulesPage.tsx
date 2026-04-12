'use client'

import { INPUT_MODE_LABELS, INPUT_MODE_FLAGS, type InputMode } from '@/lib/voice/inputMode'

const TRIGGER_WORDS = ['넣어', '바꿔', '해줘', '올려', '내려', '빼', '추가', '수정', '맞춰', '변경', '삭제', '제거']
const STOP_WORDS = ['됐어', '끝', '그만', '종료', '멈춰', '끝내']

const CONFIDENCE_LEVELS = [
  { label: '높음', range: '≥ 95%', action: '즉시 실행', color: 'bg-emerald-50 text-emerald-700' },
  { label: '중간', range: '70 ~ 95%', action: '실행 + 확인 질문', color: 'bg-amber-50 text-amber-700' },
  { label: '낮음', range: '< 70%', action: '실행 안 함 (되묻기)', color: 'bg-red-50 text-red-700' },
]

const MODE_KEYS: InputMode[] = ['office', 'field', 'driving']
const MODE_DESCRIPTIONS: Record<InputMode, string> = {
  office: '텍스트 입력만 사용. 마이크/TTS 비활성.',
  field: '마이크 + 효과음 활성. TTS 비활성.',
  driving: '마이크 + TTS 활성. 핸즈프리 운전 시나리오.',
}

const EXAMPLE_COMMANDS = [
  { category: '면적 입력', examples: ['"100헤베"', '"50평"', '"487헤베 벽체 87헤베"'] },
  { category: '단가 지정', examples: ['"복합 3만5천"', '"우레탄 마진 50"'] },
  { category: '공종 수정', examples: ['"사다리차 12만원"', '"폐기물처리 식1 경비25만 추가"'] },
  { category: '교정', examples: ['"아니 600원"', '"아니 재료비"'] },
  { category: '종료', examples: ['"됐어"', '"끝"', '"그만"'] },
]

export default function VoiceRulesPage() {
  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-muted">
        이 페이지는 읽기 전용입니다. 음성 규칙은 코드에서 직접 관리됩니다.
      </p>

      {/* 실행 트리거 / 종료 단어 */}
      <Section title="웨이크워드 · 종결어">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="mb-2 text-xs font-semibold text-ink-muted">실행 트리거 (종결 어미)</h4>
            <div className="flex flex-wrap gap-1.5">
              {TRIGGER_WORDS.map(w => (
                <span key={w} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {w}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-ink-muted">
              + &ldquo;~으로&rdquo; 패턴 (예: &ldquo;500원으로&rdquo;)
            </p>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold text-ink-muted">종료 단어</h4>
            <div className="flex flex-wrap gap-1.5">
              {STOP_WORDS.map(w => (
                <span key={w} className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                  {w}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 3모드 설명 */}
      <Section title="입력 모드 (3종)">
        <div className="grid grid-cols-3 gap-3">
          {MODE_KEYS.map(mode => {
            const flags = INPUT_MODE_FLAGS[mode]
            return (
              <div key={mode} className="rounded-lg border border-ink-faint/20 p-3">
                <div className="mb-1 text-sm font-semibold text-ink">
                  {INPUT_MODE_LABELS[mode]}
                </div>
                <p className="mb-2 text-[11px] text-ink-muted">{MODE_DESCRIPTIONS[mode]}</p>
                <div className="space-y-0.5 text-[10px]">
                  <Flag label="텍스트 입력" on={flags.showTextInput} />
                  <Flag label="마이크" on={flags.showMicButton} />
                  <Flag label="TTS" on={flags.ttsEnabled} />
                  <Flag label="효과음" on={flags.soundEffectsEnabled} />
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* 신뢰도 라우팅 */}
      <Section title="신뢰도 라우팅">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-ink-muted">
              <th className="pb-1.5 font-semibold">레벨</th>
              <th className="pb-1.5 font-semibold">범위</th>
              <th className="pb-1.5 font-semibold">동작</th>
            </tr>
          </thead>
          <tbody>
            {CONFIDENCE_LEVELS.map(cl => (
              <tr key={cl.label} className="border-b border-ink-faint/10">
                <td className="py-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cl.color}`}>
                    {cl.label}
                  </span>
                </td>
                <td className="py-2 tabular-nums">{cl.range}</td>
                <td className="py-2">{cl.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* 음성 명령 예시 */}
      <Section title="음성 명령 예시">
        <div className="space-y-3">
          {EXAMPLE_COMMANDS.map(cat => (
            <div key={cat.category}>
              <h4 className="mb-1 text-xs font-semibold text-ink-muted">{cat.category}</h4>
              <div className="flex flex-wrap gap-1.5">
                {cat.examples.map(ex => (
                  <code key={ex} className="rounded bg-surface-muted px-2 py-0.5 text-[11px] text-ink">
                    {ex}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold text-ink">{title}</h3>
      {children}
    </div>
  )
}

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${on ? 'bg-emerald-400' : 'bg-ink-faint/30'}`} />
      <span className={on ? 'text-ink' : 'text-ink-muted'}>{label}</span>
    </div>
  )
}
