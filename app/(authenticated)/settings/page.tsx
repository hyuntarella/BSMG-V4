'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import SettingsTabs from '@/components/settings/SettingsTabs'
import PriceMatrixEditor from '@/components/settings/PriceMatrixEditor'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('단가표')

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">설정</h1>
        <div className="rounded-lg border border-gray-200 bg-white">
          <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="p-4">
            {activeTab === '단가표' && <PriceMatrixEditor />}
            {activeTab === '기본공종' && (
              <PlaceholderTab label="기본공종" note="Phase 38에서 구현" />
            )}
            {activeTab === '프리셋' && (
              <PlaceholderTab label="프리셋" note="Phase 38에서 구현" />
            )}
            {activeTab === '원가' && (
              <PlaceholderTab label="원가" note="Phase 39에서 구현" />
            )}
            {activeTab === '계산규칙' && (
              <PlaceholderTab label="계산규칙" note="Phase 39에서 구현" />
            )}
            {activeTab === '장비단가' && (
              <PlaceholderTab label="장비단가" note="Phase 38에서 구현" />
            )}
            {activeTab === '보증' && (
              <PlaceholderTab label="보증" note="Phase 39에서 구현" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlaceholderTab({ label, note }: { label: string; note: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
      <p className="text-gray-500">{label} 탭</p>
      <p className="mt-2 text-sm text-gray-400">{note}</p>
    </div>
  )
}
