// apps/category/src/lib/api.ts

import { getSupabase } from '@habit-tracker/shared/supabase'
import { CATEGORY_COLOR_PAIRS } from '@habit-tracker/shared'
import type { Category, CategoryDefinition } from '../types'

// ── Categories (simple) ──

export async function fetchCategories(): Promise<Category[]> {
  const supabase = getSupabase()
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
  const supabase = getSupabase()
  const pair = CATEGORY_COLOR_PAIRS.find((p) => p.dot === color) ?? CATEGORY_COLOR_PAIRS[0]
  const { error } = await supabase.from('categories').upsert({ name, color, bg_color: pair.bg })
  if (error) throw error
}

export async function updateCategoriesOrder(names: string[]): Promise<void> {
  const supabase = getSupabase()
  const updates = names.map((name, i) => ({ name, sort_order: i }))
  const { error } = await supabase
    .from('categories')
    .upsert(updates, { onConflict: 'name' })
  if (error) throw error
}

export async function updateCategoryColor(name: string, color: string, bg_color: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('categories').update({ color, bg_color }).eq('name', name)
  if (error) throw error
}

export async function renameCategory(oldName: string, newName: string): Promise<void> {
  const supabase = getSupabase()
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
  const supabase = getSupabase()
  const { error: catErr } = await supabase.from('categories').delete().eq('name', name)
  if (catErr) throw catErr

  const { error } = await supabase
    .from('tasks')
    .update({ category: null })
    .eq('category', name)
  if (error) throw error
}

// ── Category Definitions (unified) ──

export async function fetchCategoryDefinitions(): Promise<CategoryDefinition[]> {
  const supabase = getSupabase()
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
  const supabase = getSupabase()
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
  const supabase = getSupabase()
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
  const supabase = getSupabase()
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
    supabase.from('todos').update({ category: defaultName }).eq('category', cat.name),
    supabase.from('schedules').update({ category: defaultName }).eq('category', cat.name),
    supabase.from('time_logs').update({ category: defaultName }).eq('category', cat.name),
  ])

  const { error } = await supabase.from('category_definitions').delete().eq('id', id)
  if (error) throw error
}

export interface CategoryUsage {
  tasks: { id: string; name: string }[]
  todos: { id: string; title: string }[]
  schedules: { id: string; title: string }[]
  timeLogs: { id: string; summary: string }[]
}

export async function checkCategoryUsage(name: string): Promise<CategoryUsage> {
  const supabase = getSupabase()
  const [tasks, todos, schedules, timeLogs] = await Promise.all([
    supabase.from('tasks').select('id, name').eq('category', name),
    supabase.from('todos').select('id, title').eq('category', name),
    supabase.from('schedules').select('id, title').eq('category', name),
    supabase.from('time_logs').select('id, summary').eq('category', name),
  ])
  return {
    tasks: tasks.data ?? [],
    todos: todos.data ?? [],
    schedules: schedules.data ?? [],
    timeLogs: timeLogs.data ?? [],
  }
}

export async function seedDefaultCategories(): Promise<CategoryDefinition[]> {
  const supabase = getSupabase()
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
