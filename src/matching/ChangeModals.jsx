import { useState } from 'react'
import { changeMatchingFormat, chooseMatchingHandoff, requestTeacherChange } from '../api.js'
import { applyMatchingCard, refreshMatching } from './matchingStore.js'
import { MtModal, errorText, useBusy } from './ui.jsx'
import { FORMAT_CODES, useMatchingT } from './texts.js'
import { formatDateTime } from './slots.js'

// Причина уходит на сервер по-русски при любом языке интерфейса: её читают менеджер и координатор (ТЗ §2.9).
const REASONS = [
  ['schedule', 'Не подходит расписание'],
  ['style', 'Не подходит стиль преподавания'],
  ['format', 'Хочу другой формат обучения'],
  ['progress', 'Нет прогресса'],
  ['contact', 'Не сложился контакт'],
  ['complaint', 'Жалоба на учителя (опоздания, качество и т.д.)'],
]

// «Сменить формат» (ТЗ §2.9): формат, который учитель ведёт, меняется сразу; который не ведёт — через смену учителя.
// Ведёт ли — знают только форматы учителя на сервере, поэтому подпись «смена сразу / понадобится смена» берём из
// профиля учителя, а окончательное слово за ответом ручки (teacher_format).
export function ChangeFormatModal({ token, current, teacherFormats, onClose, onDone, onNeedTeacherChange }) {
  const { t } = useMatchingT()
  const [error, setError] = useState('')
  const [busy, run] = useBusy()
  const pick = (format) =>
    run(async () => {
      if (format === current) return onClose()
      if (teacherFormats && !teacherFormats.includes(format)) return onNeedTeacherChange()
      setError('')
      try {
        applyMatchingCard(await changeMatchingFormat(token, format))
        onDone(t('fmt.done'))
      } catch (e) {
        if (e?.code === 'teacher_format') return onNeedTeacherChange()
        setError(errorText(e, t))
        refreshMatching(token)
      }
    })
  return (
    <MtModal title={t('fmt.title')} onClose={onClose}>
      {FORMAT_CODES.map((f) => {
        const can = !teacherFormats || teacherFormats.includes(f)
        return (
          <button key={f} type="button" className="mt-opt" aria-pressed={current === f} disabled={busy} onClick={() => pick(f)}>
            <div className="mt-row mt-between">
              <h3 className="mt-h3">{t('format.' + f)}</h3>
              {current === f && <span className="mt-pill">{t('fmt.current')}</span>}
            </div>
            <p className="mt-small" style={{ color: can ? 'var(--mt-fg-2)' : 'var(--mt-warn-ink)' }}>{t(can ? 'fmt.can' : 'fmt.cannot')}</p>
          </button>
        )
      })}
      {error && <p className="mt-small mt-error" role="alert">{error}</p>}
      <button type="button" className="mt-btn mt-btn--line" onClick={onClose}>{t('btn.cancel')}</button>
    </MtModal>
  )
}

