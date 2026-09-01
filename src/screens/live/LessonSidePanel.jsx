import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import LessonTopics from './LessonTopics.jsx'
import LessonPeople from './LessonPeople.jsx'

// Правая колонка живого урока: одна карточка с двумя вкладками — «Темы» и
// «Группа» (макет «Онлайн-уроки»).
//
// До этого колонка показывала только темы, а состав класса был доступен одному
// преподавателю и жил вне колонки. Вкладки дают ученику групповой группы
// увидеть, с кем он занимается и кто на связи.
//
// Без счётчиков: числа рядом с названиями («Темы 5», «Группа 6») ученик читал
// как порядковые номера вкладок, а не как размер списка, — а сам список он и
// так видит, открыв вкладку.
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
  onCall,
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState('topics')

  const TABS = [
    { key: 'topics', label: t('live.topicsTab') },
    { key: 'people', label: t('live.peopleTab') },
  ]

  return (
    <div className="lw-card lv-side">
      <div className="lv-side__tabs" role="tablist" aria-label={t('lesson.ws.topics')}>
        {TABS.map(({ key, label }) => (
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
            onCall={onCall}
          />
        )}
      </div>
    </div>
  )
}
