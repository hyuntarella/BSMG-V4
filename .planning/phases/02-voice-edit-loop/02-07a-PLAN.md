---
phase: 02-voice-edit-loop
plan: 07a
type: execute
wave: 4
depends_on:
  - 02-06b
files_modified:
  - lib/voice/vadLogic.ts (빈 스텁)
  - tests/voice/vadLogic.test.ts
autonomous: true
requirements:
  - VOICE-08
  - VUX-05
must_haves:
  truths:
    - 'VAD 무음 판단 로직 테스트가 존재하고 전부 실패한다'
    - '구현 코드(hooks/*)는 수정하지 않는다'
    - '기존 테스트 파일은 수정하지 않는다'
  artifacts:
    - path: "tests/voice/vadLogic.test.ts"
      provides: "rmsToDb + isSilent + shouldStopByVad + shouldEnableVad 테스트"
    - path: "lib/voice/vadLogic.ts"
      provides: "빈 스텁 (테스트 실패용)"
---

<objective>
02-07(VAD 무음 감지)의 테스트를 작성한다.

hooks 안의 VAD 로직을 순수 함수로 추출하여 테스트:
1. rmsToDb: Float32Array에서 RMS → dB 변환
2. isSilent: dB 값이 임계값 미만인지
3. shouldStopByVad: 무음 시작 시각 + 현재 시각 + 지속시간 → 녹음 중단 여부
4. shouldEnableVad: isEditMode + enableVad + voiceStatus → VAD 활성화 여부

현재 useVoiceEditMode.ts의 VAD useEffect 안에 인라인으로 들어있는 로직을
lib/voice/vadLogic.ts로 추출할 예정. 스텁만 만들고 구현은 07b에서.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: lib/voice/vadLogic.ts 빈 스텁 생성</name>
  <files>lib/voice/vadLogic.ts</files>
  <action>
