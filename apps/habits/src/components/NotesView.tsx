import { useState, useEffect, useMemo } from 'react'
import type { NoteWithTask, Category } from '../types'
import { fetchNotesWithTasks, deleteNote } from '../lib/api'

interface NotesViewProps {
  categories: Category[]
  categoryColor: Map<string, string>
}

export function NotesView({ categories, categoryColor }: NotesViewProps) {
  const [notes, setNotes] = useState<NoteWithTask[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = async () => {
    try {
      const data = await fetchNotesWithTasks()
      setNotes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    try {
      await deleteNote(id)
      setConfirmDelete(null)
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, NoteWithTask[]>()
    const uncategorized: NoteWithTask[] = []

    for (const n of notes) {
      const cat = n.task_category || ''
      if (cat) {
        if (!map.has(cat)) map.set(cat, [])
        map.get(cat)!.push(n)
      } else {
        uncategorized.push(n)
      }
    }

    const catNames = categories.map((c) => c.name)
    const sorted = [...map.entries()].sort(
      ([a], [b]) => catNames.indexOf(a) - catNames.indexOf(b)
    )

    return { grouped: sorted, uncategorized }
  }, [notes, categories])

  const formatDate = (d: string) => {
    const date = new Date(d)
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-400">読み込み中...</div>
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
      {notes.length === 0 && (
        <p className="text-center text-gray-400 py-8">
          タスクを完了すると、右下にメモ入力の案内が表示されます
        </p>
      )}

      {grouped.grouped.map(([category, catNotes]) => {
        const color = categoryColor.get(category) ?? '#4CAF50'
        return (
          <section key={category}>
            <h3 className="text-sm font-bold mb-3" style={{ color }}>
              {category}
              <span className="text-xs text-gray-400 ml-2 font-normal">{catNotes.length}</span>
            </h3>
            <div className="space-y-2">
              {catNotes.map((note) => (
                <div key={note.id}
                  className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400 mb-1">
                        {note.task_name}
                        <span className="mx-1">·</span>
                        {formatDate(note.created_at)}
                      </div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmDelete(note.id)}
                      className="text-xs text-red-400 hover:text-red-600 px-1 flex-shrink-0"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {grouped.uncategorized.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-500 mb-3">その他</h3>
          <div className="space-y-2">
            {grouped.uncategorized.map((note) => (
              <div key={note.id}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400 mb-1">
                      {note.task_name} · {formatDate(note.created_at)}
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(note.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-1 flex-shrink-0"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">削除確認</h3>
            <p className="text-sm text-gray-600 mb-4">このメモを削除しますか？</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                削除
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
