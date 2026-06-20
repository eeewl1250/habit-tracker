import { useMenstruation, MENSTRUATION_OPTIONS } from '../hooks/useMenstruation'

const LEVEL_LABELS = ['', '少', '中', '多']
const LEVEL_COLORS = [
  '',
  'bg-red-100 hover:bg-red-200',
  'bg-red-300 hover:bg-red-400',
  'bg-red-600 hover:bg-red-700',
]
const LEVEL_TEXT_COLORS = ['', 'text-red-900', 'text-red-900', 'text-white']

export function MenstruationView() {
  const {
    rows,
    loading,
    optionKey,
    handleOptionChange,
    goPrev,
    goNext,
    goToday,
    toggleCell,
    currentPageHasToday,
  } = useMenstruation()

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded border"
          >
            &lt;
          </button>
          {!currentPageHasToday && (
            <button
              onClick={goToday}
              className="px-3 py-1 text-sm text-pink-700 hover:bg-pink-50 rounded border border-pink-300"
            >
              今日に戻る
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-sm flex-wrap justify-center">
          {MENSTRUATION_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleOptionChange(key)}
              className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                optionKey === key
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={goNext}
          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded border"
        >
          &gt;
        </button>
      </div>

      {loading && (
        <div className="text-center text-gray-400 py-8 text-sm">読み込み中...</div>
      )}

      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 px-1 py-1 text-left text-gray-500 font-normal min-w-[80px]" />
                {Array.from({ length: 31 }, (_, i) => (
                  <th
                    key={i}
                    className="text-center text-gray-400 font-normal w-7 h-7 text-[10px] bg-gray-50 p-0.5"
                  >
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ym}>
                  <td
                    className={`sticky left-0 z-10 p-0.5 text-xs font-medium whitespace-nowrap ${
                      row.isCurrent ? 'text-pink-700' : 'text-gray-700'
                    }`}
                  >
                    {row.year}年{row.month}月
                  </td>
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1
                    const level = row.levels.get(day) ?? 0
                    const isToday =
                      row.isCurrent && day === new Date().getDate()
                    const isValidDay = day <= row.daysInMonth

                    return (
                      <td key={day} className="p-0.5">
                        {isValidDay ? (
                          <button
                            onClick={() => toggleCell(row.ym, day)}
                            className={`w-5 h-5 flex items-center justify-center rounded-sm text-[10px] transition-colors ${
                              level > 0
                                ? `${LEVEL_COLORS[level]} ${LEVEL_TEXT_COLORS[level]}`
                                : 'bg-gray-200 hover:bg-gray-100'
                            } ${isToday && level === 0 ? 'ring-1 ring-pink-300' : ''}`}
                          >
                            {level > 0 ? LEVEL_LABELS[level] : ''}
                          </button>
                        ) : (
                          <div className="w-5 h-5 bg-gray-200" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
        <span>凡例:</span>
        <span className="inline-block w-4 h-4 rounded bg-red-100" title="少" />
        <span className="text-[10px]">少</span>
        <span className="inline-block w-4 h-4 rounded bg-red-300" title="中" />
        <span className="text-[10px]">中</span>
        <span className="inline-block w-4 h-4 rounded bg-red-600" title="多" />
        <span className="text-[10px]">多</span>
        <span className="ml-2 text-gray-400">
          ＊セルをクリックするたびに なし→少→中→多→なし と変わります
        </span>
      </div>
    </div>
  )
}
