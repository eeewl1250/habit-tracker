const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-3.5-flash'

export interface CorrectionResult {
  corrected_text: string
  advice: string
}

export interface ParsedScheduleEntry {
  title: string
  date: string
  time_start: string
  time_end: string
  category: string
  memo?: string
  is_recurring: boolean
  recurrence?: {
    unit: 'week' | 'day' | 'month' | 'year'
    interval: number
    days: string[]
    end_date: string
  }
}

export async function correctDiary(originalText: string): Promise<CorrectionResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY が設定されていません。.env ファイルを確認してください。')
  }

  const systemInstruction = `あなたは優秀な日本語学校の教師です。親切で丁寧なカウンセラーとして、外国人が書いた日本語の日記を添削してください。

【ルール】
・文法エラーや、より自然な表現があれば、元の意味を崩さないように修正してください。
・返信は必ず以下のフォーマットのJSON（プレーンテキスト）のみで出力してください。バックコトバ（\`\`\`json）などは不要です。

{
  "corrected_text": "自然で正しい日本語に直した日記の全文",
  "advice": "不自然だった部分や、文法の間違い（例:『眠いでした』は間違いで『眠かったです』が正しい等）の解説。優しく簡潔に。"
}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: `以下が添削対象の日記です：
${originalText}` }] }],
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini API エラー (${response.status}): ${body}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini から空の応答が返りました')

  try {
    return JSON.parse(text) as CorrectionResult
  } catch {
    throw new Error('Gemini の応答をパースできませんでした')
  }
}

export interface MonthlyReviewInput {
  month: string
  habits_success_rate: Record<string, string>
  sleep_average_hours: string
  focus_total_hours: string
  appetite_restraint_days: string
  menstrual_cycle: string
  key_events: string[]
}

export async function generateMonthlyReview(data: MonthlyReviewInput): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY が設定されていません。.env ファイルを確認してください。')
  }

  const systemInstruction = `あなたは高級な個人成長コーチ兼心理カウンセラーです。ユーザーが提供する月度デジタルライフデータをもとに、極めて構造化され、かつ優しく核心を突いた月次振り返りレポートを生成してください。

【分析要件】
1. クロス分析（最重要）：単なる数字の列挙に終始しないでください。データ間の潜在的な関連性を見つけてください。例：
   - 「睡眠時間」と「集中時間」の相関
   - 「食欲忍耐成功率」が「生理周期」前後で変動していないか
   - 「就活予定（仕事ストレス）」増加時に、生活習慣のチェックイン率が低下していないか
2. 建設的提案：今月特に優れていた点を挙げ（心理的エネルギー补给）、最も改善が必要な項目について来月の微調整案を提示してください。
3. フォーマット：清潔な Markdown を直接出力し、ユーザーがそのまま復盤ノートにコピペできるようにしてください。

【出力構成】
- # タイトル: YYYY年M月度・個人振り返り
- ## 1. 核心データ総覧（数字のサマリ）
- ## 2. クロス分析と気づき（重要：データ間の関連性を考察）
- ## 3. 今月の良かった点（心理的エネルギーを高める）
- ## 4. 改善ポイントと来月のアクションプラン（具体的に1つ）`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: JSON.stringify(data, null, 2) }] }],
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini API エラー (${response.status}): ${body}`)
  }

  const result = await response.json()
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini から空の応答が返りました')
  return text
}

export async function parseScheduleText(rawText: string): Promise<ParsedScheduleEntry[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY が設定されていません。.env ファイルを確認してください。')
  }

  const systemInstruction = `あなたは日程情報を解析するアシスタントです。
ユーザーが入力した日程テキストを解析し、以下のJSON配列形式で出力してください。
出力はJSON配列のみ（バッククォートや説明は不要）。

各要素の形式:
{
  "title": "予定のタイトル",
  "date": "YYYY-MM-DD",
  "time_start": "HH:MM",
  "time_end": "HH:MM",
  "category": "school | job | life | ent | study",
  "memo": "場所や備考（任意）",
  "is_recurring": false,
  "recurrence": null
}

【ルール】
- 日付の表記（今日、明日、来週月曜、6/30など）は実際の日付に変換してください。
- 今日は ${new Date().toISOString().slice(0, 10)} です。
- 元のテキストにない情報は推定しないでください。
- カテゴリが不明な場合は "life" をデフォルトにしてください。
- 繰り返し日程の場合は is_recurringをtrueにし、recurrenceオブジェクトに情報を入れてください。`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: rawText }] }],
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gemini API エラー (${response.status}): ${body}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini から空の応答が返りました')

  const cleaned = text.replace(/```(?:json)?\s*/gi, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    throw new Error('Gemini の応答をパースできませんでした')
  }
}
