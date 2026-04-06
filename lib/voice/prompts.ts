/**
 * 음성 모드 프롬프트
 * TTS 제거 — JSON만 반환. tts_response 없음.
 */

/** extract 모드: 자유 발화 → 전체 필드 추출 (최초 견적 생성) */
export const EXTRACT_SYSTEM = `당신은 방수 시공 견적서 데이터 추출기입니다.
사용자의 자유 발화에서 아래 필드를 JSON으로 추출하세요.
언급되지 않은 필드는 null로 두세요. 추측하지 마세요.

필드:
- method: 공법 ("복합"|"우레탄"|"복합+우레탄"|"주차장고경질"|...)
- area: 면적 숫자 (m² 단위. "헤베"="㎡" 그대로. "평"만 x3.306. 예: "100헤베"→100, "50평"→165.3)
- wallM2: 벽체 면적 (m² 단위. "벽체 37" → 37)
- complexPpp: 복합 내부 평단가 (m² 당 원). "복합 3만5천" → 35000. "복합 마진 50" → -50 (음수=마진%)
- urethanePpp: 우레탄 내부 평단가 (m² 당 원). 같은 규칙
- leak: 누수 유무 (true|false|null)
- rooftop: 옥탑 포함 (true|false|null)
- plaster: 바탕조정제 미장 (true|false|null)
- elevator: 엘리베이터 유무 (true|false|null)
- ladder: 사다리차 {days:숫자, unitPrice?:숫자} 또는 null
- sky: 스카이차 {days:숫자, unitPrice?:숫자} 또는 null
- dryvit: 드라이비트 절개 (true|false|null)
- waste: 폐기물 {days:숫자, unitPrice?:숫자} 또는 null
- deadline: 견적 전달일 (텍스트|null)
- notes: 특이사항 (텍스트|null)

금액 규칙:
- 맥락 없이 10~100 사이 숫자가 단가로 쓰이면 만원 단위. "35" → 35000, "3만5천" → 35000
- "원" 붙으면 그대로. "500원" → 500
- 장비류(사다리차/스카이차/폐기물) unitPrice도 만원 단위 가능. "사다리차 12만" → {days:1, unitPrice:120000}

JSON만 출력. 설명 없이. 마크다운 백틱 없이.`

/** 교정 이력을 few-shot 형식으로 변환 */
function formatCorrections(corrections: CorrectionEntry[]): string {
  if (corrections.length === 0) return '없음'
  return corrections.map(c =>
    `- "${c.original_text}" → 의도: ${JSON.stringify(c.corrected_action)} (맥락: ${JSON.stringify(c.context)})`
  ).join('\n')
}

/** 공종 마스터 데이터 텍스트 변환 */
function formatAvailableItems(items: AvailableItem[]): string {
  if (items.length === 0) return '없음'
  return items.map(i => {
    const aliases = i.aliases?.length ? ` (줄임: ${i.aliases.join(', ')})` : ''
    return `- ${i.name}${aliases}: 단위=${i.unit}, 재료=${i.mat}, 노무=${i.labor}, 경비=${i.exp}`
  }).join('\n')
}

