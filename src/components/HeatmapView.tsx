import { useState, useEffect, useMemo } from 'react'
import {
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  getWeek,
  getDay,
} from 'date-fns'
import type { Task } from '../types'
import { WEEKDAY_MAP } from '../types'
import { fetchLogs } from '../lib/api'

interface HeatmapViewProps {
  tasks: Task[]
  categoryColor: Map<string, string>
}

const dayOrder = [1, 2, 3, 4, 5, 6, 0]

function getBaseDate(task: Task): Date {
  return task.base_date ? new Date(task.base_date + 'T00:00:00') : new Date(task.created_at)
}

function isDayActiveForTask(task: Task, date: Date): boolean {
  if (task.period_type === 'weekday' && task.weekdays) {
    const days: string[] = JSON.parse(task.weekdays)
    return days.some((k) => WEEKDAY_MAP[k] === date.getDay())
  }
  if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
    const base = getBaseDate(task)
    const diff = Math.round((date.getTime() - base.getTime()) / 86400000)
    return diff >= 0 && diff % task.frequency === 0
  }
  return true
}

function getTaskColor(task: Task, categoryColor: Map<string, string>): string {
  if (task.category) return categoryColor.get(task.category) ?? '#4CAF50'
  return '#4CAF50'
}

export function HeatmapView({ tasks, categoryColor }: HeatmapViewProps) {
  const activeTasks = tasks.filter((t) => t.status === 'active')
  const [yearLogs, setYearLogs] = useState<Record<string, Set<string>>>({})

  useEffect(() => {
    const now = new Date()
    const from = format(startOfYear(now), 'yyyy-MM-dd')
    const to = format(endOfYear(now), 'yyyy-MM-dd')
    fetchLogs(from, to).then((logs) => {
      const map: Record<string, Set<string>> = {}
      for (const l of logs) {
        if (!map[l.task_id]) map[l.task_id] = new Set()
        map[l.task_id].add(l.date)
      }
      setYearLogs(map)
    })
  }, [])

  const yearDays = useMemo(() => {
    const now = new Date()
    const start = startOfYear(now)
    const end = endOfYear(now)
    return eachDayOfInterval({ start, end })
  }, [])

  const weeks = useMemo(() => {
    const map = new Map<string, { date: Date; day: number }[]>()
    for (const day of yearDays) {
      const weekKey = String(getWeek(day, { weekStartsOn: 1 }))
      if (!map.has(weekKey)) map.set(weekKey, [])
      map.get(weekKey)!.push({ date: day, day: getDay(day) })
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, days]) =>
        [...days].sort(
          (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
        )
      )
  }, [yearDays])

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
    return {
      grouped: [...map.entries()].sort(([a], [b]) => a.localeCompare(b)),
      uncategorized,
    }
  }, [activeTasks])

  const calcStats = (task: Task, doneDates: Set<string>) => {
    const completed = doneDates.size
    let total = 0

    if (task.period_type === 'weekday' && task.weekdays) {
      const days: string[] = JSON.parse(task.weekdays)
      total = yearDays.filter((d) => days.some((k) => WEEKDAY_MAP[k] === d.getDay())).length
    } else if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
      total = yearDays.filter((d) => isDayActiveForTask(task, d)).length
    } else {
      total = yearDays.length
    }

    return { completed, total }
  }

  if (activeTasks.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        アクティブなタスクがありません
      </div>
    )
  }

  const renderTask = (task: Task) => {
    const doneDates = yearLogs[task.id] ?? new Set()
    const color = getTaskColor(task, categoryColor)
    const stats = calcStats(task, doneDates)

    return (
      <div key={task.id}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[80px]">
            {task.name}
          </span>
          <span className="text-xs text-gray-400">
            {stats.completed}回/{stats.total}日
          </span>
        </div>
        <div className="flex gap-0.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map(({ date }) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const done = doneDates.has(dateStr)
                return (
                  <div
                    key={dateStr}
                    className={`w-[10px] h-[10px] rounded-sm ${
                      done ? '' : 'bg-gray-100'
                    }`}
                    style={done ? { backgroundColor: color } : {}}
                    title={`${dateStr}: ${done ? '✓' : '✗'}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-8 overflow-x-auto">
      {grouped.grouped.map(([category, catTasks]) => {
        return (
          <section key={category}>
            <h3 className="text-sm font-bold mb-3" style={{ color: categoryColor.get(category) ?? '#4CAF50' }}>
              {category}
            </h3>
            <div className="space-y-5">
              {catTasks.map(renderTask)}
            </div>
          </section>
        )
      })}
      {grouped.uncategorized.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-500 mb-3">その他</h3>
          <div className="space-y-5">{grouped.uncategorized.map(renderTask)}</div>
        </section>
      )}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>未完了</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100" />
        <div className="w-3 h-3 rounded-sm bg-green-500" />
        <span>完了</span>
      </div>
    </div>
  )
}
