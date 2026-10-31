import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { getPendingLessonFeedback, submitLessonFeedback } from '../api.js'
import './LessonFeedbackPrompt.css'

const TEXT = {
  ru: { title: 'Как прошёл урок?', teacher: 'Преподаватель', lesson: 'Оцените урок', teaching: 'Оцените работу преподавателя', connection: 'Качество связи', weak: 'Плохое', average: 'Среднее', excellent: 'Хорошее', comment: 'Комментарий (необязательно)', send: 'Отправить оценку', busy: 'Отправляем…', later: 'Позже', error: 'Не удалось отправить оценку. Ответы сохранены в этом окне, попробуйте ещё раз.', close: 'Закрыть опрос' },
  kk: { title: 'Сабақ қалай өтті?', teacher: 'Мұғалім', lesson: 'Сабақты бағалаңыз', teaching: 'Мұғалімнің жұмысын бағалаңыз', connection: 'Байланыс сапасы', weak: 'Нашар', average: 'Орташа', excellent: 'Жақсы', comment: 'Пікір (міндетті емес)', send: 'Бағаны жіберу', busy: 'Жіберілуде…', later: 'Кейін', error: 'Баға жіберілмеді. Жауаптар осы терезеде сақталды, қайталап көріңіз.', close: 'Сауалнаманы жабу' },
  en: { title: 'How was your lesson?', teacher: 'Teacher', lesson: 'Rate the lesson', teaching: 'Rate your teacher', connection: 'Connection quality', weak: 'Poor', average: 'Average', excellent: 'Good', comment: 'Comment (optional)', send: 'Send rating', busy: 'Sending…', later: 'Later', error: 'Could not send your rating. Your answers are still here. Please try again.', close: 'Close survey' },
}

export default function LessonFeedbackPrompt({ token, enabled = true }) {
  const { lang } = useI18n()
  const t = TEXT[lang] || TEXT.ru
  const [pending, setPending] = useState(null)
  const [lessonRating, setLessonRating] = useState(0)
  const [teacherRating, setTeacherRating] = useState(0)
  const [connectionQuality, setConnectionQuality] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const snoozed = useRef(new Map())
  const dialog = useRef(null)
  const sending = useRef(false)

  useEffect(() => {
    if (!token || !enabled) return
    let alive = true, loading = false
    const controller = new AbortController()
    const check = async () => {
      if (loading || document.visibilityState === 'hidden') return
      loading = true
      try {
        const lesson = await getPendingLessonFeedback(token, controller.signal)
        if (alive && lesson?.lessonId && (snoozed.current.get(lesson.lessonId) || 0) <= Date.now()) {
          setPending(current => current || lesson)
        }
      } catch { /* A failed background poll must not interrupt the student's lesson. */ }
      finally { loading = false }
    }
    check()
    const timer = setInterval(check, 120000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => { alive = false; controller.abort(); clearInterval(timer); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check) }
  }, [token, enabled])

  useEffect(() => {
    if (!pending || !enabled) return
    const previous = document.activeElement
    const node = dialog.current
    node?.showModal()
    // showModal ставит фокус на «×», и кольцо фокуса горело на ней с самого открытия — фокус держит само окно
    node?.focus()
    return () => { node?.close(); previous?.focus?.() }
  }, [pending, enabled])

  const close = () => {
    if (sending.current) return
    if (pending) snoozed.current.set(pending.lessonId, Date.now() + 30 * 60 * 1000)
    setPending(null); setLessonRating(0); setTeacherRating(0); setConnectionQuality(''); setComment(''); setError(false)
  }
  const send = async (event) => {
    event.preventDefault()
    if (!pending || !lessonRating || !teacherRating || !connectionQuality || sending.current) return
    sending.current = true; setBusy(true); setError(false)
    try {
      await submitLessonFeedback(token, pending.lessonId, { lessonRating, teacherRating, connectionQuality, comment: comment.trim() || null })
      snoozed.current.set(pending.lessonId, Number.POSITIVE_INFINITY)
      setPending(null); setLessonRating(0); setTeacherRating(0); setConnectionQuality(''); setComment('')
    } catch { setError(true) }
    finally { sending.current = false; setBusy(false) }
  }
  if (!pending || !enabled) return null
  return <dialog ref={dialog} tabIndex={-1} className="lfp-dialog" aria-labelledby="lfp-title" onCancel={event => { event.preventDefault(); close() }}>
    <form onSubmit={send}>
      <div className="lfp-heading"><h2 id="lfp-title">{t.title}</h2><button type="button" className="lfp-button lfp-close" aria-label={t.close} onClick={close} disabled={busy}>×</button></div>
      <p>{t.teacher}: <strong>{pending.teacherName || '—'}</strong></p>
      {[{ label: t.lesson, value: lessonRating, set: setLessonRating, name: 'lesson' }, { label: t.teaching, value: teacherRating, set: setTeacherRating, name: 'teacher' }].map(rating =>
        <fieldset key={rating.name}><legend>{rating.label}</legend><div className="lfp-ratings">{[1, 2, 3, 4, 5].map(value => <label key={value} className={rating.value === value ? 'selected' : ''}><input type="radio" name={rating.name} value={value} checked={rating.value === value} onChange={() => rating.set(value)} disabled={busy} required />{value}</label>)}</div></fieldset>)}
      <fieldset><legend>{t.connection}</legend><div className="lfp-ratings">{[['WEAK', t.weak], ['AVERAGE', t.average], ['EXCELLENT', t.excellent]].map(([value, label]) => <label key={value} className={connectionQuality === value ? 'selected' : ''}><input type="radio" name="connection" value={value} checked={connectionQuality === value} onChange={() => setConnectionQuality(value)} disabled={busy} required />{label}</label>)}</div></fieldset>
      <label className="lfp-comment">{t.comment}<textarea value={comment} onChange={e => setComment(e.target.value)} rows="3" maxLength="1000" disabled={busy} /></label>
      {error && <p role="alert">{t.error}</p>}
      <div className="lfp-actions"><button type="button" className="lfp-button" onClick={close} disabled={busy}>{t.later}</button><button type="submit" className="lfp-button" disabled={busy || !lessonRating || !teacherRating || !connectionQuality}>{busy ? t.busy : t.send}</button></div>
    </form>
  </dialog>
}
