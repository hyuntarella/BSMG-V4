'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { VoiceCommand } from '@/lib/voice/commands'
import { EXTRACT_SYSTEM, SUPPLEMENT_SYSTEM, getModifySystem, COMMAND_SYSTEM } from '@/lib/voice/prompts'

export type VoiceStatus = 'idle' | 'recording' | 'processing' | 'speaking'
export type VoiceMode = 'extract' | 'supplement' | 'modify' | 'command'

interface UseVoiceOptions {
  mode: VoiceMode
  /** modify 모드에서 견적서 상태 JSON */
  estimateContext?: string
  /** STT 힌트 프롬프트 (방수 용어 등) */
  sttPrompt?: string
  /** LLM 건너뛰기 (voiceFlow 모드에서 STT만 필요할 때) */
  skipLlm?: boolean
  /** 명령 실행 콜백 */
  onCommands?: (commands: VoiceCommand[]) => void
  /** extract/supplement 결과 콜백 */
  onParsed?: (parsed: Record<string, unknown>) => void
  /** STT 텍스트 콜백 (voiceFlow 연결용) */
  onSttText?: (text: string) => void
  /** TTS 응답 텍스트 콜백 */
  onTtsText?: (text: string) => void
  /** 되묻기 콜백 */
  onClarification?: (text: string) => void
  /** 에러 콜백 */
  onError?: (error: string) => void
}

const MAX_CLARIFICATION_COUNT = 2
const DEFAULT_STT_PROMPT = '방수 복합 우레탄 견적 바탕정리 바탕미장 복합시트 보호누름 우레탄도막 상도 톱코트 벽체실링 사다리차 스카이차 폐기물 크랙보수 드라이비트 헤베 평'

