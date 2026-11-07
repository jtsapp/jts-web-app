import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { ArrowForwardIcon } from '../../ielts/icons.jsx'
import GeTaskRow from '../../ge/plan/GeTaskRow.jsx'
import { courseLessons, courseTitles, todayView } from '../../ge/plan/planModel.js'
import { LOW_TIME_CHOICES, canReplan, replanToday } from '../../ge/plan/replan.js'
import { useGeTaskStart } from '../../ge/plan/useGeTaskStart.js'
import { taskTokenPoints, useStudentTokens } from '../../practice/practiceTokens.js'

/**
 * «Сегодня» на «Главной» общего курса (спека 2026-10-13, секция 4): задачи дня из плана бэкенда вместо прежней
 * «Что сделать сегодня». Сверху — просроченное этой недели; открытого нет — «на сегодня всё» и две ближайшие задачи.
 * «Весь план» — экран «План». Плашка «запишитесь на занятия» — группе и индивидуальным без занятий в расписании.
 * Только свои задачи плана (todayView): занятия, домашка и задачи преподавателя — в «Весь план», в расписании и
 * домашке рядом (ТЗ v2.0 9.1). token и onReload — для «Начать» и сбоя отметки.
 * «У меня мало времени» (ТЗ v2.0, 5.2): 10/20/30 минут — бэкенд пересобирает день, ушедшее — строками «Перенесено».
 */
export default function GeTodayCard({ plan, frontier, level, token, onReload, onNav }) {
  const { t } = useI18n()
  const titles = useMemo(() => courseTitles(plan.tasks, frontier), [plan.tasks, frontier])
  const lessons = useMemo(() => courseLessons(plan.tasks, frontier), [plan.tasks, frontier])
  const { tasks, ahead, deferred } = todayView(plan)
  const firstOpen = tasks.findIndex((x) => x.status !== 'completed')
  const { start, markFailed } = useGeTaskStart({ token, level, onNav, reload: onReload, lessons })
  // «+N токенов» у задач дня (разговор и т. п.) — как в макете кабинета студента
  const tokenData = useStudentTokens(token)
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
  return (
    <section className="hm-card ge-today ge-skin" aria-labelledby="ge-today-title">
      <header className="ge-today__head">
        <h2 id="ge-today-title" className="hm-card__title">{t('gePlan.today.title')}</h2>
        {plan.week && (
          <span className="ge-today__week">{t('gePlan.today.week', { done: String(plan.week.done), total: String(plan.week.total) })}</span>
        )}
        <button type="button" className="ih-link ge-today__all" onClick={() => onNav?.('ge-plan')}>
          {t('gePlan.today.all')} <ArrowForwardIcon size={18} />
        </button>
      </header>
      {plan.liveMissing && (
        <p className="ge-today__note">
          {t('gePlan.liveMissing')}{' '}
          <button type="button" className="ih-link" onClick={() => onNav?.('pricing')}>
            {t('gePlan.liveMissing.cta')}
          </button>
        </p>
      )}
      {tasks.length > 0 && (
        <ul className="ge-tasks">
          {tasks.map((task, i) => (
            <GeTaskRow key={task.id} task={task} title={titles[task.id]} primary={i === firstOpen} tokens={taskTokenPoints(tokenData, task)} onStart={start} />
          ))}
        </ul>
      )}
      {markFailed && <p className="ge-move__error" role="alert">{t('gePlan.markFail')}</p>}
      {firstOpen < 0 && (
        <>
          <p className="ge-today__rest">{t(tasks.length ? 'gePlan.today.done' : 'gePlan.today.rest')}</p>
          {ahead.length > 0 && (
            <>
              <h3 className="ge-today__ahead">{t('gePlan.today.ahead')}</h3>
              <ul className="ge-tasks">
                {ahead.map((task) => (
                  <GeTaskRow key={task.id} task={task} title={titles[task.id]} showDate tokens={taskTokenPoints(tokenData, task)} onStart={start} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {deferred.length > 0 && (
        <>
          <h3 className="ge-today__ahead">{t('gePlan.lowTime.deferred')}</h3>
          <ul className="ge-tasks">
            {deferred.map((task) => (
              <GeTaskRow key={task.id} task={task} title={titles[task.id]} showDate tokens={taskTokenPoints(tokenData, task)} onStart={start} />
            ))}
          </ul>
        </>
      )}
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
    </section>
  )
}
