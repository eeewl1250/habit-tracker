// packages/shared/src/types.ts
// 全モジュール共通の型のみ

export type ViewMode = 'home' | 'week' | 'month' | 'heatmap' | 'stats' | 'notes' | 'menstruation' | 'craving' | 'sleep' | 'focus' | 'finance' | 'diary' | 'schedule' | 'review' | 'todo' | 'categories'

export interface Category {
  name: string
  color: string
  bg_color: string
  sort_order?: number
}

export interface CategoryDefinition {
  id: string
  name: string
  color: string
  bg_color: string
  emoji: string
  is_default: boolean
  bonus_enabled: boolean
  bonus_rate: number
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
