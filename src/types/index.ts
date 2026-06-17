export type PeriodType = 'frequency' | 'weekday'
export type TaskStatus = 'active' | 'disabled'
export type ViewMode = 'week' | 'month' | 'heatmap' | 'stats'

export interface Task {
  id: string
  name: string
  category: string
  status: TaskStatus
  period_type: PeriodType
  frequency: number | null
  weekdays: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface DailyLog {
  id: string
  task_id: string
  date: string
  created_at: string
}

export interface TaskFormData {
  name: string
  category: string
  status: TaskStatus
  period_type: PeriodType
  frequency: number | null
  weekdays: string[]
}
