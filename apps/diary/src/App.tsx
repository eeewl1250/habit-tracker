// apps/diary/src/App.tsx
import { useEffect, useCallback } from 'react'
import { format, subDays, addDays } from 'date-fns'
import { DiaryView } from './components/DiaryView'
import { useDiary } from './hooks/useDiary'

function App() {
  const diary = useDiary()

  const loadDiary = useCallback(() => {
    diary.load(
      format(subDays(new Date(), 90), 'yyyy-MM-dd'),
      format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    )
  }, [diary.load])

  useEffect(() => {
    loadDiary()
  }, [loadDiary])

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50">
      <DiaryView
        entries={diary.entries}
        onSave={diary.save}
        onUpdate={diary.update}
      />
    </div>
  )
}

export default App
