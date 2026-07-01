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
