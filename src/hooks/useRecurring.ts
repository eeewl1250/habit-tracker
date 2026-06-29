import { useState, useCallback, useRef } from 'react'
import type { RecurringTemplate, MonthlyRecurringRecord } from '../types'
import {
  fetchRecurringTemplates,
  createRecurringTemplate,
  updateRecurringTemplate,
  deleteRecurringTemplate,
  fetchMonthlyRecurringRecords,
  upsertMonthlyRecurringRecord,
} from '../lib/api'

export function useRecurring() {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([])
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlyRecurringRecord[]>([])
  const loadedMonth = useRef<string | null>(null)

  const loadTemplates = useCallback(async () => {
    const data = await fetchRecurringTemplates()
    setTemplates(data)
  }, [])

  const loadMonthly = useCallback(async (month: string) => {
    const data = await fetchMonthlyRecurringRecords(month)
    setMonthlyRecords(data)
    loadedMonth.current = month
  }, [])

  const ensureMonthlyRecords = useCallback(async (month: string) => {
    const existing = await fetchMonthlyRecurringRecords(month)
    if (existing.length === 0 && templates.length > 0) {
      const created: MonthlyRecurringRecord[] = []
      for (const t of templates) {
        const record = await upsertMonthlyRecurringRecord(t.id, month, t.default_amount)
        created.push(record)
      }
      setMonthlyRecords(created)
      loadedMonth.current = month
      return created
    }
    setMonthlyRecords(existing)
    loadedMonth.current = month
    return existing
  }, [templates])

  const addTemplate = useCallback(async (type: 'income' | 'expense', itemName: string, defaultAmount: number) => {
    const t = await createRecurringTemplate(type, itemName, defaultAmount)
    if (loadedMonth.current) {
      const record = await upsertMonthlyRecurringRecord(t.id, loadedMonth.current, defaultAmount)
      setMonthlyRecords((prev) => [...prev, record])
    }
    setTemplates((prev) => [...prev, t])
    return t
  }, [])

  const editTemplate = useCallback(async (id: string, updates: { item_name?: string; default_amount?: number }) => {
    const t = await updateRecurringTemplate(id, updates)
    setTemplates((prev) => prev.map((x) => (x.id === id ? t : x)))
  }, [])

  const removeTemplate = useCallback(async (id: string) => {
    await deleteRecurringTemplate(id)
    setTemplates((prev) => prev.filter((x) => x.id !== id))
    setMonthlyRecords((prev) => prev.filter((x) => x.template_id !== id))
  }, [])

  const updateMonthlyRecord = useCallback(async (id: string, amount: number) => {
    await upsertMonthlyRecurringRecord(id, loadedMonth.current!, amount)
    setMonthlyRecords((prev) => prev.map((r) => (r.template_id === id ? { ...r, amount } : r)))
  }, [])

  const totalIncome = monthlyRecords
    .filter((r) => templates.find((t) => t.id === r.template_id)?.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0)

  const totalExpense = monthlyRecords
    .filter((r) => templates.find((t) => t.id === r.template_id)?.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0)

  const netRecurring = totalIncome - totalExpense

  return {
    templates,
    monthlyRecords,
    loadTemplates,
    loadMonthly,
    ensureMonthlyRecords,
    addTemplate,
    editTemplate,
    removeTemplate,
    updateMonthlyRecord,
    totalIncome,
    totalExpense,
    netRecurring,
  }
}
