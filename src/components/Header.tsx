import { useState, useRef, useEffect } from 'react'
import type { ViewMode } from '../types'

interface HeaderProps {
  rangeLabel: string
  viewMode: ViewMode
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewModeChange: (mode: ViewMode) => void
  managing?: boolean
  onManage?: () => void
  hideDateNav?: boolean
  dark?: boolean
}

interface NavItem {
  key: ViewMode
  label: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: '習慣',
    items: [
      { key: 'week', label: '週' },
      { key: 'month', label: '月' },
      { key: 'heatmap', label: '🔥' },
      { key: 'stats', label: '統計' },
    ],
  },
  {
    label: '記録',
    items: [
      { key: 'schedule', label: '日程' },
      { key: 'diary', label: '日記' },
      { key: 'sleep', label: '睡眠' },
      { key: 'focus', label: '集中' },
      { key: 'craving', label: '欲望' },
      { key: 'menstruation', label: '生理' },
    ],
  },
  {
    label: '管理',
    items: [
      { key: 'finance', label: '家計簿' },
      { key: 'notes', label: 'メモ' },
    ],
  },
]

const allModes = navGroups.flatMap((g) => g.items)

function Dropdown({
  group,
  viewMode,
  dark,
  onSelect,
}: {
  group: NavGroup
  viewMode: ViewMode
  dark: boolean
  onSelect: (key: ViewMode) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isActive = group.items.some((item) => item.key === viewMode)
  const currentLabel = group.items.find((item) => item.key === viewMode)?.label ?? group.label

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={`flex-shrink-0 px-2 md:px-3 py-1 md:py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] whitespace-nowrap ${
          isActive
            ? 'bg-blue-600 text-white'
            : dark
              ? 'text-slate-300 hover:bg-slate-700'
              : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {currentLabel}
        <span className={`ml-1 inline-block transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute left-0 top-full mt-1 z-50 min-w-[140px] rounded-lg shadow-lg border py-1 ${
              dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}
          >
            {group.items.map((item) => (
              <button
                key={item.key}
                onClick={() => { onSelect(item.key); setOpen(false) }}
                className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                  viewMode === item.key
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : dark
                      ? 'text-slate-300 hover:bg-slate-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label.startsWith('🔥') ? item.label : `${item.label}`}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function Header({
  rangeLabel,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  managing = false,
  hideDateNav = false,
  dark = false,
}: HeaderProps) {
  const [spMenuOpen, setSpMenuOpen] = useState(false)

  const isHabitView = viewMode === 'week' || viewMode === 'month'
  const currentMainLabel = isHabitView ? '習慣' : (allModes.find((m) => m.key === viewMode)?.label ?? '')

  const handleNavClick = (key: ViewMode) => {
    onViewModeChange(key)
    setSpMenuOpen(false)
  }

  return (
    <header className={`sticky top-0 z-100 backdrop-blur border-b transition-colors ${
      dark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-gray-200'
    }`}>
      <div className="flex items-center justify-between px-4 py-2 md:py-3 max-w-5xl mx-auto">
        <h1 className={`hidden md:block text-base md:text-lg font-bold whitespace-nowrap transition-colors ${
          dark ? 'text-white' : 'text-gray-800'
        }`}>
          習慣トラッカー
        </h1>

        {!hideDateNav && (
          <div className="hidden md:flex items-center gap-1 md:gap-2">
            <button
              onClick={onPrev}
              className={`px-2 py-1 rounded min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors ${
                dark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              &lt;
            </button>
            <button
              onClick={onToday}
              className={`hidden md:block px-3 py-1 text-sm rounded border transition-colors ${
                dark
                  ? 'text-slate-300 hover:bg-slate-700 border-slate-600'
                  : 'text-gray-700 hover:bg-gray-100 border-gray-300'
              }`}
            >
              今日
            </button>
            <span className={`text-xs md:text-sm font-medium min-w-[140px] md:min-w-[180px] text-center transition-colors ${
              dark ? 'text-white' : 'text-gray-800'
            }`}>
              {rangeLabel}
            </span>
            <button
              onClick={onNext}
              className={`px-2 py-1 rounded min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors ${
                dark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              &gt;
            </button>
          </div>
        )}

        {/* PC nav */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => handleNavClick('home')}
            className={`flex-shrink-0 px-2 md:px-3 py-1 md:py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] ${
              viewMode === 'home'
                ? 'bg-blue-600 text-white'
                : dark
                  ? 'text-slate-300 hover:bg-slate-700'
                  : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ホーム
          </button>
          {navGroups.map((group) => (
            <Dropdown
              key={group.label}
              group={group}
              viewMode={viewMode}
              dark={dark}
              onSelect={handleNavClick}
            />
          ))}
        </div>

        {/* SP nav */}
        <div className="md:hidden flex items-center gap-0.5">
          <button
            onClick={() => onViewModeChange(viewMode)}
            className={`flex-shrink-0 px-2 md:px-3 py-1 md:py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] ${
              managing
                ? dark
                  ? 'text-slate-300 hover:bg-slate-700'
                  : 'text-gray-600 hover:bg-gray-100'
                : 'bg-blue-600 text-white'
            }`}
          >
            {currentMainLabel}
          </button>
          <button
            onClick={() => setSpMenuOpen((p) => !p)}
            className={`flex-shrink-0 px-2 py-1 rounded min-w-[36px] min-h-[36px] flex items-center justify-center text-lg transition-colors ${
              dark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {spMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {spMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSpMenuOpen(false)} />
          <div className={`md:hidden absolute left-0 right-0 top-full z-50 shadow-lg px-4 py-3 border-b transition-colors ${
            dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <div className="mb-3">
              <button
                onClick={() => handleNavClick('home')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  viewMode === 'home'
                    ? 'bg-blue-600 text-white'
                    : dark
                      ? 'text-slate-300 bg-slate-700 hover:bg-slate-600'
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                ホーム
              </button>
            </div>
            {navGroups.map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                <div className={`text-xs font-bold px-2 py-1 ${
                  dark ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  {group.label}
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.items.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => handleNavClick(item.key)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        viewMode === item.key
                          ? 'bg-blue-600 text-white'
                          : dark
                            ? 'text-slate-300 bg-slate-700 hover:bg-slate-600'
                            : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {item.label.startsWith('🔥') ? item.label : item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </header>
  )
}
