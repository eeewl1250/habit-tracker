import { useState, useCallback, useRef } from 'react'

export function useConfirm() {
  const [message, setMessage] = useState<string | null>(null)
  const resolveRef = useRef<(v: boolean) => void>(() => {})

  const confirm = useCallback((msg: string) => {
    setMessage(msg)
    return new Promise<boolean>(resolve => {
      resolveRef.current = resolve
    })
  }, [])

  const handleOk = useCallback(() => {
    resolveRef.current(true)
    setMessage(null)
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current(false)
    setMessage(null)
  }, [])

  const modal = message ? (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) handleCancel() }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <p className="text-sm text-gray-700 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={handleOk}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            OK
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  ) : null

  return [confirm, modal] as const
}
