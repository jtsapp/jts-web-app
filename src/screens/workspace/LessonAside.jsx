import CallTile from './CallTile.jsx'
import TopicsList from './TopicsList.jsx'
import TeacherChat from './TeacherChat.jsx'

// Правая колонка workspace: плитка звонка (заглушка) + топики урока + чат с
// учителем — три `.lw-card`, друг под другом с общим gap (см. `.lw-aside` в
// lessonWorkspace.css).
export default function LessonAside({ lesson, activeTopicId, messages, onSend }) {
  return (
    <div className="lw-aside">
      <CallTile teacherName={lesson?.teacher?.name} />
      <TopicsList topics={lesson?.topics} activeTopicId={activeTopicId} />
      <TeacherChat messages={messages} onSend={onSend} />
    </div>
  )
}
