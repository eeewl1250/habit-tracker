-- time_logs のカテゴリ名を日本語名に移行（202608 で constraint は削除済み）
-- self_growth → 学習, job_hunting → 就活
BEGIN;
UPDATE time_logs SET category = '学習' WHERE category = 'self_growth';
UPDATE time_logs SET category = '就活' WHERE category = 'job_hunting';
COMMIT;
