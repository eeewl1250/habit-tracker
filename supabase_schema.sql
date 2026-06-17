-- カテゴリ（色はカテゴリに所属）
CREATE TABLE IF NOT EXISTS categories (
  name TEXT PRIMARY KEY,
  color TEXT NOT NULL DEFAULT '#4CAF50',
  bg_color TEXT NOT NULL DEFAULT '#E8F5E9',
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

-- RLS: 全員が全データを読み書き（個人利用のため）
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON tasks USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON daily_logs USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON categories USING (true) WITH CHECK (true);

-- メモ機能
CREATE TABLE IF NOT EXISTS notes (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON notes USING (true) WITH CHECK (true);
