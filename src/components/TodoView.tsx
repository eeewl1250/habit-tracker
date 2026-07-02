import { useState, useRef, useCallback, useEffect } from 'react'
import type { Todo, TodoCategory, TodoStatus } from '../types'
import { TODO_CATEGORIES } from '../types'
import { fetchTodos, createTodo as apiCreateTodo, updateTodo as apiUpdateTodo, deleteTodo as apiDeleteTodo } from '../lib/api'

const MAX_TODAY = 5

function catInfo(cat: string) {
  return TODO_CATEGORIES.find(c => c.key === cat) ?? TODO_CATEGORIES[2]
}

interface TodoViewProps {
  onNavigate?: (mode: string) => void
}

export function TodoView({ onNavigate }: TodoViewProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  // Input states
  const [leftInput, setLeftInput] = useState('')
  const [rightInput, setRightInput] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')

  // Timer state
  const [activeTimer, setActiveTimer] = useState<string | null>(null)
  const [timerElapsed, setTimerElapsed] = useState(0)
  const timerStartRef = useRef<number>(0)
  const timerIntervalRef = useRef<number | null>(null)

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

  const addTodo = useCallback(async (title: string, status: TodoStatus, category?: TodoCategory) => {
    if (!title.trim()) return
    try {
      const todo = await apiCreateTodo({
        title: title.trim(),
        category: category ?? 'life',
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
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      const minutes = Math.max(1, Math.round(elapsed / 60))
      updateField(id, { actual_minutes: (todos.find(t => t.id === id)?.actual_minutes ?? 0) + minutes })
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      setActiveTimer(null)
      setTimerElapsed(0)
      return
    }
    if (activeTimer) {
      const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000)
      const minutes = Math.max(1, Math.round(elapsed / 60))
      updateField(activeTimer, { actual_minutes: (todos.find(t => t.id === activeTimer)?.actual_minutes ?? 0) + minutes })
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
    timerStartRef.current = Date.now()
    setActiveTimer(id)
    setTimerElapsed(0)
    timerIntervalRef.current = window.setInterval(() => {
      setTimerElapsed(Math.floor((Date.now() - timerStartRef.current) / 1000))
    }, 1000)
  }, [activeTimer, todos, updateField])

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

  const todayTodos = todos.filter(t => t.status === 'today').sort((a, b) => a.sort_order - b.sort_order)
  const emptySlots = MAX_TODAY - todayTodos.length
  const doneCount = todos.filter(t => t.status === 'done').length
  const totalCount = todos.filter(t => t.status !== 'done').length + doneCount

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

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-800">🎯 行動看板</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            🟢 {doneCount}/{totalCount}
          </span>
        </div>
        <button
          onClick={clearCompleted}
          className="px-3 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          🧹 完了を消去
        </button>
      </div>

      {/* Main canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: Today's Focus ── */}
        <div className="flex-1 min-w-0 overflow-y-auto border-r border-gray-200 bg-white p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">今日のフォーカス {emptySlots > 0 && <span className="text-xs font-normal text-gray-400">（あと{emptySlots}件）</span>}</h3>

          {/* Quick add */}
          <div className="flex gap-1 mb-4">
            <input
              value={leftInput}
              onChange={e => setLeftInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && leftInput.trim()) {
                  addTodo(leftInput, 'today')
                  setLeftInput('')
                }
              }}
              placeholder="今日の緊急タスク..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => { if (leftInput.trim()) { addTodo(leftInput, 'today'); setLeftInput('') } }}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              追加
            </button>
          </div>

          {/* Today's task list */}
          <div className="space-y-2">
            {todayTodos.map(todo => {
              const cat = catInfo(todo.category)
              const isActiveTimer = activeTimer === todo.id
              const elapsedFormatted = isActiveTimer ? formatTime(timerElapsed) : formatMinutes(todo.actual_minutes)
              return (
                <div
                  key={todo.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    todo.status === 'done'
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleDone(todo.id, todo.status === 'done')}
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        todo.status === 'done'
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {todo.status === 'done' && <span className="text-xs">✓</span>}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-[10px] font-medium text-gray-400">{cat.label}</span>
                      </div>
                      <span className={`text-sm ${todo.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {todo.title}
                      </span>
                      {todo.status === 'done' && todo.diary_clue && (
                        <div className="mt-1 text-[10px] text-green-500 flex items-center gap-1">
                          <span>📝</span> 自動的に日記の線索になります
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Timer */}
                      <button
                        onClick={() => startTimer(todo.id)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          isActiveTimer
                            ? 'bg-orange-100 text-orange-700 font-bold animate-pulse'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                        title={isActiveTimer ? '停止' : 'タイマー開始'}
                      >
                        ⏳ {elapsedFormatted}
                      </button>

                      {/* Source link */}
                      {todo.source_url && (
                        <a
                          href={todo.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-1.5 py-1 text-xs text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="ソースを開く"
                        >
                          📂
                        </a>
                      )}

                      {/* Remove from today */}
                      <button
                        onClick={() => removeFromToday(todo.id)}
                        className="px-1.5 py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="今日のリストから外す"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Empty slots */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="rounded-lg border border-dashed border-gray-200 p-3 bg-gray-50/50"
              >
                <div className="text-xs text-gray-300 text-center">
                  空白スロット（あと{emptySlots - i}件追加可能）
                </div>
              </div>
            ))}

            {todayTodos.length === 0 && emptySlots === 0 && (
              <div className="text-xs text-gray-400 text-center py-8">
                今日はタスクがいっぱいです。完了したものからチェックを入れましょう。
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Backlog ── */}
        <div className="w-[380px] min-w-[320px] overflow-y-auto bg-white p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">📥 受信箱 & バックログ</h3>

          {/* Quick collect */}
          <div className="flex gap-1 mb-4">
            <input
              value={rightInput}
              onChange={e => setRightInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && rightInput.trim()) {
                  addTodo(rightInput, 'backlog')
                  setRightInput('')
                }
              }}
              placeholder="新しいアイデア/タスクを収集..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => { if (rightInput.trim()) { addTodo(rightInput, 'backlog'); setRightInput('') } }}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              収集
            </button>
          </div>

          {/* Category filter chips */}
          <div className="flex flex-wrap gap-1 mb-3">
            {[
              { key: 'all', label: 'すべて', color: '', bg: '' },
              ...TODO_CATEGORIES,
            ].map(cat => (
              <button
                key={cat.key}
                onClick={() => setFilterCat(cat.key)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                  filterCat === cat.key
                    ? 'text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-100 bg-gray-50'
                }`}
                style={filterCat === cat.key ? { backgroundColor: cat.color || '#6B7280' } : {}}
              >
                {cat.key !== 'all' && `${cat.emoji} `}{cat.label}
              </button>
            ))}
          </div>

          {/* Backlog list */}
          <div className="space-y-1.5">
            {filteredBacklog.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-8">
                {filterCat === 'all' ? 'バックログは空です。新しいタスクを収集しましょう。' : 'このカテゴリのタスクはありません。'}
              </div>
            ) : filteredBacklog.map(todo => {
              const cat = catInfo(todo.category)
              return (
                <div
                  key={todo.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm text-gray-700 flex-1 truncate">{todo.title}</span>

                  {/* Category label */}
                  <span className="text-[10px] text-gray-400 hidden sm:block">{cat.emoji}{cat.label}</span>

                  {/* Move to today */}
                  <button
                    onClick={() => moveToToday(todo.id)}
                    className="px-2 py-0.5 text-xs rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors opacity-0 group-hover:opacity-100"
                    title="今日のリストに移動"
                  >
                    ⚡
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="px-1.5 py-0.5 text-xs text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="削除"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
