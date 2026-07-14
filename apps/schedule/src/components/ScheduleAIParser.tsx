import { useState } from 'react'
import { parseScheduleText } from '../lib/gemini'
import type { ParsedScheduleEntry } from '../lib/gemini'
import type { ScheduleFormData } from '../types'
import { getScheduleCategories } from '../types'

interface Props {
  onSave: (entries: ScheduleFormData[]) => Promise<void>
  onClose: () => void
}

const CAT_KEYS = getScheduleCategories().map((c) => c.key)

export function ScheduleAIParser({ onSave, onClose }: Props) {
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedScheduleEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleParse = async () => {
    if (!rawText.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await parseScheduleText(rawText)
      setParsed(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : '解析に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const updateEntry = (index: number, field: string, value: string | boolean) => {
    if (!parsed) return
    setParsed((prev) => {
      if (!prev) return prev
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeEntry = (index: number) => {
    if (!parsed) return
    setParsed((prev) => prev?.filter((_, i) => i !== index) ?? null)
  }

  const handleSave = async () => {
    if (!parsed || parsed.length === 0) return
    setSaving(true)
    try {
      const forms: ScheduleFormData[] = parsed.map((entry) => ({
        title: entry.title,
        category: CAT_KEYS.includes(entry.category) ? entry.category : 'life',
        date_start: entry.date,
        time_start: entry.time_start || '',
        time_end: entry.time_end || '',
        url: '',
        memo: entry.memo || '',
        is_recurring: entry.is_recurring,
        rec_unit: entry.recurrence?.unit ?? 'week',
        rec_interval: entry.recurrence?.interval ?? 1,
        rec_days: entry.recurrence?.days ?? [],
        rec_end_date: entry.recurrence?.end_date ?? '',
      }))
      await onSave(forms)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col max-h-[85vh] shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">AIで日程追加</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        {!parsed ? (
          <div className="p-6 space-y-4">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'日程テキストを貼り付けてください\n\n例：\n6/30(火) 16:10-19:20 JV27 Java @121\n7/1(水) 12:50-14:20 SD27 システム開発 @141\n毎週月曜 9:30-11:00 JS25'}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[200px] resize-y"
              rows={8}
            />

            {error && <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleParse}
                disabled={loading || !rawText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '解析中...' : 'AI解析'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <p className="text-sm text-slate-500 mb-2">{parsed.length}件の予定を検出しました。内容を確認して保存してください。</p>
              {parsed.map((entry, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <label className="block text-xs text-slate-400 mb-0.5">タイトル</label>
                        <input
                          value={entry.title}
                          onChange={(e) => updateEntry(i, 'title', e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-0.5">カテゴリ</label>
                        <select
                          value={entry.category}
                          onChange={(e) => updateEntry(i, 'category', e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                        >
                          {getScheduleCategories().map((cat) => (
                            <option key={cat.key} value={cat.key}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-0.5">日付</label>
                        <input
                          type="date"
                          value={entry.date}
                          onChange={(e) => updateEntry(i, 'date', e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-0.5">時間</label>
                        <div className="flex gap-1 items-center">
                          <input
                            type="time"
                            value={entry.time_start}
                            onChange={(e) => updateEntry(i, 'time_start', e.target.value)}
                            className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm"
                          />
                          <span className="text-slate-400">-</span>
                          <input
                            type="time"
                            value={entry.time_end}
                            onChange={(e) => updateEntry(i, 'time_end', e.target.value)}
                            className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-400 mb-0.5">メモ（任意）</label>
                        <input
                          value={entry.memo || ''}
                          onChange={(e) => updateEntry(i, 'memo', e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                          placeholder="場所や備考"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => removeEntry(i)}
                      className="shrink-0 text-slate-400 hover:text-red-500 text-lg leading-none p-1"
                    >
                      &times;
                    </button>
                  </div>
                  {entry.is_recurring && entry.recurrence && (
                    <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                      繰り返し: {entry.recurrence.interval > 1 ? `${entry.recurrence.interval}週ごと` : '毎週'}
                      {entry.recurrence.days.length > 0 && ` / ${['月','火','水','木','金','土','日'].filter((_, i) => entry.recurrence!.days.includes(i.toString())).join('・')}曜`}
                      {entry.recurrence.end_date && ` 〜 ${entry.recurrence.end_date}`}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && <div className="px-6 pb-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mx-6 mb-2">{error}</div>}

            <div className="flex gap-2 px-6 py-4 border-t border-slate-100 shrink-0 justify-end">
              <button
                onClick={() => setParsed(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                戻る
              </button>
              <button
                onClick={handleSave}
                disabled={saving || parsed.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : `${parsed.length}件を保存`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
