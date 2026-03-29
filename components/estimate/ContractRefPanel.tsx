'use client'

import { useState, useEffect, useMemo } from 'react'

interface ContractRefPanelProps {
  isOpen: boolean
  onClose: () => void
  currentPyeong?: number
}

interface ContractRecord {
  id: string
  d: string
  a: string
  c: string
  m: string
  v: number
  p: number
  t: string
  pp: number
  source: 'hardcoded' | 'notion'
}

export default function ContractRefPanel({ isOpen, onClose, currentPyeong }: ContractRefPanelProps) {
  const [records, setRecords] = useState<ContractRecord[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'area'>('date')
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // 하드코딩 89건 로드
    fetch('/contract-data.json')
      .then(r => r.json())
      .then((data: ContractRecord[]) => {
        const hardcoded = data.map(r => ({ ...r, source: 'hardcoded' as const }))
        setRecords(hardcoded)
      })
      .catch(() => {})

    // Notion CRM 추가 로드 (있으면)
    fetch('/api/notion/crm')
      .then(r => r.json())
      .then(d => {
        if (d.records) {
          const notionRecords: ContractRecord[] = d.records
            .filter((r: Record<string, unknown>) => r.계약금액 || r.견적금액)
            .map((r: Record<string, unknown>) => ({
              id: r.id as string,
              d: (r.문의일자 as string) ?? '',
              a: (r.주소 as string) ?? '',
              c: (r.고객명 as string) ?? '',
              m: (r.담당자 as string) ?? '',
              v: (r.계약금액 as number) ?? (r.견적금액 as number) ?? 0,
              p: 0,
              t: ((r.시공분야 as string[]) ?? []).join(', '),
              pp: 0,
              source: 'notion' as const,
            }))
          setRecords(prev => [...prev, ...notionRecords])
        }
      })
      .catch(() => {})
  }, [isOpen])

  const filtered = useMemo(() => {
    let list = records
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => r.a.toLowerCase().includes(q) || r.c.toLowerCase().includes(q) || r.m.toLowerCase().includes(q))
    }
    if (sortBy === 'date') list = [...list].sort((a, b) => b.d.localeCompare(a.d))
    else if (sortBy === 'amount') list = [...list].sort((a, b) => b.v - a.v)
    else if (sortBy === 'area' && currentPyeong) list = [...list].sort((a, b) => Math.abs(a.p - currentPyeong) - Math.abs(b.p - currentPyeong))
    return list
  }, [records, search, sortBy, currentPyeong])

  const avgPP = records.filter(r => r.pp > 0).length > 0
    ? Math.round(records.filter(r => r.pp > 0).reduce((s, r) => s + r.pp, 0) / records.filter(r => r.pp > 0).length)
    : 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">계약참조 ({records.length}건)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>
        <div className="p-4">
          <div className="mb-3 flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..." className="flex-1 rounded border px-2 py-1 text-xs" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="rounded border px-2 py-1 text-xs">
              <option value="date">최신순</option><option value="amount">금액순</option><option value="area">면적유사</option>
            </select>
          </div>
          {avgPP > 0 && (
            <div className="mb-3 rounded bg-brand/5 px-3 py-2 text-center">
              <span className="text-xs text-gray-500">평균 평단가</span>
              <span className="ml-2 text-sm font-bold text-brand">{avgPP.toLocaleString()}원/평</span>
            </div>
          )}
          <div className="space-y-2">
            {filtered.map(r => (
              <div key={r.id} className="rounded border p-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold">{r.a}</span>
                  <span className={`rounded px-1 py-0.5 text-[9px] ${r.source === 'notion' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}>
                    {r.source === 'notion' ? 'CRM' : '과거'}
                  </span>
                </div>
                <div className="mt-1 flex gap-3 text-gray-500">
                  {r.p > 0 && <span>{r.p}평</span>}
                  <span className="font-bold text-gray-700">{(r.v / 10000).toFixed(0)}만</span>
                  {r.pp > 0 && <span className="text-brand">{r.pp.toLocaleString()}원/평</span>}
                  <span>{r.d}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
