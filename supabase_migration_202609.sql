-- 2026-09: プロジェクト機能 - parent_id を todos に追加
ALTER TABLE todos ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES todos(id) ON DELETE CASCADE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_project BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id);
