-- タスクマスタ
CREATE TABLE tasks (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  period_type TEXT NOT NULL DEFAULT 'frequency' CHECK (period_type IN ('frequency', 'weekday')),
  frequency   INTEGER,
  weekdays    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- デイリーログ
CREATE TABLE daily_logs (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, date)
);

CREATE INDEX idx_daily_logs_date ON daily_logs(date);
CREATE INDEX idx_daily_logs_task_id ON daily_logs(task_id);

-- 自動 updated_at トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: 全員が全データを読み書き（個人利用のため）
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON tasks USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON daily_logs USING (true) WITH CHECK (true);
