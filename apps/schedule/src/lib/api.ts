import { getSupabase } from '@habit-tracker/shared/supabase'
import type { Schedule, ScheduleFormData, CategoryDefinition } from '../types'

export async function fetchSchedules(): Promise<Schedule[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('date_start', { ascending: true })
    .order('time_start', { ascending: true, nullsFirst: true })
  if (error) throw error
  return data ?? []
}

export async function createSchedule(form: ScheduleFormData): Promise<Schedule> {
  const supabase = getSupabase()
  const payload: Record<string, unknown> = {
    title: form.title,
    category: form.category,
    date_start: form.date_start,
    time_start: form.time_start || null,
    time_end: form.time_end || null,
    url: form.url || null,
    memo: form.memo || null,
    is_recurring: form.is_recurring,
  }
  if (form.is_recurring) {
    payload.rec_unit = form.rec_unit
    payload.rec_interval = form.rec_interval
    payload.rec_days = form.rec_days.length > 0 ? JSON.stringify(form.rec_days) : null
    payload.rec_end_date = form.rec_end_date || null
  }
  const { data, error } = await supabase
    .from('schedules')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSchedule(id: string, form: Partial<ScheduleFormData>): Promise<Schedule> {
  const supabase = getSupabase()
  const payload: Record<string, unknown> = {}
  if (form.title !== undefined) payload.title = form.title
  if (form.category !== undefined) payload.category = form.category
  if (form.date_start !== undefined) payload.date_start = form.date_start
  if (form.time_start !== undefined) payload.time_start = form.time_start || null
  if (form.time_end !== undefined) payload.time_end = form.time_end || null
  if (form.url !== undefined) payload.url = form.url || null
  if (form.memo !== undefined) payload.memo = form.memo || null
  if (form.excluded_dates !== undefined) payload.excluded_dates = form.excluded_dates
  if (form.is_recurring !== undefined) {
    payload.is_recurring = form.is_recurring
    if (form.is_recurring) {
      payload.rec_unit = form.rec_unit
      payload.rec_interval = form.rec_interval
      payload.rec_days = (form.rec_days?.length ?? 0) > 0 ? JSON.stringify(form.rec_days) : null
      payload.rec_end_date = form.rec_end_date || null
    } else {
      payload.rec_unit = null
      payload.rec_interval = null
      payload.rec_days = null
      payload.rec_end_date = null
    }
  }
  const { data, error } = await supabase
    .from('schedules')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSchedule(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Category Definitions ──

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
