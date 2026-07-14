import { useState, useEffect, useCallback } from 'react'
import type { Task, TaskFormData } from '../types'
import { fetchTasks, createTask, updateTask, deleteTask } from '../lib/api'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchTasks()
      setTasks(data)
    } catch (e) {
      console.error('Failed to load tasks', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = async (form: TaskFormData) => {
    const task = await createTask(form)
    setTasks((prev) => [...prev, task])
    return task
  }

  const edit = async (id: string, form: Partial<TaskFormData>) => {
    const task = await updateTask(id, form)
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)))
    return task
  }

  const remove = async (id: string) => {
    await deleteTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  return { tasks, loading, add, edit, remove, reload: load }
}
