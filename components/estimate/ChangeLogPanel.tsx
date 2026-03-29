'use client'

import type { Snapshot } from '@/hooks/useEstimate'

interface ChangeLogPanelProps {
  snapshots: Snapshot[]
  onRestore: (index: number) => void
  onClose: () => void
}

export default function ChangeLogPanel({ snapshots, onRestore, onClose }: ChangeLogPanelProps) {
  if (snapshots.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-gray-400">
        수정 이력이 없습니다
      </div>
    )
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-semibold text-gray-700">수정 이력 ({snapshots.length})</span>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">닫기</button>
      </div>
      <div className="p-2">
        {[...snapshots].reverse().map((snap, revIdx) => {
          const idx = snapshots.length - 1 - revIdx
          return (
            <div
              key={snap.timestamp}
              className="flex items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <TypeBadge type={snap.type} />
                  <span className="truncate text-gray-700">{snap.description}</span>
                </div>
                <span className="text-[10px] text-gray-400">{formatTime(snap.timestamp)}</span>
              </div>
              <button
                onClick={() => onRestore(idx)}
                className="shrink-0 rounded px-2 py-0.5 text-[10px] text-brand hover:bg-brand/10"
              >
                복원
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    voice: 'bg-blue-50 text-blue-600',
    manual: 'bg-green-50 text-green-600',
    auto: 'bg-gray-50 text-gray-500',
  }
  const labels: Record<string, string> = { voice: '음성', manual: '수동', auto: '자동' }
  return (
    <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${styles[type] ?? styles.auto}`}>
      {labels[type] ?? type}
    </span>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
