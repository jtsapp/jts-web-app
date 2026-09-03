import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { assignPracticeUnits, getMyLessonOccurrences } from '../../api.js'
import { assignableLessons, newBatchId } from './assignPractice.js'

/**
 * Панель выдачи заданий «Практики» на дом — видна преподавателю, когда он
 * отметил хотя бы один юнит.
 *
 * Урок выбирается явно, а не угадывается по «ближайшему»: у преподавателя в
 * день несколько занятий, и молча выдать задание не тому классу дороже, чем
 * попросить один клик. Ближайший при этом стоит в списке первым.
 */
export default function AssignPracticeBar({ token, area, level, units, onClear }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [lessons, setLessons] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !token || lessons != null) return
    let alive = true
    getMyLessonOccurrences(token)
      .then((list) => { if (alive) setLessons(assignableLessons(list)) })
      .catch(() => { if (alive) setLessons([]) })
    return () => { alive = false }
  }, [open, token, lessons])

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    }),
    [lang],
  )

  function assign(lessonId) {
    if (busy) return
    setBusy(true)
    setError(null)
    assignPracticeUnits(token, lessonId, { area, units, batchId: newBatchId() })
      .then(() => {
        setDone(units.length)
        setOpen(false)
        onClear?.()
      })
      .catch(() => setError(t('practice.assign.failed')))
      .finally(() => setBusy(false))
  }

  // Подтверждение живёт своей жизнью: панель к этому моменту уже пуста, потому
  // что выбор сброшен, а сказать о результате всё равно надо.
  if (done != null) {
    return (
      <div className="pr-assign pr-assign--done" role="status">
        <span>{t('practice.assign.done', { n: String(done) })}</span>
        <button type="button" onClick={() => setDone(null)}>{t('practice.assign.close')}</button>
      </div>
    )
  }

  if (!units.length) return null

  return (
    <div className="pr-assign">
      <span className="pr-assign__count">{t('practice.assign.selected', { n: String(units.length) })}</span>
      <div className="pr-assign__actions">
        <button type="button" className="pr-assign__ghost" onClick={onClear}>
          {t('practice.assign.clear')}
        </button>
        <button type="button" className="pr-assign__go" onClick={() => setOpen(true)} disabled={busy}>
          {t('practice.assign.action')}
        </button>
      </div>

      {open && (
        <div className="pr-assign__sheet" role="dialog" aria-label={t('practice.assign.pickLesson')}>
          <div className="pr-assign__sheet-head">
            <strong>{t('practice.assign.pickLesson')}</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label={t('practice.assign.close')}>✕</button>
          </div>

          {error && <p className="pr-assign__error">{error}</p>}

          {lessons == null ? (
            <p className="pr-assign__hint">{t('practice.loading')}</p>
          ) : lessons.length === 0 ? (
            // Занятий нет — говорим об этом прямо: пустой список читался бы
            // как «не загрузилось».
            <p className="pr-assign__hint">{t('practice.assign.noLessons')}</p>
          ) : (
            <ul className="pr-assign__lessons">
              {lessons.map((occ) => (
                <li key={occ.lessonId}>
                  <button type="button" disabled={busy} onClick={() => assign(occ.lessonId)}>
                    <span className="pr-assign__lesson-who">{occ.studentName || occ.teacherName || '—'}</span>
                    <span className="pr-assign__lesson-when">{fmt.format(new Date(occ.scheduledAt))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="pr-assign__note">{t('practice.assign.note')}</p>
        </div>
      )}
    </div>
  )
}
