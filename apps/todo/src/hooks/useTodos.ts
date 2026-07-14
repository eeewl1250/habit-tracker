import { useState, useCallback, useEffect } from 'react'
import type { Todo, TodoFormData, TodoStatus } from '../types'
import { fetchTodos, createTodo, updateTodo, deleteTodo } from '../lib/api'

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchTodos()
      setTodos(data)
    } catch (e) {
      console.error('Failed to load todos', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (form: TodoFormData) => {
    const todo = await createTodo(form)
    setTodos(prev => [todo, ...prev])
    return todo
  }, [])

  const update = useCallback(async (id: string, updates: Partial<Todo>) => {
    const updated = await updateTodo(id, updates)
    setTodos(prev => prev.map(t => t.id === id ? updated : t))
    return updated
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteTodo(id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }, [])

  const changeStatus = useCallback(async (id: string, status: TodoStatus) => {
    const now = status === 'done' ? new Date().toISOString() : null
    const clue = status === 'done'
      ? (() => {
          const t = todos.find(t => t.id === id)
          if (!t) return null
          const mins = t.actual_minutes > 0 ? `（${t.actual_minutes}分）` : ''
          return `✅ ${t.title}${mins}`
        })()
      : null
    const updated = await updateTodo(id, { status, completed_at: now, diary_clue: clue })
    setTodos(prev => prev.map(t => t.id === id ? updated : t))
    return updated
  }, [todos])

  const updateMinutes = useCallback(async (id: string, additionalMinutes: number) => {
    const t = todos.find(t => t.id === id)
    if (!t) return
    const total = (t.actual_minutes ?? 0) + additionalMinutes
    const updated = await updateTodo(id, { actual_minutes: total })
    setTodos(prev => prev.map(t => t.id === id ? updated : t))
    return updated
  }, [todos])

  const backlog = todos.filter(t => t.status === 'backlog')
  const todayList = todos.filter(t => t.status === 'today').sort((a, b) => a.sort_order - b.sort_order)
  const doneList = todos.filter(t => t.status === 'done')

  return {
    todos, loading,
    backlog, todayList, doneList,
    add, update, remove,
    changeStatus, updateMinutes, reload: load,
  }
}
