import { useState, useRef, useLayoutEffect } from 'react'
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

const modes: { key: ViewMode; label: string }[] = [
  { key: 'sleep', label: '睡眠' },
  { key: 'week', label: '週' },
  { key: 'month', label: '月' },
  { key: 'focus', label: '集中' },
  { key: 'heatmap', label: '🔥' },
  { key: 'stats', label: '統計' },
  { key: 'notes', label: 'メモ' },
  { key: 'craving', label: '欲望' },
  { key: 'menstruation', label: '生理' },
]

export function Header({
  rangeLabel,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  managing = false,
  onManage = () => {},
  hideDateNav = false,
  dark = false,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const curBtnRef = useRef<HTMLButtonElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const widthsByKey = useRef<Record<string, number>>({})
  const [maxVisible, setMaxVisible] = useState(modes.length - 1)

  const isHabitView = viewMode === 'week' || viewMode === 'month'
  const navModes = modes
    .filter((m) => m.key !== 'month')
    .map((m) => (m.key === 'week' ? { key: m.key as ViewMode, label: '習慣' } : m))
  const currentLabel = isHabitView ? '習慣' : (modes.find((m) => m.key === viewMode)?.label ?? '')
  const otherModes = navModes.filter((m) => m.key !== (isHabitView ? 'week' : viewMode))

  useLayoutEffect(() => {
    const con = containerRef.current
    const nav = navRef.current
    const cur = curBtnRef.current
    const menu = menuBtnRef.current
    if (!con || !nav) return

    const measure = () => {
      const children = Array.from(nav.children) as HTMLElement[]

      for (const child of children) {
        const key = child.getAttribute('data-key') ?? ''
        if (!(key in widthsByKey.current)) {
          widthsByKey.current[key] = child.offsetWidth
        }
      }

      const curW = cur?.offsetWidth ?? 0
      const hasMenu = menu !== null && menu.offsetWidth > 0
      const parentGap = 4
      const available = hasMenu
        ? con.clientWidth - curW - menu.offsetWidth - parentGap * 2
        : con.clientWidth - curW - parentGap

      let total = 0
      let count = children.length
      const itemGap = 2

      for (let i = 0; i < children.length; i++) {
        const key = children[i].getAttribute('data-key') ?? ''
        total += widthsByKey.current[key] ?? 0
        if (i < children.length - 1) total += itemGap
        if (total > available) {
          count = i
          break
        }
      }

      setMaxVisible(Math.max(1, count))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(con)
    return () => ro.disconnect()
  }, [viewMode])

  const handleNavClick = (key: ViewMode) => {
    onViewModeChange(key)
    setMenuOpen(false)
  }

  const navChildrenCount = otherModes.length + 1
  const hasOverflow = maxVisible < navChildrenCount

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

        <div ref={containerRef} className="flex items-center gap-1 md:gap-2 min-w-0 flex-shrink">
          {/* PC nav */}
          <div className="hidden md:flex items-center gap-0.5 md:gap-1">
            {modes.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onViewModeChange(key)}
                className={`flex-shrink-0 px-2 md:px-3 py-1 md:py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] ${
                  viewMode === key
                    ? 'bg-blue-600 text-white'
                    : dark
                      ? 'text-slate-300 hover:bg-slate-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={onManage}
              className={`flex-shrink-0 px-2 md:px-3 py-1 md:py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] ${
                managing
                  ? 'bg-blue-600 text-white'
                  : dark
                    ? 'text-slate-300 hover:bg-slate-700'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              管理
            </button>
          </div>

          {/* SP nav */}
          <div className="md:hidden flex items-center gap-0.5 md:gap-1">
            <button
              ref={curBtnRef}
              onClick={() => onViewModeChange(viewMode)}
              className={`flex-shrink-0 px-2 md:px-3 py-1 md:py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] ${
                managing
                  ? dark
                    ? 'text-slate-300 hover:bg-slate-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {currentLabel}
            </button>
            <div ref={navRef} className="flex gap-0.5 md:gap-1 overflow-hidden">
              {otherModes.map(({ key, label }, i) => (
                <button
                  key={key}
                  data-key={key}
                  onClick={() => onViewModeChange(key)}
                  className={`flex-shrink-0 px-2 md:px-3 py-1 md:py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] ${
                    i >= maxVisible ? 'hidden' : ''
                  } ${
                    dark
                      ? 'text-slate-300 hover:bg-slate-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                data-key="manage"
                onClick={onManage}
                className={`flex-shrink-0 px-2 md:px-3 py-1 md:py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] ${
                  otherModes.length >= maxVisible ? 'hidden' : ''
                } ${
                  managing
                    ? 'bg-blue-600 text-white'
                    : dark
                      ? 'text-slate-300 hover:bg-slate-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                管理
              </button>
            </div>
            {hasOverflow && (
              <button
                ref={menuBtnRef}
                onClick={() => setMenuOpen((p) => !p)}
                className={`flex-shrink-0 px-2 py-1 rounded min-w-[36px] min-h-[36px] flex items-center justify-center text-lg transition-colors md:hidden ${
                  dark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className={`md:hidden absolute left-0 right-0 top-full z-50 shadow-lg px-4 py-3 border-b transition-colors ${
            dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex flex-wrap gap-2">
              {navModes.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleNavClick(key)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    viewMode === key
                      ? 'bg-blue-600 text-white'
                      : dark
                        ? 'text-slate-300 bg-slate-700 hover:bg-slate-600'
                        : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className={`w-full h-px ${dark ? 'bg-slate-600' : 'bg-gray-200'}`} />
              <button
                onClick={() => { onManage(); setMenuOpen(false) }}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  managing
                    ? 'bg-blue-600 text-white'
                    : dark
                      ? 'text-slate-300 bg-slate-700 hover:bg-slate-600'
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                管理
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
