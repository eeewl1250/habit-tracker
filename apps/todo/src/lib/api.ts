import { getSupabase } from '@habit-tracker/shared/supabase'
import type {
  Task, DailyLog, CategoryDefinition,
  TimeLog, TimeLogFormData,
  Schedule,
  Todo, TodoFormData, TodoStatus, TodoCategory,
} from '../types'

function sb() { return getSupabase() }

// ── Tasks (read-only) ──

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await sb()
    .from('tasks')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ── Daily Logs (check-in) ──

export async function fetchLogs(dateFrom: string, dateTo: string): Promise<DailyLog[]> {
  const { data, error } = await sb()
    .from('daily_logs')
    .select('*')
    .gte('date', dateFrom)
    .lte('date', dateTo)
  if (error) throw error
  return data ?? []
}

export async function checkIn(taskId: string, date: string, memo?: string): Promise<DailyLog> {
  const { data, error } = await sb()
    .from('daily_logs')
    .insert({ task_id: taskId, date, memo: memo || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function undoCheckIn(id: string): Promise<void> {
  const { error } = await sb().from('daily_logs').delete().eq('id', id)
  if (error) throw error
}

// ── Category Definitions ──

export async function fetchCategoryDefinitions(): Promise<CategoryDefinition[]> {
  const { data, error } = await sb()
    .from('category_definitions')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ── Time Logs ──

export async function fetchTimeLogs(dateFrom: string, dateTo: string): Promise<TimeLog[]> {
  const { data, error } = await sb()
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
  const { data, error } = await sb()
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

  const { data, error } = await sb()
    .from('time_logs')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function finishTimeLog(id: string, endTime: string, summary?: string, tags?: string[]): Promise<TimeLog> {
  const { data: existing, error: fetchErr } = await sb()
    .from('time_logs')
    .select('start_time')
    .eq('id', id)
    .single()
  if (fetchErr) throw fetchErr

  const duration = Math.round((new Date(endTime).getTime() - new Date(existing.start_time).getTime()) / 60000)

  const updates: Record<string, unknown> = { end_time: endTime, duration, summary: summary || null }
  if (tags !== undefined) updates.tags = tags

  const { data, error } = await sb()
    .from('time_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTimeLog(id: string): Promise<void> {
  const { error } = await sb().from('time_logs').delete().eq('id', id)
  if (error) throw error
}

// ── Schedules (read-only) ──

function expandRecurring(schedule: Schedule): Schedule[] {
  const excludedDates: string[] = JSON.parse(schedule.excluded_dates || '[]')

  if (!schedule.is_recurring) {
    if (excludedDates.includes(schedule.date_start)) return []
    return [schedule]
  }

  const unit = schedule.rec_unit
  const interval = schedule.rec_interval ?? 1
  const recDays: string[] = schedule.rec_days ? JSON.parse(schedule.rec_days) : []
  const endDate = schedule.rec_end_date ?? '2099-12-31'
  const start = new Date(schedule.date_start + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  const instances: Schedule[] = []
  const current = new Date(start)

  while (current <= end) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`

    if (!excludedDates.includes(dateStr)) {
      let matches = true

      if (unit === 'month') {
        if (current.getDate() !== start.getDate()) matches = false
      } else if (unit === 'week') {
        if (recDays.length > 0) {
          const dayOfWeek = ((current.getDay() + 6) % 7).toString()
          if (!recDays.includes(dayOfWeek)) matches = false
        }
      }

      if (matches) {
        instances.push({
          ...schedule,
          date_start: dateStr,
          is_recurring: false,
        })
      }
    }

    current.setDate(current.getDate() + 1)
  }

  return instances
}

export async function fetchSchedules(): Promise<Schedule[]> {
  const { data, error } = await sb()
    .from('schedules')
    .select('*')
    .order('date_start', { ascending: true })
    .order('time_start', { ascending: true, nullsFirst: true })
  if (error) throw error
  const raw = data ?? []
  return raw.flatMap(expandRecurring)
}

// ── Todos ──

export async function fetchTodos(): Promise<Todo[]> {
  const { data, error } = await sb()
    .from('todos')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((t) => ({
    ...t,
    is_project: Boolean((t as { is_project?: boolean }).is_project),
  }))
}

function isMissingTodoParentIdColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: string; message?: string }
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return (
    err.code === 'PGRST204' &&
    msg.includes('parent_id') &&
    msg.includes('todos')
  )
}

function isMissingTodoIsProjectColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { code?: string; message?: string }
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : ''
  return (
    err.code === 'PGRST204' &&
    msg.includes('is_project') &&
    msg.includes('todos')
  )
}

export async function createTodo(form: TodoFormData): Promise<Todo> {
  const payload = {
    title: form.title,
    is_project: form.is_project ?? false,
    category: form.category,
    status: form.status,
    estimated_minutes: form.estimated_minutes ?? 0,
    source_url: form.source_url || null,
    parent_id: form.parent_id || null,
  }

  const firstTry = await sb()
    .from('todos')
    .insert(payload)
    .select()
    .single()

  if (!firstTry.error) return firstTry.data

  const fallbackPayload = { ...payload }
  if (isMissingTodoParentIdColumnError(firstTry.error)) {
    delete (fallbackPayload as { parent_id?: string | null }).parent_id
  }
  if (isMissingTodoIsProjectColumnError(firstTry.error)) {
    delete (fallbackPayload as { is_project?: boolean }).is_project
  }

  if (Object.keys(fallbackPayload).length === Object.keys(payload).length) {
    throw firstTry.error
  }

  const retry = await sb()
    .from('todos')
    .insert(fallbackPayload)
    .select()
    .single()
  if (retry.error) throw retry.error
  return retry.data
}

export async function updateTodo(
  id: string,
  updates: Partial<{
    title: string
    is_project: boolean
    category: TodoCategory
    status: TodoStatus
    estimated_minutes: number
    actual_minutes: number
    source_url: string | null
    diary_clue: string | null
    sort_order: number
    completed_at: string | null
    parent_id: string | null
  }>
): Promise<Todo> {
  const payload: Record<string, unknown> = {}
  if (updates.title !== undefined) payload.title = updates.title
  if (updates.is_project !== undefined) payload.is_project = updates.is_project
  if (updates.category !== undefined) payload.category = updates.category
  if (updates.status !== undefined) payload.status = updates.status
  if (updates.estimated_minutes !== undefined) payload.estimated_minutes = updates.estimated_minutes
  if (updates.actual_minutes !== undefined) payload.actual_minutes = updates.actual_minutes
  if (updates.source_url !== undefined) payload.source_url = updates.source_url
  if (updates.diary_clue !== undefined) payload.diary_clue = updates.diary_clue
  if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order
  if (updates.completed_at !== undefined) payload.completed_at = updates.completed_at
  if (updates.parent_id !== undefined) payload.parent_id = updates.parent_id

  const firstTry = await sb()
    .from('todos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (!firstTry.error) return firstTry.data

  let canRetry = false
  if (isMissingTodoParentIdColumnError(firstTry.error) && 'parent_id' in payload) {
    delete payload.parent_id
    canRetry = true
  }
  if (isMissingTodoIsProjectColumnError(firstTry.error) && 'is_project' in payload) {
    delete payload.is_project
    canRetry = true
  }
  if (!canRetry) {
    throw firstTry.error
  }

  const retry = await sb()
    .from('todos')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (retry.error) throw retry.error
  return retry.data
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await sb().from('todos').delete().eq('id', id)
  if (error) throw error
}

export async function fetchCompletedTodosForDate(date: string): Promise<Todo[]> {
  const dateStart = date + 'T00:00:00Z'
  const dateEnd = date + 'T23:59:59Z'
  const { data, error } = await sb()
    .from('todos')
    .select('*')
    .eq('status', 'done')
    .gte('completed_at', dateStart)
    .lte('completed_at', dateEnd)
    .order('completed_at', { ascending: false })
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
  const { data, error } = await sb()
    .from('todos')
    .select('status, actual_minutes')
    .gte('created_at', startDate)
    .lt('created_at', endDate)
  if (error) throw error
  const todos = data ?? []
  const total = todos.length
  const completed = todos.filter(t => t.status === 'done').length
  const focusMinutes = todos.reduce((sum, t) => sum + (t.actual_minutes ?? 0), 0)
  return { total, completed, focusMinutes }
}
