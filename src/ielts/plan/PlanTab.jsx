import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../ui/EmptyState.jsx'
import PillButton from '../ui/PillButton.jsx'
import PageHeader from '../ui/PageHeader.jsx'
import { TimerIcon } from '../icons.jsx'
import { MonthView, RoadmapView, WeekView } from './PlanViews.jsx'
import { getIeltsPlan, markIeltsPlanTask, moveIeltsPlanTask } from '../../api.js'
import { useI18n } from '../../i18n.jsx'

// Вкладка «План» по дизайну «IELTS new» (Figma, раздел 2): три вида — роадмап, неделя, месяц — над одними задачами
// бэкенда (один id: перенос или выполнение видны сразу во всех). Вид и выбранная неделя/месяц живут в адресе
// (?ieltsPlanView=, &ieltsPlanAt=), чтобы F5 и «Назад» возвращали туда же (ФТЗ v4 §Маршруты).
const VIEWS = ['roadmap', 'week', 'month']

function readUrl() {
  try {
    const q = new URLSearchParams(window.location.search)
    const v = q.get('ieltsPlanView')
    return { view: VIEWS.includes(v) ? v : 'roadmap', at: q.get('ieltsPlanAt') || null }
  } catch {
    return { view: 'roadmap', at: null }
  }
}

function writeUrl(view, at) {
  try {
    const url = new URL(window.location.href)
    if (view && view !== 'roadmap') url.searchParams.set('ieltsPlanView', view)
    else url.searchParams.delete('ieltsPlanView')
    if (at) url.searchParams.set('ieltsPlanAt', at)
    else url.searchParams.delete('ieltsPlanAt')
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории — просто не запоминаем */
  }
}

export default function PlanTab({ token, onStartTask, onOpenDiagnostic }) {
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [view, setView] = useState('roadmap')
  const [at, setAt] = useState(null)

  useEffect(() => {
    const u = readUrl()
    setView(u.view)
    setAt(u.at)
  }, [])

  const load = useCallback(() => {
    getIeltsPlan(token).then(setData).catch((e) => setError(e))
  }, [token])
  useEffect(() => { load() }, [load])

  const pick = (v, a = null) => {
    setView(v)
    setAt(a)
    writeUrl(v, a)
  }
  const move = (task, date) => moveIeltsPlanTask(token, task.id, date).then(load).catch((e) => setError(e))
  const mark = (task, done) => markIeltsPlanTask(token, task.id, done).then(load).catch((e) => setError(e))

  if (error && !data) return <EmptyState icon={<TimerIcon size={28} />} title={t('ieltsPlan.errorTitle')} text={t('ieltsPlan.errorText')} />
  if (!data) return <p className="ih-muted">{t('ieltsReading.loading')}</p>

  const e = data.enrollment
  if (e.status === 'programme_pending') {
    return (
      <EmptyState
        icon={<TimerIcon size={28} />}
        title={t('ieltsPlan.pendingTitle')}
        text={t(`ieltsPlan.pending.${e.pendingReason || 'no_diagnostic'}`)}
        action={e.pendingReason === 'no_diagnostic' ? <PillButton variant="primary" onClick={onOpenDiagnostic}>{t('ieltsPlan.toDiagnostic')}</PillButton> : null}
      />
    )
  }

  const mode = t(e.studyMode === 'live' ? 'ieltsToday.mode.live' : 'ieltsToday.mode.self')
  const title = t(`ieltsPlanV.title.${view}`)
  const sub = view === 'roadmap'
    ? `${e.programmeName} · ${t('ieltsPlan.week', { n: String(data.currentWeek || 1) })} · ${mode}`
    : `${e.programmeName} · ${mode}`
  const seg = (
    <div className="ih-seg2" role="tablist" aria-label={t('ieltsPlan.viewLabel')}>
      {VIEWS.map((v) => (
        <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => pick(v)}>
          {t(`ieltsPlan.view.${v}`)}
        </button>
      ))}
    </div>
  )

  const weekN = Math.min(Math.max(1, Number(at) || data.currentWeek || 1), e.calendarWeeks || 1)
  const month = at && /^\d{4}-\d{2}-\d{2}$/.test(at) ? at : data.today

  return (
    <div className="ih-planv">
      <PageHeader title={title} sub={sub} right={seg} />
      {view === 'roadmap' && data.completion && (
        <div className="ih-progline" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.completion.percent} aria-label={t('ieltsPlanV.progress', { p: String(data.completion.percent) })}>
          <span className="ih-progline__bar"><i style={{ width: `${data.completion.percent}%` }} /></span>
          <b>{t('ieltsPlanV.progress', { p: String(data.completion.percent) })}</b>
        </div>
      )}
      {view === 'roadmap' && <RoadmapView key={data.currentWeek} data={data} onStart={onStartTask} onMark={mark} />}
      {view === 'week' && <WeekView key={weekN} data={data} n={weekN} onWeek={(n) => pick('week', n ? String(n) : null)} onStart={onStartTask} onMove={move} />}
      {view === 'month' && <MonthView key={month.slice(0, 7)} data={data} month={month} onMonth={(m) => pick('month', m)} onStart={onStartTask} onMark={mark} />}
    </div>
  )
}
