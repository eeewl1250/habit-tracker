import { useState, useEffect } from 'react'

interface ToastProps {
  message: string
  visible: boolean
  onClose: () => void
  onClick: () => void
}

export function Toast({ message, visible, onClose, onClick }: ToastProps) {
  const [animatingOut, setAnimatingOut] = useState(false)

  useEffect(() => {
    if (visible) {
      setAnimatingOut(false)
      const timer = setTimeout(() => {
        setAnimatingOut(true)
        setTimeout(onClose, 300)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm cursor-pointer transition-all duration-300 ${
        animatingOut ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
      onClick={onClick}
    >
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
        <span className="text-sm flex-1">{message}</span>
        <button
          onClick={(e) => { e.stopPropagation(); setAnimatingOut(true); setTimeout(onClose, 300) }}
          className="text-white/60 hover:text-white text-lg leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  )
}
