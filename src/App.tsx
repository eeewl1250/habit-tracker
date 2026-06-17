import { useEffect, useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { Header } from './components/Header'
import { MatrixView } from './components/MatrixView'
import { MobileView } from './components/MobileView'
import { HeatmapView } from './components/HeatmapView'
import { StatsView } from './components/StatsView'
import { TaskForm } from './components/TaskForm'
import { ManagementPage } from './components/ManagementPage'
import { useTasks } from './hooks/useTasks'
import { useLogs } from './hooks/useLogs'
import { useViewDates } from './hooks/useViewDates'
import { fetchCategories } from './lib/api'
import type { Category, ViewMode } from './types'

function App() {
  const tasks = useTasks()
  const logs = useLogs()
  const dates = useViewDates()
  const [showForm, setShowForm] = useState(false)
  const [showManagement, setShowManagement] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  const categoryColor = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) map.set(c.name, c.color)
    return map
  }, [categories])

  const categoryBgColor = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) map.set(c.name, c.bg_color)
    return map
  }, [categories])

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setShowManagement(false)
    dates.setViewMode(mode)
  }, [dates])

  const loadLogs = useCallback(() => {
    logs.load(
      format(dates.dateRange.start, 'yyyy-MM-dd'),
      format(dates.dateRange.end, 'yyyy-MM-dd')
    )
  }, [dates.dateRange.start, dates.dateRange.end])

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const showMatrix = dates.viewMode === 'week' || dates.viewMode === 'month'

  const refreshCategories = useCallback(() => {
    fetchCategories().then(setCategories).catch(() => {})
  }, [])

  const handleRefresh = useCallback(() => {
    tasks.reload()
    refreshCategories()
  }, [tasks, refreshCategories])

  const handleManage = useCallback(() => {
    setShowManagement((p) => !p)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        rangeLabel={dates.rangeLabel}
        viewMode={dates.viewMode}
        onPrev={dates.goPrev}
        onNext={dates.goNext}
        onToday={dates.goToday}
        onViewModeChange={handleViewModeChange}
        managing={showManagement}
        onManage={handleManage}
      />

      <main className="max-w-5xl mx-auto">
        {showManagement ? (
          <ManagementPage
            tasks={tasks.tasks}
            categories={categories}
            onAdd={(form) => tasks.add(form)}
            onEdit={(id, form) => tasks.edit(id, form)}
            onDelete={(id) => tasks.remove(id)}
            onRefresh={handleRefresh}
          />
        ) : (
          <>
            <div className="hidden md:flex justify-end gap-2 p-4">
              <button
                onClick={handleManage}
                className="px-4 py-2 bg-white text-gray-600 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                管理
              </button>
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
                    categories={categories}
                    onSave={async (form) => {
                      await tasks.add(form)
                      refreshCategories()
                      setShowForm(false)
                    }}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              </div>
            )}

            {dates.viewMode === 'heatmap' && (
              <HeatmapView tasks={tasks.tasks} categoryColor={categoryColor} />
            )}
            {dates.viewMode === 'stats' && <StatsView />}

            {showMatrix && (
              <>
                <div className="block md:hidden">
                  <MobileView
                    tasks={tasks.tasks}
                    logs={logs}
                    categoryColor={categoryColor}
                    onReloadLogs={loadLogs}
                    onManage={handleManage}
                  />
                </div>
                <div className="hidden md:block">
                  <MatrixView
                    tasks={tasks.tasks}
                    days={dates.days}
                    logs={logs}
                    categoryColor={categoryColor}
                    categoryBgColor={categoryBgColor}
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>

      {!showManagement && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 z-20 md:hidden w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700 active:scale-95 transition-all"
        >
          +
        </button>
      )}
    </div>
  )
}

export default App
