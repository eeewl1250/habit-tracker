import { useState, useCallback } from 'react'
import type { FinanceRecord, FinanceFormData } from '../types'
import { fetchFinanceRecords, createFinanceRecord, deleteFinanceRecord, updateFinanceRecord } from '../lib/api'

export function useFinance() {
  const [records, setRecords] = useState<FinanceRecord[]>([])

  const load = useCallback(async (from: string, to: string) => {
    try {
      const data = await fetchFinanceRecords(from, to)
      setRecords(data)
    } catch {
      // silent
    }
  }, [])

  const add = useCallback(async (form: FinanceFormData): Promise<FinanceRecord | null> => {
    try {
      const record = await createFinanceRecord(form)
      setRecords((prev) => [record, ...prev])
      return record
    } catch {
      return null
    }
  }, [])

  const update = useCallback(async (id: string, updates: Partial<FinanceFormData>): Promise<FinanceRecord | null> => {
    try {
      const record = await updateFinanceRecord(id, updates)
      setRecords((prev) => prev.map((r) => (r.id === id ? record : r)))
      return record
    } catch {
      return null
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await deleteFinanceRecord(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
    } catch {
      // silent
    }
  }, [])

  return { records, load, add, update, remove }
}
