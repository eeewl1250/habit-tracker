import { supabase } from './supabase'
import type { Task, DailyLog, TaskFormData, Category, Note, NoteWithTask } from '../types'
import { CATEGORY_COLOR_PAIRS } from '../types'

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
  const defaults = names.map((name, i) => {
    const pair = CATEGORY_COLOR_PAIRS[i % CATEGORY_COLOR_PAIRS.length]
    return { name, color: pair.dot, bg_color: pair.bg }
  }) as Category[]
  await supabase.from('categories').upsert(defaults)
  return defaults
}

export async function createCategory(name: string, color: string): Promise<void> {
  const pair = CATEGORY_COLOR_PAIRS.find((p) => p.dot === color) ?? CATEGORY_COLOR_PAIRS[0]
  const { error } = await supabase.from('categories').upsert({ name, color, bg_color: pair.bg })
  if (error) throw error
}

export async function updateCategoriesOrder(names: string[]): Promise<void> {
  for (let i = 0; i < names.length; i++) {
    const { error } = await supabase
      .from('categories')
      .update({ sort_order: i })
      .eq('name', names[i])
    if (error) throw error
  }
}

export async function updateTasksOrder(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from('tasks')
      .update({ sort_order: i })
      .eq('id', ids[i])
    if (error) throw error
  }
}

export async function updateCategoryColor(name: string, color: string, bg_color: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ color, bg_color }).eq('name', name)
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

// ── Notes ──

export async function fetchNoteTaskIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('notes')
    .select('task_id')
  if (error) throw error
  return new Set((data ?? []).map((n) => n.task_id))
}

export async function fetchNotesWithTasks(): Promise<NoteWithTask[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*, tasks(name, category)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((n: any) => ({
    id: n.id,
    task_id: n.task_id,
    content: n.content,
    created_at: n.created_at,
    updated_at: n.updated_at,
    task_name: n.tasks?.name ?? '(削除済み)',
    task_category: n.tasks?.category ?? '',
  }))
}

export async function createNote(taskId: string, content: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ task_id: taskId, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateNote(id: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
  if (error) throw error
}
