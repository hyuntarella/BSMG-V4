/**
 * TTS 재생 유틸리티.
 * 운전 모드에서 모든 실행 결과를 TTS로 읽어준다.
 * Web Audio API 기반, hook이 아닌 순수 유틸.
 */

/** TTS 재생 상태 리스너 */
export type TtsStateListener = (playing: boolean) => void

let currentAudio: HTMLAudioElement | null = null
let stateListener: TtsStateListener | null = null
let cooldownTimer: ReturnType<typeof setTimeout> | null = null
const COOLDOWN_MS = 500

/** TTS 상태 변경 리스너 등록 */
export function onTtsStateChange(listener: TtsStateListener): () => void {
  stateListener = listener
  return () => {
    if (stateListener === listener) stateListener = null
  }
}

/** TTS 현재 재생 중인지 */
export function isTtsPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused
}

/**
 * TTS 재생. /api/tts 엔드포인트를 호출하여 오디오 스트림을 재생.
 * @param text 읽을 텍스트
 * @returns 재생 완료 시 resolve되는 Promise
 */
export async function playTts(text: string): Promise<void> {
  if (!text.trim()) return

  // 기존 재생 중단
  stopTts()

  // 쿨다운 체크
  if (cooldownTimer) {
    clearTimeout(cooldownTimer)
    cooldownTimer = null
  }

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      console.error('[TTS] API 실패:', res.status)
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio = audio

    stateListener?.(true)

    return new Promise<void>((resolve) => {
      audio.onended = () => {
        cleanup(url)
        // 쿨다운 후 상태 변경 (마이크 자동 재개 타이밍)
        cooldownTimer = setTimeout(() => {
          stateListener?.(false)
          cooldownTimer = null
        }, COOLDOWN_MS)
        resolve()
      }
      audio.onerror = () => {
        cleanup(url)
        stateListener?.(false)
        resolve()
      }
      audio.play().catch(() => {
        cleanup(url)
        stateListener?.(false)
        resolve()
      })
    })
  } catch (err) {
    console.error('[TTS] error:', err)
    stateListener?.(false)
  }
}

/** TTS 즉시 중단 */
export function stopTts(): void {
  if (currentAudio) {
    currentAudio.pause()
    if (currentAudio.src) {
      URL.revokeObjectURL(currentAudio.src)
    }
    currentAudio = null
    stateListener?.(false)
  }
}

function cleanup(url: string): void {
  URL.revokeObjectURL(url)
  currentAudio = null
}
