import { useState, useRef, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { format, startOfMonth, subMonths, addMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import { bundleMonthlyData, type MonthlyBundle } from '../lib/reviewBundler'
import { generateMonthlyReview, type MonthlyReviewInput } from '../lib/gemini'
import { getSavedThemeId, getTheme, buildMarkdownComponents } from '../lib/markdownThemes'

const SCHEDULE_CATEGORY_EMOJI: Record<string, string> = {
  school: '🏫', job: '🔴', life: '🔵', ent: '🟣', study: '🟠',
}

const TIMELINE_CATEGORIES = [
  { key: 'all', label: 'すべて', color: '' },
  { key: 'job', label: '就活', color: '#EF4444' },
  { key: 'school', label: '学校', color: '#6B7280' },
  { key: 'life', label: '生活', color: '#3B82F6' },
  { key: 'ent', label: '娯楽', color: '#F97316' },
  { key: 'study', label: '学習', color: '#8B5CF6' },
  { key: 'diary', label: '日記', color: '#10B981' },
]

export function ReviewCanvas() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [data, setData] = useState<MonthlyBundle | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportContent, setReportContent] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiReport, setAiReport] = useState<string | null>(null)
  const [timelineFilter, setTimelineFilter] = useState('all')
  const [, setInsertLoading] = useState<'bundled' | 'ai' | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const themeId = getSavedThemeId() || 'default'
  const theme = getTheme(themeId)

  const monthStr = format(month, 'yyyy-MM')
  const monthLabel = format(month, 'yyyy年M月', { locale: ja })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await bundleMonthlyData(monthStr)
      setData(result)
    } catch (e) {
      console.error('Failed to load review data', e)
    } finally {
      setLoading(false)
    }
  }, [monthStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = reportContent.slice(0, start)
    const after = reportContent.slice(end)
    const newText = before + text + after
    setReportContent(newText)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + text.length
      ta.setSelectionRange(pos, pos)
    })
  }, [reportContent])

  const handleGenerateAIReport = useCallback(async () => {
    if (!data || aiGenerating) return
    setAiGenerating(true)
    setInsertLoading('ai')
    try {
      const menstruationText = data.menstruationDays.length > 0
        ? `${data.menstruationDays[0].date} 〜 ${data.menstruationDays[data.menstruationDays.length - 1].date}`
        : 'なし'

      const input: MonthlyReviewInput = {
        month: monthStr,
        habits_success_rate: Object.fromEntries(
          Object.entries(data.habitsByCategory).map(([cat, s]) => [cat, `${s.rate}%`])
        ),
        sleep_average_hours: `${data.sleepAvgHours}h`,
        focus_total_hours: `${data.focusTotalHours}h`,
        appetite_restraint_days: `${data.appetite.resisted}/${data.appetite.resisted + data.appetite.failed}`,
        menstrual_cycle: menstruationText,
        key_events: data.keyEvents.map(e => `${e.date} ${e.title}`),
      }

      const report = await generateMonthlyReview(input)
      setAiReport(report)
    } catch (e: any) {
      alert(`AIレポート生成に失敗しました: ${e.message}`)
    } finally {
      setAiGenerating(false)
      setInsertLoading(null)
    }
  }, [data, monthStr, aiGenerating])

  const timelineEvents = data?.timeline.filter(e => {
    if (timelineFilter === 'all') return true
    if (timelineFilter === 'diary') return e.type === 'diary'
    return e.category === timelineFilter
  }) ?? []

  const uniqueTimelineDates = [...new Set(timelineEvents.map(e => e.date))].sort()

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Month selector */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(m => subMonths(m, 1))}
            className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            &lt; 先月
          </button>
          <h2 className="text-lg font-bold text-gray-800 min-w-[140px] text-center">
            📊 {monthLabel}・深度復盤
          </h2>
          <button
            onClick={() => setMonth(m => addMonths(m, 1))}
            className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            来月 &gt;
          </button>
        </div>
        <button
          onClick={() => { setMonth(startOfMonth(new Date())); setReportContent(''); setAiReport(null) }}
          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
        >
          今月に戻る
        </button>
      </div>

      {/* Main canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Data components */}
        <div className="w-[400px] min-w-[320px] overflow-y-auto border-r border-gray-200 bg-white p-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              データを読み込み中...
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              データがありません
            </div>
          ) : (
            <>
              {/* 1. AI 洞察レポート */}
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-gray-700">✨ AI 智能全局洞察</h3>
                </div>
                <button
                  onClick={handleGenerateAIReport}
                  disabled={aiGenerating}
                  className={`w-full px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    aiGenerating
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 hover:from-purple-100 hover:to-blue-100 border border-purple-200'
                  }`}
                >
                  {aiGenerating ? '✨ Gemini 分析中...' : '✨ 今月のAI分析レポートを生成'}
                </button>
                {aiReport && (
                  <div className="mt-2">
                    <button
                      onClick={() => insertAtCursor(`\n\n${aiReport}\n\n`)}
                      className="w-full px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                    >
                      ➕ レポートを右パネルに挿入
                    </button>
                  </div>
                )}
              </div>

              {/* 2. 家事統計 */}
              {data.householdStats.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">🧹 家事・生活統計</h3>
                  <div className="space-y-1">
                    {data.householdStats.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                          {h.displayName}：{h.count}回 ({h.avgInterval})
                        </span>
                        <button
                          onClick={() => insertAtCursor(`- ${h.displayName}：${h.count}回 (${h.avgInterval})\n`)}
                          className="px-1.5 py-0.5 rounded text-green-600 hover:bg-green-50 flex-shrink-0"
                          title="報告に挿入"
                        >
                          ➕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. 核心指標 */}
              <div className="rounded-lg border border-gray-200 p-3">
                <h3 className="font-semibold text-sm text-gray-700 mb-2">📊 核心指標</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="text-xs text-blue-600">😴 平均睡眠</div>
                    <div className="text-lg font-bold text-blue-700">{data.sleepAvgHours}h</div>
                    <button
                      onClick={() => insertAtCursor(`- 平均睡眠時間：${data.sleepAvgHours}h (${data.sleepRecordCount}日分)\n`)}
                      className="text-xs text-blue-500 hover:text-blue-700 mt-1 block"
                    >
                      ➕
                    </button>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-xs text-green-600">⏱ 集中時間</div>
                    <div className="text-lg font-bold text-green-700">{data.focusTotalHours}h</div>
                    <button
                      onClick={() => insertAtCursor(`- 集中時間：${data.focusTotalHours}h（就活${data.focusJobHours}h / 自己投資${data.focusGrowthHours}h）\n`)}
                      className="text-xs text-green-500 hover:text-green-700 mt-1 block"
                    >
                      ➕
                    </button>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2">
                    <div className="text-xs text-orange-600">🍽 食欲忍耐率</div>
                    <div className="text-lg font-bold text-orange-700">{data.appetite.rate}%</div>
                    <button
                      onClick={() => insertAtCursor(`- 食欲忍耐成功率：${data.appetite.rate}%（${data.appetite.resisted}回成功 / ${data.appetite.failed}回失敗）\n`)}
                      className="text-xs text-orange-500 hover:text-orange-700 mt-1 block"
                    >
                      ➕
                    </button>
                  </div>
                  <div className="bg-pink-50 rounded-lg p-2">
                    <div className="text-xs text-pink-600">📝 日記記録</div>
                    <div className="text-lg font-bold text-pink-700">{data.diaryCount}日</div>
                    <button
                      onClick={() => insertAtCursor(`- 日記記録日数：${data.diaryCount}日\n`)}
                      className="text-xs text-pink-500 hover:text-pink-700 mt-1 block"
                    >
                      ➕
                    </button>
                  </div>
                </div>
              </div>

              {/* Todo stats */}
              {data.todoStats.total > 0 && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">📋 タスク完了率</h3>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">
                      完了 {data.todoStats.completed}/{data.todoStats.total}
                    </span>
                    <span className="text-sm font-bold text-gray-800">
                      {data.todoStats.total > 0 ? Math.round((data.todoStats.completed / data.todoStats.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${data.todoStats.total > 0 ? (data.todoStats.completed / data.todoStats.total) * 100 : 0}%` }}
                    />
                  </div>
                  {data.todoStats.focusMinutes > 0 && (
                    <div className="text-xs text-gray-500">
                      タスク集中時間: {Math.floor(data.todoStats.focusMinutes / 60)}h{data.todoStats.focusMinutes % 60}m
                    </div>
                  )}
                  <button
                    onClick={() => insertAtCursor(`- タスク完了率：${data.todoStats.completed}/${data.todoStats.total}（${data.todoStats.total > 0 ? Math.round((data.todoStats.completed / data.todoStats.total) * 100) : 0}%）\n`)}
                    className="mt-1 text-xs text-indigo-500 hover:text-indigo-700"
                  >
                    ➕ 挿入
                  </button>
                </div>
              )}

              {/* 習慣成功率 */}
              <div className="rounded-lg border border-gray-200 p-3">
                <h3 className="font-semibold text-sm text-gray-700 mb-2">✅ 習慣成功率（カテゴリ別）</h3>
                <div className="space-y-2">
                  {Object.entries(data.habitsByCategory).map(([cat, stat]) => (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-gray-600">{cat}</span>
                        <span className="text-gray-500">{stat.done}/{stat.total} ({stat.rate}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${stat.rate}%`,
                            backgroundColor: stat.rate >= 80 ? '#22C55E' : stat.rate >= 50 ? '#F59E0B' : '#EF4444',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const lines = Object.entries(data.habitsByCategory)
                      .map(([cat, s]) => `- ${cat}：${s.rate}% (${s.done}/${s.total})`)
                      .join('\n')
                    insertAtCursor(`\n### 習慣達成率\n${lines}\n`)
                  }}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-700"
                >
                  ➕ すべて挿入
                </button>
              </div>

              {/* 生理周期 */}
              {data.menstruationDays.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">🩸 生理周期</h3>
                  <div className="text-xs text-gray-600">
                    {data.menstruationDays[0].date} 〜 {data.menstruationDays[data.menstruationDays.length - 1].date}
                    （{data.menstruationDays.length}日間）
                  </div>
                  <button
                    onClick={() => insertAtCursor(`- 生理周期：${data.menstruationDays[0].date} 〜 ${data.menstruationDays[data.menstruationDays.length - 1].date}（${data.menstruationDays.length}日間）\n`)}
                    className="mt-1 text-xs text-pink-500 hover:text-pink-700"
                  >
                    ➕ 挿入
                  </button>
                </div>
              )}

              {/* 4. 月度タイムライン */}
              <div className="rounded-lg border border-gray-200 p-3">
                <h3 className="font-semibold text-sm text-gray-700 mb-2">📅 月度タイムライン</h3>
                <div className="flex flex-wrap gap-1 mb-2">
                  {TIMELINE_CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setTimelineFilter(cat.key)}
                      className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                        timelineFilter === cat.key
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {uniqueTimelineDates.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-4">該当するイベントがありません</div>
                  ) : uniqueTimelineDates.map(date => {
                    const dayEvents = timelineEvents.filter(e => e.date === date).sort((a, b) => {
                      if (a.time && b.time) return a.time.localeCompare(b.time)
                      return 0
                    })
                    const dayLabel = format(new Date(date + 'T00:00:00'), 'M/d(E)', { locale: ja })
                    return (
                      <div key={date}>
                        <div className="text-xs font-medium text-gray-500 mb-0.5">{dayLabel}</div>
                        {dayEvents.map((ev, i) => {
                          const emoji = ev.type === 'schedule'
                            ? (SCHEDULE_CATEGORY_EMOJI[ev.category] ?? '📌')
                            : ev.type === 'diary' ? '📝' : '⏱'
                          return (
                            <div key={`${date}-${i}`} className="flex items-center gap-1 text-xs ml-2">
                              <span>{emoji}</span>
                              <span className="text-gray-700 flex-1 truncate">{ev.title}</span>
                              {ev.time && <span className="text-gray-400 flex-shrink-0">{ev.time}</span>}
                              <button
                                onClick={() => insertAtCursor(`- ${dayLabel}: ${emoji} ${ev.title}${ev.time ? ` (${ev.time})` : ''}\n`)}
                                className="px-1 text-green-600 hover:bg-green-50 rounded flex-shrink-0"
                                title="挿入"
                              >
                                ➕
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
                {uniqueTimelineDates.length > 0 && (
                  <button
                    onClick={() => {
                      const lines = uniqueTimelineDates.map(date => {
                        const dayEvents = timelineEvents.filter(e => e.date === date)
                        const dayLabel = format(new Date(date + 'T00:00:00'), 'M/d(E)', { locale: ja })
                        const events = dayEvents.map(ev => {
                          const emoji = ev.type === 'schedule'
                            ? (SCHEDULE_CATEGORY_EMOJI[ev.category] ?? '📌')
                            : ev.type === 'diary' ? '📝' : '⏱'
                          return `  - ${emoji} ${ev.title}${ev.time ? ` (${ev.time})` : ''}`
                        }).join('\n')
                        return `- ${dayLabel}\n${events}`
                      }).join('\n')
                      insertAtCursor(`\n### 月度タイムライン\n${lines}\n`)
                    }}
                    className="mt-2 text-xs text-blue-500 hover:text-blue-700"
                  >
                    ➕ すべて挿入
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right panel: Markdown editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
            <span className="text-xs font-medium text-gray-500">📝 復盤レポート</span>
            <button
              onClick={() => setReportContent('')}
              className="ml-auto px-2 py-0.5 text-xs text-gray-400 hover:text-gray-600"
            >
              クリア
            </button>
          </div>
          <div className="flex-1 flex overflow-hidden">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={reportContent}
              onChange={e => setReportContent(e.target.value)}
              className="w-1/2 h-full p-4 text-sm font-mono resize-none outline-none border-r border-gray-200 bg-white"
              placeholder={`左パネルの [+] ボタンをクリックしてデータを挿入\nまたは直接 Markdown を記述してください\n\n# ${monthLabel}・個人振り返り\n\n## 1. 核心データ総覧\n\n## 2. 生活と習慣の復盤\n\n## 3. 月度足迹と大事な出来事\n\n## 4. 自己反省と来月の目標\n`}
            />
            {/* Preview */}
            <div className="w-1/2 h-full overflow-y-auto p-4 bg-white">
              {reportContent.trim() ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={buildMarkdownComponents(theme)}
                  >
                    {reportContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-300 text-sm">
                  右パネルにマークダウンを入力または<br />
                  左パネルのデータを挿入してください
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
