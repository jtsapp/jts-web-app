import WritingChart from './WritingChart.jsx'

// Задание как в буклете экзамена (прототип taskBody): «You should spend…», формулировка в рамке, пункты письма,
// «Write at least…», первая строка письма и график. Английский текст экзамена не переводится (§23).
export default function WritingTaskBody({ task, showChart = true }) {
  if (!task) return null
  return (
    <div className="ih-wtask" lang="en">
      {task.lead && <p className="ih-wtask__lead">{task.lead}</p>}
      <div className="ih-wtask__box">
        {String(task.question || '')
          .split(/\n\n+/)
          .map((p, i) => <p key={i}>{p}</p>)}
        {task.bullets?.length > 0 && (
          <ul>
            {task.bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        )}
      </div>
      {(task.after || []).map((x) => <p key={x} className="ih-wtask__after">{x}</p>)}
      {task.opening && <p className="ih-wtask__opening">{task.opening}</p>}
      {showChart && task.chart && <WritingChart chart={task.chart} />}
    </div>
  )
}
