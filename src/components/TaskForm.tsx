import { useState } from 'react'
import type { TaskFormData, PeriodType, Task } from '../types'
import { TASK_COLORS, WEEKDAY_KEYS, WEEKDAY_LABELS } from '../types'
import { CategoryCombobox } from './CategoryCombobox'

interface TaskFormProps {
  initial?: Task
  categories: string[]
  onSave: (data: TaskFormData) => Promise<void>
  onCancel: () => void
}

const defaultForm: TaskFormData = {
  name: '',
  category: '',
  status: 'active',
  period_type: 'frequency',
  frequency: 1,
  weekdays: [],
  color: TASK_COLORS[0],
}

export function TaskForm({ initial, categories, onSave, onCancel }: TaskFormProps) {
  const [form, setForm] = useState<TaskFormData>(() => {
    if (!initial) return defaultForm
    return {
      name: initial.name,
      category: initial.category,
      status: initial.status,
      period_type: initial.period_type,
      frequency: initial.frequency,
      weekdays: initial.weekdays
        ? (JSON.parse(initial.weekdays) as string[])
        : [],
      color: initial.color ?? TASK_COLORS[0],
    }
  })
  const [saving, setSaving] = useState(false)

  const update = <K extends keyof TaskFormData>(
    key: K,
    value: TaskFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handlePeriodChange = (val: PeriodType) => {
    if (val === 'frequency') {
      setForm((prev) => ({
        ...prev,
        period_type: val,
        weekdays: [],
        frequency: 1,
      }))
    } else {
      setForm((prev) => ({
        ...prev,
        period_type: val,
        frequency: null,
        weekdays: [],
      }))
    }
  }

  const toggleWeekday = (key: string) => {
    setForm((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(key)
        ? prev.weekdays.filter((w) => w !== key)
        : [...prev.weekdays, key],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(form)
    } catch {
      // error handled by parent
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          タスク名
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder="例: 朝読書"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          カテゴリ
        </label>
        <CategoryCombobox
          value={form.category}
          options={categories}
          onChange={(val) => update('category', val)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          タスクカラー
        </label>
        <div className="flex gap-2 flex-wrap">
          {TASK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => update('color', c)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          周期タイプ
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="period_type"
              checked={form.period_type === 'frequency'}
              onChange={() => handlePeriodChange('frequency')}
            />
            <span className="text-sm">毎X日</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="period_type"
              checked={form.period_type === 'weekday'}
              onChange={() => handlePeriodChange('weekday')}
            />
            <span className="text-sm">曜日指定</span>
          </label>
        </div>
      </div>

      {form.period_type === 'frequency' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            間隔（X日ごと）
          </label>
          <input
            type="number"
            min={1}
            value={form.frequency ?? 1}
            onChange={(e) => update('frequency', Number(e.target.value))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      )}

      {form.period_type === 'weekday' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            実行する曜日
          </label>
          <div className="flex gap-2">
            {WEEKDAY_KEYS.map((key, i) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleWeekday(key)}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                  form.weekdays.includes(key)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {WEEKDAY_LABELS[i]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : initial ? '更新' : '追加'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
