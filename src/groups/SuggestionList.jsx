'use client'

import { bestSuggestionId, formatDate, orderedSuggestions, scheduleLine } from './groupLogic.js'
import { useGroupT } from './texts.js'

// Подходящие группы по убыванию совпадения (60% дни, 40% время суток): лучшая выделена, полные — внизу с кнопкой «Встать в
// лист ожидания». Групп нет — «Попросить менеджера» (ТЗ кабинетов, 14, «Выбор группы при онбординге ученика»).
export default function SuggestionList({ suggestions, waiting, busy, asked, onEnroll, onWaitlist, onLeave, onAsk }) {
  const { t, lang } = useGroupT()
  const best = bestSuggestionId(suggestions)
  const waitingIn = (groupId) => waiting.find((entry) => entry.group.id === groupId)

  if (!suggestions.length) {
    return (
      <div className="mt-card mt-stack" data-testid="no-groups">
        <h2 className="mt-h2">{t('sug.none')}</h2>
        <p className="gp-lead">{t('sug.noneText')}</p>
        {asked ? (
          <div className="mt-banner mt-banner--ok" role="status"><p>{t('sug.asked')}</p></div>
        ) : (
          <div>
            <button type="button" className="mt-btn" disabled={busy} onClick={onAsk}>{t('sug.ask')}</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="mt-stack" data-testid="suggestions">
      <h2 className="mt-h2">{t('sug.title')}</h2>
      <div className="gp-list">
        {orderedSuggestions(suggestions).map((item) => {
          const group = item.group
          const queued = waitingIn(group.id)
          return (
            <article key={group.id} className={`mt-card gp-item${group.id === best ? ' gp-item--best' : ''}${item.full ? ' gp-item--full' : ''}`} data-testid={`group-${group.id}`}>
              <div className="gp-item__main">
                <span className="gp-item__title">{group.name} · {group.level} · {t('direction.' + group.direction)}</span>
                <span className="gp-item__meta">{scheduleLine(group, (day) => t('day.' + day), t('unit.min'))}</span>
                <span className="gp-item__meta">
                  {t('sug.start', { date: formatDate(group.startDate, lang) })} · {group.teacherName ? t('sug.teacher', { name: group.teacherName }) : t('sug.noTeacher')}
                </span>
                <div className="gp-chips">
                  {group.id === best && <span className="mt-pill mt-pill--ok">{t('sug.best')}</span>}
                  <span className="mt-pill mt-pill--gray" title={t('sug.matchHint')}>{t('sug.match', { n: item.match })}</span>
                  {item.full ? (
                    <span className="mt-pill mt-pill--warn">{t('sug.full')}</span>
                  ) : (
                    <span className="mt-pill mt-pill--gray">{t('sug.seats', { n: item.freeSeats, max: group.maxSeats })}</span>
                  )}
                  {!item.full && group.status === 'RECRUITING' && <span className="mt-pill mt-pill--gray">{t('sug.until', { date: formatDate(group.recruitmentEnd, lang) })}</span>}
                </div>
              </div>
              <div className="gp-item__act">
                {!item.full && <button type="button" className="mt-btn" disabled={busy} onClick={() => onEnroll(group.id)}>{t('sug.enroll')}</button>}
                {item.full && !queued && <button type="button" className="mt-btn mt-btn--line" disabled={busy} onClick={() => onWaitlist(group.id)}>{t('sug.waitlist')}</button>}
                {item.full && queued && (
                  <>
                    <span className="mt-pill mt-pill--ok">{t('sug.waiting', { n: queued.position })}</span>
                    <button type="button" className="mt-btn mt-btn--sm mt-btn--line" disabled={busy} onClick={() => onLeave(group.id)}>{t('sug.leave')}</button>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
