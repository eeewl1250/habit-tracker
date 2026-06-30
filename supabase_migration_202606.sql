-- 2026-06: 娯楽(pleasure)→娯楽(entertainment)＋外出(going_out) 分割マイグレーション
-- 旧 pleasure レコードは entertainment に統合

-- 1. 既存レコードを更新（pleasure→entertainment）
UPDATE financial_logs SET motivation = 'entertainment' WHERE motivation = 'pleasure';
UPDATE financial_logs SET target_pool = 'entertainment_pool' WHERE target_pool = 'pleasure_pool';

-- 2. CHECK 制約を変更
ALTER TABLE financial_logs DROP CONSTRAINT IF EXISTS financial_logs_motivation_check;
ALTER TABLE financial_logs ADD CONSTRAINT financial_logs_motivation_check CHECK (motivation IN ('need', 'entertainment', 'going_out'));

ALTER TABLE financial_logs DROP CONSTRAINT IF EXISTS financial_logs_target_pool_check;
ALTER TABLE financial_logs ADD CONSTRAINT financial_logs_target_pool_check CHECK (target_pool IN ('food_pool', 'daily_pool', 'growth_pool', 'entertainment_pool', 'going_out_pool'));

-- 3. budget_settings に新カラム追加
ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS entertainment_base INTEGER NOT NULL DEFAULT 10000;
ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS going_out_base INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS entertainment_rollover INTEGER NOT NULL DEFAULT 0;
ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS going_out_rollover INTEGER NOT NULL DEFAULT 0;

-- 4. 旧カラム削除（事前に pleasure_rollover の値を entertainment に移行済みであること）
UPDATE budget_settings SET entertainment_rollover = entertainment_rollover + pleasure_rollover WHERE pleasure_rollover != 0;
ALTER TABLE budget_settings DROP COLUMN IF EXISTS pleasure_base;
ALTER TABLE budget_settings DROP COLUMN IF EXISTS pleasure_rollover;
