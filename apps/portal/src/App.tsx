const apps = [
  { name: 'ホーム', icon: '🏠', slug: '', port: 3000, desc: 'ダッシュボード', primary: true },
  { name: '習慣', icon: '☑', slug: 'habits', port: 3006, desc: '週間・月間の習慣確認' },
  { name: 'スケジュール', icon: '📅', slug: 'schedule', port: 3007, desc: 'スケジュール管理' },
  { name: 'TODO', icon: '📋', slug: 'todo', port: 3008, desc: 'タスク管理・集中トラッキング' },
  { name: 'カテゴリ', icon: '🏷', slug: 'category', port: 3009, desc: 'カテゴリ設定' },
  { name: '日記', icon: '📝', slug: 'diary', port: 3003, desc: '日本語日記を書く' },
  { name: '睡眠', icon: '🛌', slug: 'sleep', port: 3001, desc: '睡眠記録' },
  { name: '家計簿', icon: '💰', slug: 'finance', port: 3002, desc: '支出管理・予算' },
  { name: '欲望', icon: '🔥', slug: 'craving', port: 3004, desc: '間食欲求記録' },
  { name: '生理', icon: '🩸', slug: 'menstruation', port: 3005, desc: '生理周期記録' },
  { name: 'レビュー', icon: '📊', slug: 'review', port: 3010, desc: '月次レビュー' },
]

function App() {
  const isDev = import.meta.env.DEV
  const baseHost = window.location.hostname

  const getUrl = (app: typeof apps[0]) => {
    if (isDev) {
      return `http://${baseHost}:${app.port}`
    }
    return `/${app.slug}`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2"> Habit Tracker</h1>
          <p className="text-sm text-gray-500">習慣管理ポータル</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {apps.map((app) => (
            <a
              key={app.name}
              href={getUrl(app)}
              target={isDev ? '_blank' : undefined}
              className={`flex flex-col items-center gap-1 p-5 rounded-xl border transition-all hover:shadow-md active:scale-95 text-center ${
                app.primary
                  ? 'bg-blue-50 border-blue-200 hover:border-blue-400'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <span className="text-3xl">{app.icon}</span>
              <span className="text-sm font-semibold text-gray-700">{app.name}</span>
              <span className="text-[10px] text-gray-400 leading-tight">{app.desc}</span>
              {!isDev && <span className="text-[9px] text-gray-300 mt-1">/{app.slug}</span>}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
