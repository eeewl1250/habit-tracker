-- 2026-08: 待办事项 (todos)
CREATE TABLE IF NOT EXISTS todos (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title           TEXT NOT NULL,
  is_project      BOOLEAN NOT NULL DEFAULT FALSE,
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

-- 2026-09: 统一分类系统 (category_definitions)
-- 全モジュール（todo/schedule/tasks/focus）の分類を一元管理

CREATE TABLE IF NOT EXISTS category_definitions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#6B7280',
  bg_color        TEXT NOT NULL DEFAULT '#F3F4F6',
  emoji           TEXT NOT NULL DEFAULT '📌',
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  bonus_rate      INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- todos の CHECK 制約を削除（任意のカテゴリ名を許可）
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_category_check;

-- RLS
ALTER TABLE category_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON category_definitions USING (true) WITH CHECK (true);

-- schedules の CHECK 制約を削除（任意のカテゴリ名を許可）
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_category_check;

-- time_logs の CHECK 制約を削除（任意のカテゴリ名を許可）
ALTER TABLE time_logs DROP CONSTRAINT IF EXISTS time_logs_category_check;

-- tasks の CHECK 制約を削除（任意のカテゴリ名を許可）
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_category_check;

-- category_definitions の updated_at トリガー
CREATE TRIGGER category_definitions_updated_at
  BEFORE UPDATE ON category_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- seed デフォルトカテゴリ（既存の TODO_CATEGORIES を移行）
INSERT INTO category_definitions (name, color, bg_color, emoji, is_default, bonus_enabled, bonus_rate, sort_order) VALUES
  ('就活', '#EF4444', '#FEE2E2', 'work', FALSE, TRUE, 100, 0),
  ('学校', '#6B7280', '#F3F4F6', 'school', FALSE, FALSE, 0, 1),
  ('生活', '#3B82F6', '#DBEAFE', 'home', FALSE, FALSE, 0, 2),
  ('娯楽', '#F97316', '#FFEDD5', 'celebration', FALSE, FALSE, 0, 3),
  ('学習', '#8B5CF6', '#EDE9FE', 'lightbulb', FALSE, FALSE, 0, 4),
  ('其他', '#6B7280', '#F3F4F6', 'category', TRUE, FALSE, 0, 999)
ON CONFLICT DO NOTHING;

-- 既存データのカテゴリ値を移行（key → name）
UPDATE todos SET category = '就活' WHERE category = 'job';
UPDATE todos SET category = '学校' WHERE category = 'school';
UPDATE todos SET category = '生活' WHERE category = 'life';
UPDATE todos SET category = '娯楽' WHERE category = 'ent';
UPDATE todos SET category = '学習' WHERE category = 'study';
UPDATE schedules SET category = '就活' WHERE category = 'job';
UPDATE schedules SET category = '学校' WHERE category = 'school';
UPDATE schedules SET category = '生活' WHERE category = 'life';
UPDATE schedules SET category = '娯楽' WHERE category = 'ent';
UPDATE schedules SET category = '学習' WHERE category = 'study';

CREATE INDEX IF NOT EXISTS idx_category_definitions_sort ON category_definitions(sort_order);
