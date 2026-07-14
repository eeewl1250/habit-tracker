// apps/diary/src/types.ts
// diary モジュール固有の型

export interface DiaryEntry {
  id: string
  date: string
  original_text: string
  corrected_text: string | null
  ai_advice: string | null
  created_at: string
  updated_at: string
}
