import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { HelpIcon } from '../../ielts/icons.jsx'
import RoadmapView from '../plan/RoadmapView.jsx'
import WeekView from '../plan/WeekView.jsx'
import MonthView from '../plan/MonthView.jsx'
import { SatModal } from '../question/ToolDialogs.jsx'
import { iso } from '../model/plan.js'
import { nextGroupLesson, scheduleAsPlan } from '../model/roadmap.js'

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
 * Вкладка «План» (Figma SAT 12–14, фазы — ТЗ 21.10.2026): Роудмап · Неделя · Месяц. Фазы и счётчики — с сервера
 * (тот же источник, что у «Сегодня»), даты занятий — из расписания группы: студент дни не выбирает, их ставит школа.
 * Клик по занятию ведёт сразу в практику по его теме — меню занятия убрано (задача 3.4).
 */
export default function PlanTab({ roadmap, bluebook, schedule, onLesson, onReload, selfPrepActions }) {
  const { t } = useI18n()
  const [view, setView] = useState('roadmap')
  const [how, setHow] = useState(false)
  useEffect(() => setView(readView()), [])
  const go = (v) => {
    setView(v)
    writeView(v)
  }
  if (!roadmap) return null

  const r = roadmap.roadmap
  const plan = scheduleAsPlan(schedule, r, roadmap.examDate)
  const next = nextGroupLesson(plan)
  const todayIso = iso(new Date())
  const byId = new Map((schedule?.lessons || []).map((l) => [String(l.id), l]))
  const open = (id) => {
    const l = byId.get(String(id))
    if (l) onLesson(l)
  }

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
        <span className="st-plan__count">{t('sat.plan.lessonsCount', { d: String(r.attended), n: String(r.lessonCount) })}</span>
        {view === 'roadmap' && (
          <button type="button" className="st-tool" onClick={() => setHow(true)}><HelpIcon size={16} />{t('sat.how.title')}</button>
        )}
      </div>
      {r.provisional && <p className="st-plan__note">{t('sat.plan.provisional')}</p>}
      <div key={view} className="ih-enter">
        {view === 'roadmap' && (
          <RoadmapView data={roadmap} bluebook={bluebook} schedule={schedule} onStartLesson={onLesson} onReload={onReload}
            selfPrepActions={selfPrepActions} />
        )}
        {view !== 'roadmap' && !plan.weeks.length && <p className="st-plan__note">{t('sat.road.noGroup')}</p>}
        {view === 'week' && plan.weeks.length > 0 && <WeekView plan={plan} roadmap={r} next={next} todayIso={todayIso} onStart={open} />}
        {view === 'month' && plan.weeks.length > 0 && <MonthView plan={plan} roadmap={r} next={next} todayIso={todayIso} onStart={open} />}
      </div>
      {how && <HowItWorks onClose={() => setHow(false)} />}
    </div>
  )
}