export function useVoice(options: UseVoiceOptions) {
  const {
    mode,
    estimateContext,
    sttPrompt = DEFAULT_STT_PROMPT,
    skipLlm = false,
  } = options

  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [seconds, setSeconds] = useState(0)
  const [lastText, setLastText] = useState('')

  // 콜백을 ref로 관리 — 의존성 문제 해결
  const callbacksRef = useRef(options)
  useEffect(() => { callbacksRef.current = options }, [options])

  // 내부 상태 refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recentCommandsRef = useRef<VoiceCommand[]>([])
  const clarificationCountRef = useRef(0)
  const modeRef = useRef(mode)
  const estimateContextRef = useRef(estimateContext)
  const skipLlmRef = useRef(skipLlm)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { estimateContextRef.current = estimateContext }, [estimateContext])
  useEffect(() => { skipLlmRef.current = skipLlm }, [skipLlm])

  // ── TTS 재생 ──
  const playTts = useCallback(async (text: string) => {
    try {
      setStatus('speaking')
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        setStatus('idle')
        return
      }

      const audioBlob = await res.blob()
      const url = URL.createObjectURL(audioBlob)
      const audio = new Audio(url)
      audioRef.current = audio

      // Promise로 감싸서 TTS 완료까지 await 가능
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url)
          audioRef.current = null
          setStatus('idle')
          resolve()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          audioRef.current = null
          setStatus('idle')
          resolve()
        }
        audio.play().catch(() => {
          setStatus('idle')
          resolve()
        })
      })
    } catch {
      setStatus('idle')
    }
  }, [])

  // ── modify 응답 처리 (확신도 분기) ──
  const handleModifyResponse = useCallback(
    async (data: {
      commands?: VoiceCommand[]
      clarification_needed?: string | null
      tts_response?: string
    }) => {
      const cb = callbacksRef.current
      const { commands, clarification_needed, tts_response } = data

      // 되묻기
      if (clarification_needed) {
        clarificationCountRef.current++
        if (clarificationCountRef.current > MAX_CLARIFICATION_COUNT) {
          await playTts('알겠습니다.')
          clarificationCountRef.current = 0
          return
        }
        cb.onClarification?.(clarification_needed)
        await playTts(clarification_needed)
        return
      }

      clarificationCountRef.current = 0

      if (commands && commands.length > 0) {
        recentCommandsRef.current = [
          ...recentCommandsRef.current.slice(-2),
          ...commands,
        ].slice(-3)

        cb.onCommands?.(commands)
      }

      if (tts_response) {
        cb.onTtsText?.(tts_response)
        await playTts(tts_response)
      } else {
        setStatus('idle')
      }
    },
    [playTts],
  )

  // ── command 응답 처리 ──
  const handleCommandResponse = useCallback(
    async (data: {
      action?: string
      params?: Record<string, unknown>
      tts_response?: string
    }) => {
      const cb = callbacksRef.current
      if (data.tts_response) {
        cb.onTtsText?.(data.tts_response)
        await playTts(data.tts_response)
      }
      if (data.action && data.action !== 'none') {
        cb.onCommands?.([{ action: data.action, ...data.params, confidence: 1 } as VoiceCommand])
      }
      if (!data.tts_response) {
        setStatus('idle')
      }
    },
    [playTts],
  )

  // ── 오디오 처리 파이프라인 ──
  const processAudio = useCallback(async () => {
    setStatus('processing')
    const cb = callbacksRef.current

    try {
      // 1. Blob → base64
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const base64 = await blobToBase64(blob)

      // 2. STT
      const sttRes = await fetch('/api/stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, prompt: sttPrompt }),
      })
      if (!sttRes.ok) throw new Error('STT 실패')
      const { text } = await sttRes.json()

      if (!text || text.trim().length === 0) {
        setStatus('idle')
        return
      }

      setLastText(text)

      // STT 텍스트 콜백 (voiceFlow 연결용)
      cb.onSttText?.(text)

      // skipLlm이면 여기서 종료 (voiceFlow가 직접 처리)
      if (skipLlmRef.current) {
        setStatus('idle')
        return
      }

      // 3. LLM
      const currentMode = modeRef.current
      const { system, user } = buildLlmPayload(
        currentMode,
        text,
        estimateContextRef.current,
        recentCommandsRef.current,
      )

      const llmRes = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, user }),
      })
      if (!llmRes.ok) throw new Error('LLM 실패')
      const llmData = await llmRes.json()

      // LLM JSON 파싱 실패 방어
      if (llmData.raw) {
        cb.onTtsText?.('다시 말씀해주시겠어요?')
        await playTts('다시 말씀해주시겠어요?')
        return
      }

      // 4. 모드별 처리 — await 필수
      if (currentMode === 'extract' || currentMode === 'supplement') {
        cb.onParsed?.(llmData)
        const missing = getMissingFields(llmData)
        if (missing) {
          cb.onTtsText?.(missing)
          await playTts(missing)
        } else {
          setStatus('idle')
        }
      } else if (currentMode === 'modify') {
        await handleModifyResponse(llmData)
      } else if (currentMode === 'command') {
        await handleCommandResponse(llmData)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '처리 중 오류'
      cb.onError?.(msg)
      setStatus('idle')
    }
  }, [sttPrompt, playTts, handleModifyResponse, handleCommandResponse])

  // ── 녹음 시작 ──
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })

      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        processAudio()
      }

      recorder.onerror = () => {
        callbacksRef.current.onError?.('녹음 오류')
        setStatus('idle')
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setStatus('recording')
      setSeconds(0)

      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1)
      }, 1000)
    } catch (err) {
      callbacksRef.current.onError?.('마이크 접근 실패')
      console.error(err)
    }
  }, [processAudio])

  // ── 녹음 중지 ──
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  // ── 녹음 토글 ──
  const toggleRecording = useCallback(() => {
    if (status === 'recording') {
      stopRecording()
    } else if (status === 'idle') {
      startRecording()
    }
  }, [status, startRecording, stopRecording])

  // ── TTS 중지 ──
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setStatus('idle')
  }, [])

  return {
    status,
    seconds,
    lastText,
    startRecording,
    stopRecording,
    toggleRecording,
    stopSpeaking,
    playTts,
  }
}

// ── 헬퍼 ──

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function buildLlmPayload(
  mode: VoiceMode,
  text: string,
  estimateContext?: string,
  recentCommands?: VoiceCommand[],
): { system: string; user: string } {
  switch (mode) {
    case 'extract':
      return { system: EXTRACT_SYSTEM, user: text }

    case 'supplement':
      return { system: SUPPLEMENT_SYSTEM, user: text }

    case 'modify':
      return {
        system: getModifySystem(
          estimateContext ?? '{}',
          JSON.stringify(recentCommands?.slice(-3) ?? []),
        ),
        user: text,
      }

    case 'command':
      return { system: COMMAND_SYSTEM, user: text }

    default:
      return { system: EXTRACT_SYSTEM, user: text }
  }
}

function getMissingFields(parsed: Record<string, unknown>): string | null {
  const labels: Record<string, string> = {
    method: '공법',
    area: '면적',
    leak: '누수 유무',
    rooftop: '옥탑 포함 여부',
  }

  const missing = Object.entries(labels)
    .filter(([key]) => parsed[key] === null || parsed[key] === undefined)
    .map(([, label]) => label)

  if (missing.length === 0) return null
  return `${missing.join(', ')} 말씀해주시면 완성됩니다.`
}
