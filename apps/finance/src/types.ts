// apps/finance/src/types.ts

import type { CategoryDefinition } from '@habit-tracker/shared'

export type { CategoryDefinition }

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
