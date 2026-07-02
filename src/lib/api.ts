import { supabase } from './supabase'
import type { Task, DailyLog, TaskFormData, Category, Note, NoteWithTask, MenstruationLog, CravingLog, SleepLog, TimeLog, TimeLogFormData, FinanceRecord, FinanceFormData, BudgetSettings, RecurringTemplate, MonthlyRecurringRecord, DiaryEntry, BaseCategory, Motivation, Schedule, ScheduleFormData } from '../types'
import { CATEGORY_COLOR_PAIRS, resolveTargetPool } from '../types'

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
  // Update sort_order for each task by id (use individual UPDATEs to avoid accidental inserts)
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

// ── Menstruation Logs ──

export async function fetchMenstruationLogs(yearMonths: string[]): Promise<MenstruationLog[]> {
  if (yearMonths.length === 0) return []
  const { data, error } = await supabase
    .from('menstruation_logs')
    .select('*')
    .in('year_month', yearMonths)
  if (error) throw error
  return data ?? []
}

export async function upsertMenstruationLog(yearMonth: string, day: number, level: number): Promise<void> {
  const { error } = await supabase
    .from('menstruation_logs')
    .upsert({ year_month: yearMonth, day, level }, { onConflict: 'year_month,day' })
  if (error) throw error
}

export async function deleteMenstruationLog(id: string): Promise<void> {
  const { error } = await supabase.from('menstruation_logs').delete().eq('id', id)
  if (error) throw error
}

// ── Craving Logs ──

