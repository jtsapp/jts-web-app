import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import EmptyState from '../../ielts/ui/EmptyState.jsx'
import PillButton from '../../ielts/ui/PillButton.jsx'
import { EventIcon, HelpIcon, SyncIcon } from '../../ielts/icons.jsx'
import RoadmapView from '../plan/RoadmapView.jsx'
import WeekView from '../plan/WeekView.jsx'
import MonthView from '../plan/MonthView.jsx'
import { SatModal } from '../question/ToolDialogs.jsx'
import { currentPhase, iso, nextLesson, roadmapSteps } from '../model/plan.js'

const VIEWS = ['roadmap', 'week', 'month']

function readView() {
  try {
    const v = new URLSearchParams(window.location.search).get('satPlanView')
    return VIEWS.includes(v) ? v : 'roadmap'
  } catch {
    return 'roadmap'
  }
}

function writeView(v) {
  try {
    const url = new URL(window.location.href)
    if (v && v !== 'roadmap') url.searchParams.set('satPlanView', v)
    else url.searchParams.delete('satPlanView')
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории — не пишем */
  }
}

/** «Как это работает» — три шага прототипа (roadmap.how*): измерить, практиковать, смоделировать. */
export function HowItWorks({ onClose }) {
  const { t } = useI18n()
  return (
    // Нет в Figma: содержимое окна «Как это работает» — адаптация прототипа roadmap.js (roadmap.how*)
    <SatModal title={t('sat.how.title')} onClose={onClose}>
      <p className="st-muted">{t('sat.how.lead')}</p>
      <ol className="st-how">
        {['measure', 'practice', 'simulate'].map((k) => (
          <li key={k}><b>{t(`sat.how.${k}`)}</b><span>{t(`sat.how.${k}Desc`)}</span></li>
        ))}
      </ol>
    </SatModal>
  )
}

/**
 * Вкладка «План» (Figma SAT 12–14): Роудмап · Неделя · Месяц (решение F: роудмап — первым видом, как в макете).
 * План строит сервер; «Пересобрать план» ведёт на «время на занятия» (Figma 10) — там же меняют дни и минуты,
 * а прожитые недели при пересборке сохраняются.
 */
export default function PlanTab({ plan, diagnostic, busy, onLesson, onRebuild, onDiagnostic, onStart }) {
  const { t } = useI18n()
  const [view, setView] = useState('roadmap')
  const [how, setHow] = useState(false)
  useEffect(() => setView(readView()), [])
  const go = (v) => {
    setView(v)
    writeView(v)
  }

  if (!plan?.exists) {
    const finished = diagnostic?.status === 'finished'
    return (
      <EmptyState
        icon={<EventIcon size={28} />}
        title={t(finished ? 'sat.plan.noPlanTime' : 'sat.plan.noPlan')}
        text={t(finished ? 'sat.plan.noPlanTimeText' : 'sat.plan.noPlanText')}
        action={<PillButton variant="primary" onClick={() => onDiagnostic(finished ? 'time' : null)}>{t(finished ? 'sat.plan.toTime' : 'sat.plan.toDiag')}</PillButton>}
      />
    )
  }

  const p = plan.plan
  const todayIso = iso(new Date())
  const next = nextLesson(p, todayIso)
  const steps = roadmapSteps(p, diagnostic?.finishedAt ? diagnostic.finishedAt.slice(0, 10) : null)

  return (
    <div className="st-plan">
      <div className="st-plan__bar">
        <div className="ih-seg" role="tablist" aria-label={t('sat.tab.plan')}>
          {VIEWS.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => go(v)}>
              {t(`sat.plan.view.${v}`)}
            </button>
          ))}
        </div>
        <span className="st-spacer" />
        {view === 'roadmap' && (
          <button type="button" className="st-tool" onClick={() => setHow(true)}><HelpIcon size={16} />{t('sat.how.title')}</button>
        )}
        <button type="button" className="st-tool" onClick={onRebuild}><SyncIcon size={16} />{t('sat.plan.rebuild')}</button>
      </div>
      {plan.stale && <p className="st-rep__stale"><span>{t('sat.rep.stale')}</span></p>}
      {p.provisional && <p className="st-plan__note">{t('sat.plan.provisional')}</p>}
      <div key={view} className="ih-enter">
        {view === 'roadmap' && <RoadmapView steps={steps} current={currentPhase(p, todayIso)} examDate={p.examDate} onStart={next ? () => onStart(next.id) : null} />}
        {view === 'week' && <WeekView plan={p} next={next} todayIso={todayIso} busy={busy} onLesson={onLesson} onStart={onStart} />}
        {view === 'month' && <MonthView plan={p} next={next} todayIso={todayIso} busy={busy} onLesson={onLesson} onStart={onStart} />}
      </div>
      {how && <HowItWorks onClose={() => setHow(false)} />}
    </div>
  )
}
