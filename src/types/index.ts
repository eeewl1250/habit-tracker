export type PeriodType = 'frequency' | 'weekday'
export type TaskStatus = 'active' | 'disabled'
export type ViewMode = 'home' | 'week' | 'month' | 'heatmap' | 'stats' | 'notes' | 'menstruation' | 'craving' | 'sleep' | 'focus' | 'finance' | 'diary' | 'schedule' | 'review'

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
export type Motivation = 'need' | 'entertainment' | 'going_out'
export type TargetPool = 'food_pool' | 'daily_pool' | 'growth_pool' | 'entertainment_pool' | 'going_out_pool'

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
  created_at?: string
}

export interface FinanceUpdateData {
  amount?: number
  item_name?: string
  base_category?: BaseCategory
  motivation?: Motivation
  tags?: string[] | null
  created_at?: string
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
  { key: 'entertainment_pool', label: '娯楽', icon: '🎮', monthlyBudget: 10000, description: '娯楽費（ゲーム・推し活など）', color: '#E91E63', bgColor: '#FCE4EC' },
  { key: 'going_out_pool', label: '外出', icon: '🍽️', monthlyBudget: 5000, description: '外食・お出かけ費', color: '#FF9800', bgColor: '#FFF3E0' },
]

const _poolMap: Record<BaseCategory, TargetPool> = { food: 'food_pool', daily: 'daily_pool', book: 'growth_pool', transport: 'growth_pool' }
export function resolveTargetPool(base: BaseCategory, motivation: Motivation): TargetPool {
  if (motivation === 'entertainment') return 'entertainment_pool'
  if (motivation === 'going_out') return 'going_out_pool'
  return _poolMap[base]
}

export const TIME_BONUS_RATE = 100 // ¥100 per hour of job_hunting focus

export interface BudgetSettings {
  month: string
  food_base: number
  daily_base: number
  entertainment_base: number
  going_out_base: number
  food_rollover: number
  daily_rollover: number
  entertainment_rollover: number
  going_out_rollover: number
  updated_at?: string
}

export const DEFAULT_BUDGET_BASES = { food: 30000, daily: 10000, entertainment: 10000, going_out: 5000 } as const

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

// ── Diary ──

export interface DiaryEntry {
  id: string
  date: string
  original_text: string
  corrected_text: string | null
  ai_advice: string | null
  created_at: string
  updated_at: string
}

// ── Todo ──

export type TodoStatus = 'backlog' | 'today' | 'done'
export type TodoCategory = 'school' | 'job' | 'life' | 'ent' | 'study'

export interface Todo {
  id: string
  title: string
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
}

export interface TodoFormData {
  title: string
  category: TodoCategory
  status: TodoStatus
  estimated_minutes?: number
  source_url?: string
}

export const TODO_CATEGORIES: { key: TodoCategory; label: string; color: string; bg: string; emoji: string }[] = [
  { key: 'job', label: '就活', color: '#EF4444', bg: '#FEE2E2', emoji: '🔴' },
  { key: 'school', label: '学校', color: '#6B7280', bg: '#F3F4F6', emoji: '🔵' },
  { key: 'life', label: '生活', color: '#3B82F6', bg: '#DBEAFE', emoji: '🟢' },
  { key: 'ent', label: '娯楽', color: '#F97316', bg: '#FFEDD5', emoji: '🟣' },
  { key: 'study', label: '学習', color: '#8B5CF6', bg: '#EDE9FE', emoji: '🟠' },
]

// ── Schedule ──

export type ScheduleCategory = string
export type RecUnit = 'day' | 'week' | 'month' | 'year'

export interface CategoryDef {
  key: string
  label: string
  color: string
  bg: string
}

export const DEFAULT_SCHEDULE_CATEGORIES: CategoryDef[] = [
  { key: 'school', label: '学校', color: '#6B7280', bg: '#F3F4F6' },
  { key: 'job', label: '就活', color: '#EF4444', bg: '#FEE2E2' },
  { key: 'life', label: '生活', color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'ent', label: '娯楽', color: '#F97316', bg: '#FFEDD5' },
  { key: 'study', label: '学習', color: '#8B5CF6', bg: '#EDE9FE' },
]

const STORAGE_KEY = 'schedule_categories'

export function getScheduleCategories(): CategoryDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as CategoryDef[]
  } catch {}
  return DEFAULT_SCHEDULE_CATEGORIES
}

export function saveScheduleCategories(cats: CategoryDef[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats))
}

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

export interface ScheduleFormData {
  title: string
  category: ScheduleCategory
  date_start: string
  time_start: string
  time_end: string
  url: string
  memo: string
  is_recurring: boolean
  rec_unit: RecUnit
  rec_interval: number
  rec_days: string[]
  rec_end_date: string
  excluded_dates?: string
}
