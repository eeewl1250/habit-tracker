import { useState, useMemo } from 'react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Task, DailyLog } from '../types'
import { useLogs } from '../hooks/useLogs'
import { updateLogMemo } from '../lib/api'

interface MobileViewProps {
  tasks: Task[]
  logs: ReturnType<typeof useLogs>
  categoryColor: Map<string, string>
  onReloadLogs: () => void
  onManage?: () => void
  onChecked?: (taskId: string, taskName: string) => void
  noteTaskIds?: Set<string>
  onViewNotes?: (taskId: string) => void
}

function getBaseDate(task: Task): Date {
  return task.base_date ? new Date(task.base_date + 'T00:00:00') : new Date(task.created_at)
}

function getPeriodStart(diff: number, freq: number): number {
  return Math.floor(diff / freq) * freq
}

function isDayActive(task: Task, date: Date): boolean {
  if (task.period_type === 'weekday' && task.weekdays) {
    const days: string[] = JSON.parse(task.weekdays)
    return days.some((k) => +k === date.getDay())
  }
  if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
    return true
  }
  return true
}

function getPeriodDiff(date: Date, base: Date, freq: number): { periodStart: number; startMs: number; endMs: number } {
  const diff = Math.round((date.getTime() - base.getTime()) / 86400000)
  const ps = getPeriodStart(diff, freq)
  const startMs = base.getTime() + ps * 86400000
  const endMs = startMs + (freq - 1) * 86400000
  return { periodStart: ps, startMs, endMs }
}

function isCheckedInRange(logsList: DailyLog[], taskId: string, task: Task, date: Date, dateStr: string): boolean {
  if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
    const base = getBaseDate(task)
    const { startMs, endMs } = getPeriodDiff(date, base, task.frequency)
    return logsList.some((l) => {
      if (l.task_id !== taskId) return false
      const t = new Date(l.date).getTime()
      return t >= startMs && t <= endMs
    })
  }
  return logsList.some((l) => l.task_id === taskId && l.date === dateStr)
}

function getLogForPeriod(logsList: DailyLog[], taskId: string, task: Task, date: Date): DailyLog | undefined {
  if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
    const base = getBaseDate(task)
    const { startMs, endMs } = getPeriodDiff(date, base, task.frequency)
    return logsList.find((l) => {
      if (l.task_id !== taskId) return false
      const t = new Date(l.date).getTime()
      return t >= startMs && t <= endMs
    })
  }
  const dateStr = format(date, 'yyyy-MM-dd')
  return logsList.find((l) => l.task_id === taskId && l.date === dateStr)
}

function getTaskColor(task: Task, categoryColor: Map<string, string>): string {
  if (task.category) return categoryColor.get(task.category) ?? '#4CAF50'
  return '#4CAF50'
}

