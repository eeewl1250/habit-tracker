import { useState, useCallback } from 'react'
import type { Components } from 'react-markdown'

export interface MarkdownThemeStyles {
  h1: string
  h2: string
  h3: string
  p: string
  ul: string
  ol: string
  li: string
  blockquote: string
  inlineCode: string
  pre: string
  codeBlock: string
  hr: string
  strong: string
  em: string
  a: string
  img: string
  table: string
  th: string
  td: string
  checkbox: string
  taskChecked: string
  taskUnchecked: string
}

export interface MarkdownTheme {
  id: string
  name: string
  styles: MarkdownThemeStyles
}

const defaultStyles: MarkdownThemeStyles = {
  h1: 'text-xl font-bold text-gray-900 mt-6 mb-3 pb-1.5 border-b-2 border-gray-200',
  h2: 'text-lg font-bold text-gray-900 mt-5 mb-2',
  h3: 'text-base font-semibold text-gray-800 mt-4 mb-1.5',
  p: 'text-sm text-gray-700 leading-normal mb-3',
  ul: 'text-sm text-gray-700 space-y-1 mb-3 list-disc pl-5',
  ol: 'text-sm text-gray-700 space-y-1 mb-3 list-decimal pl-5',
  li: 'leading-normal',
  blockquote: 'border-l-[3px] border-blue-400 pl-4 py-1.5 my-1.5 text-sm text-gray-600 bg-blue-50/40 rounded-r ',
  inlineCode: 'bg-rose-50 text-rose-600 px-1 py-0.5 rounded text-xs font-medium',
  pre: 'bg-gray-900 text-gray-100 rounded-lg p-4 pt-7 overflow-x-auto my-3 text-xs leading-normal relative whitespace-pre-wrap',
  codeBlock: '',
  hr: 'my-6 border-gray-200',
  strong: 'font-bold text-gray-900',
  em: 'italic text-gray-600',
  a: 'text-blue-600 underline hover:text-blue-800 decoration-blue-300 hover:decoration-blue-600',
  img: 'max-w-full h-auto rounded-lg my-3 border border-gray-200',
  table: 'min-w-full border-collapse my-3 text-sm',
  th: 'border border-gray-300 bg-gray-100 px-3 py-1.5 text-left font-semibold text-gray-700',
  td: 'border border-gray-300 px-3 py-1.5 text-gray-700',
  checkbox: 'mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0',
  taskChecked: 'text-gray-400 line-through',
  taskUnchecked: 'text-gray-700',
}

const compactStyles: MarkdownThemeStyles = {
  h1: 'text-lg font-bold text-gray-900 mt-4 mb-2 pb-0.5 border-b border-gray-200',
  h2: 'text-base font-bold text-gray-900 mt-3 mb-1.5',
  h3: 'text-sm font-semibold text-gray-800 mt-2 mb-1',
  p: 'text-sm text-gray-700 leading-normal mb-2',
  ul: 'text-sm text-gray-700 space-y-0.5 list-disc pl-5',
  ol: 'text-sm text-gray-700 space-y-0.5 list-decimal pl-5',
  li: 'leading-normal',
  blockquote: 'border-l-[3px] border-blue-400 pl-3 py-0.5 my-1 text-sm text-gray-600 bg-blue-50/40 rounded-r ',
  inlineCode: 'bg-rose-50 text-rose-600 px-1 py-0.5 rounded text-xs font-medium',
  pre: 'bg-gray-900 text-gray-100 rounded-lg p-3 pt-7 overflow-x-auto my-2 text-xs leading-normal relative whitespace-pre-wrap',
  codeBlock: '',
  hr: 'my-3 border-gray-200',
  strong: 'font-bold text-gray-900',
  em: 'italic text-gray-600',
  a: 'text-blue-600 underline hover:text-blue-800 decoration-blue-300 hover:decoration-blue-600',
  img: 'max-w-full h-auto rounded my-2',
  table: 'min-w-full border-collapse my-2 text-sm',
  th: 'border border-gray-300 bg-gray-100 px-3 py-1.5 text-left font-semibold text-gray-700',
  td: 'border border-gray-300 px-3 py-1.5 text-gray-700',
  checkbox: 'mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0',
  taskChecked: 'text-gray-400 line-through',
  taskUnchecked: 'text-gray-700',
}

