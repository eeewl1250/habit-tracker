import { useState, useMemo, useCallback } from 'react'
import type { Task, TaskFormData, Category } from '../types'
import { WEEKDAY_KEYS, WEEKDAY_LABELS, CATEGORY_COLOR_PAIRS } from '../types'
import { TaskForm } from './TaskForm'
import { createCategory, renameCategory, deleteCategory, updateCategoryColor, updateCategoriesOrder, updateTasksOrder, updateTask } from '../lib/api'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ManagementPageProps {
  tasks: Task[]
  categories: Category[]
  onAdd: (form: TaskFormData) => Promise<Task>
  onEdit: (id: string, form: Partial<TaskFormData>) => Promise<Task>
  onDelete: (id: string) => Promise<void>
  onRefresh: () => void
}

function periodLabel(task: Task): string {
  if (task.period_type === 'weekday' && task.weekdays) {
    const days: string[] = JSON.parse(task.weekdays)
    const labels = days.map((k) => {
      const i = WEEKDAY_KEYS.indexOf(k as typeof WEEKDAY_KEYS[number])
      return i >= 0 ? WEEKDAY_LABELS[i] : k
    })
    return `毎週${labels.join('・')}`
  }
  if (task.period_type === 'frequency' && task.frequency && task.frequency > 1) {
    return `${task.frequency}日に1回`
  }
  return '毎日'
}

function getCategoryColor(categories: Category[], name: string): string {
  return categories.find((c) => c.name === name)?.color ?? '#4CAF50'
}

