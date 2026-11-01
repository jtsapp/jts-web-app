import TaskVisual from '../TaskVisual.jsx'

/**
 * График раунда тренировки: над вариантами — TaskVisual в режиме drill (компактно, токены --jts-* внутри обёртки
 * TaskVisual), у pick — режим pick: точки x кликаются (picked — Set индексов, marks после проверки ok | bad | miss).
 */
export default function DrillVisual({ chart, pick = null }) {
  if (!chart) return null
  if (!pick) return <div className="ih-wdrill__visual"><TaskVisual chart={chart} mode="drill" /></div>
  return (
    <div className="ih-wdrill__visual">
      <TaskVisual chart={chart} mode="pick" picked={pick.picked} onPick={pick.onPick} marks={pick.marks} />
    </div>
  )
}
