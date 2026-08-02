import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { setLessonMeetingUrl } from '../../api.js'

// Video call = an external meeting link (Google Meet / Zoom) pinned on the lesson, exactly as
// web-admin does it — no real getUserMedia/WebRTC in this iteration, hence the "Demo" badge.
// The teacher can set/clear the link (optionally across the whole recurring series).
export default function VideoCall({ lessonId, token, meetingUrl, isStaff, onRefresh }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(meetingUrl || '')
  const [wholeSeries, setWholeSeries] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try { await setLessonMeetingUrl(token, lessonId, draft, wholeSeries); setEditing(false); onRefresh?.() }
    catch { /* leave the editor open so the teacher can retry */ }
    finally { setBusy(false) }
  }

  return (
    <section className="video" aria-label={t('video.title')}>
      <div className="video__head">
        <h3 className="video__title">{t('video.title')}</h3>
        <span className="video__demo">{t('video.demo')}</span>
      </div>

      {meetingUrl && !editing && (
        <a className="video__join" href={meetingUrl} target="_blank" rel="noopener noreferrer">{t('video.join')}</a>
      )}
      {!meetingUrl && !editing && <p className="video__empty">{t('video.none')}</p>}

      {isStaff && !editing && (
        <button type="button" className="video__edit" onClick={() => { setDraft(meetingUrl || ''); setEditing(true) }}>
          {meetingUrl ? t('video.change') : t('video.add')}
        </button>
      )}

      {isStaff && editing && (
        <div className="video__editor">
          <input
            className="video__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://meet.google.com/…"
            aria-label={t('video.linkLabel')}
          />
          <label className="video__series">
            <input type="checkbox" checked={wholeSeries} onChange={(e) => setWholeSeries(e.target.checked)} />
            {t('video.wholeSeries')}
          </label>
          <div className="video__editor-actions">
            <button type="button" className="video__save" onClick={save} disabled={busy}>{t('video.save')}</button>
            <button type="button" className="video__cancel" onClick={() => setEditing(false)} disabled={busy}>{t('video.cancel')}</button>
          </div>
        </div>
      )}
    </section>
  )
}