function SortableCategory({
  catName,
  children,
}: {
  catName: string
  children: React.ReactNode
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: catName,
  })
  const style = transform
    ? { transform: CSS.Transform.toString(transform), transition }
    : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg p-3 transition-shadow ${isDragging ? 'shadow-lg opacity-50' : ''}`}
      {...(listeners ? { ...listeners } : {})}
      {...(attributes ? { ...attributes } : {})}
    >
      {children}
    </div>
  )
}

function SortableTask({
  taskId,
  children,
}: {
  taskId: string
  children: React.ReactNode
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: taskId,
  })
  const style = transform
    ? { transform: CSS.Transform.toString(transform), transition }
    : undefined
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-40' : ''}
      {...(listeners ? { ...listeners } : {})}
      {...(attributes ? { ...attributes } : {})}
    >
      {children}
    </div>
  )
}

export function ManagementPage({
  tasks,
  categories,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
}: ManagementPageProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatPairIdx, setEditCatPairIdx] = useState(0)
  const [sortMode, setSortMode] = useState(false)
  const [catOrder, setCatOrder] = useState<string[]>([])
  const [taskOrder, setTaskOrder] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeTasks = tasks.filter((t) => t.status === 'active')
  const disabledTasks = tasks.filter((t) => t.status === 'disabled')

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const c of categories) {
      if (!map.has(c.name)) map.set(c.name, [])
    }
    const uncategorized: Task[] = []
    for (const t of activeTasks) {
      if (t.category) {
        if (!map.has(t.category)) map.set(t.category, [])
        map.get(t.category)!.push(t)
      } else {
        uncategorized.push(t)
      }
    }
    const catOrderArr = categories.map((c) => c.name)
    const sorted = [...map.entries()].sort(
      ([a], [b]) => catOrderArr.indexOf(a) - catOrderArr.indexOf(b)
    )
    return { grouped: sorted, uncategorized }
  }, [activeTasks, categories])

  const tasksMap = useMemo(() => {
    const m = new Map<string, Task>()
    for (const t of tasks) m.set(t.id, t)
    return m
  }, [tasks])

  const enterSortMode = () => {
    setCatOrder(categories.map((c) => c.name))
    const to: Record<string, string[]> = {}
    for (const [cat, ts] of grouped.grouped) {
      to[cat] = ts.map((t) => t.id)
    }
    setTaskOrder(to)
    setSortMode(true)
  }

  const saveSort = async () => {
    setSaving(true)
    try {
      await updateCategoriesOrder(catOrder)
      for (const [cat, ids] of Object.entries(taskOrder)) {
        if (ids.length > 0) {
          const origCatTasks = grouped.grouped.find(([c]) => c === cat)?.[1] ?? []
          const origIds = new Set(origCatTasks.map((t) => t.id))
          for (const id of ids) {
            if (!origIds.has(id)) {
              const t = tasksMap.get(id)
              if (t && t.category !== cat) {
                await updateTask(id, { category: cat })
              }
            }
          }
          for (const origId of origIds) {
            if (!ids.includes(origId) && origCatTasks.some((t) => t.id === origId)) {
              const t = tasksMap.get(origId)
              if (t && t.category === cat) {
                await updateTask(origId, { category: '' })
              }
            }
          }
        }
      }
      for (const [, ids] of Object.entries(taskOrder)) {
        if (ids.length > 0) {
          await updateTasksOrder(ids)
        }
      }
      onRefresh()
      setSortMode(false)
    } catch (e) {
      console.error('Failed to save sort order', e)
    } finally {
      setSaving(false)
    }
  }

  const cancelSort = () => {
    setSortMode(false)
    setCatOrder([])
    setTaskOrder({})
  }

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeIdStr = String(active.id)
      const overIdStr = String(over.id)

      // Category reorder
      if (catOrder.includes(activeIdStr)) {
        if (!catOrder.includes(overIdStr)) return
        const oldIdx = catOrder.indexOf(activeIdStr)
        const newIdx = catOrder.indexOf(overIdStr)
        setCatOrder(arrayMove(catOrder, oldIdx, newIdx))
        return
      }

      // Task reorder (possibly cross-category)
      let sourceCat: string | null = null
      for (const [cat, ids] of Object.entries(taskOrder)) {
        if (ids.includes(activeIdStr)) {
          sourceCat = cat
          break
        }
      }
      if (!sourceCat) return

      // Determine target category and index
      let targetCat: string | null = null
      let targetIdx = -1

      if (taskOrder[overIdStr]) {
        // over is a task ID — look up its category
        for (const [cat, ids] of Object.entries(taskOrder)) {
          const idx = ids.indexOf(overIdStr)
          if (idx >= 0) {
            targetCat = cat
            targetIdx = idx
            break
          }
        }
      } else if (catOrder.includes(overIdStr)) {
        // over is a category name directly — drop at end of that category
        targetCat = overIdStr
        targetIdx = (taskOrder[targetCat] ?? []).length
      }

      if (!targetCat || targetIdx < 0) return

      const newTaskOrder = { ...taskOrder }

      // Remove from source
      const sourceIds = [...(newTaskOrder[sourceCat] ?? [])]
      const fromIdx = sourceIds.indexOf(activeIdStr)
      if (fromIdx < 0) return
      sourceIds.splice(fromIdx, 1)
      newTaskOrder[sourceCat] = sourceIds

      // Insert into target
      const targetIds = [...(newTaskOrder[targetCat] ?? [])]
      let insertIdx = targetIdx
      if (sourceCat === targetCat && fromIdx < targetIdx) {
        insertIdx = targetIdx - 1
      }
      targetIds.splice(insertIdx, 0, activeIdStr)
      newTaskOrder[targetCat] = targetIds

      setTaskOrder(newTaskOrder)
    },
    [catOrder, taskOrder]
  )

  const handleDragStart = useCallback(
    (event: { active: { id: unknown } }) => {
      setActiveId(String(event.active.id))
    },
    []
  )

  const handleDeleteTask = async (id: string) => {
    try {
      await onDelete(id)
      setConfirmDelete(null)
    } catch (e) {
      console.error('Failed to delete task', e)
    }
  }

  const handleEditSave = async (form: any) => {
    if (editingTask) {
      await onEdit(editingTask.id, form)
      setEditingTask(null)
    }
  }

  const handleDeleteCategory = async (name: string) => {
    try {
      await deleteCategory(name)
      setConfirmDeleteCat(null)
      onRefresh()
    } catch (e) {
      console.error('Failed to delete category', e)
    }
  }

  const openCategoryEdit = (cat: Category) => {
    const idx = CATEGORY_COLOR_PAIRS.findIndex((p) => p.dot === cat.color)
    setEditingCat(cat)
    setEditCatName(cat.name)
    setEditCatPairIdx(idx >= 0 ? idx : 0)
  }

  const openNewCategory = () => {
    setEditingCat({ name: '', color: CATEGORY_COLOR_PAIRS[0].dot, bg_color: CATEGORY_COLOR_PAIRS[0].bg })
    setEditCatName('')
    setEditCatPairIdx(0)
  }

  const saveCategoryEdit = async () => {
    if (!editingCat) return
    const name = editCatName.trim()
    if (!name) return
    const pair = CATEGORY_COLOR_PAIRS[editCatPairIdx]
    try {
      if (editingCat.name === '') {
        await createCategory(name, pair.dot)
      } else {
        if (name !== editingCat.name) {
          await renameCategory(editingCat.name, name)
        }
        await updateCategoryColor(name, pair.dot, pair.bg)
      }
      setEditingCat(null)
      onRefresh()
    } catch (e) {
      console.error('Failed to save category', e)
    }
  }

  const displayGroups = useMemo(() => {
    if (!sortMode) return grouped.grouped
    const map = new Map<string, Task[]>()
    for (const c of categories) map.set(c.name, [])
    const allTasks = new Map(tasks.filter((t) => t.status === 'active').map((t) => [t.id, t]))
    for (const [cat, ids] of Object.entries(taskOrder)) {
      const ts: Task[] = []
      for (const id of ids) {
        const t = allTasks.get(id)
        if (t) ts.push(t)
      }
      map.set(cat, ts)
    }
    return catOrder.map((name) => [name, map.get(name) ?? []] as [string, Task[]])
  }, [sortMode, catOrder, taskOrder, categories, tasks])

  const renderContent = () => {
    const catContent = displayGroups.map(([category, catTasks]) => {
      const cat = categories.find((c) => c.name === category)
      const isActiveCat = activeId !== null && catOrder.includes(activeId) && activeId !== category

      if (sortMode) {
        return (
          <SortableCategory key={category} catName={category}>
            <div className={`rounded-lg transition-colors ${isActiveCat ? 'border-2 border-dashed border-blue-300' : ''}`}>
              <div
                className="flex items-center justify-between mb-2 cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm">⠿</span>
                  <h3 className="text-sm font-bold tracking-wide" style={{ color: getCategoryColor(categories, category) }}>{category}</h3>
                  <span className="text-xs text-gray-400">{catTasks.length}</span>
                </div>
                <div className="flex gap-1 items-center">
                  <button onClick={() => cat && openCategoryEdit(cat)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-1">編集</button>
                  <button onClick={() => setConfirmDeleteCat(category)}
                    className="text-xs text-red-400 hover:text-red-600 px-1">削除</button>
                </div>
              </div>
              <SortableContext items={taskOrder[category] ?? []} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {(taskOrder[category] ?? []).map((taskId) => {
                    const task = catTasks.find((t) => t.id === taskId)
                    if (!task) return null
                    return (
                      <SortableTask key={task.id} taskId={task.id}>
                        <div
                          className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-gray-300">⠿</span>
                            <div className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getCategoryColor(categories, task.category) }} />
                            <span className="text-sm font-medium text-gray-800 truncate">{task.name}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">{periodLabel(task)}</span>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 pointer-events-auto">
                            <button onClick={() => setEditingTask(task)}
                              className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編集</button>
                            <button onClick={() => setConfirmDelete(task.id)}
                              className="text-xs text-red-400 hover:text-red-600 px-2 py-1">削除</button>
                          </div>
                        </div>
                      </SortableTask>
                    )
                  })}
                  {activeId && !catOrder.includes(activeId) && !(taskOrder[category] ?? []).includes(activeId) && (
                    <div className="h-12 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/30" />
                  )}
                </div>
              </SortableContext>
            </div>
          </SortableCategory>
        )
      }

      return (
        <section key={category} className="rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-wide" style={{ color: getCategoryColor(categories, category) }}>{category}</h3>
              <span className="text-xs text-gray-400">{catTasks.length}</span>
            </div>
            <div className="flex gap-1 items-center">
              <button onClick={() => cat && openCategoryEdit(cat)}
                className="text-xs text-gray-400 hover:text-gray-600 px-1">編集</button>
              <button onClick={() => setConfirmDeleteCat(category)}
                className="text-xs text-red-400 hover:text-red-600 px-1">削除</button>
            </div>
          </div>
          <div className="space-y-1">
            {catTasks.map((task) => (
              <div key={task.id}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getCategoryColor(categories, task.category) }} />
                  <span className="text-sm font-medium text-gray-800 truncate">{task.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{periodLabel(task)}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setEditingTask(task)}
                    className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編集</button>
                  <button onClick={() => setConfirmDelete(task.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1">削除</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )
    })

    return catContent
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-800">タスク管理</h2>
        <div className="flex gap-2">
          <button
            onClick={openNewCategory}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            + カテゴリ追加
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 新規タスク
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {sortMode ? (
          <>
            <button
              onClick={saveSort}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '並び替えを保存'}
            </button>
            <button
              onClick={cancelSort}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </>
        ) : (
          <button
            onClick={enterSortMode}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            並び替え
          </button>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">新しいタスク</h3>
            <TaskForm
              categories={categories}
              onSave={async (form) => {
                await onAdd(form)
                setShowAdd(false)
              }}
              onCancel={() => setShowAdd(false)}
            />
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">タスク編集</h3>
            <TaskForm
              initial={editingTask}
              categories={categories}
              onSave={handleEditSave}
              onCancel={() => setEditingTask(null)}
            />
          </div>
        </div>
      )}

      {editingCat && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">{editingCat?.name ? 'カテゴリ編集' : 'カテゴリ追加'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ名</label>
                <input
                  type="text"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">色</label>
                <div className="flex gap-3 flex-wrap">
                  {CATEGORY_COLOR_PAIRS.map((pair, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditCatPairIdx(i)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all"
                      style={{
                        backgroundColor: pair.bg,
                        borderColor: editCatPairIdx === i ? pair.dot : 'transparent',
                      }}
                    >
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: pair.dot }} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveCategoryEdit}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingCat(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(confirmDelete || confirmDeleteCat) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">削除確認</h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmDelete
                ? 'このタスクを削除しますか？対応する記録も全て削除されます。'
                : `カテゴリ「${confirmDeleteCat}」を削除しますか？カテゴリ未設定になります。`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (confirmDelete) handleDeleteTask(confirmDelete)
                  if (confirmDeleteCat) handleDeleteCategory(confirmDeleteCat)
                }}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                削除
              </button>
              <button
                onClick={() => { setConfirmDelete(null); setConfirmDeleteCat(null) }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {sortMode ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={catOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {renderContent()}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId && !catOrder.includes(activeId) && (
              <div className="bg-white rounded-xl px-4 py-3 border-2 border-blue-400 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300">⠿</span>
                  <span className="text-sm font-medium text-gray-800">
                    {tasksMap.get(activeId)?.name ?? ''}
                  </span>
                </div>
              </div>
            )}
            {activeId && catOrder.includes(activeId) && (
              <div className="bg-white rounded-lg px-4 py-2 border-2 border-blue-400 shadow-lg">
                <span className="text-sm font-bold">{activeId}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-3">
          {renderContent()}
        </div>
      )}

      {grouped.uncategorized.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-500 tracking-wide mb-2">その他</h3>
          <div className="space-y-1">
            {grouped.uncategorized.map((task) => (
              <div key={task.id}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#4CAF50' }} />
                  <span className="text-sm font-medium text-gray-800 truncate">{task.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{periodLabel(task)}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setEditingTask(task)}
                    className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1">編集</button>
                  <button onClick={() => setConfirmDelete(task.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1">削除</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {disabledTasks.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-400 tracking-wide mb-2">
            無効なタスク ({disabledTasks.length})
          </h3>
          <div className="space-y-1 opacity-60">
            {disabledTasks.map((task) => (
              <div key={task.id}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
                <span className="text-sm text-gray-500">{task.name}</span>
                <button onClick={() => setEditingTask(task)}
                  className="text-xs text-blue-500 px-2 py-1">編集</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
