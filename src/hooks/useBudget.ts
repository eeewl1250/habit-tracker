import { useState, useCallback, useMemo } from 'react'
import { format, subMonths } from 'date-fns'
import type { BudgetSettings, TargetPool, FinanceRecord } from '../types'
import { DEFAULT_BUDGET_BASES } from '../types'
import { fetchBudgetSettings, upsertBudgetSettings, fetchBudgetSettingsBatch } from '../lib/api'

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return format(d, 'yyyy-MM')
}

export function useBudget() {
  const [settings, setSettings] = useState<Record<string, BudgetSettings>>({})

  const load = useCallback(async (month: string) => {
    try {
      const prev = prevMonth(month)
      const months = [prev, month]
      const existing = await fetchBudgetSettingsBatch(months)

      const map: Record<string, BudgetSettings> = {}
      for (const s of existing) map[s.month] = s

      for (const m of months) {
        if (!map[m]) {
          const defaults: BudgetSettings = {
            month: m,
            food_base: DEFAULT_BUDGET_BASES.food,
            daily_base: DEFAULT_BUDGET_BASES.daily,
            pleasure_base: DEFAULT_BUDGET_BASES.pleasure,
            food_rollover: 0,
            daily_rollover: 0,
            pleasure_rollover: 0,
          }
          try {
            const created = await upsertBudgetSettings(defaults)
            map[m] = created
          } catch {
            map[m] = defaults
          }
        }
      }
      setSettings(map)
    } catch {
      // silent
    }
  }, [])

  const updateBase = useCallback(async (month: string, field: 'food_base' | 'daily_base' | 'pleasure_base', value: number) => {
    try {
      const updated = await upsertBudgetSettings({ month, [field]: value })
      setSettings((prev) => ({ ...prev, [month]: updated }))
    } catch {
      // silent
    }
  }, [])

  const recalculateRollover = useCallback(async (
    month: string,
    poolTotals: Record<TargetPool, number>,
  ) => {
    try {
      const cur = settings[month]
      if (!cur) return

      const monthlySpend: Record<string, number> = {
        food_pool: poolTotals.food_pool,
        daily_pool: poolTotals.daily_pool,
        pleasure_pool: poolTotals.pleasure_pool,
        growth_pool: poolTotals.growth_pool,
      }

      const foodBudget = cur.food_base + cur.food_rollover
      const dailyBudget = cur.daily_base + cur.daily_rollover
      const pleasureBudget = cur.pleasure_base + cur.pleasure_rollover

      const foodRemaining = foodBudget - monthlySpend.food_pool
      const dailyRemaining = dailyBudget - monthlySpend.daily_pool
      let pleasureRemaining = pleasureBudget - monthlySpend.pleasure_pool
      if (pleasureRemaining < 0) pleasureRemaining = 0

      const nextMonth = prevMonth(month) === month ? '' : (() => {
        const [y, m] = month.split('-').map(Number)
        const d = new Date(y, m, 1)
        return format(d, 'yyyy-MM')
      })()
      if (nextMonth) {
        const next = settings[nextMonth]
        if (next) {
          const updated = await upsertBudgetSettings({
            month: nextMonth,
            food_rollover: foodRemaining,
            daily_rollover: dailyRemaining,
            pleasure_rollover: pleasureRemaining,
          })
          setSettings((prev) => ({ ...prev, [nextMonth]: updated }))
        }
      }
    } catch {
      // silent
    }
  }, [settings])

  const getSettings = useCallback((month: string): BudgetSettings | undefined => {
    return settings[month]
  }, [settings])

  return { settings, load, updateBase, recalculateRollover, getSettings }
}
