import { useState, useCallback, useEffect, useMemo } from 'react'
import { format, subDays, addDays } from 'date-fns'
import type { SleepLog } from '../types'
import { fetchSleepLogs, upsertSleepLog } from '../lib/api'

function getTodayDate(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function useSleepLogs() {
  const [logs, setLogs] = useState<SleepLog[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(async (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
    try {
      const data = await fetchSleepLogs(from, to)
      setLogs(data)
    } catch {
      // silent
    }
  }, [])

  const getLog = useCallback((date: string): SleepLog | undefined => {
    return logs.find((l) => l.date === date)
  }, [logs])

  const todayLog = useMemo(() => getLog(getTodayDate()), [getLog])

  const recordBedTime = useCallback(async () => {
    const date = getTodayDate()
    const now = new Date().toISOString()
    const existing = getLog(date)
    if (existing?.bed_time) return existing
    const updated = await upsertSleepLog(date, { bed_time: now })
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.date === date)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [...prev, updated]
    })
    return updated
  }, [getLog])

  const recordSleepTime = useCallback(async () => {
    const date = getTodayDate()
    const now = new Date().toISOString()
    const existing = getLog(date)
    if (existing?.sleep_time) return existing
    const updates: { bed_time?: string; sleep_time: string } = { sleep_time: now }
    if (!existing?.bed_time) updates.bed_time = now
    const updated = await upsertSleepLog(date, updates)
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.date === date)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [...prev, updated]
    })
    return updated
  }, [getLog])

  const recordWakeTime = useCallback(async () => {
    const date = getTodayDate()
    const now = new Date().toISOString()
    const existing = getLog(date)
    if (!existing) return null
    const updated = await upsertSleepLog(date, { wake_time: now })
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.date === date)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return prev
    })
    return updated
  }, [getLog])

  const updateTimes = useCallback(async (date: string, updates: {
    bed_time?: string | null
    sleep_time?: string | null
    wake_time?: string | null
    sleep2_time?: string | null
    wake2_time?: string | null
  }) => {
    const updated = await upsertSleepLog(date, updates)
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.date === date)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [...prev, updated]
    })
  }, [])

  return {
    logs,
    load,
    getLog,
    todayLog,
    recordBedTime,
    recordSleepTime,
    recordWakeTime,
    updateTimes,
  }
}
