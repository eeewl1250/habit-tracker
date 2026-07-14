export type PeriodType = 'frequency' | 'weekday'
export type TaskStatus = 'active' | 'disabled'

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

export interface TaskFormData {
  name: string
  category: string
  status: TaskStatus
  period_type: PeriodType
  frequency: number | null
  weekdays: string[]
  color: string | null
  base_date: string | null
}

export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const
export const WEEKDAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}

export interface CategoryDef {
  key: string
  label: string
  color: string
  bg: string
}

// Re-export from shared for convenience
export { CATEGORY_COLOR_PAIRS } from '@habit-tracker/shared'
export type { Category, CategoryDefinition, ViewMode } from '@habit-tracker/shared'

// Minimal types for HomeView (cross-module, match actual app types)
export interface SleepLog {
  id: string
  date: string
  bed_time: string | null
  sleep_time: string | null
  wake_time: string | null
  sleep2_time: string | null
  wake2_time: string | null
}

export interface TimeLog {
  id: string
  category: string
  start_time: string
  end_time: string | null
  duration: number | null
  summary: string | null
  tags: string[] | null
  created_at: string
}

export interface DiaryEntry {
  id: string
  date: string
  original_text: string
  corrected_text: string | null
  ai_advice: string | null
  created_at: string
  updated_at: string
}
