import type { Task } from '../types'

export const UNCATEGORIZED_KEY = '__uncategorized__'

export function getTaskCategory(
  taskId: string,
  taskOrder: Record<string, string[]>
): string | null {
  for (const [cat, ids] of Object.entries(taskOrder)) {
    if (ids.includes(taskId)) return cat
  }
  return null
}

export function getSortedTasksByCategory(
  tasks: Task[],
  catOrder: string[],
  taskOrder: Record<string, string[]>
): Array<[string, Task[]]> {
  const allTasksMap = new Map(tasks.map((t) => [t.id, t]))

  const result: Array<[string, Task[]]> = []

  for (const cat of catOrder) {
    if (!taskOrder[cat]) continue
    const catTasks: Task[] = []
    for (const taskId of taskOrder[cat]) {
      const task = allTasksMap.get(taskId)
      if (task) catTasks.push(task)
    }
    result.push([cat, catTasks])
  }

  const uncatTasks: Task[] = []
  if (taskOrder[UNCATEGORIZED_KEY]) {
    for (const taskId of taskOrder[UNCATEGORIZED_KEY]) {
      const task = allTasksMap.get(taskId)
      if (task) uncatTasks.push(task)
    }
  }

  return result.length > 0 || uncatTasks.length === 0
    ? result
    : result.concat([[UNCATEGORIZED_KEY, uncatTasks]])
}

export function calculateTaskCategoryUpdates(
  originalGrouped: Array<[string, Task[]]>,
  currentTaskOrder: Record<string, string[]>
): Array<{ taskId: string; oldCategory: string | null; newCategory: string | null }> {
  const updates: Array<{ taskId: string; oldCategory: string | null; newCategory: string | null }> = []
  const originalMap = new Map<string, string>()

  for (const [cat, tasks] of originalGrouped) {
    for (const task of tasks) {
      originalMap.set(task.id, cat)
    }
  }

  const currentMap = new Map<string, string>()
  for (const [cat, ids] of Object.entries(currentTaskOrder)) {
    for (const taskId of ids) {
      currentMap.set(taskId, cat === UNCATEGORIZED_KEY ? '' : cat)
    }
  }

  for (const [taskId, oldCat] of originalMap) {
    const newCat = currentMap.get(taskId) ?? ''
    const normalizedOldCat = oldCat === UNCATEGORIZED_KEY ? '' : oldCat

    if (normalizedOldCat !== newCat) {
      updates.push({
        taskId,
        oldCategory: normalizedOldCat || null,
        newCategory: newCat || null,
      })
    }
  }

  for (const [taskId, newCat] of currentMap) {
    if (!originalMap.has(taskId)) {
      updates.push({
        taskId,
        oldCategory: null,
        newCategory: newCat || null,
      })
    }
  }

  return updates
}

export function initializeTaskOrder(
  grouped: Array<[string, Task[]]>,
  uncategorized: Task[]
): Record<string, string[]> {
  const taskOrder: Record<string, string[]> = {}

  for (const [cat, tasks] of grouped) {
    taskOrder[cat] = tasks.map((t) => t.id)
  }

  if (uncategorized.length > 0) {
    taskOrder[UNCATEGORIZED_KEY] = uncategorized.map((t) => t.id)
  }

  return taskOrder
}
