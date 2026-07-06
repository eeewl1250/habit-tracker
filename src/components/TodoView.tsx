import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, differenceInMinutes } from 'date-fns'
import { ja } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { Todo, TodoCategory, TodoStatus, TimeLog, CategoryDefinition, Task, DailyLog, Schedule } from '../types'
import { WEEKDAY_KEYS } from '../types'
import { fetchTodos, fetchCategoryDefinitions, createTodo as apiCreateTodo, updateTodo as apiUpdateTodo, deleteTodo as apiDeleteTodo, fetchTimeLogs, updateTimeLog, deleteTimeLog, fetchSchedules, checkIn, undoCheckIn } from '../lib/api'
import { calcTimeBonus, calcCategoryBreakdown } from '../lib/bonus'
import { CatIcon } from './Icon'
import { useConfirm } from '../hooks/useConfirm'
import type { useTimeLogs } from '../hooks/useTimeLogs'

const MAX_TODAY = 5

const FALLBACK_CAT: CategoryDefinition = { id: '', name: '', emoji: '📋', color: '#6B7280', bg_color: '', is_default: true, sort_order: 0, bonus_enabled: false, bonus_rate: 0, created_at: '', updated_at: '' }

function catInfo(catName: string, catDefs: CategoryDefinition[]): CategoryDefinition {
  return catDefs.find(c => c.name === catName) ?? catDefs[catDefs.length - 1] ?? FALLBACK_CAT
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

function SummaryModal({ todo, catDefs, elapsedMinutes, onSave, onSkip }: {
  todo: Todo
  catDefs: CategoryDefinition[]
  elapsedMinutes: number
  onSave: (summary: string) => void
  onSkip: () => void
}) {
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
              {cat.name} · {formatDuration(elapsedMinutes)}
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

function TimelineItem({ log, catDefs, onEditSummary, onEditCategory, onEditTimes, onDelete }: {
  log: TimeLog
  catDefs: CategoryDefinition[]
  onEditSummary: (id: string, summary: string) => void
  onEditCategory: (id: string, category: string) => void
  onEditTimes: (id: string, start: string, end: string) => void
  onDelete: (id: string) => void
}) {
  const catInfo_lookup = catInfo(log.category, catDefs)
  const start = new Date(log.start_time)
  const end = log.end_time ? new Date(log.end_time) : null
  const duration = end ? differenceInMinutes(end, start) : 0
  const [editing, setEditing] = useState(false)
  const [editSummary, setEditSummary] = useState(log.summary ?? '')
  const [editCategory, setEditCategory] = useState(log.category)
  const [editStart, setEditStart] = useState(format(start, 'HH:mm'))
  const [editEnd, setEditEnd] = useState(end ? format(end, 'HH:mm') : '')

  const handleSave = () => {
    onEditSummary(log.id, editSummary)
    if (editCategory !== log.category) {
      onEditCategory(log.id, editCategory)
    }
    const [h1, m1] = editStart.split(':').map(Number)
    const [h2, m2] = editEnd.split(':').map(Number)
    const sy = start.getFullYear()
    const sM = start.getMonth()
    const sd = start.getDate()
    onEditTimes(log.id,
      new Date(sy, sM, sd, h1, m1).toISOString(),
      new Date(sy, sM, sd, h2, m2).toISOString()
    )
    setEditing(false)
  }

  return (
    <div className="flex items-start gap-2 px-1">
      <div className="flex flex-col items-center pt-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catInfo_lookup.color }} />
        <div className="w-0.5 h-full min-h-[2rem] bg-gray-200" />
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
            {format(start, 'HH:mm')} ~ {end ? format(end, 'HH:mm') : '--:--'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: catInfo_lookup.color + '20', color: catInfo_lookup.color }}>
            <CatIcon name={catInfo_lookup.emoji} /> {catInfo_lookup.name}
          </span>
          {log.tags?.[0] && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 truncate max-w-[120px]">
              {log.tags[0]}
            </span>
          )}
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
              <div className="flex gap-1 flex-wrap">
                {catDefs.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setEditCategory(c.name)}
                    className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                      editCategory === c.name
                        ? 'font-medium text-white border-transparent'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                    style={editCategory === c.name ? { backgroundColor: c.color } : undefined}
                  >
                    <CatIcon name={c.emoji} /> {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400">時間</span>
              <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)}
                className="w-20 px-1 py-1 border border-gray-300 rounded text-[10px]" />
              <span className="text-[10px] text-gray-400">~</span>
              <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                className="w-20 px-1 py-1 border border-gray-300 rounded text-[10px]" />
            </div>
            <div className="flex gap-1">
              <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700">
                保存
              </button>
              <button onClick={() => onDelete(log.id)} className="px-3 py-1 bg-red-50 text-red-500 rounded text-[10px] hover:bg-red-100">
                削除
              </button>
            </div>
          </div>
        ) : (
          log.summary && <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">{log.summary}</div>
        )}
      </div>
    </div>
  )
}

