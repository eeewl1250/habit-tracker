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

export function calculateCategoryUpdates(
  originalGrouped: Array<[string, Task[]]>,
  currentTaskOrder: Record<string, string[]>
): Map<string, string> {
  const updates = new Map<string, string>()

  const originalMap = new Map<string, string>()
  for (const [cat, tasks] of originalGrouped) {
    for (const task of tasks) {
      originalMap.set(task.id, cat)
    }
  }

  for (const [cat, ids] of Object.entries(currentTaskOrder)) {
    if (cat === UNCATEGORIZED_KEY) continue
    for (const taskId of ids) {
      const oldCat = originalMap.get(taskId) ?? ''
      if (oldCat !== cat) {
        updates.set(taskId, cat)
      }
    }
  }

  if (currentTaskOrder[UNCATEGORIZED_KEY]) {
    for (const taskId of currentTaskOrder[UNCATEGORIZED_KEY]) {
      const oldCat = originalMap.get(taskId) ?? ''
      if (oldCat !== '') {
        updates.set(taskId, '')
      }
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
