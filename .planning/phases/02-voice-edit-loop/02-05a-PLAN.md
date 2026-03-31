---
phase: 02-voice-edit-loop
plan: 05a
type: execute
wave: 4
depends_on:
  - 02-04b
files_modified:
  - lib/voice/autoResumeLogic.ts (빈 스텁)
  - tests/voice/autoResumeLogic.test.ts
autonomous: true
requirements:
  - VOICE-04
  - VUX-03
must_haves:
  truths:
    - '자동 재개 판단 로직 테스트가 존재하고 현재 전부 실패한다'
    - '구현 코드(hooks/*)는 수정하지 않는다'
    - 'tests/voice/keywordMatcher.test.ts는 수정하지 않는다'
  artifacts:
    - path: "tests/voice/autoResumeLogic.test.ts"
      provides: "shouldAutoResume + canStartRecording 테스트 케이스"
    - path: "lib/voice/autoResumeLogic.ts"
      provides: "빈 스텁 (테스트 실패용)"
---

<objective>
02-05(TTS→자동재개 파이프라인)의 테스트를 작성한다.

hooks 안의 상태 전이 로직을 순수 함수로 추출하여 테스트한다:
1. shouldAutoResume: 이전 상태 + 현재 상태 + isEditMode → 자동 재개 여부
2. canStartRecording: 현재 status → 녹음 시작 가능 여부

현재 useVoiceEditMode.ts의 useEffect 안에 인라인으로 들어있는 판단 로직을
lib/voice/autoResumeLogic.ts로 추출할 예정. 스텁만 만들고 구현은 05b에서.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: lib/voice/autoResumeLogic.ts 빈 스텁 생성</name>
  <files>lib/voice/autoResumeLogic.ts</files>
  <action>
1. lib/voice/autoResumeLogic.ts 생성:

   ```typescript
   import type { VoiceStatus } from '@/hooks/useVoice'

   /**
    * TTS/처리 완료 후 자동 재개 여부를 판단한다.
    * @param prevStatus - 직전 voiceStatus
    * @param currentStatus - 현재 voiceStatus
    * @param isEditMode - 수정 모드 활성 여부
    * @returns true면 AUTO_RESUME_DELAY 후 startRecording 호출
    */
   export function shouldAutoResume(
     prevStatus: VoiceStatus,
     currentStatus: VoiceStatus,
     isEditMode: boolean,
   ): boolean {
     throw new Error('Not implemented')
   }

   /**
    * 녹음 시작 가능 여부 판단.
    * TTS 재생 중이거나 이미 녹음 중이면 false.
    * @param currentStatus - 현재 voiceStatus
    * @returns true면 녹음 시작 가능
    */
   export function canStartRecording(currentStatus: VoiceStatus): boolean {
     throw new Error('Not implemented')
   }
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
  - 타입과 함수 시그니처만 존재
  - 호출 시 throw
  </done>
</task>

<task type="auto">
  <name>Task 2: autoResumeLogic 테스트 작성</name>
  <files>tests/voice/autoResumeLogic.test.ts</files>
  <action>
1. tests/voice/autoResumeLogic.test.ts 작성:

   ```typescript
   import { describe, it, expect } from 'vitest'
   import { shouldAutoResume, canStartRecording } from '@/lib/voice/autoResumeLogic'

   describe('shouldAutoResume', () => {
     describe('자동 재개 조건 충족', () => {
       it('speaking → idle + 수정 모드 → true', () => {
         expect(shouldAutoResume('speaking', 'idle', true)).toBe(true)
       })

       it('processing → idle + 수정 모드 → true', () => {
         expect(shouldAutoResume('processing', 'idle', true)).toBe(true)
       })
     })

     describe('자동 재개 조건 미충족', () => {
       it('speaking → idle + 수정 모드 아님 → false', () => {
         expect(shouldAutoResume('speaking', 'idle', false)).toBe(false)
       })

       it('idle → idle → false (상태 변화 없음)', () => {
         expect(shouldAutoResume('idle', 'idle', true)).toBe(false)
       })

       it('idle → recording → false', () => {
         expect(shouldAutoResume('idle', 'recording', true)).toBe(false)
       })

       it('recording → idle + 수정 모드 → false (녹음 종료는 자동 재개 아님)', () => {
         expect(shouldAutoResume('recording', 'idle', true)).toBe(false)
       })

       it('speaking → recording → false (idle 경유 안 함)', () => {
         expect(shouldAutoResume('speaking', 'recording', true)).toBe(false)
       })

       it('speaking → processing → false (아직 처리 중)', () => {
         expect(shouldAutoResume('speaking', 'processing', true)).toBe(false)
       })
     })
   })

   describe('canStartRecording', () => {
     it('idle → true (녹음 시작 가능)', () => {
       expect(canStartRecording('idle')).toBe(true)
     })

     it('recording → false (이미 녹음 중)', () => {
       expect(canStartRecording('recording')).toBe(false)
     })

     it('speaking → false (TTS 재생 중)', () => {
       expect(canStartRecording('speaking')).toBe(false)
     })

     it('processing → false (처리 중)', () => {
       expect(canStartRecording('processing')).toBe(false)
     })
   })
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test -- tests/voice/autoResumeLogic.test.ts 2>&1 | tail -10</automated>
  </verify>
  <done>
  - autoResumeLogic 테스트 전부 FAIL (스텁 throw)
  - 기존 keywordMatcher 테스트는 영향 없음
  - 총 테스트: shouldAutoResume 8개 + canStartRecording 4개 = 12개
  </done>
</task>

</tasks>

<verification>
1. npm run test 실행 → keywordMatcher 17개 PASS + autoResumeLogic 12개 FAIL
2. lib/voice/autoResumeLogic.ts는 스텁만 존재
3. hooks/ 파일 수정 없음
4. 기존 테스트 파일 수정 없음
</verification>
