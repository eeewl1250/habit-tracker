// apps/finance/src/App.tsx

import { useEffect, useState, useCallback } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { FinanceView } from './components/FinanceView'
import { useFinance } from './hooks/useFinance'
import { useBudget } from './hooks/useBudget'
import { useRecurring } from './hooks/useRecurring'
import { fetchCategoryDefinitions } from './lib/api'
import type { CategoryDefinition } from './types'

function App() {
  const finance = useFinance()
  const budget = useBudget()
  const recurring = useRecurring()
  const [dashboardMonth, setDashboardMonth] = useState(startOfMonth(new Date()))
  const [catDefs, setCatDefs] = useState<CategoryDefinition[]>([])

  const monthStr = format(dashboardMonth, 'yyyy-MM')

  useEffect(() => {
    fetchCategoryDefinitions().then(setCatDefs).catch(() => {})
  }, [])

  useEffect(() => {
    recurring.loadTemplates()
  }, [recurring.loadTemplates])

  useEffect(() => {
    budget.load(monthStr)
  }, [monthStr, budget.load])

  useEffect(() => {
    recurring.ensureMonthlyRecords(monthStr)
  }, [monthStr, recurring.ensureMonthlyRecords])

  const loadRecords = useCallback(() => {
    const from = format(subMonths(dashboardMonth, 1), 'yyyy-MM-dd')
    const to = format(endOfMonth(dashboardMonth), 'yyyy-MM-dd')
    finance.load(from, to)
  }, [dashboardMonth, finance.load])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const curBudget = budget.getSettings(monthStr)

  return (
    <div className="min-h-screen bg-gray-50">
      <FinanceView
        records={finance.records}
        timeLogs={[]}
        catDefs={catDefs}
        budget={curBudget}
        dashboardMonth={dashboardMonth}
        onDashboardMonthChange={setDashboardMonth}
        recurringTemplates={recurring.templates}
        recurringRecords={recurring.monthlyRecords}
        recurringIncome={recurring.totalIncome}
        recurringExpense={recurring.totalExpense}
        recurringNet={recurring.netRecurring}
        onAdd={finance.add}
        onUpdate={finance.update}
        onDelete={finance.remove}
        onUpdateBase={(field, value) => budget.updateBase(monthStr, field, value)}
        onRecalculateRollover={budget.recalculateRollover}
        onAddRecurringTemplate={recurring.addTemplate}
        onEditRecurringTemplate={recurring.editTemplate}
        onDeleteRecurringTemplate={recurring.removeTemplate}
        onUpdateRecurringRecord={recurring.updateMonthlyRecord}
      />
    </div>
  )
}

export default App
