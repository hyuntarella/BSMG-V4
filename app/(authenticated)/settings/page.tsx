'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import SettingsTabs from '@/components/settings/SettingsTabs'
import PriceMatrixEditor from '@/components/settings/PriceMatrixEditor'
import BaseItemsEditor from '@/components/settings/BaseItemsEditor'
import PresetsEditor from '@/components/settings/PresetsEditor'
import CostEditor from '@/components/settings/CostEditor'
import CalcRulesEditor from '@/components/settings/CalcRulesEditor'
import EquipmentEditor from '@/components/settings/EquipmentEditor'
import WarrantyEditor from '@/components/settings/WarrantyEditor'
import SettingsSummary from '@/components/settings/SettingsSummary'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('단가표')

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">설정</h1>
        <div className="mb-4">
          <SettingsSummary />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white">
          <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="p-4">
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
    </div>
  )
}
