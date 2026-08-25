import CallTile from './CallTile.jsx'
import TeacherChat from './TeacherChat.jsx'

// Правая колонка workspace: плитка звонка и чат с учителем — два `.lw-card`
// друг под другом с общим gap (см. `.lw-aside` в lessonWorkspace.css).
export default function LessonAside({ lesson, messages, onSend, onCall }) {
  return (
    <div className="lw-aside">
      {/* Состояние звонка приходит из урока: пока бэкенд его не отдаёт, урок
          считается идущим — плитка показывает видео, а не приглашение
          позвонить. Когда поле появится, свёрнутый вид включится сам. */}
      <CallTile
        teacherName={lesson?.teacher?.name}
        connected={lesson?.call?.connected ?? true}
        onCall={onCall}
      />
      <TeacherChat messages={messages} onSend={onSend} />
    </div>
  )
}
