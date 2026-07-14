import {
  fetchTasks, fetchLogs, fetchSleepLogs, fetchTimeLogs,
  fetchCravingLogs, fetchMenstruationLogs, fetchDiaryEntries,
  fetchSchedules, fetchMonthlyTodoStats,
} from './api'
import type { Task, DailyLog, CravingEntry } from '../types'
import { format, startOfMonth, endOfMonth, getDaysInMonth, parseISO, differenceInMinutes, differenceInCalendarDays, eachDayOfInterval } from 'date-fns'

export interface HouseholdStat {
  taskName: string
  displayName: string
  count: number
  avgInterval: string
}

export interface TimelineEvent {
  date: string
  time?: string
  title: string
  category: string
  type: 'schedule' | 'diary' | 'focus' | 'habit'
}

export interface MonthlyBundle {
  month: string
  daysInMonth: number
  habitsByCategory: Record<string, { done: number; total: number; rate: number }>
  sleepAvgHours: number
  sleepRecordCount: number
  focusTotalHours: number
  focusJobHours: number
  focusGrowthHours: number
  appetite: { resisted: number; failed: number; rate: number }
  menstruationDays: { date: string; level: number }[]
  householdStats: HouseholdStat[]
  timeline: TimelineEvent[]
  diaryCount: number
  scheduleCount: number
  keyEvents: { date: string; title: string; category: string }[]
  todoStats: { total: number; completed: number; focusMinutes: number }
}

const HOUSEHOLD_KEYWORDS: Record<string, string[]> = {
  '床单清洗': ['シーツ', '床单', 'ベッドシーツ', '布団カバー'],
  '洗濯': ['洗濯', '洗衣', 'laundry', '洗衣服'],
  '部屋掃除': ['掃除', '打扫', '部屋を掃除', 'clean'],
  '料理': ['料理', '做饭', '自炊', 'クッキング'],
  '風呂掃除': ['風呂掃除', '浴室', 'バスルーム'],
  'トイレ掃除': ['トイレ', '便所'],
  '買い出し': ['買い物', '買い出し', '食材', 'groceries'],
}

function detectHouseholdTask(taskName: string): string | null {
  const lower = taskName.toLowerCase()
  for (const [display, keywords] of Object.entries(HOUSEHOLD_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return display
    }
  }
  return null
}

function formatAvgInterval(monthDays: number, count: number): string {
  if (count === 0) return '未実施'
  const interval = monthDays / count
  if (interval < 1) return `毎日`
  if (interval < 2) return `ほぼ毎日`
  return `平均 ${Math.round(interval)} 日に1回`
}

