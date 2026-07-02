-- 2026-07: 日記機能（diary_entriesテーブル追加）
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

-- 2026-07: 日程管理（schedulesテーブル）
CREATE TABLE IF NOT EXISTS schedules (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('school', 'job', 'life', 'ent')),
  date_start    DATE NOT NULL,
  time_start    TIME,
  time_end      TIME,
  url           TEXT,
  memo          TEXT,
  is_recurring  BOOLEAN NOT NULL DEFAULT false,
  rec_unit      TEXT CHECK (rec_unit IN ('day', 'week', 'month', 'year')),
  rec_interval  INTEGER DEFAULT 1,
  rec_days      TEXT,
  rec_end_date  DATE,
  excluded_dates TEXT NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_date_start ON schedules(date_start);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON schedules USING (true) WITH CHECK (true);

CREATE TRIGGER schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
