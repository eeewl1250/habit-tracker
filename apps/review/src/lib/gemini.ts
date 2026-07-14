const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-3.5-flash'

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
