import { useEffect, useState, useCallback, useMemo } from 'react'
import { format, subDays, addDays, startOfMonth } from 'date-fns'
import { Header } from './components/Header'
import { MatrixView } from './components/MatrixView'
import { MobileView } from './components/MobileView'
import { HeatmapView } from './components/HeatmapView'
import { StatsView } from './components/StatsView'
import { NotesView } from './components/NotesView'
import { MenstruationView } from './components/MenstruationView'
import { CravingView } from './components/CravingView'
import { SleepView } from './components/SleepView'
import { FocusView } from './components/FocusView'
import { FinanceView } from './components/FinanceView'
import { DiaryView } from './components/DiaryView'
import { HomeView } from './components/HomeView'
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
import { useTimeLogs } from './hooks/useTimeLogs'
import { useFinance } from './hooks/useFinance'
import { useBudget } from './hooks/useBudget'
import { useRecurring } from './hooks/useRecurring'
import { useDiary } from './hooks/useDiary'
import { fetchCategories } from './lib/api'
import type { Category, ViewMode, TargetPool } from './types'
import type { DiarySubMode } from './components/DiaryView'

function App() {
  const tasks = useTasks()
  const logs = useLogs()
  const dates = useViewDates()
  const toast = useToast()
  const noteFlow = useNoteFlow()
  const sleepLogs = useSleepLogs()
  const timeLogs = useTimeLogs()
  const finance = useFinance()
  const budget = useBudget()
  const recurring = useRecurring()
  const diary = useDiary()

  const [showForm, setShowForm] = useState(false)
  const [showManagement, setShowManagement] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [diarySubMode, setDiarySubMode] = useState<DiarySubMode>('calendar')
  
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

  const isHome = dates.viewMode === 'home'
  const isCraving = dates.viewMode === 'craving'
  const isSleep = dates.viewMode === 'sleep'
  const isFocus = dates.viewMode === 'focus'
  const isFinance = dates.viewMode === 'finance'
  const isDiary = dates.viewMode === 'diary'

  const focusDateRangeStr = `${format(dates.dateRange.start, 'yyyy-MM-dd')}-${format(dates.dateRange.end, 'yyyy-MM-dd')}`
  useEffect(() => {
    timeLogs.load(
      format(subDays(dates.dateRange.start, 31), 'yyyy-MM-dd'),
      format(addDays(dates.dateRange.end, 31), 'yyyy-MM-dd')
    )
  }, [focusDateRangeStr, timeLogs.load])

  const [dashboardMonth, setDashboardMonth] = useState(startOfMonth(new Date()))
  const dashboardMonthStr = format(dashboardMonth, 'yyyy-MM')

  const handleDashboardMonthChange = useCallback((month: Date) => {
    setDashboardMonth(month)
  }, [])

  const handleRecalculateRollover = useCallback(
    (month: string, poolTotals: Record<TargetPool, number>, prevTimeBonus?: number) => {
      budget.recalculateRollover(month, poolTotals, prevTimeBonus)
    },
    [budget.recalculateRollover]
  )

  useEffect(() => {
    finance.load(
      format(subDays(new Date(), 180), 'yyyy-MM-dd'),
      format(addDays(new Date(), 31), 'yyyy-MM-dd')
    )
  }, [finance.load])

  useEffect(() => {
    if (isFinance) budget.load(dashboardMonthStr)
  }, [isFinance, budget.load, dashboardMonthStr])

  // Load diary entries on mount (wide range)
  useEffect(() => {
    diary.load(
      format(subDays(new Date(), 365), 'yyyy-MM-dd'),
      format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    )
  }, [diary.load])

  // Load recurring templates on mount
  useEffect(() => {
    recurring.loadTemplates()
  }, [recurring.loadTemplates])

  // Ensure monthly recurring records exist for the current month
  useEffect(() => {
    if (isFinance && recurring.templates.length > 0) {
      recurring.ensureMonthlyRecords(dashboardMonthStr)
    }
  }, [isFinance, dashboardMonthStr, recurring.templates.length, recurring.ensureMonthlyRecords])

  const showMatrix = (dates.viewMode === 'week' || dates.viewMode === 'month') && !isDiary && !isHome

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

  const isDark = (isCraving || isSleep) && !isHome

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {(!isDiary || diarySubMode === 'calendar') && (
        <Header
          rangeLabel={dates.rangeLabel}
          viewMode={dates.viewMode}
          onPrev={dates.goPrev}
          onNext={dates.goNext}
          onToday={dates.goToday}
          onViewModeChange={handleViewModeChange}
          managing={showManagement}
          onManage={handleManage}
          hideDateNav={isHome || dates.viewMode === 'menstruation' || isCraving || isFocus || isFinance || isDiary}
          dark={isDark}
        />
      )}

      {isHome ? (
        <HomeView
          tasks={tasks.tasks}
          logs={logs.logs}
          sleepLogs={sleepLogs.logs}
          timeLogs={timeLogs.logs}
          diaryEntries={diary.entries}
          onNavigate={handleViewModeChange}
        />
      ) : (
        <main className={`transition-colors ${isDiary ? 'w-full' : isDark ? '' : 'max-w-5xl mx-auto pb-24'}`}>
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
        ) : isFocus ? (
          <FocusView timeLogs={timeLogs} baseDate={dates.baseDate} onGoToFinance={() => dates.setViewMode('finance')} />
        ) : isFinance ? (
          <FinanceView
            records={finance.records}
            timeLogs={timeLogs.logs}
            budget={budget.getSettings(dashboardMonthStr)}
            dashboardMonth={dashboardMonth}
            onDashboardMonthChange={handleDashboardMonthChange}
            recurringTemplates={recurring.templates}
            recurringRecords={recurring.monthlyRecords}
            recurringIncome={recurring.totalIncome}
            recurringExpense={recurring.totalExpense}
            recurringNet={recurring.netRecurring}
            onAdd={finance.add}
            onUpdate={finance.update}
            onDelete={finance.remove}
            onUpdateBase={(field, value) => budget.updateBase(dashboardMonthStr, field, value)}
            onRecalculateRollover={handleRecalculateRollover}
            onAddRecurringTemplate={recurring.addTemplate}
            onEditRecurringTemplate={recurring.editTemplate}
            onDeleteRecurringTemplate={recurring.removeTemplate}
            onUpdateRecurringRecord={recurring.updateMonthlyRecord}
          />
        ) : isDiary ? (
          <DiaryView
            entries={diary.entries}
            onSave={diary.save}
            onUpdate={diary.update}
            onModeChange={setDiarySubMode}
          />
        ) : isSleep ? (
          <SleepView
            sleepLogs={sleepLogs.logs}
            days={dates.days}
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
      )}

      {!showManagement && !isHome && dates.viewMode !== 'menstruation' && !isCraving && !isSleep && !isFocus && !isFinance && !isDiary && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 z-20 md:hidden w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700 active:scale-95 transition-all"
        >
          +
        </button>
      )}

      {!isHome && dates.viewMode !== 'menstruation' && !isCraving && !isSleep && !isFocus && !isFinance && !isDiary && (
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
