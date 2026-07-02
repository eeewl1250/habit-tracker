import { useState, useEffect, useCallback } from 'react'
import type { Schedule, ScheduleFormData } from '../types'
import { fetchSchedules, createSchedule, updateSchedule, deleteSchedule } from '../lib/api'

interface RecurringInstance {
  id: string
  title: string
  category: Schedule['category']
  date: string
  time_start: string | null
  time_end: string | null
  url: string | null
  memo: string | null
  is_recurring: boolean
  original_id: string
}

function expandRecurring(schedule: Schedule): RecurringInstance[] {
  const excludedDates: string[] = JSON.parse(schedule.excluded_dates || '[]')

  if (!schedule.is_recurring) {
    if (excludedDates.includes(schedule.date_start)) return []
    return [{
      id: schedule.id,
      title: schedule.title,
      category: schedule.category,
      date: schedule.date_start,
      time_start: schedule.time_start,
      time_end: schedule.time_end,
      url: schedule.url,
      memo: schedule.memo,
      is_recurring: false,
      original_id: schedule.id,
    }]
  }

  const unit = schedule.rec_unit
  const interval = schedule.rec_interval ?? 1
  const recDays: string[] = schedule.rec_days ? JSON.parse(schedule.rec_days) : []
  const endDate = schedule.rec_end_date ?? '2099-12-31'
  const start = new Date(schedule.date_start + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  const instances: RecurringInstance[] = []
  const current = new Date(start)

  while (current <= end) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`

    if (!excludedDates.includes(dateStr)) {
      let matches = true

      if (unit === 'month') {
        if (current.getDate() !== start.getDate()) matches = false
      } else if (unit === 'week') {
        if (recDays.length > 0) {
          const dayOfWeek = ((current.getDay() + 6) % 7).toString()
          if (!recDays.includes(dayOfWeek)) matches = false
          const weekDiff = Math.floor((current.getTime() - start.getTime()) / (7 * 86400000))
          if (weekDiff % interval !== 0) matches = false
        }
      } else if (unit === 'year') {
        if (current.getMonth() !== start.getMonth() || current.getDate() !== start.getDate()) matches = false
      }

      if (matches) {
        instances.push({
          id: `${schedule.id}_${dateStr}`,
          title: schedule.title,
          category: schedule.category,
          date: dateStr,
          time_start: schedule.time_start,
          time_end: schedule.time_end,
          url: schedule.url,
          memo: schedule.memo,
          is_recurring: true,
          original_id: schedule.id,
        })
      }
    }

    if (unit === 'day') current.setDate(current.getDate() + interval)
    else if (unit === 'week' && recDays.length > 0) current.setDate(current.getDate() + 1)
    else if (unit === 'week') current.setDate(current.getDate() + 7 * interval)
    else if (unit === 'month') current.setMonth(current.getMonth() + interval)
    else if (unit === 'year') current.setFullYear(current.getFullYear() + interval)
  }

  return instances
}

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchSchedules()
      setSchedules(data)
    } catch (e) {
      console.error('Failed to load schedules', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = useCallback(async (form: ScheduleFormData) => {
    const created = await createSchedule(form)
    setSchedules((prev) => [...prev, created])
    return created
  }, [])

  const edit = useCallback(async (id: string, form: Partial<ScheduleFormData>) => {
    const updated = await updateSchedule(id, form)
    setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)))
    return updated
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteSchedule(id)
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const excludeDate = useCallback(async (id: string, date: string) => {
    const s = schedules.find((s) => s.id === id)
    if (!s) return
    const excluded: string[] = JSON.parse(s.excluded_dates || '[]')
    if (excluded.includes(date)) return
    excluded.push(date)
    const updated = await updateSchedule(id, { excluded_dates: JSON.stringify(excluded) })
    setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }, [schedules])

  function getInstances(dateStart: string, dateEnd: string): RecurringInstance[] {
    const start = new Date(dateStart + 'T00:00:00')
    const end = new Date(dateEnd + 'T23:59:59')
    return schedules.flatMap((s) => expandRecurring(s)).filter((inst) => {
      const d = new Date(inst.date + 'T00:00:00')
      return d >= start && d <= end
    })
  }

  return { schedules, loading, load, add, edit, remove, excludeDate, getInstances }
}
