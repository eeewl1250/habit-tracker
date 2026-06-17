import { useState, useRef, useEffect } from 'react'

interface CategoryComboboxProps {
  value: string
  options: string[]
  onChange: (value: string) => void
}

export function CategoryCombobox({
  value,
  options,
  onChange,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState(value)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = options.filter(
    (o) => o.toLowerCase().includes(input.toLowerCase()) && o !== input
  )
  const showCreate =
    input.trim() !== '' &&
    !options.some((o) => o.toLowerCase() === input.toLowerCase())

  useEffect(() => {
    setInput(value)
  }, [value])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const select = (val: string) => {
    setInput(val)
    onChange(val)
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && showCreate) {
            select(input.trim())
          }
          if (e.key === 'Escape') setOpen(false)
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        placeholder="例: 生活, 就活"
      />
      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => select(option)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
            >
              {option}
            </button>
          ))}
          {filtered.length === 0 && !showCreate && (
            <div className="px-3 py-2 text-sm text-gray-400">
              カテゴリがありません
            </div>
          )}
          {showCreate && (
            <button
              type="button"
              onClick={() => select(input.trim())}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors border-t border-gray-100"
            >
              + 「{input.trim()}」を新規追加
            </button>
          )}
        </div>
      )}
    </div>
  )
}
