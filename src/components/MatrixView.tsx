import { useState, useRef, useEffect, useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Task, DailyLog } from '../types'
import { WEEKDAY_MAP } from '../types'
import { updateLogMemo } from '../lib/api'

interface MatrixViewProps {
  tasks: Task[]
  days: Date[]
  logs: {
    logs: DailyLog[]
    isChecked: (taskId: string, date: string) => boolean
    getLogId: (taskId: string, date: string) => string | undefined
    check: (taskId: string, date: string) => Promise<DailyLog>
    undo: (logId: string) => Promise<void>
  }
  categoryColor: Map<string, string>
  categoryBgColor: Map<string, string>
  onChecked?: (taskId: string, taskName: string) => void
  noteTaskIds?: Set<string>
  onViewNotes?: (taskId: string) => void
}

const dayColors: Record<string, string> = {
  '月': 'text-gray-600', '火': 'text-gray-600', '水': 'text-gray-600',
  '木': 'text-gray-600', '金': 'text-gray-600',
  '土': 'text-blue-500', '日': 'text-red-400',
}

function getBaseDate(task: Task): Date {
  return task.base_date ? new Date(task.base_date + 'T00:00:00') : new Date(task.created_at)
}

function getPeriodStart(diff: number, freq: number): number {
  return Math.floor(diff / freq) * freq
}

function isDayActive(task: Task, date: Date): boolean {
  if (task.period_type === 'weekday' && task.weekdays) {
    const days: string[] = JSON.parse(task.weekdays)
    return days.some((k) => WEEKDAY_MAP[k] === date.getDay())
  }
  if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
    const base = getBaseDate(task)
    const diff = Math.round((date.getTime() - base.getTime()) / 86400000)
    return diff === getPeriodStart(diff, task.frequency)
  }
  return true
}

function isCheckedInRange(logs: DailyLog[], taskId: string, start: string, end: string): boolean {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return logs.some((l) => {
    if (l.task_id !== taskId) return false
    const t = new Date(l.date).getTime()
    return t >= s && t <= e
  })
}

function getLogInRange(logs: DailyLog[], taskId: string, start: string, end: string): DailyLog | undefined {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return logs.find((l) => {
    if (l.task_id !== taskId) return false
    const t = new Date(l.date).getTime()
    return t >= s && t <= e
  })
}

function getTaskColor(task: Task, categoryColor: Map<string, string>): string {
  if (task.category) return categoryColor.get(task.category) ?? '#4CAF50'
  return '#4CAF50'
}

function MemoIcon({ log, onMemoUpdate }: { log?: DailyLog; onMemoUpdate: () => void }) {
  const [showInput, setShowInput] = useState(false)
  const [memo, setMemo] = useState(log?.memo ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMemo(log?.memo ?? '')
  }, [log?.memo])

  useEffect(() => {
    if (showInput) inputRef.current?.focus()
  }, [showInput])

  if (!log) return null

  return (
    <div className="relative inline-flex items-center">
      {showInput ? (
        <input
          ref={inputRef}
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={() => {
            if (memo !== (log.memo ?? '')) {
              updateLogMemo(log.id, memo).then(onMemoUpdate)
            }
            setShowInput(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateLogMemo(log.id, memo).then(onMemoUpdate)
              setShowInput(false)
            }
            if (e.key === 'Escape') setShowInput(false)
          }}
          className="w-20 px-1 py-0.5 text-xs border border-gray-300 rounded"
          onClick={(e) => e.stopPropagation()}
        />
      ) : log.memo ? (
        <span
          className="text-[10px] text-gray-400 cursor-default ml-0.5"
          title={log.memo}
          onClick={(e) => {
            e.stopPropagation()
            setShowInput(true)
          }}
        >
          📝
        </span>
      ) : null}
    </div>
  )
}

