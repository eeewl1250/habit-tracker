// apps/finance/src/components/FinanceView.tsx

import { useState, useMemo, useEffect, useRef } from 'react'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import stampImg from '../images/stamp.png'
import { ja } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { FinanceRecord, BaseCategory, Motivation, TargetPool, BudgetSettings, RecurringTemplate, MonthlyRecurringRecord, CategoryDefinition } from '../types'
import { BASE_CATEGORIES, BUDGET_POOLS, resolveTargetPool } from '../types'
import { calcTimeBonus } from '../lib/bonus'

interface FinanceViewProps {
  records: FinanceRecord[]
  timeLogs: { duration: number | null; category: string; start_time: string }[]
  catDefs: CategoryDefinition[]
  budget: BudgetSettings | undefined
  dashboardMonth: Date
  onDashboardMonthChange: (month: Date) => void
  recurringTemplates: RecurringTemplate[]
  recurringRecords: MonthlyRecurringRecord[]
  recurringIncome: number
  recurringExpense: number
  recurringNet: number
  onAdd: (form: {
    amount: number
    item_name: string
    base_category: BaseCategory
    motivation: Motivation
    tags: string[] | null
    created_at?: string
  }) => void
  onUpdate: (id: string, updates: Partial<{
    amount: number
    item_name: string
    base_category: BaseCategory
    motivation: Motivation
    tags: string[] | null
    created_at?: string
  }>) => void
  onDelete: (id: string) => void
  onUpdateBase: (field: 'food_base' | 'daily_base' | 'entertainment_base' | 'going_out_base', value: number) => void
  onRecalculateRollover: (month: string, poolTotals: Record<TargetPool, number>, prevTimeBonus?: number) => void
  onAddRecurringTemplate: (type: 'income' | 'expense', name: string, amount: number) => void
  onEditRecurringTemplate: (id: string, updates: { item_name?: string; default_amount?: number }) => void
  onDeleteRecurringTemplate: (id: string) => void
  onUpdateRecurringRecord: (templateId: string, amount: number) => void
}

