import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import {
  getHomeworkBoard, getHomeworkById,
  saveHomeworkFeedback, gradeHomework, returnHomeworkForRevision,
} from '../../api.js'
import HomeworkFileList from './HomeworkFileList.jsx'
import { homeworkStateKey, reviewOrder, GRADES } from './homeworkFormat.js'

/**
 * Проверка домашних работ — экран преподавателя внутри «Уроков».
 *
 * Раньше проверять можно было только в админке: ученик сдавал работу в вебе, а
 * преподаватель шёл за ней в другую систему. Здесь тот же набор действий —
 * скачать ответ, написать отзыв, поставить оценку или вернуть на доработку.
 *
 * Сортировка не по дате, а по тому, чья очередь: сверху сданные работы, они
 * ждут преподавателя, и только потом заданные и уже проверенные (reviewOrder).
 */
export default function TeacherHomeworkBoard({ token }) {
  const { t, lang } = useI18n()
  const locale = lang || 'ru'
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error' (гость — см. view ниже)
  const [selectedId, setSelectedId] = useState(null)
  const [comment, setComment] = useState('')
  const [grade, setGrade] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setState('loading')
    getHomeworkBoard(token)
      .then((list) => {
        if (cancelled) return
        setItems(Array.isArray(list) ? list : [])
        setState('ready')
      })
      .catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [token])

  const sorted = useMemo(
    () => items.slice().sort((a, b) => reviewOrder(a) - reviewOrder(b) || b.id - a.id),
    [items]
  )
  const selected = sorted.find((hw) => hw.id === selectedId) || null

  // Открывая работу, подставляем то, что уже написано и поставлено: отзыв
  // правится, а не пишется заново с нуля. Оценку вне шкалы 1–5 (работы,
  // оценённые до её введения, хранят и 7, и 100) не подставляем: бэкенд такую
  // больше не примет (@Min/@Max в GradeHomeworkRequest), и «Поставить оценку»
  // улетала бы в 400 — пусть кнопка ждёт выбранный заново балл.
  const open = (hw) => {
    setSelectedId(hw.id)
    setComment(hw.teacherComment || '')
    setGrade(GRADES.includes(hw.grade) ? hw.grade : null)
    setError(null)
    setDone(null)
  }

  const apply = async (action, successKey) => {
    if (!selected) return
    setError(null)
    setDone(null)
    setBusy(true)
    try {
      const updated = await action()
      setItems((list) => list.map((hw) => (hw.id === updated.id ? updated : hw)))
      setComment(updated.teacherComment || '')
      setGrade(updated.grade ?? null)
      setDone(t(successKey))
    } catch {
      setError(t('homework.reviewFailed'))
      // Карточку перечитываем: действие могло пройти частично (например,
      // оценка сохранилась, а ответ не дошёл), и показывать старое нельзя.
      try {
        const fresh = await getHomeworkById(token, selected.id)
        setItems((list) => list.map((hw) => (hw.id === fresh.id ? fresh : hw)))
      } catch { /* оставляем как есть — следующее действие покажет актуальное */ }
    } finally {
      setBusy(false)
    }
  }

  // Без токена доска не запрашивается — и без этой строки висела бы на вечной
  // «Загрузке домашних работ…», как ученический экран (см. HomeworkPage).
  const view = token ? state : 'anon'

  if (view === 'loading') return <p className="hw__hint">{t('homework.loading')}</p>
  if (view === 'anon') return <p className="hw__hint">{t('homework.needAuth')}</p>
  if (view === 'error') return <p className="hw__error">{t('homework.loadError')}</p>
  if (sorted.length === 0) return <p className="hw__hint">{t('homework.boardEmpty')}</p>

  return (
    <div className="hw__layout">
      <ul className="hw-list">
        {sorted.map((hw) => {
          const stateKey = homeworkStateKey(hw)
          return (
            <li key={hw.id}>
              <button
                type="button"
                className={`hw-card ${hw.id === selectedId ? 'hw-card--sel' : ''}`}
                aria-pressed={hw.id === selectedId}
                onClick={() => open(hw)}
              >
                <span className="hw-card__student">{hw.studentName || '—'}</span>
                <span className="hw-card__title">{hw.title}</span>
                <span className="hw-card__meta">
                  <span className={`hw-badge hw-badge--${stateKey}`}>{t(`homework.status.${stateKey}`)}</span>
                  {(hw.submissions?.length ?? 0) > 0 && (
                    <span className="hw-card__files">{t('homework.filesCount', { count: hw.submissions.length })}</span>
                  )}
                  {hw.grade != null && <span className="hw-card__grade">{hw.grade}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {!selected ? (
        <div className="hw-detail hw-detail--empty"><p className="hw__hint">{t('homework.pickOneToReview')}</p></div>
      ) : (
        <div className="hw-detail">
          <div className="hw-detail__head">
            <h2 className="hw-detail__title">{selected.title}</h2>
            <span className={`hw-badge hw-badge--${homeworkStateKey(selected)}`}>
              {t(`homework.status.${homeworkStateKey(selected)}`)}
            </span>
          </div>
          <div className="hw-detail__meta">
            <span>{t('homework.student', { name: selected.studentName || '—' })}</span>
            {selected.submittedAt && (
              <span>{t('homework.submittedAt', {
                date: new Date(selected.submittedAt).toLocaleString(locale, {
                  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                }),
              })}</span>
            )}
          </div>

          <section className="hw-block">
            <h3 className="hw-block__title">{t('homework.task')}</h3>
            <HomeworkFileList files={selected.materials} emptyLabel={t('homework.taskEmpty')} />
          </section>

          <section className="hw-block">
            <h3 className="hw-block__title">{t('homework.studentAnswer')}</h3>
            <HomeworkFileList files={selected.submissions} emptyLabel={t('homework.answerEmptyTeacher')} />
          </section>

          <section className="hw-block">
            <h3 className="hw-block__title">{t('homework.review')}</h3>

            <div className="hw-grades" role="group" aria-label={t('homework.grade')}>
              {GRADES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`hw-grade-btn ${grade === value ? 'hw-grade-btn--on' : ''}`}
                  aria-pressed={grade === value}
                  onClick={() => setGrade(value)}
                >
                  {value}
                </button>
              ))}
            </div>

            <label className="hw-field">
              <span className="hw-field__label">{t('homework.feedbackLabel')}</span>
              <textarea
                className="hw-field__input"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('homework.feedbackPlaceholder')}
              />
            </label>

            {error && <p className="hw__error">{error}</p>}
            {done && <p className="hw__done">{done}</p>}

            <div className="hw-actions">
              <button
                type="button"
                className="hw-submit"
                disabled={busy || grade == null}
                onClick={() => apply(() => gradeHomework(token, selected.id, grade, comment), 'homework.graded')}
              >
                {t('homework.setGrade')}
              </button>
              <button
                type="button"
                className="hw-btn"
                disabled={busy}
                onClick={() => apply(() => saveHomeworkFeedback(token, selected.id, comment), 'homework.feedbackSaved')}
              >
                {t('homework.saveFeedback')}
              </button>
              {/* Доработка без объяснения бессмысленна: ученик не поймёт, что
                  переделывать, поэтому кнопка ждёт текст отзыва. */}
              <button
                type="button"
                className="hw-btn"
                disabled={busy || !comment.trim()}
                title={!comment.trim() ? t('homework.needComment') : undefined}
                onClick={() => apply(() => returnHomeworkForRevision(token, selected.id, comment), 'homework.returned')}
              >
                {t('homework.returnForRevision')}
              </button>
            </div>
            {!comment.trim() && <p className="hw__hint">{t('homework.needComment')}</p>}
          </section>
        </div>
      )}
    </div>
  )
}
