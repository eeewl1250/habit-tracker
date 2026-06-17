import { useMemo } from 'react'
import { format } from 'date-fns'
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
  const activeTasks = tasks.filter((t) => t.status === 'active')

  const gridCols = useMemo(() => {
    return `160px repeat(${days.length}, minmax(28px, 1fr))`
  }, [days.length])

  return (
    <div
      className="grid gap-0 text-sm"
      style={{ gridTemplateColumns: gridCols }}
    >
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={`text-center py-2 border-b border-gray-200 text-xs font-medium sticky top-0 bg-gray-50 z-10 ${dayColors[format(day, 'E', { locale: ja })] ?? 'text-gray-600'}`}
        >
          <div>{format(day, 'E', { locale: ja })}</div>
          <div className="text-sm">{format(day, 'd')}</div>
        </div>
      ))}



      {activeTasks.map((task) => (
        <>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-white sticky left-0 z-10 min-w-0">
            <span className="text-gray-800 font-medium truncate text-sm">
              {task.name}
            </span>
            {task.category && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                {task.category}
              </span>
            )}
          </div>
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const checked = logs.isChecked(task.id, dateStr)

            return (
              <div
                key={`${task.id}-${dateStr}`}
                className="flex items-center justify-center py-2 border-b border-gray-100 bg-white min-w-0"
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
    </div>
  )
}
