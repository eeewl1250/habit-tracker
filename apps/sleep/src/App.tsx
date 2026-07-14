// apps/sleep/src/App.tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { format, subDays, addDays, startOfMonth } from 'date-fns'
import { SleepView } from './components/SleepView'
import { useSleepLogs } from './hooks/useSleepLogs'

function App() {
  const sleepLogs = useSleepLogs()
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()))

  const dateRangeStr = `${format(subDays(viewDate, 31), 'yyyy-MM-dd')}-${format(addDays(viewDate, 31), 'yyyy-MM-dd')}`

  const loadSleepLogs = useCallback(() => {
    sleepLogs.load(
      format(subDays(viewDate, 31), 'yyyy-MM-dd'),
      format(addDays(viewDate, 31), 'yyyy-MM-dd')
    )
  }, [dateRangeStr, sleepLogs.load])

  useEffect(() => {
    loadSleepLogs()
  }, [loadSleepLogs])

  const days = useMemo(() => {
    const start = startOfMonth(viewDate)
    const end = addDays(start, 30)
    const result: Date[] = []
    const current = new Date(start)
    while (current <= end) {
      result.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return result
  }, [viewDate])

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-900">
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">睡眠記録</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewDate((p) => subDays(startOfMonth(p), 1))}
            className="px-2 py-1 text-sm text-slate-400 hover:text-white"
          >
            ←
          </button>
          <span className="text-sm text-slate-300">{format(viewDate, 'yyyy年M月')}</span>
          <button
            onClick={() => setViewDate((p) => addDays(startOfMonth(p), 32))}
            className="px-2 py-1 text-sm text-slate-400 hover:text-white"
          >
            →
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <SleepView
          sleepLogs={sleepLogs.logs}
          days={days}
          onRecordSleep2Time={sleepLogs.recordSleep2Time}
          onRecordWake2Time={sleepLogs.recordWake2Time}
          onUpdateTimes={sleepLogs.updateTimes}
        />
      </main>
    </div>
  )
}

export default App
