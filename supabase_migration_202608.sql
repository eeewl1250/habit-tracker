-- 2026-08: 待办事项 (todos)
CREATE TABLE IF NOT EXISTS todos (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'life' CHECK (category IN ('school', 'job', 'life', 'ent', 'study')),
  status          TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'today', 'done')),
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  actual_minutes  INTEGER NOT NULL DEFAULT 0,
  source_url      TEXT,
  diary_clue      TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_completed_at ON todos(completed_at);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON todos USING (true) WITH CHECK (true);

CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
