import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Task } from '../types'
import { useLogs } from '../hooks/useLogs'

interface MobileViewProps {
  tasks: Task[]
  day: Date
  logs: ReturnType<typeof useLogs>
}

export function MobileView({ tasks, day, logs }: MobileViewProps) {
  const activeTasks = tasks.filter((t) => t.status === 'active')
  const dateStr = format(day, 'yyyy-MM-dd')

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-center text-gray-700 font-medium">
        {format(day, 'M月d日 (E)', { locale: ja })}
      </h2>
      {activeTasks.map((task) => {
        const checked = logs.isChecked(task.id, dateStr)

        return (
          <div
            key={task.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-800 font-medium">{task.name}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {task.category}
              </span>
            </div>
            <button
              onClick={async () => {
                if (checked) {
                  const logId = logs.getLogId(task.id, dateStr)
                  if (logId) await logs.undo(logId)
                } else {
                  await logs.check(task.id, dateStr)
                }
              }}
              className={`mt-3 w-full py-3 rounded-xl text-lg font-bold transition-colors ${
                checked
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {checked ? '✔ 完了済み' : 'タップして記録'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
