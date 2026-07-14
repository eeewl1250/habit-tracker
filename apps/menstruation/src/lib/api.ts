import { getSupabase } from '@habit-tracker/shared/supabase'
import type { MenstruationLog } from '../types'

export async function fetchMenstruationLogs(yearMonths: string[]): Promise<MenstruationLog[]> {
  if (yearMonths.length === 0) return []
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('menstruation_logs')
    .select('*')
    .in('year_month', yearMonths)
  if (error) throw error
  return data ?? []
}

export async function upsertMenstruationLog(yearMonth: string, day: number, level: number): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('menstruation_logs')
    .upsert({ year_month: yearMonth, day, level }, { onConflict: 'year_month,day' })
  if (error) throw error
}

export async function deleteMenstruationLog(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('menstruation_logs').delete().eq('id', id)
  if (error) throw error
}
