import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { format, parseISO, differenceInMinutes, getHours, getMinutes, subDays, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { SleepLog } from '../types'

interface SleepViewProps {
  sleepLogs: SleepLog[]
  days: Date[]
  onRecordSleep2Time: () => void
  onRecordWake2Time: () => void
  onUpdateTimes: (date: string, updates: {
    bed_time?: string | null
    sleep_time?: string | null
    wake_time?: string | null
    sleep2_time?: string | null
    wake2_time?: string | null
  }) => void
}

const CELL_COUNT = 30
const HOUR_LABELS: { label: string; lineIdx: number }[] = Array.from({ length: 16 }, (_, i) => {
  const h = (21 + i) % 24
  return { label: `${h}`, lineIdx: i * 2 }
})
const RED_LINES = [
  { label: '23:00', lineIdx: 4 },
  { label: '8:00', lineIdx: 22 },
]

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = parseISO(iso)
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

function parseDatetimeLocal(value: string): string {
  if (!value) return ''
  return new Date(value).toISOString()
}

function formatTime(iso: string | null | undefined, dateStr?: string): string {
  if (!iso) return '--:--'
  const d = parseISO(iso)
  const h = getHours(d)
  if (dateStr) {
    const dateFromIso = format(d, 'yyyy-MM-dd')
    const displayH = dateFromIso !== dateStr ? h + 24 : h
    return `${String(displayH).padStart(2, '0')}:${String(getMinutes(d)).padStart(2, '0')}`
  }
  return `${String(h).padStart(2, '0')}:${String(getMinutes(d)).padStart(2, '0')}`
}

function computeNightEnds(dateStr: string): Date {
  return parseISO(`${dateStr}T21:00:00`)
}

function fmt24(iso: string | null | undefined): string {
  if (!iso) return '--:--'
  return format(parseISO(iso), 'HH:mm')
}

function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分`
  return `${Math.round(minutes / 6) / 10}h`
}

function calcLatency(log: SleepLog): number | null {
  if (!log.bed_time || !log.sleep_time) return null
  return differenceInMinutes(parseISO(log.sleep_time), parseISO(log.bed_time))
}

function calcEfficiency(log: SleepLog): number | null {
  if (!log.bed_time || !log.sleep_time || !log.wake_time) return null
  const inBed = differenceInMinutes(parseISO(log.wake_time), parseISO(log.bed_time))
  const asleep = differenceInMinutes(parseISO(log.wake_time), parseISO(log.sleep_time))
  if (inBed <= 0) return null
  return Math.round((asleep / inBed) * 100)
}

function calcTotalSleep(log: SleepLog): number | null {
  if (!log.sleep_time || !log.wake_time) return null
  let total = differenceInMinutes(parseISO(log.wake_time), parseISO(log.sleep_time))
  if (log.sleep2_time && log.wake2_time) {
    total += differenceInMinutes(parseISO(log.wake2_time), parseISO(log.sleep2_time))
  }
  return Math.round(total / 6) / 10
}

export function SleepView({ sleepLogs, days, onRecordSleep2Time, onRecordWake2Time, onUpdateTimes }: SleepViewProps) {
  const today = format(new Date(), 'yyyy-MM-dd')

  const [editModal, setEditModal] = useState<{
    dateStr: string
    bedTime: string
    sleepTime: string
    wakeTime: string
    sleep2Time: string
    wake2Time: string
  } | null>(null)

  const [skipSecondSleep, setSkipSecondSleep] = useState(false)

  const [resetPicker, setResetPicker] = useState(false)

  const [mobileDate, setMobileDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  const mobileLog = useMemo(() => sleepLogs.find((l) => l.date === mobileDate), [sleepLogs, mobileDate])

  const yesterday = useMemo(() => format(subDays(new Date(), 1), 'yyyy-MM-dd'), [])

  const yesterdayLog = useMemo(() => sleepLogs.find((l) => l.date === yesterday), [sleepLogs, yesterday])

  const draftCache = useRef<Record<string, {
    bedTime: string
    sleepTime: string
    wakeTime: string
    sleep2Time: string
    wake2Time: string
  }>>({})

  const closeModal = useCallback(() => {
    if (!editModal) return
    draftCache.current[editModal.dateStr] = {
      bedTime: editModal.bedTime,
      sleepTime: editModal.sleepTime,
      wakeTime: editModal.wakeTime,
      sleep2Time: editModal.sleep2Time,
      wake2Time: editModal.wake2Time,
    }
    setEditModal(null)
  }, [editModal])

  const monthLogs = useMemo(() => {
    const dayStrs = days.map((d) => format(d, 'yyyy-MM-dd'))
    return dayStrs.map((d) => sleepLogs.find((l) => l.date === d))
  }, [sleepLogs, days])

  const handleDateClick = useCallback((dateStr: string) => {
    const cached = draftCache.current[dateStr]
    if (cached) {
      setEditModal({ dateStr, ...cached })
      return
    }
    const log = sleepLogs.find((l) => l.date === dateStr)
    const withDefault = (iso: string | null | undefined) => toDatetimeLocalValue(iso) || `${dateStr}T`
    setEditModal({
      dateStr,
      bedTime: withDefault(log?.bed_time),
      sleepTime: withDefault(log?.sleep_time),
      wakeTime: withDefault(log?.wake_time),
      sleep2Time: toDatetimeLocalValue(log?.sleep2_time),
      wake2Time: toDatetimeLocalValue(log?.wake2_time),
    })
  }, [sleepLogs])

  const handleModalSave = useCallback(() => {
    if (!editModal) return
    const updates: {
      bed_time?: string | null
      sleep_time?: string | null
      wake_time?: string | null
      sleep2_time?: string | null
      wake2_time?: string | null
    } = {}
    updates.bed_time = editModal.bedTime ? parseDatetimeLocal(editModal.bedTime) : null
    updates.sleep_time = editModal.sleepTime ? parseDatetimeLocal(editModal.sleepTime) : null
    updates.wake_time = editModal.wakeTime ? parseDatetimeLocal(editModal.wakeTime) : null
    updates.sleep2_time = editModal.sleep2Time ? parseDatetimeLocal(editModal.sleep2Time) : null
    updates.wake2_time = editModal.wake2Time ? parseDatetimeLocal(editModal.wake2Time) : null
    onUpdateTimes(editModal.dateStr, updates)
    delete draftCache.current[editModal.dateStr]
    setEditModal(null)
  }, [editModal, onUpdateTimes])

  useEffect(() => {
    if (!editModal) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
      if (e.key === 'Enter') handleModalSave()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editModal, handleModalSave, closeModal])

  const pct = (lineIdx: number) => `${(lineIdx / CELL_COUNT) * 100}%`

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* ── Mobile ── */}
      <div className="block md:hidden px-4 pt-8 pb-24">
        <h2 className="text-center text-lg font-bold mb-1">{mobileDate === today ? '今日の睡眠' : '睡眠記録'}</h2>
        {/* 日付ナビゲーション */}
        <div className="flex items-center justify-center gap-4 mb-2">
          <button
            onClick={() => setMobileDate((p) => format(subDays(parseISO(p), 1), 'yyyy-MM-dd'))}
            className="text-slate-400 hover:text-white text-lg px-2"
          >
            ‹
          </button>
          <span className="text-sm text-slate-400 font-mono">
            {format(parseISO(mobileDate), 'M月d日（E）', { locale: ja })}
          </span>
          <button
            onClick={() => setMobileDate((p) => format(addDays(parseISO(p), 1), 'yyyy-MM-dd'))}
            disabled={mobileDate === today}
            className="text-slate-400 hover:text-white text-lg px-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>

        {/* 昨日未記録リマインダー */}
        {yesterdayLog && !yesterdayLog.bed_time && !yesterdayLog.sleep_time && !yesterdayLog.wake_time && yesterday !== mobileDate && (
          <div className="bg-amber-900/40 border border-amber-700/50 rounded-xl p-3 text-center mb-4">
            <div className="text-sm text-amber-300">昨日の睡眠が未記録です</div>
            <button
              onClick={() => setMobileDate(yesterday)}
              className="mt-1 text-xs text-amber-400 underline hover:text-amber-300"
            >
              昨日を記録する
            </button>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          {/* 上床 */}
          {mobileLog?.bed_time ? (
            <div className="w-full text-center">
              <div className="text-sm text-slate-400 mb-1">ベッドに入った</div>
              <div className="text-xl font-mono">{formatTime(mobileLog.bed_time)}</div>
            </div>
          ) : mobileDate === today ? (
            <div className="w-full flex gap-2">
              <button
                onClick={() => onUpdateTimes(mobileDate, { bed_time: new Date().toISOString() })}
                className="flex-1 py-6 text-xl font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-lg shadow-indigo-600/30"
              >
                🛌 寝た
              </button>
              <button
                onClick={() => handleDateClick(mobileDate)}
                className="w-14 py-6 text-lg rounded-2xl bg-indigo-600/60 hover:bg-indigo-500/80 active:scale-95 transition-all"
                title="時間を指定"
              >
                ✎
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleDateClick(mobileDate)}
              className="w-full py-6 text-xl font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-lg shadow-indigo-600/30"
            >
              🛌 寝た
            </button>
          )}

          {/* 入眠 */}
          {mobileLog?.sleep_time ? (
            <div className="w-full text-center">
              <div className="text-sm text-slate-400 mb-1">眠りについた</div>
              <div className="text-xl font-mono">{formatTime(mobileLog.sleep_time)}</div>
              {mobileLog?.bed_time && calcLatency(mobileLog) !== null && (
                <div className="text-sm text-yellow-400 mt-1">
                  入眠まで {calcLatency(mobileLog)} 分
                </div>
              )}
            </div>
          ) : mobileDate === today ? (
            <div className="w-full flex gap-2">
              <button
                onClick={() => onUpdateTimes(mobileDate, { sleep_time: new Date().toISOString() })}
                className="flex-1 py-6 text-xl font-bold rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all shadow-lg shadow-purple-600/30"
              >
                ✨ 寝た
              </button>
              <button
                onClick={() => handleDateClick(mobileDate)}
                className="w-14 py-6 text-lg rounded-2xl bg-purple-600/60 hover:bg-purple-500/80 active:scale-95 transition-all"
                title="時間を指定"
              >
                ✎
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleDateClick(mobileDate)}
              className="w-full py-6 text-xl font-bold rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all shadow-lg shadow-purple-600/30"
            >
              ✨ 寝た
            </button>
          )}

          {/* 起床 */}
          {mobileLog?.wake_time ? (
            <div className="w-full text-center">
              <div className="text-sm text-slate-400 mb-1">起きた</div>
              <div className="text-xl font-mono">{formatTime(mobileLog.wake_time)}</div>
            </div>
          ) : mobileDate === today ? (
            <div className="w-full flex gap-2">
              <button
                onClick={() => onUpdateTimes(mobileDate, { wake_time: new Date().toISOString() })}
                className="flex-1 py-6 text-xl font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-600/30"
              >
                ☀️ 起きた
              </button>
              <button
                onClick={() => handleDateClick(mobileDate)}
                className="w-14 py-6 text-lg rounded-2xl bg-emerald-600/60 hover:bg-emerald-500/80 active:scale-95 transition-all"
                title="時間を指定"
              >
                ✎
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleDateClick(mobileDate)}
              className="w-full py-6 text-xl font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-600/30"
            >
              ☀️ 起きた
            </button>
          )}

          {/* サマリー */}
          {mobileLog?.bed_time && mobileLog?.sleep_time && mobileLog?.wake_time && (
            <div className="w-full bg-slate-800 rounded-xl p-4 space-y-2 text-center">
              <div className="text-sm text-slate-400">サマリー</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-lg font-bold text-indigo-300">{calcLatency(mobileLog) ?? '-'}</div>
                  <div className="text-xs text-slate-400">入眠(分)</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-300">{calcTotalSleep(mobileLog) ?? '-'}</div>
                  <div className="text-xs text-slate-400">睡眠(h)</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-300">{calcEfficiency(mobileLog) != null ? `${calcEfficiency(mobileLog)}%` : '-'}</div>
                  <div className="text-xs text-slate-400">効率</div>
                </div>
              </div>
            </div>
          )}

          {/* 二度寝 */}
          {mobileLog?.bed_time && mobileLog?.sleep_time && mobileLog?.wake_time && !skipSecondSleep && !mobileLog?.sleep2_time && (
            <button
              onClick={onRecordSleep2Time}
              className="w-full py-5 text-lg font-bold rounded-2xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 transition-all shadow-lg shadow-cyan-600/30"
            >
              💤 二度寝した
            </button>
          )}
          {mobileLog?.sleep2_time && !mobileLog?.wake2_time && (
            <div className="w-full text-center">
              <div className="text-sm text-slate-400 mb-1">二度寝</div>
              <div className="text-xl font-mono">{formatTime(mobileLog.sleep2_time)}</div>
              <button
                onClick={onRecordWake2Time}
                className="w-full mt-3 py-5 text-lg font-bold rounded-2xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 transition-all shadow-lg shadow-cyan-600/30"
              >
                ☀️ 二度寝から起きた
              </button>
            </div>
          )}
          {mobileLog?.sleep2_time && mobileLog?.wake2_time && (
            <div className="w-full text-center">
              <div className="text-sm text-slate-400 mb-1">二度寝</div>
              <div className="text-sm font-mono text-cyan-300">
                {formatTime(mobileLog.sleep2_time)} → {formatTime(mobileLog.wake2_time)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {(() => {
                  const d = differenceInMinutes(parseISO(mobileLog.wake2_time), parseISO(mobileLog.sleep2_time));
                  return `${Math.round(d)}分`;
                })()}
              </div>
            </div>
          )}
          {mobileLog?.bed_time && mobileLog?.sleep_time && mobileLog?.wake_time && !mobileLog?.sleep2_time && (
            <button
              onClick={() => setSkipSecondSleep(true)}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              二度寝しない
            </button>
          )}

          {/* 編集 */}
          {(mobileLog?.bed_time || mobileLog?.sleep_time || mobileLog?.wake_time) && (
            <button
              onClick={() => handleDateClick(mobileDate)}
              className="w-full py-4 text-base font-bold rounded-2xl bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all shadow-lg"
            >
              時間を編集する
            </button>
          )}

          {/* リセット */}
          {resetPicker ? (
            <div className="w-full space-y-2 mt-2">
              <div className="text-xs text-slate-400 text-center">
                {format(parseISO(mobileDate), 'M/d（E）', { locale: ja })} のデータをリセット？
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setResetPicker(false)}
                  className="flex-1 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    onUpdateTimes(mobileDate, {
                      bed_time: null,
                      sleep_time: null,
                      wake_time: null,
                      sleep2_time: null,
                      wake2_time: null,
                    })
                    setResetPicker(false)
                    setSkipSecondSleep(false)
                  }}
                  className="flex-1 py-2 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  リセット
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setResetPicker(true)}
              className="w-full text-sm text-blue-300/60 hover:text-blue-300 transition-colors text-center mt-2"
            >
              睡眠データをリセット
            </button>
          )}
        </div>
        </div>

      {/* ── PC: Grid + modal ── */}
      <div className="hidden md:block p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">平均入眠時間</div>
              {(() => {
                const w = sleepLogs.filter((l) => l.sleep_time)
                if (w.length === 0) return <div className="text-lg font-bold">--:--</div>
                const avg = Math.round(w.reduce((s, l) => s + parseISO(l.sleep_time!).getHours() * 60 + parseISO(l.sleep_time!).getMinutes(), 0) / w.length)
                return <div className="text-lg font-bold">{String(Math.floor(avg / 60)).padStart(2, '0')}:{String(avg % 60).padStart(2, '0')}</div>
              })()}
            </div>
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">平均睡眠時間</div>
              {(() => {
                const w = sleepLogs.filter((l) => l.sleep_time && l.wake_time)
                if (w.length === 0) return <div className="text-lg font-bold">-</div>
                const avg = w.reduce((s, l) => {
                  let total = differenceInMinutes(parseISO(l.wake_time!), parseISO(l.sleep_time!))
                  if (l.sleep2_time && l.wake2_time) {
                    total += differenceInMinutes(parseISO(l.wake2_time), parseISO(l.sleep2_time))
                  }
                  return s + total
                }, 0) / w.length
                return <div className="text-lg font-bold">{Math.round(avg / 6) / 10}h</div>
              })()}
            </div>
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">平均入眠潜時</div>
              {(() => {
                const w = sleepLogs.filter((l) => l.bed_time && l.sleep_time)
                if (w.length === 0) return <div className="text-lg font-bold">-</div>
                const avg = w.reduce((s, l) => s + differenceInMinutes(parseISO(l.sleep_time!), parseISO(l.bed_time!)), 0) / w.length
                return <div className="text-lg font-bold">{Math.round(avg)}分</div>
              })()}
            </div>
          </div>

          {/* Grid */}
          <div className="bg-slate-800 rounded-xl">
            <div className="relative p-2">
              {/* X-axis header (labels on grid lines) */}
              <div className="relative h-5 mb-1" style={{ marginLeft: '88px' }}>
                {HOUR_LABELS.map(({ label, lineIdx }) => (
                  <div
                    key={label}
                    className={`absolute text-[10px] -translate-x-1/2 top-0 whitespace-nowrap ${
                      lineIdx === 4 || lineIdx === 22 ? 'text-red-400/80 font-bold' : 'text-slate-500'
                    }`}
                    style={{ left: pct(lineIdx) }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Grid body */}
              <div className="relative">
                {/* Red lines (overlay) */}
                <div className="absolute inset-0 pointer-events-none" style={{ left: '88px' }}>
                  {RED_LINES.map(({ label, lineIdx }) => (
                    <div
                      key={label}
                      className="absolute top-0 bottom-0 w-px bg-red-500/60"
                      style={{ left: pct(lineIdx) }}
                    />
                  ))}
                </div>

                {/* Rows */}
                {monthLogs.map((log, i) => {
                  const dateStr = format(days[i], 'yyyy-MM-dd')
                  const isToday = dateStr === today
                  const nightStart = computeNightEnds(dateStr)
                  const totalMs = CELL_COUNT * 30 * 60 * 1000
                  const toPct = (iso: string | null | undefined) => {
                    if (!iso) return -1
                    const t = parseISO(iso)
                    const diffMs = t.getTime() - nightStart.getTime()
                    return (diffMs / totalMs) * 100
                  }
                  const bedPct = toPct(log?.bed_time)
                  const sleepPct = toPct(log?.sleep_time)
                  const wakePct = toPct(log?.wake_time)
                  const sleep2Pct = toPct(log?.sleep2_time)
                  const wake2Pct = toPct(log?.wake2_time)
                  return (
                    <div key={dateStr} className="flex group relative">
                      {/* Date (clickable → modal) */}
                      <div
                        onClick={() => handleDateClick(dateStr)}
                        className={`w-[88px] flex-shrink-0 flex items-center justify-end pr-2 text-xs font-mono cursor-pointer hover:bg-slate-700/60 rounded transition-colors ${
                          isToday ? 'text-blue-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        <div className="text-right leading-tight">
                          <div>{format(days[i], 'M/d', { locale: ja })}</div>
                          <div className="text-[10px] text-slate-500">{format(days[i], 'E', { locale: ja })}</div>
                        </div>
                      </div>

                      {/* Grid cells (background only) + colored segments (proportional, each with hover tooltip) */}
                      <div className="flex flex-1 relative">
                        {Array.from({ length: CELL_COUNT }, (_, ci) => (
                          <div key={ci} className="flex-1 border-l border-slate-700/30 bg-slate-800/50" />
                        ))}
                        {bedPct >= 0 && sleepPct >= 0 && (
                          <div className="absolute inset-y-0 group z-[4]" style={{ left: `${bedPct}%`, width: `${sleepPct - bedPct}%` }}>
                            <div className="absolute inset-y-1/4 inset-x-0 bg-purple-600/40" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-700 text-[10px] rounded px-2 py-1 shadow-lg whitespace-nowrap z-10">
                              <span className="text-purple-300">入眠潜時</span>
                              <span className="text-slate-400 mx-1">{fmt24(log?.bed_time)}→{fmt24(log?.sleep_time)}</span>
                              <span className="text-slate-500">({fmtDuration(differenceInMinutes(parseISO(log!.sleep_time!), parseISO(log!.bed_time!)))})</span>
                            </div>
                          </div>
                        )}
                        {bedPct >= 0 && sleepPct < 0 && (
                          <div className="absolute inset-y-0 group z-[4]" style={{ left: `${bedPct}%`, width: `${Math.max(0, 100 - bedPct)}%` }}>
                            <div className="absolute inset-y-1/4 inset-x-0 bg-purple-600/40" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-700 text-[10px] rounded px-2 py-1 shadow-lg whitespace-nowrap z-10">
                              <span className="text-purple-300">入眠潜時</span>
                              <span className="text-slate-400 mx-1">{fmt24(log?.bed_time)}→</span>
                            </div>
                          </div>
                        )}
                        {sleepPct >= 0 && wakePct >= 0 && (
                          <div className="absolute inset-y-0 group z-[4]" style={{ left: `${sleepPct}%`, width: `${wakePct - sleepPct}%` }}>
                            <div className="absolute inset-y-1/4 inset-x-0 bg-emerald-500/40" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-700 text-[10px] rounded px-2 py-1 shadow-lg whitespace-nowrap z-10">
                              <span className="text-emerald-300">睡眠</span>
                              <span className="text-slate-400 mx-1">{fmt24(log?.sleep_time)}→{fmt24(log?.wake_time)}</span>
                              <span className="text-slate-500">({fmtDuration(differenceInMinutes(parseISO(log!.wake_time!), parseISO(log!.sleep_time!)))})</span>
                            </div>
                          </div>
                        )}
                        {sleepPct >= 0 && wakePct < 0 && (
                          <div className="absolute inset-y-0 group z-[4]" style={{ left: `${sleepPct}%`, width: `${Math.max(0, 100 - sleepPct)}%` }}>
                            <div className="absolute inset-y-1/4 inset-x-0 bg-emerald-500/40" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-700 text-[10px] rounded px-2 py-1 shadow-lg whitespace-nowrap z-10">
                              <span className="text-emerald-300">睡眠</span>
                              <span className="text-slate-400 mx-1">{fmt24(log?.sleep_time)}→</span>
                            </div>
                          </div>
                        )}
                        {sleep2Pct >= 0 && wake2Pct >= 0 && (
                          <div className="absolute inset-y-0 group z-[4]" style={{ left: `${sleep2Pct}%`, width: `${wake2Pct - sleep2Pct}%` }}>
                            <div className="absolute inset-y-1/4 inset-x-0 bg-cyan-600/40" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-700 text-[10px] rounded px-2 py-1 shadow-lg whitespace-nowrap z-10">
                              <span className="text-cyan-300">二度寝</span>
                              <span className="text-slate-400 mx-1">{fmt24(log?.sleep2_time)}→{fmt24(log?.wake2_time)}</span>
                              <span className="text-slate-500">({fmtDuration(differenceInMinutes(parseISO(log!.wake2_time!), parseISO(log!.sleep2_time!)))})</span>
                            </div>
                          </div>
                        )}
                        {sleep2Pct >= 0 && wake2Pct < 0 && (
                          <div className="absolute inset-y-0 group z-[4]" style={{ left: `${sleep2Pct}%`, width: `${Math.max(0, 100 - sleep2Pct)}%` }}>
                            <div className="absolute inset-y-1/4 inset-x-0 bg-cyan-600/40" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-700 text-[10px] rounded px-2 py-1 shadow-lg whitespace-nowrap z-10">
                              <span className="text-cyan-300">二度寝</span>
                              <span className="text-slate-400 mx-1">{fmt24(log?.sleep2_time)}→</span>
                            </div>
                          </div>
                        )}
                        {bedPct >= 0 && <div className="absolute top-1/4 bottom-1/4 w-0.5 bg-indigo-400 pointer-events-none z-[3]" style={{ left: `${bedPct}%` }} />}
                        {sleepPct >= 0 && <div className="absolute top-1/4 bottom-1/4 w-0.5 bg-purple-400 pointer-events-none z-[3]" style={{ left: `${sleepPct}%` }} />}
                        {wakePct >= 0 && <div className="absolute top-1/4 bottom-1/4 w-0.5 bg-emerald-400 pointer-events-none z-[3]" style={{ left: `${wakePct}%` }} />}
                        {sleep2Pct >= 0 && <div className="absolute top-1/4 bottom-1/4 w-0.5 bg-cyan-400 pointer-events-none z-[3]" style={{ left: `${sleep2Pct}%` }} />}
                        {wake2Pct >= 0 && <div className="absolute top-1/4 bottom-1/4 w-0.5 bg-cyan-400 pointer-events-none z-[3]" style={{ left: `${wake2Pct}%` }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-slate-800/50 border border-slate-700" /><span>床外</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-purple-600/40 border border-purple-600/30" /><span>入眠潜時</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500/30" /><span>睡眠</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-cyan-600/40 border border-cyan-600/30" /><span>二度寝</span></div>
            <span className="text-slate-600 mx-1">|</span>
            <span className="text-[10px]">━ <span className="text-indigo-400">━</span> 上床</span>
            <span className="text-[10px]">━ <span className="text-purple-400">━</span> 入眠</span>
            <span className="text-[10px]">━ <span className="text-emerald-400">━</span> 起床</span>
            <span className="text-slate-600 mx-1">|</span>
            <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-3 bg-red-500/60" /> 目安線</span>
          </div>
        </div>
      </div>

      {/* ── Edit modal ── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border border-slate-700">
            <h3 className="text-base font-bold text-white mb-4">{editModal.dateStr} の睡眠</h3>
            <div className="space-y-4">
              {(['bedTime', 'sleepTime', 'wakeTime'] as const).map((key) => {
                const val = editModal[key]
                const dateVal = val ? val.split('T')[0] : ''
                const timeVal = val ? val.split('T')[1] || '' : ''
                return (
                  <div key={key}>
                    <label className="block text-xs text-slate-400 mb-1">
                      {key === 'bedTime' ? '🛌 上床' : key === 'sleepTime' ? '✨ 入眠' : '☀️ 起床'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateVal}
                        onChange={(e) => setEditModal((p) => p ? { ...p, [key]: e.target.value ? `${e.target.value}T${timeVal}` : '' } : p)}
                        className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="time"
                        value={timeVal}
                        onChange={(e) => setEditModal((p) => p ? { ...p, [key]: dateVal ? `${dateVal}T${e.target.value}` : e.target.value } : p)}
                        className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleModalSave() }}
                      />
                    </div>
                  </div>
                )
              })}
              <hr className="border-slate-700 my-2" />
              <div className="text-xs text-slate-500 mb-2">二度寝（回笼觉）</div>
              {(['sleep2Time', 'wake2Time'] as const).map((key) => {
                const val = editModal[key]
                const dateVal = val ? val.split('T')[0] : ''
                const timeVal = val ? val.split('T')[1] || '' : ''
                return (
                  <div key={key}>
                    <label className="block text-xs text-slate-400 mb-1">
                      {key === 'sleep2Time' ? '✨ 二度寝入眠' : '☀️ 二度寝起床'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateVal}
                        onChange={(e) => setEditModal((p) => p ? { ...p, [key]: e.target.value ? `${e.target.value}T${timeVal}` : '' } : p)}
                        className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="time"
                        value={timeVal}
                        onChange={(e) => setEditModal((p) => p ? { ...p, [key]: dateVal ? `${dateVal}T${e.target.value}` : e.target.value } : p)}
                        className="flex-1 bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleModalSave() }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">キャンセル</button>
              <button onClick={handleModalSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
