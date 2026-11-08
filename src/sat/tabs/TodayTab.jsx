import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon } from '../../ielts/icons.jsx'
import { PauseCircleIcon } from '../icons.jsx'
import { iso, parse } from '../model/plan.js'
import { phaseKeyOf } from '../model/roadmap.js'
import { skillName, skillSection } from '../names.js'
import { fmtDate } from '../model/dates.js'
import TimingBanner from '../plan/TimingBanner.jsx'
import PhaseStrip from '../plan/PhaseStrip.jsx'
import TodayTasksCard from '../today/TodayTasksCard.jsx'
import TeacherLessonCard from '../today/TeacherLessonCard.jsx'
import SelfPrepCard from '../today/SelfPrepCard.jsx'
import { currentLesson } from '../today/todayTasks.js'

// режим незавершённой сессии → его имя в «Практике»; повтора ошибок там нет — своё имя
const MODE_KEY = { skills: 'sat.prac.mode.skills', weak: 'sat.prac.mode.weak', custom: 'sat.prac.mode.custom', module: 'sat.prac.mode.module', all: 'sat.prac.mode.all', review: 'sat.today.mode.review' }

/**
 * «Сегодня» (Figma «NEW 2», 17:6244; ТЗ 21.10, задачи 1, 4, 11): баннер сроков, незавершённая сессия; слева — занятие
 * с преподавателем и «Задания на сегодня», справа — до экзамена и ошибки, которым пора вернуться; внизу во всю ширину —
 * «Где вы сейчас» с полосой фаз. В фазе 7 занятия и задания заменяет список дел самоподготовки (17:6902). Фазы и
 * даты — с сервера (роудмап и расписание группы), старый план «по своим дням» сюда не ходит. Недельного теста в
 * макете нет, но это задача ТЗ 17.10 — его карточка стоит в правой колонке под ошибками.
 */
export default function TodayTab({
  today, roadmap, schedule, bluebook, onResume, onReview, onPlan, onManager, onWords, onPracticeSkills,
  onPracticeMode, onMocks, onErrors, onCurator,
}) {
  const { t, lang } = useI18n()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (d, o) => fmtDate(loc, d, o)
  const todayIso = iso(new Date())
  const open = today.openSession
  // фазы, неделя и шаг — с сервера (ТЗ 21.10, задача 1): тот же источник, что у вкладки «План»
  const r = roadmap.roadmap
  const curPhase = r.phases.find((x) => x.n === r.active)
  const curKey = phaseKeyOf(r, r.active)
  const selfPrep = curPhase?.kind === 'self'
  const lesson = currentLesson(schedule, todayIso)

  const due = today.dueErrors || { count: 0, items: [] }
  const exam = today.exam

  // «Незавершённая сессия · Слабые · Math»; у старых сессий режима нет — тогда, как раньше, по навыкам
  const openTitle = open && (open.mode && MODE_KEY[open.mode]
    ? [t(MODE_KEY[open.mode]), open.section === 'math' ? 'Math' : open.section === 'rw' ? 'Reading and Writing' : null].filter(Boolean).join(' · ')
    : (open.skillIds || []).map((s) => skillName(s, lang)).slice(0, 2).join(' · '))

  let whereSub
  if (selfPrep) {
    whereSub = exam
      ? t('sat.today.whereSelf', { left: plural(t, lang, 'sat.time.weeksWord', exam.weeks) })
      : t('sat.today.whereSelfNoExam')
  } else if (r.currentWeek > 0) {
    whereSub = t('sat.today.whereSub3', { w: String(r.currentWeek), total: String(r.totalWeeks), phase: t(`sat.phase.${curKey}`) })
  } else {
    whereSub = t('sat.today.beforeStart', { s: String(r.activeIndex), n: String(r.countedTotal) })
  }

  return (
    <div className="st-today">
      {/* постоянно, пока ситуация не решена (ТЗ 21.10, задача 4); решилась — сервер вернёт ok, и баннера нет */}
      <TimingBanner timing={roadmap.timing} onManager={onManager} onPlan={onPlan} />
      {open && (
        <div className="st-resume">
          <span className="st-resume__icon"><PauseCircleIcon size={22} /></span>
          <div>
            <b>{t('sat.today.openTitle', { skills: openTitle })}</b>
            <span>{t('sat.today.openSub', { n: String(open.answered), total: String(open.total) })}</span>
          </div>
          <span className="st-spacer" />
          <button type="button" className="st-resume__btn" onClick={() => onResume(open.id)}>{t('sat.today.resume')}</button>
        </div>
      )}
      <div className="st-today__grid">
        <div className="st-today__main">
          {selfPrep ? (
            <SelfPrepCard
              prep={roadmap.selfPrep}
              exam={exam}
              onErrors={onErrors}
              onWeak={() => onPracticeMode?.('weak')}
              onBank={() => onPracticeMode?.('all')}
              onBluebook={onPlan}
              onCurator={onCurator}
            />
          ) : (
            <>
              <TeacherLessonCard lesson={lesson} lessonCount={schedule?.lessonCount} todayIso={todayIso} />
              <TodayTasksCard
                schedule={schedule}
                roadmap={r}
                bluebook={bluebook}
                todayIso={todayIso}
                onWords={onWords}
                onPractice={onPracticeSkills}
                onMocks={onMocks}
                onErrors={onErrors}
              />
            </>
          )}
        </div>
        <aside className="st-today__side">
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
          {/* «Недельный тест» на «Сегодня» не показываем (решение 08.11.2026): вернём, когда методист распишет тесты
              по фазам. Сам механизм (WeeklyCard, ?screen=sat-weekly, бэкенд) остаётся. */}
        </aside>
      </div>
      <article className="st-card st-where">
        <div className="st-where__head">
          <div>
            <h2>{t('sat.today.where')}</h2>
            <span className="st-muted">{whereSub}</span>
          </div>
          <span className="st-spacer" />
          <button type="button" className="st-where__open" onClick={onPlan}>{t('sat.today.openPlan')}<ArrowForwardIcon size={16} /></button>
        </div>
        <div className="st-road__strip">
          <PhaseStrip roadmap={roadmap} schedule={schedule} size="S" />
        </div>
      </article>
    </div>
  )
}