export const builtinThemes: MarkdownTheme[] = [
  {
    id: 'default',
    name: 'デフォルト',
    styles: defaultStyles,
  },
  {
    id: 'compact',
    name: 'コンパクト',
    styles: compactStyles,
  },
]

const STORAGE_KEY = 'habit-tracker-markdown-theme'

export function getSavedThemeId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? 'default'
  } catch {
    return 'default'
  }
}

export function getTheme(id: string): MarkdownTheme {
  return builtinThemes.find(t => t.id === id) ?? builtinThemes[0]
}

function makeLiRenderer(styles: MarkdownThemeStyles) {
  return function Li({ children, checked, node, ordered, index, className, ...props }: any) {
    const isTask = checked !== null && checked !== undefined
    return (
      <li className={`${styles.li} ${isTask ? 'list-none -ml-5 flex items-start gap-1.5' : ''} ${className ?? ''}`} {...props}>
        {isTask && (
          <input type="checkbox" checked={checked} readOnly className={styles.checkbox} />
        )}
        <span className={isTask ? (checked ? styles.taskChecked : styles.taskUnchecked) : ''}>{children}</span>
      </li>
    )
  }
}

function CodeBlockInner({ className, children, preCls, codeCls, ...props }: any) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace(/^language-/, '') ?? ''
  const code = String(children ?? '').replace(/\n$/, '')
  const lines = code.split('\n')
  const lineCount = lines.length

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* noop */ }
  }, [code])

  return (
    <div className={`${preCls} group`} style={{ paddingTop: '1.75rem' }}>
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-0.5 text-[10px] text-gray-400 select-none">
        <span>{lang}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
        >
          {copied ? '✓ コピー完了' : 'コピー'}
        </button>
      </div>
      <div className="flex">
        <div className="text-right pr-2.5 text-gray-500 select-none leading-normal shrink-0">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <code className={`${codeCls} ${className ?? ''}`} {...props}>
          {code}
        </code>
      </div>
    </div>
  )
}

export function buildMarkdownComponents(theme: MarkdownTheme): Components {
  const s = theme.styles
  return {
    h1: ({ children }) => <h1 className={s.h1}>{children}</h1>,
    h2: ({ children }) => <h2 className={s.h2}>{children}</h2>,
    h3: ({ children }) => <h3 className={s.h3}>{children}</h3>,
    p: ({ children }) => <p className={s.p}>{children}</p>,
    ul: ({ children }) => <ul className={s.ul}>{children}</ul>,
    ol: ({ children }) => <ol className={s.ol}>{children}</ol>,
    li: makeLiRenderer(s),
    blockquote: ({ children }) => <blockquote className={s.blockquote}>{children}</blockquote>,
    code: ({ className, children }: any) => {
      if (!className) return <code className={s.inlineCode}>{children}</code>
      return (
        <CodeBlockInner
          className={className}
          children={children}
          preCls={s.pre}
          codeCls={s.codeBlock}
        />
      )
    },
    hr: () => <hr className={s.hr} />,
    strong: ({ children }) => <strong className={s.strong}>{children}</strong>,
    em: ({ children }) => <em className={s.em}>{children}</em>,
    a: ({ href, children }) => <a href={href} className={s.a} target="_blank" rel="noopener noreferrer">{children}</a>,
    img: ({ src, alt }) => src ? <img src={src} alt={alt} className={s.img} loading="lazy" /> : null,
    table: ({ children }) => <table className={s.table}>{children}</table>,
    th: ({ children }) => <th className={s.th}>{children}</th>,
    td: ({ children }) => <td className={s.td}>{children}</td>,
  }
}
