# 習慣トラッカー (Habit Tracker)

## 概要
個人用習慣トラッキング SPA。React + TypeScript + Supabase（BaaS）で構成し、Netlify にデプロイ。スマホから無料で使えることを前提とする。

---

## 技術スタック

| 項目 | 採用技術 |
|------|----------|
| フレームワーク | React 19 + TypeScript 6 |
| ビルドツール | Vite 8 |
| CSS | Tailwind CSS v4（`@tailwindcss/vite` プラグイン経由、設定ファイル不要） |
| BaaS | Supabase（PostgreSQL, RLS, REST API） |
| デプロイ | Netlify（GitHub main ブランチから自動デプロイ） |
| パッケージ管理 | npm |
| 日付操作 | date-fns v4（`date-fns/locale/ja` 併用） |
| チャート | Recharts v3 |
| ドラッグ&ドロップ | @dnd-kit（タスク並び替えのみ）、ネイティブ HTML5 Drag & Drop（分類並び替えのみ） |

### 主要依存パッケージ
- `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0`, `@dnd-kit/utilities@^3.2.2`
- `@supabase/supabase-js@^2.108.2`
- `react-router-dom@^7.18.0`
- `recharts@^3.8.1`

---

## プロジェクト構成

```
habit_tracker/
├── public/
│   └── _redirects          # Netlify SPA ルーティング設定
├── src/
│   ├── components/
│   │   ├── Header.tsx          # ヘッダー（ビュー切替、日付ナビ）
│   │   ├── MatrixView.tsx      # PC 用マトリックスグリッド（週/月）
│   │   ├── MobileView.tsx      # スマホ用カードビュー
│   │   ├── HeatmapView.tsx     # ヒートマップ（🔥）
│   │   ├── StatsView.tsx       # 統計（📊）
│   │   ├── NotesView.tsx       # メモ一覧（📝）
│   │   ├── TaskForm.tsx        # タスク作成/編集フォーム
│   │   ├── CategoryCombobox.tsx # カテゴリ検索+作成コンボボックス
│   │   ├── ManagementPage.tsx  # タスク/カテゴリ管理ページ
│   │   ├── NoteModal.tsx       # メモ記録モーダル
│   │   └── Toast.tsx           # トースト通知
│   ├── hooks/
│   │   ├── useTasks.ts         # タスク状態管理
│   │   ├── useLogs.ts          # ログ状態管理
│   │   └── useViewDates.ts     # 日付ナビゲーション
│   ├── lib/
│   │   ├── supabase.ts         # Supabase クライアント初期化
│   │   └── api.ts              # 全 CRUD API 関数
│   ├── types/
│   │   └── index.ts            # 型定義、定数
│   ├── App.tsx                 # ルートコンポーネント
│   ├── main.tsx                # エントリーポイント
│   └── index.css               # Tailwind インポート＋グローバルスタイル
├── supabase_schema.sql         # 完全な DB スキーマ（マイグレーションコメント付き）
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── package.json
└── .env / .env.example
```

---

## セットアップ手順

### 1. リポジトリのクローン
```bash
git clone https://github.com/eeewl1250/habit-tracker.git
cd habit_tracker
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
`.env` ファイルをプロジェクトルートに作成:
```env
VITE_SUPABASE_URL=https://ggjalapbplpbtbzljmpf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnamFsYXBicGxwYnRiemxqbXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NTc5OTQsImV4cCI6MjA5NzIzMzk5NH0.ESn7EmZjDkaJ7raiEpg8wObkNiqM7CdyZ3WlBHF7Wfk
```

現在の URL / anon key は上記の通り。Supabase プロジェクトが一時停止（1週間無アクセス後）した場合は、Supabase Dashboard から復帰させること。

### 4. Supabase テーブル作成
Supabase SQL Editor で `supabase_schema.sql` の内容を実行する。

### 5. 開発サーバー起動
```bash
npm run dev
```

### 6. ビルド
```bash
npm run build
```
内部では `tsc -b && vite build` が実行される。`tsc -b` は `--noEmit` より厳密で、未使用変数等もエラーにする。

---

## DB スキーマ

### categories
| カラム | 型 | 備考 |
|--------|-----|------|
| name | TEXT (PK) | カテゴリ名 |
| color | TEXT | ドット色（例: `#4CAF50`） |
| bg_color | TEXT | 背景色（例: `#E8F5E9`） |
| sort_order | INTEGER (default 0) | 並び替え順 |
| created_at | TIMESTAMPTZ | |

### tasks
| カラム | 型 | 備考 |
|--------|-----|------|
| id | TEXT (PK) | UUID |
| name | TEXT | タスク名 |
| category | TEXT | カテゴリ名（categories.name への外部参照、ただし FK 制約なし） |
| status | TEXT | `active` / `disabled` |
| period_type | TEXT | `frequency` / `weekday` |
| frequency | INTEGER | N日に1回（period_type=frequency 時） |
| weekdays | TEXT | JSON 配列（period_type=weekday 時、例: `["mon","wed","fri"]`） |
| base_date | DATE | 頻度タスクの基準日（NULL=作成日） |
| color | TEXT | 非推奨（互換性維持） |
| sort_order | INTEGER (default 0) | 並び替え順 |
| created_at / updated_at | TIMESTAMPTZ | |

