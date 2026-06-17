import { useState, useMemo } from 'react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Task, DailyLog } from '../types'
import { WEEKDAY_MAP } from '../types'
import { useLogs } from '../hooks/useLogs'

interface MobileViewProps {
  tasks: Task[]
  logs: ReturnType<typeof useLogs>
  onReloadLogs: () => void
}

function isDayActive(task: Task, date: Date): boolean {
  if (task.period_type === 'weekday' && task.weekdays) {
    const days: string[] = JSON.parse(task.weekdays)
    return days.some((k) => WEEKDAY_MAP[k] === date.getDay())
  }
  if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
    const msPerDay = 86400000
    const daysSinceEpoch = Math.floor(date.getTime() / msPerDay)
    return daysSinceEpoch % task.frequency === 0
  }
  return true
}

function isCheckedInRange(
  logsList: DailyLog[], taskId: string, task: Task, date: Date, dateStr: string
): boolean {
  if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
    const msPerDay = 86400000
    const daysSinceEpoch = Math.floor(date.getTime() / msPerDay)
    const startMs = daysSinceEpoch * msPerDay
    const endMs = startMs + (task.frequency - 1) * msPerDay
    return logsList.some((l) => {
      if (l.task_id !== taskId) return false
      const t = new Date(l.date).getTime()
      return t >= startMs && t <= endMs
    })
  }
  return logsList.some((l) => l.task_id === taskId && l.date === dateStr)
}

export function MobileView({ tasks, logs, onReloadLogs }: MobileViewProps) {
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
        const msPerDay = 86400000
        const dse = Math.floor(currentDay.getTime() / msPerDay)
        const start = format(new Date(dse * msPerDay), 'yyyy-MM-dd')
        const end = format(new Date(dse * msPerDay + (task.frequency - 1) * msPerDay), 'yyyy-MM-dd')
        const existing = logs.logs.find((l) =>
          l.task_id === task.id && l.date >= start && l.date <= end
        )
        if (existing) await logs.undo(existing.id)
      } else {
        const logId = logs.getLogId(task.id, dateStr)
        if (logId) await logs.undo(logId)
      }
    } else {
      await logs.check(task.id, dateStr)
    }
    onReloadLogs()
  }

  const renderTask = (task: Task) => {
    const active = isDayActive(task, currentDay)
    const checked = active && isCheckedInRange(logs.logs, task.id, task, currentDay, dateStr)

    return (
      <button
        key={task.id}
        onClick={() => active && toggleCheck(task)}
        className={`w-full text-left rounded-2xl px-4 py-3.5 transition-all active:scale-[0.97] border-2 ${
          !active ? 'opacity-30 border-gray-100 bg-gray-50' :
          checked ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white shadow-sm'
        }`}
        disabled={!active}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-3 h-3 rounded-full flex-shrink-0 ${!active ? 'opacity-0' : ''}`}
            style={{ backgroundColor: task.color ?? '#E8F5E9' }}
          />
          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
          }`}>
            {checked && <span className="text-white text-sm font-bold">✓</span>}
          </div>
          <span className={`text-[15px] font-medium leading-tight ${
            checked ? 'text-blue-700 line-through decoration-2' : 'text-gray-800'
          }`}>
            {task.name}
          </span>
          {!active && (
            <span className="text-xs text-gray-400 ml-auto">対象外</span>
          )}
        </div>
      </button>
    )
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
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-bold text-gray-500 tracking-wide">{category || 'その他'}</h3>
            </div>
            <div className="space-y-2">
              {catTasks.map(renderTask)}
            </div>
          </section>
        ))}
        {grouped.uncategorized.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-bold text-gray-500 tracking-wide">その他</h3>
            </div>
            <div className="space-y-2">{grouped.uncategorized.map(renderTask)}</div>
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
