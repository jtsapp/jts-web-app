import { useMemo } from 'react'
import { useI18n } from '../../i18n.jsx'
import { ArrowForwardIcon } from '../../ielts/icons.jsx'
import GeTaskRow from '../../ge/plan/GeTaskRow.jsx'
import { courseTitles, todayView } from '../../ge/plan/planModel.js'
import { useGeTaskStart } from '../../ge/plan/useGeTaskStart.js'
import { taskTokenPoints, useStudentTokens } from '../../practice/practiceTokens.js'

/**
 * «Сегодня» на «Главной» общего курса (спека 2026-10-13, секция 4): задачи дня из плана бэкенда вместо прежней
 * «Что сделать сегодня». Сверху — просроченное этой недели; открытого нет — «на сегодня всё» и две ближайшие задачи.
 * «Весь план» — экран «План». Плашка «запишитесь на занятия» — группе и индивидуальным без занятий в расписании.
 * token и onReload — для «Отметить выполненным» у своего задания преподавателя (часть 3).
 */
export default function GeTodayCard({ plan, frontier, level, token, onReload, onNav }) {
  const { t } = useI18n()
  const titles = useMemo(() => courseTitles(plan.tasks, frontier), [plan.tasks, frontier])
  const { tasks, ahead } = todayView(plan)
  const firstOpen = tasks.findIndex((x) => x.status !== 'completed')
  const { start, markFailed } = useGeTaskStart({ token, level, onNav, reload: onReload })
  // «+N токенов» у задач дня: урок с преподавателем, домашка, разговор — как в макете кабинета студента
  const tokenData = useStudentTokens(token)
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
    </section>
  )
}
