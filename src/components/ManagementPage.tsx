import { useState, useMemo } from 'react'
import type { Task, TaskFormData, Category } from '../types'
import { WEEKDAY_KEYS, WEEKDAY_LABELS, CATEGORY_COLOR_PAIRS } from '../types'
import { TaskForm } from './TaskForm'
import { createCategory, renameCategory, deleteCategory, updateCategoryColor } from '../lib/api'

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
    return {
      grouped: [...map.entries()].sort(([a], [b]) => a.localeCompare(b)),
      uncategorized,
    }
  }, [activeTasks, categories])

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

      {grouped.grouped.map(([category, catTasks]) => {
        const cat = categories.find((c) => c.name === category)
        return (
          <section key={category}>
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
      })}

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
