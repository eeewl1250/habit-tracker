// apps/category/src/components/CategoryManagerPage.tsx

import { useState, useEffect } from 'react'
import type { CategoryDefinition } from '../types'
import {
  fetchCategoryDefinitions,
  createCategoryDefinition,
  updateCategoryDefinition,
  deleteCategoryDefinition,
  checkCategoryUsage,
  seedDefaultCategories,
  type CategoryUsage,
} from '../lib/api'
import { CatIcon } from './Icon'
import { IconPicker } from './IconPicker'

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

export function CategoryManagerPage() {
  const [categories, setCategories] = useState<CategoryDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editBg, setEditBg] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [editBonusEnabled, setEditBonusEnabled] = useState(false)
  const [editBonusRate, setEditBonusRate] = useState(0)
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [deletePreview, setDeletePreview] = useState<{ id: string; name: string; usage: CategoryUsage } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const data = await fetchCategoryDefinitions()
      setCategories(data)
    } catch {
      setError('カテゴリの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSeed = async () => {
    try {
      await seedDefaultCategories()
      await load()
    } catch {
      setError('デフォルトカテゴリの作成に失敗しました')
    }
  }

  const startEdit = (cat: CategoryDefinition) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
    setEditBg(cat.bg_color)
    setEditEmoji(cat.emoji)
    setEditBonusEnabled(cat.bonus_enabled)
    setEditBonusRate(cat.bonus_rate)
  }

  const confirmEdit = async () => {
    if (!editName.trim() || !editingId) return
    try {
      await updateCategoryDefinition(editingId, {
        name: editName.trim(),
        color: editColor,
        bg_color: editBg,
        emoji: editEmoji,
        bonus_enabled: editBonusEnabled,
        bonus_rate: editBonusRate,
      })
      setEditingId(null)
      await load()
    } catch {
      setError('更新に失敗しました')
    }
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    const preset = PRESET_COLORS[categories.length % PRESET_COLORS.length]
    try {
      await createCategoryDefinition({
        name: newName.trim(),
        color: preset.color,
        bg_color: preset.bg,
        emoji: 'category',
        bonus_enabled: false,
        bonus_rate: 0,
      })
      setNewName('')
      setShowNew(false)
      await load()
    } catch {
      setError('追加に失敗しました')
    }
  }

  const handleDeletePreview = async (cat: CategoryDefinition) => {
    if (cat.is_default) return
    try {
      const usage = await checkCategoryUsage(cat.name)
      setDeletePreview({ id: cat.id, name: cat.name, usage })
    } catch {
      setError('使用状況の確認に失敗しました')
    }
  }

  const confirmDelete = async () => {
    if (!deletePreview) return
    try {
      await deleteCategoryDefinition(deletePreview.id)
      setDeletePreview(null)
      await load()
    } catch {
      setError('削除に失敗しました')
    }
  }

  const totalUsage = (u: CategoryUsage) =>
    u.tasks.length + u.todos.length + u.schedules.length + u.timeLogs.length

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">読み込み中...</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">カテゴリ管理</h2>
        <button
          onClick={handleSeed}
          className="px-3 py-1.5 text-xs border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50"
        >
          デフォルトに戻す
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">カテゴリがありません。</p>
          <button onClick={handleSeed} className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">
            デフォルトカテゴリを作成
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
              {editingId === cat.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1 text-sm"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
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
                  <IconPicker value={editEmoji} onChange={setEditEmoji} />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={editBonusEnabled}
                        onChange={(e) => setEditBonusEnabled(e.target.checked)}
                      />
                      集中ボーナス
                    </label>
                    {editBonusEnabled && (
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <span>¥</span>
                        <input
                          type="number"
                          value={editBonusRate}
                          onChange={(e) => setEditBonusRate(Math.max(0, Number(e.target.value)))}
                          className="w-20 border border-slate-200 rounded px-1 py-0.5 text-sm"
                        />
                        <span>/h</span>
                      </label>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={confirmEdit} className="px-3 py-1 text-xs bg-blue-600 text-white rounded">確定</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs border border-slate-200 rounded">取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <CatIcon name={cat.emoji} className="text-lg" />
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-sm text-slate-700 font-medium">{cat.name}</span>
                  {cat.is_default && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">default</span>
                  )}
                  {(cat.bonus_enabled && cat.bonus_rate > 0) && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      ¥{cat.bonus_rate}/h
                    </span>
                  )}
                  <button onClick={() => startEdit(cat)} className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded">✎</button>
                  <button
                    onClick={() => handleDeletePreview(cat)}
                    disabled={cat.is_default}
                    className="px-2 py-1 text-xs text-red-400 hover:bg-red-50 rounded disabled:opacity-30"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="pt-2">
        {showNew ? (
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="カテゴリ名"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
            <button onClick={handleAdd} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg">追加</button>
            <button onClick={() => setShowNew(false)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg">取消</button>
          </div>
        ) : (
          <button
            onClick={() => setShowNew(true)}
            className="w-full px-4 py-2 text-sm border border-dashed border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50"
          >
            + カテゴリを追加
          </button>
        )}
      </div>

      {/* Delete preview dialog */}
      {deletePreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-slate-800">「{deletePreview.name}」を削除</h3>
            <p className="text-sm text-slate-600">以下のデータはデフォルトカテゴリに移動されます：</p>
            {totalUsage(deletePreview.usage) === 0 ? (
              <p className="text-sm text-slate-400">このカテゴリを使用しているデータはありません。</p>
            ) : (
              <div className="space-y-1 text-sm text-slate-600">
                {deletePreview.usage.tasks.length > 0 && (
                  <p>📋 タスク: {deletePreview.usage.tasks.length}件</p>
                )}
                {deletePreview.usage.todos.length > 0 && (
                  <p>✅ TODO: {deletePreview.usage.todos.length}件</p>
                )}
                {deletePreview.usage.schedules.length > 0 && (
                  <p>📅 日程: {deletePreview.usage.schedules.length}件</p>
                )}
                {deletePreview.usage.timeLogs.length > 0 && (
                  <p>⏱ 集中ログ: {deletePreview.usage.timeLogs.length}件</p>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletePreview(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
