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
