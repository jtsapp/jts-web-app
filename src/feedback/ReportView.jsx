import { reportLabels, skillName, goalResultLabel, periodLabel, badgeView, formatLabel } from './labels.js'

// Вид отчёта о прогрессе — правая колонка прототипа («живое превью»,
// data/jts-progress-report.html, render()). Один на ссылку из мессенджера и
// на кабинет: родитель и ученик видят ровно то, что преподаватель видел в
// превью перед отправкой. Подписи — на языке ОТЧЁТА (см. labels.js).
export default function ReportView({ report }) {
  const L = report.lang
  const t = reportLabels(L)
  const period = periodLabel(report.periodNo, L)
  const badges = report.badges.map((b) => badgeView(b, L)).filter(Boolean)
  const att = report.attendance
  const attPct = att ? Math.round((att.done / att.planned) * 100) : null

  return (
    <article className="fbr" lang={L}>
      <header className="fbr__head">
        <div className="fbr__who">
          <div className="fbr__kicker">{t.title}{period && ` · ${period}`}</div>
          <h2 className="fbr__name">{report.studentName}</h2>
          <div className="fbr__meta">
            {formatLabel(report.format, report.groupName)}
            {report.unitsText && ` · ${t.covered}: ${report.unitsText}`}
          </div>
        </div>
        {report.level && <span className="fbr__level">{report.level}</span>}
      </header>

      {(report.motivation || badges.length > 0) && (
        <section className="fbr__mot">
          {report.motivation && <p className="fbr__mot-text">{report.motivation}</p>}
          {badges.length > 0 && (
            <ul className="fbr__badges">
              {badges.map((b) => (
                <li key={b.text}><span aria-hidden="true">{b.icon}</span>{b.text}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(att || report.homeworkPct != null) && (
        <div className="fbr__stats">
          {att && (
            <div className="fbr__stat">
              <strong>{att.done}/{att.planned}</strong>
              <small>{t.attendance} · {attPct}%</small>
            </div>
          )}
          {report.homeworkPct != null && (
            <div className="fbr__stat">
              <strong>{report.homeworkPct}%</strong>
              <small>{t.homework}</small>
            </div>
          )}
        </div>
      )}

      <section className="fbr__blk">
        <h3>{t.skills}</h3>
        <ul className="fbr__bars">
          {report.skills.map((s) => (
            <li key={s.key} className="fbr__bar">
              <span>{skillName(s.key, L)}</span>
              <span className="fbr__track" aria-hidden="true">
                <span style={{ width: `${(s.score ?? 0) * 20}%` }} />
              </span>
              <b>{s.score != null ? `${s.score}/5` : '—'}<Delta score={s.score} prev={s.prev} /></b>
            </li>
          ))}
        </ul>
      </section>

      <List title={t.strengths} items={report.strengths} />
      <List title={t.improvements} items={report.improvements} />

      {report.pastGoals.length > 0 && (
        <section className="fbr__blk">
          <h3>{t.pastGoals}</h3>
          <ul className="fbr__goals">
            {report.pastGoals.map((g) => (
              <li key={g.text}>
                <span className={`fbr__dot fbr__dot--${g.result || 'none'}`} aria-hidden="true" />
                {g.text}
                {g.result && <em>{goalResultLabel(g.result, L)}</em>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <List title={`🎯 ${t.nextGoals}`} items={report.nextGoals} />

      {report.plan && (
        <section className="fbr__blk">
          <h3>{t.plan}</h3>
          <p>{report.plan}</p>
        </section>
      )}

      {report.teacherName && <footer className="fbr__sign">{t.teacher}: {report.teacherName}</footer>}
    </article>
  )
}

function List({ title, items }) {
  if (!items.length) return null
  return (
    <section className="fbr__blk">
      <h3>{title}</h3>
      <ul>{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </section>
  )
}

// Стрелка — только когда есть с чем сравнить и есть разница: в первом отчёте
// прошлых оценок нет, и «↑0» читалось бы как замечание.
function Delta({ score, prev }) {
  if (score == null || prev == null || score === prev) return null
  const up = score > prev
  return <i className={`fbr__delta fbr__delta--${up ? 'up' : 'down'}`}>{up ? '↑' : '↓'}{Math.abs(score - prev)}</i>
}
