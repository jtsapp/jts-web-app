import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { assignPracticeUnits, getMyLessonOccurrences } from '../../api.js'
import {
  assignableLessons,
  assignedDueDate,
  defaultDueDate,
  isPastDue,
  minDueDate,
  newBatchId,
  parseIsoDate,
} from './assignPractice.js'

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
  // Срок подставлен: преподаватель на уроке не должен думать о дате, а менять
  // её приходится, только когда «к следующему занятию» не подходит. Пустое
  // поле — выдача без срока, как было до этого поля.
  const [dueDate, setDueDate] = useState(() => defaultDueDate())

  useEffect(() => {
    if (!open || !token || lessons != null) return
    let alive = true
    getMyLessonOccurrences(token)
      .then((list) => { if (alive) setLessons(assignableLessons(list)) })
      .catch(() => { if (alive) setLessons([]) })
    return () => { alive = false }
  }, [open, token, lessons])

  const locale = lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU'
  const fmt = useMemo(
    () => new Intl.DateTimeFormat(locale, {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    }),
    [locale],
  )
  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }),
    [locale],
  )

  // Дату можно набрать руками мимо `min` — тогда сервер отвечает отказом и не
  // пишет ни одного задания. Ловим здесь, пока преподаватель ещё смотрит в поле.
  const duePast = isPastDue(dueDate)

  function assign(lessonId) {
    if (busy || duePast) return
    setBusy(true)
    setError(null)
    assignPracticeUnits(token, lessonId, { area, units, batchId: newBatchId(), dueDate: dueDate || null })
      .then((response) => {
        setDone({ count: units.length, dueDate: assignedDueDate(response) })
        setOpen(false)
        onClear?.()
      })
      .catch(() => setError(t('practice.assign.failed')))
      .finally(() => setBusy(false))
  }

  // Подтверждение живёт своей жизнью: панель к этому моменту уже пуста, потому
  // что выбор сброшен, а сказать о результате всё равно надо.
  if (done != null) {
    const doneDay = parseIsoDate(done.dueDate)
    return (
      <div className="pr-assign pr-assign--done" role="status">
        <span>
          {t('practice.assign.done', { n: String(done.count) })}
          {/* Срок — из ответа сервера: в работе мог стоять более поздний, и он
              остаётся. Называть выбранный день было бы неправдой. */}
          {doneDay ? ` ${t('practice.assign.doneDue', { date: dayFmt.format(doneDay) })}` : ''}
        </span>
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

          {/* Срок стоит НАД списком уроков: выбор урока — последнее действие,
              оно же и отправляет выдачу, и вернуться к дате уже не выйдет. */}
          <label className="pr-assign__due">
            <span className="pr-assign__due-label">{t('practice.assign.due')}</span>
            <input
              type="date"
              className="pr-assign__due-input"
              value={dueDate}
              min={minDueDate()}
              aria-invalid={duePast || undefined}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          {duePast ? (
            <p className="pr-assign__error">{t('practice.assign.duePast')}</p>
          ) : (
            !dueDate && <p className="pr-assign__hint">{t('practice.assign.dueNone')}</p>
          )}

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
                  <button type="button" disabled={busy || duePast} onClick={() => assign(occ.lessonId)}>
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
