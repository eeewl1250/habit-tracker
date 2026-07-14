// apps/craving/src/lib/api.ts
// craving モジュール固有のAPI関数

import { getSupabase } from '@habit-tracker/shared/supabase'
import type { CravingLog } from '../types'

export async function fetchCravingLogs(dateFrom: string, dateTo: string): Promise<CravingLog[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('craving_logs')
    .select('*')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo + 'T23:59:59Z')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createCravingLog(result: 'resisted' | 'failed', mood?: string[]): Promise<CravingLog> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('craving_logs')
    .insert({ result, mood: mood || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCravingLog(id: string, mood?: string[]): Promise<CravingLog> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('craving_logs')
    .update({ mood: mood || null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
