import { useState, useEffect, useMemo } from 'react'
import {
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  getWeek,
  getDay,
  subYears,
} from 'date-fns'
import type { Task } from '../types'
import { fetchLogs } from '../lib/api'

interface HeatmapViewProps {
  tasks: Task[]
}

const dayOrder = [1, 2, 3, 4, 5, 6, 0]


export function HeatmapView({ tasks }: HeatmapViewProps) {
  const activeTasks = tasks.filter((t) => t.status === 'active')
  const [yearLogs, setYearLogs] = useState<Record<string, Set<string>>>({})

  useEffect(() => {
    const now = new Date()
    const from = format(subYears(now, 1), 'yyyy-MM-dd')
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

  if (activeTasks.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        アクティブなタスクがありません
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-x-auto">
      {activeTasks.map((task) => {
        const doneDates = yearLogs[task.id] ?? new Set()

        return (
          <div key={task.id}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[100px]">
                {task.name}
              </span>
              <span className="text-xs text-gray-400">
                {doneDates.size}日
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
                          done ? 'bg-green-500' : 'bg-gray-100'
                        }`}
                        title={`${dateStr}: ${done ? '✓' : '✗'}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>未完了</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100" />
        <div className="w-3 h-3 rounded-sm bg-green-500" />
        <span>完了</span>
      </div>
    </div>
  )
}
