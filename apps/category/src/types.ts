// apps/category/src/types.ts

import type { Category, CategoryDefinition } from '@habit-tracker/shared'

export type { Category, CategoryDefinition }
export { CATEGORY_COLOR_PAIRS } from '@habit-tracker/shared'

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
