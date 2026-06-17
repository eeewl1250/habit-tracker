import { useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Task, DailyLog } from '../types'

interface MatrixViewProps {
  tasks: Task[]
  days: Date[]
  logs: { logs: DailyLog[]; isChecked: (taskId: string, date: string) => boolean; getLogId: (taskId: string, date: string) => string | undefined; check: (taskId: string, date: string) => Promise<DailyLog>; undo: (logId: string) => Promise<void> }
}

const dayColors: Record<string, string> = {
  '月': 'text-gray-600',
  '火': 'text-gray-600',
  '水': 'text-gray-600',
  '木': 'text-gray-600',
  '金': 'text-gray-600',
  '土': 'text-blue-500',
  '日': 'text-red-400',
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
        <CategoryGroup
          key={category}
          category={category}
          tasks={catTasks}
          days={days}
          logs={logs}
          span={span}
        />
      ))}

      {grouped.uncategorized.length > 0 && (
        <CategoryGroup
          category=""
          tasks={grouped.uncategorized}
          days={days}
          logs={logs}
          span={span}
        />
      )}
    </div>
  )
}

function CategoryGroup({
  category,
  tasks,
  days,
  logs,
  span,
}: {
  category: string
  tasks: Task[]
  days: Date[]
  logs: MatrixViewProps['logs']
  span: number
}) {
  return (
    <>
      <div
        className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-50 border-b border-gray-200 sticky left-0"
        style={{ gridColumn: `span ${span}` }}
      >
        {category || 'その他'}
      </div>
      {tasks.map((task) => (
        <>
          <div className="flex items-center px-3 py-2 border-b border-gray-100 bg-white sticky left-0 z-10 min-w-0">
            <span className="text-gray-800 font-medium truncate text-sm">
              {task.name}
            </span>
          </div>
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const checked = logs.isChecked(task.id, dateStr)

            return (
              <div
                key={`${task.id}-${dateStr}`}
                className={`flex items-center justify-center py-2 border-b border-gray-100 min-w-0 ${
                  isToday(day) ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={async () => {
                    if (checked) {
                      const logId = logs.getLogId(task.id, dateStr)
                      if (logId) await logs.undo(logId)
                    } else {
                      await logs.check(task.id, dateStr)
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            )
          })}
        </>
      ))}
    </>
  )
}
