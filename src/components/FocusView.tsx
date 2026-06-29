import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, differenceInMinutes, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { TimeLog, TimeCategory } from '../types'
import { TIME_CATEGORIES } from '../types'
import type { useTimeLogs } from '../hooks/useTimeLogs'

interface FocusViewProps {
  timeLogs: ReturnType<typeof useTimeLogs>
  baseDate: Date
}

const COLORS: Record<TimeCategory, string> = { job_hunting: '#3B82F6', self_growth: '#10B981' }
const LABELS: Record<TimeCategory, string> = { job_hunting: '就職活動', self_growth: '自己投資' }

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

function FocusTimer({
  activeLog,
  onStart,
  onStop,
}: {
  activeLog: TimeLog | undefined
  onStart: (cat: TimeCategory) => void
  onStop: () => void
}) {
  const [category, setCategory] = useState<TimeCategory>('job_hunting')
  const [elapsed, setElapsed] = useState('00:00:00')

  useEffect(() => {
    if (!activeLog) {
      setElapsed('00:00:00')
      return
    }
    const start = new Date(activeLog.start_time).getTime()
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000)
      const h = String(Math.floor(diff / 3600)).padStart(2, '0')
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeLog])

  const activeCat = activeLog?.category as TimeCategory | undefined

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⏱️</span>
        <span className="font-bold text-gray-800 text-sm">タイマー</span>
        {activeLog && (
          <span className="ml-auto text-xs text-green-600 font-medium animate-pulse">● 計測中</span>
        )}
      </div>

      {!activeLog ? (
        <>
          <div className="flex gap-2 mb-3">
            {TIME_CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  category === c.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => onStart(category)}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            開始
          </button>
        </>
      ) : (
        <>
          <div className="text-center py-3">
            <div className="text-sm text-gray-500 mb-1">{TIME_CATEGORIES.find(c => c.key === activeCat)?.emoji} {LABELS[activeCat ?? 'job_hunting']}</div>
            <div className="text-3xl font-mono font-bold text-gray-800 tracking-wider">{elapsed}</div>
          </div>
          <button
            onClick={onStop}
            className="w-full py-3 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 active:scale-[0.98] transition-all"
          >
            終了してまとめを書く
          </button>
        </>
      )}
    </div>
  )
}

