import { useState, useCallback } from 'react'
import type { DailyLog } from '../types'
import { fetchLogs, checkIn, undoCheckIn } from '../lib/api'

export function useLogs() {
  const [logs, setLogs] = useState<DailyLog[]>([])

  const load = useCallback(async (dateFrom: string, dateTo: string) => {
    try {
      const data = await fetchLogs(dateFrom, dateTo)
      setLogs(data)
    } catch (e) {
      console.error('Failed to load logs', e)
    }
  }, [])

  const check = async (taskId: string, date: string) => {
    const log = await checkIn(taskId, date)
    setLogs((prev) => [...prev, log])
    return log
  }

  const undo = async (logId: string) => {
    await undoCheckIn(logId)
    setLogs((prev) => prev.filter((l) => l.id !== logId))
  }

  const isChecked = (taskId: string, date: string): boolean => {
    return logs.some((l) => l.task_id === taskId && l.date === date)
  }

  const getLogId = (taskId: string, date: string): string | undefined => {
    return logs.find((l) => l.task_id === taskId && l.date === date)?.id
  }

  const getLogsForTask = (taskId: string): DailyLog[] => {
    return logs.filter((l) => l.task_id === taskId)
  }

  return { logs, load, check, undo, isChecked, getLogId, getLogsForTask }
}
