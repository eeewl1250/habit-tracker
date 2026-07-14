// apps/finance/src/lib/api.ts

import { getSupabase } from '@habit-tracker/shared/supabase'
import type { FinanceRecord, FinanceFormData, BaseCategory, Motivation, BudgetSettings, RecurringTemplate, MonthlyRecurringRecord, CategoryDefinition } from '../types'
import { resolveTargetPool } from '../types'

// ── Finance Records ──

export async function fetchFinanceRecords(dateFrom: string, dateTo: string): Promise<FinanceRecord[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('financial_logs')
    .select('*')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo + 'T23:59:59Z')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createFinanceRecord(form: FinanceFormData): Promise<FinanceRecord> {
  const supabase = getSupabase()
  const insertData: Record<string, unknown> = {
    amount: form.amount,
    item_name: form.item_name,
    base_category: form.base_category,
    motivation: form.motivation,
    target_pool: resolveTargetPool(form.base_category, form.motivation),
    tags: form.tags || null,
  }
  if (form.created_at) {
    insertData.created_at = form.created_at
  }
  const { data, error } = await supabase
    .from('financial_logs')
    .insert(insertData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateFinanceRecord(
  id: string,
  updates: Partial<FinanceFormData>
): Promise<FinanceRecord> {
  const supabase = getSupabase()
  const updateData: Record<string, unknown> = {}
  if (updates.amount !== undefined) updateData.amount = updates.amount
  if (updates.item_name !== undefined) updateData.item_name = updates.item_name
  if (updates.base_category !== undefined) updateData.base_category = updates.base_category
  if (updates.motivation !== undefined) {
    updateData.motivation = updates.motivation
    const base = (updates.base_category ?? updateData.base_category) as BaseCategory | undefined
    if (base) {
      updateData.target_pool = resolveTargetPool(base, updates.motivation)
    }
  } else if (updates.base_category !== undefined) {
    const mot = (updateData.motivation ?? 'need') as Motivation
    updateData.target_pool = resolveTargetPool(updates.base_category, mot)
  }
  if (updates.tags !== undefined) updateData.tags = updates.tags
  if (updates.created_at !== undefined) updateData.created_at = updates.created_at

  const { data, error } = await supabase
    .from('financial_logs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFinanceRecord(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('financial_logs').delete().eq('id', id)
  if (error) throw error
}

// ── Budget Settings ──

export async function fetchBudgetSettings(month: string): Promise<BudgetSettings | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('budget_settings')
    .select('*')
    .eq('month', month)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertBudgetSettings(settings: Partial<BudgetSettings> & { month: string }): Promise<BudgetSettings> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('budget_settings')
    .upsert(settings, { onConflict: 'month' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchBudgetSettingsBatch(months: string[]): Promise<BudgetSettings[]> {
  const supabase = getSupabase()
  if (months.length === 0) return []
  const { data, error } = await supabase
    .from('budget_settings')
    .select('*')
    .in('month', months)
  if (error) throw error
  return data ?? []
}

// ── Recurring Items ──

export async function fetchRecurringTemplates(): Promise<RecurringTemplate[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('recurring_templates')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createRecurringTemplate(
  type: 'income' | 'expense',
  itemName: string,
  defaultAmount: number,
): Promise<RecurringTemplate> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('recurring_templates')
    .insert({ type, item_name: itemName, default_amount: defaultAmount })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRecurringTemplate(
  id: string,
  updates: { item_name?: string; default_amount?: number; sort_order?: number },
): Promise<RecurringTemplate> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('recurring_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecurringTemplate(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('recurring_templates').delete().eq('id', id)
  if (error) throw error
}

export async function fetchMonthlyRecurringRecords(month: string): Promise<MonthlyRecurringRecord[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('monthly_recurring_records')
    .select('*')
    .eq('month', month)
  if (error) throw error
  return data ?? []
}

export async function upsertMonthlyRecurringRecord(
  templateId: string,
  month: string,
  amount: number,
): Promise<MonthlyRecurringRecord> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('monthly_recurring_records')
    .upsert({ template_id: templateId, month, amount }, { onConflict: 'template_id,month' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Category Definitions ──

export async function fetchCategoryDefinitions(): Promise<CategoryDefinition[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('category_definitions')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}
