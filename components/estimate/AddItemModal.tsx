'use client'

import { useState, useEffect, useCallback } from 'react'
import type { EstimateItem, PresetRow } from '@/lib/estimate/types'

interface AddItemModalProps {
  open: boolean
  onClose: () => void
  onAdd: (item: Partial<EstimateItem>) => void
}

type Tab = 'preset' | 'custom'

const DEFAULT_PRESETS: PresetRow[] = [
  { company_id: '', name: '크랙보수', spec: 'V커팅+에폭시 충전', unit: 'm', mat: 3000, labor: 2000, exp: 0, category: '추가공종' },
  { company_id: '', name: '드라이비트 절개', spec: '외벽 실링', unit: 'm', mat: 5000, labor: 3000, exp: 0, category: '추가공종' },
  { company_id: '', name: '바탕미장 추가', spec: '시멘트 모르타르', unit: 'm²', mat: 3000, labor: 5000, exp: 0, category: '추가공종' },
  { company_id: '', name: '옥탑 방수', spec: 'KS 우레탄 1.0mm', unit: 'm²', mat: 8000, labor: 12000, exp: 0, category: '추가공종' },
  { company_id: '', name: '배수구 처리', spec: '청소+방수', unit: '개', mat: 10000, labor: 15000, exp: 0, category: '추가공종' },
  { company_id: '', name: '사다리차', spec: '1톤', unit: '일', mat: 0, labor: 0, exp: 120000, category: '장비' },
  { company_id: '', name: '스카이차', spec: '0.5톤', unit: '일', mat: 0, labor: 0, exp: 150000, category: '장비' },
  { company_id: '', name: '폐기물 처리', spec: '마대 및 운반', unit: '일', mat: 0, labor: 0, exp: 80000, category: '장비' },
]

type CategoryMap = Record<string, PresetRow[]>

export default function AddItemModal({ open, onClose, onAdd }: AddItemModalProps) {
  const [tab, setTab] = useState<Tab>('preset')
  const [presets, setPresets] = useState<PresetRow[]>(DEFAULT_PRESETS)
  const [name, setName] = useState('')
  const [spec, setSpec] = useState('')
  const [unit, setUnit] = useState('m²')
  const [qty, setQty] = useState(1)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    fetch('/api/presets')
      .then((r) => r.json())
      .then((data: PresetRow[]) => { if (Array.isArray(data) && data.length > 0) setPresets(data) })
      .catch(() => undefined)
  }, [open])

  const handlePresetAdd = useCallback(
    (p: PresetRow) => {
      onAdd({ name: p.name, spec: p.spec, unit: p.unit, qty: 1, mat: p.mat, labor: p.labor, exp: p.exp })
      onClose()
    },
    [onAdd, onClose],
  )

  const handleCustomAdd = useCallback(() => {
    if (!name.trim()) return
    onAdd({ name: name.trim(), spec, unit, qty, mat: 0, labor: 0, exp: 0 })
    setName(''); setSpec(''); setUnit('m²'); setQty(1)
    onClose()
  }, [name, spec, unit, qty, onAdd, onClose])

  if (!open) return null

  // 카테고리별 그룹핑
  const grouped: CategoryMap = presets.reduce<CategoryMap>((acc, p) => {
    const cat = p.category ?? '기타'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-bold text-gray-800">공종 추가</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <div className="flex border-b">
          <button
            onClick={() => setTab('preset')}
            className={`flex-1 py-2 text-xs font-medium ${
              tab === 'preset'
                ? 'border-b-2 border-brand text-brand'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            프리셋
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`flex-1 py-2 text-xs font-medium ${
              tab === 'custom'
                ? 'border-b-2 border-brand text-brand'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            자유입력
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 110px)' }}>
          {tab === 'preset' && (
            <div className="py-1">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="bg-gray-50 px-4 py-1.5 text-xs font-semibold text-gray-500">{category}</div>
                  {items.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetAdd(preset)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-blue-50"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-800">{preset.name}</span>
                        {preset.spec && (
                          <span className="ml-2 text-xs text-gray-400">{preset.spec}</span>
                        )}
                      </div>
                      <span className="ml-2 text-xs text-gray-400 shrink-0">{preset.unit}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === 'custom' && (
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">품명 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 크랙보수"
                  className="w-full rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">규격</label>
                <input
                  type="text"
                  value={spec}
                  onChange={(e) => setSpec(e.target.value)}
                  placeholder="예: V커팅+에폭시 충전"
                  className="w-full rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">단위</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  >
                    <option value="m²">m²</option>
                    <option value="m">m</option>
                    <option value="일">일</option>
                    <option value="개">개</option>
                    <option value="식">식</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">수량</label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    min={0}
                    step={1}
                    className="w-full rounded border px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleCustomAdd}
                disabled={!name.trim()}
                className="w-full rounded bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40"
              >
                추가
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
