// apps/sleep/src/lib/api.ts
// sleep モジュール固有のAPI関数

import { getSupabase } from '@habit-tracker/shared/supabase'
import type { SleepLog } from '../types'

export async function fetchSleepLogs(dateFrom: string, dateTo: string): Promise<SleepLog[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function upsertSleepLog(
  date: string,
  updates: {
    bed_time?: string | null
    sleep_time?: string | null
    wake_time?: string | null
    sleep2_time?: string | null
    wake2_time?: string | null
  }
): Promise<SleepLog> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('sleep_logs')
    .upsert({ date, ...updates }, { onConflict: 'date' })
    .select()
    .single()
  if (error) throw error
  return data
}
