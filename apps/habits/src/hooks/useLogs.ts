import { useState, useCallback, useMemo } from 'react'
import type { DailyLog } from '../types'
import { fetchLogs, checkIn, undoCheckIn } from '../lib/api'

export function useLogs() {
  const [logs, setLogs] = useState<DailyLog[]>([])

  const logIndex = useMemo(() => {
    const index = new Map<string, DailyLog>()
    for (const log of logs) {
      index.set(`${log.task_id}:${log.date}`, log)
    }
    return index
  }, [logs])

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
    return logIndex.has(`${taskId}:${date}`)
  }

  const getLogId = (taskId: string, date: string): string | undefined => {
    return logIndex.get(`${taskId}:${date}`)?.id
  }

  const getLogsForTask = (taskId: string): DailyLog[] => {
    return logs.filter((l) => l.task_id === taskId)
  }

  return { logs, load, check, undo, isChecked, getLogId, getLogsForTask }
}
