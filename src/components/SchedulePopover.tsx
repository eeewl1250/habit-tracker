import { useEffect, useRef } from 'react'
import { format, parse } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getScheduleCategories } from '../types'
import type { ScheduleCategory } from '../types'

interface Instance {
  id: string
  title: string
  category: ScheduleCategory
  date: string
  time_start: string | null
  time_end: string | null
  url: string | null
  memo: string | null
  is_recurring: boolean
  original_id: string
}

interface Props {
  instance: Instance
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function SchedulePopover({ instance, onClose, onEdit, onDelete }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const cat = getScheduleCategories().find((c) => c.key === instance.category)!

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const dateObj = parse(instance.date, 'yyyy-MM-dd', new Date())
  const dateLabel = format(dateObj, 'yyyy年 M月 d日 (E)', { locale: ja })

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
      >
        {/* URL banner */}
        {instance.url && (
          <a
            href={instance.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: cat.bg, color: cat.color }}
          >
            <span>🌐</span>
            <span>外部リンクを開く</span>
          </a>
        )}

        <div className="p-4">
          {/* Category badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-2 py-0.5 text-xs rounded-full text-white font-medium"
              style={{ backgroundColor: cat.color }}
            >
              {cat.label}
            </span>
            {instance.is_recurring && (
              <span className="text-xs text-slate-400">繰り返し</span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-slate-800 mb-2">{instance.title}</h3>

          {/* Date/time */}
          <div className="text-sm text-slate-600 mb-3">
            <div>{dateLabel}</div>
            {instance.time_start && (
              <div>
                {instance.time_start.slice(0, 5)}
                {instance.time_end ? ` - ${instance.time_end.slice(0, 5)}` : ''}
              </div>
            )}
          </div>

          {/* Memo */}
          {instance.memo && (
            <div className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-3 whitespace-pre-wrap">
              {instance.memo}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={onEdit}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            >
              編集
            </button>
            <button
              onClick={onDelete}
              className="flex-1 px-3 py-2 text-sm border border-red-200 rounded-lg text-red-500 hover:bg-red-50"
            >
              削除
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
