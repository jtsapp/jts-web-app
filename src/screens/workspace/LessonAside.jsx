import CallTile from './CallTile.jsx'
import TopicsList from './TopicsList.jsx'
import TeacherChat from './TeacherChat.jsx'

// Правая колонка workspace: плитка звонка (заглушка) + топики урока + чат с
// учителем — три `.lw-card`, друг под другом с общим gap (см. `.lw-aside` в
// lessonWorkspace.css).
export default function LessonAside({ lesson, activeTopicId, messages, onSend, onCall }) {
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
      <TopicsList topics={lesson?.topics} activeTopicId={activeTopicId} />
      <TeacherChat messages={messages} onSend={onSend} />
    </div>
  )
}
