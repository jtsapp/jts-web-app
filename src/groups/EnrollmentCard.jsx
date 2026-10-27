'use client'

import { useState } from 'react'
import { bookingActive, enrollmentSteps, formatDate, scheduleLine, splitLocal } from './groupLogic.js'
import { useGroupT } from './texts.js'

// Запись ученика: группа, старт, преподаватель и четыре шага — место → оплата или пробный урок → подтверждение менеджера →
// напоминание (ТЗ кабинетов, 14). Оплатой ученик не управляет: «Оплатить абонемент» просит менеджера выставить оплату.
export default function EnrollmentCard({ enrollment, busy, payAsked, onPay, onTrial, onChange, onCancel }) {
  const { t, lang } = useGroupT()
  // Что подтверждает ученик: отмену записи или смену группы (она тоже освобождает место, поэтому тоже через вопрос).
  const [confirming, setConfirming] = useState(null)
  const group = enrollment.group
  const paid = enrollment.paymentStatus === 'PAID'
  const trial = enrollment.paymentStatus === 'TRIAL'
  const requested = enrollment.payRequested || payAsked

  return (
    <section className="mt-card mt-stack" data-testid="enrollment-card">
      <div className="mt-row mt-between">
        <h2 className="mt-h2">{t('enr.title')}</h2>
        <span className={`mt-pill ${paid ? 'mt-pill--ok' : trial ? 'mt-pill--gray' : 'mt-pill--warn'}`}>{t('pay.' + enrollment.paymentStatus)}</span>
      </div>

      <div className="gp-item__main">
        <span className="gp-item__title">{group.name} · {group.level} · {t('direction.' + group.direction)}</span>
        <span className="gp-item__meta">{scheduleLine(group, (day) => t('day.' + day), t('unit.min'))}</span>
        <span className="gp-item__meta">
          {t('enr.start', { date: formatDate(group.startDate, lang) })} · {group.teacherName ? t('enr.teacher', { name: group.teacherName }) : t('enr.noTeacher')}
        </span>
      </div>

      <ol className="gp-steps" aria-label={t('enr.title')}>
        {enrollmentSteps(enrollment).map((step, index) => (
          <li key={step.key} className={`gp-step gp-step--${step.state}`} aria-current={step.state === 'on' ? 'step' : undefined}>
            <span className="gp-step__n">{step.state === 'done' ? '✓' : index + 1}</span>
            <span>{t('step.' + step.key)}</span>
          </li>
        ))}
      </ol>

      {bookingActive(enrollment) && (
        <div className="mt-banner mt-banner--warn"><p>{t('enr.booking', { time: splitLocal(enrollment.bookedUntil).time })}</p></div>
      )}
      {trial && <div className="mt-banner mt-banner--brand"><p>{t('enr.trialOn', { date: formatDate(enrollment.paymentDeadline, lang) })}</p></div>}
      {paid && <div className="mt-banner mt-banner--ok"><p>{t('enr.paid')}</p></div>}
      {!paid && requested && <div className="mt-banner mt-banner--brand" role="status"><p>{t('enr.payWaiting')}</p></div>}
      <p className="gp-lead">{enrollment.confirmed ? t('enr.confirmed') : t('enr.awaitConfirm')} {t('enr.remind')}</p>

      <div className="mt-row" style={{ flexWrap: 'wrap', gap: 8 }}>
        {!paid && <button type="button" className="mt-btn" disabled={busy || requested} onClick={onPay}>{t('enr.pay')}</button>}
        {!paid && !trial && <button type="button" className="mt-btn mt-btn--ghost" disabled={busy} onClick={onTrial}>{t('enr.trial')}</button>}
        <button type="button" className="mt-btn mt-btn--line" disabled={busy} onClick={() => setConfirming('change')}>{t('enr.change')}</button>
        <button type="button" className="mt-btn mt-btn--bad" disabled={busy} onClick={() => setConfirming('cancel')}>{t('enr.cancel')}</button>
      </div>

      {confirming && (
        <div className="mt-banner mt-banner--warn" role="alertdialog" aria-label={t(confirming === 'change' ? 'enr.change' : 'enr.cancel')}>
          <p>{t(confirming === 'change' ? 'enr.changeAsk' : 'enr.cancelAsk')}</p>
          <div className="mt-row" style={{ gap: 8 }}>
            <button type="button" className="mt-btn mt-btn--bad mt-btn--sm" disabled={busy} onClick={() => { const kind = confirming; setConfirming(null); if (kind === 'change') onChange(); else onCancel() }}>
              {t(confirming === 'change' ? 'enr.changeYes' : 'enr.cancelYes')}
            </button>
            <button type="button" className="mt-btn mt-btn--line mt-btn--sm" onClick={() => setConfirming(null)}>{t('enr.cancelNo')}</button>
          </div>
        </div>
      )}
    </section>
  )
}
