// apps/craving/src/hooks/useCravingLogs.ts

import { useState, useCallback } from 'react'
import { fetchCravingLogs, createCravingLog, updateCravingLog } from '../lib/api'
import type { CravingLog } from '../types'

export function useCravingLogs() {
  const [logs, setLogs] = useState<CravingLog[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (dateFrom: string, dateTo: string) => {
    setLoading(true)
    try {
      const data = await fetchCravingLogs(dateFrom, dateTo)
      setLogs(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  const add = useCallback(async (result: 'resisted' | 'failed', mood?: string[]) => {
    const log = await createCravingLog(result, mood)
    setLogs((prev) => [log, ...prev])
    return log
  }, [])

  const update = useCallback(async (id: string, mood?: string[]) => {
    const log = await updateCravingLog(id, mood)
    setLogs((prev) => prev.map((l) => (l.id === id ? log : l)))
    return log
  }, [])

  return { logs, loading, load, add, update }
}
