-- 事前に excluded_dates カラムがなければ追加
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS excluded_dates TEXT NOT NULL DEFAULT '[]';

-- 月曜
INSERT INTO schedules (title, category, date_start, time_start, time_end, memo, is_recurring, rec_unit, rec_interval, rec_days, rec_end_date) VALUES
('JS25 JavaScript', 'school', '2026-06-29', '09:30', '11:00', '近藤雅希 @296', true, 'week', 1, '["0"]', '2026-07-19'),
('NT26 ネットワーク', 'school', '2026-06-29', '12:50', '14:20', '奥野雅之 @121', true, 'week', 1, '["0"]', '2026-07-19'),
('CS2A 情報セキュリティ', 'school', '2026-06-29', '14:30', '16:00', '中川勲俊 @191', true, 'week', 1, '["0"]', '2026-07-19');

-- 火曜
INSERT INTO schedules (title, category, date_start, time_start, time_end, memo, is_recurring, rec_unit, rec_interval, rec_days, rec_end_date) VALUES
('JV27 Java', 'school', '2026-06-30', '16:10', '19:20', '河西良 5-6限 @121', true, 'week', 1, '["1"]', '2026-07-19');

-- 水曜
INSERT INTO schedules (title, category, date_start, time_start, time_end, memo, is_recurring, rec_unit, rec_interval, rec_days, rec_end_date) VALUES
('SD27 システム開発', 'school', '2026-07-01', '12:50', '14:20', '杉山江理子 3限 @141', true, 'week', 1, '["2"]', '2026-07-19'),
('CS2A 情報セキュリティ', 'school', '2026-07-01', '14:30', '16:00', '中川勲俊 4限 @331', true, 'week', 1, '["2"]', '2026-07-19'),
('NT26 ネットワーク', 'school', '2026-07-01', '16:10', '17:40', '奥野雅之 5限 @121', true, 'week', 1, '["2"]', '2026-07-19'),
('DB26 データベース', 'school', '2026-07-01', '17:50', '19:20', '杉山江理子 6限 @121', true, 'week', 1, '["2"]', '2026-07-19');

-- 木曜
INSERT INTO schedules (title, category, date_start, time_start, time_end, memo, is_recurring, rec_unit, rec_interval, rec_days, rec_end_date) VALUES
('ST25 就活対策', 'school', '2026-07-02', '14:30', '17:40', '中川勲俊 @141', true, 'week', 1, '["3"]', '2026-07-19');

-- 金曜
INSERT INTO schedules (title, category, date_start, time_start, time_end, memo, is_recurring, rec_unit, rec_interval, rec_days, rec_end_date) VALUES
('SD27 システム開発', 'school', '2026-07-03', '14:30', '17:40', '杉山江理子 オンライン', true, 'week', 1, '["4"]', '2026-07-19'),
('FX24 その他', 'school', '2026-07-03', '17:50', '19:20', '杉山江理子 オンライン', true, 'week', 1, '["4"]', '2026-07-19');