// «Почему хотите сменить учителя?» (ТЗ §2.9): одна причина обязательна, комментарий обязателен для жалобы; после
// двух смен за 90 дней — только через менеджера.
export function ChangeTeacherModal({ token, limits, initialReason = 'schedule', onClose, onSent, onContact }) {
  const { t } = useMatchingT()
  const [reason, setReason] = useState(initialReason)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, run] = useBusy()
  // Лимит смен сервер мог исчерпать раньше, чем это увидела карточка (смена из другой вкладки).
  const [overLimit, setOverLimit] = useState(false)
  const complaint = reason === 'complaint'
  const ready = !complaint || text.trim().length > 0

  if (overLimit || (limits?.teacherChangesLeft ?? 2) <= 0) {
    return (
      <MtModal title={t('chg.title')} onClose={onClose}>
        <p>{t('chg.limit')}</p>
        <div className="mt-row mt-end">
          <button type="button" className="mt-btn mt-btn--line" onClick={onClose}>{t('btn.cancel')}</button>
          <button type="button" className="mt-btn" onClick={onContact}>{t('btn.contactManager')}</button>
        </div>
      </MtModal>
    )
  }

  const send = () =>
    run(async () => {
      setError('')
      try {
        const label = REASONS.find(([k]) => k === reason)[1]
        applyMatchingCard(await requestTeacherChange(token, label, text.trim() || null))
        onSent(t('chg.sent'))
      } catch (e) {
        refreshMatching(token)
        if (e?.code === 'limit_reached') return setOverLimit(true)
        setError(errorText(e, t))
      }
    })

  return (
    <MtModal title={t('chg.title')} onClose={onClose}>
      <p className="mt-small mt-muted" id="mt-change-reason-title">{t('chg.text')}</p>
      <div className="mt-stack" style={{ gap: 8 }} role="radiogroup" aria-labelledby="mt-change-reason-title">
        {REASONS.map(([key]) => (
          <label key={key} className="mt-reason">
            <input type="radio" name="mt-change-reason" checked={reason === key} onChange={() => setReason(key)} />
            <span>{t('chg.' + key)}</span>
          </label>
        ))}
      </div>
      <textarea
        className="mt-input"
        maxLength={1000}
        aria-label={t(complaint ? 'chg.commentReq' : 'chg.comment')}
        placeholder={t(complaint ? 'chg.commentReq' : 'chg.comment')}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="mt-tiny">{t('chg.note')}</p>
      {error && <p className="mt-small mt-error" role="alert">{error}</p>}
      <div className="mt-row mt-end">
        <button type="button" className="mt-btn mt-btn--line" onClick={onClose}>{t('btn.cancel')}</button>
        <button type="button" className="mt-btn" disabled={!ready || busy} onClick={send}>{t('chg.send')}</button>
      </div>
    </MtModal>
  )
}

const dayMs = 86400000
const isoDate = (s) => (s ? new Date(s + 'T00:00:00Z') : null)

export function vacationDays(v) {
  const from = isoDate(v?.from)
  const to = isoDate(v?.to)
  return from && to ? Math.round((to - from) / dayMs) + 1 : 0
}

export function shortDate(s, tz, lang) {
  const d = isoDate(s)
  return d ? formatDateTime(new Date(d.getTime() + 12 * 3600 * 1000), tz, lang, { withTime: false }) : ''
}

// Отпуск учителя (ТЗ §2.9): пауза или временный учитель. Временного подбирает менеджер — ученику бэкенд свободных
// учителей на период не отдаёт, поэтому выбор записывается, а имя появится, когда менеджер назначит.
export function VacationModal({ token, vacation, tz, onClose, onDone }) {
  const { t, lang } = useMatchingT()
  const [error, setError] = useState('')
  const [busy, run] = useBusy()
  const from = shortDate(vacation.from, tz, lang)
  const to = shortDate(vacation.to, tz, lang)
  const back = vacation.to ? shortDate(new Date(isoDate(vacation.to).getTime() + dayMs).toISOString().slice(0, 10), tz, lang) : ''
  const until = vacation.from ? shortDate(new Date(isoDate(vacation.from).getTime() - 2 * dayMs).toISOString().slice(0, 10), tz, lang) : ''
  const choose = (choice) =>
    run(async () => {
      setError('')
      try {
        await chooseMatchingHandoff(token, vacation.id, choice)
        await refreshMatching(token)
        onDone(t(choice === 'pause' ? 'vac.pauseDone' : 'vac.tempDone'))
      } catch (e) {
        setError(errorText(e, t))
      }
    })
  return (
    <MtModal title={t('vac.title', { name: vacation.teacherName || '', from, to })} onClose={onClose}>
      <p className="mt-muted">{t('vac.ask')}</p>
      <button type="button" className="mt-opt" disabled={busy} onClick={() => choose('pause')}>
        <h3 className="mt-h3">{t('vac.pause')}</h3>
        <p className="mt-small mt-muted">{t('vac.pauseText', { n: vacationDays(vacation) })}</p>
      </button>
      <button type="button" className="mt-opt" disabled={busy} onClick={() => choose('temp_teacher')}>
        <h3 className="mt-h3">{t('vac.temp')}</h3>
        <p className="mt-small mt-muted">{t('vac.tempText', { date: back })}</p>
      </button>
      {until && <p className="mt-tiny">{t('vac.deadline', { date: until })}</p>}
      {error && <p className="mt-small mt-error" role="alert">{error}</p>}
    </MtModal>
  )
}
