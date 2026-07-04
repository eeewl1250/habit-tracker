import { useState, useRef, useCallback, useEffect } from 'react'
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, differenceInMinutes } from 'date-fns'
import { ja } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { Todo, TodoCategory, TodoStatus, TimeLog, TimeCategory, CategoryDefinition, Task, DailyLog, Schedule } from '../types'
import { TIME_CATEGORIES, TIME_BONUS_RATE, WEEKDAY_KEYS } from '../types'
import { fetchTodos, fetchCategoryDefinitions, createTodo as apiCreateTodo, updateTodo as apiUpdateTodo, deleteTodo as apiDeleteTodo, createTimeLog, fetchTimeLogs, updateTimeLog, deleteTimeLog, fetchSchedules, checkIn, undoCheckIn } from '../lib/api'
import { CatIcon } from './Icon'

const MAX_TODAY = 5

const COLORS: Record<TimeCategory, string> = { job_hunting: '#3B82F6', self_growth: '#10B981' }
const LABELS: Record<TimeCategory, string> = { job_hunting: '就職活動', self_growth: '自己投資' }

function categoryToTimeCat(catName: string, catDefs: CategoryDefinition[]): TimeCategory {
  const def = catDefs.find(c => c.name === catName)
  if (def?.bonus_enabled && def.bonus_rate > 0) return 'job_hunting'
  return 'self_growth'
}

function catInfo(catName: string, catDefs: CategoryDefinition[]) {
  return catDefs.find(c => c.name === catName) ?? catDefs[catDefs.length - 1]
}

