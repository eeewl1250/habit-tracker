// apps/diary/src/components/DiaryView.tsx
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  format, startOfMonth, addMonths, subMonths,
  getDay, getDaysInMonth, isFuture, isPast, isToday, parseISO,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { diffChars } from 'diff'
import { correctDiary } from '../lib/gemini'
import { getSavedThemeId, getTheme, buildMarkdownComponents } from '../lib/markdownThemes'
import { uploadDiaryImage, deleteDiaryImage } from '../lib/api'
import type { DiaryEntry } from '../types'

import { useConfirm } from '../hooks/useConfirm'

export type DiarySubMode = 'calendar' | 'editor'

interface DiaryViewProps {
  entries: DiaryEntry[]
  onSave: (date: string, originalText: string) => Promise<DiaryEntry | null>
  onUpdate: (date: string, updates: { original_text?: string; corrected_text?: string | null; ai_advice?: string | null }) => Promise<DiaryEntry | null>
  onModeChange?: (mode: DiarySubMode) => void
}

type ViewMode = 'calendar' | 'editor'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function DiffView({ original, corrected }: { original: string; corrected: string }) {
  const changes = diffChars(original, corrected)

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">
          <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded align-middle mr-0.5" />
          追加
          <span className="ml-2 inline-block w-3 h-3 bg-red-100 border border-red-300 rounded align-middle mr-0.5" />
          削除
        </span>
      </div>
      <div className="p-3 bg-white border border-gray-200 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
        {changes.length === 0 ? (
          <span className="text-gray-400">差異はありません</span>
        ) : changes.map((part, i) => {
          if (part.added) {
            return <span key={i} className="bg-green-100 text-green-800 rounded px-0.5">{part.value}</span>
          }
          if (part.removed) {
            return <span key={i} className="bg-red-100 text-red-500 line-through rounded px-0.5">{part.value}</span>
          }
          return <span key={i}>{part.value}</span>
        })}
      </div>
    </div>
  )
}