### daily_logs
| カラム | 型 | 備考 |
|--------|-----|------|
| id | TEXT (PK) | UUID |
| task_id | TEXT (FK→tasks.id, CASCADE) | |
| date | TEXT | `YYYY-MM-DD` 形式 |
| memo | TEXT | チェックイン時のメモ |
| created_at | TIMESTAMPTZ | |
| UNIQUE(task_id, date) | | 同じタスク×日付で重複不可 |

### notes
| カラム | 型 | 備考 |
|--------|-----|------|
| id | TEXT (PK) | UUID |
| task_id | TEXT (FK→tasks.id, CASCADE) | |
| content | TEXT | メモ本文 |
| created_at / updated_at | TIMESTAMPTZ | |

### RLS（Row Level Security）
全テーブルに `allow_all` ポリシーを設定。個人利用のため、全ユーザーが全データを読み書き可能。

---

## Netlify デプロイ

- GitHub main ブランチにプッシュすると Netlify が自動デプロイ
- ビルドコマンド: `npm run build`（`tsc -b && vite build`）
- 公開ディレクトリ: `dist`
- SPA ルーティング対応: `public/_redirects` に `/* /index.html 200` を記述
- 環境変数は Netlify ダッシュボード（Site settings → Environment variables）で設定:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- `.env` は gitignore 対象、Netlify ではダッシュボードから設定

---

## アーキテクチャの決定事項

### Supabase 選択理由
- バックエンドコード不要（クライアントから直接 Supabase SDK で DB 操作）
- 無料枠で PostgreSQL 利用可能
- RLS でセキュリティ確保（個人利用なので allow-all で十分）

### タスク履歴の分離
- `tasks` テーブル（マスタ）と `daily_logs`（日次ログ）は分離
- タスクの period_type / frequency / base_date を変更しても既存の daily_logs に影響しない
- 週タイプのタスクは指定曜日のみチェックボックス表示
- 頻度タイプ（N日に1回）は期間を点線枠でグループ化、1つのチェックボックスで期間全体をチェック

### 月境界の頻度グループ表示
- ビューの先頭で期間が途中から始まる場合、先頭だけの跨ぎグループを表示
- 跨ぎグループにもチェックボックスと点線枠を表示（通常グループと同様）
- 日付ラベルは実際の期間範囲（例: 13-26）を表示

### CSS Grid のマトリックスビュー
- 左列（タスク名）は `sticky` + `z-index` で固定スクロール
- 右側（日付グリッド）は横スクロール
- カテゴリ行は bg_color で塗りつぶし、カテゴリ名に色 dot

### カテゴリの色モデル
- `color`: ドットの色（小円）
- `bg_color`: 背景色（カテゴリ行全体）
- 10色ペアを `CATEGORY_COLOR_PAIRS` として定義

### スマホ対応
- ブレークポイント: `md:`（768px）
- PC: MatrixView（グリッド）
- スマホ: MobileView（カード + 日付ナビ + 進捗バー + カテゴリセクション）
- FAB（右下 +ボタン）でタスク追加

### チェックイン → メモのフロー
1. チェックボックス ON → トースト通知（3秒自動消灯）
2. トーストをクリック → NoteModal 表示
3. メモを保存 → notes テーブルに記録
4. タスクにメモがある場合、📝 インジケータ表示（全ビュー共通）
5. 📝 クリックで Notes ビューにジャンプ

### 並び替え（ManagementPage）
- 「並び替え」ボタンで並び替えモードに移行
- **分類**: ネイティブ HTML5 Drag & Drop（分類セクション同士でのみ上下移動）
- **タスク**: @dnd-kit の SortableContext（各分類ごとに独立した DndContext）
  - 同一分類内の順序変更
  - 別分類への移動（category フィールド自動更新）
- 「並び替えを保存」で全変更を一括 API 保存
- 「キャンセル」で元の順序に戻す

### fetchCategories の並び順
- DB クエリは `order('name')` を使用
- `sort_order` カラムが存在しない DB でも動作するよう、あえて name 順で取得
- 管理画面では categories 配列の順序をそのまま表示順として使用

---

## 開発ノウハウ

### 型の変更履歴
- `Category.sort_order` を optional に変更（`sort_order` カラムがない既存 DB 対応）
- `tasks.color` は互換性維持のため残しているが、現在は未使用

### トラブルシューティング
- **Supabase が 400 エラー**: カラムが存在しない可能性。ALTER TABLE で追加するか、該当カラムを upsert/insert から除去
- **Netlify デプロイ失敗**: ビルドログで `tsc -b` エラーを確認。未使用変数・インポートを削除
- **DB 一時停止**: Supabase Dashboard でプロジェクトを開くと自動復帰

### マイグレーション用 SQL
```sql
-- 新規テーブル追加
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON notes USING (true) WITH CHECK (true);

-- カラム追加
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS base_date DATE;
```
