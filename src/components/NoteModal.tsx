import { useState, useRef, useEffect } from 'react'
import { createNote } from '../lib/api'

interface NoteModalProps {
  taskId: string
  taskName: string
  onClose: () => void
  onSaved: () => void
}

export function NoteModal({ taskId, taskName, onClose, onSaved }: NoteModalProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [])

  const handleSave = async () => {
    if (!content.trim()) { onClose(); return }
    setSaving(true)
    try {
      await createNote(taskId, content.trim())
      onSaved()
      onClose()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-1">メモを記録</h3>
        <p className="text-sm text-gray-500 mb-4">{taskName}</p>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="気づきや感想を書き留めておこう..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saving ? '保存中...' : content.trim() ? '保存' : 'スキップ'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
