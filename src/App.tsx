import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { Header } from './components/Header'
import { MatrixView } from './components/MatrixView'
import { MobileView } from './components/MobileView'
import { HeatmapView } from './components/HeatmapView'
import { StatsView } from './components/StatsView'
import { TaskForm } from './components/TaskForm'
import { useTasks } from './hooks/useTasks'
import { useLogs } from './hooks/useLogs'
import { useViewDates } from './hooks/useViewDates'

function App() {
  const tasks = useTasks()
  const logs = useLogs()
  const dates = useViewDates()
  const [showForm, setShowForm] = useState(false)

  const loadLogs = useCallback(() => {
    logs.load(
      format(dates.dateRange.start, 'yyyy-MM-dd'),
      format(dates.dateRange.end, 'yyyy-MM-dd')
    )
  }, [dates.dateRange.start, dates.dateRange.end])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const showMatrix = dates.viewMode === 'week' || dates.viewMode === 'month'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        rangeLabel={dates.rangeLabel}
        viewMode={dates.viewMode}
        onPrev={dates.goPrev}
        onNext={dates.goNext}
        onToday={dates.goToday}
        onViewModeChange={dates.setViewMode}
      />

      <main className="max-w-5xl mx-auto">
        <div className="hidden md:flex justify-end p-4">
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + タスク追加
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">新しいタスク</h2>
              <TaskForm
                onSave={async (form) => {
                  await tasks.add(form)
                  setShowForm(false)
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        )}

        {dates.viewMode === 'heatmap' && (
          <HeatmapView tasks={tasks.tasks} logs={logs} />
        )}
        {dates.viewMode === 'stats' && <StatsView />}

        {showMatrix && (
          <>
            <div className="block md:hidden">
              <MobileView
                tasks={tasks.tasks}
                logs={logs}
                onReloadLogs={loadLogs}
              />
            </div>
            <div className="hidden md:block">
              <MatrixView
                tasks={tasks.tasks}
                days={dates.days}
                logs={logs}
              />
            </div>
          </>
        )}
      </main>

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 z-20 md:hidden w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700 active:scale-95 transition-all"
      >
        +
      </button>
    </div>
  )
}

export default App