export async function fetchCravingLogs(dateFrom: string, dateTo: string): Promise<CravingLog[]> {
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
  const { data, error } = await supabase
    .from('craving_logs')
    .insert({ result, mood: mood || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCravingLog(id: string, mood?: string[]): Promise<CravingLog> {
  const { data, error } = await supabase
    .from('craving_logs')
    .update({ mood: mood || null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Sleep Logs ──

export async function fetchSleepLogs(dateFrom: string, dateTo: string): Promise<SleepLog[]> {
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
  const { data, error } = await supabase
    .from('sleep_logs')
    .upsert({ date, ...updates }, { onConflict: 'date' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Time Logs ──

export async function fetchTimeLogs(dateFrom: string, dateTo: string): Promise<TimeLog[]> {
  const { data, error } = await supabase
    .from('time_logs')
    .select('*')
    .gte('start_time', dateFrom)
    .lte('start_time', dateTo + 'T23:59:59Z')
    .order('start_time', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createTimeLog(form: TimeLogFormData): Promise<TimeLog> {
  const duration = form.start_time && form.end_time
    ? Math.round((new Date(form.end_time).getTime() - new Date(form.start_time).getTime()) / 60000)
    : null
  const { data, error } = await supabase
    .from('time_logs')
    .insert({
      category: form.category,
      start_time: form.start_time,
      end_time: form.end_time,
      duration,
      summary: form.summary || null,
      tags: form.tags || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTimeLog(
  id: string,
  updates: Partial<{
    end_time: string | null
    start_time: string | null
    summary: string | null
    tags: string[] | null
    category: string
  }>
): Promise<TimeLog> {
  const payload: Record<string, unknown> = {}
  if (updates.end_time !== undefined) payload.end_time = updates.end_time
  if (updates.start_time !== undefined) payload.start_time = updates.start_time
  if (updates.summary !== undefined) payload.summary = updates.summary
  if (updates.tags !== undefined) payload.tags = updates.tags
  if (updates.category !== undefined) payload.category = updates.category

  const { data, error } = await supabase
    .from('time_logs')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function finishTimeLog(id: string, endTime: string, summary?: string): Promise<TimeLog> {
  const { data: existing, error: fetchErr } = await supabase
    .from('time_logs')
    .select('start_time')
    .eq('id', id)
    .single()
  if (fetchErr) throw fetchErr

  const duration = Math.round((new Date(endTime).getTime() - new Date(existing.start_time).getTime()) / 60000)

  const { data, error } = await supabase
    .from('time_logs')
    .update({ end_time: endTime, duration, summary: summary || null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTimeLog(id: string): Promise<void> {
  const { error } = await supabase.from('time_logs').delete().eq('id', id)
  if (error) throw error
}

// ── Finance ──

export async function fetchFinanceRecords(dateFrom: string, dateTo: string): Promise<FinanceRecord[]> {
  const { data, error } = await supabase
    .from('financial_logs')
    .select('*')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo + 'T23:59:59Z')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createFinanceRecord(form: FinanceFormData): Promise<FinanceRecord> {
  const insertData: Record<string, unknown> = {
    amount: form.amount,
    item_name: form.item_name,
    base_category: form.base_category,
    motivation: form.motivation,
    target_pool: resolveTargetPool(form.base_category, form.motivation),
    tags: form.tags || null,
  }
  if (form.created_at) {
    insertData.created_at = form.created_at
  }
  const { data, error } = await supabase
    .from('financial_logs')
    .insert(insertData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFinanceRecord(
  id: string,
  updates: Partial<FinanceFormData>
): Promise<FinanceRecord> {
  const updateData: Record<string, unknown> = {}
  if (updates.amount !== undefined) updateData.amount = updates.amount
  if (updates.item_name !== undefined) updateData.item_name = updates.item_name
  if (updates.base_category !== undefined) updateData.base_category = updates.base_category
  if (updates.motivation !== undefined) {
    updateData.motivation = updates.motivation
    const base = (updates.base_category ?? updateData.base_category) as BaseCategory | undefined
    if (base) {
      updateData.target_pool = resolveTargetPool(base, updates.motivation)
    }
  } else if (updates.base_category !== undefined) {
    const mot = (updateData.motivation ?? 'need') as Motivation
    updateData.target_pool = resolveTargetPool(updates.base_category, mot)
  }
  if (updates.tags !== undefined) updateData.tags = updates.tags
  if (updates.created_at !== undefined) updateData.created_at = updates.created_at

  const { data, error } = await supabase
    .from('financial_logs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFinanceRecord(id: string): Promise<void> {
  const { error } = await supabase.from('financial_logs').delete().eq('id', id)
  if (error) throw error
}

// ── Budget Settings ──

export async function fetchBudgetSettings(month: string): Promise<BudgetSettings | null> {
  const { data, error } = await supabase
    .from('budget_settings')
    .select('*')
    .eq('month', month)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertBudgetSettings(settings: Partial<BudgetSettings> & { month: string }): Promise<BudgetSettings> {
  const { data, error } = await supabase
    .from('budget_settings')
    .upsert(settings, { onConflict: 'month' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchBudgetSettingsBatch(months: string[]): Promise<BudgetSettings[]> {
  if (months.length === 0) return []
  const { data, error } = await supabase
    .from('budget_settings')
    .select('*')
    .in('month', months)
  if (error) throw error
  return data ?? []
}

// ── Recurring Items ──

export async function fetchRecurringTemplates(): Promise<RecurringTemplate[]> {
  const { data, error } = await supabase
    .from('recurring_templates')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createRecurringTemplate(
  type: 'income' | 'expense',
  itemName: string,
  defaultAmount: number,
): Promise<RecurringTemplate> {
  const { data, error } = await supabase
    .from('recurring_templates')
    .insert({ type, item_name: itemName, default_amount: defaultAmount })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRecurringTemplate(
  id: string,
  updates: { item_name?: string; default_amount?: number; sort_order?: number },
): Promise<RecurringTemplate> {
  const { data, error } = await supabase
    .from('recurring_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecurringTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_templates').delete().eq('id', id)
  if (error) throw error
}

export async function fetchMonthlyRecurringRecords(month: string): Promise<MonthlyRecurringRecord[]> {
  const { data, error } = await supabase
    .from('monthly_recurring_records')
    .select('*')
    .eq('month', month)
  if (error) throw error
  return data ?? []
}

export async function upsertMonthlyRecurringRecord(
  templateId: string,
  month: string,
  amount: number,
): Promise<MonthlyRecurringRecord> {
  const { data, error } = await supabase
    .from('monthly_recurring_records')
    .upsert({ template_id: templateId, month, amount }, { onConflict: 'template_id,month' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Diary ──

export async function fetchDiaryEntries(dateFrom: string, dateTo: string): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createDiaryEntry(date: string, originalText: string): Promise<DiaryEntry> {
  const { data, error } = await supabase
    .from('diary_entries')
    .insert({ date, original_text: originalText })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDiaryEntry(
  date: string,
  updates: { original_text?: string; corrected_text?: string | null; ai_advice?: string | null },
): Promise<DiaryEntry> {
  const { data, error } = await supabase
    .from('diary_entries')
    .update(updates)
    .eq('date', date)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Schedule ──

export async function fetchSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('date_start', { ascending: true })
    .order('time_start', { ascending: true, nullsFirst: true })
  if (error) throw error
  return data ?? []
}

export async function createSchedule(form: ScheduleFormData): Promise<Schedule> {
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
      payload.rec_days = form.rec_days.length > 0 ? JSON.stringify(form.rec_days) : null
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
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id)
  if (error) throw error
}
