import { useState } from 'react'
import { confirmMatchingSchedule, counterMatchingSchedule } from '../api.js'
import { applyMatchingCard, refreshMatching } from './matchingStore.js'
import TeacherPhoto from './TeacherPhoto.jsx'
import { useTeacher } from './useTeacher.js'
import { errorText, useBusy } from './ui.jsx'
import {
  formatDateTime, nextOccurrence, schoolDaysCount, schoolTimeToDate, slotKey, slotLabel, sortSlots,
} from './slots.js'
import { useMatchingT } from './texts.js'

// «Пн 19:00, 02.11» — первый урок в поясе ученика.
export function lessonDateLabel(date, tz, lang) {
  if (!date) return ''
  const locale = lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU'
  try {
    const wd = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: 'short' }).format(date)
    const hm = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
    const dm = new Intl.DateTimeFormat(locale, { timeZone: tz, day: '2-digit', month: '2-digit' }).format(date)
    return `${wd} ${hm}, ${dm}`
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ')
  }
}

// «Подтвердите расписание» (ТЗ §2.7): что предложил учитель или менеджер, до какого срока он держит эти часы, и
// «Выбрать другое время» — только из общего времени (удобное ученика ∩ окошки учителя), ровно N в разных днях.
// Прежние часы держатся за учеником, пока учитель не ответит на новое время (это решает бэкенд).
export default function ConfirmCard({ token, view, tz, onDone, onProfile, onAddTime, onManager, onCountered, toast }) {
  const { t, lang } = useMatchingT()
  const p = view.proposal
  const perWeek = view.tariff.perWeek
  const teacher = useTeacher(token, p?.teacherId)
  const [editing, setEditing] = useState(false)
  // Выбор — только среди общих слотов: предложенное менеджером время может в них не входить, и невидимые ключи
  // заполнили бы лимит N, после чего ни одна фишка уже не нажималась бы.
  const commonKeys = (p?.commonSlots || []).map(slotKey)
  const initialChosen = (p?.slots || []).map(slotKey).filter((k) => commonKeys.includes(k))
  const [chosen, setChosen] = useState(initialChosen)
  const proposalKey = (p?.slots || []).map(slotKey).join(',') + '|' + (p?.deadline || '')
  const [shownFor, setShownFor] = useState(proposalKey)
  if (shownFor !== proposalKey) {
    // учитель предложил новое время — прежний выбор к нему не относится
    setShownFor(proposalKey)
    setChosen(initialChosen)
    setEditing(false)
  }
  const [error, setError] = useState('')
  const [busy, run] = useBusy()
  if (!p) return null
  const counter = view.status === 'change_requested'
  const slots = sortSlots(p.slots, tz)
  const first = nextOccurrence(p.slots, new Date(), view.lessonWindow)
  const deadline = schoolTimeToDate(p.deadline)
  const common = sortSlots(p.commonSlots || [], tz)
  const enoughCommon = schoolDaysCount(common) >= perWeek
  const chosenSlots = common.filter((s) => chosen.includes(slotKey(s)))
  const validOther = chosenSlots.length === perWeek && schoolDaysCount(chosenSlots) === perWeek

  const confirm = () =>
    run(async () => {
      setError('')
      try {
        const card = await confirmMatchingSchedule(token)
        applyMatchingCard(card)
        onDone?.({ teacherName: p.teacherName, slots: p.slots, first })
      } catch (e) {
        setError(errorText(e, t))
        // отказ значит, что карточка на сервере уже другая (срок истёк, время заняли) — не держим старый экран
        refreshMatching(token)
      }
    })

  const sendOther = () =>
    run(async () => {
      setError('')
      try {
        const card = await counterMatchingSchedule(token, chosenSlots)
        applyMatchingCard(card)
        setEditing(false)
        const live = (card?.requests || []).find((r) => r.source === 'student_counter' && r.status === 'sent')
        const until = schoolTimeToDate(live?.expiresAt)
        toast?.(until ? t('confirm.sentOther', { date: formatDateTime(until, tz, lang) }) : t('counter.title'))
        onCountered?.()
      } catch (e) {
        setError(errorText(e, t))
        refreshMatching(token)
      }
    })

  const toggle = (key) =>
    setChosen((cur) => {
      const visible = cur.filter((k) => commonKeys.includes(k))
      if (visible.includes(key)) return visible.filter((k) => k !== key)
      return visible.length < perWeek ? [...visible, key] : visible
    })

  const specs = teacher?.card?.specializations || []
  const name = teacher?.card?.name || p.teacherName
  return (
    <section className="mt-card mt-stack" style={{ border: '2px solid var(--mt-brand)' }}>
      <div className="mt-row">
        <span className="mt-pill mt-pill--ok">{t(p.by === 'manager' ? 'confirm.byManager' : 'confirm.byTeacher')}</span>
        {!counter && <span className="mt-tiny">{t('confirm.in24')}</span>}
      </div>
      <div className="mt-row">
        <TeacherPhoto token={token} teacherId={p.teacherId} name={name} hasPhoto={teacher?.card?.hasPhoto ?? true} className="mt-ava mt-ava--lg" />
        <div>
          <h2 className="mt-h2">{name}</h2>
          <p className="mt-small mt-muted">
            {specs.join(', ')}
            {specs.length > 0 && ' · '}
            <button type="button" className="mt-link" onClick={() => onProfile?.(p.teacherId)}>{t('btn.profile').toLowerCase()}</button>
          </p>
        </div>
      </div>
      <h1 className="mt-h1" style={{ fontSize: 22 }}>{counter ? t('counter.title') : t('confirm.title')}</h1>
      <div className="mt-stack" style={{ gap: 8 }}>
        {slots.map((s) => (
          <div key={slotKey(s)} className="mt-row mt-between" style={{ background: 'var(--mt-softer)', borderRadius: 12, padding: '10px 14px' }}>
            <b>{slotLabel(s, tz, lang)}</b>
            <span className="mt-small mt-muted">{t('confirm.weekly', { n: view.tariff.duration })}</span>
          </div>
        ))}
      </div>
      {first && <p className="mt-small">{t('confirm.first')} <b>{lessonDateLabel(first, tz, lang)}</b></p>}
      {counter && view.counter && (
        <p className="mt-banner mt-banner--brand">
          {t('counter.text', { date: formatDateTime(schoolTimeToDate(view.counter.expiresAt), tz, lang) })}
        </p>
      )}
      {deadline && <p className="mt-small mt-deadline"><b>{t('confirm.until', { date: formatDateTime(deadline, tz, lang) })}</b></p>}
      {error && <p className="mt-small mt-error" role="alert">{error}</p>}

      {/* Пока учитель отвечает на «другое время», прежнее время всё ещё можно подтвердить: сервер тогда отменит
          встречную заявку — иначе резерв мог бы сгореть, пока учитель молчит. */}
      {!editing && (
        <div className="mt-row">
          <button type="button" className="mt-btn" disabled={busy} onClick={confirm}>{t('confirm.btn')}</button>
          {!counter && <button type="button" className="mt-btn mt-btn--line" onClick={() => setEditing(true)}>{t('confirm.other')}</button>}
        </div>
      )}

      {!counter && editing && (
        enoughCommon ? (
          <div className="mt-stack">
            <p className="mt-small"><b>{t('confirm.otherText', { n: perWeek })}</b></p>
            <div className="mt-chips">
              {common.map((s) => (
                <button key={slotKey(s)} type="button" className="mt-chip" aria-pressed={chosen.includes(slotKey(s))} onClick={() => toggle(slotKey(s))}>
                  {slotLabel(s, tz, lang)}
                </button>
              ))}
            </div>
            <div className="mt-row">
              <button type="button" className="mt-btn" disabled={!validOther || busy} onClick={sendOther}>{t('confirm.otherSend')}</button>
              <button type="button" className="mt-btn mt-btn--line" onClick={() => { setEditing(false); setChosen(initialChosen) }}>{t('btn.cancel')}</button>
            </div>
          </div>
        ) : (
          <div className="mt-banner mt-banner--warn">
            <p>{t('confirm.otherNone')}</p>
            <div className="mt-row">
              <button type="button" className="mt-btn mt-btn--sm" onClick={onAddTime}>{t('confirm.addTime')}</button>
              <button type="button" className="mt-btn mt-btn--sm mt-btn--ghost" onClick={onManager}>{t('btn.managerPick')}</button>
            </div>
          </div>
        )
      )}
    </section>
  )
}
