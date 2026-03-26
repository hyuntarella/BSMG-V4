'use client'

export type TabId = 'cover' | 'complex' | 'urethane' | 'compare'

interface TabBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  hasComplex: boolean
  hasUrethane: boolean
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'cover', label: '표지' },
  { id: 'complex', label: '복합' },
  { id: 'urethane', label: '우레탄' },
  { id: 'compare', label: '비교' },
]

export default function TabBar({
  activeTab,
  onTabChange,
  hasComplex,
  hasUrethane,
}: TabBarProps) {
  return (
    <div className="flex border-b bg-white">
      {TABS.map((tab) => {
        // 시트 없으면 비활성
        const disabled =
          (tab.id === 'complex' && !hasComplex) ||
          (tab.id === 'urethane' && !hasUrethane) ||
          (tab.id === 'compare' && (!hasComplex || !hasUrethane))

        return (
          <button
            key={tab.id}
            onClick={() => !disabled && onTabChange(tab.id)}
            disabled={disabled}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-brand text-brand'
                : disabled
                  ? 'text-gray-300'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
