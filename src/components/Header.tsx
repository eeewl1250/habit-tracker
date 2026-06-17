import type { ViewMode } from '../types'

interface HeaderProps {
  rangeLabel: string
  viewMode: ViewMode
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewModeChange: (mode: ViewMode) => void
}

const modes: { key: ViewMode; label: string }[] = [
  { key: 'week', label: '週' },
  { key: 'month', label: '月' },
  { key: 'heatmap', label: '🔥' },
  { key: 'stats', label: '📊' },
]

export function Header({
  rangeLabel,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        <h1 className="text-lg font-bold text-gray-800 whitespace-nowrap">
          習慣トラッカー
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            &lt;
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded border border-gray-300"
          >
            今日
          </button>
          <span className="text-sm font-medium text-gray-800 min-w-[180px] text-center">
            {rangeLabel}
          </span>
          <button
            onClick={onNext}
            className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            &gt;
          </button>
        </div>

        <nav className="flex gap-1">
          {modes.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onViewModeChange(key)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
