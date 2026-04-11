'use client'

interface SettingsTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const TABS = ['단가표', '기본공종', '프리셋', '추가공종', '원가', '계산규칙', '장비단가', '보증']

export default function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <div className="overflow-x-auto whitespace-nowrap border-b border-gray-200 pb-0">
      <div className="flex gap-2 px-4 py-3">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
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
  )
}
