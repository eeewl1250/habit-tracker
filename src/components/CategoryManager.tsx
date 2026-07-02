import { useState } from 'react'
import type { CategoryDef } from '../types'
import { getScheduleCategories, saveScheduleCategories } from '../types'

interface Props {
  onClose: () => void
}

function generateKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'cat'
}

const PRESET_COLORS = [
  { color: '#EF4444', bg: '#FEE2E2' },
  { color: '#F97316', bg: '#FFEDD5' },
  { color: '#F59E0B', bg: '#FEF3C7' },
  { color: '#10B981', bg: '#D1FAE5' },
  { color: '#06B6D4', bg: '#CFFAFE' },
  { color: '#3B82F6', bg: '#DBEAFE' },
  { color: '#6366F1', bg: '#E0E7FF' },
  { color: '#8B5CF6', bg: '#EDE9FE' },
  { color: '#EC4899', bg: '#FCE7F3' },
  { color: '#6B7280', bg: '#F3F4F6' },
]

export function CategoryManager({ onClose }: Props) {
  const [categories, setCategories] = useState<CategoryDef[]>(() => getScheduleCategories())
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editBg, setEditBg] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [showNew, setShowNew] = useState(false)

  const handleSave = () => {
    saveScheduleCategories(categories)
    onClose()
  }

  const startEdit = (cat: CategoryDef) => {
    setEditingKey(cat.key)
    setEditLabel(cat.label)
    setEditColor(cat.color)
    setEditBg(cat.bg)
  }

  const confirmEdit = () => {
    if (!editLabel.trim() || !editingKey) return
    setCategories((prev) =>
      prev.map((c) =>
        c.key === editingKey ? { ...c, label: editLabel.trim(), color: editColor, bg: editBg } : c
      )
    )
    setEditingKey(null)
  }

  const handleDelete = (key: string) => {
    if (categories.length <= 1) return
    setCategories((prev) => prev.filter((c) => c.key !== key))
  }

  const addNew = () => {
    if (!newLabel.trim()) return
    const key = generateKey(newLabel.trim())
    if (categories.some((c) => c.key === key)) return
    const preset = PRESET_COLORS[categories.length % PRESET_COLORS.length]
    setCategories((prev) => [...prev, { key, label: newLabel.trim(), color: preset.color, bg: preset.bg }])
    setNewLabel('')
    setShowNew(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <h2 className="text-lg font-bold p-6 pb-0 shrink-0">カテゴリ管理</h2>
        <div className="p-6 overflow-y-auto min-h-0 space-y-2">
          {categories.map((cat) => (
            <div key={cat.key} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
              {editingKey === cat.key ? (
                <div className="flex-1 space-y-2">
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">色:</span>
                    {PRESET_COLORS.map((pc) => (
                      <button
                        key={pc.color}
                        onClick={() => { setEditColor(pc.color); setEditBg(pc.bg) }}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                          editColor === pc.color ? 'border-blue-500 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: pc.color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={confirmEdit} className="px-3 py-1 text-xs bg-blue-600 text-white rounded">確定</button>
                    <button onClick={() => setEditingKey(null)} className="px-3 py-1 text-xs border border-slate-200 rounded">取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-sm text-slate-700">{cat.label}</span>
                  <span className="text-xs text-slate-400 font-mono">{cat.key}</span>
                  <button onClick={() => startEdit(cat)} className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded">✎</button>
                  <button
                    onClick={() => handleDelete(cat.key)}
                    disabled={categories.length <= 1}
                    className="px-2 py-1 text-xs text-red-400 hover:bg-red-50 rounded disabled:opacity-30"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="px-6 pb-6 shrink-0 space-y-3">
          {showNew ? (
            <div className="flex items-center gap-2">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNew()}
                placeholder="カテゴリ名"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                autoFocus
              />
              <button onClick={addNew} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg">追加</button>
              <button onClick={() => setShowNew(false)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg">取消</button>
            </div>
          ) : (
            <button onClick={() => setShowNew(true)} className="w-full px-4 py-2 text-sm border border-dashed border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50">
              + カテゴリを追加
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">閉じる</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}
