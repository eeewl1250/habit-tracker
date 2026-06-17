import { useState } from 'react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Task } from '../types'
import { useLogs } from '../hooks/useLogs'

interface MobileViewProps {
  tasks: Task[]
  logs: ReturnType<typeof useLogs>
  onReloadLogs: () => void
}

export function MobileView({ tasks, logs, onReloadLogs }: MobileViewProps) {
  const [currentDay, setCurrentDay] = useState(new Date())
  const activeTasks = tasks.filter((t) => t.status === 'active')
  const dateStr = format(currentDay, 'yyyy-MM-dd')
  const completedCount = activeTasks.filter((t) =>
    logs.isChecked(t.id, dateStr)
  ).length

  const goPrev = () => {
    setCurrentDay((d) => subDays(d, 1))
  }

  const goNext = () => {
    setCurrentDay((d) => addDays(d, 1))
  }

  const goToday = () => {
    setCurrentDay(new Date())
  }

  const toggleCheck = async (taskId: string) => {
    if (logs.isChecked(taskId, dateStr)) {
      const logId = logs.getLogId(taskId, dateStr)
      if (logId) {
        await logs.undo(logId)
        onReloadLogs()
      }
    } else {
      await logs.check(taskId, dateStr)
      onReloadLogs()
    }
  }

  return (
    <div className="pb-24">
      <div className="sticky top-[57px] z-10 bg-gray-50/95 backdrop-blur border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={goPrev}
            className="px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg min-h-[44px] flex items-center justify-center"
          >
            &lt;
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={goToday}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors min-h-[36px] ${
                isToday(currentDay)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
            >
              今日
            </button>
            <span className="text-base font-medium text-gray-800 min-w-[140px] text-center">
              {format(currentDay, 'M月d日 (E)', { locale: ja })}
            </span>
          </div>

          <button
            onClick={goNext}
            className="px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg min-h-[44px] flex items-center justify-center"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="text-center text-sm text-gray-500">
          {completedCount}/{activeTasks.length} 完了
        </div>
      </div>

      <div className="px-4 space-y-3 max-w-md mx-auto">
        {activeTasks.map((task) => {
          const checked = logs.isChecked(task.id, dateStr)

          return (
            <button
              key={task.id}
              onClick={() => toggleCheck(task.id)}
              className={`w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] border-2 ${
                checked
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                      checked
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {checked && (
                      <span className="text-white text-sm font-bold">✓</span>
                    )}
                  </div>
                  <span
                    className={`text-base font-medium ${
                      checked ? 'text-blue-700' : 'text-gray-800'
                    }`}
                  >
                    {task.name}
                  </span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                  {task.category || '習慣'}
                </span>
              </div>
            </button>
          )
        })}

        {activeTasks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            タスクがありません。「+」ボタンから追加してください
          </div>
        )}
      </div>
    </div>
  )
}
