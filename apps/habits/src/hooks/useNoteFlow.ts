import { useState, useCallback } from 'react'

export type PendingNote = { taskId: string; taskName: string }

export function useNoteFlow() {
  const [pending, setPending] = useState<PendingNote | null>(null)
  const [prompt, setPrompt] = useState<PendingNote | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const setPendingFromCheckIn = useCallback((taskId: string, taskName: string) => {
    setPending({ taskId, taskName })
  }, [])

  const handleToastClick = useCallback(() => {
    if (pending) {
      setPrompt(pending)
      setPending(null)
    }
  }, [pending])

  const handleNoteModalClose = useCallback(() => {
    setPrompt(null)
    setPending(null)
  }, [])

  const handleNoteSaved = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const clearPending = useCallback(() => {
    setPending(null)
  }, [])

  return {
    pending,
    prompt,
    refreshKey,
    setPendingFromCheckIn,
    handleToastClick,
    handleNoteModalClose,
    handleNoteSaved,
    clearPending,
  }
}
