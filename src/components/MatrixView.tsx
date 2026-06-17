import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Task } from '../types'
import { useLogs } from '../hooks/useLogs'

interface MatrixViewProps {
  tasks: Task[]
  days: Date[]
  logs: ReturnType<typeof useLogs>
}

export function MatrixView({ tasks, days, logs }: MatrixViewProps) {
  const activeTasks = tasks.filter((t) => t.status === 'active')

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white text-left px-3 py-2 border-b border-gray-200 min-w-[160px]">
              タスク
            </th>
            {days.map((day) => (
              <th
                key={day.toISOString()}
                className={`px-2 py-2 text-center border-b border-gray-200 min-w-[36px] ${
                  format(day, 'E', { locale: ja }) === '土'
                    ? 'text-blue-500'
                    : format(day, 'E', { locale: ja }) === '日'
                      ? 'text-red-400'
                      : 'text-gray-600'
                }`}
              >
                <div className="text-xs">{format(day, 'E', { locale: ja })}</div>
                <div className="font-medium">{format(day, 'd')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeTasks.map((task) => (
            <tr key={task.id} className="hover:bg-gray-50">
              <td className="sticky left-0 z-10 bg-white px-3 py-2 border-b border-gray-100 text-gray-800 font-medium">
                {task.name}
              </td>
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const checked = logs.isChecked(task.id, dateStr)

                return (
                  <td
                    key={`${task.id}-${dateStr}`}
                    className="px-2 py-2 text-center border-b border-gray-100"
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
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
