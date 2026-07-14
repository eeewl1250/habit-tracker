import { useState, useEffect } from 'react'
import type { ScheduleCategory, RecUnit, ScheduleFormData } from '../types'
import { getScheduleCategories } from '../types'
import { fetchSchedules } from '../lib/api'
import { format } from 'date-fns'

const WEEKDAYS_JP = ['月', '火', '水', '木', '金', '土', '日']

interface Props {
  onSave: (form: ScheduleFormData) => void
  onCancel: () => void
  scheduleId: string | null
}

export function ScheduleEditor({ onSave, onCancel, scheduleId }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ScheduleCategory>('job')
  const [dateStart, setDateStart] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd] = useState('')
  const [url, setUrl] = useState('')
  const [memo, setMemo] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recUnit, setRecUnit] = useState<RecUnit>('week')
  const [recInterval, setRecInterval] = useState(1)
  const [recDays, setRecDays] = useState<string[]>([])
  const [recEndDate, setRecEndDate] = useState('')
  const [isAllDay, setIsAllDay] = useState(true)

  const isEditing = !!scheduleId

  useEffect(() => {
    if (!scheduleId) return
    fetchSchedules().then((all) => {
      const s = all.find((x) => x.id === scheduleId)
      if (!s) return
      setTitle(s.title)
      setCategory(s.category)
      setDateStart(s.date_start)
      setTimeStart(s.time_start ?? '')
      setTimeEnd(s.time_end ?? '')
      setUrl(s.url ?? '')
      setMemo(s.memo ?? '')
      setIsAllDay(!s.time_start)
      setIsRecurring(s.is_recurring)
      if (s.is_recurring) {
        setRecUnit(s.rec_unit ?? 'week')
        setRecInterval(s.rec_interval ?? 1)
        setRecDays(s.rec_days ? JSON.parse(s.rec_days) : [])
        setRecEndDate(s.rec_end_date ?? '')
      }
    }).catch(() => {})
  }, [scheduleId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      category,
      date_start: dateStart,
      time_start: isAllDay ? '' : timeStart,
      time_end: isAllDay ? '' : timeEnd,
      url: url.trim(),
      memo: memo.trim(),
      is_recurring: isRecurring,
      rec_unit: isRecurring ? recUnit : 'week',
      rec_interval: isRecurring ? recInterval : 1,
      rec_days: isRecurring && recUnit === 'week' ? recDays : [],
      rec_end_date: isRecurring && recEndDate ? recEndDate : '',
    })
  }

  const toggleRecDay = (d: string) => {
    setRecDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <h2 className="text-lg font-bold p-6 pb-0 shrink-0">{isEditing ? '日程を編集' : '新しい日程'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="space-y-4 p-6 overflow-y-auto min-h-0">
            {/* Title */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">タイトル</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="〇〇会社 面接"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">カテゴリ</label>
            <div className="flex gap-2">
              {getScheduleCategories().map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                    category === cat.key
                      ? 'text-white font-medium border-transparent'
                      : 'border-slate-200 text-slate-500'
                  }`}
                  style={category === cat.key ? { backgroundColor: cat.color } : {}}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">日付</label>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* All-day toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-all-day"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="is-all-day" className="text-sm text-slate-600">終日</label>
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">開始</label>
                <input
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">終了</label>
                <input
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          )}

          {/* URL */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">URL（任意）</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="https://..."
            />
          </div>

          {/* Memo */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">メモ（任意）</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[60px]"
              placeholder="場所や備考"
            />
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="is-recurring" className="text-sm text-slate-600">繰り返す</label>
          </div>

          {isRecurring && (
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
              {/* Unit */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">周期</label>
                <select
                  value={recUnit}
                  onChange={(e) => setRecUnit(e.target.value as RecUnit)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="day">日</option>
                  <option value="week">週</option>
                  <option value="month">月</option>
                  <option value="year">年</option>
                </select>
              </div>

              {/* Interval */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">間隔</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={recInterval}
                    onChange={(e) => setRecInterval(Math.max(1, Number(e.target.value)))}
                    className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <span className="text-sm text-slate-500">
                    {recUnit === 'day' ? '日' : recUnit === 'week' ? '週' : recUnit === 'month' ? 'ヶ月' : '年'}ごと
                  </span>
                </div>
              </div>

              {/* Weekday selection for week */}
              {recUnit === 'week' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">曜日</label>
                  <div className="flex gap-1">
                    {WEEKDAYS_JP.map((d, i) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleRecDay(i.toString())}
                        className={`w-8 h-8 text-xs rounded-full transition-colors ${
                          recDays.includes(i.toString())
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* End date */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">終了日（任意）</label>
                <input
                  type="date"
                  value={recEndDate}
                  onChange={(e) => setRecEndDate(e.target.value)}
                  min={dateStart}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {!recEndDate && <p className="text-xs text-slate-400 mt-1">空欄 = 無期限</p>}
              </div>
            </div>
          )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 px-6 pb-6 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isEditing ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
