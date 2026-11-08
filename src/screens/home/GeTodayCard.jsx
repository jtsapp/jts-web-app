import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { areRewardsEnabled } from '../../config.js'
import { ArrowForwardIcon } from '../../ielts/icons.jsx'
import GeTaskRow from '../../ge/plan/GeTaskRow.jsx'
import GeTodaySkills from '../../ge/plan/GeTodaySkills.jsx'
import { courseLessons, courseSteps, courseTitles, todayView } from '../../ge/plan/planModel.js'
import { LOW_TIME_CHOICES, canReplan, replanToday } from '../../ge/plan/replan.js'
import { targetPath } from '../../ge/plan/taskTargets.js'
import { defaultTodayView, skillOf, todayMinutes, whyLine } from '../../ge/plan/todaySkills.js'
import { useGeTaskStart } from '../../ge/plan/useGeTaskStart.js'
import { useTodayExtras } from '../../ge/plan/useTodayExtras.js'
import { taskTokenPoints, useStudentTokens } from '../../practice/practiceTokens.js'

/**
 * «Сегодня» на «Главной» общего курса (спека 2026-10-13, секция 4; ТЗ v2.0, разделы 5.2–5.3): задачи дня из плана
 * бэкенда. Только свои задачи плана (todayView): занятия, домашка и задачи преподавателя — в «Весь план», в расписании и
 * домашке рядом (ТЗ v2.0 9.1). Сверху — просроченное этой недели; открытого нет — «на сегодня всё» и две ближайшие.
 *
 * Шапка — «N из M мин» и полоса: сделанные минуты своих задач дня из общих (todayMinutes). Вид — «По порядку» (строки с
 * типом, минутами и уровнем, у текущего шага — «Зачем: …») или «По навыкам» (плитки, GeTodaySkills); больше пяти задач —
 * блок сам открывается «По навыкам». «Начать» ведёт к конкретному материалу (taskTargets: урок курса, урок воркбука,
 * текст «Чтения», урок шэдоуинга), куда — строкой «Откроется: …». Внизу — «Весь план →» и «У меня мало времени»
 * (10/20/30 минут — бэкенд пересобирает день, ушедшее — строками «Перенесено»). token и onReload — для «Начать» и сбоя
 * отметки. Плашка «запишитесь на занятия» — группе и индивидуальным без занятий в расписании.
 */
