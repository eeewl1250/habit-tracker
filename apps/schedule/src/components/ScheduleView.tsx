import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, subWeeks, addMonths, subMonths, addDays, subDays,
  eachDayOfInterval, isToday, parse,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import type { ScheduleCategory, ScheduleFormData, CategoryDefinition } from '../types'
import { getScheduleCategories } from '../types'
import { fetchCategoryDefinitions } from '../lib/api'
import { useSchedules } from '../hooks/useSchedules'
import { ScheduleEditor } from './ScheduleEditor'
import { SchedulePopover } from './SchedulePopover'
import { ScheduleAIParser } from './ScheduleAIParser'

type ScheduleViewMode = 'month' | 'week' | 'day'

function normalizeDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const LOCAL_FALLBACK = getScheduleCategories()

function getCategoryStyle(cat: ScheduleCategory, apiCats?: CategoryDefinition[]) {
  if (apiCats) {
    const found = apiCats.find((c) => c.name === cat)
    if (found) return { key: found.name, label: found.name, color: found.color, bg: found.bg_color }
  }
  return LOCAL_FALLBACK.find((c) => c.key === cat) ?? LOCAL_FALLBACK.find((c) => c.label === cat) ?? LOCAL_FALLBACK[0]
}

const WEEKDAYS_JP = ['月', '火', '水', '木', '金', '土', '日']

