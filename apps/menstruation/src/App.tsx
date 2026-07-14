import { MenstruationView } from './components/MenstruationView'

function App() {
  return (
    <div className="min-h-screen bg-white">
      <header className="px-4 py-3 bg-pink-50 border-b border-pink-200">
        <h1 className="text-lg font-bold text-pink-800">月経記録</h1>
      </header>
      <main>
        <MenstruationView />
      </main>
    </div>
  )
}

export default App
