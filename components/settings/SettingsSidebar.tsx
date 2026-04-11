'use client'

export type SettingsMenu = '단가표' | '자주 쓰는 공종' | '기타 설정'

interface SettingsSidebarProps {
  active: SettingsMenu
  onChange: (menu: SettingsMenu) => void
}

const MENUS: { key: SettingsMenu; desc: string }[] = [
  { key: '단가표', desc: 'P매트릭스' },
  { key: '자주 쓰는 공종', desc: '즐겨찾기 · 기타 · 신규' },
  { key: '기타 설정', desc: '원가 · 규칙 · 보증' },
]

export default function SettingsSidebar({ active, onChange }: SettingsSidebarProps) {
  return (
    <nav
      data-testid="settings-sidebar"
      className="md:w-52 md:shrink-0 md:border-r md:border-gray-200 md:bg-gray-50"
    >
      {/* 모바일: 가로 스크롤 칩 */}
      <div className="flex gap-2 overflow-x-auto whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-2 md:hidden">
        {MENUS.map((m) => (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active === m.key
                ? 'bg-brand text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {m.key}
          </button>
        ))}
      </div>

      {/* 데스크탑: 세로 리스트 */}
      <ul className="hidden md:block md:py-3">
        {MENUS.map((m) => (
          <li key={m.key}>
            <button
              onClick={() => onChange(m.key)}
              className={`block w-full border-l-4 px-4 py-3 text-left text-sm transition-colors ${
                active === m.key
                  ? 'border-brand bg-white font-semibold text-brand'
                  : 'border-transparent text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              <div>{m.key}</div>
              <div className="mt-0.5 text-[11px] font-normal text-gray-400">{m.desc}</div>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
