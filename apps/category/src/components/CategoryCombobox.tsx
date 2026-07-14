// apps/category/src/components/CategoryCombobox.tsx

import { useState, useRef, useEffect } from 'react'
import type { Category } from '../types'
import { CATEGORY_COLOR_PAIRS } from '../types'
import { createCategory } from '../lib/api'

interface CategoryComboboxProps {
  value: string
  options: Category[]
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

  const currentCat = options.find((c) => c.name === input)

  const filtered = options.filter(
    (o) => o.name.toLowerCase().includes(input.toLowerCase()) && o.name !== input
  )
  const showCreate =
    input.trim() !== '' &&
    !options.some((o) => o.name.toLowerCase() === input.toLowerCase())

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

  const select = async (val: string) => {
    const exists = options.find((o) => o.name === val)
    if (!exists && val.trim()) {
      const color = CATEGORY_COLOR_PAIRS[options.length % CATEGORY_COLOR_PAIRS.length].dot
      try { await createCategory(val.trim(), color) } catch { /* ignore */ }
    }
    setInput(val)
    onChange(val)
    setOpen(false)
    inputRef.current?.blur()
  }

  const usedColors = new Set(options.map((c) => c.color))
  const availColor = CATEGORY_COLOR_PAIRS.find((p) => !usedColors.has(p.dot))?.dot ?? CATEGORY_COLOR_PAIRS[options.length % CATEGORY_COLOR_PAIRS.length].dot

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        {currentCat && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{ backgroundColor: currentCat.color }} />
        )}
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
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${currentCat ? 'pl-8' : 'pl-3'}`}
          placeholder="例: 生活, 就活"
        />
      </div>
      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option.name}
              type="button"
              onClick={() => select(option.name)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: option.color }} />
              {option.name}
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
              className="w-full text-left px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors border-t border-gray-100 flex items-center gap-2"
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: availColor }} />
              + 「{input.trim()}」を新規追加
            </button>
          )}
        </div>
      )}
    </div>
  )
}
