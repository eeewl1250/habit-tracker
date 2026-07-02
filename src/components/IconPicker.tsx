import { useState, useMemo } from 'react'

const ICON_GROUPS = [
  {
    label: '仕事',
    icons: ['work', 'work_history', 'business_center', 'badge', 'admin_panel_settings', 'assignment', 'task_alt', 'fact_check'],
  },
  {
    label: '学校',
    icons: ['school', 'auto_stories', 'menu_book', 'local_library', 'science', 'biotech', 'computer', 'developer_mode'],
  },
  {
    label: '生活',
    icons: ['home', 'house', 'family_star', 'favorite', 'self_improvement', 'spa', 'checkroom', 'colorize'],
  },
  {
    label: '娯楽',
    icons: ['celebration', 'weekend', 'sports_esports', 'movie', 'music_note', 'theater_comedy', 'stadia_controller', 'palette'],
  },
  {
    label: '学習',
    icons: ['lightbulb', 'tips_and_updates', 'psychology', 'neurology', 'menu_book', 'model_training', 'language', 'translate'],
  },
  {
    label: '健康',
    icons: ['fitness_center', 'directions_run', 'self_care', 'local_hospital', 'elderly', 'monitor_heart', 'pulse', 'hotel'],
  },
  {
    label: '食事',
    icons: ['restaurant', 'local_dining', 'coffee', 'ramen_dining', 'icecream', 'bakery_dining', 'lunch_dining', 'takeout_dining'],
  },
  {
    label: 'ショッピング',
    icons: ['shopping_cart', 'shopping_bag', 'local_mall', 'storefront', 'redeem', 'card_giftcard', 'sell', 'payments'],
  },
  {
    label: '移動',
    icons: ['directions_car', 'flight', 'train', 'directions_bus', 'pedal_bike', 'directions_walk', 'map', 'explore'],
  },
  {
    label: 'その他',
    icons: ['category', 'label', 'bookmark', 'star', 'flag', 'notifications', 'event', 'more_horiz'],
  },
]

const ALL_ICONS = ICON_GROUPS.flatMap(g => g.icons)

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return ICON_GROUPS
    const q = search.toLowerCase()
    const matched = ALL_ICONS.filter(i => i.includes(q))
    if (matched.length === 0) return []
    return [{ label: '検索結果', icons: matched }]
  }, [search])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400">アイコン:</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="アイコンを検索..."
          className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs"
        />
      </div>
      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">見つかりませんでした</p>
        ) : (
          filtered.map((group) => (
            <div key={group.label}>
              <div className="text-[10px] text-slate-400 mb-1">{group.label}</div>
              <div className="flex flex-wrap gap-1">
                {group.icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => { onChange(icon); setSearch('') }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all ${
                      value === icon
                        ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-400'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title={icon}
                  >
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
