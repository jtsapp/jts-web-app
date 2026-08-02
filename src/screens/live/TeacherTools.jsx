import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getLessonNote, saveLessonNote, markNoShow, markParticipantCancelled } from '../../api.js'

// Teacher-only side tools: per-student private notes and attendance (mark no-show / cancel a
// participant). Attendance mutations return the updated participant, so we ask the parent to
// reload the lesson to reflect the new statuses.
export default function TeacherTools({ lessonId, token, participants, onRefresh }) {
  const { t } = useI18n()
  const list = participants || []
  // Derive the active student instead of syncing state in an effect: an explicit pick wins,
  // otherwise fall back to the first participant.
  const [picked, setPicked] = useState(null)
  const studentId = picked ?? list[0]?.studentId ?? null
  const [note, setNote] = useState('')
  const [savedNote, setSavedNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (studentId == null) return
    getLessonNote(token, lessonId, studentId)
      .then((n) => { setNote(n?.body || ''); setSavedNote(n?.body || '') })
      .catch(() => { setNote(''); setSavedNote('') })
  }, [studentId, lessonId, token])

  async function save() {
    if (studentId == null) return
    setBusy(true)
    try { await saveLessonNote(token, lessonId, studentId, note); setSavedNote(note) }
    catch { /* keep the draft */ }
    finally { setBusy(false) }
  }

  const attendance = async (fn) => { await fn(token, lessonId, studentId).catch(() => {}); onRefresh?.() }
  const current = list.find((p) => p.studentId === studentId)

  return (
    <section className="ttools" aria-label={t('ttools.title')}>
      <h3 className="ttools__title">{t('ttools.title')}</h3>

      {list.length === 0 && <p className="ttools__empty">{t('ttools.noStudents')}</p>}

      {list.length > 0 && (
        <>
          <label className="ttools__field">
            <span className="ttools__label">{t('ttools.student')}</span>
            <select value={studentId ?? ''} onChange={(e) => setPicked(Number(e.target.value))}>
              {list.map((p) => <option key={p.studentId} value={p.studentId}>{p.studentName || `#${p.studentId}`}</option>)}
            </select>
          </label>

          {current && (
            <div className="ttools__attendance">
              <span className="ttools__status">{t(`ttools.status.${statusKey(current.status)}`)}</span>
              <button type="button" onClick={() => attendance(markNoShow)}>{t('ttools.noShow')}</button>
              <button type="button" className="is-danger" onClick={() => attendance(markParticipantCancelled)}>{t('ttools.cancel')}</button>
            </div>
          )}

          <label className="ttools__field">
            <span className="ttools__label">{t('ttools.note')}</span>
            <textarea className="ttools__note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('ttools.notePlaceholder')} />
          </label>
          <button type="button" className="ttools__save" onClick={save} disabled={busy || note === savedNote}>{t('ttools.saveNote')}</button>
        </>
      )}
    </section>
  )
}

function statusKey(status) {
  switch (status) {
    case 'PRESENT': return 'present'
    case 'NO_SHOW': return 'noShow'
    case 'CANCELLED': return 'cancelled'
    default: return 'scheduled'
  }
}
