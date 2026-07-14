// apps/diary/src/lib/gemini.ts
// Gemini APIによる日記添削

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-3.5-flash'

export interface CorrectionResult {
  corrected_text: string
  advice: string
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