function QuickExpense({ onAdd, records }: { onAdd: FinanceViewProps['onAdd']; records: FinanceRecord[] }) {
  const [amount, setAmount] = useState('')
  const [itemName, setItemName] = useState('')
  const [baseCat, setBaseCat] = useState<BaseCategory>('food')
  const [motivation, setMotivation] = useState<Motivation>('need')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [recordDate, setRecordDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))

  const existingTags = useMemo(() => {
    const set = new Set<string>()
    for (const r of records) {
      if (r.tags) {
        for (const t of r.tags) {
          set.add(t)
        }
      }
    }
    return Array.from(set).sort()
  }, [records])

  const targetPool = resolveTargetPool(baseCat, motivation)
  const poolInfo = BUDGET_POOLS.find((p) => p.key === targetPool)!

  const handleAddTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t])
      setTagInput('')
    }
  }

  const handleSubmit = () => {
    const amt = parseInt(amount, 10)
    if (!amt || amt <= 0) return
    if (!itemName.trim()) return
    const created_at = recordDate ? new Date(recordDate).toISOString() : undefined
    onAdd({ amount: amt, item_name: itemName.trim(), base_category: baseCat, motivation, tags: tags.length > 0 ? tags : null, created_at })
    setAmount('')
    setItemName('')
    setRecordDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
    setTags([])
    setTagInput('')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📝</span>
        <span className="font-bold text-gray-800 text-sm">支出を記録</span>
      </div>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-0.5">金額</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="1500" />
          </div>
          <div className="flex-[2]">
             <label className="block text-xs text-gray-500 mb-0.5">名前</label>
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="例: 文房具" />
          </div>
        </div>

        <div>
           <label className="block text-xs text-gray-500 mb-1">日時</label>
          <input type="datetime-local" value={recordDate} onChange={(e) => setRecordDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>

        <div>
           <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
          <div className="flex gap-1.5">
            {BASE_CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => setBaseCat(c.key)}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  baseCat === c.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
           <label className="block text-xs text-gray-500 mb-1">動機</label>
          <div className="flex gap-1.5">
            <label className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              motivation === 'need' ? 'bg-green-100 text-green-700 ring-2 ring-green-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
              <input type="radio" name="motivation" value="need" checked={motivation === 'need'}
                onChange={() => setMotivation('need')} className="sr-only" />
              🛡️ 必要
            </label>
            <label className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              motivation === 'entertainment' ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
              <input type="radio" name="motivation" value="entertainment" checked={motivation === 'entertainment'}
                onChange={() => setMotivation('entertainment')} className="sr-only" />
              🎮 娯楽
            </label>
            <label className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              motivation === 'going_out' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
              <input type="radio" name="motivation" value="going_out" checked={motivation === 'going_out'}
                onChange={() => setMotivation('going_out')} className="sr-only" />
              🍽️ 外出
            </label>
          </div>
        </div>

        <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
          targetPool === 'entertainment_pool' ? 'bg-pink-50 text-pink-700' :
          targetPool === 'going_out_pool' ? 'bg-orange-50 text-orange-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          💡 この支出は <strong>{poolInfo.icon} {poolInfo.label}</strong> から差し引かれます
        </div>

        <div>
           <label className="block text-xs text-gray-500 mb-1">タグ（任意、Enterで追加）</label>
          <div className="flex gap-1 flex-wrap mb-1">
            {tags.map((t) => (
              <span key={t} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600 flex items-center gap-1">
                #{t}
                <button onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="text-gray-400 hover:text-gray-600">&times;</button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs" placeholder="例: 文房具" />
            <button onClick={handleAddTag} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">追加</button>
          </div>
          {existingTags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1">
              {existingTags.map((t) => (
                <button key={t} onClick={() => { if (!tags.includes(t)) setTags((prev) => [...prev, t]) }}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                    tags.includes(t) ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                  }`}>
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleSubmit}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-all">
          記録する
        </button>
      </div>
    </div>
  )
}

function EditExpenseModal({
  record, onSave, onClose,
}: {
  record: FinanceRecord | null
  onSave: (id: string, updates: Partial<FinanceRecord>) => void
  onClose: () => void
}) {
  const [amount, setAmount] = useState(String(record?.amount ?? ''))
  const [itemName, setItemName] = useState(record?.item_name ?? '')
  const [baseCat, setBaseCat] = useState<BaseCategory>(record?.base_category ?? 'food')
  const [motivation, setMotivation] = useState<Motivation>(record?.motivation ?? 'need')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(record?.tags ?? [])
  const [recordDate, setRecordDate] = useState(record ? format(new Date(record.created_at), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"))

  useEffect(() => {
    if (record) {
      setAmount(String(record.amount))
      setItemName(record.item_name)
      setBaseCat(record.base_category)
      setMotivation(record.motivation)
      setTags(record.tags ?? [])
      setRecordDate(format(new Date(record.created_at), "yyyy-MM-dd'T'HH:mm"))
    }
  }, [record])

  if (!record) return null

  const handleAddTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t])
      setTagInput('')
    }
  }

  const handleSave = () => {
    const amt = parseInt(amount, 10)
    if (!amt || amt <= 0) return
    if (!itemName.trim()) return
    onSave(record.id, {
      amount: amt,
      item_name: itemName.trim(),
      base_category: baseCat,
      motivation,
      tags: tags.length > 0 ? tags : null,
      created_at: new Date(recordDate).toISOString(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-gray-800">取引を編集</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">金額</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex-[2]">
              <label className="block text-xs text-gray-500 mb-0.5">名前</label>
              <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">日時</label>
            <input type="datetime-local" value={recordDate} onChange={(e) => setRecordDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
            <div className="flex gap-1.5">
              {BASE_CATEGORIES.map((c) => (
                <button key={c.key} onClick={() => setBaseCat(c.key)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    baseCat === c.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">動機</label>
            <div className="flex gap-1.5">
              <label className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                motivation === 'need' ? 'bg-green-100 text-green-700 ring-2 ring-green-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
                <input type="radio" name="edit-motivation" value="need" checked={motivation === 'need'}
                  onChange={() => setMotivation('need')} className="sr-only" />
                🛡️ 必要
              </label>
              <label className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                motivation === 'entertainment' ? 'bg-pink-100 text-pink-700 ring-2 ring-pink-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
                <input type="radio" name="edit-motivation" value="entertainment" checked={motivation === 'entertainment'}
                  onChange={() => setMotivation('entertainment')} className="sr-only" />
                🎮 娯楽
              </label>
              <label className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                motivation === 'going_out' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
                <input type="radio" name="edit-motivation" value="going_out" checked={motivation === 'going_out'}
                  onChange={() => setMotivation('going_out')} className="sr-only" />
                🍽️ 外出
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">タグ</label>
            <div className="flex gap-1 flex-wrap mb-1">
              {tags.map((t) => (
                <span key={t} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600 flex items-center gap-1">
                  #{t}
                  <button onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="text-gray-400 hover:text-gray-600">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs" placeholder="タグを追加" />
              <button onClick={handleAddTag} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">追加</button>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200">
              キャンセル
            </button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditableAmount({ value, onSave, className, active }: { value: number; onSave: (v: number) => void; className?: string; active?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(String(value))
  const isEditing = editing || active

  const handleSave = () => {
    const n = parseInt(input, 10)
    if (n > 0) onSave(n)
    else setInput(String(value))
    setEditing(false)
  }

  if (isEditing) {
    return (
      <input type="number" value={input} autoFocus={!active}
        onChange={(e) => setInput(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        className={`w-20 px-1 py-0.5 border border-blue-400 rounded text-xs text-right font-bold ${className}`}
      />
    )
  }

  return (
    <button onClick={() => setEditing(true)}
      className={`hover:bg-gray-100 rounded px-1 -ml-1 cursor-text ${className}`}>
      {value.toLocaleString()}
    </button>
  )
}

function RecurringManager({
  templates, records, onClose,
  onAdd, onEdit, onDelete, onUpdateRecord,
}: {
  templates: RecurringTemplate[]
  records: MonthlyRecurringRecord[]
  onClose: () => void
  onAdd: (type: 'income' | 'expense', name: string, amount: number) => void
  onEdit: (id: string, updates: { item_name?: string; default_amount?: number }) => void
  onDelete: (id: string) => void
  onUpdateRecord: (templateId: string, amount: number) => void
}) {
  const [newType, setNewType] = useState<'income' | 'expense'>('expense')
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const incomeTemplates = templates.filter((t) => t.type === 'income')
  const expenseTemplates = templates.filter((t) => t.type === 'expense')

  const handleAdd = async () => {
    const amt = parseInt(newAmount, 10)
    if (!amt || amt <= 0 || !newName.trim()) return
    try {
      await onAdd(newType, newName.trim(), amt)
      setNewName('')
      setNewAmount('')
    } catch (e) {
      alert('エラー: ' + (e instanceof Error ? e.message : '不明なエラー'))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <span className="font-bold text-gray-800">固定費管理</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>

        {incomeTemplates.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold text-green-700 mb-2">💰 固定収入</div>
            <div className="space-y-1">
              {incomeTemplates.map((t) => {
                const record = records.find((r) => r.template_id === t.id)
                return <RecurringItemRow key={t.id} template={t} recordAmount={record?.amount} onSave={(a) => onUpdateRecord(t.id, a)} onEdit={(u) => onEdit(t.id, u)} onDelete={() => onDelete(t.id)} />
              })}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="text-xs font-bold text-red-700 mb-2">💸 固定支出</div>
          <div className="space-y-1">
            {expenseTemplates.map((t) => {
              const record = records.find((r) => r.template_id === t.id)
              return <RecurringItemRow key={t.id} template={t} recordAmount={record?.amount} onSave={(a) => onUpdateRecord(t.id, a)} onEdit={(u) => onEdit(t.id, u)} onDelete={() => onDelete(t.id)} />
            })}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="text-xs font-bold text-gray-600 mb-2">➕ 新規追加</div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setNewType('income')}
               className={`px-3 py-1.5 rounded text-xs font-medium ${newType === 'income' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>収入</button>
            <button onClick={() => setNewType('expense')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${newType === 'expense' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>支出</button>
          </div>
          <div className="flex gap-2">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="項目名（例: 電気代）"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-xs" />
            <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
              placeholder="金額"
              className="w-24 px-2 py-1.5 border border-gray-300 rounded text-xs text-right" />
            <button onClick={handleAdd}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">追加</button>
          </div>
        </div>

        <div className="mt-4 px-3 py-2 bg-blue-50 rounded-lg text-[10px] text-blue-700">
          💡 上記設定は毎月自動適用されます。金額に変動がある場合は該当項目を直接修正してください。
        </div>
      </div>
    </div>
  )
}

function RecurringItemRow({
  template, recordAmount, onSave, onEdit, onDelete,
}: {
  template: RecurringTemplate
  recordAmount: number | undefined
  onSave: (amount: number) => void
  onEdit: (updates: { item_name?: string; default_amount?: number }) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(String(recordAmount ?? template.default_amount))
  const [nameInput, setNameInput] = useState(template.item_name)
  const [editingName, setEditingName] = useState(false)

  const currentAmount = recordAmount ?? template.default_amount

  const handleSave = () => {
    const n = parseInt(input, 10)
    if (n > 0) {
      onSave(n)
      if (n !== template.default_amount) {
        // Optionally update template default too
      }
    } else setInput(String(currentAmount))
    setEditing(false)
  }

  const handleNameSave = () => {
    if (nameInput.trim() && nameInput.trim() !== template.item_name) {
      onEdit({ item_name: nameInput.trim() })
    }
    setEditingName(false)
  }

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded-lg group">
      <button onClick={() => setEditingName(!editingName)} className="text-xs font-medium text-gray-700 min-w-0 flex-1 truncate hover:text-blue-600">
        {editingName ? (
          <input type="text" value={nameInput} autoFocus
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
            className="w-full px-1 py-0.5 border border-blue-400 rounded text-xs" />
        ) : (
          <span>{template.item_name}</span>
        )}
      </button>
      <div className="flex items-center gap-1">
        ¥
        {editing ? (
          <input type="number" value={input} autoFocus
            onChange={(e) => setInput(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-20 px-1 py-0.5 border border-blue-400 rounded text-xs text-right font-bold" />
        ) : (
          <button onClick={() => { setEditing(true); setInput(String(currentAmount)) }}
            className={`text-xs font-bold hover:bg-gray-100 rounded px-1 ${recordAmount && recordAmount !== template.default_amount ? 'text-blue-600' : 'text-gray-700'}`}>
            {currentAmount.toLocaleString()}
          </button>
        )}
      </div>
      <button onClick={onDelete}
        className="text-gray-200 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
    </div>
  )
}

function BudgetDashboard({
  budget,
  poolTotals,
  timeBonus,
  focusMinutes,
  monthLabel,
  onUpdateBase,
  recurringTemplates,
  recurringRecords,
  recurringIncome,
  recurringExpense,
  recurringNet,
  onOpenRecurringManager,
}: {
  budget: BudgetSettings
  poolTotals: Record<TargetPool, number>
  timeBonus: number
  focusMinutes: number
  monthLabel: string
  onUpdateBase: (field: 'food_base' | 'daily_base' | 'entertainment_base' | 'going_out_base', value: number) => void
  recurringTemplates: RecurringTemplate[]
  recurringRecords: MonthlyRecurringRecord[]
  recurringIncome: number
  recurringExpense: number
  recurringNet: number
  onOpenRecurringManager: () => void
}) {
  const [editing, setEditing] = useState(false)
  const pools = useMemo(() => {
    const foodBudget = budget.food_base + (budget.food_rollover ?? 0)
    const dailyBudget = budget.daily_base + (budget.daily_rollover ?? 0)
    const entertainmentBudget = (budget.entertainment_base ?? 10000) + (budget.entertainment_rollover ?? 0) + timeBonus
    const goingOutBudget = (budget.going_out_base ?? 5000) + (budget.going_out_rollover ?? 0)

    const result = [
      {
        key: 'food_pool' as TargetPool,
        icon: '🥦',
        label: '基礎食費',
        color: '#4CAF50',
        bgColor: '#E8F5E9',
        budget: foodBudget,
        spent: poolTotals.food_pool,
        base: budget.food_base,
        rollover: budget.food_rollover ?? 0,
        bonus: null as number | null,
        baseField: 'food_base' as const,
        rolloverLabel: (budget.food_rollover ?? 0) >= 0
          ? `+¥${(budget.food_rollover ?? 0).toLocaleString()}`
          : `-¥${Math.abs(budget.food_rollover ?? 0).toLocaleString()}`,
      },
      {
        key: 'daily_pool' as TargetPool,
        icon: '🧼',
        label: '日用品',
        color: '#2196F3',
        bgColor: '#E3F2FD',
        budget: dailyBudget,
        spent: poolTotals.daily_pool,
        base: budget.daily_base,
        rollover: budget.daily_rollover ?? 0,
        bonus: null as number | null,
        baseField: 'daily_base' as const,
        rolloverLabel: (budget.daily_rollover ?? 0) >= 0
          ? `+¥${(budget.daily_rollover ?? 0).toLocaleString()}`
          : `-¥${Math.abs(budget.daily_rollover ?? 0).toLocaleString()}`,
      },
      {
        key: 'growth_pool' as TargetPool,
        icon: '📚',
        label: '自己投資',
        color: '#9C27B0',
        bgColor: '#F3E5F5',
        budget: Infinity,
        spent: poolTotals.growth_pool,
        base: null as number | null,
        rollover: null as number | null,
        bonus: null as number | null,
        baseField: null,
        rolloverLabel: null,
      },
      {
        key: 'entertainment_pool' as TargetPool,
        icon: '🎮',
        label: '娯楽',
        color: '#E91E63',
        bgColor: '#FCE4EC',
        budget: entertainmentBudget,
        spent: poolTotals.entertainment_pool,
        base: budget.entertainment_base ?? 10000,
        rollover: budget.entertainment_rollover ?? 0,
        bonus: timeBonus,
        baseField: 'entertainment_base' as const,
        rolloverLabel: (budget.entertainment_rollover ?? 0) >= 0
          ? `+¥${(budget.entertainment_rollover ?? 0).toLocaleString()}`
          : `-¥${Math.abs(budget.entertainment_rollover ?? 0).toLocaleString()}`,
      },
      {
        key: 'going_out_pool' as TargetPool,
        icon: '🍽️',
        label: '外出',
        color: '#FF9800',
        bgColor: '#FFF3E0',
        budget: goingOutBudget,
        spent: poolTotals.going_out_pool,
        base: budget.going_out_base ?? 5000,
        rollover: budget.going_out_rollover ?? 0,
        bonus: null as number | null,
        baseField: 'going_out_base' as const,
        rolloverLabel: (budget.going_out_rollover ?? 0) >= 0
          ? `+¥${(budget.going_out_rollover ?? 0).toLocaleString()}`
          : `-¥${Math.abs(budget.going_out_rollover ?? 0).toLocaleString()}`,
      },
    ]

    return result
  }, [budget, poolTotals, timeBonus])

  const segments = 10

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="font-bold text-gray-800 text-sm">財務ダッシュボード</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{monthLabel}</span>
          <button onClick={() => setEditing((p) => !p)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              editing ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {editing ? '✓ 完了' : '⚙️ 今月の予算編集'}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {/* 固定費 */}
        <div className="px-3 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🗓️</span>
              <span className="text-xs font-bold text-gray-700">固定費</span>
            </div>
            <button onClick={onOpenRecurringManager}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">➕ 固定費管理</button>
          </div>
          {recurringTemplates.length === 0 ? (
            <div className="text-[10px] text-gray-400">まだ固定費が登録されていません。「固定費管理」から追加してください。</div>
          ) : (
            <>
              {recurringIncome > 0 && (
                <div className="text-[11px] text-green-700">
                  💰 固定収入: <span className="font-bold">+¥{recurringIncome.toLocaleString()}</span>
                  {' '}<span className="text-gray-400">
                    ({recurringRecords.filter((r) => recurringTemplates.find((t) => t.id === r.template_id)?.type === 'income').map((r) => {
                      const t = recurringTemplates.find((tm) => tm.id === r.template_id)
                      return t ? `${t.item_name} ¥${r.amount.toLocaleString()}` : null
                    }).filter(Boolean).join(' | ')})
                  </span>
                </div>
              )}
              {recurringExpense > 0 && (
                <div className="text-[11px] text-red-600">
                  💸 固定支出: <span className="font-bold">-¥{recurringExpense.toLocaleString()}</span>
                  {' '}<span className="text-gray-400">
                    ({recurringRecords.filter((r) => recurringTemplates.find((t) => t.id === r.template_id)?.type === 'expense').map((r) => {
                      const t = recurringTemplates.find((tm) => tm.id === r.template_id)
                      return t ? `${t.item_name} ¥${r.amount.toLocaleString()}` : null
                    }).filter(Boolean).join(' | ')})
                  </span>
                </div>
              )}
              <div className="text-[11px] text-gray-700 mt-0.5">
                ➔ ⚖️ 実質可処分資金: <span className={`font-bold ${recurringNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {recurringNet >= 0 ? '+' : ''}¥{recurringNet.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
        {pools.map((pool) => {
          const ratio = pool.budget === Infinity ? 0 : Math.min(pool.spent / pool.budget, 1)
          const pct = Math.round(ratio * 100)
          const filled = Math.round(ratio * segments)
          const remaining = pool.budget === Infinity ? null : pool.budget - pool.spent

          const barColor = pool.budget === Infinity ? 'bg-purple-400'
            : pct >= 90 ? 'bg-red-500'
            : pct >= 70 ? 'bg-yellow-500'
            : 'bg-green-500'

          return (
            <div key={pool.key}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span>{pool.icon}</span>
                  <span className="text-sm font-medium text-gray-800">{pool.label}</span>
                </div>
                <span className="text-xs font-bold text-gray-700">
                  ¥{pool.spent.toLocaleString()}{pool.budget !== Infinity ? ` / ¥${pool.budget.toLocaleString()}` : ''}
                </span>
              </div>
              <div className="flex gap-0.5 mb-1">
                {Array.from({ length: segments }).map((_, i) => (
                  <div key={i} className={`h-2 flex-1 rounded-sm ${i < filled ? barColor : 'bg-gray-200'}`} />
                ))}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
                <span>💡 今月当初: ¥
                  {pool.base !== null
                    ? <EditableAmount value={pool.base} onSave={(v) => onUpdateBase(pool.baseField!, v)} className="text-gray-600" active={editing} />
                    : '上限なし'
                  }
                </span>
                {pool.rollover !== null && pool.rollover !== 0 && (
                  <span className={pool.rollover < 0 ? 'text-red-500 font-medium' : ''}>🔄 前月繰越: {pool.rolloverLabel}</span>
                )}
                {pool.bonus !== null && pool.bonus > 0 && (
                  <span title={`${focusMinutes}分の集中時間に基づくボーナス = +¥${pool.bonus.toLocaleString()}`}>🎮 集中ボーナス: +¥{pool.bonus.toLocaleString()}</span>
                )}
                {remaining !== null && (
                  <span className={remaining < 0 ? 'text-red-500 font-medium' : ''}>
                    💸 使用済: -¥{pool.spent.toLocaleString()}
                  </span>
                )}
                {pool.key === 'growth_pool' && (
                  <span className="text-purple-500">🏷️ 自己投資は上限なし</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TagHeatmap({ records }: { records: FinanceRecord[] }) {
  const tagTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of records) {
      if (r.tags) {
        for (const t of r.tags) {
          map.set(t, (map.get(t) ?? 0) + r.amount)
        }
      }
    }
    return Array.from(map.entries())
      .map(([tag, total]) => ({ tag, total }))
      .sort((a, b) => b.total - a.total)
  }, [records])

  if (tagTotals.length === 0) return null

  const maxTotal = tagTotals[0].total

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🏷️</span>
        <span className="font-bold text-gray-800 text-sm">今月の消費タグランキング</span>
      </div>
      <div className="space-y-2">
        {tagTotals.map(({ tag, total }, i) => (
          <div key={tag} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-4">{i + 1}</span>
            <span className="text-xs text-gray-700 w-20 truncate">#{tag}</span>
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(total / maxTotal) * 100}%`, backgroundColor: i < 3 ? '#EF4444' : '#F59E0B' }}
              />
            </div>
            <span className="text-xs font-bold text-gray-700 w-20 text-right">¥{total.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimeMoneyChart({ records, timeLogs, catDefs, yearMonth }: { records: FinanceRecord[]; timeLogs: FinanceViewProps['timeLogs']; catDefs: CategoryDefinition[]; yearMonth: Date }) {
  const monthStart = startOfMonth(yearMonth)
  const monthEnd = endOfMonth(yearMonth)
  const monthStr = format(yearMonth, 'yyyy-MM')

  const dailyData = useMemo(() => {
    const days: { date: string; label: string; bonus: number; spent: number }[] = []
    const d = new Date(monthStart)
    while (d <= monthEnd) {
      const dayStr = format(d, 'yyyy-MM-dd')
      const label = format(d, 'M/d')
      days.push({ date: dayStr, label, bonus: 0, spent: 0 })
      d.setDate(d.getDate() + 1)
    }

    for (const tl of timeLogs) {
      if (!tl.duration) continue
      const day = format(new Date(tl.start_time), 'yyyy-MM-dd')
      if (day.startsWith(monthStr)) {
        const entry = days.find((d) => d.date === day)
        if (entry) {
          const dayBonus = calcTimeBonus([tl], catDefs, day)
          entry.bonus += dayBonus
        }
      }
    }

    for (const r of records) {
      if (r.target_pool !== 'entertainment_pool' && r.target_pool !== 'going_out_pool') continue
      const day = format(new Date(r.created_at), 'yyyy-MM-dd')
      if (day.startsWith(monthStr)) {
        const entry = days.find((d) => d.date === day)
        if (entry) entry.spent += r.amount
      }
    }

    let cumBonus = 0
    let cumSpent = 0
    return days.map((d) => {
      cumBonus += d.bonus
      cumSpent += d.spent
      return { ...d, bonus: cumBonus, spent: cumSpent }
    })
  }, [records, timeLogs, monthStart, monthEnd, monthStr])

  const finalData = dailyData[dailyData.length - 1]
  const isCovered = finalData && finalData.bonus >= finalData.spent

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📈</span>
        <span className="font-bold text-gray-800 text-sm">時間とお金のバランス</span>
        {finalData && (
          <span className={`ml-auto text-xs font-medium ${isCovered ? 'text-green-600' : 'text-red-500'}`}>
            {isCovered ? '✅ カバー中' : '⚠️ 超過'}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={dailyData}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.max(1, Math.floor(dailyData.length / 7))} />
          <YAxis tick={{ fontSize: 10 }} unit="¥" />
          <Tooltip contentStyle={{ fontSize: 12 }} formatter={(value) => typeof value === 'number' ? [`¥${value.toLocaleString()}`, ''] : ['', '']} />
          <Line type="monotone" dataKey="bonus" stroke="#10B981" strokeWidth={2} dot={false} name="集中ボーナス" />
          <Line type="monotone" dataKey="spent" stroke="#EF4444" strokeWidth={2} dot={false} name="娯楽消費" />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 text-xs mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 rounded bg-green-500" />
          <span className="text-gray-500">集中ボーナス</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 rounded bg-red-500" />
          <span className="text-gray-500">娯楽消費</span>
        </div>
      </div>
    </div>
  )
}

function MonthlyCalendar({
  yearMonth, records, overspentPools, onEdit, onDelete,
}: {
  yearMonth: Date
  records: FinanceRecord[]
  overspentPools: Set<TargetPool>
  onEdit: (record: FinanceRecord) => void
  onDelete: (id: string) => void
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const today = new Date()
  const daysInMonth = endOfMonth(yearMonth).getDate()
  const firstDayOfWeek = yearMonth.getDay()
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  const monthLabel = format(yearMonth, 'yyyy年 M月', { locale: ja })
  const weekDays = ['月', '火', '水', '木', '金', '土', '日']

  const recordsByDay = useMemo(() => {
    const map = new Map<number, FinanceRecord[]>()
    for (const r of records) {
      const d = new Date(r.created_at).getDate()
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(r)
    }
    return map
  }, [records])

  const daysWithGoingOut = useMemo(() => {
    const set = new Set<number>()
    for (const r of records) {
      if (r.tags?.includes('外食')) {
        set.add(new Date(r.created_at).getDate())
      }
    }
    return set
  }, [records])

  const dayRecords = selectedDay ? (recordsByDay.get(selectedDay) ?? []) : []

  const dayTotal = (day: number) => {
    const dayRecs = recordsByDay.get(day)
    if (!dayRecs) return 0
    return dayRecs.reduce((sum, r) => sum + r.amount, 0)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📅</span>
        <span className="font-bold text-gray-800 text-sm">{monthLabel}</span>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((d) => (
          <div key={d} className={`text-center text-[10px] font-medium py-1 ${d === '日' ? 'text-red-400' : d === '土' ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`e-${i}`} className="bg-white p-1 min-h-14" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const total = dayTotal(day)
          const hasRecords = recordsByDay.has(day)
          const isSelected = selectedDay === day
          const isToday = day === today.getDate() && yearMonth.getMonth() === today.getMonth() && yearMonth.getFullYear() === today.getFullYear()
          const colIdx = (startOffset + i) % 7

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`relative bg-white p-1 text-left transition-colors hover:bg-gray-50 min-h-14 overflow-hidden ${isSelected ? 'ring-2 ring-blue-400 ring-inset' : ''} ${isToday ? 'bg-blue-50' : ''}`}
            >
              <span className={`inline-flex items-center justify-center w-4 h-4 text-[10px] font-medium leading-tight ${colIdx === 6 ? 'text-red-400' : colIdx === 5 ? 'text-blue-400' : 'text-gray-500'} ${isToday ? 'bg-blue-600 text-white rounded-full' : ''}`}>
                {day}
              </span>
              {hasRecords && (
                <div className="text-[9px] font-bold text-gray-700 truncate leading-tight mt-0.5">
                  ¥{total.toLocaleString()}
                </div>
              )}
              {daysWithGoingOut.has(day) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <img src={stampImg} alt="外食" className="w-[85%] h-[85%] object-contain opacity-50" style={{ transform: 'rotate(30deg)' }} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selectedDay !== null && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="text-xs font-bold text-gray-700 mb-2">
            {format(new Date(yearMonth.getFullYear(), yearMonth.getMonth(), selectedDay), 'M/d (E)', { locale: ja })} - ¥{dayTotal(selectedDay).toLocaleString()}
          </div>
          {dayRecords.length === 0 ? (
            <p className="text-[10px] text-gray-400 py-2">この日の記録はありません</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {dayRecords.map((r) => {
                const pool = BUDGET_POOLS.find((p) => p.key === r.target_pool) ?? { icon: '📦', label: 'その他' }
                return (
                  <div key={r.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded-lg group">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs">{pool.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs text-gray-700 truncate">{r.item_name || '名称なし'}</div>
                        {r.tags && r.tags.length > 0 && (
                          <div className="text-[9px] text-gray-400">{r.tags.map((t) => <span key={t} className="mr-1">#{t}</span>)}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`text-xs font-bold ${overspentPools.has(r.target_pool) ? 'text-red-500' : r.motivation === 'entertainment' ? 'text-pink-500' : r.motivation === 'going_out' ? 'text-orange-500' : 'text-gray-700'}`}>
                        ¥{r.amount.toLocaleString()}
                      </span>
                      <button onClick={() => onEdit(r)} className="text-gray-200 hover:text-blue-500 text-[10px] opacity-0 group-hover:opacity-100">✏️</button>
                      <button onClick={() => onDelete(r.id)} className="text-gray-200 hover:text-red-500 text-[10px] opacity-0 group-hover:opacity-100">✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function FinanceView({
  records, timeLogs, catDefs, budget,
  dashboardMonth, onDashboardMonthChange,
  recurringTemplates, recurringRecords, recurringIncome, recurringExpense, recurringNet,
  onAdd, onUpdate, onDelete, onUpdateBase,
  onRecalculateRollover,
  onAddRecurringTemplate, onEditRecurringTemplate, onDeleteRecurringTemplate, onUpdateRecurringRecord,
}: FinanceViewProps) {
  const [showRecurring, setShowRecurring] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null)
  const monthStr = format(dashboardMonth, 'yyyy-MM')
  const prevMonthStr = format(subMonths(dashboardMonth, 1), 'yyyy-MM')
  const rolloverCalculatedRef = useRef<string | null>(null)

  const monthlyRecords = useMemo(
    () => records.filter((r) => r.created_at.startsWith(monthStr)),
    [records, monthStr]
  )

  const prevMonthRecords = useMemo(
    () => records.filter((r) => r.created_at.startsWith(prevMonthStr)),
    [records, prevMonthStr]
  )

  const poolTotals = useMemo(() => {
    const map: Record<TargetPool, number> = { food_pool: 0, daily_pool: 0, growth_pool: 0, entertainment_pool: 0, going_out_pool: 0 }
    for (const r of monthlyRecords) {
      map[r.target_pool] += r.amount
    }
    return map
  }, [monthlyRecords])

  const prevMonthPoolTotals = useMemo(() => {
    const map: Record<TargetPool, number> = { food_pool: 0, daily_pool: 0, growth_pool: 0, entertainment_pool: 0, going_out_pool: 0 }
    for (const r of prevMonthRecords) {
      map[r.target_pool] += r.amount
    }
    return map
  }, [prevMonthRecords])

  const monthlyFocusMinutes = useMemo(() => {
    let total = 0
    for (const tl of timeLogs) {
      if (tl.duration && tl.start_time.startsWith(monthStr)) {
        total += tl.duration
      }
    }
    return total
  }, [timeLogs, monthStr])

  const timeBonus = calcTimeBonus(timeLogs, catDefs, monthStr)

  const prevMonthTimeBonus = calcTimeBonus(timeLogs, catDefs, prevMonthStr)

  useEffect(() => {
    if (!budget) return
    const key = `${monthStr}-${prevMonthStr}`
    if (rolloverCalculatedRef.current === key) return
    rolloverCalculatedRef.current = key
    onRecalculateRollover(prevMonthStr, prevMonthPoolTotals, prevMonthTimeBonus)
  }, [budget, dashboardMonth, onRecalculateRollover, prevMonthStr, monthStr, prevMonthPoolTotals, prevMonthTimeBonus])

  const overspentPools = useMemo(() => {
    if (!budget) return new Set<TargetPool>()
    const set = new Set<TargetPool>()
    if ((budget.food_rollover ?? 0) < 0) set.add('food_pool')
    if ((budget.daily_rollover ?? 0) < 0) set.add('daily_pool')
    if ((budget.entertainment_rollover ?? 0) < 0) set.add('entertainment_pool')
    if ((budget.going_out_rollover ?? 0) < 0) set.add('going_out_pool')
    return set
  }, [budget])

  const monthLabel = format(dashboardMonth, 'yyyy年 M月', { locale: ja })

  const handlePrevDashboardMonth = () => onDashboardMonthChange(subMonths(dashboardMonth, 1))
  const handleNextDashboardMonth = () => onDashboardMonthChange(addMonths(dashboardMonth, 1))
  const handleTodayDashboardMonth = () => onDashboardMonthChange(startOfMonth(new Date()))

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">💰 家計簿</h2>
        <div className="flex items-center gap-1">
          <button onClick={handlePrevDashboardMonth}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded">&lt;</button>
          <span className="text-xs text-gray-400 mx-1 min-w-[7rem] text-center">{monthLabel}</span>
          <button onClick={handleNextDashboardMonth}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded">&gt;</button>
          <button onClick={handleTodayDashboardMonth}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded ml-1">今日</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <QuickExpense onAdd={onAdd} records={records} />

          <MonthlyCalendar
            yearMonth={dashboardMonth}
            records={monthlyRecords}
            overspentPools={overspentPools}
            onEdit={(record) => setEditingRecord(record)}
            onDelete={onDelete}
          />
        </div>

        <div className="space-y-4">
          {budget ? (
            <BudgetDashboard
              budget={budget}
              poolTotals={poolTotals}
              timeBonus={timeBonus}
              focusMinutes={monthlyFocusMinutes}
              monthLabel={monthLabel}
              onUpdateBase={onUpdateBase}
              recurringTemplates={recurringTemplates}
              recurringRecords={recurringRecords}
              recurringIncome={recurringIncome}
              recurringExpense={recurringExpense}
              recurringNet={recurringNet}
              onOpenRecurringManager={() => setShowRecurring(true)}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-center text-gray-400 py-4 text-xs">予算設定を読み込み中...</div>
            </div>
          )}

          <TagHeatmap records={monthlyRecords} />
          <TimeMoneyChart records={monthlyRecords} timeLogs={timeLogs} catDefs={catDefs} yearMonth={dashboardMonth} />
        </div>
      </div>

      {showRecurring && (
        <RecurringManager
          templates={recurringTemplates}
          records={recurringRecords}
          onClose={() => setShowRecurring(false)}
          onAdd={onAddRecurringTemplate}
          onEdit={onEditRecurringTemplate}
          onDelete={onDeleteRecurringTemplate}
          onUpdateRecord={onUpdateRecurringRecord}
        />
      )}

      {editingRecord && (
        <EditExpenseModal
          record={editingRecord}
          onSave={(id, updates) => {
            onUpdate(id, updates)
            setEditingRecord(null)
          }}
          onClose={() => setEditingRecord(null)}
        />
      )}
    </div>
  )
}