export async function bundleMonthlyData(yearMonth: string): Promise<MonthlyBundle> {
  const [yearStr, monthStr] = yearMonth.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)
  const baseDate = new Date(year, month - 1, 1)
  const dateStart = format(startOfMonth(baseDate), 'yyyy-MM-dd')
  const dateEnd = format(endOfMonth(baseDate), 'yyyy-MM-dd')
  const daysInMonth = getDaysInMonth(baseDate)
  const allDates = eachDayOfInterval({ start: startOfMonth(baseDate), end: endOfMonth(baseDate) }).map(d => format(d, 'yyyy-MM-dd'))

  const [tasks, dailyLogs, sleepLogs, timeLogs, cravingLogs, menstruationLogs, diaryEntries, schedules, todoStats] = await Promise.all([
    fetchTasks(),
    fetchLogs(dateStart, dateEnd),
    fetchSleepLogs(dateStart, dateEnd),
    fetchTimeLogs(dateStart, dateEnd),
    fetchCravingLogs(dateStart, dateEnd),
    fetchMenstruationLogs([yearMonth]),
    fetchDiaryEntries(dateStart, dateEnd),
    fetchSchedules(),
    fetchMonthlyTodoStats(yearMonth),
  ])

  const activeTasks = tasks.filter(t => t.status === 'active')
  const taskMap = new Map<string, Task>()
  for (const t of activeTasks) taskMap.set(t.id, t)

  const logMap = new Map<string, DailyLog[]>()
  for (const log of dailyLogs) {
    const arr = logMap.get(log.date) ?? []
    arr.push(log)
    logMap.set(log.date, arr)
  }

  const catMap = new Map<string, string>()
  for (const t of activeTasks) {
    const cat = t.category || '未分類'
    if (!catMap.has(cat)) catMap.set(cat, cat)
  }
  const categories = [...catMap.keys()]

  const habitsByCategory: Record<string, { done: number; total: number; rate: number }> = {}
  for (const cat of categories) {
    const catTasks = activeTasks.filter(t => (t.category || '未分類') === cat)
    let done = 0
    let total = 0
    for (const date of allDates) {
      for (const task of catTasks) {
        const dayOfWeek = new Date(date + 'T00:00:00').getDay()
        const isWeekdayMatch = task.period_type === 'weekday' && task.weekdays
          ? (() => {
              try {
                const wds = JSON.parse(task.weekdays) as string[]
                const wdMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
                return wds.includes(wdMap[dayOfWeek])
              } catch { return false }
            })()
          : true
        const isFrequencyMatch = task.period_type === 'frequency' && task.frequency
          ? (() => {
              if (!task.base_date) return true
              const diff = differenceInCalendarDays(new Date(date + 'T00:00:00'), parseISO(task.base_date))
              return diff >= 0 && diff % task.frequency! === 0
            })()
          : true
        if (task.period_type === 'weekday' && !isWeekdayMatch) continue
        if (task.period_type === 'frequency' && !isFrequencyMatch) continue
        total++
        const logsForDate = logMap.get(date) ?? []
        if (logsForDate.some(l => l.task_id === task.id)) done++
      }
    }
    habitsByCategory[cat] = { done, total, rate: total > 0 ? Math.round((done / total) * 100) : 0 }
  }

  let sleepTotalMinutes = 0
  let sleepRecords = 0
  for (const sl of sleepLogs) {
    if (sl.sleep_time && sl.wake_time) {
      const sleep = parseISO(`1970-01-01T${sl.sleep_time.slice(11, 19)}`)
      let wake = parseISO(`1970-01-01T${sl.wake_time.slice(11, 19)}`)
      if (wake <= sleep) wake = new Date(wake.getTime() + 86400000)
      const mins = differenceInMinutes(wake, sleep)
      sleepTotalMinutes += mins
      sleepRecords++
    }
    if (sl.sleep2_time && sl.wake2_time) {
      const s2 = parseISO(`1970-01-01T${sl.sleep2_time.slice(11, 19)}`)
      let w2 = parseISO(`1970-01-01T${sl.wake2_time.slice(11, 19)}`)
      if (w2 <= s2) w2 = new Date(w2.getTime() + 86400000)
      const mins = differenceInMinutes(w2, s2)
      sleepTotalMinutes += mins
      sleepRecords++
    }
  }
  const sleepAvgHours = sleepRecords > 0 ? parseFloat((sleepTotalMinutes / sleepRecords / 60).toFixed(1)) : 0

  let focusTotal = 0
  let focusJob = 0
  let focusGrowth = 0
  for (const tl of timeLogs) {
    if (tl.duration) {
      const hours = tl.duration / 60
      focusTotal += hours
      if (tl.category === 'job_hunting') focusJob += hours
      else if (tl.category === 'self_growth') focusGrowth += hours
    }
  }
  const focusTotalHours = parseFloat(focusTotal.toFixed(1))
  const focusJobHours = parseFloat(focusJob.toFixed(1))
  const focusGrowthHours = parseFloat(focusGrowth.toFixed(1))

  let resisted = 0
  let failed = 0
  const dailyCraving = new Map<string, CravingEntry[]>()
  for (const cl of cravingLogs) {
    const day = cl.created_at.slice(0, 10)
    const arr = dailyCraving.get(day) ?? []
    arr.push(cl)
    dailyCraving.set(day, arr)
  }
  for (const [, logs] of dailyCraving) {
    const last = logs[0]
    if (last.result === 'resisted') resisted++
    else failed++
  }

  const allMenstruationLogs = menstruationLogs.filter(ml => ml.year_month === yearMonth)
  const menstruationDays = allMenstruationLogs
    .map(ml => ({ date: `${yearMonth}-${String(ml.day).padStart(2, '0')}`, level: ml.level }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const householdTaskCounts = new Map<string, { count: number; taskName: string }>()
  for (const task of activeTasks) {
    const display = detectHouseholdTask(task.name)
    if (display) {
      const existing = householdTaskCounts.get(display) ?? { count: 0, taskName: task.name }
      for (const date of allDates) {
        const logsForDate = logMap.get(date) ?? []
        if (logsForDate.some(l => l.task_id === task.id)) existing.count++
      }
      householdTaskCounts.set(display, existing)
    }
  }
  const householdStats: HouseholdStat[] = []
  for (const [display, info] of householdTaskCounts) {
    householdStats.push({
      displayName: display,
      taskName: info.taskName,
      count: info.count,
      avgInterval: formatAvgInterval(daysInMonth, info.count),
    })
  }

  const timeline: TimelineEvent[] = []
  const keyEvents: { date: string; title: string; category: string }[] = []

  const monthSchedules = schedules.filter(s => {
    const d = s.date_start
    return d >= dateStart && d <= dateEnd
  })
  for (const s of monthSchedules) {
    timeline.push({
      date: s.date_start,
      time: s.time_start ?? undefined,
      title: s.title,
      category: s.category,
      type: 'schedule',
    })
    keyEvents.push({ date: s.date_start, title: s.title, category: s.category })
  }

  for (const de of diaryEntries) {
    const footprintMatch = de.original_text.match(/## 📌 今日足迹（今日やったこと）\n(.+)/)
    if (footprintMatch) {
      const lines = footprintMatch[1].split('\n').filter(l => l.trim())
      for (const line of lines) {
        timeline.push({ date: de.date, title: line.trim(), category: 'diary', type: 'diary' })
      }
    }
  }

  for (const tl of timeLogs) {
    if (tl.summary) {
      timeline.push({
        date: tl.start_time.slice(0, 10),
        time: tl.start_time.slice(11, 16),
        title: `⏱ ${tl.summary}`,
        category: tl.category === 'job_hunting' ? 'job' : 'study',
        type: 'focus',
      })
    }
  }

  timeline.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.time && b.time) return a.time.localeCompare(b.time)
    return 0
  })

  return {
    month: yearMonth,
    daysInMonth,
    habitsByCategory,
    sleepAvgHours,
    sleepRecordCount: sleepRecords,
    focusTotalHours,
    focusJobHours,
    focusGrowthHours,
    appetite: {
      resisted,
      failed,
      rate: (resisted + failed) > 0 ? Math.round((resisted / (resisted + failed)) * 100) : 0,
    },
    menstruationDays,
    householdStats,
    timeline,
    diaryCount: diaryEntries.length,
    scheduleCount: monthSchedules.length,
    keyEvents,
    todoStats,
  }
}
