'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import SettingsSidebar, { type SettingsMenu } from '@/components/settings/SettingsSidebar'
import SettingsSummary from '@/components/settings/SettingsSummary'
import PriceMatrixEditor from '@/components/settings/PriceMatrixEditor'
import FavoriteItemsPage from '@/components/settings/FavoriteItemsPage'
import OtherSettingsPage from '@/components/settings/OtherSettingsPage'

export default function SettingsPage() {
  const [menu, setMenu] = useState<SettingsMenu>('단가표')

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">설정</h1>
        <div className="mb-4">
          <SettingsSummary />
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white md:flex">
          <SettingsSidebar active={menu} onChange={setMenu} />
          <div className="min-w-0 flex-1 p-4">
            {menu === '단가표' && <PriceMatrixEditor />}
            {menu === '자주 쓰는 공종' && <FavoriteItemsPage />}
            {menu === '기타 설정' && <OtherSettingsPage />}
          </div>
        </div>
      </div>
    </div>
  )
}
