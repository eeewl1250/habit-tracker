import { useState, useMemo, useCallback } from 'react'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachDayOfInterval,
  format,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import type { ViewMode } from '../types'

export function useViewDates() {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [baseDate, setBaseDate] = useState(new Date())

  const dateRange = useMemo(() => {
    if (viewMode === 'week' || viewMode === 'heatmap' || viewMode === 'stats') {
      const start = startOfWeek(baseDate, { weekStartsOn: 1 })
      const end = endOfWeek(baseDate, { weekStartsOn: 1 })
      return { start, end }
    }
    const start = startOfMonth(baseDate)
    const end = endOfMonth(baseDate)
    return { start, end }
  }, [viewMode, baseDate])

  const days = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
  }, [dateRange])

  const goPrev = useCallback(() => {
    if (viewMode === 'week') setBaseDate((d) => subWeeks(d, 1))
    else setBaseDate((d) => subMonths(d, 1))
  }, [viewMode])

  const goNext = useCallback(() => {
    if (viewMode === 'week') setBaseDate((d) => addWeeks(d, 1))
    else setBaseDate((d) => addMonths(d, 1))
  }, [viewMode])

  const goToday = useCallback(() => {
    setBaseDate(new Date())
  }, [])

  const rangeLabel = useMemo(() => {
    if (viewMode === 'week') {
      return `${format(dateRange.start, 'M月d日', { locale: ja })} - ${format(dateRange.end, 'M月d日', { locale: ja })}`
    }
    return `${format(baseDate, 'yyyy年M月', { locale: ja })}`
  }, [viewMode, dateRange, baseDate])

  return {
    viewMode,
    setViewMode,
    baseDate,
    dateRange,
    days,
    goPrev,
    goNext,
    goToday,
    rangeLabel,
  }
}
