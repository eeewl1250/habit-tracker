import { useState, useCallback } from 'react'
import type { TimeLog, TimeCategory } from '../types'
import { fetchTimeLogs, createTimeLog, finishTimeLog, deleteTimeLog, updateTimeLog } from '../lib/api'

export function useTimeLogs() {
  const [logs, setLogs] = useState<TimeLog[]>([])

  const load = useCallback(async (from: string, to: string) => {
    try {
      const data = await fetchTimeLogs(from, to)
      setLogs(data)
    } catch {
      // silent
    }
  }, [])

  const startTimer = useCallback(async (category: TimeCategory): Promise<TimeLog | null> => {
    try {
      const now = new Date().toISOString()
      const log = await createTimeLog({
        category,
        start_time: now,
        end_time: null,
        summary: null,
        tags: null,
      })
      setLogs((prev) => [log, ...prev])
      return log
    } catch {
      return null
    }
  }, [])

  const stopTimer = useCallback(async (id: string, summary?: string): Promise<TimeLog | null> => {
    try {
      const updated = await finishTimeLog(id, new Date().toISOString(), summary)
      setLogs((prev) => prev.map((l) => (l.id === id ? updated : l)))
      return updated
    } catch {
      return null
    }
  }, [])

  const addManual = useCallback(async (
    category: TimeCategory,
    startTime: string,
    endTime: string,
    summary?: string,
  ): Promise<TimeLog | null> => {
    try {
      const log = await createTimeLog({
        category,
        start_time: startTime,
        end_time: endTime,
        summary: summary || null,
        tags: null,
      })
      setLogs((prev) => [log, ...prev])
      return log
    } catch {
      return null
    }
  }, [])

  const editSummary = useCallback(async (id: string, summary: string) => {
    try {
      const updated = await updateTimeLog(id, { summary })
      setLogs((prev) => prev.map((l) => (l.id === id ? updated : l)))
    } catch {
      // silent
    }
  }, [])

  const editTimes = useCallback(async (id: string, startTime: string, endTime: string) => {
    try {
      const updated = await updateTimeLog(id, { start_time: startTime, end_time: endTime })
      setLogs((prev) => prev.map((l) => (l.id === id ? updated : l)))
    } catch {
      // silent
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await deleteTimeLog(id)
      setLogs((prev) => prev.filter((l) => l.id !== id))
    } catch {
      // silent
    }
  }, [])

  const getActiveTimer = useCallback((): TimeLog | undefined => {
    return logs.find((l) => l.end_time === null)
  }, [logs])

  return {
    logs,
    load,
    startTimer,
    stopTimer,
    addManual,
    editSummary,
    editTimes,
    remove,
    getActiveTimer,
  }
}
