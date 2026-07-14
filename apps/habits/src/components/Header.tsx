import type { ViewMode } from '@habit-tracker/shared'

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

const navItems: { key: ViewMode; label: string }[] = [
  { key: 'week', label: '週' },
  { key: 'month', label: '月' },
  { key: 'heatmap', label: '🔥' },
  { key: 'stats', label: '統計' },
  { key: 'notes', label: 'メモ' },
]

export function Header({
  rangeLabel,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
  managing = false,
  onManage,
  hideDateNav = false,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-2 md:py-3 max-w-5xl mx-auto">
        <h1 className="text-base md:text-lg font-bold whitespace-nowrap text-gray-800">
          習慣トラッカー
        </h1>

        {!hideDateNav && (
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={onPrev}
              className="px-2 py-1 rounded min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              &lt;
            </button>
            <button
              onClick={onToday}
              className="px-3 py-1 text-sm rounded border text-gray-700 hover:bg-gray-100 border-gray-300 transition-colors"
            >
              今日
            </button>
            <span className="text-xs md:text-sm font-medium min-w-[140px] md:min-w-[180px] text-center text-gray-800">
              {rangeLabel}
            </span>
            <button
              onClick={onNext}
              className="px-2 py-1 rounded min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
            >
              &gt;
            </button>
          </div>
        )}

        <div className="flex items-center gap-1">
          {onManage && (
            <button
              onClick={onManage}
              className={`flex-shrink-0 px-2 md:px-3 py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] ${
                managing
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              管理
            </button>
          )}
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onViewModeChange(item.key)}
              className={`flex-shrink-0 px-2 md:px-3 py-1 text-xs md:text-sm rounded transition-colors min-h-[36px] whitespace-nowrap ${
                viewMode === item.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
