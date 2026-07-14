// apps/sleep/src/types.ts
// sleep モジュール固有の型

export interface SleepLog {
  id: string
  date: string
  bed_time: string | null
  sleep_time: string | null
  wake_time: string | null
  sleep2_time: string | null
  wake2_time: string | null
  created_at: string
  updated_at: string
}
