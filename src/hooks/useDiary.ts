import { useState, useCallback } from 'react'
import type { DiaryEntry } from '../types'
import { fetchDiaryEntries, createDiaryEntry, updateDiaryEntry } from '../lib/api'

export function useDiary() {
  const [entries, setEntries] = useState<DiaryEntry[]>([])

  const load = useCallback(async (dateFrom: string, dateTo: string) => {
    try {
      const data = await fetchDiaryEntries(dateFrom, dateTo)
      setEntries(data)
    } catch {
      // silent
    }
  }, [])

  const save = useCallback(async (date: string, originalText: string): Promise<DiaryEntry | null> => {
    try {
      const entry = await createDiaryEntry(date, originalText)
      setEntries((prev) => [...prev.filter((e) => e.date !== entry.date), entry])
      return entry
    } catch {
      return null
    }
  }, [])

  const update = useCallback(
    async (date: string, updates: { original_text?: string; corrected_text?: string | null; ai_advice?: string | null }): Promise<DiaryEntry | null> => {
      try {
        const entry = await updateDiaryEntry(date, updates)
        setEntries((prev) => prev.map((e) => (e.date === entry.date ? entry : e)))
        return entry
      } catch {
        return null
      }
    },
    [],
  )

  const getEntry = useCallback(
    (date: string): DiaryEntry | undefined => {
      return entries.find((e) => e.date === date)
    },
    [entries],
  )

  return { entries, load, save, update, getEntry }
}