interface EditForm {
  title: string
  category: TodoCategory
  estimated_minutes: number
  actual_minutes: number
  source_url: string
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

interface SummaryModalProps {
  todo: Todo
  catDefs: CategoryDefinition[]
  elapsedMinutes: number
  onSave: (summary: string) => void
  onSkip: () => void
}

function SummaryModal({ todo, catDefs, elapsedMinutes, onSave, onSkip }: SummaryModalProps) {
  const [summary, setSummary] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const cat = catInfo(todo.category, catDefs)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4" onClick={onSkip}>
      <div
        className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: cat.color + '20' }}>
            <CatIcon name={cat.emoji} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800">{todo.title}</div>
            <div className="text-xs text-gray-500">
              {cat.label} · {formatDuration(elapsedMinutes)}
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
          <button onClick={onSkip} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            スキップ
          </button>
          <button onClick={() => onSave(summary)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ log, onEditSummary, onEditCategory, onEditTimes, onDelete }: {
  log: TimeLog
  onEditSummary: (id: string, summary: string) => void
  onEditCategory: (id: string, category: string) => void
  onEditTimes: (id: string, start: string, end: string) => void
  onDelete: (id: string) => void
}) {
  const cat = log.category as TimeCategory
  const start = new Date(log.start_time)
  const end = log.end_time ? new Date(log.end_time) : null
  const duration = end ? differenceInMinutes(end, start) : 0
  const [editing, setEditing] = useState(false)
  const [editSummary, setEditSummary] = useState(log.summary ?? '')
  const [editCategory, setEditCategory] = useState<TimeCategory>(cat)
  const [editStart, setEditStart] = useState(format(start, 'HH:mm'))
  const [editEnd, setEditEnd] = useState(end ? format(end, 'HH:mm') : '')
  const [editingTime, setEditingTime] = useState(false)

  const handleSave = () => {
    onEditSummary(log.id, editSummary)
    if (editCategory !== cat) {
      onEditCategory(log.id, editCategory)
    }
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
          <div className="mt-1 space-y-1.5">
            <textarea
              value={editSummary}
              onChange={e => setEditSummary(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-none h-14"
              placeholder="まとめを入力..."
            />
            <div>
              <div className="text-[10px] text-gray-400 mb-0.5">カテゴリ</div>
              <div className="flex gap-1">
                {(['job_hunting', 'self_growth'] as TimeCategory[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setEditCategory(c)}
                    className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                      editCategory === c
                        ? 'font-medium text-white border-transparent'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                    style={editCategory === c ? { backgroundColor: COLORS[c] } : undefined}
                  >
                    {LABELS[c]}
                  </button>
                ))}
              </div>
            </div>
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

function Timeline({ logs, onEditSummary, onEditCategory, onEditTimes, onDelete }: {
  logs: TimeLog[]
  onEditSummary: (id: string, summary: string) => void
  onEditCategory: (id: string, category: string) => void
  onEditTimes: (id: string, start: string, end: string) => void
  onDelete: (id: string) => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayLogs = logs.filter(l => l.start_time.startsWith(today) && l.end_time).sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  )

  if (todayLogs.length === 0) {
    return <p className="text-center text-gray-400 py-4 text-xs">今日の記録はまだありません</p>
  }

  return (
    <div className="space-y-1">
      {todayLogs.map((log) => (
        <TimelineItem
          key={log.id}
          log={log}
          onEditSummary={onEditSummary}
          onEditCategory={onEditCategory}
          onEditTimes={onEditTimes}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function Analytics({ logs, baseDate }: { logs: TimeLog[]; baseDate: Date }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  const { dateRange, days } = (() => {
    const start = period === 'week' ? startOfWeek(baseDate, { weekStartsOn: 1 }) : startOfMonth(baseDate)
    const end = period === 'week' ? endOfWeek(baseDate, { weekStartsOn: 1 }) : endOfMonth(baseDate)
    const days = eachDayOfInterval({ start, end })
    return { dateRange: { start, end }, days }
  })()

  const periodLogs = (() => {
    const startStr = format(dateRange.start, 'yyyy-MM-dd')
    const endStr = format(dateRange.end, 'yyyy-MM-dd')
    return logs.filter((l) => {
      if (!l.end_time) return false
      const d = format(new Date(l.start_time), 'yyyy-MM-dd')
      return d >= startStr && d <= endStr
    })
  })()

  const dailyTotals = (() => {
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
  })()

  const totalHours = (() => {
    let job = 0, growth = 0
    for (const l of periodLogs) {
      if (l.duration === null) continue
      if (l.category === 'job_hunting') job += l.duration
      else growth += l.duration
    }
    return { job: Math.round(job / 60 * 10) / 10, growth: Math.round(growth / 60 * 10) / 10 }
  })()

  const dailyAvg = days.length > 0 ? Math.round(((totalHours.job + totalHours.growth) / days.length) * 10) / 10 : 0
  const totalAll = totalHours.job + totalHours.growth
  const ratioJob = totalAll > 0 ? Math.round((totalHours.job / totalAll) * 100) : 0

  const pieData = [
    { name: '就職活動', value: totalHours.job, color: COLORS.job_hunting },
    { name: '自己投資', value: totalHours.growth, color: COLORS.self_growth },
  ].filter(d => d.value > 0)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 mt-2">
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

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
          <div className="text-base font-bold text-gray-800">{totalAll.toFixed(1)}</div>
          <div className="text-[10px] text-gray-500">総時間(h)</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
          <div className="text-base font-bold text-gray-800">{dailyAvg.toFixed(1)}</div>
          <div className="text-[10px] text-gray-500">日平均(h)</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
          <div className="text-base font-bold text-gray-800">{ratioJob}%</div>
          <div className="text-[10px] text-gray-500">就活比率</div>
        </div>
      </div>

      {dailyTotals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3">
          <div className="text-xs font-medium text-gray-500 mb-2">時間推移</div>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={dailyTotals}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} unit="h" />
              <Tooltip formatter={(value) => typeof value === 'number' ? [`${value.toFixed(1)}h`, ''] : ['', '']} contentStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="job" stroke={COLORS.job_hunting} strokeWidth={2} dot={{ r: 2 }} name="就職" />
              <Line type="monotone" dataKey="growth" stroke={COLORS.self_growth} strokeWidth={2} dot={{ r: 2 }} name="自己投資" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {pieData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="text-xs font-medium text-gray-500 mb-2">割合</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} innerRadius={25}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={pieData[i].color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => typeof value === 'number' ? [`${value.toFixed(1)}h`, ''] : ['', '']} contentStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-3 text-[10px]">
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

interface TodoViewProps {
  tasks: Task[]
  logs: DailyLog[]
}

export function TodoView({ tasks, logs }: TodoViewProps) {
  const [catDefs, setCatDefs] = useState<CategoryDefinition[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  // Input states (default to first non-default category)
  const defaultCat = catDefs.find(c => !c.is_default)
  const [leftInput, setLeftInput] = useState('')
  const [leftCat, setLeftCat] = useState<TodoCategory>(defaultCat?.name ?? '就活')
  const [rightInput, setRightInput] = useState('')
  const [rightCat, setRightCat] = useState<TodoCategory>(defaultCat?.name ?? '生活')
  const [filterCat, setFilterCat] = useState<string>('all')

  // Timer state
  const [activeTimer, setActiveTimer] = useState<string | null>(null)
  const [timerElapsed, setTimerElapsed] = useState(0)
  const timerStartRef = useRef<number>(0)
  const timerStartISORef = useRef<string | null>(null)
  const timerIntervalRef = useRef<number | null>(null)

  // Summary modal state
  const [summaryModal, setSummaryModal] = useState<{
    taskId: string; minutes: number; startTime: string
  } | null>(null)

  // Time logs state
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])

  // Edit modal state
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ title: '', category: 'life', estimated_minutes: 0, source_url: '' })

  const loadTodos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchTodos()
      setTodos(data)
    } catch (e) {
      console.error('Failed to load todos', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTodos() }, [loadTodos])

  const loadTimeLogs = useCallback(async () => {
    try {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd')
      const data = await fetchTimeLogs(start, end)
      setTimeLogs(data)
    } catch (e) {
      console.error('Failed to load time logs', e)
    }
  }, [])

  useEffect(() => { loadTimeLogs() }, [loadTimeLogs])

  // Load category definitions
  useEffect(() => {
    fetchCategoryDefinitions().then(setCatDefs).catch(() => {})
  }, [])

  // ── Schedule state ──
  const [schedules, setSchedules] = useState<Schedule[]>([])
  useEffect(() => {
    fetchSchedules().then(setSchedules).catch(() => {})
  }, [])

  // ── Today's habits (from habit tracker tasks) ──
  const todayHabits = (() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const todayStr = format(today, 'yyyy-MM-dd')
    return tasks.filter(t => {
      if (t.status !== 'active') return false
      if (t.period_type === 'weekday') {
        if (!t.weekdays) return false
        return t.weekdays.split(',').includes(WEEKDAY_KEYS[dayOfWeek])
      }
      if (t.period_type === 'frequency' && t.base_date && t.frequency) {
        const base = new Date(t.base_date)
        const diff = Math.floor((today.getTime() - base.getTime()) / (1000 * 60 * 60 * 24))
        return diff % t.frequency === 0
      }
      return false
    })
  })()

  const todayLogsSet = new Set(logs.filter(l => l.date === format(new Date(), 'yyyy-MM-dd')).map(l => l.task_id))

  const handleHabitToggle = useCallback(async (taskId: string) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const log = logs.find(l => l.task_id === taskId && l.date === todayStr)
    if (log) {
      await undoCheckIn(log.id)
    } else {
      await checkIn(taskId, todayStr)
    }
  }, [logs])

  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([])
  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    setTodaySchedules(
      schedules.filter(s => s.date_start === todayStr)
    )
  }, [schedules])

  const addTodo = useCallback(async (title: string, status: TodoStatus, category: TodoCategory) => {
    if (!title.trim()) return
    try {
      const todo = await apiCreateTodo({
        title: title.trim(),
        category,
        status,
      })
      setTodos(prev => [todo, ...prev])
    } catch (e) {
      console.error('Failed to add todo', e)
    }
  }, [])

  const updateField = useCallback(async (id: string, updates: Partial<Todo>) => {
    try {
      const updated = await apiUpdateTodo(id, updates)
      setTodos(prev => prev.map(t => t.id === id ? updated : t))
    } catch (e) {
      console.error('Failed to update todo', e)
    }
  }, [])

  const deleteTodo = useCallback(async (id: string) => {
    try {
      await apiDeleteTodo(id)
      setTodos(prev => prev.filter(t => t.id !== id))
    } catch (e) {
      console.error('Failed to delete todo', e)
    }
  }, [])

  const toggleDone = useCallback(async (id: string, isDone: boolean) => {
    const status: TodoStatus = isDone ? 'backlog' : 'done'
    const now = isDone ? null : new Date().toISOString()
    const t = todos.find(t => t.id === id)
    const clue = !isDone && t
      ? `✅ ${t.title}${t.actual_minutes > 0 ? `（${t.actual_minutes}分）` : ''}`
      : null
    await updateField(id, { status, completed_at: now, diary_clue: clue })
  }, [todos, updateField])

  const moveToToday = useCallback(async (id: string) => {
    const todayCount = todos.filter(t => t.status === 'today').length
    if (todayCount >= MAX_TODAY) {
      alert(`今日のフォーカスは最大${MAX_TODAY}件までです。先に完了またはバックログに戻してください。`)
      return
    }
    await updateField(id, { status: 'today' })
  }, [todos, updateField])

  const removeFromToday = useCallback(async (id: string) => {
    await updateField(id, { status: 'backlog' })
  }, [updateField])

  const startTimer = useCallback((id: string) => {
    if (activeTimer === id) {
      // Stop same task: record elapsed, show summary modal
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      const minutes = Math.max(1, Math.round(elapsed / 60))
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      setActiveTimer(null)
      setTimerElapsed(0)
      setSummaryModal({
        taskId: id,
        minutes,
        startTime: timerStartISORef.current ?? new Date().toISOString(),
      })
      return
    }
    // Switching to a different task: save previous timer immediately (no modal)
    if (activeTimer) {
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      const minutes = Math.max(1, Math.round(elapsed / 60))
      updateField(activeTimer, { actual_minutes: (todos.find(t => t.id === activeTimer)?.actual_minutes ?? 0) + minutes })
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
    timerStartRef.current = Date.now()
    timerStartISORef.current = new Date().toISOString()
    setActiveTimer(id)
    setTimerElapsed(0)
    timerIntervalRef.current = window.setInterval(() => {
      setTimerElapsed(Math.floor((Date.now() - timerStartRef.current) / 1000))
    }, 1000)
  }, [activeTimer, todos, updateField])

  const handleTimerSummarySave = useCallback(async (summary: string) => {
    if (!summaryModal) return
    const { taskId, minutes, startTime } = summaryModal
    const endTime = new Date().toISOString()
    const todo = todos.find(t => t.id === taskId)
    // Update actual_minutes
    await updateField(taskId, {
      actual_minutes: (todos.find(t => t.id === taskId)?.actual_minutes ?? 0) + minutes,
    })
    // Create time_log
    if (todo) {
      try {
        await createTimeLog({
          category: categoryToTimeCat(todo.category, catDefs),
          start_time: startTime,
          end_time: endTime,
          summary: summary || null,
          tags: null,
        })
        loadTimeLogs()
      } catch (e) {
        console.error('Failed to create time log', e)
      }
    }
    setSummaryModal(null)
  }, [summaryModal, todos, updateField, loadTimeLogs])

  const handleTimerSummarySkip = useCallback(async () => {
    await handleTimerSummarySave('')
  }, [handleTimerSummarySave])

  const handleTimeLogEdit = useCallback(async (id: string, updates: Partial<{ end_time: string | null; start_time: string | null; summary: string | null; category: string }>) => {
    try {
      await updateTimeLog(id, updates)
      setTimeLogs(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    } catch (e) {
      console.error('Failed to update time log', e)
    }
  }, [])

  const handleTimeLogDelete = useCallback(async (id: string) => {
    try {
      await deleteTimeLog(id)
      setTimeLogs(prev => prev.filter(l => l.id !== id))
    } catch (e) {
      console.error('Failed to delete time log', e)
    }
  }, [])

  const handleEditSummary = useCallback(async (id: string, summary: string) => {
    await handleTimeLogEdit(id, { summary })
  }, [handleTimeLogEdit])

  const handleEditCategory = useCallback(async (id: string, category: string) => {
    await handleTimeLogEdit(id, { category })
  }, [handleTimeLogEdit])

  const handleEditTimes = useCallback(async (id: string, start: string, end: string) => {
    const duration = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
    try {
      await updateTimeLog(id, { start_time: start, end_time: end })
      setTimeLogs(prev => prev.map(l => l.id === id ? { ...l, start_time: start, end_time: end, duration } : l))
    } catch (e) {
      console.error('Failed to edit time log times', e)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [])

  const clearCompleted = useCallback(async () => {
    const doneTodos = todos.filter(t => t.status === 'done')
    for (const t of doneTodos) {
      await deleteTodo(t.id)
    }
    setTodos(prev => prev.filter(t => t.status !== 'done'))
  }, [todos, deleteTodo])

  const openEdit = useCallback((todo: Todo) => {
    setEditForm({
      title: todo.title,
      category: todo.category as TodoCategory,
      estimated_minutes: todo.estimated_minutes,
      actual_minutes: todo.actual_minutes,
      source_url: todo.source_url || '',
    })
    setEditingTodo(todo)
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingTodo || !editForm.title.trim()) return
    await updateField(editingTodo.id, {
      title: editForm.title.trim(),
      category: editForm.category,
      estimated_minutes: editForm.estimated_minutes,
      actual_minutes: editForm.actual_minutes,
      source_url: editForm.source_url || null,
    })
    setEditingTodo(null)
  }, [editingTodo, editForm, updateField])

  const todayTodos = todos.filter(t => t.status === 'today').sort((a, b) => a.sort_order - b.sort_order)
  const emptySlots = MAX_TODAY - todayTodos.length
  const doneCount = todos.filter(t => t.status === 'done').length
  const totalCount = todos.filter(t => t.status !== 'done').length + doneCount
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const doneTodos = todos.filter(t => t.status === 'done')
  const todayDoneTodos = doneTodos.filter(t => t.completed_at?.startsWith(todayStr)).sort((a, b) => {
    const aTime = a.completed_at ?? a.updated_at
    const bTime = b.completed_at ?? b.updated_at
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  })

  const backlogTodos = todos.filter(t => t.status === 'backlog')
  const filteredBacklog = filterCat === 'all'
    ? backlogTodos
    : backlogTodos.filter(t => t.category === filterCat)

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}分`
    return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? `${mins % 60}分` : ''}`
  }

  const activeTodo = activeTimer ? todos.find(t => t.id === activeTimer) : null

  // Category selector component
  const CatSelect = ({ value, onChange }: { value: TodoCategory; onChange: (v: TodoCategory) => void }) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value as TodoCategory)}
      className="text-xs border border-gray-200 rounded px-1 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {catDefs.map(c => (
        <option key={c.name} value={c.name}>{c.name}</option>
      ))}
    </select>
  )

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Active timer bar */}
      {activeTodo && (
        <div className="flex items-center gap-3 px-4 py-2 bg-orange-50 border-b border-orange-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: catInfo(activeTodo.category, catDefs).color }}
            />
            <span className="text-sm font-medium text-gray-800 truncate">{activeTodo.title}</span>
            <span className="text-xs text-gray-500 whitespace-nowrap"><CatIcon name={catInfo(activeTodo.category, catDefs).emoji} /> {catInfo(activeTodo.category, catDefs).name}</span>
          </div>
          <span className="ml-auto text-lg font-mono font-bold text-orange-700 whitespace-nowrap">
            ⏱ {formatTime(timerElapsed)}
          </span>
          <button
            onClick={() => startTimer(activeTodo.id)}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            ■ 終了
          </button>
        </div>
      )}

      {/* Main canvas - 4 columns */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
          {/* ── Column 1: 今日のフォーカス ── */}
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
            <div className="shrink-0 p-4 pb-0 space-y-3">
              <h3 className="text-sm font-bold text-gray-700">🎯 今日のフォーカス</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500">📋 习惯</span>
                <span className="text-[10px] text-gray-400">（自動）</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500">📅 日程</span>
                <span className="text-[10px] text-gray-400">（自動）</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500">🎯 任务池</span>
                <span className="text-[10px] text-gray-400">（あと{emptySlots}件）</span>
              </div>
              <div className="flex gap-1 pb-2">
                <CatSelect value={leftCat} onChange={setLeftCat} />
                <input
                  value={leftInput}
                  onChange={e => setLeftInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && leftInput.trim()) {
                      addTodo(leftInput, 'today', leftCat)
                      setLeftInput('')
                    }
                  }}
                  placeholder="今日のタスク..."
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => { if (leftInput.trim()) { addTodo(leftInput, 'today', leftCat); setLeftInput('') } }}
                  className="px-2 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  追加
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
              <div className="space-y-1">
                {todayHabits.length === 0 ? (
                  <p className="text-xs text-gray-300 py-1">今日の習慣はありません</p>
                ) : todayHabits.map(task => {
                  const done = todayLogsSet.has(task.id)
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleHabitToggle(task.id)}
                      className={`flex items-center gap-2 w-full text-left p-2 rounded-lg transition-colors ${
                        done ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                      }`}>
                        {done && <span className="text-[10px]">✓</span>}
                      </span>
                      <span className={`text-xs ${done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {task.name}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="space-y-1">
                {todaySchedules.length === 0 ? (
                  <p className="text-xs text-gray-300 py-1">今日の日程はありません</p>
                ) : todaySchedules.map(s => (
                  <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-blue-50">
                    <span className="text-xs">📌</span>
                    <span className="text-xs text-gray-700 flex-1 truncate">{s.title}</span>
                    {s.time_start && (
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {s.time_start.slice(0, 5)}{s.time_end ? `-${s.time_end.slice(0, 5)}` : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {todayTodos.map(todo => {
                  const cat = catInfo(todo.category, catDefs)
                  const isActiveTimer = activeTimer === todo.id
                  const elapsedFormatted = isActiveTimer ? formatTime(timerElapsed) : formatMinutes(todo.actual_minutes)
                  return (
                    <div key={todo.id} className="rounded-lg border border-gray-200 p-2.5 bg-white hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleDone(todo.id, false)}
                          className="w-4 h-4 rounded border-2 border-gray-300 flex items-center justify-center shrink-0 hover:border-blue-400 transition-colors"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: cat.color }} />
                          <span className="text-xs text-gray-800">{todo.title}</span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => startTimer(todo.id)}
                            className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                              isActiveTimer ? 'bg-orange-100 text-orange-700 font-bold animate-pulse' : 'text-gray-400 hover:bg-gray-100'
                            }`}>
                            ⏳ {elapsedFormatted}
                          </button>
                          <button onClick={() => openEdit(todo)} className="px-1 py-0.5 text-[10px] text-gray-300 hover:text-blue-500" title="編集">✏️</button>
                          {todo.source_url && (
                            <a href={todo.source_url} target="_blank" rel="noopener noreferrer"
                              className="px-1 py-0.5 text-[10px] text-gray-300 hover:text-blue-500" title="ソースを開く">📂</a>
                          )}
                          <button onClick={() => removeFromToday(todo.id)} className="px-1 py-0.5 text-[10px] text-gray-300 hover:text-red-500" title="削除">✕</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <div key={`empty-${i}`} className="rounded-lg border border-dashed border-gray-200 p-2.5 bg-gray-50/50">
                    <div className="text-[10px] text-gray-300 text-center">空白スロット（あと{emptySlots - i}件）</div>
                  </div>
                ))}
                {todayTodos.length === 0 && emptySlots === 0 && (
                  <div className="text-[10px] text-gray-400 text-center py-4">今日のタスクがいっぱいです</div>
                )}
              </div>
            </div>
          </div>

          {/* ── Column 2: 受信箱 & バックログ ── */}
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
            <div className="shrink-0 p-4 pb-0 space-y-3">
              <h3 className="text-sm font-bold text-gray-700">📥 受信箱 & バックログ</h3>
              <div className="flex gap-1">
                <CatSelect value={rightCat} onChange={setRightCat} />
                <input
                  value={rightInput}
                  onChange={e => setRightInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && rightInput.trim()) {
                      addTodo(rightInput, 'backlog', rightCat)
                      setRightInput('')
                    }
                  }}
                  placeholder="新しいアイデア/タスクを収集..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => { if (rightInput.trim()) { addTodo(rightInput, 'backlog', rightCat); setRightInput('') } }}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  収集
                </button>
              </div>
              <div className="flex flex-wrap gap-1 pb-2">
                {[
                  { name: 'all', emoji: '', color: '#6B7280', bg_color: '' } as CategoryDefinition,
                  ...catDefs,
                ].map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setFilterCat(cat.name)}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                      filterCat === cat.name
                        ? 'text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-100 bg-gray-50'
                    }`}
                    style={filterCat === cat.name ? { backgroundColor: cat.color || '#6B7280' } : {}}
                  >
                    {cat.name !== 'all' && <><CatIcon name={cat.emoji} /> </>}{cat.name === 'all' ? 'すべて' : cat.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-1.5">
                {filteredBacklog.length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-8">
                    {filterCat === 'all' ? 'バックログは空です。' : 'このカテゴリのタスクはありません。'}
                  </div>
                ) : filteredBacklog.map(todo => {
                  const cat = catInfo(todo.category, catDefs)
                  return (
                    <div key={todo.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
                      <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-gray-700 flex-1 truncate">{todo.title}</span>
                      <span className="text-[10px] text-gray-400 hidden sm:block"><CatIcon name={cat.emoji} />{cat.name}</span>
                      <button onClick={() => openEdit(todo)} className="px-1.5 py-0.5 text-xs text-gray-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" title="編集">✏️</button>
                      <button onClick={() => moveToToday(todo.id)} className="px-2 py-0.5 text-xs rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors opacity-0 group-hover:opacity-100" title="今日のリストに移動">⚡</button>
                      <button onClick={() => deleteTodo(todo.id)} className="px-1.5 py-0.5 text-xs text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="削除">✕</button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Column 3: 今日のセッションとデータ統計 ── */}
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
            <div className="shrink-0 p-4 pb-0">
              <h3 className="text-sm font-bold text-gray-700">📊 今日のセッション & データ統計</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-3">
              <details className="mb-3" open>
                <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none mb-2">
                  分析
                  <span className="text-xs text-gray-400 ml-1">
                    {(() => {
                      const totalMin = timeLogs.reduce((s, l) => s + (l.duration ?? 0), 0)
                      return totalMin > 0 ? `${formatDuration(totalMin)}` : ''
                    })()}
                  </span>
                </summary>
                <Analytics logs={timeLogs} baseDate={new Date()} />
              </details>
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">📋 今日のセッション</h4>
                <Timeline
                  logs={timeLogs}
                  onEditSummary={handleEditSummary}
                  onEditCategory={handleEditCategory}
                  onEditTimes={handleEditTimes}
                  onDelete={handleTimeLogDelete}
                />
              </div>
            </div>
          </div>

          {/* ── Column 4: 已完成的记录 ── */}
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
            <div className="shrink-0 p-4 pb-0 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">✅ 已完成的记录</h3>
              {doneCount > 0 && (
                <button onClick={clearCompleted} className="text-xs text-gray-400 hover:text-red-500">
                  🧹 消去
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-3">
              <div className="space-y-1.5">
                {todayDoneTodos.length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-8">
                    今日の完了記録はまだありません
                  </div>
                ) : todayDoneTodos.map(todo => {
                  const cat = catInfo(todo.category, catDefs)
                  return (
                    <div key={todo.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 group">
                      <button
                        onClick={() => toggleDone(todo.id, true)}
                        className="w-4 h-4 rounded border-2 border-green-400 bg-green-400 text-white flex items-center justify-center flex-shrink-0 hover:bg-green-500 transition-colors"
                        title="バックログに戻す"
                      >
                        <span className="text-[10px]">✓</span>
                      </button>
                      <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-gray-500 line-through flex-1 truncate">{todo.title}</span>
                      {todo.actual_minutes > 0 && (
                        <span className="text-[10px] text-gray-400">{formatMinutes(todo.actual_minutes)}</span>
                      )}
                      <span className="text-[10px] text-gray-400"><CatIcon name={cat.emoji} />{cat.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Modal ── */}
      {summaryModal && (() => {
        const todo = todos.find(t => t.id === summaryModal.taskId)
        if (!todo) return null
        return (
          <SummaryModal
            todo={todo}
            catDefs={catDefs}
            elapsedMinutes={summaryModal.minutes}
            onSave={handleTimerSummarySave}
            onSkip={handleTimerSummarySkip}
          />
        )
      })()}

      {/* ── Edit Modal ── */}
      {editingTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingTodo(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm mx-3 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-800 mb-4">✏️ タスクを編集</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">タイトル</label>
                <input
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">カテゴリ</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm(f => ({ ...f, category: e.target.value as TodoCategory }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  {catDefs.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">見積時間（分）</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.estimated_minutes}
                    onChange={e => setEditForm(f => ({ ...f, estimated_minutes: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">実績時間</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.actual_minutes}
                    onChange={e => setEditForm(f => ({ ...f, actual_minutes: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ソースURL（任意）</label>
                <input
                  value={editForm.source_url}
                  onChange={e => setEditForm(f => ({ ...f, source_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEditingTodo(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
