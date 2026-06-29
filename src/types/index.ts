export type PeriodType = 'frequency' | 'weekday'
export type TaskStatus = 'active' | 'disabled'
export type ViewMode = 'week' | 'month' | 'heatmap' | 'stats' | 'notes' | 'menstruation' | 'craving' | 'sleep' | 'focus' | 'finance'

export type TimeCategory = 'job_hunting' | 'self_growth'

export const TIME_CATEGORIES: { key: TimeCategory; label: string; emoji: string }[] = [
  { key: 'job_hunting', label: '就職活動', emoji: '💼' },
  { key: 'self_growth', label: '自己投資', emoji: '📚' },
]

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

export interface Category {
  name: string
  color: string
  bg_color: string
  sort_order?: number
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

export interface MenstruationLog {
  id: string
  year_month: string
  day: number
  level: number
  created_at: string
  updated_at: string
}

export interface CravingLog {
  id: string
  result: 'resisted' | 'failed'
  mood: string[] | null
  created_at: string
}

export const CRAVING_MOODS = ['退屈', 'ストレス', '動画を見た', '友達に誘われた', '寂しい', 'その他'] as const

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

export const CRAVING_ALTERNATIVES = [
  '温かいお茶を飲んでみよう',
  '歯を磨いてリセットしよう',
  'ストレッチを5分だけやってみる',
  '目を閉じて10回深呼吸',
  'コップ一杯の水をゆっくり飲もう',
  '好きな曲を1曲聴いてみよう',
  '手帳を開いて今の気持ちを書いてみる',
  '散歩に出かけてみよう',
  '氷を食べてみる（噛む欲を満たす）',
  '寝る準備を始めよう',
] as const

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

// ── Finance ──

export type BaseCategory = 'food' | 'daily' | 'book' | 'transport'
export type Motivation = 'need' | 'pleasure'
export type TargetPool = 'food_pool' | 'daily_pool' | 'growth_pool' | 'pleasure_pool'

export interface FinanceRecord {
  id: string
  amount: number
  item_name: string
  base_category: BaseCategory
  motivation: Motivation
  target_pool: TargetPool
  tags: string[] | null
  created_at: string
}

export interface FinanceFormData {
  amount: number
  item_name: string
  base_category: BaseCategory
  motivation: Motivation
  tags: string[] | null
}

export const BASE_CATEGORIES: { key: BaseCategory; label: string }[] = [
  { key: 'food', label: '飲食' },
  { key: 'daily', label: '日用' },
  { key: 'book', label: '書籍' },
  { key: 'transport', label: '車費' },
]

export const BUDGET_POOLS: {
  key: TargetPool
  label: string
  icon: string
  monthlyBudget: number
  description: string
  color: string
  bgColor: string
}[] = [
  { key: 'food_pool', label: '基礎飲食', icon: '🥦', monthlyBudget: 30000, description: '生存剛需', color: '#4CAF50', bgColor: '#E8F5E9' },
  { key: 'daily_pool', label: '日用雑費', icon: '🧼', monthlyBudget: 10000, description: '生活剛需', color: '#2196F3', bgColor: '#E3F2FD' },
  { key: 'growth_pool', label: '自己投資', icon: '📚', monthlyBudget: Infinity, description: '人生投資', color: '#9C27B0', bgColor: '#F3E5F5' },
  { key: 'pleasure_pool', label: '快樂欲望', icon: '🎉', monthlyBudget: 15000, description: '悦己消費', color: '#E91E63', bgColor: '#FCE4EC' },
]

const _poolMap: Record<BaseCategory, TargetPool> = { food: 'food_pool', daily: 'daily_pool', book: 'growth_pool', transport: 'growth_pool' }
export function resolveTargetPool(base: BaseCategory, motivation: Motivation): TargetPool {
  return motivation === 'pleasure' ? 'pleasure_pool' : _poolMap[base]
}

export const TIME_BONUS_RATE = 100 // ¥100 per hour of job_hunting focus

export interface BudgetSettings {
  month: string
  food_base: number
  daily_base: number
  pleasure_base: number
  food_rollover: number
  daily_rollover: number
  pleasure_rollover: number
  updated_at?: string
}

export const DEFAULT_BUDGET_BASES = { food: 30000, daily: 10000, pleasure: 15000 } as const

// ── Recurring Items ──

export interface RecurringTemplate {
  id: string
  type: 'income' | 'expense'
  item_name: string
  default_amount: number
  sort_order: number
  created_at?: string
}

export interface MonthlyRecurringRecord {
  id: string
  template_id: string
  month: string
  amount: number
  created_at?: string
}