function Timeline({ logs, catDefs, onEditSummary, onEditCategory, onEditTimes, onDelete }: {
  logs: TimeLog[]
  catDefs: CategoryDefinition[]
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
          catDefs={catDefs}
          onEditSummary={onEditSummary}
          onEditCategory={onEditCategory}
          onEditTimes={onEditTimes}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280']

function Analytics({ logs, catDefs, baseDate }: { logs: TimeLog[]; catDefs: CategoryDefinition[]; baseDate: Date }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  const { dateRange, days } = useMemo(() => {
    const start = period === 'week' ? startOfWeek(baseDate, { weekStartsOn: 1 }) : startOfMonth(baseDate)
    const end = period === 'week' ? endOfWeek(baseDate, { weekStartsOn: 1 }) : endOfMonth(baseDate)
    return { dateRange: { start, end }, days: eachDayOfInterval({ start, end }) }
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

  const { catBreakdown, defMap } = useMemo(() => {
    const dm = new Map(catDefs.map(c => [c.name, c]))
    const totals = new Map<string, number>()
    for (const l of periodLogs) {
      if (!l.end_time || l.duration === null) continue
      totals.set(l.category, (totals.get(l.category) ?? 0) + l.duration)
    }
    const sorted = [...totals.entries()]
      .map(([name, minutes]) => ({ name, hours: Math.round(minutes / 60 * 10) / 10, color: dm.get(name)?.color ?? '#6B7280' }))
      .sort((a, b) => b.hours - a.hours)
    return { catBreakdown: sorted, defMap: dm }
  }, [periodLogs, catDefs])

  const topCats = catBreakdown.slice(0, 5)
  const otherHours = catBreakdown.slice(5).reduce((s, c) => s + c.hours, 0)

  const dailyTotals = useMemo(() => {
    const map = new Map<string, Record<string, number>>()
    for (const d of days) {
      map.set(format(d, 'yyyy-MM-dd'), {})
    }
    for (const l of periodLogs) {
      if (!l.end_time || l.duration === null) continue
      const day = format(new Date(l.start_time), 'yyyy-MM-dd')
      const entry = map.get(day)
      if (entry) {
        entry[l.category] = (entry[l.category] ?? 0) + Math.round(l.duration / 60 * 10) / 10
      }
    }
    return Array.from(map.entries()).map(([date, cats]) => {
      const dayData: Record<string, number> = { total: 0 }
      for (const [cat, h] of Object.entries(cats)) {
        dayData[cat] = h
        dayData.total += h
      }
      dayData.total = Math.round(dayData.total * 10) / 10
      return {
        date: format(parseISO(date), period === 'week' ? 'EE' : 'M/d', { locale: ja }),
        fullDate: date,
        ...dayData,
      }
    })
  }, [periodLogs, days, period])

  const totalHours = catBreakdown.reduce((s, c) => s + c.hours, 0)
  const dailyAvg = days.length > 0 ? Math.round(totalHours / days.length * 10) / 10 : 0

  const pieData = [
    ...topCats.map(c => ({ name: c.name, value: c.hours, color: c.color })),
    ...(otherHours > 0 ? [{ name: 'その他', value: otherHours, color: '#9CA3AF' }] : []),
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
          <div className="text-base font-bold text-gray-800">{totalHours.toFixed(1)}</div>
          <div className="text-[10px] text-gray-500">総時間(h)</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
          <div className="text-base font-bold text-gray-800">{dailyAvg.toFixed(1)}</div>
          <div className="text-[10px] text-gray-500">日平均(h)</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
          <div className="text-base font-bold text-gray-800">{catBreakdown.length}</div>
          <div className="text-[10px] text-gray-500">カテゴリ数</div>
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
              {topCats.map((c, i) => (
                <Line key={c.name} type="monotone" dataKey={c.name} stroke={c.color} strokeWidth={2} dot={{ r: 2 }} name={c.name} />
              ))}
              {otherHours > 0 && (
                <Line type="monotone" dataKey="total" stroke="#9CA3AF" strokeWidth={1} strokeDasharray="4 2" dot={false} name="合計" />
              )}
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
          <div className="flex justify-center gap-3 text-[10px] flex-wrap">
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
  timeLogs: ReturnType<typeof useTimeLogs>
}

export function TodoView({ tasks, logs, timeLogs }: TodoViewProps) {
  const [catDefs, setCatDefs] = useState<CategoryDefinition[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  // Input states (default to first non-default category)
  const defaultCat = catDefs.find(c => !c.is_default)
  const [leftInput, setLeftInput] = useState('')
  const [leftCat, setLeftCat] = useState<TodoCategory>(defaultCat?.name ?? '就活')
  const [rightInput, setRightInput] = useState('')
  const [rightCat, setRightCat] = useState<TodoCategory>(defaultCat?.name ?? '生活')
  const [untrackedSummary, setUntrackedSummary] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [focusTab, setFocusTab] = useState<'habits' | 'schedules' | 'tasks'>('habits')
  const [sessionTab, setSessionTab] = useState<'analytics' | 'sessions'>('analytics')
  const [doneTab, setDoneTab] = useState<'today' | 'all'>('today')
  const [confirm, ConfirmModal] = useConfirm()

  // Global timer state
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null)
  const [timerElapsed, setTimerElapsed] = useState(0)
  const timerStartRef = useRef<number>(0)
  const timerIntervalRef = useRef<number | null>(null)
  const lastTimeLogIdRef = useRef<string | null>(null)
  const [showTaskSelector, setShowTaskSelector] = useState(false)

  // Summary modal state
  const [summaryModal, setSummaryModal] = useState<{
    taskId: string; minutes: number; startTime: string
  } | null>(null)

  // Completion confirmation state
  const [confirmComplete, setConfirmComplete] = useState<{ taskId: string } | null>(null)

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
  const habitsByCat = useMemo(() => {
    const groups: Record<string, Task[]> = {}
    todayHabits.forEach(task => {
      const key = task.category
      if (!groups[key]) groups[key] = []
      groups[key].push(task)
    })
    return groups
  }, [todayHabits])

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
    const todo = todos.find(t => t.id === id)
    if (!await confirm(`「${todo?.title ?? ''}」を削除しますか？`)) return
    try {
      await apiDeleteTodo(id)
      setTodos(prev => prev.filter(t => t.id !== id))
    } catch (e) {
      console.error('Failed to delete todo', e)
    }
  }, [todos])

  const toggleDone = useCallback(async (id: string, isDone: boolean) => {
    const todo = todos.find(t => t.id === id)
    if (isDone && !await confirm(`「${todo?.title ?? ''}」を未完了に戻しますか？`)) return
    const status: TodoStatus = isDone ? 'backlog' : 'done'
    const now = isDone ? null : new Date().toISOString()
    const clue = !isDone && todo
      ? `✅ ${todo.title}${todo.actual_minutes > 0 ? `（${todo.actual_minutes}分）` : ''}`
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

  const startTimerOnTodo = useCallback((id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return

    // Clicking same running todo: stop and show summary modal
    if (activeTodoId === id && timeLogs.getActiveTimer()) {
      const activeLog = timeLogs.getActiveTimer()!
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      const minutes = Math.max(1, Math.round(elapsed / 60))
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      setActiveTodoId(null)
      setTimerElapsed(0)
      setSummaryModal({
        taskId: id,
        minutes,
        startTime: activeLog.start_time,
      })
      return
    }

    // Switching to a different task: stop previous timer immediately
    if (activeTodoId && timeLogs.getActiveTimer()) {
      const activeLog = timeLogs.getActiveTimer()!
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      const minutes = Math.max(1, Math.round(elapsed / 60))
      updateField(activeTodoId, { actual_minutes: (todos.find(t => t.id === activeTodoId)?.actual_minutes ?? 0) + minutes })
      timeLogs.stopTimer(activeLog.id)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }

    // Start new timer
    timeLogs.startTimer(todo.category)
    timerStartRef.current = Date.now()
    setActiveTodoId(id)
    setTimerElapsed(0)
    timerIntervalRef.current = window.setInterval(() => {
      setTimerElapsed(Math.floor((Date.now() - timerStartRef.current) / 1000))
    }, 1000)
  }, [activeTodoId, todos, updateField, timeLogs])

  const handleGlobalStart = useCallback(() => {
    setShowTaskSelector(true)
  }, [])

  const handleGlobalStartWithTodo = useCallback(async (todo: Todo) => {
    setShowTaskSelector(false)
    // If timer already running on a different task, stop it first
    if (activeTodoId && timeLogs.getActiveTimer()) {
      const activeLog = timeLogs.getActiveTimer()!
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      const minutes = Math.max(1, Math.round(elapsed / 60))
      updateField(activeTodoId, { actual_minutes: (todos.find(t => t.id === activeTodoId)?.actual_minutes ?? 0) + minutes })
      timeLogs.stopTimer(activeLog.id)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
    timeLogs.startTimer(todo.category)
    timerStartRef.current = Date.now()
    setActiveTodoId(todo.id)
    setTimerElapsed(0)
    timerIntervalRef.current = window.setInterval(() => {
      setTimerElapsed(Math.floor((Date.now() - timerStartRef.current) / 1000))
    }, 1000)
  }, [activeTodoId, todos, updateField, timeLogs])

  const handleGlobalStartWithCategory = useCallback(async (category: string) => {
    setShowTaskSelector(false)
    if (activeTodoId && timeLogs.getActiveTimer()) {
      const activeLog = timeLogs.getActiveTimer()!
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      const minutes = Math.max(1, Math.round(elapsed / 60))
      updateField(activeTodoId, { actual_minutes: (todos.find(t => t.id === activeTodoId)?.actual_minutes ?? 0) + minutes })
      timeLogs.stopTimer(activeLog.id)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
    timeLogs.startTimer(category)
    timerStartRef.current = Date.now()
    setActiveTodoId(null)
    setTimerElapsed(0)
    timerIntervalRef.current = window.setInterval(() => {
      setTimerElapsed(Math.floor((Date.now() - timerStartRef.current) / 1000))
    }, 1000)
  }, [activeTodoId, todos, updateField, timeLogs])

  const handleGlobalStop = useCallback(() => {
    const activeLog = timeLogs.getActiveTimer()
    if (!activeLog) return
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      const minutes = Math.max(1, Math.round(elapsed / 60))
      setSummaryModal({
        taskId: activeTodoId ?? 'untracked',
        minutes,
        startTime: activeLog.start_time,
      })
    } else {
      // Stale timer from previous session – stop directly
      timeLogs.stopTimer(activeLog.id)
      setActiveTodoId(null)
      setTimerElapsed(0)
    }
  }, [timeLogs, activeTodoId])

  const handleTimerSummarySave = useCallback(async (summary: string) => {
    if (!summaryModal) return
    const { taskId, minutes, startTime } = summaryModal
    const endTime = new Date().toISOString()
    // Update actual_minutes if linked to a todo
    if (taskId !== 'untracked') {
      await updateField(taskId, {
        actual_minutes: (todos.find(t => t.id === taskId)?.actual_minutes ?? 0) + minutes,
      })
    }
    // Stop timer via timeLogs
    const activeLog = timeLogs.getActiveTimer()
    if (activeLog) {
      const todo = taskId !== 'untracked' ? todos.find(t => t.id === taskId) : null
      await timeLogs.stopTimer(activeLog.id, summary || undefined, todo ? [todo.title] : undefined)
      lastTimeLogIdRef.current = activeLog.id
    }
    setActiveTodoId(null)
    setTimerElapsed(0)
    setSummaryModal(null)
    setUntrackedSummary('')
    // Show completion confirmation if linked to a task
    if (taskId !== 'untracked') {
      setConfirmComplete({ taskId })
    }
  }, [summaryModal, todos, updateField, timeLogs])

  const handleTimerSummarySkip = useCallback(async () => {
    await handleTimerSummarySave('')
  }, [handleTimerSummarySave])

  const handleCompleteTask = useCallback(async () => {
    if (!confirmComplete) return
    const { taskId } = confirmComplete
    const todo = todos.find(t => t.id === taskId)
    if (todo) {
      const clue = `✅ ${todo.title}${todo.actual_minutes > 0 ? `（${todo.actual_minutes}分）` : ''}`
      await updateField(taskId, { status: 'done', completed_at: new Date().toISOString(), diary_clue: clue })
      // Record completion into the time_log
      if (lastTimeLogIdRef.current && todo.actual_minutes > 0) {
        const existing = timeLogs.logs.find(l => l.id === lastTimeLogIdRef.current)
        if (existing) {
          // Update summary with completion note
          const taskInfo = `✅ 完了（${todo.actual_minutes}分）`
          const merged = existing.summary
            ? `${existing.summary}\n${taskInfo}`
            : taskInfo
          // Update tags to show completion
          const doneTag = `✅ ${todo.title}（${todo.actual_minutes}分）`
          await updateTimeLog(lastTimeLogIdRef.current, { summary: merged, tags: [doneTag] })
          timeLogs.load(
            format(new Date(new Date().getTime() - 31 * 86400000), 'yyyy-MM-dd'),
            format(new Date(new Date().getTime() + 31 * 86400000), 'yyyy-MM-dd')
          )
        }
      }
    }
    setConfirmComplete(null)
  }, [confirmComplete, todos, updateField, timeLogs])

  const handleSkipComplete = useCallback(() => {
    setConfirmComplete(null)
  }, [])

  const handleTimeLogEdit = useCallback(async (id: string, updates: Partial<{ end_time: string | null; start_time: string | null; summary: string | null; category: string }>) => {
    try {
      await updateTimeLog(id, updates)
      timeLogs.load(
        format(new Date(new Date().getTime() - 31 * 86400000), 'yyyy-MM-dd'),
        format(new Date(new Date().getTime() + 31 * 86400000), 'yyyy-MM-dd')
      )
    } catch (e) {
      console.error('Failed to update time log', e)
    }
  }, [timeLogs])

  const handleTimeLogDelete = useCallback(async (id: string) => {
    try {
      await deleteTimeLog(id)
      timeLogs.load(
        format(new Date(new Date().getTime() - 31 * 86400000), 'yyyy-MM-dd'),
        format(new Date(new Date().getTime() + 31 * 86400000), 'yyyy-MM-dd')
      )
    } catch (e) {
      console.error('Failed to delete time log', e)
    }
  }, [timeLogs])

  const handleEditSummary = useCallback(async (id: string, summary: string) => {
    await handleTimeLogEdit(id, { summary })
  }, [handleTimeLogEdit])

  const handleEditCategory = useCallback(async (id: string, category: string) => {
    await handleTimeLogEdit(id, { category })
  }, [handleTimeLogEdit])

  const handleEditTimes = useCallback(async (id: string, start: string, end: string) => {
    try {
      await updateTimeLog(id, { start_time: start, end_time: end })
      timeLogs.load(
        format(new Date(new Date().getTime() - 31 * 86400000), 'yyyy-MM-dd'),
        format(new Date(new Date().getTime() + 31 * 86400000), 'yyyy-MM-dd')
      )
    } catch (e) {
      console.error('Failed to edit time log times', e)
    }
  }, [timeLogs])

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [])

  const clearCompleted = useCallback(async () => {
    const doneTodos = todos.filter(t => t.status === 'done')
    if (doneTodos.length === 0) return
    if (!await confirm(`完了済みタスク ${doneTodos.length} 件をすべて削除しますか？`)) return
    for (const t of doneTodos) {
      try {
        await apiDeleteTodo(t.id)
      } catch (e) {
        console.error('Failed to delete todo', e)
      }
    }
    setTodos(prev => prev.filter(t => t.status !== 'done'))
  }, [todos])

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
  const sortedDoneTodos = useMemo(() => [...doneTodos].sort((a, b) => {
    const aTime = a.completed_at ?? a.updated_at
    const bTime = b.completed_at ?? b.updated_at
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  }), [doneTodos])

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

  const activeLog = timeLogs.getActiveTimer()
  const activeTodo = activeTodoId ? todos.find(t => t.id === activeTodoId) : null
  const todayBonus = useMemo(() => {
    return calcTimeBonus(timeLogs.logs, catDefs, format(new Date(), 'yyyy-MM-dd'))
  }, [timeLogs.logs, catDefs])

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
    <div className="flex flex-col bg-gray-50 h-full">
      {/* Main canvas - 4 columns */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
          {/* ── Column 1: 今日のフォーカス + 集中タイマー ── */}
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">🎯 今日のフォーカス</h3>
            </div>
            {/* Focus Timer Card */}
            <div className={`shrink-0 px-4 py-3 ${activeLog ? 'bg-orange-50' : ''} border-b ${activeLog ? 'border-orange-100' : 'border-gray-100'}`}>
              {activeLog ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏱️</span>
                    <span className="text-sm font-bold text-gray-800 truncate">
                      {activeTodo ? activeTodo.title : '集中中'}
                    </span>
                    <span className="ml-auto text-xs text-green-600 font-medium animate-pulse">● 計測中</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      <CatIcon name={catInfo(activeLog.category, catDefs).emoji} /> {catInfo(activeLog.category, catDefs).name}
                    </span>
                    <span className="text-xl font-mono font-bold text-orange-700">{formatTime(timerElapsed)}</span>
                    <button onClick={handleGlobalStop} className="ml-auto px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium">
                      ■ 終了
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={handleGlobalStart} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-all">
                  🎯 タスクを選んで集中開始
                </button>
              )}
            </div>
            {/* Today's bonus */}
            <div className="shrink-0 px-4 py-1.5 text-[10px] text-gray-500 bg-gray-50 border-b border-gray-100 flex items-center gap-1">
              今日の集中ボーナス: <span className="text-green-600 font-medium">+¥{todayBonus.toLocaleString()}</span>
              {activeLog && <span className="ml-auto text-green-600 font-medium animate-pulse">● リアルタイム加算中</span>}
            </div>
            <div className="shrink-0 flex border-b border-gray-100">
              {[
                { key: 'habits', label: '📋 习惯', sub: '自動' },
                { key: 'schedules', label: '📅 日程', sub: '自動' },
                { key: 'tasks', label: '🎯 任务池', sub: `あと${emptySlots}件` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFocusTab(tab.key as 'habits' | 'schedules' | 'tasks')}
                  className={`flex-1 py-2 text-center transition-colors ${
                    focusTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="text-xs font-medium leading-tight">{tab.label}</div>
                  <div className="text-[10px] opacity-60">{tab.sub}</div>
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
              {focusTab === 'habits' && (
                <div className="space-y-3 pt-3">
                  {todayHabits.length === 0 ? (
                    <p className="text-xs text-gray-300 py-1 text-center">今日の習慣はありません</p>
                  ) : Object.entries(habitsByCat).map(([catName, tasks]) => {
                    const cat = catInfo(catName, catDefs)
                    return (
                      <div key={catName}>
                        <div className="sticky top-0 z-10 -mx-4 px-4 py-1.5 text-xs font-bold border-b flex items-center gap-1"
                          style={{ backgroundColor: cat.color + '15', color: cat.color, borderColor: cat.color + '30' }}>
                          <CatIcon name={cat.emoji} />
                          <span>{cat.name}</span>
                          <span className="ml-auto text-[10px] opacity-60">{tasks.length}</span>
                        </div>
                        {tasks.map(task => {
                          const done = todayLogsSet.has(task.id)
                          return (
                            <button key={task.id} onClick={() => handleHabitToggle(task.id)}
                              className={`flex items-center gap-2 w-full text-left p-2 rounded-lg transition-colors ${
                                done ? 'bg-green-50' : 'hover:bg-gray-50'
                              }`}>
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
                    )
                  })}
                </div>
              )}
              {focusTab === 'schedules' && (
                <div className="space-y-1 pt-3">
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
              )}
              {focusTab === 'tasks' && (
                <div className="space-y-1.5 pt-3">
                  <div className="flex gap-1 pb-1 sticky top-0 bg-white">
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
                  {todayTodos.map(todo => {
                    const cat = catInfo(todo.category, catDefs)
                    const isActiveTimer = activeTodoId === todo.id
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
                            <button onClick={() => startTimerOnTodo(todo.id)}
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
              )}
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
            <div className="shrink-0 px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">📊 今日のセッション & データ統計</h3>
            </div>
            <div className="shrink-0 flex border-b border-gray-100">
              {[
                { key: 'analytics', label: '📈 分析', sub: '' },
                { key: 'sessions', label: '📋 セッション', sub: '' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSessionTab(tab.key as 'analytics' | 'sessions')}
                  className={`flex-1 py-2.5 text-center transition-colors ${
                    sessionTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {sessionTab === 'analytics' && (
                <div>
                  {(() => {
                    const totalMin = timeLogs.logs.reduce((s, l) => s + (l.duration ?? 0), 0)
                    return totalMin > 0 ? (
                      <p className="text-[10px] text-gray-400 mb-3">合計: {formatDuration(totalMin)}</p>
                    ) : null
                  })()}
                  <Analytics logs={timeLogs.logs} catDefs={catDefs} baseDate={new Date()} />
                </div>
              )}
              {sessionTab === 'sessions' && (
                <Timeline
                  logs={timeLogs.logs}
                  catDefs={catDefs}
                  onEditSummary={handleEditSummary}
                  onEditCategory={handleEditCategory}
                  onEditTimes={handleEditTimes}
                  onDelete={handleTimeLogDelete}
                />
              )}
            </div>
          </div>

          {/* ── Column 4: 已完成的记录 ── */}
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">✅ 已完成的记录</h3>
              {doneCount > 0 && (
                <button onClick={clearCompleted} className="text-xs text-gray-400 hover:text-red-500">
                  🧹 消去
                </button>
              )}
            </div>
            <div className="shrink-0 flex border-b border-gray-100">
              {[
                { key: 'today', label: '📅 今日', sub: `${todayDoneTodos.length}` },
                { key: 'all', label: '📋 すべて', sub: `${doneCount}` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setDoneTab(tab.key as 'today' | 'all')}
                  className={`flex-1 py-2 text-center transition-colors ${
                    doneTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="text-xs font-medium leading-tight">{tab.label}</div>
                  <div className="text-[10px] opacity-60">{tab.sub}</div>
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1.5">
                {(doneTab === 'today' ? todayDoneTodos : sortedDoneTodos).length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-8">
                    完了記録はまだありません
                  </div>
                ) : (doneTab === 'today' ? todayDoneTodos : sortedDoneTodos).map(todo => {
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

      {/* ── Task Selector Modal ── */}
      {showTaskSelector && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4" onClick={() => setShowTaskSelector(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-800">🎯 集中するタスクを選択</span>
              <button onClick={() => setShowTaskSelector(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto mb-3">
              {todayTodos.length === 0 && <p className="text-xs text-gray-400 text-center py-4">今日のタスクがありません</p>}
              {todayTodos.map(todo => {
                const cat = catInfo(todo.category, catDefs)
                return (
                  <button key={todo.id} onClick={() => handleGlobalStartWithTodo(todo)}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-gray-700 flex-1 truncate">{todo.title}</span>
                    <span className="text-[10px] text-gray-400"><CatIcon name={cat.emoji} />{cat.name}</span>
                  </button>
                )
              })}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="text-xs text-gray-500 mb-2">またはカテゴリを選んで直接開始</div>
              <div className="flex gap-1 flex-wrap">
                {catDefs.map(c => (
                  <button key={c.name} onClick={() => handleGlobalStartWithCategory(c.name)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                    style={{ backgroundColor: c.color }}>
                    <CatIcon name={c.emoji} /> {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary Modal ── */}
      {summaryModal && (() => {
        const todo = todos.find(t => t.id === summaryModal.taskId)
        if (!todo) {
          // Untracked timer – show generic summary
          return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
              <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⏱️</span>
                  <div>
                    <div className="text-sm font-bold text-gray-800">集中を終了</div>
                    <div className="text-xs text-gray-500">{summaryModal.minutes}分</div>
                  </div>
                </div>
                <textarea
                  autoFocus
                  value={untrackedSummary}
                  onChange={e => setUntrackedSummary(e.target.value)}
                  placeholder="この時間にやったことを書こう..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="flex gap-2 mt-3">
                  <button onClick={handleTimerSummarySkip} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    スキップ
                  </button>
                  <button onClick={() => handleTimerSummarySave(untrackedSummary)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                    保存
                  </button>
                </div>
              </div>
            </div>
          )
        }
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

      {/* ── Completion Confirmation Modal ── */}
      {confirmComplete && (() => {
        const todo = todos.find(t => t.id === confirmComplete.taskId)
        if (!todo) return null
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span>
                <span className="text-sm font-bold text-gray-800">タスクを完了しますか？</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                「{todo.title}」の集中時間を記録しました。
              </p>
              <div className="flex gap-2">
                <button onClick={handleSkipComplete} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                  時間だけ記録
                </button>
                <button onClick={handleCompleteTask} className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors">
                  完了する ✓
                </button>
              </div>
            </div>
          </div>
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
      {ConfirmModal}
    </div>
  )
}
