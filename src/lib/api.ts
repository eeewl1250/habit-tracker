import { supabase } from './supabase'
import type { Task, DailyLog, TaskFormData, Category } from '../types'

// ── Tasks ──

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
      weekdays: form.period_type === 'weekday' ? JSON.stringify(form.weekdays) : null,
      base_date: form.base_date || null,
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
  if (form.base_date !== undefined) payload.base_date = form.base_date

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

// ── Daily Logs ──

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

export async function checkIn(taskId: string, date: string, memo?: string): Promise<DailyLog> {
  const { data, error } = await supabase
    .from('daily_logs')
    .insert({ task_id: taskId, date, memo: memo || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLogMemo(logId: string, memo: string): Promise<void> {
  const { error } = await supabase
    .from('daily_logs')
    .update({ memo })
    .eq('id', logId)
  if (error) throw error
}

export async function undoCheckIn(id: string): Promise<void> {
  const { error } = await supabase.from('daily_logs').delete().eq('id', id)
  if (error) throw error
}

// ── Categories ──

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error

  if (data && data.length > 0) return data

  // fallback: migrate from tasks table
  const { data: taskData, error: taskErr } = await supabase
    .from('tasks')
    .select('category')
    .neq('category', '')
    .order('category', { ascending: true })
  if (taskErr) throw taskErr
  const names = [...new Set(taskData.map((r) => r.category).filter(Boolean))]
  if (names.length === 0) return []
  const defaults: Category[] = names.map((name, i) => ({
    name,
    color: ['#E8F5E9','#E3F2FD','#FFF3E0','#F3E5F5','#E0F7FA','#FCE4EC','#F1F8E9','#FFF8E1','#E8EAF6','#FBE9E7'][i % 10],
  }))
  await supabase.from('categories').upsert(defaults.map((c) => ({ name: c.name, color: c.color })))
  return defaults
}

export async function createCategory(name: string, color: string): Promise<void> {
  const { error } = await supabase.from('categories').upsert({ name, color })
  if (error) throw error
}

export async function updateCategoryColor(name: string, color: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ color }).eq('name', name)
  if (error) throw error
}

export async function renameCategory(oldName: string, newName: string): Promise<void> {
  // update categories table
  const { error: catErr } = await supabase
    .from('categories')
    .update({ name: newName })
    .eq('name', oldName)
  if (catErr) throw catErr

  // update tasks that reference the old name
  const { error } = await supabase
    .from('tasks')
    .update({ category: newName })
    .eq('category', oldName)
  if (error) throw error
}

export async function deleteCategory(name: string): Promise<void> {
  // remove from categories table
  const { error: catErr } = await supabase.from('categories').delete().eq('name', name)
  if (catErr) throw catErr

  // unset category on tasks
  const { error } = await supabase
    .from('tasks')
    .update({ category: null })
    .eq('category', name)
  if (error) throw error
}
