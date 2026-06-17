import { useMemo } from 'react'
import {
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  getWeek,
  getDay,
} from 'date-fns'
import type { Task } from '../types'
import { useLogs } from '../hooks/useLogs'

interface HeatmapViewProps {
  tasks: Task[]
  logs: ReturnType<typeof useLogs>
}

export function HeatmapView({ tasks, logs }: HeatmapViewProps) {
  const activeCount = tasks.filter((t) => t.status === 'active').length

  const yearDays = useMemo(() => {
    const now = new Date()
    const start = startOfYear(now)
    const end = endOfYear(now)
    return eachDayOfInterval({ start, end })
  }, [])

  const weeks = useMemo(() => {
    const map = new Map<string, { date: Date; count: number; day: number }[]>()
    for (const day of yearDays) {
      const weekKey = String(getWeek(day, { weekStartsOn: 0 }))
      if (!map.has(weekKey)) map.set(weekKey, [])
      const logsForDay = logs.logs.filter(
        (l) => l.date === format(day, 'yyyy-MM-dd')
      )
      map.get(weekKey)!.push({
        date: day,
        count: logsForDay.length,
        day: getDay(day),
      })
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, days]) => {
        const sorted = [...days].sort((a, b) => a.day - b.day)
        return sorted
      })
  }, [yearDays, logs.logs])

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100'
    const ratio = count / activeCount
    if (ratio < 0.25) return 'bg-green-200'
    if (ratio < 0.5) return 'bg-green-400'
    if (ratio < 0.75) return 'bg-green-500'
    return 'bg-green-700'
  }

  return (
    <div className="p-6">
      <div className="flex gap-0.5 flex-wrap">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day) => (
              <div
                key={day.date.toISOString()}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
                title={`${format(day.date, 'yyyy-MM-dd')}: ${day.count}/${activeCount}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <span>少ない</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100" />
        <div className="w-3 h-3 rounded-sm bg-green-200" />
        <div className="w-3 h-3 rounded-sm bg-green-400" />
        <div className="w-3 h-3 rounded-sm bg-green-500" />
        <div className="w-3 h-3 rounded-sm bg-green-700" />
        <span>多い</span>
      </div>
    </div>
  )
}
