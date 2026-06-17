export type PeriodType = 'frequency' | 'weekday'
export type TaskStatus = 'active' | 'disabled'
export type ViewMode = 'week' | 'month' | 'heatmap' | 'stats'

export interface Category {
  name: string
  color: string
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

export const CATEGORY_COLORS = [
  '#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5',
  '#E0F7FA', '#FCE4EC', '#F1F8E9', '#FFF8E1',
  '#E8EAF6', '#FBE9E7',
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
