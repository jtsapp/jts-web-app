import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { SendIcon } from '../../components/icons.jsx'

// Чат с учителем: локальный стейт поля ввода (значение сообщений — у
// родителя, `messages`/`onSend`). Пустой ввод игнорируется — и по Enter, и по
// клику. Список автоскроллится вниз при добавлении сообщения (см. брифом
// «по желанию, но желательно»).
export default function TeacherChat({ messages, onSend }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState('')
  const listRef = useRef(null)
  const list = messages || []

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [list.length])

  function send() {
    const text = draft.trim()
    if (!text) return
    onSend?.(text)
    setDraft('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="lw-card lw-chat">
      <div className="lw-chat__head">
        <h2 className="lw-chat__title">{t('lesson.ws.chat')}</h2>
      </div>

      <div className="lw-chat__list" ref={listRef}>
        {list.length === 0 ? (
          <p className="lw-chat__empty">{t('lesson.ws.chatEmpty')}</p>
        ) : (
          list.map((message) => (
            <div key={message.id} className={`lw-chat__msg is-${message.from}`}>
              {/* Цвет и сторона пузыря кодируют отправителя по спеке, но
                  без подписи это неотличимо на скриншоте/для нового
                  собеседника — особенно когда несколько сообщений подряд
                  от одного. Показываем имя явным текстом. */}
              <span className="lw-chat__sender">
                {message.senderName || (message.from === 'student' ? t('lesson.ws.you') : t('lesson.ws.teacher'))}
              </span>
              {message.text}
            </div>
          ))
        )}
      </div>

      <div className="lw-chat__composer">
        <input
          type="text"
          className="lw-chat__input"
          placeholder={t('lesson.ws.message')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="lw-chat__send"
          onClick={send}
          disabled={!draft.trim()}
          title={t('lesson.ws.send')}
          aria-label={t('lesson.ws.send')}
        >
          <SendIcon size={16} />
        </button>
      </div>
    </div>
  )
}
