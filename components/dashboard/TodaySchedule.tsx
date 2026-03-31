'use client'

import { useEffect, useState } from 'react'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string | null
  type: string
  color: string
  memberName: string | null
}

function formatTime(dateStr: string): string {
  // dateStr은 YYYY-MM-DD 또는 YYYY-MM-DDTHH:MM:SS 형태
  if (dateStr.includes('T')) {
    const parts = dateStr.split('T')[1]?.split(':')
    if (parts && parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`
    }
  }
  return ''
}

export default function TodaySchedule() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/calendar/today')
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events ?? [])
      })
      .catch(() => {
        setEvents([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">
        오늘 일정{!loading && events.length > 0 ? ` (${events.length}건)` : ''}
      </h3>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400">
          불러오는 중...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white py-6 text-center">
          <p className="text-xs text-gray-400">오늘 일정이 없습니다</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-50">
          {events.map((event) => {
            const timeStr = formatTime(event.start)
            return (
              <div key={event.id} className="flex items-center gap-3 px-4 py-2.5">
                {/* 색상 점 */}
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: event.color }}
                />
                {/* 시간 */}
                {timeStr && (
                  <span className="w-10 shrink-0 text-xs text-gray-400 tabular-nums">
                    {timeStr}
                  </span>
                )}
                {/* 제목 */}
                <span className="min-w-0 flex-1 text-sm font-medium text-gray-800 truncate">
                  {event.title}
                </span>
                {/* 담당자 */}
                {event.memberName && (
                  <span className="shrink-0 text-xs text-gray-500">{event.memberName}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
