import type { CategoryDefinition } from '../types'

export function calcTimeBonus(
  timeLogs: { duration: number | null; category: string; start_time: string }[],
  catDefs: CategoryDefinition[],
  datePrefix: string,
): number {
  const defMap = new Map(catDefs.map((d) => [d.name, d]))
  let bonus = 0
  for (const l of timeLogs) {
    if (!l.duration || !l.start_time.startsWith(datePrefix)) continue
    const def = defMap.get(l.category)
    if (def?.bonus_enabled && def.bonus_rate > 0) {
      bonus += Math.floor((l.duration / 60) * def.bonus_rate)
    }
  }
  return bonus
}

export function calcCategoryBreakdown(
  timeLogs: { duration: number | null; category: string; start_time: string }[],
  catDefs: CategoryDefinition[],
  datePrefix: string,
): { name: string; minutes: number; color: string; bgColor: string; emoji: string }[] {
  const defMap = new Map(catDefs.map((d) => [d.name, d]))
  const totals = new Map<string, number>()

  for (const l of timeLogs) {
    if (!l.duration || !l.start_time.startsWith(datePrefix)) continue
    totals.set(l.category, (totals.get(l.category) ?? 0) + l.duration)
  }

  return [...totals.entries()]
    .map(([name, minutes]) => {
      const def = defMap.get(name)
      return {
        name,
        minutes,
        color: def?.color ?? '#6B7280',
        bgColor: def?.bg_color ?? '#F3F4F6',
        emoji: def?.emoji ?? 'category',
      }
    })
    .sort((a, b) => b.minutes - a.minutes)
}
