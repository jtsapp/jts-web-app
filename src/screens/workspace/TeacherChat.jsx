import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { SendIcon, ImageIcon } from '../../components/icons.jsx'
import { uploadMedia } from '../../api.js'

/**
 * Lesson chat (student ↔ teacher).
 *
 * `messages[].from`:
 *  - `student` — own bubble (right, orange) — class name kept for design-spec tests
 *  - anything else — peer bubble (left, purple)
 */
export default function TeacherChat({ messages, onSend, title, sending = false, token }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const listRef = useRef(null)
  const fileRef = useRef(null)
  const list = messages || []

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [list.length])

  function send() {
    const text = draft.trim()
    if (!text || sending) return
    onSend?.(text)
    setDraft('')
  }

  /**
   * Фотография в чат: два шага, как везде с файлами — сначала в хранилище,
   * потом сообщение со ссылкой. Подпись берём из поля, если она набрана.
   */
  async function onPickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || photoBusy || !token) return
    if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) return
    setPhotoBusy(true)
    try {
      const { url } = await uploadMedia(token, file)
      if (url) {
        onSend?.(draft.trim(), { url, name: file.name })
        setDraft('')
      }
    } catch {
      /* не отправилось — черновик остаётся на месте */
    } finally {
      setPhotoBusy(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="lw-card lw-chat">
      <div className="lw-chat__head">
        <h2 className="lw-chat__title">{title || t('lesson.ws.chat')}</h2>
        <span className="lw-chat__hint">{t('lesson.ws.chatHint')}</span>
      </div>

      <div className="lw-chat__list" ref={listRef} role="log" aria-live="polite">
        {list.length === 0 ? (
          <div className="lw-chat__empty">
            <span className="lw-chat__empty-icon" aria-hidden="true">💬</span>
            <p>{t('lesson.ws.chatEmpty')}</p>
          </div>
        ) : (
          list.map((message) => {
            const own = message.from === 'student'
            return (
              <div
                key={message.id}
                className={`lw-chat__msg ${own ? 'is-student' : ''}`}
              >
                <span className="lw-chat__sender">
                  {message.senderName
                    || (own ? t('lesson.ws.you') : t('lesson.ws.teacher'))}
                </span>
                {message.photoUrl && (
                  <a className="lw-chat__photo" href={message.photoUrl} target="_blank" rel="noreferrer">
                    <img src={message.photoUrl} alt={message.photoName || t('lesson.ws.photo')} loading="lazy" />
                  </a>
                )}
                {message.text && <span className="lw-chat__text">{message.text}</span>}
              </div>
            )
          })
        )}
      </div>

      <div className="lw-chat__composer">
        <button
          type="button"
          className="lw-chat__photo-btn"
          onClick={() => fileRef.current?.click()}
          disabled={sending || photoBusy || !token}
          title={t('lesson.ws.photo')}
          aria-label={t('lesson.ws.photo')}
        >
          <ImageIcon size={16} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickPhoto} />
        <input
          type="text"
          className="lw-chat__input"
          placeholder={t('lesson.ws.message')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          autoComplete="off"
        />
        <button
          type="button"
          className="lw-chat__send"
          onClick={send}
          disabled={sending || !draft.trim()}
          title={t('lesson.ws.send')}
          aria-label={t('lesson.ws.send')}
        >
          <SendIcon size={16} />
        </button>
      </div>
    </div>
  )
}