export function ScheduleView({ onNavigateToCategories }: { onNavigateToCategories?: () => void }) {
  const { load, add, edit, remove, excludeDate, getInstances } = useSchedules()
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('month')
  const [baseDate, setBaseDate] = useState(normalizeDate(new Date()))
  const [apiCats, setApiCats] = useState<CategoryDefinition[]>([])
  const cats = useMemo(() => {
    if (apiCats.length > 0) {
      return apiCats.map((c) => ({ key: c.name, label: c.name, color: c.color, bg: c.bg_color }))
    }
    return getScheduleCategories()
  }, [apiCats])
  const [filters, setFilters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(cats.map((c) => [c.key, true]))
  )

  useEffect(() => {
    fetchCategoryDefinitions().then(setApiCats).catch(() => {})
  }, [])
  const [showEditor, setShowEditor] = useState(false)
  const [showAIParser, setShowAIParser] = useState(false)
  const [editing, setEditing] = useState<{ id: string; date?: string } | null>(null)
  const [popoverTarget, setPopoverTarget] = useState<{ instance: any; el: HTMLElement } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; date: string; isRecurring: boolean } | null>(null)
  const [editRecurringChoice, setEditRecurringChoice] = useState<{ form: ScheduleFormData; id: string; date: string } | null>(null)

  useEffect(() => { load() }, [load])
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    setFilters((prev) => {
      const currentCats = cats
      const next = { ...prev }
      for (const c of currentCats) if (!(c.key in next)) next[c.key] = true
      for (const k of Object.keys(next)) if (!currentCats.some((c) => c.key === k)) delete next[k]
      return next
    })
  }, [cats])

  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      const mStart = startOfMonth(baseDate)
      const mEnd = endOfMonth(baseDate)
      const start = startOfWeek(mStart, { weekStartsOn: 1 })
      const end = endOfWeek(mEnd, { weekStartsOn: 1 })
      return { start, end, label: format(baseDate, 'yyyy年 M月', { locale: ja }) }
    } else if (viewMode === 'week') {
      const start = startOfWeek(baseDate, { weekStartsOn: 1 })
      const end = endOfWeek(baseDate, { weekStartsOn: 1 })
      return { start, end, label: `${format(start, 'M/d', { locale: ja })} - ${format(end, 'M/d', { locale: ja })}` }
    } else {
      return { start: baseDate, end: baseDate, label: format(baseDate, 'yyyy年 M月 d日 (E)', { locale: ja }) }
    }
  }, [viewMode, baseDate])

  const instances = useMemo(() => {
    const startStr = format(dateRange.start, 'yyyy-MM-dd')
    const endStr = format(dateRange.end, 'yyyy-MM-dd')
    return getInstances(startStr, endStr).filter((inst) => filters[inst.category] !== false)
  }, [getInstances, dateRange, filters])

  const goPrev = () => {
    if (viewMode === 'month') setBaseDate((d) => subMonths(d, 1))
    else if (viewMode === 'week') setBaseDate((d) => subWeeks(d, 1))
    else setBaseDate((d) => subDays(d, 1))
  }
  const goNext = () => {
    if (viewMode === 'month') setBaseDate((d) => addMonths(d, 1))
    else if (viewMode === 'week') setBaseDate((d) => addWeeks(d, 1))
    else setBaseDate((d) => addDays(d, 1))
  }
  const goToday = () => setBaseDate(normalizeDate(new Date()))

  const handleSave = async (form: ScheduleFormData) => {
    if (editing?.date) {
      setEditRecurringChoice({ form, id: editing.id, date: editing.date })
    } else if (editing) {
      await edit(editing.id, form)
      setEditing(null)
      setShowEditor(false)
    } else {
      await add(form)
      setShowEditor(false)
    }
  }

  const handleSaveAI = useCallback(async (entries: ScheduleFormData[]) => {
    for (const form of entries) {
      await add(form)
    }
  }, [add])

  const handleEditRecurringThis = async () => {
    if (!editRecurringChoice) return
    const { form, id, date } = editRecurringChoice
    await excludeDate(id, date)
    await add({ ...form, date_start: date, is_recurring: false })
    setEditRecurringChoice(null)
    setEditing(null)
    setShowEditor(false)
  }

  const handleEditRecurringAll = async () => {
    if (!editRecurringChoice) return
    const { form, id } = editRecurringChoice
    await edit(id, form)
    setEditRecurringChoice(null)
    setEditing(null)
    setShowEditor(false)
  }

  const navigateToWeek = useCallback((date: Date) => {
    setBaseDate(date)
    setViewMode('week')
  }, [])

  const navigateToDay = useCallback((date: Date) => {
    setBaseDate(date)
    setViewMode('day')
  }, [])

  return (
    <div className="max-w-6xl mx-auto flex flex-col px-2 md:px-4 pt-4 overflow-hidden max-h-full pb-20">
      {/* Fixed header */}
      <div className="shrink-0">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
            {(['month', 'week', 'day'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === m
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {m === 'month' ? '月' : m === 'week' ? '週' : '日'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 rounded">&lt;</button>
            <span className="text-sm font-medium min-w-[160px] text-center">{dateRange.label}</span>
            <button onClick={goNext} className="px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 rounded">&gt;</button>
            <button onClick={goToday} className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50">今日</button>
          </div>
          <button
            onClick={() => { setEditing(null); setShowEditor(true) }}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 追加
          </button>
          <button
            onClick={() => setShowAIParser(true)}
            className="px-3 py-1 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90"
          >
            AI追加
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {cats.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilters((f) => ({ ...f, [cat.key]: !f[cat.key] }))}
              className={`px-3 py-1 text-xs rounded-full border transition-all ${
                filters[cat.key]
                  ? 'border-transparent text-white font-medium'
                  : 'border-slate-200 text-slate-400 opacity-50'
              }`}
              style={filters[cat.key] ? { backgroundColor: cat.color } : {}}
            >
              {cat.label}
            </button>
          ))}
        <button
          onClick={() => onNavigateToCategories?.()}
          className="px-3 py-1 text-xs rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50"
          title="カテゴリ管理"
        >
          ⚙
        </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 border border-slate-200 rounded-lg bg-white">

      {viewMode === 'month' && (
        <MonthView
          baseDate={baseDate}
          instances={instances}
          apiCats={apiCats}
          filters={filters}
          onEdit={(id) => { setEditing({ id }); setShowEditor(true) }}
          onPopover={(inst, el) => setPopoverTarget({ instance: inst, el })}
          onNavigateToWeek={navigateToWeek}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          baseDate={baseDate}
          instances={instances}
          apiCats={apiCats}
          filters={filters}
          onEdit={(id) => { setEditing({ id }); setShowEditor(true) }}
          onPopover={(inst, el) => setPopoverTarget({ instance: inst, el })}
          onNavigateToDay={navigateToDay}
        />
      )}
      {viewMode === 'day' && (
          <DayView
            baseDate={baseDate}
            instances={instances}
            apiCats={apiCats}
            filters={filters}
            onEdit={(id) => { setEditing({ id }); setShowEditor(true) }}
            onPopover={(inst, el) => setPopoverTarget({ instance: inst, el })}
          />
        )}
      </div>

      {showEditor && (
        <ScheduleEditor
          onSave={handleSave}
          onCancel={() => { setShowEditor(false); setEditing(null) }}
          scheduleId={editing?.id ?? null}
        />
      )}

      {popoverTarget && (
        <SchedulePopover
          instance={popoverTarget.instance}
          onClose={() => setPopoverTarget(null)}
           onEdit={() => {
             const inst = popoverTarget.instance
             setEditing(inst.is_recurring ? { id: inst.original_id, date: inst.date } : { id: inst.original_id })
             setShowEditor(true)
             setPopoverTarget(null)
           }}
          onDelete={() => {
            const inst = popoverTarget.instance
            if (inst.is_recurring) {
              setDeleteTarget({ id: inst.original_id, date: inst.date, isRecurring: true })
            } else {
              remove(inst.original_id)
            }
            setPopoverTarget(null)
          }}
        />
      )}

      {showAIParser && (
        <ScheduleAIParser
          onSave={handleSaveAI}
          onClose={() => setShowAIParser(false)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">繰り返しの日程を削除</h3>
            <p className="text-sm text-slate-600 mb-6">この予定は繰り返し設定されています。削除方法を選んでください。</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  await remove(deleteTarget.id)
                  setDeleteTarget(null)
                }}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                すべて削除
              </button>
              <button
                onClick={async () => {
                  await excludeDate(deleteTarget.id, deleteTarget.date)
                  setDeleteTarget(null)
                }}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                今回のみ削除
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-400 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {editRecurringChoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">繰り返しの日程を編集</h3>
            <p className="text-sm text-slate-600 mb-6">この予定は繰り返し設定されています。編集方法を選んでください。</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleEditRecurringAll}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                すべての日程
              </button>
              <button
                onClick={handleEditRecurringThis}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                この日程のみ
              </button>
              <button
                onClick={() => setEditRecurringChoice(null)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm text-slate-400 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Month View ──

function MonthView({ baseDate, instances, apiCats, onPopover, onNavigateToWeek }: ViewProps & { onNavigateToWeek?: (date: Date) => void }) {
  const monthStart = startOfMonth(baseDate)
  const monthEnd = endOfMonth(baseDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const g: Record<string, typeof instances> = {}
    for (const inst of instances) {
      if (!g[inst.date]) g[inst.date] = []
      g[inst.date].push(inst)
    }
    return g
  }, [instances])

  const currentMonth = format(baseDate, 'yyyy-MM')

  const dayInstances = selectedDate ? grouped[selectedDate] ?? [] : []

  return (
    <>
      {/* PC: card grid */}
      <>
        <div className="grid grid-cols-7 bg-slate-50">
          {WEEKDAYS_JP.map((d) => (
            <div key={d} className="text-center text-xs text-slate-600 py-2 border-b border-r border-slate-200 last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-auto scrollbar-hide grid grid-cols-7">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayInsts = grouped[dateStr] ?? []
            const isCurrentMonth = format(day, 'yyyy-MM') === currentMonth
            const isTodayDate = isToday(day)
            const dayIndex = days.indexOf(day)
            const isLastCol = dayIndex % 7 === 6
            const isLastRow = dayIndex >= Math.floor((days.length - 1) / 7) * 7

            return (
              <div
                key={dateStr}
                className={`h-[150px] ${isLastRow ? '' : 'border-b'} ${isLastCol ? '' : 'border-r'} border-slate-200 p-3 cursor-pointer ${
                  isCurrentMonth ? (isTodayDate ? 'bg-blue-50' : '') : 'bg-slate-50/60'
                }`}
                onClick={() => onNavigateToWeek?.(day)}
              >
                <div className={`text-base mb-1 ${
                  isTodayDate ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : isCurrentMonth ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  {format(day, 'd')}
                </div>
                {dayInsts.slice(0, 4).map((inst) => (
                  <button
                    key={inst.id}
                    onClick={(e) => { e.stopPropagation(); onPopover(inst, e.currentTarget) }}
                    className="w-full text-left mb-0.5 group"
                  >
                    <div
                      className="text-xs rounded px-1 py-0.5 truncate"
                      style={{
                        backgroundColor: getCategoryStyle(inst.category, apiCats).bg,
                        borderLeft: `3px solid ${getCategoryStyle(inst.category, apiCats).color}`,
                      }}
                    >
                      {inst.time_start && <span className="text-slate-400 mr-0.5">{inst.time_start.slice(0, 5)}</span>}
                      <span className="font-medium text-slate-700">{inst.title}</span>
                    </div>
                  </button>
                ))}
                {dayInsts.length > 4 && (
                  <div className="text-xs text-slate-400 pl-1">+{dayInsts.length - 4} more</div>
                )}
              </div>
            )
          })}
        </div>
      </>

      {/* Mobile: top calendar + bottom list */}
      <div className="md:hidden">
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
          <div className="grid grid-cols-7">
            {WEEKDAYS_JP.map((d) => (
              <div key={d} className="text-center text-xs text-slate-400 py-2 border-b border-r border-slate-100 last:border-r-0">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayInsts = grouped[dateStr] ?? []
              const isCurrentMonth = format(day, 'yyyy-MM') === currentMonth
              const isTodayDate = isToday(day)
              const isSelected = selectedDate === dateStr
              const dayIndex = days.indexOf(day)
              const isLastCol = dayIndex % 7 === 6
              const isLastRow = dayIndex >= Math.floor((days.length - 1) / 7) * 7

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                  className={`min-h-[44px] ${isLastRow ? '' : 'border-b'} ${isLastCol ? '' : 'border-r'} border-slate-100 p-1 flex flex-col items-center justify-center ${
                    isCurrentMonth ? (isTodayDate ? 'bg-blue-50' : '') : 'bg-slate-50/60'
                  } ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <div className={`text-xs ${
                    isTodayDate ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : isCurrentMonth ? 'text-slate-400' : 'text-slate-300'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {dayInsts.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {[...new Set(dayInsts.map((i) => i.category))].slice(0, 4).map((cat) => (
                        <span
                          key={cat}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: getCategoryStyle(cat, apiCats).color }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bottom list */}
        {selectedDate && (
          <div className="border border-slate-200 rounded-lg p-3">
            <div className="text-sm font-medium text-slate-500 mb-2">{format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'M月d日 (E)', { locale: ja })}</div>
            {dayInstances.length === 0 && (
              <div className="text-sm text-slate-400">予定なし</div>
            )}
            {dayInstances.map((inst) => (
              <ScheduleListItem key={inst.id} inst={inst} apiCats={apiCats} onPopover={onPopover} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ── Week View ──

const HOUR_HEIGHT = 48
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function WeekView({ baseDate, instances, apiCats, onPopover, onNavigateToDay }: ViewProps & { onNavigateToDay?: (date: Date) => void }) {
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const scrollRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const allDayInstances = useMemo(() => instances.filter((i) => !i.time_start), [instances])
  const timedInstances = useMemo(() => instances.filter((i) => i.time_start), [instances])

  useEffect(() => {
    if (!scrollRef.current) return
    const top = (currentMinutes / 60) * HOUR_HEIGHT - scrollRef.current.clientHeight / 3
    scrollRef.current.scrollTop = Math.max(0, top)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* All-day section */}
      {allDayInstances.length > 0 && (
        <div className="border-b border-slate-200">
          <div className="flex" style={{ minHeight: 40 }}>
            <div className="w-12 flex-shrink-0" />
            <div className="flex-1 grid grid-cols-7">
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayAllDay = allDayInstances.filter((i) => i.date === dateStr)
                return (
                  <div key={dateStr} className="border-r border-slate-200 last:border-r-0 p-1">
                    {dayAllDay.map((inst) => (
                      <button
                        key={inst.id}
                        onClick={(e) => onPopover(inst, e.currentTarget)}
                        className="w-full text-left text-xs rounded px-1 py-0.5 truncate mb-0.5"
                        style={{
                          backgroundColor: getCategoryStyle(inst.category, apiCats).bg,
                          borderLeft: `3px solid ${getCategoryStyle(inst.category, apiCats).color}`,
                        }}
                      >
                        {inst.title}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Day headers */}
      <div className="flex border-b border-slate-200 sticky top-0  bg-slate-50 z-20">
        <div className="w-12 flex-shrink-0" />
        <div className="flex-1 grid grid-cols-7">
          {days.map((day) => (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className="text-center py-2 border-r border-slate-200 last:border-r-0 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => onNavigateToDay?.(day)}
            >
              <div className="text-xs text-slate-400">{format(day, 'E', { locale: ja })}</div>
              <div className={`text-sm font-medium ${
                isToday(day) ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto' : 'text-slate-700'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="relative overflow-auto scrollbar-hide" style={{ height: 24 * HOUR_HEIGHT }}>
        <div className="flex">
          <div className="w-12 flex-shrink-0 sticky left-0 z-10 bg-white">
            {HOURS.map((h) => (
              <div key={h} className="text-xs text-slate-300 text-right pr-2" style={{ height: HOUR_HEIGHT, lineHeight: `${HOUR_HEIGHT}px` }}>
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7">
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayTimed = timedInstances.filter((i) => i.date === dateStr)
              const isTodayDate = isToday(day)
              return (
                <div key={dateStr} className="relative border-r border-slate-100 last:border-r-0">
                  {HOURS.map((h) => (
                    <div key={h} className="border-b border-slate-100" style={{ height: HOUR_HEIGHT }} />
                  ))}
                  {dayTimed.map((inst) => {
                    const [sh, sm] = inst.time_start!.split(':').map(Number)
                    const [eh, em] = (inst.time_end ?? inst.time_start)!.split(':').map(Number)
                    const startMinutes = sh * 60 + sm
                    const endMinutes = eh * 60 + em
                    const top = (startMinutes / 60) * HOUR_HEIGHT
                    const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 24)
                    const cat = getCategoryStyle(inst.category, apiCats)
                    return (
                      <button
                        key={inst.id}
                        onClick={(e) => onPopover(inst, e.currentTarget)}
                        className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-xs overflow-hidden text-left transition-shadow hover:shadow-md z-10"
                        style={{
                          top,
                          height,
                          backgroundColor: cat.bg,
                          borderLeft: `3px solid ${cat.color}`,
                        }}
                      >
                        <div className="font-medium text-slate-700 truncate">{inst.title}</div>
                        <div className="text-slate-400">
                          {inst.time_start?.slice(0, 5)}{inst.time_end ? `-${inst.time_end.slice(0, 5)}` : ''}
                        </div>
                      </button>
                    )
                  })}
                  {/* Current time line (today only) */}
                  {isTodayDate && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: (currentMinutes / 60) * HOUR_HEIGHT }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                        <div className="flex-1 h-px bg-red-500" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Day View ──

function DayView({ instances, apiCats, onPopover }: ViewProps) {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    const top = (currentMinutes / 60) * HOUR_HEIGHT - scrollRef.current.clientHeight / 3
    scrollRef.current.scrollTop = Math.max(0, top)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const allDayInstances = useMemo(() => instances.filter((i) => !i.time_start), [instances])
  const timedInstances = useMemo(() => instances.filter((i) => i.time_start), [instances])

  return (
    <>
      {/* All-day */}
      {allDayInstances.length > 0 && (
        <div className="p-2 border-b border-slate-100">
          <div className="text-xs text-slate-400 mb-1">終日</div>
          {allDayInstances.map((inst) => (
            <button
              key={inst.id}
              onClick={(e) => onPopover(inst, e.currentTarget)}
              className="w-full text-left text-sm rounded px-2 py-1 mb-0.5"
              style={{
                backgroundColor: getCategoryStyle(inst.category, apiCats).bg,
                borderLeft: `3px solid ${getCategoryStyle(inst.category, apiCats).color}`,
              }}
            >
              {inst.title}
            </button>
          ))}
        </div>
      )}

      {/* Time axis */}
      <div ref={scrollRef} className="relative overflow-auto scrollbar-hide" style={{ height: 24 * HOUR_HEIGHT }}>
        <div className="flex">
          <div className="w-12 flex-shrink-0 sticky left-0 z-10 bg-white">
            {HOURS.map((h) => (
              <div key={h} className="text-xs text-slate-300 text-right pr-2" style={{ height: HOUR_HEIGHT, lineHeight: `${HOUR_HEIGHT}px` }}>
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
          <div className="flex-1 relative">
            {HOURS.map((h) => (
              <div key={h} className="border-b border-slate-100" style={{ height: HOUR_HEIGHT }} />
            ))}
            {timedInstances.map((inst) => {
              const [sh, sm] = inst.time_start!.split(':').map(Number)
              const [eh, em] = (inst.time_end ?? inst.time_start)!.split(':').map(Number)
              const top = sh * HOUR_HEIGHT + (sm / 60) * HOUR_HEIGHT
              const height = Math.max((eh - sh) * HOUR_HEIGHT + ((em - sm) / 60) * HOUR_HEIGHT, 24)
              const cat = getCategoryStyle(inst.category, apiCats)
              return (
                <button
                  key={inst.id}
                  onClick={(e) => onPopover(inst, e.currentTarget)}
                  className="absolute left-1 right-1 rounded px-2 py-1 text-sm overflow-hidden text-left transition-shadow hover:shadow-md z-10"
                  style={{
                    top,
                    height,
                    backgroundColor: cat.bg,
                    borderLeft: `3px solid ${cat.color}`,
                  }}
                >
                  <div className="font-medium text-slate-700">{inst.title}</div>
                  <div className="text-xs text-slate-400">
                    {inst.time_start?.slice(0, 5)}{inst.time_end ? ` - ${inst.time_end.slice(0, 5)}` : ''}
                  </div>
                </button>
              )
            })}
            {/* Current time line */}
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: (currentMinutes / 60) * HOUR_HEIGHT }}
            >
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Schedule List Item (mobile) ──

function ScheduleListItem({ inst, apiCats, onPopover }: { inst: any; apiCats: CategoryDefinition[]; onPopover: (inst: any, el: HTMLElement) => void }) {
  const cat = getCategoryStyle(inst.category, apiCats)
  return (
    <button
      onClick={(e) => onPopover(inst, e.currentTarget)}
      className="w-full text-left flex items-center gap-2 py-2 border-b border-slate-100 last:border-b-0 group"
    >
      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate">{inst.title}</div>
        <div className="text-xs text-slate-400">
          {inst.time_start ? `${inst.time_start.slice(0, 5)}` : '終日'}
          {inst.time_end ? ` - ${inst.time_end.slice(0, 5)}` : ''}
        </div>
      </div>
    </button>
  )
}

interface ViewProps {
  baseDate: Date
  instances: any[]
  apiCats: CategoryDefinition[]
  filters: Record<ScheduleCategory, boolean>
  onEdit: (id: string) => void
  onPopover: (instance: any, el: HTMLElement) => void
}

export { ScheduleListItem }
