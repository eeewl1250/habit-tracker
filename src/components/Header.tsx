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
}

const modes: { key: ViewMode; label: string }[] = [
  { key: 'week', label: '週' },
  { key: 'month', label: '月' },
  { key: 'heatmap', label: '🔥' },
  { key: 'stats', label: '📊' },
  { key: 'notes', label: '📝' },
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
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-100 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-2 md:py-3 max-w-5xl mx-auto">
        <h1 className="text-base md:text-lg font-bold text-gray-800 whitespace-nowrap">
          習慣トラッカー
        </h1>

        {!hideDateNav && (
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={onPrev}
              className="px-2 py-1 md:px-2 text-gray-600 hover:bg-gray-100 rounded min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              &lt;
            </button>
            <button
              onClick={onToday}
              className="hidden md:block px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded border border-gray-300"
            >
              今日
            </button>
            <span className="text-xs md:text-sm font-medium text-gray-800 min-w-[140px] md:min-w-[180px] text-center">
              {rangeLabel}
            </span>
            <button
              onClick={onNext}
              className="px-2 py-1 md:px-2 text-gray-600 hover:bg-gray-100 rounded min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              &gt;
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 md:gap-2">
          <nav className="flex gap-0.5 md:gap-1">
            {modes.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onViewModeChange(key)}
                className={`px-2 md:px-3 py-1 md:py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] ${
                  viewMode === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="w-px h-5 bg-gray-200 hidden md:block" />
          <button
            onClick={onManage}
            className={`px-2 md:px-3 py-1 md:py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] ${
              managing
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            管理
          </button>
        </div>
      </div>
    </header>
  )
}
