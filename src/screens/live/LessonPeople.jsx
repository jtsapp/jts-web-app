import { useI18n } from '../../i18n.jsx'

// «Группа» — кто ведёт урок и кто на нём учится (макет «Онлайн-уроки», вкладка
// рядом с темами).
//
// Раньше состав класса видел только преподаватель, и то строкой над уроком
// (PresenceRoster) плюс отдельным рядом плиток для выбора просматриваемого
// ученика (StudentReviewPicker). Ученику в групповом уроке не показывалось
// ничего: он не знал ни кто с ним в классе, ни на связи ли остальные. Оба
// прежних блока сходятся здесь — список один, а действие «Смотреть экран»
// живёт на строке ученика, как в макете.
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

/** Строка списка: аватар с точкой присутствия, имя и действие справа. */
function PersonRow({ name, online, self, action }) {
  const { t } = useI18n()
  return (
    <li className={`lv-people__row${self ? ' is-self' : ''}`}>
      <span className="lv-people__avatar" aria-hidden="true">
        {initials(name)}
        {/* Точку рисуем всегда, а не только для «онлайн»: иначе отсутствие
            точки читается как «данных нет», а не как «человека нет в классе». */}
        <span className={`lv-people__dot${online ? ' is-on' : ''}`} />
      </span>
      <span className="lv-people__name">
        {self ? t('live.roster.you') : name}
      </span>
      {action}
    </li>
  )
}

export default function LessonPeople({
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
  const students = participants || []
  const isOnline = (id) => Boolean(onlineUserIds?.has(id))

  return (
    <div className="lv-people">
      <p className="lv-people__label">{t('live.peopleTeachers')}</p>
      <ul className="lv-people__list">
        <PersonRow
          name={teacherName || t('lesson.ws.teacher')}
          online={isOnline(teacherId)}
          self={isStaff && teacherId != null && teacherId === selfUserId}
        />
      </ul>

      {students.length > 0 && (
        <ul className="lv-people__list">
          {students.map((p) => {
            const self = p.studentId === selfUserId
            return (
              <PersonRow
                key={p.studentId}
                name={p.studentName || `#${p.studentId}`}
                online={isOnline(p.studentId)}
                self={self}
                action={
                  // Вызвать и смотреть чужую работу может только преподаватель:
                  // у ученика такого права нет ни на бэкенде, ни по смыслу урока.
                  isStaff && !self ? (
                    <span className="lv-people__actions">
                      {onCall && (
                        <button
                          type="button"
                          className="lv-people__act"
                          onClick={() => onCall(p.studentId)}
                        >
                          {t('live.callStudent')}
                        </button>
                      )}
                      {onWatch && (
                        <button
                          type="button"
                          className={`lv-people__act${p.studentId === reviewStudentId ? ' is-active' : ''}`}
                          onClick={() => onWatch(p.studentId)}
                        >
                          {t('live.watchScreen')}
                        </button>
                      )}
                    </span>
                  ) : null
                }
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