function ManualEntry({ onAdd }: { onAdd: (cat: TimeCategory, start: string, end: string, summary?: string) => void }) {
  const [cat, setCat] = useState<TimeCategory>('job_hunting')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endTime, setEndTime] = useState('10:00')
  const [summary, setSummary] = useState('')
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        + 手動で追加
      </button>
    )
  }

  const handleSubmit = () => {
    const [sy, sM, sd] = startDate.split('-').map(Number)
    const [sh, sm] = startTime.split(':').map(Number)
    const [ey, eM, ed] = endDate.split('-').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const start = new Date(sy, sM - 1, sd, sh, sm).toISOString()
    const end = new Date(ey, eM - 1, ed, eh, em).toISOString()
    if (new Date(end).getTime() <= new Date(start).getTime()) return
    onAdd(cat, start, end, summary || undefined)
    setOpen(false)
    setSummary('')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-gray-800 text-sm">🕒 手動補録</span>
        <button onClick={() => setOpen(false)} className="text-gray-400 text-lg leading-none">&times;</button>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          {TIME_CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                cat === c.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {c.emoji}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">開始日</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">開始時間</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">終了日</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">終了時間</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs" />
          </div>
        </div>
        <input
          type="text"
          placeholder="まとめ（任意）"
          value={summary}
          onChange={e => setSummary(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
        />
        <button
          onClick={handleSubmit}
          className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
        >
          追加
        </button>
      </div>
    </div>
  )
}

function SummaryModal({
  log,
  onSave,
  onCancel,
}: {
  log: TimeLog
  onSave: (id: string, summary: string) => void
  onCancel: () => void
}) {
  const [summary, setSummary] = useState(log.summary ?? '')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const cat = log.category as TimeCategory
  const start = new Date(log.start_time)
  const duration = log.end_time ? differenceInMinutes(new Date(log.end_time), start) : 0

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{TIME_CATEGORIES.find(c => c.key === cat)?.emoji}</span>
          <div>
            <div className="text-sm font-bold text-gray-800">{LABELS[cat]}</div>
            <div className="text-xs text-gray-500">
              {format(start, 'HH:mm')} ~ {log.end_time ? format(new Date(log.end_time), 'HH:mm') : '--:--'}
              （{formatDuration(duration)}）
            </div>
          </div>
        </div>
        <textarea
          ref={inputRef}
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="この時間にやったことを書こう..."
          className="w-full h-24 px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            スキップ
          </button>
          <button onClick={() => onSave(log.id, summary)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

function Timeline({ logs, onEditSummary, onEditTimes, onDelete }: {
  logs: TimeLog[]
  onEditSummary: (id: string, summary: string) => void
  onEditTimes: (id: string, start: string, end: string) => void
  onDelete: (id: string) => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayLogs = logs.filter(l => l.start_time.startsWith(today) && l.end_time).sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  )

  if (todayLogs.length === 0) {
    return <p className="text-center text-gray-400 py-6 text-xs">今日の記録はまだありません</p>
  }

  return (
    <div className="space-y-2">
      {todayLogs.map((log) => (
        <TimelineItem
          key={log.id}
          log={log}
          onEditSummary={onEditSummary}
          onEditTimes={onEditTimes}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function TimelineItem({ log, onEditSummary, onEditTimes, onDelete }: {
  log: TimeLog
  onEditSummary: (id: string, summary: string) => void
  onEditTimes: (id: string, start: string, end: string) => void
  onDelete: (id: string) => void
}) {
  const cat = log.category as TimeCategory
  const start = new Date(log.start_time)
  const end = log.end_time ? new Date(log.end_time) : null
  const duration = end ? differenceInMinutes(end, start) : 0
  const [editing, setEditing] = useState(false)
  const [editSummary, setEditSummary] = useState(log.summary ?? '')
  const [editStart, setEditStart] = useState(format(start, 'HH:mm'))
  const [editEnd, setEditEnd] = useState(end ? format(end, 'HH:mm') : '')
  const [editingTime, setEditingTime] = useState(false)

  const handleSave = () => {
    onEditSummary(log.id, editSummary)
    setEditing(false)
  }

  const handleSaveTime = () => {
    const [h1, m1] = editStart.split(':').map(Number)
    const [h2, m2] = editEnd.split(':').map(Number)
    const sy = start.getFullYear()
    const sM = start.getMonth()
    const sd = start.getDate()
    onEditTimes(log.id,
      new Date(sy, sM, sd, h1, m1).toISOString(),
      new Date(sy, sM, sd, h2, m2).toISOString()
    )
    setEditingTime(false)
  }

  return (
    <div className="flex items-start gap-2 px-1">
      <div className="flex flex-col items-center pt-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[cat] }} />
        <div className="w-0.5 h-full min-h-[2rem] bg-gray-200" />
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
            {format(start, 'HH:mm')} ~ {end ? format(end, 'HH:mm') : '--:--'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: COLORS[cat] + '20', color: COLORS[cat] }}>
            {LABELS[cat]}
          </span>
          <span className="text-[10px] text-gray-400">{formatDuration(duration)}</span>
          <button onClick={() => setEditing(!editing)} className="ml-auto text-gray-300 hover:text-gray-500 text-xs">
            {editing ? '✕' : '📝'}
          </button>
        </div>

        {editing ? (
          <div className="mt-1 space-y-1">
            <textarea
              value={editSummary}
              onChange={e => setEditSummary(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-none h-14"
              placeholder="まとめを入力..."
            />
            <div className="flex gap-1">
              {!editingTime ? (
                <>
                  <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700">
                    保存
                  </button>
                  <button onClick={() => setEditingTime(true)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-[10px] hover:bg-gray-200">
                    時間を編集
                  </button>
                  <button onClick={() => onDelete(log.id)} className="px-3 py-1 bg-red-50 text-red-500 rounded text-[10px] hover:bg-red-100">
                    削除
                  </button>
                </>
              ) : (
                <>
                  <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)}
                    className="w-20 px-1 py-1 border border-gray-300 rounded text-[10px]" />
                  <span className="text-[10px] text-gray-400 self-center">~</span>
                  <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                    className="w-20 px-1 py-1 border border-gray-300 rounded text-[10px]" />
                  <button onClick={handleSaveTime} className="px-2 py-1 bg-blue-600 text-white rounded text-[10px]">保存</button>
                  <button onClick={() => setEditingTime(false)} className="px-2 py-1 text-gray-500 text-[10px]">戻る</button>
                </>
              )}
            </div>
          </div>
        ) : (
          log.summary && <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">{log.summary}</div>
        )}
      </div>
    </div>
  )
}

function Analytics({ logs, baseDate }: { logs: TimeLog[]; baseDate: Date }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  const { dateRange, days } = useMemo(() => {
    const start = period === 'week' ? startOfWeek(baseDate, { weekStartsOn: 1 }) : startOfMonth(baseDate)
    const end = period === 'week' ? endOfWeek(baseDate, { weekStartsOn: 1 }) : endOfMonth(baseDate)
    const days = eachDayOfInterval({ start, end })
    return { dateRange: { start, end }, days }
  }, [baseDate, period])

  const periodLogs = useMemo(() => {
    const startStr = format(dateRange.start, 'yyyy-MM-dd')
    const endStr = format(dateRange.end, 'yyyy-MM-dd')
    return logs.filter((l) => {
      if (!l.end_time) return false
      const d = format(new Date(l.start_time), 'yyyy-MM-dd')
      return d >= startStr && d <= endStr
    })
  }, [logs, dateRange])

  const dailyTotals = useMemo(() => {
    const map = new Map<string, { job: number; growth: number }>()
    for (const d of days) {
      map.set(format(d, 'yyyy-MM-dd'), { job: 0, growth: 0 })
    }
    for (const l of periodLogs) {
      if (!l.end_time || l.duration === null) continue
      const day = format(new Date(l.start_time), 'yyyy-MM-dd')
      const entry = map.get(day)
      if (entry) {
        if (l.category === 'job_hunting') entry.job += Math.round(l.duration / 60 * 10) / 10
        else entry.growth += Math.round(l.duration / 60 * 10) / 10
      }
    }
    return Array.from(map.entries()).map(([date, v]) => ({
      date: format(parseISO(date), period === 'week' ? 'EE' : 'M/d', { locale: ja }),
      fullDate: date,
      job: v.job,
      growth: v.growth,
      total: Math.round((v.job + v.growth) * 10) / 10,
    }))
  }, [periodLogs, days, period])

  const totalHours = useMemo(() => {
    let job = 0, growth = 0
    for (const l of periodLogs) {
      if (l.duration === null) continue
      if (l.category === 'job_hunting') job += l.duration
      else growth += l.duration
    }
    return { job: Math.round(job / 60 * 10) / 10, growth: Math.round(growth / 60 * 10) / 10 }
  }, [periodLogs])

  const dailyAvg = days.length > 0 ? Math.round(((totalHours.job + totalHours.growth) / days.length) * 10) / 10 : 0
  const totalAll = totalHours.job + totalHours.growth
  const ratioJob = totalAll > 0 ? Math.round((totalHours.job / totalAll) * 100) : 0

  const pieData = [
    { name: '就職活動', value: totalHours.job, color: COLORS.job_hunting },
    { name: '自己投資', value: totalHours.growth, color: COLORS.self_growth },
  ].filter(d => d.value > 0)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <span className="font-bold text-gray-800 text-sm">データ統計</span>
        <div className="ml-auto flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          <button onClick={() => setPeriod('week')}
            className={`px-3 py-1.5 transition-colors ${period === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            週
          </button>
          <button onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 transition-colors ${period === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            月
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-lg font-bold text-gray-800">{totalAll.toFixed(1)}</div>
          <div className="text-[10px] text-gray-500">総時間(h)</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-lg font-bold text-gray-800">{dailyAvg.toFixed(1)}</div>
          <div className="text-[10px] text-gray-500">日均(h)</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-lg font-bold text-gray-800">{ratioJob}%</div>
          <div className="text-[10px] text-gray-500">就活比率</div>
        </div>
      </div>

      {dailyTotals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3">
          <div className="text-xs font-medium text-gray-500 mb-2">時間推移</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={dailyTotals}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="h" />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}h`, '']}
                contentStyle={{ fontSize: 12 }}
              />
              <Line type="monotone" dataKey="job" stroke={COLORS.job_hunting} strokeWidth={2} dot={{ r: 2 }} name="就職" />
              <Line type="monotone" dataKey="growth" stroke={COLORS.self_growth} strokeWidth={2} dot={{ r: 2 }} name="自己投資" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {pieData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="text-xs font-medium text-gray-500 mb-2">割合</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={30}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={pieData[i].color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value.toFixed(1)}h`, '']} contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-gray-600">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function FocusView({ timeLogs, baseDate }: FocusViewProps) {
  const [showSummary, setShowSummary] = useState<TimeLog | null>(null)

  const activeLog = timeLogs.getActiveTimer()

  const handleStart = useCallback(async (cat: TimeCategory) => {
    await timeLogs.startTimer(cat)
  }, [timeLogs])

  const handleStop = useCallback(() => {
    if (activeLog) setShowSummary(activeLog)
  }, [activeLog])

  const handleSaveSummary = useCallback(async (id: string, summary: string) => {
    await timeLogs.stopTimer(id, summary || undefined)
    setShowSummary(null)
  }, [timeLogs])

  const handleManualAdd = useCallback(async (cat: TimeCategory, start: string, end: string, summary?: string) => {
    await timeLogs.addManual(cat, start, end, summary)
  }, [timeLogs])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-4">⏰ 集中タイムトラッキング</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <FocusTimer activeLog={activeLog} onStart={handleStart} onStop={handleStop} />
          <ManualEntry onAdd={handleManualAdd} />
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📅</span>
              <span className="font-bold text-gray-800 text-sm">今日のタイムライン</span>
            </div>
            <Timeline
              logs={timeLogs.logs}
              onEditSummary={timeLogs.editSummary}
              onEditTimes={timeLogs.editTimes}
              onDelete={timeLogs.remove}
            />
          </div>
        </div>
        <div>
          <Analytics logs={timeLogs.logs} baseDate={baseDate} />
        </div>
      </div>

      {showSummary && (
        <SummaryModal
          log={showSummary}
          onSave={handleSaveSummary}
          onCancel={() => {
            timeLogs.stopTimer(showSummary.id)
            setShowSummary(null)
          }}
        />
      )}
    </div>
  )
}
