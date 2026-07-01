-- カテゴリ（色はカテゴリに所属）
CREATE TABLE IF NOT EXISTS categories (
  name TEXT PRIMARY KEY,
  color TEXT NOT NULL DEFAULT '#4CAF50',
  bg_color TEXT NOT NULL DEFAULT '#E8F5E9',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- タスクマスタ
CREATE TABLE tasks (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  period_type TEXT NOT NULL DEFAULT 'frequency' CHECK (period_type IN ('frequency', 'weekday')),
  frequency   INTEGER,
  weekdays    TEXT,
  base_date   DATE,            -- 頻度タスクの基準日（NULL=作成日）
  color       TEXT,            -- 非推奨（互換性維持）
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- デイリーログ
CREATE TABLE IF NOT EXISTS daily_logs (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  memo       TEXT,             -- チェック時のメモ
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_task_id ON daily_logs(task_id);

-- 自動 updated_at トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 既存DBがある場合のマイグレーション
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS base_date DATE;
-- ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS memo TEXT;
-- ALTER TABLE categories ADD COLUMN IF NOT EXISTS bg_color TEXT NOT NULL DEFAULT '#E8F5E9';
--
-- 2026-06: 娯楽(pleasure)→娯楽(entertainment)＋外出(going_out) 分割マイグレーション
-- マイグレーション用SQLは supabase_migration_202606.sql を参照

-- RLS: 全員が全データを読み書き（個人利用のため）
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON tasks USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON daily_logs USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON categories USING (true) WITH CHECK (true);

-- メモ機能（タスクチェックイン後の記録）
CREATE TABLE IF NOT EXISTS notes (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON notes USING (true) WITH CHECK (true);

-- 生理周期記録
CREATE TABLE IF NOT EXISTS menstruation_logs (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  year_month TEXT NOT NULL,
  day        INTEGER NOT NULL CHECK (day >= 1 AND day <= 31),
  level      INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(year_month, day)
);

CREATE INDEX IF NOT EXISTS idx_menstruation_logs_ym ON menstruation_logs(year_month);

ALTER TABLE menstruation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON menstruation_logs USING (true) WITH CHECK (true);

-- 食欲コントロール記録
CREATE TABLE IF NOT EXISTS craving_logs (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  result     TEXT NOT NULL CHECK (result IN ('resisted', 'failed')),
  mood       TEXT[] DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_craving_logs_created_at ON craving_logs(created_at);

ALTER TABLE craving_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON craving_logs USING (true) WITH CHECK (true);

-- 時間トラッキング（就活/自己投資の集中記録）
CREATE TABLE IF NOT EXISTS time_logs (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category   TEXT NOT NULL CHECK (category IN ('job_hunting', 'self_growth')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ,
  duration   INTEGER,
  summary    TEXT,
  tags       TEXT[] DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_logs_start_time ON time_logs(start_time);

ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON time_logs USING (true) WITH CHECK (true);

-- 家計簿（予算プール＋心理動機）
CREATE TABLE IF NOT EXISTS financial_logs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  amount        INTEGER NOT NULL,
  item_name     TEXT NOT NULL DEFAULT '',
  base_category TEXT NOT NULL CHECK (base_category IN ('food', 'daily', 'book', 'transport')),
  motivation    TEXT NOT NULL CHECK (motivation IN ('need', 'entertainment', 'going_out')),
  target_pool   TEXT NOT NULL CHECK (target_pool IN ('food_pool', 'daily_pool', 'growth_pool', 'entertainment_pool', 'going_out_pool')),
  tags          TEXT[] DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_logs_created_at ON financial_logs(created_at);

ALTER TABLE financial_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON financial_logs USING (true) WITH CHECK (true);

-- 月次予算設定（ロールオーバー含む）
CREATE TABLE IF NOT EXISTS budget_settings (
  month                TEXT PRIMARY KEY,  -- '2026-06'
  food_base            INTEGER NOT NULL DEFAULT 30000,
  daily_base           INTEGER NOT NULL DEFAULT 10000,
  entertainment_base   INTEGER NOT NULL DEFAULT 10000,
  going_out_base       INTEGER NOT NULL DEFAULT 5000,
  food_rollover        INTEGER NOT NULL DEFAULT 0,
  daily_rollover       INTEGER NOT NULL DEFAULT 0,
  entertainment_rollover INTEGER NOT NULL DEFAULT 0,
  going_out_rollover   INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON budget_settings USING (true) WITH CHECK (true);

-- 固定收支模板（母版）
CREATE TABLE IF NOT EXISTS recurring_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  item_name       TEXT NOT NULL,
  default_amount  INTEGER NOT NULL CHECK (default_amount > 0),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON recurring_templates USING (true) WITH CHECK (true);

-- 月度固定收支实例（每月一号自动从模板生成）
CREATE TABLE IF NOT EXISTS monthly_recurring_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES recurring_templates(id) ON DELETE CASCADE,
  month           TEXT NOT NULL,  -- '2026-06'
  amount          INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_recurring_month ON monthly_recurring_records(month);
ALTER TABLE monthly_recurring_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON monthly_recurring_records USING (true) WITH CHECK (true);

-- 日記エントリ
CREATE TABLE IF NOT EXISTS diary_entries (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date            DATE NOT NULL UNIQUE,
  original_text   TEXT NOT NULL DEFAULT '',
  corrected_text  TEXT,
  ai_advice       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diary_entries_date ON diary_entries(date);

ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON diary_entries USING (true) WITH CHECK (true);

CREATE TRIGGER diary_entries_updated_at
  BEFORE UPDATE ON diary_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
