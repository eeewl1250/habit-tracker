import { useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Task, DailyLog } from '../types'
import { WEEKDAY_MAP } from '../types'

interface MatrixViewProps {
  tasks: Task[]
  days: Date[]
  logs: { logs: DailyLog[]; isChecked: (taskId: string, date: string) => boolean; getLogId: (taskId: string, date: string) => string | undefined; check: (taskId: string, date: string) => Promise<DailyLog>; undo: (logId: string) => Promise<void> }
}

const dayColors: Record<string, string> = {
  '月': 'text-gray-600', '火': 'text-gray-600', '水': 'text-gray-600',
  '木': 'text-gray-600', '金': 'text-gray-600',
  '土': 'text-blue-500', '日': 'text-red-400',
}

function isDayActive(task: Task, date: Date): boolean {
  if (task.period_type === 'weekday' && task.weekdays) {
    const days: string[] = JSON.parse(task.weekdays)
    const dayIndex = date.getDay()
    return days.some((k) => WEEKDAY_MAP[k] === dayIndex)
  }
  if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
    const msPerDay = 86400000
    const daysSinceEpoch = Math.floor(date.getTime() / msPerDay)
    return daysSinceEpoch % task.frequency === 0
  }
  return true
}

function getPeriodBounds(task: Task, date: Date): { start: string; end: string } | null {
  if (task.period_type !== 'frequency' || !task.frequency || task.frequency <= 1) return null
  const msPerDay = 86400000
  const daysSinceEpoch = Math.floor(date.getTime() / msPerDay)
  if (daysSinceEpoch % task.frequency !== 0) return null
  const startMs = daysSinceEpoch * msPerDay
  const endMs = startMs + (task.frequency - 1) * msPerDay
  return {
    start: format(new Date(startMs), 'yyyy-MM-dd'),
    end: format(new Date(endMs), 'yyyy-MM-dd'),
  }
}

function isCheckedInRange(logs: MatrixViewProps['logs'], taskId: string, start: string, end: string): boolean {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return logs.logs.some((l) => {
    if (l.task_id !== taskId) return false
    const t = new Date(l.date).getTime()
    return t >= s && t <= e
  })
}

export function MatrixView({ tasks, days, logs }: MatrixViewProps) {
  const span = 1 + days.length

  const grouped = useMemo(() => {
    const active = tasks.filter((t) => t.status === 'active')
    const map = new Map<string, Task[]>()
    const uncategorized: Task[] = []
    for (const t of active) {
      if (t.category) {
        if (!map.has(t.category)) map.set(t.category, [])
        map.get(t.category)!.push(t)
      } else {
        uncategorized.push(t)
      }
    }
    const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    return { grouped: sorted, uncategorized }
  }, [tasks])

  return (
    <div
      className="grid gap-0 text-sm"
      style={{ gridTemplateColumns: `160px repeat(${days.length}, minmax(28px, 1fr))` }}
    >
      <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200" />
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={`text-center py-2 border-b border-gray-200 text-xs font-medium sticky top-0 z-10 ${
            isToday(day) ? 'bg-blue-100' : 'bg-gray-50'
          } ${dayColors[format(day, 'E', { locale: ja })] ?? 'text-gray-600'}`}
        >
          <div>{format(day, 'E', { locale: ja })}</div>
          <div className="text-sm">{format(day, 'd')}</div>
        </div>
      ))}

      {grouped.grouped.map(([category, catTasks]) => (
        <CategoryGroup key={category} category={category} tasks={catTasks} days={days} logs={logs} span={span} />
      ))}
      {grouped.uncategorized.length > 0 && (
        <CategoryGroup category="" tasks={grouped.uncategorized} days={days} logs={logs} span={span} />
      )}
    </div>
  )
}

function CategoryGroup({ category, tasks, days, logs, span }: {
  category: string; tasks: Task[]; days: Date[]; logs: MatrixViewProps['logs']; span: number
}) {
  return (
    <>
      <div className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-50 border-b border-gray-200 sticky left-0"
        style={{ gridColumn: `span ${span}` }}>
        {category || 'その他'}
      </div>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} days={days} logs={logs} />
      ))}
    </>
  )
}

function TaskRow({ task, days, logs }: { task: Task; days: Date[]; logs: MatrixViewProps['logs'] }) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-white sticky left-0 z-10 min-w-0">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: task.color ?? '#E8F5E9' }} />
        <span className="text-gray-800 font-medium truncate text-sm">{task.name}</span>
      </div>
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const active = isDayActive(task, day)
        const today = isToday(day)

        if (!active) {
          return (
            <div key={`${task.id}-${dateStr}`}
              className={`flex items-center justify-center py-2 border-b border-gray-100 min-w-0 ${
                today ? 'bg-blue-50/50' : 'bg-white'
              }`}
            />
          )
        }

        if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
          const bounds = getPeriodBounds(task, day)
          if (!bounds) return null
          const checked = isCheckedInRange(logs, task.id, bounds.start, bounds.end)
          return (
            <div key={`${task.id}-${dateStr}`}
              className={`flex items-center justify-center py-2 border-b border-gray-100 min-w-0 ${
                today ? 'bg-blue-50' : 'bg-white'
              }`}>
              <input type="checkbox" checked={checked}
                onChange={async () => {
                  const existing = logs.logs.find((l) =>
                    l.task_id === task.id && l.date >= bounds.start && l.date <= bounds.end
                  )
                  if (existing) await logs.undo(existing.id)
                  else await logs.check(task.id, dateStr)
                }}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
            </div>
          )
        }

        const checked = logs.isChecked(task.id, dateStr)
        return (
          <div key={`${task.id}-${dateStr}`}
            className={`flex items-center justify-center py-2 border-b border-gray-100 min-w-0 ${
              today ? 'bg-blue-50' : 'bg-white'
            }`}>
            <input type="checkbox" checked={checked}
              onChange={async () => {
                if (checked) { const id = logs.getLogId(task.id, dateStr); if (id) await logs.undo(id) }
                else await logs.check(task.id, dateStr)
              }}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
          </div>
        )
      })}
    </>
  )
}