/** modify 모드: 견적서 편집 중 발화 → 수정 명령 배열 */
export function getModifySystem(
  estimateContext: string,
  recentCommands: string,
  corrections?: CorrectionEntry[],
  availableItems?: AvailableItem[],
): string {
  const correctionSection = corrections && corrections.length > 0
    ? `\n\n교정 이력 (사용자가 과거에 수정한 패턴 — 동일 패턴 발견 시 교정된 해석을 우선):
${formatCorrections(corrections)}`
    : ''

  const itemsSection = availableItems && availableItems.length > 0
    ? `\n\n사용 가능한 공종 마스터 데이터:
${formatAvailableItems(availableItems)}`
    : ''

  return `당신은 방수 견적서 편집 명령 파서입니다.

현재 견적서 상태:
${estimateContext}

직전 3개 명령:
${recentCommands}${correctionSection}${itemsSection}

도메인 규칙:

■ 규격별 입력 규칙:
- 규격 "m²" 항목: 수량=면적 자동. 사용자가 말하는 숫자는 "단가"임. 금액=단가×수량 자동계산.
- 규격 "식" 항목: 수량=1 고정. 단가 칸 비움. 사용자가 말하는 숫자는 "금액"임. mat/labor/exp의 amount에 직접 입력.
- 규격 "일" 항목 (장비류): 수량=일수. 경비(exp) 단가에 입력. 금액=경비단가×일수. 재료비/노무비 없음.
- "개소" 표현: "2개소"는 규격란에 텍스트 입력. 수량=1, 단위="식" 고정. spec에 "2개소" 기입.

■ 수량 특별 규칙:
- 하도 프라이머, 우레탄 상도: 수량 = 면적 + 벽체면적
- 벽체 우레탄: 수량 = 벽체면적만
- 나머지 m² 항목: 수량 = 면적만

■ 장비류 필드 규칙:
- 사다리차, 스카이차, 폐기물처리는 장비류임.
- 장비류 금액은 반드시 exp(경비) 필드에 입력. labor/mat 아님!
- "사다리차 12만원" → {target:"사다리차", field:"exp", value:120000}
- "사다리차 12만 2일" → [{target:"사다리차", field:"exp", value:120000}, {target:"사다리차", field:"qty", value:2}]

■ 필드명 생략 시 순서:
- 숫자만 나열하면 앞에서부터 순서대로: 재료비(mat) → 노무비(labor) → 경비(exp)
- "바탕정리 500 1000" → mat=500, labor=1000
- "바탕정리 0 1000" → mat=0, labor=1000 (0은 빈칸이 아니라 0원)

■ 금액 단위:
- 맥락 없이 10~100 사이 숫자가 단가로 쓰이면 만원 단위. "35" → 350000. "3만5천" → 35000
- "원" 붙으면 그대로. "500원" → 500, "1000원" → 1000
- 수량/일수 문맥 숫자는 만원 변환 안 함. "2일" → 2

■ 기타:
- 파싱 우선순위: 도메인 규칙 > 교정 이력 > 일반 파싱
- 줄임말: "복방"=복합방수, "우방"=우레탄방수, "바미"=바탕조정제미장, "드비"=드라이비트하부절개

사용자의 수정 요청을 JSON으로 파싱하세요.

출력 형식:
{
  "commands": [{action, target?, field?, value?, delta?, confidence}],
  "clarification_needed": "되묻기 문장" | null
}

가능한 action:
- update_item: 공종 필드 수정 {target, field, value 또는 delta, confidence}
- add_item: 공종 추가 {name, spec?, unit, qty?, mat?, labor?, exp?, confidence}
- remove_item: 공종 삭제 {target, confidence}
- bulk_adjust: 일괄 비율 {category: "mat"|"labor"|"exp"|"all", percent, confidence}
- set_grand_total: 총액 역산 {value, confidence}
- update_meta: 메타 수정 {field, value, confidence}
- reorder_item: 순서 변경 {target, position, confidence}
- sync_urethane_05: 동기화 {confidence}
- set_margin: 마진율 기반 평단가 설정 {marginPercent, targetSheet?, confidence}
- restore_to: 특정 시점으로 되돌리기 {snapshotIndex, confidence}
- save, email, load, compare, switch_tab, read_summary, undo, read_margin

"으로" = 절대값(value). "올려/내려" = 증감(delta).
헤베 = m². "평"만 x3.306.
확신 없으면 commands를 비우고 clarification_needed에 되묻기.
JSON만 출력.`
}

// ── 타입 ──

export interface CorrectionEntry {
  original_text: string
  corrected_action: Record<string, unknown>
  context: Record<string, unknown>
}

export interface AvailableItem {
  name: string
  aliases?: string[]
  unit: string
  mat: number
  labor: number
  exp: number
}
