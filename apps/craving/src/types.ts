// apps/craving/src/types.ts
// craving モジュール固有の型と定数

export interface CravingLog {
  id: string
  result: 'resisted' | 'failed'
  mood: string[] | null
  created_at: string
}

export const CRAVING_MOODS = ['退屈', 'ストレス', '動画を見た', '友達に誘われた', '寂しい', 'その他'] as const

export const CRAVING_ALTERNATIVES = [
  '温かいお茶を飲んでみよう',
  '歯を磨いてリセットしよう',
  'ストレッチを5分だけやってみる',
  '目を閉じて10回深呼吸',
  'コップ一杯の水をゆっくり飲もう',
  '好きな曲を1曲聴いてみよう',
  '手帳を開いて今の気持ちを書いてみる',
  '散歩に出かけてみよう',
  '氷を食べてみる（噛む欲を満たす）',
  '寝る準備を始めよう',
] as const
