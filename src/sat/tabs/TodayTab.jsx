import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon, FlagIcon, MenuBookIcon } from '../../ielts/icons.jsx'
import { BookOpenIcon, CalendarIcon, NotesIcon, PlayCircleIcon, ReplayIcon, SigmaIcon, TargetIcon, StopwatchIcon } from '../icons.jsx'
import { PHASES, currentPhase, iso, parse, roadmapSteps } from '../model/plan.js'
import { domainName, skillName, skillSection, TAXONOMY } from '../names.js'
import { fmtDate } from '../model/dates.js'
import WeeklyCard from '../weekly/WeeklyCard.jsx'

// Минуты действий занятия (Figma 11: «Изучить 5 мин · Практика 40 мин · Разбор ошибок 15 мин» при 60 минутах):
// изучение и разбор — фиксированные, практика забирает остальное поровну
const FIXED = { learn: 5, 'review-errors': 15, 'mini-test': 15 }
const ACTION_ICON = { learn: BookOpenIcon, practice: NotesIcon, 'review-errors': ReplayIcon, 'mini-test': StopwatchIcon }

export function actionMinutes(lesson) {
  const total = lesson.minutes || 60
  const fixed = lesson.actions.reduce((a, x) => a + (FIXED[x] || 0), 0)
  const practices = lesson.actions.filter((x) => x === 'practice').length || 1
  const rest = Math.max(5, Math.round((total - fixed) / practices))
  return lesson.actions.map((a) => (a === 'practice' ? rest : FIXED[a] || 10))
}

/**
 * «Сегодня» с готовым планом (Figma SAT 11): незавершённая сессия, следующее занятие (что в нём и сколько минут),
 * где вы на дороге плана; справа — недельный тест (вместо ежедневной проверки, SAT-SYNC-PLAN B1), до экзамена, ошибки,
 * которым пора вернуться, контрольная точка. Статистика — на вкладке «Прогресс» (Figma 16), словаря в SAT больше нет
 * (15.10.2026). Один следующий шаг на экране — главный.
 */
export default function TodayTab({ today, plan, diagnostic, onStart, onResume, onReview, onWeekly, onPlan }) {
  const { t, lang } = useI18n()
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (d, o) => fmtDate(loc, d, o)
  const todayIso = iso(new Date())
  const p = plan.plan
  const next = today.nextLesson
  const open = today.openSession
  const cur = currentPhase(p, todayIso)
  const steps = roadmapSteps(p, diagnostic?.finishedAt?.slice(0, 10))
  const curStep = steps.find((s) => s.phase === cur)
  const week = p.weeks.findIndex((w) => w.monday <= todayIso && todayIso <= iso(new Date(parse(w.monday).getTime() + 6 * 86400000)))
  const curKey = PHASES.find((x) => x.id === cur)?.key || 'foundations'
  const stars = curStep && curStep.total ? Math.min(3, Math.ceil((curStep.done / curStep.total) * 3)) : 0

  let lessonBlock = null
  if (next) {
    const skill = next.skillIds[0]
    const section = skillSection(skill)
    const domain = TAXONOMY.skills.find((s) => s.id === skill)?.domain
    const rank = (p.focus || []).indexOf(domain)
    const when = next.date === todayIso ? `${t('sat.week.today').replace(/^./, (c) => c.toUpperCase())} · ${fmt(parse(next.date), { day: 'numeric', month: 'short' })}` : fmt(parse(next.date), { weekday: 'short', day: 'numeric', month: 'short' })
    const mins = actionMinutes(next)
    const nextKey = PHASES.find((x) => x.id === next.phase)?.key || 'foundations'
    lessonBlock = (
      <article className="st-card st-next">
        <div className="st-next__head">
          <span className="st-muted">{t('sat.today.nextTitle')}</span>
          <span className="st-spacer" />
          <span className="st-next__chip is-violet">{t('sat.today.phaseChip', { n: String(next.phase), phase: t(`sat.phase.${nextKey}`) })}</span>
          <span className="st-next__chip"><CalendarIcon size={14} />{when}</span>
        </div>
        <div className="st-next__title">
          <span className={`st-next__icon is-${section}`}>{section === 'math' ? <SigmaIcon size={24} /> : <MenuBookIcon size={24} />}</span>
          <div>
            <h2>{next.skillIds.map((s) => skillName(s, lang)).join(' · ')}</h2>
            <span className="st-muted">
              {[domainName(domain, lang), section === 'math' ? 'Math' : 'Reading and Writing', rank >= 0 ? t('sat.today.priority', { n: String(rank + 1) }) : null].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>
        <div className="st-next__acts">
          {next.actions.map((a, i) => {
            const Icon = ACTION_ICON[a] || NotesIcon
            return (
              <div key={`${a}-${i}`} className="st-next__act">
                <span className="st-next__acthead"><Icon size={18} /><small>{i + 1}</small></span>
                {/* в карточке занятия места больше, чем в клетке недели: «Разбор ошибок», как в Figma 11 */}
                <b>{a === 'review-errors' ? t('sat.actionFull.review-errors') : t(`sat.action.${a}`)}</b>
                <span>{t(`sat.today.act.${a}`, { n: String(Math.max(3, Math.round(mins[i] / 4))) })}</span>
                <small>{t('sat.time.min', { n: String(mins[i]) })}</small>
              </div>
            )
          })}
        </div>
        <div className="st-next__foot">
          <TargetIcon size={20} />
          <p>{t('sat.today.goal', { goal: t(`sat.phaseText.${nextKey}.end`) })}</p>
          <button type="button" className="ih-cta" onClick={() => onStart(next.id)}>{t('sat.road.start')}<ArrowForwardIcon size={20} /></button>
        </div>
      </article>
    )
  } else {
    lessonBlock = (
      <article className="st-card st-next">
        <h2>{t('sat.today.noNext')}</h2>
        <p className="st-muted">{t('sat.today.noNextText')}</p>
      </article>
    )
  }

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
      <div className="st-today__grid">
        <div className="st-today__main">
          {lessonBlock}
          <article className="st-card st-where">
            <div className="st-where__head">
              <div>
                <h2>{t('sat.today.where')}</h2>
                <span className="st-muted">{t('sat.today.whereSub', { w: String(Math.max(1, week + 1)), total: String(p.weeks.length), s: String(PHASES.findIndex((x) => x.id === cur) + 1) })}</span>
              </div>
              <span className="st-spacer" />
              <button type="button" className="ih-btn ih-btn--outline" onClick={onPlan}>{t('sat.today.openRoad')}<ArrowForwardIcon size={16} /></button>
            </div>
            <div className="st-where__bar">
              {PHASES.map((ph) => (
                <span key={ph.id} className={ph.id < cur ? 'is-done' : ph.id === cur ? 'is-here' : ''}>
                  <i />
                  <small>{t(`sat.phase.${ph.key}`)}</small>
                  {ph.id === cur && <em aria-label={t('sat.today.stars', { n: String(stars) })}>{[0, 1, 2].map((j) => <b key={j} className={j < stars ? 'is-on' : ''}>★</b>)}</em>}
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
          {today.checkpoint && (
            <div className="st-card st-side-card is-static">
              <span className="st-side-card__icon is-violet"><FlagIcon size={20} /></span>
              <span>
                <b>{t('sat.today.mini', { date: fmt(parse(today.checkpoint.date), { day: 'numeric', month: 'long' }) })}</b>
                <small>{plural(t, lang, 'sat.today.checkpointIn', today.checkpoint.days)}</small>
              </span>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
