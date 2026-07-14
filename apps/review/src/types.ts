// apps/review/src/types.ts
// Types needed for the review module - re-exports from shared and local definitions

export type { Category, CategoryDefinition } from '@habit-tracker/shared'
export { CATEGORY_COLOR_PAIRS } from '@habit-tracker/shared'

// ── Task ──

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

// ── DailyLog ──

export interface DailyLog {
  id: string
  task_id: string
  date: string
  memo: string | null
  created_at: string
}

// ── Note ──

export interface Note {
  id: string
  task_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface NoteWithTask extends Note {
  task_name: string
  task_category: string
}

// ── Todo ──

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

// ── TimeLog ──

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

// ── SleepLog ──

export interface SleepLog {
  id: string
  date: string
  bed_time: string | null
  sleep_time: string | null
  wake_time: string | null
  sleep2_time: string | null
  wake2_time: string | null
  created_at: string
  updated_at: string
}

// ── CravingEntry ──

export interface CravingEntry {
  id: string
  result: 'resisted' | 'failed'
  mood: string[] | null
  created_at: string
}

export interface CravingFrequencyConfig {
  frequency: number
  base_date: string
}

// ── MenstruationEntry ──

export interface MenstruationEntry {
  id: string
  year_month: string
  day: number
  level: number
  created_at: string
  updated_at: string
}

// ── FinanceEntry / FinanceCategory ──

export type BaseCategory = 'food' | 'daily' | 'book' | 'transport'
export type Motivation = 'need' | 'entertainment' | 'going_out'
export type TargetPool = 'food_pool' | 'daily_pool' | 'growth_pool' | 'entertainment_pool' | 'going_out_pool'

export interface FinanceEntry {
  id: string
  amount: number
  item_name: string
  base_category: BaseCategory
  motivation: Motivation
  target_pool: TargetPool
  tags: string[] | null
  created_at: string
}

export interface FinanceCategory {
  key: BaseCategory
  label: string
}

// ── DiaryEntry ──

export interface DiaryEntry {
  id: string
  date: string
  original_text: string
  corrected_text: string | null
  ai_advice: string | null
  created_at: string
  updated_at: string
}

// ── Schedule ──

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
