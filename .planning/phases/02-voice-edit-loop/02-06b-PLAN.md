---
phase: 02-voice-edit-loop
plan: 06b
type: execute
wave: 4
depends_on:
  - 02-06a
files_modified:
  - lib/voice/summaryBuilder.ts
  - hooks/useEstimateVoice.ts
autonomous: true
requirements:
  - VOICE-06
  - VUX-04
must_haves:
  truths:
    - 'npm run test 전체 통과'
    - '테스트 파일은 수정하지 않는다'
    - 'useEstimateVoice.ts의 onSttText에서 summaryBuilder를 사용한다'
  artifacts:
    - path: "lib/voice/summaryBuilder.ts"
      provides: "matchSummaryKeyword + buildSummaryText + buildMarginText 구현"
    - path: "hooks/useEstimateVoice.ts"
      provides: "onSttText에서 상태 요약 키워드 감지 + LLM 우회"
---

<objective>
02-06a에서 작성한 테스트를 전부 통과시키는 구현을 한다.

1. lib/voice/summaryBuilder.ts 구현
2. hooks/useEstimateVoice.ts의 onSttText에 상태 요약 키워드 감지 추가
   - keywordMatcher 매칭 후, LLM 전달 전 위치에 summaryBuilder 호출
   - matchSummaryKeyword로 감지 → buildSummaryText/buildMarginText로 텍스트 생성 → TTS 출력 → return true

테스트 파일은 절대 수정하지 않는다.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: summaryBuilder.ts 구현</name>
  <files>lib/voice/summaryBuilder.ts</files>
  <action>
1. matchSummaryKeyword 구현:
   ```typescript
   export function matchSummaryKeyword(normalized: string): SummaryAction | null {
     if (/현재\s*상태|상태\s*알려|요약/.test(normalized)) {
       return 'read_summary'
     }
     if (/마진\s*얼마|^마진$/.test(normalized)) {
       return 'read_margin'
     }
     return null
   }
   ```

2. buildSummaryText 구현:
   ```typescript
   export function buildSummaryText(
     sheetType: string,
     m2: number,
     itemCount: number,
     grandTotal: number,
     margin: number,
   ): string {
     const totalManWon = Math.round(grandTotal / 10000)
     return `${sheetType} 면적 ${m2}제곱미터, 공종 ${itemCount}개, 총액 ${totalManWon.toLocaleString()}만원, 마진 ${Math.round(margin)}퍼센트.`
   }
   ```

3. buildMarginText 구현:
   ```typescript
   export function buildMarginText(sheetType: string, margin: number): string {
     return `${sheetType} 마진 ${Math.round(margin)}퍼센트.`
   }
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test 2>&1 | tail -10</automated>
  </verify>
  <done>
  - npm run test 전체 통과 (45/45)
  </done>
</task>

<task type="auto">
  <name>Task 2: useEstimateVoice.ts에 상태 요약 키워드 감지 추가</name>
  <files>hooks/useEstimateVoice.ts</files>
  <action>
1. import 추가:
   ```typescript
   import { matchSummaryKeyword, buildSummaryText, buildMarginText } from '@/lib/voice/summaryBuilder'
   ```

2. onSttText 콜백에서 keywordMatcher 매칭 이후, voiceFlow/pendingConfirm 체크 이전 위치에 추가:
   ```typescript
   // 상태 요약: LLM 없이 로컬 데이터로 즉시 응답
   const summaryAction = matchSummaryKeyword(normalized)
   if (summaryAction && estimate.sheets.length > 0) {
     const sheetIdx = activeSheetIndex >= 0 ? activeSheetIndex : 0
     const sheet = estimate.sheets[sheetIdx]
     if (summaryAction === 'read_summary' && sheet) {
       const margin = callbacksRef.current.getSheetMargin(sheetIdx)
       const msg = buildSummaryText(sheet.type, estimate.m2, sheet.items.length, sheet.grand_total ?? 0, margin)
       callbacksRef.current.addLog('assistant', msg)
       voicePlayTtsRef.current(msg)
     } else if (summaryAction === 'read_margin') {
       const margin = callbacksRef.current.getSheetMargin(sheetIdx)
       const msg = buildMarginText(estimate.sheets[sheetIdx]?.type ?? '', margin)
       callbacksRef.current.addLog('assistant', msg)
       voicePlayTtsRef.current(msg)
     }
     return true
   }
   ```

3. 기존 handleVoiceCommands의 read_summary/read_margin 케이스는 유지 (LLM 경유 폴백).
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test 2>&1 | tail -5 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
  - npm run test 전체 통과
  - npm run build 통과
  - "현재 상태 알려줘" → LLM 없이 즉시 TTS (면적/공종수/총액/마진)
  - "마진 얼마야" → LLM 없이 즉시 TTS (마진율)
  </done>
</task>

</tasks>

<verification>
1. npm run test 전체 통과
2. npm run build 통과
3. 테스트 파일 변경 없음
4. "현재 상태 알려줘" → LLM 호출 없이 TTS 출력 확인
5. "마진 얼마야" → LLM 호출 없이 TTS 출력 확인
</verification>
