import { supabase } from './supabase'
import type { Task, DailyLog, TaskFormData } from '../types'

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createTask(form: TaskFormData): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      name: form.name,
      category: form.category,
      status: form.status,
      period_type: form.period_type,
      frequency: form.period_type === 'frequency' ? form.frequency : null,
      weekdays:
        form.period_type === 'weekday'
          ? JSON.stringify(form.weekdays)
          : null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(
  id: string,
  form: Partial<TaskFormData>
): Promise<Task> {
  const payload: Record<string, unknown> = {}
  if (form.name !== undefined) payload.name = form.name
  if (form.category !== undefined) payload.category = form.category
  if (form.status !== undefined) payload.status = form.status
  if (form.period_type !== undefined) {
    payload.period_type = form.period_type
    if (form.period_type === 'frequency') {
      payload.weekdays = null
      payload.frequency = form.frequency
    } else {
      payload.frequency = null
      payload.weekdays = JSON.stringify(form.weekdays)
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
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

export async function checkIn(taskId: string, date: string): Promise<DailyLog> {
  const { data, error } = await supabase
    .from('daily_logs')
    .insert({ task_id: taskId, date })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('category')
    .neq('category', '')
    .order('category', { ascending: true })
  if (error) throw error
  return [...new Set(data.map((r) => r.category).filter(Boolean))]
}

export async function undoCheckIn(id: string): Promise<void> {
  const { error } = await supabase.from('daily_logs').delete().eq('id', id)
  if (error) throw error
}
