const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-3.5-flash'

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
