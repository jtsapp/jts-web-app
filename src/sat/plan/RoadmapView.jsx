import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { ArrowForwardIcon, EventIcon } from '../../ielts/icons.jsx'
import { NotesIcon, TargetIcon, TickIcon } from '../icons.jsx'
import { parse } from '../model/plan.js'
import { phaseLessons } from '../model/roadmap.js'
import { checkpointWeek, rhythm } from '../model/phaseStrip.js'
import { fmtDate } from '../model/dates.js'
import PhaseStrip from './PhaseStrip.jsx'
import BluebookPanel from './BluebookPanel.jsx'
import SelfPrepPanel from './SelfPrepPanel.jsx'

/**
 * Роудмап SAT (Figma «NEW 2», 17:1367; фазы — ТЗ 21.10.2026): карточка «Ритм программы» с полосой фаз, под ней —
 * карточка выбранной фазы (клик по точке полосы). Фазы приходят с сервера (/mobile/sat/roadmap) — тот же источник, что
 * у «Сегодня» и счётчиков. Карточка теста — состояние Bluebook-теста и кнопки на экраны формы и сравнения
 * (onBluebook(test, phase), onCompare(test)); фазы 7 — список дел; фазы с занятиями — пройдено по отметкам.
 * initialPhase — фаза, открытая по ссылке (отчёт диагностики → «Дальше: Test 6»), onToday — кнопка текущей фазы
 * «К заданиям на сегодня» (без неё, как в окне отчёта, кнопки нет).
 */
export default function RoadmapView({ data, bluebook, schedule, onToday, onBluebook, onCompare, selfPrepActions, initialPhase = null }) {
  const { t, lang } = useI18n()
  const r = data?.roadmap
  const [open, setOpen] = useState(initialPhase ?? r?.active)
  useEffect(() => setOpen(initialPhase ?? r?.active), [r?.active, initialPhase])
  if (!r) return null

  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (d, o) => fmtDate(loc, d, o)
  // у дня экзамена своей карточки нет — выбранной может быть любая фаза, кроме него
  const step = r.phases.find((p) => p.n === open && p.kind !== 'exam') || null
  const lessons = step ? phaseLessons(step, schedule) : null
  const current = step && step.n === r.active

  const when = (p) => {
    if (p.n === 1) return t('sat.road.beforeLesson1')
    if (p.weekFrom == null) return t('sat.road.afterWeek', { n: String(checkpointWeek(r, p.n)) })
    return p.weekFrom === p.weekTo ? t('sat.road.week', { n: String(p.weekFrom) }) : t('sat.road.weeks', { a: String(p.weekFrom), b: String(p.weekTo) })
  }
  // «Учёба → проверка → … → экзамен»: из видов фаз, поэтому строка сама меняется с Challenge и без фазы 7
  const sub = rhythm(r).map((k) => t(`sat.road.rhythm.${k}`)).join(' → ')

  return (
    <div className="st-road">
      {!data.inGroup && <p className="st-plan__note">{t('sat.road.noGroup')}</p>}
      <section className="st-card st-road__rhythm">
        <div>
          <h2>{t('sat.road.rhythmTitle')}</h2>
          <p>{sub.charAt(0).toUpperCase() + sub.slice(1)}</p>
        </div>
        <div className="st-road__strip">
          <PhaseStrip roadmap={data} schedule={schedule} size="L" selected={open} onSelect={setOpen} />
        </div>
      </section>

      {step && (
        <article key={open} className="st-card st-road__card ih-enter">
          <div className="st-road__cardhead">
            <div>
              <span className="st-road__eyebrow">{t('sat.road.phaseN', { n: String(step.n) })}</span>
              <h2>{t(`sat.phase.${step.key}`)}</h2>
            </div>
            <span className="st-spacer" />
            <span className="st-road__chip">{when(step)}</span>
            {step.start && step.n !== 1 && (
              <span className="st-road__chip">
                <EventIcon size={18} />
                {fmt(parse(step.start), { day: 'numeric', month: 'short' })}
                {step.end && step.end !== step.start && <> → {fmt(parse(step.end), { day: 'numeric', month: 'short' })}</>}
              </span>
            )}
            {step.status === 'incomplete' && <span className="st-road__chip is-warn">{t('sat.road.incomplete')}</span>}
          </div>
          <p className="st-road__lead">{t(`sat.phaseText.${step.key}.lead`)}</p>
          <div className="st-road__boxes">
            <div>
              <b><NotesIcon size={18} />{t('sat.road.doing')}</b>
              <p>{t(`sat.phaseText.${step.key}.do`)}</p>
            </div>
            <div>
              <b><TargetIcon size={18} />{t('sat.road.end')}</b>
              <p>{t(`sat.phaseText.${step.key}.end`)}</p>
            </div>
          </div>
          {(lessons || (current && onToday)) && (
            <div className="st-road__progress">
              {lessons && (
                <div>
                  <b>{t('sat.road.lessonsDone', { d: String(lessons.done), n: String(lessons.total) })}</b>
                  <span className="st-road__bar"><i style={{ width: `${lessons.total ? Math.max(3, (lessons.done * 100) / lessons.total) : 0}%` }} /></span>
                </div>
              )}
              {!lessons && <span className="st-spacer" />}
              {current && onToday && (
                <button type="button" className="ih-cta st-road__start" onClick={onToday}>
                  {t('sat.road.toToday')}<ArrowForwardIcon size={20} />
                </button>
              )}
            </div>
          )}
          {/* Нет в Figma: строка о сданной диагностике — карточка фазы 1 без неё пуста, баллов Test 6 там может не быть */}
          {step.n === 1 && step.status === 'done' && <p className="st-road__done"><TickIcon size={18} />{t('sat.road.diagDone')}</p>}
          {step.bluebookTest && bluebook && (
            <BluebookPanel test={step.bluebookTest} tests={bluebook.tests}
              onEnter={onBluebook ? (n) => onBluebook(n, step.n) : null} onCompare={onCompare} />
          )}
          {step.kind === 'self' && <SelfPrepPanel prep={data.selfPrep} {...(selfPrepActions || {})} />}
        </article>
      )}
    </div>
  )
}
