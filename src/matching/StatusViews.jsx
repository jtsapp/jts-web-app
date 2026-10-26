import { useState } from 'react'
import { patchMatchingWish } from '../api.js'
import { refreshMatching } from './matchingStore.js'
import TeacherPhoto from './TeacherPhoto.jsx'
import { MtModal, errorText, useBusy } from './ui.jsx'
import { interestLabel } from './interests.js'
import { formatDateTime, schoolTimeToDate, slotLabel, sortSlots } from './slots.js'
import { lessonDateLabel } from './ConfirmCard.jsx'
import { useMatchingT } from './texts.js'

// «Подберите своего учителя» — шапка «Мой учитель» без учителя (ТЗ §2.9), с плашками «Запрос одобрен» и «все
// отказали», когда ученик вернулся к выбору по этим причинам.
export function NoTeacherHero({ view, managerLabel, onStart, onManager, managerDisabled }) {
  const { t } = useMatchingT()
  const steps = view.needsFormatStep ? ['format', 'time', 'teacher'] : ['time', 'teacher']
  return (
    <>
      {view.changeApproved && (
        <div className="mt-banner mt-banner--ok"><p><b>{t('approved.title')}</b> {t('approved.text')}</p></div>
      )}
      {view.allDeclined && (
        <div className="mt-banner mt-banner--warn">
          <p>
            <b>{t('declined.title')}</b> {t('declined.text')}{' '}
            {view.managerName && t('declined.manager', { name: view.managerName })}
          </p>
        </div>
      )}
      <section className="mt-hero" aria-label={t('title')}>
        <div className="mt-stack">
          <span className="mt-pill">{t('title')}</span>
          <h1 className="mt-h1">{t('none.title')}</h1>
          <p className="mt-muted">
            {view.tariff.guarantee && t('none.guarantee') + ' '}
            {t('none.text', { n: steps.length })}
          </p>
          <div className="mt-steps">
            {steps.map((s, i) => (
              <span key={s} className="mt-row" style={{ gap: 8 }}>
                {i > 0 && <span className="mt-muted" aria-hidden="true">→</span>}
                <span className="mt-step"><i>{i + 1}</i>{t('step.short.' + s)}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="mt-stack">
          <button type="button" className="mt-btn" onClick={onStart}>
            {view.allDeclined ? t('declined.pick') : t('btn.findTeacher')}
          </button>
          <button type="button" className="mt-btn mt-btn--line mt-btn--sm" disabled={managerDisabled} onClick={onManager}>{managerLabel}</button>
        </div>
      </section>
    </>
  )
}

export function InfoHero({ pill, pillKind = 'warn', title, text, children }) {
  return (
    <section className="mt-hero">
      <div className="mt-stack">
        {pill && <span className={`mt-pill mt-pill--${pillKind}`}>{pill}</span>}
        <h1 className="mt-h1">{title}</h1>
        {text && <p className="mt-muted">{text}</p>}
      </div>
      {children && <div className="mt-stack">{children}</div>}
    </section>
  )
}

// «Статус заявок» (ТЗ §2.6): по учителю — приоритет, фото, имя и состояние; причина отказа не показывается.
export function RequestsStatus({ token, view, now = new Date(), managerLabel, onManager, managerDisabled }) {
  const { t } = useMatchingT()
  const state = (r) => {
    if (r.state === 'waiting') {
      const until = schoolTimeToDate(r.expiresAt)
      const h = until ? Math.max(0, Math.ceil((until - now) / 3600000)) : null
      return { kind: 'warn', text: h ? t('requests.waiting', { h }) : t('requests.waitingSoon') }
    }
    if (r.state === 'accepted') return { kind: 'ok', text: t('requests.accepted') }
    if (r.state === 'declined') return { kind: 'gray', text: t('requests.declined') }
    if (r.state === 'expired') return { kind: 'gray', text: t('requests.expired') }
    return { kind: 'gray', text: t('requests.cancelled') }
  }
  return (
    <div className="mt-card mt-stack">
      <h2 className="mt-h2">{t('requests.title')}</h2>
      <p className="mt-muted mt-small">{t('requests.text')}</p>
      {view.requests.map((r) => {
        const s = state(r)
        return (
          <div key={r.id} className="mt-row mt-between" style={{ borderTop: '1px solid var(--mt-line)', paddingTop: 12 }}>
            <div className="mt-row">
              <span className="mt-prio">{r.priority}</span>
              <TeacherPhoto token={token} teacherId={r.teacherId} name={r.teacherName} />
              <div>
                <b>{r.teacherName}</b>
                <div className="mt-tiny">{t('teachers.prio', { n: r.priority })}</div>
              </div>
            </div>
            <span className={`mt-pill mt-pill--${s.kind}`}>{s.text}</span>
          </div>
        )
      })}
      <button type="button" className="mt-btn mt-btn--ghost mt-btn--sm" style={{ alignSelf: 'flex-start' }} disabled={managerDisabled} onClick={onManager}>
        {managerLabel}
      </button>
    </div>
  )
}

// «Менеджер подбирает учителя до …» (ТЗ §2.8): удобное время, пожелание цитатой и «Изменить пожелания».
export function ManagerPicking({ token, view, tz, toast }) {
  const { t, lang } = useMatchingT()
  const r = view.managerRequest
  const [editing, setEditing] = useState(false)
  const [wish, setWish] = useState(r?.wish || '')
  const [busy, run] = useBusy()
  const due = schoolTimeToDate(r?.dueAt)
  const save = () =>
    run(async () => {
      try {
        await patchMatchingWish(token, wish.trim() || null)
        await refreshMatching(token)
        setEditing(false)
        toast(t('manager.wishSaved'))
      } catch (e) {
        toast(errorText(e, t))
      }
    })
  return (
    <div className="mt-card mt-stack">
      <div className="mt-row">
        <span className="mt-pill mt-pill--warn">{t('manager.title')}</span>
        {due && <span className="mt-tiny">{t('manager.until', { date: formatDateTime(due, tz, lang) })}</span>}
      </div>
      <p>{t('manager.text', { name: r?.managerName || t('manager.yourManager') })}</p>
      <div className="mt-tags">
        {(r?.slots || []).length
          ? sortSlots(r.slots, tz).map((s) => <span key={s.weekday + s.start} className="mt-tag">{slotLabel(s, tz, lang)}</span>)
          : <span className="mt-small mt-muted">{t('manager.noSlots')}</span>}
      </div>
      {view.interests.length > 0 && (
        <div className="mt-tags">{view.interests.map((h) => <span key={h} className="mt-tag mt-tag--hit">{interestLabel(lang, h)}</span>)}</div>
      )}
      {!editing && r?.wish && <p className="mt-quote mt-small">{r.wish}</p>}
      {editing ? (
        <div className="mt-stack">
          <textarea className="mt-input" maxLength={500} value={wish} placeholder={t('manager.wishPh')} aria-label={t('manager.wish')} onChange={(e) => setWish(e.target.value)} />
          <div className="mt-row">
            <button type="button" className="mt-btn mt-btn--sm" disabled={busy} onClick={save}>{t('btn.save')}</button>
            <button type="button" className="mt-btn mt-btn--sm mt-btn--line" onClick={() => setEditing(false)}>{t('btn.cancel')}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="mt-link" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing(true)}>{t('manager.editWish')}</button>
      )}
    </div>
  )
}

// «🎉 Ваш учитель — …» после подтверждения (ТЗ §2.7, уведомление №11).
export function CelebrateModal({ done, tz, onClose }) {
  const { t, lang } = useMatchingT()
  return (
    <MtModal onClose={onClose} label={t('confirm.doneTitle', { name: done.teacherName })}>
      <h2 className="mt-h2">{t('confirm.doneTitle', { name: done.teacherName })}</h2>
      <p>
        {t('confirm.doneText', {
          slots: sortSlots(done.slots || [], tz).map((s) => slotLabel(s, tz, lang)).join(', '),
          date: lessonDateLabel(done.first, tz, lang),
        })}
      </p>
      <div className="mt-row mt-end">
        <button type="button" className="mt-btn" onClick={onClose}>{t('btn.close')}</button>
      </div>
    </MtModal>
  )
}
