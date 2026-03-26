'use client'

import { useState } from 'react'

interface EmailModalProps {
  open: boolean
  defaultTo?: string
  onSend: (to: string) => void
  onClose: () => void
  sending: boolean
}

export default function EmailModal({
  open,
  defaultTo = '',
  onSend,
  onClose,
  sending,
}: EmailModalProps) {
  const [to, setTo] = useState(defaultTo)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold">견적서 이메일 발송</h3>

        <label className="mb-1 block text-sm font-medium text-gray-600">
          수신자 이메일
        </label>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="customer@example.com"
          className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          autoFocus
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={sending}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={() => to && onSend(to)}
            disabled={sending || !to}
            className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {sending ? '발송 중...' : '발송'}
          </button>
        </div>
      </div>
    </div>
  )
}
