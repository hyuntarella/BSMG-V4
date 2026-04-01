'use client'

export type TabId =
  | 'complex-cover'
  | 'complex-detail'
  | 'urethane-cover'
  | 'urethane-detail'
  | 'compare'

interface TabBarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  hasComplex: boolean
  hasUrethane: boolean
}

const TABS: { id: TabId; label: string; requires: 'complex' | 'urethane' | 'both' | 'none' }[] = [
  { id: 'complex-cover', label: '복합-표지', requires: 'complex' },
  { id: 'complex-detail', label: '복합-세부', requires: 'complex' },
  { id: 'urethane-cover', label: '우레탄-표지', requires: 'urethane' },
  { id: 'urethane-detail', label: '우레탄-세부', requires: 'urethane' },
  { id: 'compare', label: '비교', requires: 'both' },
]

export default function TabBar({
  activeTab,
  onTabChange,
  hasComplex,
  hasUrethane,
}: TabBarProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto bg-surface-muted px-3 py-2">
      {TABS.map((tab) => {
        const disabled =
          (tab.requires === 'complex' && !hasComplex) ||
          (tab.requires === 'urethane' && !hasUrethane) ||
          (tab.requires === 'both' && (!hasComplex || !hasUrethane))

        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => !disabled && onTabChange(tab.id)}
            disabled={disabled}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              isActive
                ? 'bg-brand-900 text-white shadow-card'
                : disabled
                  ? 'text-ink-faint'
                  : 'text-ink-secondary hover:bg-white hover:text-ink hover:shadow-card'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
