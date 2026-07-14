import type { CategoryDefinition } from '@habit-tracker/shared'

export type { CategoryDefinition }

export type TodoStatus = 'backlog' | 'today' | 'done'
export type TodoCategory = string

export interface Todo {
  id: string
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
  created_at: string
  updated_at: string
  parent_id: string | null
}

export interface TodoFormData {
  title: string
  is_project?: boolean
  category: TodoCategory
  status: TodoStatus
  estimated_minutes?: number
  source_url?: string
  parent_id?: string | null
}

export const TODO_CATEGORIES: { key: TodoCategory; label: string; color: string; bg: string; emoji: string }[] = [
  { key: 'job', label: '就活', color: '#EF4444', bg: '#FEE2E2', emoji: '🔴' },
  { key: 'school', label: '学校', color: '#6B7280', bg: '#F3F4F6', emoji: '🔵' },
  { key: 'life', label: '生活', color: '#3B82F6', bg: '#DBEAFE', emoji: '🟢' },
  { key: 'ent', label: '娯楽', color: '#F97316', bg: '#FFEDD5', emoji: '🟣' },
  { key: 'study', label: '学習', color: '#8B5CF6', bg: '#EDE9FE', emoji: '🟠' },
]

export type TimeCategory = string

export interface TimeLog {
  id: string
  category: TimeCategory
  start_time: string
  end_time: string | null
  duration: number | null
  summary: string | null
  tags: string[] | null
  created_at: string
}

export interface TimeLogFormData {
  category: TimeCategory
  start_time: string
  end_time: string | null
  summary: string | null
  tags: string[] | null
}

export type PeriodType = 'frequency' | 'weekday'
export type TaskStatus = 'active' | 'disabled'

export interface Task {
  id: string
  name: string
  category: string
  status: TaskStatus
  period_type: PeriodType
  frequency: number | null
  weekdays: string | null
  base_date: string | null
  color: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DailyLog {
  id: string
  task_id: string
  date: string
  memo: string | null
  created_at: string
}

export type ScheduleCategory = string
export type RecUnit = 'day' | 'week' | 'month' | 'year'

export interface Schedule {
  id: string
  title: string
  category: ScheduleCategory
  date_start: string
  time_start: string | null
  time_end: string | null
  url: string | null
  memo: string | null
  is_recurring: boolean
  rec_unit: RecUnit | null
  rec_interval: number | null
  rec_days: string | null
  rec_end_date: string | null
  excluded_dates: string
  created_at: string
  updated_at: string
}

export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
