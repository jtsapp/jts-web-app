import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon } from '../../ielts/icons.jsx'
import { PlayCircleIcon } from '../icons.jsx'
import { iso, parse } from '../model/plan.js'
import { phaseKeyOf, phaseLessons } from '../model/roadmap.js'
import { skillName, skillSection } from '../names.js'
import { fmtDate } from '../model/dates.js'
import WeeklyCard from '../weekly/WeeklyCard.jsx'
import TimingBanner from '../plan/TimingBanner.jsx'
import TodayTasksCard from '../today/TodayTasksCard.jsx'

/**
 * «Сегодня» (Figma SAT 11; ТЗ 21.10, задачи 1, 4, 11): незавершённая сессия, баннер сроков, «Задания на сегодня» —
 * три задания самостоятельной работы, — где вы на дороге плана; справа — недельный тест, до экзамена, ошибки, которым
 * пора вернуться. Фазы и даты — с сервера (роудмап и расписание группы), старый план «по своим дням» сюда не ходит.
 */
export default function TodayTab({ today, roadmap, schedule, onResume, onReview, onWeekly, onPlan, onManager, onWords, onPracticeSkills, onMocks, onErrors }) {
  const { t, lang } = useI18n()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (d, o) => fmtDate(loc, d, o)
  const todayIso = iso(new Date())
  const open = today.openSession
  // фазы, неделя и шаг — с сервера (ТЗ 21.10, задача 1): тот же источник, что у вкладки «План»
  const r = roadmap.roadmap
  const cur = r.active
  const curPhase = r.phases.find((x) => x.n === cur)
  const curKey = phaseKeyOf(r, cur)
  const counted = r.phases.filter((x) => x.counted)
  const curLessons = phaseLessons(curPhase, schedule)
  const stars = curLessons && curLessons.total ? Math.min(3, Math.ceil((curLessons.done / curLessons.total) * 3)) : 0

  // «Задания на сегодня» вместо «Следующего занятия» (ТЗ 21.10, задача 11): три задания самостоятельной работы
  const lessonBlock = (
    <TodayTasksCard
      schedule={schedule}
      roadmap={r}
      todayIso={todayIso}
      onWords={onWords}
      onPractice={onPracticeSkills}
      onMocks={onMocks}
      onErrors={onErrors}
    />
  )

  const due = today.dueErrors || { count: 0, items: [] }
  const exam = today.exam

  return (
    <div className="st-today">
      {open && (
        <div className="st-resume">
          <span className="st-resume__icon"><PlayCircleIcon size={22} /></span>
          <div>
            <b>{t('sat.today.openTitle', { skills: open.skillIds.map((s) => skillName(s, lang)).slice(0, 2).join(' · ') })}</b>
            <span>{t('sat.today.openSub', { n: String(open.answered), total: String(open.total) })}</span>
          </div>
          <span className="st-spacer" />
          <button type="button" className="st-resume__btn" onClick={() => onResume(open.id)}>{t('sat.today.resume')}</button>
        </div>
      )}
      {/* постоянно, пока ситуация не решена (ТЗ 21.10, задача 4); решилась — сервер вернёт ok, и баннера нет */}
      <TimingBanner timing={roadmap.timing} onManager={onManager} />
      <div className="st-today__grid">
        <div className="st-today__main">
          {lessonBlock}
          <article className="st-card st-where">
            <div className="st-where__head">
              <div>
                <h2>{t('sat.today.where')}</h2>
                <span className="st-muted">
                  {r.currentWeek > 0
                    ? t('sat.today.whereSub2', { w: String(r.currentWeek), total: String(r.totalWeeks), s: String(r.activeIndex), n: String(r.countedTotal) })
                    : t('sat.today.beforeStart', { s: String(r.activeIndex), n: String(r.countedTotal) })}
                </span>
              </div>
              <span className="st-spacer" />
              <button type="button" className="ih-btn ih-btn--outline" onClick={onPlan}>{t('sat.today.openRoad')}<ArrowForwardIcon size={16} /></button>
            </div>
            <div className="st-where__bar">
              {counted.map((ph) => (
                <span key={ph.n} className={ph.status === 'done' ? 'is-done' : ph.n === cur ? 'is-here' : ''}>
                  <i />
                  <small>{t(`sat.phase.${ph.key}`)}</small>
                  {ph.n === cur && curLessons && <em aria-label={t('sat.today.stars', { n: String(stars) })}>{[0, 1, 2].map((j) => <b key={j} className={j < stars ? 'is-on' : ''}>★</b>)}</em>}
                </span>
              ))}
            </div>
            <p>{t(`sat.phaseText.${curKey}.do`)}</p>
          </article>
        </div>
        <aside className="st-today__side">
          <WeeklyCard onOpen={onWeekly} />
          {exam && (
            <div className="st-exam">
              <span className="st-rep__eyebrow">{t('sat.today.toExam')}</span>
              <div className="st-exam__nums">
                <span><b>{exam.days}</b>{plural(t, lang, 'sat.today.daysWord', exam.days).replace(/^\d+\s*/, '')}</span>
                <span><b>{exam.weeks}</b>{plural(t, lang, 'sat.time.weeksWord', exam.weeks).replace(/^\d+\s*/, '')}</span>
              </div>
              <b className="st-exam__date">{fmt(parse(exam.date), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s*г\.?$/, '').replace(/^./, (c) => c.toUpperCase())}</b>
            </div>
          )}
          {due.count > 0 && (
            <div className="st-card st-due">
              <div className="st-due__head"><h3>{t('sat.today.dueTitle')}</h3><span className="st-due__n">{due.count}</span></div>
              <ul>
                {due.items.map((e) => (
                  <li key={e.id}>
                    <i className={`st-dot is-${skillSection(e.skillId)}`} />
                    <b>{skillName(e.skillId, lang)}</b>
                    <span>{e.errorType ? t(`sat.etype.${e.errorType}`).toLowerCase() : ''}</span>
                  </li>
                ))}
              </ul>
              <p className="st-muted">{t('sat.today.dueNote')}</p>
              <button type="button" className="st-hint__more" onClick={onReview}>{t('sat.today.reviewNow')}</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
