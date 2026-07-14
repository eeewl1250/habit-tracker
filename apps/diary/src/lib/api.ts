// apps/diary/src/lib/api.ts
// diary モジュール固有のAPI関数

import { getSupabase } from '@habit-tracker/shared/supabase'
import type { DiaryEntry } from '../types'

export async function fetchDiaryEntries(dateFrom: string, dateTo: string): Promise<DiaryEntry[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createDiaryEntry(date: string, originalText: string): Promise<DiaryEntry> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('diary_entries')
    .insert({ date, original_text: originalText })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDiaryEntry(
  date: string,
  updates: { original_text?: string; corrected_text?: string | null; ai_advice?: string | null },
): Promise<DiaryEntry> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('diary_entries')
    .update(updates)
    .eq('date', date)
    .select()
    .single()
  if (error) throw error
  return data
}

const DIARY_IMAGE_BUCKET = 'diary-images'

export async function uploadDiaryImage(file: File, dateStr: string): Promise<string> {
  const supabase = getSupabase()
  const ext = file.name.split('.').pop() || 'png'
  const path = `${dateStr}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(DIARY_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
  })
  if (error) throw error
  const { data } = supabase.storage.from(DIARY_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteDiaryImage(publicUrl: string): Promise<void> {
  const supabase = getSupabase()
  const prefix = `${DIARY_IMAGE_BUCKET}/`
  const idx = publicUrl.indexOf(prefix)
  if (idx === -1) return
  const path = publicUrl.slice(idx + prefix.length)
  await supabase.storage.from(DIARY_IMAGE_BUCKET).remove([path])
}
