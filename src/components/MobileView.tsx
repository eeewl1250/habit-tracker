import { useState, useMemo } from 'react'
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
    const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    return { grouped: sorted, uncategorized }
  }, [activeTasks])

  const totalDone = activeTasks.filter((t) =>
    logs.isChecked(t.id, dateStr)
  ).length

  const goPrev = () => setCurrentDay((d) => subDays(d, 1))
  const goNext = () => setCurrentDay((d) => addDays(d, 1))
  const goToday = () => setCurrentDay(new Date())

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
    <div className="pb-28">
      <div className="sticky top-[57px] z-10 bg-gray-50/95 backdrop-blur border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <button
            onClick={goPrev}
            className="px-4 py-2 text-gray-600 active:bg-gray-200 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center text-lg"
          >
            ‹
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className={`text-sm px-4 py-2 rounded-full border transition-colors min-h-[40px] ${
                isToday(currentDay)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-gray-600 border-gray-300 active:bg-gray-100'
              }`}
            >
              今日
            </button>
            <span className="text-base font-semibold text-gray-800 min-w-[140px] text-center">
              {format(currentDay, 'M月d日 (E)', { locale: ja })}
            </span>
          </div>

          <button
            onClick={goNext}
            className="px-4 py-2 text-gray-600 active:bg-gray-200 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center text-lg"
          >
            ›
          </button>
        </div>

        <div className="px-4 pb-3 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{
                  width: `${activeTasks.length > 0 ? (totalDone / activeTasks.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
              {totalDone}/{activeTasks.length}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6 max-w-lg mx-auto">
        {grouped.grouped.map(([category, catTasks]) => (
          <CategorySection
            key={category}
            category={category}
            tasks={catTasks}
            dateStr={dateStr}
            logs={logs}
            toggleCheck={toggleCheck}
          />
        ))}

        {grouped.uncategorized.length > 0 && (
          <CategorySection
            category=""
            tasks={grouped.uncategorized}
            dateStr={dateStr}
            logs={logs}
            toggleCheck={toggleCheck}
          />
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

function CategorySection({
  category,
  tasks,
  dateStr,
  logs,
  toggleCheck,
}: {
  category: string
  tasks: Task[]
  dateStr: string
  logs: ReturnType<typeof useLogs>
  toggleCheck: (taskId: string) => Promise<void>
}) {
  const done = tasks.filter((t) => logs.isChecked(t.id, dateStr)).length

  return (
    <section>
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-bold text-gray-500 tracking-wide">
          {category || 'その他'}
        </h3>
        <span className="text-xs text-gray-400">
          {done}/{tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => {
          const checked = logs.isChecked(task.id, dateStr)

          return (
            <button
              key={task.id}
              onClick={() => toggleCheck(task.id)}
              className={`w-full text-left rounded-2xl px-4 py-3.5 transition-all active:scale-[0.97] border-2 ${
                checked
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 bg-white shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
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
                  className={`text-[15px] font-medium leading-tight ${
                    checked ? 'text-blue-700 line-through decoration-2' : 'text-gray-800'
                  }`}
                >
                  {task.name}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
