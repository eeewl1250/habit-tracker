import { useState, useEffect, useMemo } from 'react'
import { startOfYear, endOfYear, format, eachMonthOfInterval } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Task, DailyLog } from '../types'
import { fetchLogs } from '../lib/api'

interface StatsViewProps {
  tasks: Task[]
  categoryColor: Map<string, string>
}

const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

export function StatsView({ tasks, categoryColor }: StatsViewProps) {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const yearStart = startOfYear(now)
  const yearEnd = endOfYear(now)

  useEffect(() => {
    setLoading(true)
    fetchLogs(format(yearStart, 'yyyy-MM-dd'), format(yearEnd, 'yyyy-MM-dd'))
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const activeTasks = tasks.filter((t) => t.status === 'active')
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd })

  const monthlyData = useMemo(() => {
    return months.map((m, i) => {
      const monthStr = format(m, 'yyyy-MM')
      const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
      const monthLogs = logs.filter((l) => l.date.startsWith(monthStr))

      let totalPossible = 0
      for (const t of activeTasks) {
        if (t.period_type === 'weekday' && t.weekdays) {
          const days: string[] = JSON.parse(t.weekdays)
          const dayNums = days.map((k) => ({ sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 }[k]))
          for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(m.getFullYear(), m.getMonth(), d)
            if (dayNums.includes(date.getDay())) totalPossible++
          }
        } else {
          totalPossible += daysInMonth
        }
      }

      const completedUnique = new Set<string>()
      for (const l of monthLogs) completedUnique.add(`${l.task_id}-${l.date}`)

      return {
        name: MONTH_LABELS[i],
        rate: totalPossible > 0 ? Math.round((completedUnique.size / totalPossible) * 100) : 0,
        done: completedUnique.size,
        total: totalPossible,
      }
    })
  }, [logs, activeTasks])

  const streaks = useMemo(() => {
    const result: { taskId: string; taskName: string; color: string; current: number; longest: number }[] = []

    for (const t of activeTasks) {
      const taskLogs = logs.filter((l) => l.task_id === t.id).map((l) => l.date)
      const logSet = new Set(taskLogs)
      let currentStreak = 0
      let longestStreak = 0
      let tempStreak = 0

      const d = new Date()
      while (d >= yearStart) {
        const dateStr = format(d, 'yyyy-MM-dd')
        if (logSet.has(dateStr)) {
          tempStreak++
          if (tempStreak > longestStreak) longestStreak = tempStreak
        } else {
          if (tempStreak > 0 && currentStreak === 0) currentStreak = tempStreak
          tempStreak = 0
        }
        d.setDate(d.getDate() - 1)
      }
      if (tempStreak > 0 && currentStreak === 0) currentStreak = tempStreak
      if (currentStreak === 0 && tempStreak > 0) currentStreak = tempStreak

      const color = t.category ? (categoryColor.get(t.category) ?? '#4CAF50') : '#4CAF50'

      result.push({ taskId: t.id, taskName: t.name, color, current: currentStreak, longest: longestStreak })
    }

    return result.sort((a, b) => b.longest - a.longest)
  }, [logs, activeTasks, categoryColor])

  const totalCount = monthlyData.reduce((sum, m) => sum + m.done, 0)
  const totalPossible = monthlyData.reduce((sum, m) => sum + m.total, 0)
  const overallRate = totalPossible > 0 ? Math.round((totalCount / totalPossible) * 100) : 0

  if (loading) {
    return <div className="p-6 text-center text-gray-400">読み込み中...</div>
  }

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-3xl mx-auto">
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-4">月別完了率</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-center mb-4">
            <span className="text-2xl font-bold text-blue-600">{overallRate}%</span>
            <span className="text-sm text-gray-500 ml-2">年間総合 ({totalCount}/{totalPossible})</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                formatter={(value) => [`${value}%`, '完了率']}
              />
              <Bar dataKey="rate" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-4">連続記録</h2>
        {streaks.length === 0 ? (
          <p className="text-center text-gray-400 py-4">データがありません</p>
        ) : (
          <div className="space-y-2">
            {streaks.map((s) => (
              <div key={s.taskId}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-medium text-gray-800 truncate">{s.taskName}</span>
                </div>
                <div className="flex items-center gap-4 text-xs flex-shrink-0 ml-2">
                  <span className="text-gray-500">
                    現在: <span className="font-bold text-blue-600">{s.current}日</span>
                  </span>
                  <span className="text-gray-500">
                    最長: <span className="font-bold text-green-600">{s.longest}日</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
