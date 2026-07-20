import TutorShell from '../tutor/TutorShell.jsx'
import { useT } from '../i18n/LanguageContext.jsx'

// Транскрипт одного разговора с тьютором. Данные приходят пропсами из истории
// (бэкенд её пока не отдаёт — см. TutorManagePage); без них показываем пустое
// состояние вместо демо-переписки, которая раньше была захардкожена.
// Формат сообщения: { who: 'tutor' | 'me', text }.
export default function TutorChatHistoryPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  title,
  date,
  time,
  messages = [],
}) {
  const t = useT()
  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      title={title || t('manage.history')}
      layout="flow"
    >
      <div className="t-chat">
        {(date || time) && (
          <div className="t-chat__date">
            {date}
            {date && time && <br />}
            {time}
          </div>
        )}
        {messages.length === 0 ? (
          <p className="t-chat__empty">{t('chat.empty')}</p>
        ) : (
          <div className="t-chat__list">
            {messages.map((m, i) => (
              <div className={'t-bubble t-bubble--' + m.who} key={i}>
                {m.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </TutorShell>
  )
}
