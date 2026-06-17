import { useState, useCallback } from 'react'

export function useToast() {
  const [message, setMessage] = useState('')
  const [key, setKey] = useState(0)

  const show = useCallback((msg: string) => {
    setMessage(msg)
    setKey((k) => k + 1)
  }, [])

  const close = useCallback(() => {
    setMessage('')
  }, [])

  return {
    message,
    key,
    show,
    close,
    isVisible: !!message,
  }
}
