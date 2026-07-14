// apps/craving/src/App.tsx
import { CravingView } from './components/CravingView'

function App() {
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-900">
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">欲望コントロール</h1>
      </header>
      <main className="flex-1 overflow-y-auto">
        <CravingView />
      </main>
    </div>
  )
}

export default App
