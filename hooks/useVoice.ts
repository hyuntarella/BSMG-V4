'use client'

import { useState, useRef, useCallback } from 'react'
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
  /** 명령 실행 콜백 */
  onCommands?: (commands: VoiceCommand[]) => void
  /** extract/supplement 결과 콜백 */
  onParsed?: (parsed: Record<string, unknown>) => void
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
    onCommands,
    onParsed,
    onTtsText,
    onClarification,
    onError,
  } = options

  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [seconds, setSeconds] = useState(0)
  const [lastText, setLastText] = useState('')

  // 내부 상태 refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recentCommandsRef = useRef<VoiceCommand[]>([])
  const clarificationCountRef = useRef(0)

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

      recorder.start()
      mediaRecorderRef.current = recorder
      setStatus('recording')
      setSeconds(0)

      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1)
      }, 1000)
    } catch (err) {
      onError?.('마이크 접근 실패')
      console.error(err)
    }
  }, [onError])

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

  // ── 오디오 처리 파이프라인 ──
  const processAudio = useCallback(async () => {
    setStatus('processing')

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

      // 3. LLM
      const { system, user } = buildLlmPayload(
        mode,
        text,
        estimateContext,
        recentCommandsRef.current,
      )

      const llmRes = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, user }),
      })
      if (!llmRes.ok) throw new Error('LLM 실패')
      const llmData = await llmRes.json()

      // 4. 모드별 처리
      if (mode === 'extract' || mode === 'supplement') {
        onParsed?.(llmData)
        // 빠진 필드 안내 TTS
        const missing = getMissingFields(llmData)
        if (missing) {
          await playTts(missing)
          onTtsText?.(missing)
        }
      } else if (mode === 'modify') {
        handleModifyResponse(llmData)
      } else if (mode === 'command') {
        handleCommandResponse(llmData)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '처리 중 오류'
      onError?.(msg)
      setStatus('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, estimateContext, sttPrompt])

  // ── modify 응답 처리 (확신도 분기) ──
  const handleModifyResponse = useCallback(
    async (data: {
      commands?: VoiceCommand[]
      clarification_needed?: string | null
      tts_response?: string
    }) => {
      const { commands, clarification_needed, tts_response } = data

      // 되묻기
      if (clarification_needed) {
        clarificationCountRef.current++
        if (clarificationCountRef.current > MAX_CLARIFICATION_COUNT) {
          await playTts('알겠습니다.')
          clarificationCountRef.current = 0
          return
        }
        onClarification?.(clarification_needed)
        await playTts(clarification_needed)
        return
      }

      clarificationCountRef.current = 0

      if (commands && commands.length > 0) {
        // 컨텍스트 유지: 최근 3개
        recentCommandsRef.current = [
          ...recentCommandsRef.current.slice(-2),
          ...commands,
        ].slice(-3)

        onCommands?.(commands)
      }

      if (tts_response) {
        onTtsText?.(tts_response)
        await playTts(tts_response)
      }
    },
    [onCommands, onClarification, onTtsText],
  )

  // ── command 응답 처리 ──
  const handleCommandResponse = useCallback(
    async (data: {
      action?: string
      params?: Record<string, unknown>
      tts_response?: string
    }) => {
      if (data.tts_response) {
        onTtsText?.(data.tts_response)
        await playTts(data.tts_response)
      }
      if (data.action && data.action !== 'none') {
        onCommands?.([{ action: data.action, ...data.params, confidence: 1 } as VoiceCommand])
      }
    },
    [onCommands, onTtsText],
  )

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

      audio.onended = () => {
        URL.revokeObjectURL(url)
        audioRef.current = null
        setStatus('idle')
      }

      await audio.play()
    } catch {
      setStatus('idle')
    }
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
