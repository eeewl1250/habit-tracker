import { useState, useMemo, useCallback, useEffect } from 'react'
import { format, addMonths, subMonths, getDaysInMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { fetchMenstruationLogs, upsertMenstruationLog, deleteMenstruationLog } from '../lib/api'
import type { MenstruationLog } from '../types'

function toYM(d: Date): string {
  return format(d, 'yyyy-MM', { locale: ja })
}

function fromYM(ym: string): Date {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

function getYearMonths(baseYM: string, count: number): string[] {
  const d = fromYM(baseYM)
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    result.push(toYM(addMonths(d, i)))
  }
  return result
}

export type MenstruationOption = '6m_offset2' | '12m_offset4' | 'year' | 'recent6m' | 'recent12m'

interface OptionConfig {
  label: string
  count: number
  mode?: 'year'
  initialOffset?: number
}

export const MENSTRUATION_OPTIONS: { key: MenstruationOption; label: string }[] = [
  { key: '6m_offset2', label: '6ヶ月（2ヶ月前〜）' },
  { key: '12m_offset4', label: '12ヶ月（4ヶ月前〜）' },
  { key: 'year', label: '一年（今年一年）' },
  { key: 'recent6m', label: '近6ヶ月' },
  { key: 'recent12m', label: '近一年' },
]

const OPTIONS_CONFIG: Record<MenstruationOption, OptionConfig> = {
  '6m_offset2': { label: '6ヶ月（2ヶ月前〜）', count: 6, initialOffset: 2 },
  '12m_offset4': { label: '12ヶ月（4ヶ月前〜）', count: 12, initialOffset: 4 },
  'year': { label: '一年（今年一年）', count: 12, mode: 'year' },
  'recent6m': { label: '近6ヶ月', count: 6, initialOffset: 5 },
  'recent12m': { label: '近一年', count: 12, initialOffset: 11 },
}

export function useMenstruation() {
  const now = useMemo(() => new Date(), [])
  const currentYM = useMemo(() => toYM(now), [now])
  const currentYear = now.getFullYear()

  const [optionKey, setOptionKey] = useState<MenstruationOption>('6m_offset2')
  const [baseYM, setBaseYM] = useState(() => {
    const cfg = OPTIONS_CONFIG[optionKey]
    return toYM(subMonths(now, cfg.initialOffset!))
  })

  const config = OPTIONS_CONFIG[optionKey]

  const yearMonths = useMemo(() => getYearMonths(baseYM, config.count), [baseYM, config.count])

  const [logsMap, setLogsMap] = useState<Map<string, Map<number, number>>>(new Map())
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const logs: MenstruationLog[] = await fetchMenstruationLogs(yearMonths)
      const map = new Map<string, Map<number, number>>()
      for (const ym of yearMonths) map.set(ym, new Map())
      for (const log of logs) {
        const m = map.get(log.year_month)
        if (m) m.set(log.day, log.level)
      }
      setLogsMap(map)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [yearMonths.join(',')])

  useEffect(() => {
    load()
  }, [load])

  const goPrev = useCallback(() => {
    setBaseYM((prev) => toYM(subMonths(fromYM(prev), config.count)))
  }, [config.count])

  const goNext = useCallback(() => {
    setBaseYM((prev) => toYM(addMonths(fromYM(prev), config.count)))
  }, [config.count])

  const goToday = useCallback(() => {
    const cfg = OPTIONS_CONFIG[optionKey]
    if (cfg.mode === 'year') {
      setBaseYM(toYM(new Date(currentYear, 0, 1)))
    } else {
      setBaseYM(toYM(subMonths(now, cfg.initialOffset!)))
    }
  }, [optionKey, currentYear, now])

  const handleOptionChange = useCallback((key: MenstruationOption) => {
    const cfg = OPTIONS_CONFIG[key]
    if (cfg.mode === 'year') {
      setBaseYM(toYM(new Date(currentYear, 0, 1)))
    } else {
      setBaseYM(toYM(subMonths(now, cfg.initialOffset!)))
    }
    setOptionKey(key)
  }, [currentYear, now])

  const toggleCell = useCallback(
    async (ym: string, day: number) => {
      const m = logsMap.get(ym)
      if (!m) return
      const current = m.get(day) ?? 0
      const next = current >= 3 ? 0 : current + 1

      const newMap = new Map(logsMap)
      const inner = new Map(m)
      if (next === 0) {
        inner.delete(day)
      } else {
        inner.set(day, next)
      }
      newMap.set(ym, inner)
      setLogsMap(newMap)

      try {
        if (next === 0) {
          const existingLog = await fetchMenstruationLogs([ym]).then((logs) =>
            logs.find((l) => l.year_month === ym && l.day === day)
          )
          if (existingLog) await deleteMenstruationLog(existingLog.id)
        } else {
          await upsertMenstruationLog(ym, day, next)
        }
      } catch {
        load()
      }
    },
    [logsMap, load]
  )

  const currentPageHasToday = useMemo(() => {
    return yearMonths.includes(currentYM)
  }, [yearMonths, currentYM])

  const rows = useMemo(() => {
    return yearMonths.map((ym) => {
      const d = fromYM(ym)
      const daysInMonth = getDaysInMonth(d)
      const levels = logsMap.get(ym) ?? new Map()
      const isCurrent = ym === currentYM
      return { ym, year: d.getFullYear(), month: d.getMonth() + 1, daysInMonth, levels, isCurrent }
    })
  }, [yearMonths, logsMap, currentYM])

  return {
    rows,
    loading,
    optionKey,
    handleOptionChange,
    goPrev,
    goNext,
    goToday,
    toggleCell,
    currentPageHasToday,
  }
}
