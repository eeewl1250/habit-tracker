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

export function MatrixView({ tasks, days, logs, categoryColor, categoryBgColor, onChecked }: MatrixViewProps) {
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const toggleCollapse = (cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

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

  const [nameColWidth, setNameColWidth] = useState<number>(() => {
    const v = localStorage.getItem('matrix_name_col_width')
    return v ? Number(v) : 160
  })

  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging || !dragRef.current) return
      const delta = e.clientX - dragRef.current.startX
      const next = Math.max(80, Math.min(600, dragRef.current.startWidth + delta))
      setNameColWidth(next)
    }
    const onUp = () => {
      if (dragging) {
        localStorage.setItem('matrix_name_col_width', String(nameColWidth))
        setDragging(false)
        dragRef.current = null
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, nameColWidth])

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startWidth: nameColWidth }
    setDragging(true)
  }

  const headerCells: React.ReactNode[] = []
  const bodyCells: React.ReactNode[] = []
  const bodyRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const body = bodyRef.current
    const header = headerRef.current
    if (!body || !header) return
    const onScroll = () => { header.scrollLeft = body.scrollLeft }
    body.addEventListener('scroll', onScroll)
    return () => body.removeEventListener('scroll', onScroll)
  }, [])

  // Header row
  headerCells.push(
    <div key="corner" className="sticky top-0 left-0 z-30 bg-gray-50 border-b border-r border-gray-200"
      style={{ gridColumn: 1, gridRow: 1 }} />
  )
  days.forEach((day, di) => {
    headerCells.push(
      <div key={`hdr-${di}`}
        className={`text-center py-2 border-b border-gray-200 text-xs font-medium ${
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
    const collapsed = collapsedCats.has(category)
    bodyCells.push(
      <div key={`cat-${category}`}
        className="sticky left-0 z-10 px-3 py-1.5 text-xs font-bold border-b border-gray-200 border-r flex items-center gap-1"
        style={{ gridColumn: 1, gridRow: row, backgroundColor: bg, color }}>
        {category}
      </div>
    )
    bodyCells.push(
      <div key={`cat-fill-${category}`}
        className="border-b border-gray-200 relative flex items-center"
        style={{ gridColumn: `2 / ${colCount + 1}`, gridRow: row, backgroundColor: bg }}>
        <button
          onClick={() => toggleCollapse(category)}
          className="ml-auto mr-2 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          {collapsed ? '▶' : '▼'}
        </button>
      </div>
    )
  }

  const addTaskRows = (task: Task, target: React.ReactNode[], localRow: number) => {
    row++
    const color = getTaskColor(task, categoryColor)

    target.push(
      <div key={`name-${task.id}`}
        className="flex items-center gap-1.5 px-3 py-2 border-b border-r border-gray-100 bg-white sticky left-0 z-10 min-w-0"
        style={{ gridColumn: 1, gridRow: localRow }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-gray-800 font-medium truncate text-sm" title={task.name}>{task.name}</span>
      </div>
    )

    if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
      const freq = task.frequency!
      const base = getBaseDate(task)

      interface FreqGroup {
        days: Date[]; startIdx: number; partial: boolean; periodStart: Date; periodEnd: Date
      }
      const groups: FreqGroup[] = []

      const firstDiff = Math.round((days[0].getTime() - base.getTime()) / 86400000)
      const firstPeriodStart = getPeriodStart(firstDiff, freq)
      if (firstDiff !== firstPeriodStart) {
        const offset = firstDiff - firstPeriodStart
        const span = Math.min(freq - offset, days.length)
        const ps = new Date(base.getTime() + firstPeriodStart * 86400000)
        const pe = new Date(ps.getTime() + (freq - 1) * 86400000)
        groups.push({ days: days.slice(0, span), startIdx: 0, partial: true, periodStart: ps, periodEnd: pe })
      }

      for (let i = groups.length > 0 ? groups[0].days.length : 0; i < days.length; i++) {
        const day = days[i]
        const diff = Math.round((day.getTime() - base.getTime()) / 86400000)
        const periodStart = getPeriodStart(diff, freq)
        if (diff === periodStart) {
          const groupDays = [day]
          for (let j = 1; j < freq && i + j < days.length; j++) {
            groupDays.push(days[i + j])
          }
          const ps = day
          const pe = new Date(ps.getTime() + (freq - 1) * 86400000)
          groups.push({ days: groupDays, startIdx: i, partial: false, periodStart: ps, periodEnd: pe })
          i += freq - 1
        }
      }

      const logsList = logs.logs
      const getLogForGroup = (g: FreqGroup): DailyLog | undefined => {
        const s = format(g.periodStart, 'yyyy-MM-dd')
        const e = format(g.periodEnd, 'yyyy-MM-dd')
        return getLogInRange(logsList, task.id, s, e)
      }
      const isGroupChecked = (g: FreqGroup): boolean => {
        const s = format(g.periodStart, 'yyyy-MM-dd')
        const e = format(g.periodEnd, 'yyyy-MM-dd')
        return isCheckedInRange(logsList, task.id, s, e)
      }
      const toggleGroup = async (g: FreqGroup) => {
        const s = format(g.periodStart, 'yyyy-MM-dd')
        const existing = getLogInRange(logsList, task.id, s, s)
        if (existing) {
          await logs.undo(existing.id)
        } else {
          await logs.check(task.id, s)
          onChecked?.(task.id, task.name)
        }
      }

      groups.forEach((group, gi) => {
        const checked = isGroupChecked(group)
        const log = getLogForGroup(group)
        const firstDay = group.days[0]
        const today = isToday(firstDay)
        const span = group.days.length

        target.push(
          <div key={`g-${task.id}-${gi}`}
            className={`relative flex items-center justify-center py-2 border-b border-gray-100 min-w-0 ${
              today ? 'bg-blue-50' : (group.partial ? 'bg-gray-50/50' : 'bg-white')
            }`}
            style={{ gridColumn: `${group.startIdx + 2} / span ${span}`, gridRow: localRow }}>
            <div className={`absolute inset-0 mx-1 my-1 rounded-md border-2 border-dashed ${
              checked ? 'border-blue-200 bg-blue-50/50' : (group.partial ? 'border-gray-300' : 'border-gray-200')
            }`} />
            <div className="relative flex items-center gap-1">
              <input type="checkbox" checked={checked}
                onChange={() => toggleGroup(group)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              {checked && log && (
                <MemoIcon log={log} onMemoUpdate={() => {}} />
              )}
            </div>
            {group.days.length > 1 && (
              <span className="absolute bottom-0.5 text-[9px] text-gray-400">
                {format(group.periodStart, 'd')}-{format(group.periodEnd, 'd')}
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
          target.push(
            <div key={`cb-${task.id}-${di}`}
              className={`flex items-center justify-center py-2 border-b border-gray-100 min-w-0 ${
                today ? 'bg-blue-50/50' : 'bg-white'
              }`}
              style={{ gridColumn: di + 2, gridRow: localRow }} />
          )
          return
        }

        target.push(
          <div key={`cb-${task.id}-${di}`}
            className={`flex items-center justify-center gap-0.5 py-2 border-b border-gray-100 min-w-0 ${
              today ? 'bg-blue-50' : 'bg-white'
            }`}
            style={{ gridColumn: di + 2, gridRow: localRow }}>
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

  const renderCategory = (category: string, catTasks: Task[], bg: string, color: string) => {
    addCategoryRow(category, bg, color)
    const taskStartRow = row + 1
    const taskCells: React.ReactNode[] = []
    let localRow = 0
    catTasks.forEach((task) => {
      localRow++
      addTaskRows(task, taskCells, localRow)
    })
    const collapsed = collapsedCats.has(category)
    bodyCells.push(
      <div key={`wrap-${category}`}
        className={`transition-all duration-300 overflow-clip ${
          collapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        }`}
        style={{ gridColumn: `1 / ${colCount + 1}`, gridRow: `${taskStartRow} / ${taskStartRow + catTasks.length}` }}>
        <div
          className="grid gap-0 text-sm"
          style={{ gridTemplateColumns: `${nameColWidth}px repeat(${days.length}, minmax(36px, 1fr))` }}
        >
          {taskCells}
        </div>
      </div>
    )
  }

  grouped.grouped.forEach(([category, catTasks]) => {
    const bg = categoryBgColor.get(category) ?? '#F9FAFB'
    const color = categoryColor.get(category) ?? '#4CAF50'
    renderCategory(category, catTasks, bg, color)
  })

  if (grouped.uncategorized.length > 0) {
    renderCategory('その他', grouped.uncategorized, '#F9FAFB', '#6B7280')
  }

  return (
    <div className="relative">
      <div ref={headerRef} className="sticky top-[57px] z-20 bg-gray-50 overflow-hidden border-b border-gray-200"
        style={{ marginTop: '-1px' }}>
        <div
          className="grid gap-0 text-sm"
          style={{ gridTemplateColumns: `${nameColWidth}px repeat(${days.length}, minmax(36px, 1fr))` }}
        >
          {headerCells}
        </div>
      </div>
      <div ref={bodyRef} className="overflow-x-auto">
        <div
          className="grid gap-0 text-sm"
          style={{ gridTemplateColumns: `${nameColWidth}px repeat(${days.length}, minmax(36px, 1fr))` }}
        >
          {bodyCells}
        </div>
      </div>
      {/* Vertical resizer */}
      <div
        onMouseDown={startDrag}
        style={{ left: nameColWidth - 4, top: 0, bottom: 0 }}
        className={`absolute z-40 w-8 cursor-col-resize`}
        aria-hidden
      >
        <div className="h-full w-1 mx-auto" style={{
              position: 'relative',
              left: '-50%',
              opacity: .13
          }} />
      </div>
    </div>
  )
}