1. lib/voice/vadLogic.ts 생성:

   ```typescript
   import type { VoiceStatus } from '@/hooks/useVoice'

   /** VAD 기본 상수 */
   export const VAD_SILENCE_THRESHOLD_DB = -35
   export const VAD_SILENCE_DURATION_MS = 5000

   /**
    * Float32Array 오디오 샘플에서 RMS를 계산하고 dB로 변환한다.
    * @param samples - AnalyserNode.getFloatTimeDomainData() 결과
    * @returns dB 값 (무음에 가까울수록 음수가 큼)
    */
   export function rmsToDb(samples: Float32Array): number {
     throw new Error('Not implemented')
   }

   /**
    * dB 값이 무음 임계값 미만인지 판단한다.
    * @param db - rmsToDb() 결과
    * @param threshold - 임계값 (기본 VAD_SILENCE_THRESHOLD_DB)
    */
   export function isSilent(db: number, threshold?: number): boolean {
     throw new Error('Not implemented')
   }

   /**
    * 무음 지속 시간이 임계값을 초과했는지 판단한다.
    * @param silenceStartMs - 무음 시작 타임스탬프 (ms). null이면 아직 무음 시작 안 됨
    * @param nowMs - 현재 타임스탬프 (ms)
    * @param durationMs - 무음 지속 임계값 (기본 VAD_SILENCE_DURATION_MS)
    */
   export function shouldStopByVad(
     silenceStartMs: number | null,
     nowMs: number,
     durationMs?: number,
   ): boolean {
     throw new Error('Not implemented')
   }

   /**
    * VAD를 활성화해야 하는지 판단한다.
    * @param isEditMode - 수정 모드 활성 여부
    * @param enableVad - VAD feature flag
    * @param voiceStatus - 현재 음성 상태
    */
   export function shouldEnableVad(
     isEditMode: boolean,
     enableVad: boolean,
     voiceStatus: VoiceStatus,
   ): boolean {
     throw new Error('Not implemented')
   }
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
  - 타입, 상수, 함수 시그니처만 존재
  - 호출 시 throw
  </done>
</task>

<task type="auto">
  <name>Task 2: vadLogic 테스트 작성</name>
  <files>tests/voice/vadLogic.test.ts</files>
  <action>
1. tests/voice/vadLogic.test.ts 작성:

   ```typescript
   import { describe, it, expect } from 'vitest'
   import {
     rmsToDb,
     isSilent,
     shouldStopByVad,
     shouldEnableVad,
     VAD_SILENCE_THRESHOLD_DB,
     VAD_SILENCE_DURATION_MS,
   } from '@/lib/voice/vadLogic'

   describe('rmsToDb', () => {
     it('무음 (모든 샘플 0) → 매우 낮은 dB', () => {
       const samples = new Float32Array(1024).fill(0)
       const db = rmsToDb(samples)
       expect(db).toBeLessThan(-90)
     })

     it('최대 볼륨 (모든 샘플 1.0) → 0 dB', () => {
       const samples = new Float32Array(1024).fill(1.0)
       const db = rmsToDb(samples)
       expect(db).toBeCloseTo(0, 1)
     })

     it('중간 볼륨 (모든 샘플 0.1) → 약 -20 dB', () => {
       const samples = new Float32Array(1024).fill(0.1)
       const db = rmsToDb(samples)
       expect(db).toBeCloseTo(-20, 1)
     })

     it('작은 볼륨 (모든 샘플 0.01) → 약 -40 dB', () => {
       const samples = new Float32Array(1024).fill(0.01)
       const db = rmsToDb(samples)
       expect(db).toBeCloseTo(-40, 1)
     })
   })

   describe('isSilent', () => {
     it('-40 dB < 기본 임계값(-35) → true (무음)', () => {
       expect(isSilent(-40)).toBe(true)
     })

     it('-30 dB > 기본 임계값(-35) → false (소리 있음)', () => {
       expect(isSilent(-30)).toBe(false)
     })

     it('-35 dB = 기본 임계값 → false (경계값: 미만이 아님)', () => {
       expect(isSilent(-35)).toBe(false)
     })

     it('커스텀 임계값 사용', () => {
       expect(isSilent(-25, -20)).toBe(true)
       expect(isSilent(-15, -20)).toBe(false)
     })
   })

   describe('shouldStopByVad', () => {
     it('무음 시작 null → false (아직 무음 아님)', () => {
       expect(shouldStopByVad(null, 10000)).toBe(false)
     })

     it('무음 4초 → false (5초 미만)', () => {
       expect(shouldStopByVad(1000, 5000)).toBe(false)
     })

     it('무음 정확히 5초 → true', () => {
       expect(shouldStopByVad(1000, 6000)).toBe(true)
     })

     it('무음 6초 → true', () => {
       expect(shouldStopByVad(1000, 7000)).toBe(true)
     })

     it('커스텀 지속시간 3초', () => {
       expect(shouldStopByVad(1000, 3500, 3000)).toBe(false)
       expect(shouldStopByVad(1000, 4000, 3000)).toBe(true)
     })
   })

   describe('shouldEnableVad', () => {
     it('수정 모드 + VAD 켜짐 + recording → true', () => {
       expect(shouldEnableVad(true, true, 'recording')).toBe(true)
     })

     it('수정 모드 아님 → false', () => {
       expect(shouldEnableVad(false, true, 'recording')).toBe(false)
     })

     it('VAD 꺼짐 → false', () => {
       expect(shouldEnableVad(true, false, 'recording')).toBe(false)
     })

     it('idle 상태 → false', () => {
       expect(shouldEnableVad(true, true, 'idle')).toBe(false)
     })

     it('speaking 상태 → false', () => {
       expect(shouldEnableVad(true, true, 'speaking')).toBe(false)
     })

     it('processing 상태 → false', () => {
       expect(shouldEnableVad(true, true, 'processing')).toBe(false)
     })
   })
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test -- tests/voice/vadLogic.test.ts 2>&1 | tail -10</automated>
  </verify>
  <done>
  - vadLogic 테스트 전부 FAIL (스텁 throw)
  - 총 테스트: rmsToDb 4개 + isSilent 4개 + shouldStopByVad 5개 + shouldEnableVad 6개 = 19개
  </done>
</task>

</tasks>

<verification>
1. npm run test 실행 → 기존 45 PASS + vadLogic 19 FAIL
2. lib/voice/vadLogic.ts는 스텁만 존재
3. hooks/ 파일 수정 없음
4. 기존 테스트 파일 수정 없음
</verification>
