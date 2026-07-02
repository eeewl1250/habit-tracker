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
import { builtinThemes, getSavedThemeId, saveThemeId, getTheme, buildBlockComponents, buildMarkdownComponents } from '../lib/markdownThemes'
import type { DiaryEntry } from '../types'

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
          <span className="text-gray-400">差分がありません</span>
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

function splitIntoBlocks(text: string): string[] {
  if (!text) return ['']
  const lines = text.split('\n')
  const blocks: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trimStart().startsWith('```') || line.trimStart().startsWith('~~~')) {
      const fenceLines: string[] = [line]
      i++
      while (i < lines.length) {
        fenceLines.push(lines[i])
        if (lines[i].trimStart().startsWith('```') || lines[i].trimStart().startsWith('~~~')) {
          i++
          break
        }
        i++
      }
      blocks.push(fenceLines.join('\n'))
    } else if (/^\s*>/.test(line)) {
      const quoteLines: string[] = [line]
      i++
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoteLines.push(lines[i])
        i++
      }
      blocks.push(quoteLines.join('\n'))
    } else if (/^\s*(?:[-*+]\s|\d+[.)]\s)/.test(line)) {
      const listLines: string[] = [line]
      i++
      while (i < lines.length && /^\s*(?:[-*+]\s|\d+[.)]\s)/.test(lines[i])) {
        listLines.push(lines[i])
        i++
      }
      blocks.push(listLines.join('\n'))
    } else if (/^\s*$/.test(line) && i > 0 && i < lines.length - 1) {
      i++
    } else {
      blocks.push(line)
      i++
    }
  }
  return blocks
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
  const [text, setText] = useState<string>(entry?.original_text ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const textRef = useRef(text)
  textRef.current = text
  const [correctedText, setCorrectedText] = useState<string | null>(entry?.corrected_text ?? null)
  const [aiAdvice, setAiAdvice] = useState<string | null>(entry?.ai_advice ?? null)
  const [isCorrectionLoading, setIsCorrectionLoading] = useState(false)
  const [correctionError, setCorrectionError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showCorrection, setShowCorrection] = useState(!!entry?.corrected_text)
  const [activeTab, setActiveTab] = useState<'correction' | 'edit'>('correction')
  const entryRef = useRef(entry ?? null)
  const originalText = text
  const lastSavedTextRef = useRef(originalText)
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null)
  const isDirty = text !== lastSavedTextRef.current

  const [themeId, setThemeId] = useState<string>(getSavedThemeId)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const themeRef = useRef<HTMLDivElement>(null)
  const currentTheme = getTheme(themeId)
  const blockComponents = useMemo(() => buildBlockComponents(currentTheme), [currentTheme])
  const markdownComponents = useMemo(() => buildMarkdownComponents(currentTheme), [currentTheme])

  const switchTheme = useCallback((id: string) => {
    setThemeId(id)
    saveThemeId(id)
    setShowThemePicker(false)
  }, [])

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

  const dateObj = parseISO(dateStr)
  const dateLabel = format(dateObj, 'yyyy年 M月 d日 (E)', { locale: ja })

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
      const currentText = textRef.current
      if (!currentText.trim()) return
      if (currentText === lastSavedTextRef.current) return
      try {
        await doSave(currentText)
      } catch { /* silent */ }
    }, 60_000)
    return () => clearInterval(timer)
  }, [doSave])

  if (entry) entryRef.current = entry

  const handleSaveAndGoCorrection = useCallback(async () => {
    setIsSaving(true)
    try {
      await doSave(originalText)
    } finally {
      setIsSaving(false)
    }
    setActiveTab('correction')
  }, [originalText, doSave])

  const handleAICorrection = useCallback(async () => {
    if (!originalText.trim()) return
    setIsCorrectionLoading(true)
    setCorrectionError(null)
    try {
      const result = await correctDiary(originalText)
      setCorrectedText(result.corrected_text)
      setAiAdvice(result.advice)
      setShowCorrection(true)
      setActiveTab('correction')
    } catch (e) {
      setCorrectionError(e instanceof Error ? e.message : '添削に失敗しました')
    } finally {
      setIsCorrectionLoading(false)
    }
  }, [originalText])

  const handleGoToEdit = useCallback(() => {
    setActiveTab('edit')
  }, [])

  const handleToolbarInsert = useCallback((before: string, after: string, placeholder?: string) => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = text.slice(start, end)
    const insert = selected || placeholder || ''
    const newText = before + insert + after
    setText(prev => prev.slice(0, start) + newText + prev.slice(end))
    const cursorPos = start + before.length + (selected || placeholder || '').length
    setTimeout(() => { el.setSelectionRange(cursorPos, cursorPos); el.focus() })
  }, [text])

  const [showHeadingPicker, setShowHeadingPicker] = useState(false)
  const headingRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showHeadingPicker) return
    const handleClick = (e: MouseEvent) => {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) {
        setShowHeadingPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showHeadingPicker])

  const headingLevels = [
    { label: 'H1', before: '# ', placeholder: '見出し1' },
    { label: 'H2', before: '## ', placeholder: '見出し2' },
    { label: 'H3', before: '### ', placeholder: '見出し3' },
    { label: 'H4', before: '#### ', placeholder: '見出し4' },
  ]

  const toolbarButtons = [
    { label: 'B', title: '太字', before: '**', after: '**', placeholder: 'テキスト' },
    { label: 'I', title: '斜体', before: '*', after: '*', placeholder: 'テキスト' },
    { label: 'S', title: '取消線', before: '~~', after: '~~', placeholder: 'テキスト' },
    { label: '>', title: '引用', before: '> ', after: '', placeholder: '引用文' },
    { label: '•', title: 'リスト', before: '- ', after: '', placeholder: '項目' },
    { label: '1.', title: '番号付きリスト', before: '1. ', after: '', placeholder: '項目' },
    { label: '☑', title: 'タスク', before: '- [ ] ', after: '', placeholder: 'タスク' },
    { label: '<>', title: 'インラインコード', before: '`', after: '`', placeholder: 'コード' },
    { label: '⎔', title: 'コードブロック', before: '\n```\n', after: '\n```\n', placeholder: 'コード' },
    { label: '🔗', title: 'リンク', before: '[', after: '](url)', placeholder: 'テキスト' },
    { label: '🖼', title: '画像', before: '![', after: '](url)', placeholder: 'alt' },
    { label: '📋', title: 'テーブル', before: '\n| 見出し1 | 見出し2 | 見出し3 |\n| --- | --- | --- |\n| セル | セル | セル |\n', after: '' },
    { label: '―', title: '区切り線', before: '\n---\n', after: '' },
  ]

  return (
    <div className="flex flex-col h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => {
            if (isDirty && !window.confirm('保存されていない変更があります。破棄しますか？')) return
            onBack()
          }} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
            ← <span className="hidden sm:inline">カレンダー</span>
          </button>
          <span className="text-xs text-gray-400 hidden sm:inline">|</span>
          <span className="text-xs text-gray-500 hidden sm:inline">{dateLabel}</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => setActiveTab('correction')}
            className={`px-2 py-1 rounded transition-colors ${
              activeTab === 'correction'
                ? 'text-blue-600 font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            AI添削
          </button>
          <span className="text-gray-300 select-none">|</span>
          <button
            onClick={handleGoToEdit}
            className={`px-2 py-1 rounded transition-colors ${
              activeTab === 'edit'
                ? 'text-blue-600 font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            編集
          </button>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'edit' ? (
            <>
              {lastSavedLabel && (
                <span className="text-[10px] text-gray-400">{lastSavedLabel}</span>
              )}
              <button
                onClick={handleSaveAndGoCorrection}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? '💾 保存中...' : '💾 保存'}
              </button>
            </>
          ) : (
            <button
              onClick={handleAICorrection}
              disabled={isCorrectionLoading || isSaving || !originalText.trim()}
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
          <div className="h-full w-full max-w-5xl flex flex-col my-2">
            {/* Toolbar */}
            <div ref={toolbarRef} className="sticky top-0 z-10 flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-gray-50 overflow-x-auto">
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
                  onMouseDown={(e) => { e.preventDefault(); setShowHeadingPicker(p => !p) }}
                  title="見出し"
                  className="px-2 py-1 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors whitespace-nowrap"
                >
                  H ▾
                </button>
                {showHeadingPicker && (
                  <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 rounded shadow-lg z-20 min-w-[5rem]">
                    {headingLevels.map(h => (
                      <button
                        key={h.label}
                        onMouseDown={(e) => { e.preventDefault(); handleToolbarInsert(h.before, '', h.placeholder); setShowHeadingPicker(false) }}
                        className="block w-full px-3 py-1.5 text-xs text-left text-gray-600 hover:bg-gray-100"
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Editor body */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="今日の出来事を書こう..."
                className="w-full md:w-1/2 min-h-[300px] md:min-h-0 p-4 text-sm font-mono leading-relaxed resize-none border-r border-gray-200 focus:outline-none"
              />
              <div className="hidden md:block w-1/2 overflow-y-auto p-4 bg-white markdown-preview">
                {text.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                    {text}
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
            {!originalText.trim() && !showCorrection && (
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

            {/* Original text display (before correction) */}
            {originalText.trim() && !showCorrection && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">📝 あなたの日記</h3>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg markdown-preview">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                    {originalText}
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
                        {originalText}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">◆ 修正文</h3>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg markdown-preview">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
                        {correctedText}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3">◆ 差分</h3>
                  <DiffView original={originalText} corrected={correctedText} />
                </div>
                {aiAdvice && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-3">◆ 先生からのアドバイス</h3>
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
            {originalText.trim() && !showCorrection && !isCorrectionLoading && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  AI添削をまだ実行していません。「AI添削」ボタンをクリックすると、AIがあなたの日記をチェックします。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function DiaryView({ entries, onSave, onUpdate, onModeChange }: DiaryViewProps) {
  const [diaryMonth, setDiaryMonth] = useState(startOfMonth(new Date()))
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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
    (day: number) => {
      const ds = `${monthStr}-${String(day).padStart(2, '0')}`
      const dateObj = parseISO(ds)
      if (isFuture(dateObj) && !isToday(dateObj)) return

      const existingEntry = entriesByDate.get(ds)

      if (existingEntry) {
        setSelectedDate(ds)
        setViewMode('editor')
      } else if (isToday(dateObj)) {
        if (window.confirm('今日の日本語日記がまだ書かれていません。今すぐ書きますか？')) {
          setSelectedDate(ds)
          setViewMode('editor')
        }
      } else {
        setSelectedDate(ds)
        setViewMode('editor')
      }
    },
    [monthStr, entriesByDate],
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
    </div>
  )
}
