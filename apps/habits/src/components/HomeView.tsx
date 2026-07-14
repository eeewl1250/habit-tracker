import { format, differenceInMinutes, parseISO } from 'date-fns'
import type { ViewMode, Task, DailyLog, SleepLog, TimeLog, DiaryEntry } from '../types'

interface HomeViewProps {
  tasks: Task[]
  logs: DailyLog[]
  sleepLogs: SleepLog[]
  timeLogs: TimeLog[]
  diaryEntries: DiaryEntry[]
  onNavigate: (mode: ViewMode) => void
}

interface QuickLink {
  mode: ViewMode
  label: string
  icon: string
  desc: string
}

const quickLinks: QuickLink[] = [
  { mode: 'week', label: '習慣', icon: '☑', desc: '週間・月間の習慣確認' },
  { mode: 'diary', label: '日記', icon: '📝', desc: '日本語日記を書く' },
  { mode: 'sleep', label: '睡眠', icon: '🛌', desc: '睡眠記録' },
  { mode: 'todo', label: 'TODO', icon: '📋', desc: 'タスク管理・集中トラッキング' },
  { mode: 'finance', label: '家計簿', icon: '💰', desc: '支出管理・予算' },
  { mode: 'stats', label: '統計', icon: '📊', desc: '習慣の統計' },
  { mode: 'notes', label: 'メモ', icon: '📋', desc: 'タスクメモ一覧' },
  { mode: 'craving', label: '欲望', icon: '🔥', desc: '間食欲求記録' },
  { mode: 'menstruation', label: '生理', icon: '🩸', desc: '生理周期記録' },
  { mode: 'heatmap', label: 'ヒートマップ', icon: '🔥', desc: '習慣の可視化' },
]

export function HomeView({ tasks, logs, sleepLogs, timeLogs, diaryEntries, onNavigate }: HomeViewProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayLogs = logs.filter((l) => l.date === today)
  const doneCount = todayLogs.length
  const totalCount = tasks.filter((t) => t.status === 'active').length

  const latestSleep = sleepLogs
    .filter((l) => l.bed_time)
    .sort((a, b) => new Date(b.bed_time!).getTime() - new Date(a.bed_time!).getTime())[0]
  const sleepDuration = latestSleep?.wake_time && latestSleep?.sleep_time
    ? differenceInMinutes(parseISO(latestSleep.wake_time), parseISO(latestSleep.sleep_time))
    : 0
  const sleepDuration2 = latestSleep?.wake2_time && latestSleep?.sleep2_time
    ? differenceInMinutes(parseISO(latestSleep.wake2_time), parseISO(latestSleep.sleep2_time))
    : 0
  const totalSleepMin = sleepDuration + sleepDuration2
  const sleepValue = totalSleepMin > 0
    ? `${Math.floor(totalSleepMin / 60)}時間${totalSleepMin % 60}分`
    : latestSleep?.wake_time
      ? '完了'
      : latestSleep?.sleep_time
        ? '起床待ち'
        : '就寝中'
  const sleepLabel = latestSleep ? (latestSleep.wake_time ? '直近' : '進行中') : '未記録'

  const todayFocus = timeLogs.filter((l) => l.start_time.startsWith(today))
  const focusMinutes = todayFocus.reduce((sum, l) => {
    if (l.duration) return sum + l.duration
    if (l.end_time) return sum + Math.round((new Date(l.end_time).getTime() - new Date(l.start_time).getTime()) / 60000)
    return sum
  }, 0)

  const hasDiary = diaryEntries.some((e) => e.date === today)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-1">
          {format(new Date(), 'yyyy年M月d日')}
        </h2>
        <p className="text-sm text-gray-500 mb-4">今日のサマリー</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon="☑"
            label="習慣"
            value={`${doneCount}/${totalCount}`}
            sub={totalCount > 0 ? `${Math.round((doneCount / totalCount) * 100)}%` : '--'}
            color="bg-blue-50 border-blue-200"
            onClick={() => onNavigate('week')}
          />
          <SummaryCard
            icon="🛌"
            label="睡眠"
            value={sleepValue}
            sub={sleepLabel}
            color="bg-indigo-50 border-indigo-200"
            onClick={() => onNavigate('sleep')}
          />
          <SummaryCard
            icon="⏱"
            label="集中"
            value={focusMinutes > 0 ? `${focusMinutes}分` : '---'}
            sub={focusMinutes >= 60 ? `${(focusMinutes / 60).toFixed(1)}時間` : ''}
            color="bg-amber-50 border-amber-200"
            onClick={() => onNavigate('focus')}
          />
          <SummaryCard
            icon="📝"
            label="日記"
            value={hasDiary ? '済み' : '未記入'}
            sub={hasDiary ? '✓' : ''}
            color={hasDiary ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}
            onClick={() => onNavigate('diary')}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">クイックアクセス</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickLinks.map((link) => (
            <button
              key={link.mode}
              onClick={() => onNavigate(link.mode)}
              className="flex flex-col items-center gap-1 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-center"
            >
              <span className="text-2xl">{link.icon}</span>
              <span className="text-sm font-medium text-gray-700">{link.label}</span>
              <span className="text-[10px] text-gray-400 leading-tight">{link.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  icon, label, value, sub, color, onClick,
}: {
  icon: string; label: string; value: string; sub: string; color: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 p-4 rounded-xl border transition-all hover:shadow-sm ${color}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-base font-bold text-gray-800">{value}</span>
      {sub && <span className="text-[10px] text-gray-400">{sub}</span>}
    </button>
  )
}
