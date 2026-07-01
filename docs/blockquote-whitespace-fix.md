# Blockquote 上下余白問題 解決記録

## 問題

AI添削ビューの引用ブロック（blockquote）に、不自然な上下の余白（空白行）が表示されていた。

## 解決流程

### Step 0: 問題の報告

ユーザーが「引用ブロックに上下の余白がある」と報告。

### Step 1: 仮説「blockquote の margin / padding が原因」

- テーマの blockquote に `py-1.5 my-1.5` が指定されており、これが余白に見えているのではと推測
- CSS で `margin-block-start: 0; margin-block-end: 0` を追加してブラウザデフォルトマージンをリセット
- 全テーマの blockquote から `py-` / `my-` クラスと `whitespace-pre-wrap` を削除（※ `pre` の `whitespace-pre-wrap` も誤って削除してしまい、後で復元）

**→ 効果なし。ユーザーから「まだ上下の余白がある」とフィードバック。**
→ この時点では `whitespace-pre-wrap` が原因と気づいておらず、別の原因を模索。また、`pre` の `whitespace-pre-wrap` が消えたことに気づかず後で復元する手間が発生。

### Step 2: ユーザーが真の原因を発見

**`whitespace-pre-wrap`** が blockquote に適用されていたことが原因と判明。

ReactMarkdown がパースした blockquote の子ノードには先頭・末尾の改行が含まれており、`whitespace-pre-wrap` がそれらの改行を可視化することで、上下に空白行ができていた。

### Step 3: 修正適用

- blockquote から `whitespace-pre-wrap` を削除（全テーマ）
- `pre`（コードブロック）はコード書式保持のために `whitespace-pre-wrap` を維持
- **`remark-breaks` を導入**して改行を `<br>` に変換 → blockquote でも改行が表示される

### Step 4: ビルド確認

`npx vite build` → 成功。

## 最終的な修正内容

### 1. 全テーマから blockquote の `whitespace-pre-wrap` を削除

blockquote に改行保持の必要はなく、通常のテキスト折り返しで十分。

**対象テーマ:**
- defaultStyles（`src/lib/markdownThemes.tsx:43`）
- compactStyles（`src/lib/markdownThemes.tsx:68`）
- sepiaStyles（`src/lib/markdownThemes.tsx:109`）
- monochromeStyles（`src/lib/markdownThemes.tsx:128`）

### 2. `remark-breaks` の導入

- `npm install remark-breaks`
- 全 `ReactMarkdown` に `remarkBreaks` を追加（`src/components/DiaryView.tsx`）
- markdown 内の単一改行が `<br>` に変換されるため、`whitespace-pre-wrap` なしでも blockquote 内で改行が保持される

### 3. `pre`（コードブロック）は `whitespace-pre-wrap` を維持

コードの書式保持には必要なので残した。

## 結論

**本質的な原因は `whitespace-pre-wrap` のみ。** blockquote 本来の `py-` / `my-` は削除不要で、最終的に元に戻した。

**解決策:** `whitespace-pre-wrap` を blockquote から外し、代わりに `remark-breaks` を導入して markdown パース時に改行を `<br>` に変換する方式に変更した。

## 教訓

- 見た目の余白問題 → まず `whitespace` 関連の CSS（`whitespace-pre-wrap` など）を疑う
- ReactMarkdown の子ノードにはパース由来の改行が含まれ得る
- コードブロック（`pre`）以外で `whitespace-pre-wrap` は使わない方が安全
