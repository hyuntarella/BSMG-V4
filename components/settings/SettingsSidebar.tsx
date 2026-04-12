'use client'

export type SettingsMenu = '단가표' | '자주 쓰는 공종' | '기타 설정'

interface SettingsSidebarProps {
  active: SettingsMenu
  onChange: (menu: SettingsMenu) => void
}

const MENUS: { key: SettingsMenu; icon: string; desc: string }[] = [
  { key: '단가표', icon: '₩', desc: 'P매트릭스' },
  { key: '자주 쓰는 공종', icon: '★', desc: '즐겨찾기 · 기타 · 신규' },
  { key: '기타 설정', icon: '⚙', desc: '원가 · 규칙 · 보증' },
]

/**
 * iOS 세그먼트 컨트롤 스타일 탭 전환.
 */
export default function SettingsSidebar({ active, onChange }: SettingsSidebarProps) {
  return (
    <nav
      data-testid="settings-sidebar"
      className="rounded-xl bg-surface-muted p-1"
    >
      <div className="flex gap-1">
        {MENUS.map((m) => {
          const isActive = active === m.key
          return (
            <button
              key={m.key}
              onClick={() => onChange(m.key)}
              className={`flex-1 rounded-lg px-3 py-2.5 text-center transition-all ${
                isActive
                  ? 'bg-white font-semibold text-ink shadow-card'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <div className="text-sm">
                <span className="mr-1">{m.icon}</span>
                {m.key}
              </div>
              <div className={`mt-0.5 text-[10px] ${isActive ? 'text-ink-muted' : 'text-ink-muted/70'}`}>
                {m.desc}
              </div>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
