import { useState, useEffect, useRef } from 'react'
import type { Note } from '../types'
import { fetchNotes, createNote, updateNote, deleteNote } from '../lib/api'

export function NotesView() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [newText, setNewText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const load = async () => {
    try {
      const data = await fetchNotes()
      setNotes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    const text = newText.trim()
    if (!text) return
    try {
      await createNote(text)
      setNewText('')
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  const handleEdit = async (id: string) => {
    const text = editText.trim()
    if (!text) return
    try {
      await updateNote(id, text)
      setEditingId(null)
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNote(id)
      setConfirmDelete(null)
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  const startEdit = (note: Note) => {
    setEditingId(note.id)
    setEditText(note.content)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-400">読み込み中...</div>
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="新しいメモを入力..."
          rows={2}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
        >
          追加
        </button>
      </div>

      {notes.length === 0 && (
        <p className="text-center text-gray-400 py-8">メモはまだありません</p>
      )}

      <div className="space-y-3">
        {notes.map((note) =>
          editingId === note.id ? (
            <div key={note.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => handleEdit(note.id)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div key={note.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed min-w-0">
                  {note.content}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(note)}
                    className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => setConfirmDelete(note.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1"
                  >
                    削除
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-2">
                {new Date(note.updated_at).toLocaleString('ja-JP')}
              </div>
            </div>
          )
        )}
      </div>

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