export default function GeTodayCard({ plan, frontier, level, token, onReload, onNav }) {
  const { t } = useI18n()
  const titles = useMemo(() => courseTitles(plan.tasks, frontier), [plan.tasks, frontier])
  const lessons = useMemo(() => courseLessons(plan.tasks, frontier), [plan.tasks, frontier])
  const steps = useMemo(() => courseSteps(plan.tasks, frontier), [plan.tasks, frontier])
  const { tasks, ahead, deferred } = useMemo(() => todayView(plan), [plan])
  const shown = useMemo(() => [...tasks, ...ahead, ...deferred], [tasks, ahead, deferred])
  // фокус плана («Стоит подтянуть», ТЗ 5.5 и 9.1): разделу слабого навыка бэкенд дал больше практики
  const focus = plan.focus || null
  const { weakest, target, targets } = useTodayExtras({ token, level, tasks: shown, courseSteps: steps, focus })
  const firstOpen = tasks.findIndex((x) => x.status !== 'completed')
  const currentId = firstOpen >= 0 ? tasks[firstOpen].id : null
  const { start, markFailed } = useGeTaskStart({ token, level, onNav, reload: onReload, lessons, targets })
  // «+N токенов» и «готово · +N токенов» — только где награды включены (решение владельца 8: на проде их нет)
  const tokenData = useStudentTokens(token)
  const rewards = areRewardsEnabled()
  const tokensOf = (task) => (rewards ? taskTokenPoints(tokenData, task) : 0)
  const mins = todayMinutes(tasks)
  // выбор ученика сильнее подсказки «больше пяти — по навыкам»; до выбора вид следует числу задач
  const [picked, setPicked] = useState(null)
  const view = picked || defaultTodayView(tasks)

  const lowTime = plan.shortDay?.minutes || null
  const [low, setLow] = useState({ open: false, busy: false, failed: false })
  // План перечитает useGePlan по событию replanToday — свой setState с планом тут не нужен.
  const choose = async (minutes) => {
    setLow({ open: true, busy: true, failed: false })
    try {
      await replanToday(token, minutes)
      setLow({ open: false, busy: false, failed: false })
    } catch {
      setLow({ open: true, busy: false, failed: true })
    }
  }

  const row = (task, { showDate = false } = {}) => {
    const goal = targets[task.id]
    const current = task.id === currentId
    return (
      <GeTaskRow
        key={task.id}
        task={task}
        title={titles[task.id]}
        primary={current}
        showDate={showDate}
        tokens={tokensOf(task)}
        onStart={start}
        skill={skillOf(task, focus)}
        badge={goal?.level || null}
        why={current ? whyLine(t, task, { level: goal?.level || level, target, weakest, focus }) : ''}
        opens={targetPath(t, goal)}
        started={Boolean(goal?.started)}
      />
    )
  }

  return (
    <section className="hm-card ge-today ge-skin" aria-labelledby="ge-today-title">
      <header className="ge-today__head">
        <h2 id="ge-today-title" className="hm-card__title">{t('gePlan.today.title')}</h2>
        {mins.total > 0 && (
          <span className="ge-today__mins">{t('gePlan.today.minutes', { done: String(mins.done), total: String(mins.total) })}</span>
        )}
        {tasks.length > 1 && (
          <div className="ge-today__view" role="group" aria-label={t('gePlan.today.viewLabel')}>
            {['order', 'skills'].map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setPicked(v)}>
                {t(`gePlan.today.view.${v}`)}
              </button>
            ))}
          </div>
        )}
      </header>
      {mins.total > 0 && (
        <div
          className="ge-today__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={mins.percent}
          aria-label={t('gePlan.today.minutes', { done: String(mins.done), total: String(mins.total) })}
        >
          <i style={{ width: `${mins.percent}%` }} />
        </div>
      )}
      {plan.liveMissing && (
        <p className="ge-today__note">
          {t('gePlan.liveMissing')}{' '}
          <button type="button" className="ih-link" onClick={() => onNav?.('pricing')}>
            {t('gePlan.liveMissing.cta')}
          </button>
        </p>
      )}
      {tasks.length > 0 &&
        (view === 'skills' ? <GeTodaySkills tasks={tasks} renderRow={row} focus={focus} /> : <ul className="ge-tasks">{tasks.map((task) => row(task))}</ul>)}
      {markFailed && <p className="ge-move__error" role="alert">{t('gePlan.markFail')}</p>}
      {firstOpen < 0 && (
        <>
          <p className="ge-today__rest">{t(tasks.length ? 'gePlan.today.done' : 'gePlan.today.rest')}</p>
          {ahead.length > 0 && (
            <>
              <h3 className="ge-today__ahead">{t('gePlan.today.ahead')}</h3>
              <ul className="ge-tasks">{ahead.map((task) => row(task, { showDate: true }))}</ul>
            </>
          )}
        </>
      )}
      {deferred.length > 0 && (
        <>
          <h3 className="ge-today__ahead">{t('gePlan.lowTime.deferred')}</h3>
          <ul className="ge-tasks">{deferred.map((task) => row(task, { showDate: true }))}</ul>
        </>
      )}
      <div className="ge-today__foot">
        <button type="button" className="ih-link ge-today__all" onClick={() => onNav?.('ge-plan')}>
          {t('gePlan.today.all')} <ArrowForwardIcon size={18} />
        </button>
        {/* Выбор — пока на сегодня есть что делать, или чтобы вернуть обычный день */}
        {canReplan(plan) && (lowTime || firstOpen >= 0) && (
          <div className="ge-today__low">
            {lowTime ? (
              <>
                <span className="ge-today__low-on">{t('gePlan.lowTime.on', { n: String(lowTime) })}</span>
                <button type="button" className="ih-link" disabled={low.busy} onClick={() => choose(null)}>
                  {t('gePlan.lowTime.reset')}
                </button>
              </>
            ) : low.open ? (
              <>
                <span className="ge-today__low-ask">{t('gePlan.lowTime.ask')}</span>
                <div className="ih-seg2 ih-seg2--sm" role="group" aria-label={t('gePlan.lowTime.ask')}>
                  {LOW_TIME_CHOICES.map((m) => (
                    <button key={m} type="button" className="ge-today__min" disabled={low.busy} onClick={() => choose(m)}>
                      {t('gePlan.min', { n: String(m) })}
                    </button>
                  ))}
                </div>
                <button type="button" className="ih-link" disabled={low.busy} onClick={() => setLow({ open: false, busy: false, failed: false })}>
                  {t('gePlan.lowTime.cancel')}
                </button>
              </>
            ) : (
              <button type="button" className="ih-link" onClick={() => setLow({ open: true, busy: false, failed: false })}>
                {t('gePlan.lowTime.link')}
              </button>
            )}
            {low.failed && <p className="ge-move__error" role="alert">{t('gePlan.lowTime.fail')}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
