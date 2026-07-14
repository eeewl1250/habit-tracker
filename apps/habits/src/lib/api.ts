import { supabase } from './supabase'
import type { Task, DailyLog, TaskFormData, Category, CategoryDefinition, Note, NoteWithTask } from '../types'
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
  const updates = names.map((name, i) => ({ name, sort_order: i }))
  const { error } = await supabase
    .from('categories')
    .upsert(updates, { onConflict: 'name' })
  if (error) throw error
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
  const { error: catErr } = await supabase
    .from('categories')
    .update({ name: newName })
    .eq('name', oldName)
  if (catErr) throw catErr

  const { error } = await supabase
    .from('tasks')
    .update({ category: newName })
    .eq('category', oldName)
  if (error) throw error
}

export async function deleteCategory(name: string): Promise<void> {
  const { error: catErr } = await supabase.from('categories').delete().eq('name', name)
  if (catErr) throw catErr

  const { error } = await supabase
    .from('tasks')
    .update({ category: null })
    .eq('category', name)
  if (error) throw error
}

// ── Unified Category Definitions ──

export async function fetchCategoryDefinitions(): Promise<CategoryDefinition[]> {
  const { data, error } = await supabase
    .from('category_definitions')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createCategoryDefinition(form: {
  name: string; color: string; bg_color: string; emoji: string
  bonus_enabled: boolean; bonus_rate: number
}): Promise<CategoryDefinition> {
  const { data, error } = await supabase
    .from('category_definitions')
    .insert({
      name: form.name,
      color: form.color,
      bg_color: form.bg_color,
      emoji: form.emoji,
      bonus_enabled: form.bonus_enabled,
      bonus_rate: form.bonus_rate,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategoryDefinition(
  id: string,
  updates: Partial<{
    name: string; color: string; bg_color: string; emoji: string
    is_default: boolean; bonus_enabled: boolean; bonus_rate: number; sort_order: number
  }>
): Promise<CategoryDefinition> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.color !== undefined) payload.color = updates.color
  if (updates.bg_color !== undefined) payload.bg_color = updates.bg_color
  if (updates.emoji !== undefined) payload.emoji = updates.emoji
  if (updates.is_default !== undefined) payload.is_default = updates.is_default
  if (updates.bonus_enabled !== undefined) payload.bonus_enabled = updates.bonus_enabled
  if (updates.bonus_rate !== undefined) payload.bonus_rate = updates.bonus_rate
  if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order

  const { data, error } = await supabase
    .from('category_definitions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategoryDefinition(id: string): Promise<void> {
  const { data: cat, error: fetchErr } = await supabase
    .from('category_definitions')
    .select('name, is_default')
    .eq('id', id)
    .single()
  if (fetchErr) throw fetchErr
  if (cat.is_default) throw new Error('デフォルトカテゴリは削除できません')

  const { data: defaultCat, error: defaultErr } = await supabase
    .from('category_definitions')
    .select('name')
    .eq('is_default', true)
    .single()
  if (defaultErr) throw defaultErr

  const defaultName = defaultCat.name

  await Promise.all([
    supabase.from('tasks').update({ category: defaultName }).eq('category', cat.name),
  ])

  const { error } = await supabase.from('category_definitions').delete().eq('id', id)
  if (error) throw error
}

export interface CategoryUsage {
  tasks: { id: string; name: string }[]
}

export async function checkCategoryUsage(name: string): Promise<CategoryUsage> {
  const [tasks] = await Promise.all([
    supabase.from('tasks').select('id, name').eq('category', name),
  ])
  return {
    tasks: tasks.data ?? [],
  }
}

export async function seedDefaultCategories(): Promise<CategoryDefinition[]> {
  const { data, error } = await supabase.from('category_definitions').select('id').limit(1)
  if (error) throw error
  if (data && data.length > 0) {
    return fetchCategoryDefinitions()
  }

  const defaults = [
    { name: '就活', color: '#EF4444', bg_color: '#FEE2E2', emoji: 'work', is_default: false, bonus_enabled: true, bonus_rate: 100, sort_order: 0 },
    { name: '学校', color: '#6B7280', bg_color: '#F3F4F6', emoji: 'school', is_default: false, bonus_enabled: false, bonus_rate: 0, sort_order: 1 },
    { name: '生活', color: '#3B82F6', bg_color: '#DBEAFE', emoji: 'home', is_default: false, bonus_enabled: false, bonus_rate: 0, sort_order: 2 },
    { name: '娯楽', color: '#F97316', bg_color: '#FFEDD5', emoji: 'celebration', is_default: false, bonus_enabled: false, bonus_rate: 0, sort_order: 3 },
    { name: '学習', color: '#8B5CF6', bg_color: '#EDE9FE', emoji: 'lightbulb', is_default: false, bonus_enabled: false, bonus_rate: 0, sort_order: 4 },
    { name: '其他', color: '#6B7280', bg_color: '#F3F4F6', emoji: 'category', is_default: true, bonus_enabled: false, bonus_rate: 0, sort_order: 999 },
  ]

  const { error: insertErr } = await supabase.from('category_definitions').insert(defaults)
  if (insertErr) throw insertErr

  return fetchCategoryDefinitions()
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

  type RawNoteWithTask = {
    id: string
    task_id: string
    content: string
    created_at: string
    updated_at: string
    tasks: { name: string; category: string } | null
  }

  return (data as RawNoteWithTask[] ?? []).map((n) => ({
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
