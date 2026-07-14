// apps/craving/src/components/CravingView.tsx

import { useEffect, useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react'
import { format, subDays, startOfYear, eachDayOfInterval, getDay, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useCravingLogs } from '../hooks/useCravingLogs'
import { CRAVING_MOODS, CRAVING_ALTERNATIVES } from '../types'
import type { CravingLog } from '../types'

const COUNTDOWN_SECONDS = 180
const ALTERNATIVE_INTERVAL = 12000

function getStreak(logs: CravingLog[]): number {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const date = format(subDays(today, i), 'yyyy-MM-dd')
    const dayLog = logs.find(
      (l) => format(parseISO(l.created_at), 'yyyy-MM-dd') === date
    )
    if (!dayLog || dayLog.result === 'failed') break
    streak++
  }
  return streak
}

function getMonthlyStats(logs: CravingLog[], monthStart: Date, monthEnd: Date) {
  const monthLogs = logs.filter((l) => {
    const d = parseISO(l.created_at)
    return d >= monthStart && d <= monthEnd
  })
  const total = monthLogs.length
  const resisted = monthLogs.filter((l) => l.result === 'resisted').length
  return { total, resisted, failed: total - resisted, rate: total > 0 ? Math.round((resisted / total) * 100) : 0 }
}

function getTodayLog(logs: CravingLog[]): CravingLog | null {
  const today = format(new Date(), 'yyyy-MM-dd')
  return logs.find((l) => format(parseISO(l.created_at), 'yyyy-MM-dd') === today) ?? null
}

function groupLogsByDate(logs: CravingLog[]): Map<string, 'resisted' | 'failed'> {
  const map = new Map<string, 'resisted' | 'failed'>()
  for (const l of logs) {
    const dateKey = format(parseISO(l.created_at), 'yyyy-MM-dd')
    if (!map.has(dateKey)) map.set(dateKey, l.result)
  }
  return map
}

