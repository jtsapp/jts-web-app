import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getLessonMessages, sendLessonMessage } from '../../api.js'

// Lesson chat for both roles. The backend has no chat STOMP topic, so messages are loaded
// over REST and lightly polled while the panel is mounted (same approach as the lesson-status
// poll in LiveLessonPage). Sending returns the full, fresh message list.
const POLL_MS = 8000

export default function LessonChat({ lessonId, token, selfUserId }) {
  const { t } = useI18n()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    let alive = true
    const load = () => getLessonMessages(token, lessonId).then((m) => { if (alive) setMessages(m || []) }).catch(() => {})
    load()
    const id = setInterval(load, POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [lessonId, token])

  useEffect(() => {
    // Keep the newest message in view.
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  async function send(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      const list = await sendLessonMessage(token, lessonId, text)
      if (Array.isArray(list)) setMessages(list)
      setDraft('')
    } catch { /* keep draft so the user can retry */ }
    finally { setBusy(false) }
  }

  return (
    <section className="chat" aria-label={t('chat.title')}>
      <h3 className="chat__title">{t('chat.title')}</h3>
      <div className="chat__list" ref={listRef}>
        {messages.length === 0 && <p className="chat__empty">{t('chat.empty')}</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat__msg${m.senderUserId === selfUserId ? ' is-self' : ''}`}>
            <span className="chat__msg-meta">
              <span className="chat__msg-name">{m.senderUserId === selfUserId ? t('live.roster.you') : (m.senderName || `#${m.senderUserId}`)}</span>
              {m.createdAt && <time className="chat__msg-time">{formatTime(m.createdAt)}</time>}
            </span>
            <span className="chat__msg-body">{m.body}</span>
          </div>
        ))}
      </div>
      <form className="chat__form" onSubmit={send}>
        <input
          className="chat__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('chat.placeholder')}
          aria-label={t('chat.placeholder')}
        />
        <button type="submit" className="chat__send" disabled={busy || !draft.trim()}>{t('chat.send')}</button>
      </form>
    </section>
  )
}

function formatTime(iso) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
