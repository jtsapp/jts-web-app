import TutorShell from '../tutor/TutorShell.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { callToMessages, callTitle, callDateTime } from '../tutor/callHistory.js'

// Транскрипт одного разговора с тьютором. `call` приходит из истории
// (TutorManagePage → App → сюда). Реплики берём из call.transcript;
// формат пузыря — { who: 'tutor' | 'me', text }.
export default function TutorChatHistoryPage({ user, onNavigate, onProfile, onBack, call }) {
  const { lang, t } = useLang()
  const messages = callToMessages(call)
  const title = call ? callTitle(call, t) : t('manage.history')
  const { date, time } = callDateTime(call, lang)
  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      title={title}
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
