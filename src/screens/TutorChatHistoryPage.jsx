import TutorShell from '../tutor/TutorShell.jsx'

const MESSAGES = Array.from({ length: 12 }, (_, i) =>
  i % 2 === 0
    ? { who: 'tutor', text: 'Hello, Saken! How are you doing?' }
    : { who: 'me', text: 'Hello, Spark! I’m okay' },
)

export default function TutorChatHistoryPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  title = 'Практика Present Continious',
  date = 'Четверг, 12.06',
  time = '12:45',
}) {
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
        <div className="t-chat__date">
          {date}
          <br />
          {time}
        </div>
        <div className="t-chat__list">
          {MESSAGES.map((m, i) => (
            <div className={'t-bubble t-bubble--' + m.who} key={i}>
              {m.text}
            </div>
          ))}
        </div>
      </div>
    </TutorShell>
  )
}
