import { useState, useCallback } from 'react'
import { format } from 'date-fns'
import type { BudgetSettings, TargetPool } from '../types'
import { DEFAULT_BUDGET_BASES } from '../types'
import { upsertBudgetSettings, fetchBudgetSettingsBatch } from '../lib/api'

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
      for (const s of existing) {
        map[s.month] = {
          ...s,
          entertainment_base: s.entertainment_base ?? DEFAULT_BUDGET_BASES.entertainment,
          going_out_base: s.going_out_base ?? DEFAULT_BUDGET_BASES.going_out,
          entertainment_rollover: s.entertainment_rollover ?? 0,
          going_out_rollover: s.going_out_rollover ?? 0,
        }
      }

      for (const m of months) {
        if (!map[m]) {
          const src = months.find((om) => om !== m && map[om])
          const srcSettings = src ? map[src] : null
          const defaults: BudgetSettings = {
            month: m,
            food_base: srcSettings?.food_base ?? DEFAULT_BUDGET_BASES.food,
            daily_base: srcSettings?.daily_base ?? DEFAULT_BUDGET_BASES.daily,
            entertainment_base: srcSettings?.entertainment_base ?? DEFAULT_BUDGET_BASES.entertainment,
            going_out_base: srcSettings?.going_out_base ?? DEFAULT_BUDGET_BASES.going_out,
            food_rollover: 0,
            daily_rollover: 0,
            entertainment_rollover: 0,
            going_out_rollover: 0,
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

  const updateBase = useCallback(async (month: string, field: 'food_base' | 'daily_base' | 'entertainment_base' | 'going_out_base', value: number) => {
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
    prevTimeBonus?: number,
  ) => {
    try {
      const cur = settings[month]
      if (!cur) return

      const monthlySpend: Record<string, number> = {
        food_pool: poolTotals.food_pool,
        daily_pool: poolTotals.daily_pool,
        growth_pool: poolTotals.growth_pool,
        entertainment_pool: poolTotals.entertainment_pool,
        going_out_pool: poolTotals.going_out_pool,
      }

      const foodBudget = cur.food_base + cur.food_rollover
      const dailyBudget = cur.daily_base + cur.daily_rollover
      const entertainmentBudget = cur.entertainment_base + cur.entertainment_rollover + (prevTimeBonus ?? 0)
      const goingOutBudget = cur.going_out_base + cur.going_out_rollover

      const foodRemaining = foodBudget - monthlySpend.food_pool
      const dailyRemaining = dailyBudget - monthlySpend.daily_pool
      const entertainmentRemaining = entertainmentBudget - monthlySpend.entertainment_pool
      const goingOutRemaining = goingOutBudget - monthlySpend.going_out_pool

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
            entertainment_rollover: entertainmentRemaining,
            going_out_rollover: goingOutRemaining,
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
