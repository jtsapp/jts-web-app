import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import LessonTopics from './LessonTopics.jsx'
import LessonPeople from './LessonPeople.jsx'

// Правая колонка живого урока: одна карточка с двумя вкладками — «Темы» и
// «Группа» (макет «Онлайн-уроки»).
//
// До этого колонка показывала только темы, а состав класса был доступен одному
// преподавателю и жил вне колонки. Вкладки решают сразу две задачи макета:
// ученик групповой группы видит, с кем он занимается и кто на связи, а счётчик
// («Темы 5», «Группа 6») заменил собой заголовки блоков.
export default function LessonSidePanel({
  steps,
  activeStepId,
  statusById,
  onSelect,
  hiddenIds,
  teacherStepId,
  teacherId,
  teacherName,
  participants,
  onlineUserIds,
  selfUserId,
  isStaff,
  reviewStudentId,
  onWatch,
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState('topics')
  const topicsCount = (steps || []).length
  // Преподаватель считается вместе с учениками: во вкладке он такой же строкой.
  const peopleCount = (participants || []).length + 1

  const TABS = [
    { key: 'topics', label: t('live.topicsTab'), count: topicsCount },
    { key: 'people', label: t('live.peopleTab'), count: peopleCount },
  ]

  return (
    <div className="lw-card lv-side">
      <div className="lv-side__tabs" role="tablist" aria-label={t('lesson.ws.topics')}>
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`lv-side-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`lv-side-panel-${key}`}
            className={`lv-side__tab${tab === key ? ' is-active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
            <span className="lv-side__count">{count}</span>
          </button>
        ))}
      </div>

      <div
        className="lv-side__body"
        role="tabpanel"
        id={`lv-side-panel-${tab}`}
        aria-labelledby={`lv-side-tab-${tab}`}
      >
        {tab === 'topics' ? (
          <LessonTopics
            steps={steps}
            activeStepId={activeStepId}
            statusById={statusById}
            onSelect={onSelect}
            hiddenIds={hiddenIds}
            teacherStepId={teacherStepId}
          />
        ) : (
          <LessonPeople
            teacherId={teacherId}
            teacherName={teacherName}
            participants={participants}
            onlineUserIds={onlineUserIds}
            selfUserId={selfUserId}
            isStaff={isStaff}
            reviewStudentId={reviewStudentId}
            onWatch={onWatch}
          />
        )}
      </div>
    </div>
  )
}