function Confetti() {
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1 + Math.random() * 1.5,
      color: ['#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'][Math.floor(Math.random() * 5)],
      size: 6 + Math.random() * 8,
    })), [])
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti rounded-sm"
          style={{
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

function ContributionGraph({ logs }: { logs: CravingLog[] }) {
  const today = new Date()
  const yearStart = startOfYear(today)
  const days = eachDayOfInterval({ start: yearStart, end: today })
  const logMap = groupLogsByDate(logs)
  const containerRef = useRef<HTMLDivElement>(null)
  const [maxWeeks, setMaxWeeks] = useState(53)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width
      setMaxWeeks(Math.max(1, Math.floor(width / 12)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const weeks: { date: Date; result?: 'resisted' | 'failed' }[][] = []
  let currentWeek: { date: Date; result?: 'resisted' | 'failed' }[] = []
  const firstDay = days[0]
  const startPadding = getDay(firstDay)
  for (let i = 0; i < startPadding; i++) {
    currentWeek.push({ date: subDays(firstDay, startPadding - i) })
  }
  for (const date of days) {
    const dateKey = format(date, 'yyyy-MM-dd')
    const result = logMap.get(dateKey)
    currentWeek.push({ date, result })
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek)

  const visibleWeeks = weeks.slice(-maxWeeks)

  return (
    <div ref={containerRef} className="flex gap-[2px]">
      {visibleWeeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[2px]">
          {week.map((day, di) => (
            <div
              key={di}
              className="rounded-sm"
              style={{
                width: '10px',
                height: '10px',
                backgroundColor: !day.result ? '#1e293b' : day.result === 'resisted' ? '#22c55e' : '#6b7280',
                opacity: day.result === 'failed' ? 0.5 : day.result === 'resisted' ? 0.8 : 0.3,
              }}
              title={`${format(day.date, 'yyyy-MM-dd')}: ${day.result ?? '記録なし'}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function formatMoodDisplay(moods: string[]): string {
  return moods.join('、')
}

function parseInitialMoods(initialMoods?: string[]): { moods: string[]; customReason: string } {
  if (!initialMoods) return { moods: [], customReason: '' }
  const otherIdx = initialMoods.indexOf('その他')
  if (otherIdx !== -1 && otherIdx < initialMoods.length - 1) {
    return {
      moods: initialMoods.slice(0, otherIdx + 1),
      customReason: initialMoods.slice(otherIdx + 1).join('、'),
    }
  }
  return { moods: [...initialMoods], customReason: '' }
}

function MoodPicker({ onSave, onCancel, initialMoods }: { onSave: (moods: string[]) => void; onCancel: () => void; initialMoods?: string[] }) {
  const parsed = parseInitialMoods(initialMoods)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(parsed.moods))
  const [customReason, setCustomReason] = useState(parsed.customReason)
  const toggle = (mood: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(mood)) next.delete(mood)
      else next.add(mood)
      return next
    })
  }
  const handleSave = () => {
    const moods = [...selected]
    if (selected.has('その他') && customReason.trim()) {
      moods.push(customReason.trim())
    }
    onSave(moods)
  }
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-600">
        <h3 className="text-white text-lg font-bold mb-2">なぜ食べちゃった？</h3>
        <p className="text-slate-400 text-sm mb-4">当てはまるものを選んでね（複数可）</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {CRAVING_MOODS.map((mood) => (
            <button
              key={mood}
              onClick={() => toggle(mood)}
              className={`px-3 py-2 rounded-full text-sm transition-all ${
                selected.has(mood)
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
        {selected.has('その他') && (
          <div className="mb-6">
            <label className="text-slate-400 text-sm block mb-2">具体的な理由（自由記述）</label>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="例：SNSを見てしまった、etc."
              className="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
              autoFocus
            />
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors">
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            記録する
          </button>
        </div>
      </div>
    </div>
  )
}

function CountdownOverlay({ onDone }: { onDone: () => void }) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS)
  const [altIndex, setAltIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const altTimerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
    altTimerRef.current = setInterval(() => {
      setAltIndex((i) => (i + 1) % CRAVING_ALTERNATIVES.length)
    }, ALTERNATIVE_INTERVAL)
    return () => {
      clearInterval(timerRef.current)
      clearInterval(altTimerRef.current)
    }
  }, [])

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-3xl p-8 w-full max-w-sm border border-slate-700 text-center">
        <h3 className="text-slate-300 text-sm mb-2">衝動はすぐおさまるよ</h3>
        <div className="text-5xl font-mono font-bold text-white mb-6 tracking-wider">
          {minutes}:{String(secs).padStart(2, '0')}
        </div>
        <div className="bg-slate-800 rounded-xl p-4 mb-6 min-h-[60px] flex items-center justify-center">
          <p className="text-blue-300 text-sm leading-relaxed animate-pulse">
            {CRAVING_ALTERNATIVES[altIndex]}
          </p>
        </div>
        <button
          onClick={onDone}
          className="text-slate-500 text-sm hover:text-slate-300 transition-colors underline"
        >
          もう大丈夫
        </button>
      </div>
    </div>
  )
}

export function CravingView() {
  const { logs, load, add, update } = useCravingLogs()
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [showCountdown, setShowCountdown] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [recordedToday, setRecordedToday] = useState<'resisted' | 'failed' | null>(null)
  const [editingLog, setEditingLog] = useState<CravingLog | null>(null)

  const todayRef = useRef(new Date())
  const today = todayRef.current
  const monthStart = useMemo(() => startOfMonth(today), [])
  const monthEnd = useMemo(() => endOfMonth(today), [])

  useEffect(() => {
    const rangeStart = format(subDays(today, 400), 'yyyy-MM-dd')
    const rangeEnd = format(today, 'yyyy-MM-dd')
    load(rangeStart, rangeEnd)
  }, [load])

  useEffect(() => {
    const existing = getTodayLog(logs)
    if (existing) setRecordedToday(existing.result)
    else setRecordedToday(null)
  }, [logs])

  const monthlyStats = useMemo(() => getMonthlyStats(logs, monthStart, monthEnd), [logs, monthStart, monthEnd])
  const streak = useMemo(() => getStreak(logs), [logs])

  const handleResisted = useCallback(async () => {
    await add('resisted')
    setRecordedToday('resisted')
    setShowCelebration(true)
    setTimeout(() => setShowCelebration(false), 3000)
  }, [add])

  const handleFailed = useCallback(() => {
    setShowMoodPicker(true)
  }, [])

  const handleMoodSave = useCallback(async (moods: string[]) => {
    setShowMoodPicker(false)
    await add('failed', moods)
    setRecordedToday('failed')
  }, [add])

  const handleEditMoodSave = useCallback(async (moods: string[]) => {
    if (!editingLog) return
    setEditingLog(null)
    await update(editingLog.id, moods)
  }, [editingLog, update])

  const todayLabel = format(today, 'M月d日 (E)', { locale: ja })

  const ringCircumference = 2 * Math.PI * 54
  const ringOffset = ringCircumference - (monthlyStats.rate / 100) * ringCircumference

  return (
    <div className="bg-slate-900 text-white">
      {showCelebration && <Confetti />}
      {showMoodPicker && <MoodPicker onSave={handleMoodSave} onCancel={() => setShowMoodPicker(false)} />}
      {editingLog && (
        <MoodPicker
          initialMoods={editingLog.mood ?? undefined}
          onSave={handleEditMoodSave}
          onCancel={() => setEditingLog(null)}
        />
      )}
      {showCountdown && <CountdownOverlay onDone={() => setShowCountdown(false)} />}

      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">欲望コントロール</h2>
            <p className="text-slate-400 text-sm">{todayLabel}</p>
          </div>
        </div>

        {recordedToday ? (
          <div className={`rounded-2xl p-4 mb-6 ${recordedToday === 'resisted' ? 'bg-green-900/30 border border-green-700/50' : 'bg-slate-800 border border-slate-600'}`}>
            <p className="text-center text-lg">
              {recordedToday === 'resisted' ? '🎉 今日は耐えた！' : '😔 今日は食べちゃった…'}
            </p>
            <p className="text-center text-slate-400 text-sm mt-1">
              {recordedToday === 'resisted' ? 'よく頑張ったね！' : '明日またチャレンジしよう'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700">
            <p className="text-center text-slate-300">今日はまだ記録がありません</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={handleResisted}
            disabled={recordedToday !== null}
            className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-lg font-bold transition-all active:scale-95 ${
              recordedToday ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-green-900/40 text-green-300 border-2 border-green-700/50 hover:bg-green-800/50 hover:border-green-500'
            }`}
          >
            <span className="text-4xl mb-2">💪</span>
            <span>耐えた！</span>
          </button>
          <button
            onClick={handleFailed}
            disabled={recordedToday !== null}
            className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-lg font-bold transition-all active:scale-95 ${
              recordedToday ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-800 text-slate-300 border-2 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
            }`}
          >
            <span className="text-4xl mb-2">😞</span>
            <span>食べちゃった…</span>
          </button>
        </div>

        <button
          onClick={() => setShowCountdown(true)}
          className="w-full py-4 rounded-2xl bg-amber-900/30 text-amber-300 border-2 border-amber-800/50 hover:bg-amber-800/40 hover:border-amber-600/50 transition-all active:scale-[0.98] mb-8 text-base font-medium"
        >
          ⚠ どうしても食べたい…
        </button>

        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">今月の成績</h3>
            <div className="flex items-center gap-6">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#334155" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="54"
                    fill="none" stroke="#22c55e" strokeWidth="8"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-2xl font-bold">{monthlyStats.rate}%</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-300">{monthlyStats.resisted}回 耐えた</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-500" />
                  <span className="text-sm text-slate-400">{monthlyStats.failed}回 失敗</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔥</span>
                  <span className="text-sm text-slate-300">{streak}日連続記録中</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">年間ヒートマップ</h3>
            <ContributionGraph logs={logs} />
            <div className="flex items-center justify-end gap-2 mt-3 text-xs text-slate-500">
              <span>少</span>
              <div className="w-3 h-3 rounded-sm bg-slate-700/50" />
              <div className="w-3 h-3 rounded-sm bg-green-800" />
              <div className="w-3 h-3 rounded-sm bg-green-600" />
              <div className="w-3 h-3 rounded-sm bg-green-400" />
              <span>多</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">直近の記録</h3>
            <div className="space-y-2">
              {logs.slice(0, 10).map((l) => (
                <div
                  key={l.id}
                  onClick={() => setEditingLog(l)}
                  className="flex items-center justify-between text-sm cursor-pointer hover:bg-slate-700/30 rounded-lg px-2 -mx-2 py-1 transition-colors"
                >
                  <span className="text-slate-400">{format(parseISO(l.created_at), 'M/d (E)', { locale: ja })}</span>
                  <div className="flex items-center gap-2">
                    {l.mood && l.mood.length > 0 && (
                      <span className="text-xs text-slate-500">{formatMoodDisplay(l.mood)}</span>
                    )}
                    <span className={l.result === 'resisted' ? 'text-green-400' : 'text-slate-400'}>
                      {l.result === 'resisted' ? '💪 耐えた' : '😞 失敗'}
                    </span>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">まだ記録がありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
