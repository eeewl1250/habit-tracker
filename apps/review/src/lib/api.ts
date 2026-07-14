import { supabase } from './supabase'
import type {
  Task, DailyLog, SleepLog, TimeLog, CravingEntry,
  MenstruationEntry, DiaryEntry, Schedule,
  TodoStatus,
} from '../types'

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchLogs(
  dateFrom: string,
  dateTo: string
): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .gte('date', dateFrom)
    .lte('date', dateTo)
  if (error) throw error
  return data ?? []
}

export async function fetchSleepLogs(
  dateFrom: string,
  dateTo: string
): Promise<SleepLog[]> {
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function fetchTimeLogs(
  dateFrom: string,
  dateTo: string
): Promise<TimeLog[]> {
  const { data, error } = await supabase
    .from('time_logs')
    .select('*')
    .gte('start_time', dateFrom)
    .lte('start_time', dateTo + 'T23:59:59Z')
    .order('start_time', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchCravingLogs(
  dateFrom: string,
  dateTo: string
): Promise<CravingEntry[]> {
  const { data, error } = await supabase
    .from('craving_logs')
    .select('*')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo + 'T23:59:59Z')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchMenstruationLogs(
  yearMonths: string[]
): Promise<MenstruationEntry[]> {
  if (yearMonths.length === 0) return []
  const { data, error } = await supabase
    .from('menstruation_logs')
    .select('*')
    .in('year_month', yearMonths)
  if (error) throw error
  return data ?? []
}

export async function fetchDiaryEntries(
  dateFrom: string,
  dateTo: string
): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('date_start', { ascending: true })
    .order('time_start', { ascending: true, nullsFirst: true })
  if (error) throw error
  return data ?? []
}

export async function fetchMonthlyTodoStats(yearMonth: string): Promise<{
  total: number; completed: number; focusMinutes: number
}> {
  const [yearStr, monthStr] = yearMonth.split('-')
  const startDate = `${yearMonth}-01`
  const endYear = parseInt(yearStr) + (parseInt(monthStr) === 12 ? 1 : 0)
  const endMonth = parseInt(monthStr) === 12 ? 1 : parseInt(monthStr) + 1
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
  const { data, error } = await supabase
    .from('todos')
    .select('status, actual_minutes')
    .gte('created_at', startDate)
    .lt('created_at', endDate)
  if (error) throw error
  const todos = data ?? []
  const total = todos.length
  const completed = todos.filter((t: { status: TodoStatus }) => t.status === 'done').length
  const focusMinutes = todos.reduce((sum: number, t: { actual_minutes: number | null }) => sum + (t.actual_minutes ?? 0), 0)
  return { total, completed, focusMinutes }
}
