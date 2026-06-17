export type PeriodType = 'frequency' | 'weekday'
export type TaskStatus = 'active' | 'disabled'
export type ViewMode = 'week' | 'month' | 'heatmap' | 'stats' | 'notes'

export interface Note {
  id: string
  content: string
  created_at: string
  updated_at: string
}

export interface Category {
  name: string
  color: string
  bg_color: string
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

export const CATEGORY_COLOR_PAIRS = [
  { dot: '#4CAF50', bg: '#E8F5E9' },
  { dot: '#2196F3', bg: '#E3F2FD' },
  { dot: '#FF9800', bg: '#FFF3E0' },
  { dot: '#9C27B0', bg: '#F3E5F5' },
  { dot: '#00BCD4', bg: '#E0F7FA' },
  { dot: '#E91E63', bg: '#FCE4EC' },
  { dot: '#8BC34A', bg: '#F1F8E9' },
  { dot: '#FFC107', bg: '#FFF8E1' },
  { dot: '#3F51B5', bg: '#E8EAF6' },
  { dot: '#FF5722', bg: '#FBE9E7' },
]

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