function DiaryEditor({
  dateStr,
  entry,
  onSave,
  onUpdate,
  onBack,
}: {
  dateStr: string
  entry?: DiaryEntry
  onSave: (date: string, text: string) => Promise<DiaryEntry | null>
  onUpdate: (date: string, updates: { original_text?: string; corrected_text?: string | null; ai_advice?: string | null }) => Promise<DiaryEntry | null>
  onBack: () => void
}) {
  const [freeText, setFreeText] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const freeTextRef = useRef(freeText)
  freeTextRef.current = freeText
  const [correctedText, setCorrectedText] = useState<string | null>(entry?.corrected_text ?? null)
  const [aiAdvice, setAiAdvice] = useState<string | null>(entry?.ai_advice ?? null)
  const [isCorrectionLoading, setIsCorrectionLoading] = useState(false)
  const [correctionError, setCorrectionError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showCorrection, setShowCorrection] = useState(!!entry?.corrected_text)
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>(entry?.original_text ? 'view' : 'edit')
  const entryRef = useRef(entry ?? null)
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null)

  const text = freeText
  const textRef = useRef(text)
  textRef.current = text
  const lastSavedTextRef = useRef(text)
  const isDirty = text !== lastSavedTextRef.current

  const [images, setImages] = useState<string[]>([])
  const imgInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const [themeId] = useState<string>(getSavedThemeId)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [confirm, ConfirmModal] = useConfirm()
  const themeRef = useRef<HTMLDivElement>(null)
  const currentTheme = getTheme(themeId)
  const markdownComponents = useMemo(() => buildMarkdownComponents(currentTheme), [currentTheme])

  useEffect(() => {
    if (!showThemePicker) return
    const handleClick = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showThemePicker])

  useEffect(() => {
    const original = entry?.original_text ?? ''
    if (original.trim()) {
      setFreeText(original)
      lastSavedTextRef.current = original
      const matched = Array.from(original.matchAll(/!\[.*?\]\((.*?)\)/g), m => m[1]).filter(u => !u.startsWith('blob:'))
      if (matched.length > 0) setImages(matched)
    }
  }, [entry])

  const dateObj = parseISO(dateStr)
  const dateLabel = format(dateObj, 'yyyy年 M月d日 (E)', { locale: ja })

  const doSave = useCallback(async (content: string) => {
    if (entryRef.current) {
      await onUpdate(dateStr, { original_text: content })
    } else {
      const created = await onSave(dateStr, content)
      if (created) entryRef.current = created
    }
    lastSavedTextRef.current = content
    setLastSavedLabel(format(new Date(), 'HH:mm'))
  }, [dateStr, onSave, onUpdate])

  // Auto-save every 60s
  useEffect(() => {
    const timer = setInterval(async () => {
      const currentText = freeTextRef.current
      if (!currentText.trim()) return
      if (currentText === lastSavedTextRef.current) return
      try {
        await doSave(currentText)
      } catch { /* silent */ }
    }, 60_000)
    return () => clearInterval(timer)
  }, [doSave])

  if (entry) entryRef.current = entry

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await doSave(freeText)
    } finally {
      setIsSaving(false)
    }
  }, [freeText, doSave])

  const handleAICorrection = useCallback(async () => {
    if (!freeText.trim()) return
    setIsCorrectionLoading(true)
    setCorrectionError(null)
    try {
      const result = await correctDiary(freeText)
      setCorrectedText(result.corrected_text)
      setAiAdvice(result.advice)
      setShowCorrection(true)
      await doSave(freeText)
      if (result.corrected_text) {
        await onUpdate(dateStr, { corrected_text: result.corrected_text, ai_advice: result.advice })
      }
    } catch (e) {
      setCorrectionError(e instanceof Error ? e.message : '添削に失敗しました')
    } finally {
      setIsCorrectionLoading(false)
    }
  }, [freeText, doSave, dateStr, onUpdate])

  const handleGoToEdit = useCallback(() => {
    setActiveTab('edit')
  }, [])
  const handleGoToView = useCallback(() => {
    setActiveTab('view')
  }, [])

  const handleToolbarInsert = useCallback((before: string, after: string, placeholder?: string) => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = freeText.slice(start, end)
    const insert = selected || placeholder || ''
    const newText = before + insert + after
    setFreeText(prev => prev.slice(0, start) + newText + prev.slice(end))
    const cursorPos = start + before.length + (selected || placeholder || '').length
    setTimeout(() => { el.setSelectionRange(cursorPos, cursorPos); el.focus() })
  }, [freeText])

  const [headingPickerPos, setHeadingPickerPos] = useState<{ top: number; left: number } | null>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!headingPickerPos) return
    const handleClick = (e: MouseEvent) => {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) {
        setHeadingPickerPos(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [headingPickerPos])

  const [templatePickerPos, setTemplatePickerPos] = useState<{ top: number; left: number } | null>(null)
  const templateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!templatePickerPos) return
    const handleClick = (e: MouseEvent) => {
      if (templateRef.current && !templateRef.current.contains(e.target as Node)) {
        setTemplatePickerPos(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [templatePickerPos])

  const headingLevels = [
    { label: 'H1', before: '# ', placeholder: '見出し' },
    { label: 'H2', before: '## ', placeholder: '見出し' },
    { label: 'H3', before: '### ', placeholder: '見出し' },
    { label: 'H4', before: '#### ', placeholder: '見出し' },
  ]

  const TEMPLATES_STORAGE_KEY = 'habit-tracker-diary-templates'

  interface Template { id: string; label: string; content: string }

  function generateId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

  const defaultTemplates: Template[] = [
    { id: 'fixed', label: '📌 固定ページ', content: '## 📌 今日の足迹（今日めでたこと）\n\n\n## 📌 推活/推し活発見\n\n\n## 📌 今日の確幸（嬉しかったこと）\n\n\n## 📌 今日の新知と収穫\n\n\n---' },
    { id: 'diary', label: '📝 日記', content: '## 今日の出来事\n\n## 感想\n\n## 気づき' },
  ]

  function loadTemplates(): Template[] {
    try {
      const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* noop */ }
    return defaultTemplates
  }

  function saveTemplates(ts: Template[]) {
    try { localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(ts)) } catch { /* noop */ }
  }

  const [templates, setTemplates] = useState<Template[]>(loadTemplates)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editContent, setEditContent] = useState('')

  const handleSaveTemplate = useCallback(() => {
    const label = editLabel.trim()
    const content = editContent.trim()
    if (!label || !content) return
    const ts = [...templates]
    if (editingTemplate) {
      const idx = ts.findIndex(t => t.id === editingTemplate.id)
      if (idx >= 0) ts[idx] = { ...editingTemplate, label, content }
    } else {
      ts.push({ id: generateId(), label, content })
    }
    setTemplates(ts)
    saveTemplates(ts)
    setEditingTemplate(null)
    setEditLabel('')
    setEditContent('')
  }, [templates, editingTemplate, editLabel, editContent])

  const handleDeleteTemplate = useCallback((id: string) => {
    const ts = templates.filter(t => t.id !== id)
    setTemplates(ts)
    saveTemplates(ts)
    if (editingTemplate?.id === id) {
      setEditingTemplate(null)
      setEditLabel('')
      setEditContent('')
    }
  }, [templates, editingTemplate])

  const openTemplateManager = useCallback(() => {
    setEditingTemplate(null)
    setEditLabel('')
    setEditContent('')
    setShowTemplateManager(true)
  }, [])

  const toolbarButtons = [
    { label: 'B', title: '太字', before: '**', after: '**', placeholder: 'テキスト' },
    { label: 'I', title: '斜体', before: '*', after: '*', placeholder: 'テキスト' },
    { label: 'S', title: '取消線', before: '~~', after: '~~', placeholder: 'テキスト' },
    { label: '>', title: '引用', before: '> ', after: '', placeholder: '引用文' },
    { label: '•', title: 'リスト', before: '- ', after: '', placeholder: '項目' },
    { label: '1.', title: '番号付きリスト', before: '1. ', after: '', placeholder: '項目' },
    { label: '☐', title: 'タスク', before: '- [ ] ', after: '', placeholder: 'タスク' },
    { label: '<>', title: 'インラインコード', before: '`', after: '`', placeholder: 'コード' },
    { label: '```', title: 'コードブロック', before: '\n\n', after: '\n\n', placeholder: 'コード' },
    { label: '🔗', title: 'リンク', before: '[', after: '](url)', placeholder: 'テキスト' },
    { label: '🖼', title: '画像', before: '![', after: '](url)', placeholder: 'alt' },
    { label: '📋', title: 'テーブル', before: '\n| 見出し | 見出し | 見出し |\n| --- | --- | --- |\n| セル | セル | セル |\n', after: '' },
    { label: '---', title: '区切り線', before: '\n---\n', after: '' },
  ]

  const handleImgUpload = useCallback(async (file: File) => {
    const el = textareaRef.current
    const cursorPos = el ? el.selectionStart : freeText.length
    const url = await uploadDiaryImage(file, dateStr)
    setImages(prev => [...prev, url])
    const mdTag = `![image](${url})`
    setFreeText(prev => prev.slice(0, cursorPos) + mdTag + prev.slice(cursorPos))
    if (el) {
      const newPos = cursorPos + mdTag.length
      setTimeout(() => { el.setSelectionRange(newPos, newPos); el.focus() })
    }
  }, [dateStr])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    files.forEach(handleImgUpload)
  }, [handleImgUpload])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items).filter(i => i.type.startsWith('image/'))
    if (items.length === 0) return
    e.preventDefault()
    items.forEach(item => {
      const file = item.getAsFile()
      if (file) handleImgUpload(file)
    })
  }, [handleImgUpload])

  const removeImage = useCallback((index: number) => {
    const url = images[index]
    const imgMd = `![image](${url})`
    setFreeText(prev => prev.replace(imgMd, '').replace(/\n{2,}/g, '\n').trim())
    setImages(prev => prev.filter((_, i) => i !== index))
    if (!url.startsWith('blob:')) deleteDiaryImage(url).catch(() => {})
  }, [images])

  return (
    <div className="flex flex-col h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={async () => {
            if (isDirty && !await confirm('保存されていない変更があります。破棄しますか？')) return
            onBack()
          }} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
            ←<span className="hidden sm:inline">カレンダー</span>
            </button>
          <span className="text-xs text-gray-400 hidden sm:inline">|</span>
          <span className="text-xs text-gray-500 hidden sm:inline">{dateLabel}</span>
          </div>

        {/* View/Edit tabs */}
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={handleGoToView}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'view'
                ? 'bg-blue-100 text-blue-700 font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            閲覧ページ
          </button>
          <span className="text-gray-300 select-none">|</span>
          <button
            onClick={handleGoToEdit}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'edit'
                ? 'bg-blue-100 text-blue-700 font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            編集ページ
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'edit' ? (
            <>
              {lastSavedLabel && (
                <span className="text-[10px] text-gray-400">前回保存した：{lastSavedLabel}</span>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? '💾 保存中...' : '💾 保存'}
              </button>
            </>
          ) : (
            <button
              onClick={handleAICorrection}
              disabled={isCorrectionLoading || isSaving || !text.trim()}
              className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isCorrectionLoading ? '✨ チェック中...' : '✨ AI添削'}
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden flex justify-center">
        {activeTab === 'edit' ? (
          /* ── Editor: Image bar + Two-column editor ── */
          <div className="w-full max-w-5xl flex flex-col my-2 border-gray-200 bg-white border rounded-xl mb-4">
            {/* Image bar */}
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 overflow-x-auto min-h-[56px] rounded-t-xl"
            >
              {images.length === 0 && (
                <span className="text-xs text-gray-400 whitespace-nowrap">🖼 画像をドロップ or ペースト</span>
              )}
              {images.map((img, i) => (
                <div key={i} className="relative group shrink-0">
                  <img src={img} alt="" className="w-10 h-10 object-cover rounded border border-gray-200" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => imgInputRef.current?.click()}
                className="shrink-0 px-2 py-1 text-xs text-gray-500 border border-dashed border-gray-300 rounded hover:bg-gray-100"
              >
                📤 追加
              </button>
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  files.forEach(handleImgUpload)
                  e.target.value = ''
                }}
              />
            </div>

            {/* Toolbar */}
            <div ref={toolbarRef} className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-gray-50 overflow-x-auto">
              {toolbarButtons.map((btn) => (
                <button
                  key={btn.label + btn.title}
                  onMouseDown={(e) => { e.preventDefault(); handleToolbarInsert(btn.before, btn.after, btn.placeholder) }}
                  title={btn.title}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors whitespace-nowrap"
                >
                  {btn.label}
                </button>
              ))}
              <span className="w-px h-4 bg-gray-300 mx-0.5" />
              <div className="relative" ref={headingRef}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setHeadingPickerPos(p => p ? null : { top: r.bottom + 4, left: r.left }) }}
                  title="見出し"
                  className="px-2 py-1 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors whitespace-nowrap"
                >
                  H ▾
                </button>
                {headingPickerPos && (
                  <div
                    className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg min-w-[5rem]"
                    style={{ top: headingPickerPos.top, left: headingPickerPos.left }}
                  >
                    {headingLevels.map(h => (
                      <button
                        key={h.label}
                        onMouseDown={(e) => { e.preventDefault(); handleToolbarInsert(h.before, '', h.placeholder); setHeadingPickerPos(null) }}
                        className="block w-full px-3 py-1.5 text-xs text-left text-gray-600 hover:bg-gray-100"
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="w-px h-4 bg-gray-300 mx-0.5" />
              {/* Template button */}
              <div className="relative" ref={templateRef}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setTemplatePickerPos(p => p ? null : { top: r.bottom + 4, left: r.left }) }}
                  title="テンプレート"
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors whitespace-nowrap"
                >
                  📋 ▾
                </button>
                {templatePickerPos && (
                  <div
                    className="fixed z-50 bg-white border border-gray-200 rounded shadow-lg min-w-[12rem]"
                    style={{ top: templatePickerPos.top, left: templatePickerPos.left }}
                  >
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onMouseDown={(e) => { e.preventDefault(); handleToolbarInsert(t.content, '', ''); setTemplatePickerPos(null) }}
                        className="block w-full px-3 py-1.5 text-xs text-left text-gray-600 hover:bg-gray-100 truncate"
                      >
                        {t.label}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onMouseDown={(e) => { e.preventDefault(); setTemplatePickerPos(null); openTemplateManager() }}
                      className="block w-full px-3 py-1.5 text-xs text-left text-blue-600 hover:bg-blue-50 font-medium"
                    >
                      ✏️ テンプレート管理
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Two-column editor */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 mb-2">
              <textarea
                ref={textareaRef}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onPaste={handlePaste}
                placeholder="自由に書こう..."
                className="w-full md:w-1/2 min-h-[300px] md:min-h-0 p-4 text-sm font-mono leading-relaxed resize-none border-r border-gray-200 focus:outline-none"
              />
              <div className="hidden md:block w-1/2 overflow-y-auto p-4 bg-white markdown-preview">
                {freeText.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                    {freeText}
                  </ReactMarkdown>
                ) : (
                  <div className="text-sm text-gray-400">プレビュー</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 space-y-6 max-w-5xl w-full my-2">
            {/* No text state */}
            {!text.trim() && !showCorrection && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm text-gray-400 mb-4">まだ日記を書いていません</p>
                <button
                  onClick={handleGoToEdit}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ✏️ 編集する
                </button>
              </div>
            )}

            {/* Original text display */}
            {text.trim() && !showCorrection && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">📝 あなたの日記</h3>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg markdown-preview">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                    {text}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Loading */}
            {isCorrectionLoading && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-600">AI先生がチェック中...</p>
              </div>
            )}

            {/* Error */}
            {correctionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{correctionError}</p>
              </div>
            )}

            {/* Correction results */}
            {showCorrection && correctedText && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">📝 あなたの日記</h3>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg markdown-preview">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                        {text}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">✅ 修正後</h3>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg markdown-preview">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                        {correctedText}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3">🔍 差異</h3>
                  <DiffView original={text} corrected={correctedText} />
                </div>
                {aiAdvice && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-3">💡 先生からのアドバイス</h3>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg markdown-preview">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                        {aiAdvice}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No correction yet */}
            {text.trim() && !showCorrection && !isCorrectionLoading && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  AI添削をまだ実行していません。「AI添削」ボタンをクリックすると、AIがあなたの日記をチェックします。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {ConfirmModal}
      {showTemplateManager && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowTemplateManager(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
              <h3 className="text-sm font-bold text-gray-800">✏️ テンプレート管理</h3>
              <button onClick={() => setShowTemplateManager(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {templates.map(t => (
                <div key={t.id} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{t.label}</div>
                    <div className="text-[10px] text-gray-400 truncate mt-0.5">{t.content.replace(/\n/g, ' ').slice(0, 60)}</div>
                  </div>
                  <button
                    onClick={() => { setEditingTemplate(t); setEditLabel(t.label); setEditContent(t.content); }}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded shrink-0"
                  >
                    削除
                  </button>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <h4 className="text-xs font-bold text-gray-600">{editingTemplate ? 'テンプレートを編集' : '新規テンプレート'}</h4>
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="テンプレート名"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  placeholder="テンプレート内容（Markdown）"
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingTemplate(null); setEditLabel(''); setEditContent('') }}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    disabled={!editLabel.trim() || !editContent.trim()}
                    className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {editingTemplate ? '更新' : '追加'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function DiaryView({ entries, onSave, onUpdate, onModeChange }: DiaryViewProps) {
  const [diaryMonth, setDiaryMonth] = useState(startOfMonth(new Date()))
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [confirm, ConfirmModal] = useConfirm()

  const monthStr = format(diaryMonth, 'yyyy-MM')
  const monthLabel = format(diaryMonth, 'yyyy年 M月', { locale: ja })
  const today = new Date()

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry>()
    for (const e of entries) {
      map.set(e.date, e)
    }
    return map
  }, [entries])

  const firstDay = startOfMonth(diaryMonth)
  const daysInMonth = getDaysInMonth(diaryMonth)
  const startOffset = getDay(firstDay)

  const todayInMonth = today.getFullYear() === diaryMonth.getFullYear() && today.getMonth() === diaryMonth.getMonth()
  const pastDays = todayInMonth ? today.getDate() : daysInMonth
  let writtenCount = 0
  for (let d = 1; d <= pastDays; d++) {
    const ds = `${monthStr}-${String(d).padStart(2, '0')}`
    if (entriesByDate.has(ds)) writtenCount++
  }
  const rate = pastDays > 0 ? Math.round((writtenCount / pastDays) * 100) : 0

  const handleDayClick = useCallback(
    async (day: number) => {
      const ds = `${monthStr}-${String(day).padStart(2, '0')}`
      const dateObj = parseISO(ds)
      if (isFuture(dateObj) && !isToday(dateObj)) return

      const existingEntry = entriesByDate.get(ds)

      if (existingEntry) {
        setSelectedDate(ds)
        setViewMode('editor')
      } else if (isToday(dateObj)) {
        if (await confirm('今日の日本語日記がまだ書かれていません。今すぐ書きますか？')) {
          setSelectedDate(ds)
          setViewMode('editor')
        }
      } else {
        setSelectedDate(ds)
        setViewMode('editor')
      }
    },
    [monthStr, entriesByDate, confirm],
  )

  const handleBack = useCallback(() => {
    setViewMode('calendar')
    setSelectedDate(null)
  }, [])

  useEffect(() => {
    onModeChange?.(viewMode)
  }, [viewMode, onModeChange])

  const handlePrevMonth = () => setDiaryMonth((prev) => subMonths(prev, 1))
  const handleNextMonth = () => setDiaryMonth((prev) => addMonths(prev, 1))
  const handleTodayMonth = () => setDiaryMonth(startOfMonth(new Date()))

  const selectedEntry = selectedDate ? entriesByDate.get(selectedDate) : undefined

  if (viewMode === 'editor' && selectedDate) {
    return (
      <DiaryEditor
        dateStr={selectedDate}
        entry={selectedEntry}
        onSave={onSave}
        onUpdate={onUpdate}
        onBack={handleBack}
      />
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">📝 日本語日記</h2>
        <div className="flex items-center gap-1">
          <button onClick={handlePrevMonth} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded">&lt;</button>
          <span className="text-xs text-gray-400 mx-1 min-w-[7rem] text-center">{monthLabel}</span>
          <button onClick={handleNextMonth} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded">&gt;</button>
          <button onClick={handleTodayMonth} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded ml-1">今日</button>
        </div>
      </div>

      <div className="mb-3 text-xs text-gray-500">
        今月の継続率：
        <span className="font-bold text-gray-700">{rate}%</span>
        {' '}（{writtenCount}日/{pastDays}日）
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((wd, i) => (
            <div key={wd} className={`text-center text-[10px] font-medium pb-1 ${i === 6 ? 'text-red-400' : i === 5 ? 'text-blue-400' : 'text-gray-400'}`}>{wd}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: startOffset + daysInMonth }, (_, i) => {
            const day = i - startOffset + 1
            if (i < startOffset || day > daysInMonth) return <div key={`e-${i}`} className="min-h-14 bg-gray-50/50" />

            const ds = `${monthStr}-${String(day).padStart(2, '0')}`
            const dateObj = parseISO(ds)
            const isDayFuture = isFuture(dateObj) && !isToday(dateObj)
            const isDayToday = isToday(dateObj)
            const isDayPast = isPast(dateObj) || isDayToday
            const hasEntry = entriesByDate.has(ds)
            const colIdx = (startOffset + day - 1) % 7

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                disabled={isDayFuture}
                className={`relative p-1 text-left transition-colors min-h-14 ${
                  isDayFuture ? 'opacity-40 cursor-default' : 'hover:bg-gray-50 cursor-pointer'
                } ${!hasEntry && isDayPast && !isDayToday ? 'bg-gray-50' : ''} ${
                  isDayToday && !hasEntry ? 'ring-2 ring-blue-400 ring-inset' : ''
                } ${isDayToday ? 'bg-blue-50' : ''}`}
              >
                <span className={`inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium leading-tight ${
                  colIdx === 6 ? 'text-red-400' : colIdx === 5 ? 'text-blue-400' : 'text-gray-500'
                } ${isDayToday ? 'bg-blue-600 text-white rounded-full' : ''}`}>
                  {day}
                </span>
                {hasEntry && <div className="text-xs mt-0.5">📝</div>}
              </button>
            )
          })}
        </div>
      </div>
      {ConfirmModal}
    </div>
  )
}
