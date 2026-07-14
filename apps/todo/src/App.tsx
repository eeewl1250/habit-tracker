import { useEffect, useCallback, useState } from 'react'
import { format, subDays, addDays } from 'date-fns'
import { TodoView } from './components/TodoView'
import { useTimeLogs } from './hooks/useTimeLogs'
import { fetchTasks, fetchLogs } from './lib/api'
import type { Task, DailyLog } from './types'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<DailyLog[]>([])
  const timeLogs = useTimeLogs()

  const loadData = useCallback(async () => {
    try {
      const [tasksData, logsData] = await Promise.all([
        fetchTasks(),
        fetchLogs(
          format(subDays(new Date(), 90), 'yyyy-MM-dd'),
          format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        ),
      ])
      setTasks(tasksData)
      setLogs(logsData)
    } catch (e) {
      console.error('Failed to load data', e)
    }
  }, [])

  useEffect(() => {
    loadData()
    timeLogs.load(
      format(subDays(new Date(), 31), 'yyyy-MM-dd'),
      format(addDays(new Date(), 31), 'yyyy-MM-dd'),
    )
  }, [loadData])

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50">
      <TodoView tasks={tasks} logs={logs} timeLogs={timeLogs} />
    </div>
  )
}

export default App