function TaskCard({ task, checked, log, onToggle, categoryColor, hasNote, onViewNotes }: {
  task: Task; checked: boolean; log?: DailyLog; onToggle: () => void; categoryColor: Map<string, string>
  hasNote?: boolean; onViewNotes?: (taskId: string) => void
}) {
  const [showMemo, setShowMemo] = useState(false)
  const [memoText, setMemoText] = useState(log?.memo ?? '')

  const freqInfo = task.period_type === 'frequency' && task.frequency && task.frequency > 1
    ? { freq: task.frequency, base: getBaseDate(task) }
    : null

  const handleSaveMemo = async () => {
    if (log) {
      await updateLogMemo(log.id, memoText)
      setShowMemo(false)
    }
  }

  return (
    <div className={`rounded-2xl border-2 transition-all ${
      checked ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white shadow-sm'
    }`}>
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3.5 active:scale-[0.97] transition-transform"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getTaskColor(task, categoryColor) }} />
          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
          }`}>
            {checked && <span className="text-white text-sm font-bold">✓</span>}
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-[15px] font-medium leading-tight block ${
              checked ? 'text-blue-700 line-through decoration-2' : 'text-gray-800'
            }`}>
              {task.name}
            </span>
            {freqInfo && (
              <span className="text-[11px] text-gray-400 mt-0.5 block">
                {freqInfo.freq}日ごと
              </span>
            )}
          </div>
        </div>
      </button>

      {checked && (
        <div className="px-4 pb-3 pt-0">
          {showMemo ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                placeholder="メモを入力..."
                className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveMemo()
                  if (e.key === 'Escape') setShowMemo(false)
                }}
              />
              <button onClick={handleSaveMemo}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg">保存</button>
            </div>
          ) : log?.memo ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{log.memo}</span>
              <button onClick={() => { setMemoText(log.memo ?? ''); setShowMemo(true) }}
                className="text-[10px] text-gray-400 hover:text-gray-600">編集</button>
            </div>
          ) : (
            <button onClick={() => setShowMemo(true)}
              className="text-xs text-gray-400 hover:text-gray-600">
              + メモを追加
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function MobileView({ tasks, logs, categoryColor, onReloadLogs, onManage = () => {}, onChecked, noteTaskIds, onViewNotes }: MobileViewProps) {
  const [currentDay, setCurrentDay] = useState(new Date())
  const activeTasks = tasks.filter((t) => t.status === 'active')
  const dateStr = format(currentDay, 'yyyy-MM-dd')

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>()
    const uncategorized: Task[] = []
    for (const t of activeTasks) {
      if (t.category) {
        if (!map.has(t.category)) map.set(t.category, [])
        map.get(t.category)!.push(t)
      } else {
        uncategorized.push(t)
      }
    }
    return { grouped: [...map.entries()].sort(([a], [b]) => a.localeCompare(b)), uncategorized }
  }, [activeTasks])

  const todayTasks = useMemo(() =>
    activeTasks.filter((t) => isDayActive(t, currentDay)),
    [activeTasks, currentDay]
  )

  const totalDone = todayTasks.filter((t) =>
    isCheckedInRange(logs.logs, t.id, t, currentDay, dateStr)
  ).length

  const goPrev = () => setCurrentDay((d) => subDays(d, 1))
  const goNext = () => setCurrentDay((d) => addDays(d, 1))
  const goToday = () => setCurrentDay(new Date())

  const toggleCheck = async (task: Task) => {
    const checked = isCheckedInRange(logs.logs, task.id, task, currentDay, dateStr)
    if (checked) {
      if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
        const base = getBaseDate(task)
        const { periodStart } = getPeriodDiff(currentDay, base, task.frequency)
        const startStr = format(new Date(base.getTime() + periodStart * 86400000), 'yyyy-MM-dd')
        const existing = logs.logs.find((l) =>
          l.task_id === task.id && l.date === startStr
        )
        if (existing) await logs.undo(existing.id)
      } else {
        const logId = logs.getLogId(task.id, dateStr)
        if (logId) await logs.undo(logId)
      }
    } else {
      await logs.check(task.id, dateStr)
      onChecked?.(task.id, task.name)
    }
    onReloadLogs()
  }

  return (
    <div className="pb-28">
      <div className="sticky top-[57px] z-10 bg-gray-50/95 backdrop-blur border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button onClick={goPrev}
            className="px-4 py-2 text-gray-600 active:bg-gray-200 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center text-lg">
            ‹
          </button>
          <div className="flex items-center gap-2">
            <button onClick={goToday}
              className={`text-sm px-4 py-2 rounded-full border transition-colors min-h-[40px] ${
                isToday(currentDay) ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 active:bg-gray-100'
              }`}>
              今日
            </button>
            <span className="text-base font-semibold text-gray-800 min-w-[140px] text-center">
              {format(currentDay, 'M月d日 (E)', { locale: ja })}
            </span>
          </div>
          <button onClick={goNext}
            className="px-4 py-2 text-gray-600 active:bg-gray-200 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center text-lg">
            ›
          </button>
          <button onClick={onManage}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 min-h-[44px] flex items-center">
            管理
          </button>
        </div>
        <div className="px-4 pb-3 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${todayTasks.length > 0 ? (totalDone / todayTasks.length) * 100 : 0}%` }} />
            </div>
            <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
              {totalDone}/{todayTasks.length}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6 max-w-lg mx-auto">
        {grouped.grouped.map(([category, catTasks]) => (
          <section key={category}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor.get(category) ?? '#4CAF50' }} />
              <h3 className="text-sm font-bold text-gray-500 tracking-wide">{category}</h3>
            </div>
            <div className="space-y-2">
              {catTasks.map((task) => {
                const active = isDayActive(task, currentDay)
                const log = getLogForPeriod(logs.logs, task.id, task, currentDay)
                const checked = active && !!log
                return active ? (
                  <TaskCard key={task.id} task={task} checked={checked} log={log} onToggle={() => toggleCheck(task)} categoryColor={categoryColor}
                    hasNote={noteTaskIds?.has(task.id)} onViewNotes={onViewNotes} />
                ) : (
                  <div key={task.id} className="opacity-30 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-7 h-7 rounded-full border-2 border-gray-300 flex-shrink-0" />
                      <span className="text-[15px] font-medium text-gray-800">{task.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">対象外</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
        {grouped.uncategorized.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-gray-500 tracking-wide mb-2 px-1">その他</h3>
            <div className="space-y-2">
              {grouped.uncategorized.map((task) => {
                const active = isDayActive(task, currentDay)
                const log = getLogForPeriod(logs.logs, task.id, task, currentDay)
                const checked = active && !!log
                return active ? (
                  <TaskCard key={task.id} task={task} checked={checked} log={log} onToggle={() => toggleCheck(task)} categoryColor={categoryColor}
                    hasNote={noteTaskIds?.has(task.id)} onViewNotes={onViewNotes} />
                ) : (
                  <div key={task.id} className="opacity-30 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-3.5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-7 h-7 rounded-full border-2 border-gray-300 flex-shrink-0" />
                      <span className="text-[15px] font-medium text-gray-800">{task.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">対象外</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
        {activeTasks.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm">タスクがありません</p>
            <p className="text-xs mt-1">右下の「+」から追加してください</p>
          </div>
        )}
      </div>
    </div>
  )
}
