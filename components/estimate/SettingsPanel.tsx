'use client'

import { useState } from 'react'
import PriceMatrixEditor from '@/components/settings/PriceMatrixEditor'
import BaseItemsEditor from '@/components/settings/BaseItemsEditor'
import PresetsEditor from '@/components/settings/PresetsEditor'
import CostEditor from '@/components/settings/CostEditor'
import CalcRulesEditor from '@/components/settings/CalcRulesEditor'
import EquipmentEditor from '@/components/settings/EquipmentEditor'
import WarrantyEditor from '@/components/settings/WarrantyEditor'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

const TABS = ['단가표', '기본공종', '프리셋', '원가', '계산규칙', '장비단가', '보증']

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState('단가표')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">견적서 설정</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="overflow-x-auto whitespace-nowrap border-b">
          <div className="flex gap-1.5 px-3 py-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-brand text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === '단가표' && <PriceMatrixEditor />}
          {activeTab === '기본공종' && <BaseItemsEditor />}
          {activeTab === '프리셋' && <PresetsEditor />}
          {activeTab === '원가' && <CostEditor />}
          {activeTab === '계산규칙' && <CalcRulesEditor />}
          {activeTab === '장비단가' && <EquipmentEditor />}
          {activeTab === '보증' && <WarrantyEditor />}
        </div>
      </div>
    </div>
  )
}
