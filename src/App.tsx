import { useEffect, useState, useCallback, useMemo } from 'react'
import { format, subDays, addDays } from 'date-fns'
import { Header } from './components/Header'
import { MatrixView } from './components/MatrixView'
import { MobileView } from './components/MobileView'
import { HeatmapView } from './components/HeatmapView'
import { StatsView } from './components/StatsView'
import { NotesView } from './components/NotesView'
import { MenstruationView } from './components/MenstruationView'
import { CravingView } from './components/CravingView'
import { SleepView } from './components/SleepView'
import { TaskForm } from './components/TaskForm'
import { ManagementPage } from './components/ManagementPage'
import { Toast } from './components/Toast'
import { NoteModal } from './components/NoteModal'
import { useTasks } from './hooks/useTasks'
import { useLogs } from './hooks/useLogs'
import { useViewDates } from './hooks/useViewDates'
import { useToast } from './hooks/useToast'
import { useNoteFlow } from './hooks/useNoteFlow'
import { useSleepLogs } from './hooks/useSleepLogs'
import { fetchCategories } from './lib/api'
import type { Category, ViewMode } from './types'

function App() {
  const tasks = useTasks()
  const logs = useLogs()
  const dates = useViewDates()
  const toast = useToast()
  const noteFlow = useNoteFlow()
  const sleepLogs = useSleepLogs()

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

  const dateRangeStr = `${format(dates.dateRange.start, 'yyyy-MM-dd')}-${format(dates.dateRange.end, 'yyyy-MM-dd')}`

  const loadLogs = useCallback(() => {
    logs.load(
      format(subDays(dates.dateRange.start, 31), 'yyyy-MM-dd'),
      format(addDays(dates.dateRange.end, 31), 'yyyy-MM-dd')
    )
  }, [dateRangeStr, logs.load])

  const sleepDateRangeStr = `${format(dates.dateRange.start, 'yyyy-MM-dd')}-${format(dates.dateRange.end, 'yyyy-MM-dd')}`

  const loadSleepLogs = useCallback(() => {
    sleepLogs.load(
      format(subDays(dates.dateRange.start, 31), 'yyyy-MM-dd'),
      format(addDays(dates.dateRange.end, 31), 'yyyy-MM-dd')
    )
  }, [sleepDateRangeStr, sleepLogs.load])

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    loadSleepLogs()
  }, [loadSleepLogs])

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

  const handleChecked = useCallback((taskId: string, taskName: string) => {
    toast.show(`「${taskName}」を記録しました`)
    noteFlow.setPendingFromCheckIn(taskId, taskName)
  }, [toast, noteFlow])

  const handleToastClick = useCallback(() => {
    noteFlow.handleToastClick()
    toast.close()
  }, [toast, noteFlow])

  const isCraving = dates.viewMode === 'craving'
  const isSleep = dates.viewMode === 'sleep'
  const isDark = isCraving || isSleep

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <Header
        rangeLabel={dates.rangeLabel}
        viewMode={dates.viewMode}
        onPrev={dates.goPrev}
        onNext={dates.goNext}
        onToday={dates.goToday}
        onViewModeChange={handleViewModeChange}
        managing={showManagement}
        onManage={handleManage}
        hideDateNav={dates.viewMode === 'menstruation' || isCraving}
        dark={isDark}
      />

      <main className={`transition-colors ${isDark ? '' : 'max-w-5xl mx-auto pb-24'}`}>
        {showManagement ? (
          <ManagementPage
            tasks={tasks.tasks}
            categories={categories}
            onAdd={(form) => tasks.add(form)}
            onEdit={(id, form) => tasks.edit(id, form)}
            onDelete={(id) => tasks.remove(id)}
            onRefresh={handleRefresh}
          />
        ) : isCraving ? (
          <CravingView />
        ) : dates.viewMode === 'menstruation' ? (
          <MenstruationView />
        ) : isSleep ? (
          <SleepView
            sleepLogs={sleepLogs.logs}
            days={dates.days}
            todayLog={sleepLogs.todayLog}
            onRecordBedTime={sleepLogs.recordBedTime}
            onRecordSleepTime={sleepLogs.recordSleepTime}
            onRecordWakeTime={sleepLogs.recordWakeTime}
            onRecordSleep2Time={sleepLogs.recordSleep2Time}
            onRecordWake2Time={sleepLogs.recordWake2Time}
            onUpdateTimes={sleepLogs.updateTimes}
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
            {dates.viewMode === 'stats' && (
              <StatsView tasks={tasks.tasks} categoryColor={categoryColor} />
            )}
            {dates.viewMode === 'notes' &&
              <NotesView key={noteFlow.refreshKey} categories={categories} categoryColor={categoryColor} />}

            {showMatrix && (
              <>
                <div className="block md:hidden">
                  <MobileView
                    tasks={tasks.tasks}
                    logs={logs}
                    categoryColor={categoryColor}
                    onReloadLogs={loadLogs}
                    onManage={handleManage}
                    onChecked={handleChecked}
                  />
                </div>
                <div className="hidden md:block">
                  <MatrixView
                    tasks={tasks.tasks}
                    days={dates.days}
                    logs={logs}
                    categoryColor={categoryColor}
                    categoryBgColor={categoryBgColor}
                    onChecked={handleChecked}
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>

      {!showManagement && dates.viewMode !== 'menstruation' && !isCraving && !isSleep && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 z-20 md:hidden w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700 active:scale-95 transition-all"
        >
          +
        </button>
      )}

      {dates.viewMode !== 'menstruation' && !isCraving && !isSleep && (
        <>
          <Toast
            key={toast.key}
            message={toast.message}
            visible={toast.isVisible}
            onClose={toast.close}
            onClick={handleToastClick}
          />

          {noteFlow.prompt && (
            <NoteModal
              taskId={noteFlow.prompt.taskId}
              taskName={noteFlow.prompt.taskName}
              onClose={noteFlow.handleNoteModalClose}
              onSaved={noteFlow.handleNoteSaved}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App