export function MatrixView({ tasks, days, logs, categoryColor, categoryBgColor, onChecked, noteTaskIds, onViewNotes }: MatrixViewProps) {
  const grouped = useMemo(() => {
    const active = tasks.filter((t) => t.status === 'active')
    const map = new Map<string, Task[]>()
    const uncategorized: Task[] = []
    for (const t of active) {
      if (t.category) {
        if (!map.has(t.category)) map.set(t.category, [])
        map.get(t.category)!.push(t)
      } else {
        uncategorized.push(t)
      }
    }
    const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    return { grouped: sorted, uncategorized }
  }, [tasks])

  const colCount = 1 + days.length

  const cells: React.ReactNode[] = []

  // Header row
  cells.push(
    <div key="corner" className="sticky top-0 left-0 z-30 bg-gray-50 border-b border-r border-gray-200"
      style={{ gridColumn: 1, gridRow: 1 }} />
  )
  days.forEach((day, di) => {
    cells.push(
      <div key={`hdr-${di}`}
        className={`text-center py-2 border-b border-gray-200 text-xs font-medium sticky top-0 z-20 ${
          isToday(day) ? 'bg-blue-100' : 'bg-gray-50'
        } ${dayColors[format(day, 'E', { locale: ja })] ?? 'text-gray-600'}`}
        style={{ gridColumn: di + 2, gridRow: 1 }}>
        <div>{format(day, 'E', { locale: ja })}</div>
        <div className="text-sm">{format(day, 'd')}</div>
      </div>
    )
  })

  let row = 1

  const addCategoryRow = (category: string, bg: string, color: string) => {
    row++
    cells.push(
      <div key={`cat-${category}`}
        className="sticky left-0 z-10 px-3 py-1.5 text-xs font-bold border-b border-gray-200 border-r"
        style={{ gridColumn: 1, gridRow: row, backgroundColor: bg, color }}>
        {category}
      </div>
    )
    cells.push(
      <div key={`cat-fill-${category}`}
        className="border-b border-gray-200"
        style={{ gridColumn: `2 / ${colCount + 1}`, gridRow: row, backgroundColor: bg }} />
    )
  }

  const addTaskRow = (task: Task) => {
    row++
    const color = getTaskColor(task, categoryColor)

    cells.push(
      <div key={`name-${task.id}`}
        className="flex items-center gap-1.5 px-3 py-2 border-b border-r border-gray-100 bg-white sticky left-0 z-10 min-w-0"
        style={{ gridColumn: 1, gridRow: row }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-gray-800 font-medium truncate text-sm">{task.name}</span>
        {noteTaskIds?.has(task.id) && (
          <button onClick={(e) => { e.stopPropagation(); onViewNotes?.(task.id) }}
            className="text-xs text-blue-400 hover:text-blue-600 flex-shrink-0 ml-auto" title="メモを見る">
            📝
          </button>
        )}
      </div>
    )

    if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
      const freq = task.frequency!
      const base = getBaseDate(task)

      const groups: { days: Date[]; startIdx: number }[] = []
      for (let i = 0; i < days.length; i++) {
        const day = days[i]
        const diff = Math.round((day.getTime() - base.getTime()) / 86400000)
        const periodStart = getPeriodStart(diff, freq)
        if (diff === periodStart) {
          const groupDays = [day]
          for (let j = 1; j < freq && i + j < days.length; j++) {
            groupDays.push(days[i + j])
          }
          groups.push({ days: groupDays, startIdx: i })
          i += freq - 1
        }
      }

      const logsList = logs.logs
      const getLogForGroup = (groupDays: Date[]): DailyLog | undefined => {
        const s = format(groupDays[0], 'yyyy-MM-dd')
        const e = format(groupDays[groupDays.length - 1], 'yyyy-MM-dd')
        return getLogInRange(logsList, task.id, s, e)
      }
      const isGroupChecked = (groupDays: Date[]): boolean => {
        const s = format(groupDays[0], 'yyyy-MM-dd')
        const e = format(groupDays[groupDays.length - 1], 'yyyy-MM-dd')
        return isCheckedInRange(logsList, task.id, s, e)
      }
      const toggleGroup = async (groupDays: Date[]) => {
        const s = format(groupDays[0], 'yyyy-MM-dd')
        const existing = getLogInRange(logsList, task.id, s, s)
        if (existing) {
          await logs.undo(existing.id)
        } else {
          await logs.check(task.id, s)
          onChecked?.(task.id, task.name)
        }
      }

      groups.forEach((group, gi) => {
        const checked = isGroupChecked(group.days)
        const log = getLogForGroup(group.days)
        const firstDay = group.days[0]
        const today = isToday(firstDay)
        const span = group.days.length

        cells.push(
          <div key={`g-${task.id}-${gi}`}
            className={`relative flex items-center justify-center py-2 border-b border-gray-100 min-w-0 ${
              today ? 'bg-blue-50' : 'bg-white'
            }`}
            style={{ gridColumn: `${group.startIdx + 2} / span ${span}`, gridRow: row }}>
            <div className={`absolute inset-0 mx-1 my-1 rounded-md border-2 border-dashed ${
              checked ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'
            }`} />
            <div className="relative flex items-center gap-1">
              <input type="checkbox" checked={checked}
                onChange={() => toggleGroup(group.days)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              {checked && log && (
                <MemoIcon log={log} onMemoUpdate={() => {}} />
              )}
            </div>
            {group.days.length > 1 && (
              <span className="absolute bottom-0.5 text-[9px] text-gray-400">
                {format(group.days[0], 'd')}-{format(group.days[group.days.length - 1], 'd')}
              </span>
            )}
          </div>
        )
      })
    } else {
      days.forEach((day, di) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const active = isDayActive(task, day)
        const today = isToday(day)
        const checked = logs.isChecked(task.id, dateStr)
        const log = logs.logs.find((l) => l.task_id === task.id && l.date === dateStr)

        if (!active) {
          cells.push(
            <div key={`cb-${task.id}-${di}`}
              className={`flex items-center justify-center py-2 border-b border-gray-100 min-w-0 ${
                today ? 'bg-blue-50/50' : 'bg-white'
              }`}
              style={{ gridColumn: di + 2, gridRow: row }} />
          )
          return
        }

        cells.push(
          <div key={`cb-${task.id}-${di}`}
            className={`flex items-center justify-center gap-0.5 py-2 border-b border-gray-100 min-w-0 ${
              today ? 'bg-blue-50' : 'bg-white'
            }`}
            style={{ gridColumn: di + 2, gridRow: row }}>
            <input type="checkbox" checked={checked}
              onChange={async () => {
                if (checked) { const id = logs.getLogId(task.id, dateStr); if (id) await logs.undo(id) }
                else { await logs.check(task.id, dateStr); onChecked?.(task.id, task.name) }
              }}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
            {checked && <MemoIcon log={log} onMemoUpdate={() => {}} />}
          </div>
        )
      })
    }
  }

  grouped.grouped.forEach(([category, catTasks]) => {
    const bg = categoryBgColor.get(category) ?? '#F9FAFB'
    const color = categoryColor.get(category) ?? '#4CAF50'
    addCategoryRow(category, bg, color)
    catTasks.forEach(addTaskRow)
  })

  if (grouped.uncategorized.length > 0) {
    addCategoryRow('その他', '#F9FAFB', '#6B7280')
    grouped.uncategorized.forEach(addTaskRow)
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-0 text-sm"
        style={{ gridTemplateColumns: `160px repeat(${days.length}, minmax(36px, 1fr))` }}
      >
        {cells}
      </div>
    </div>
  )
}


