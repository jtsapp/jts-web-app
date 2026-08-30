import { useI18n } from '../../i18n.jsx'

// «Темы урока» — единственный список тем в живом уроке (макет «Онлайн-уроки»).
//
// Раньше то же самое жило двумя блоками: «Маршрут урока» отдельной колонкой
// слева (LessonRoute) и «Топики урока» справа (TopicsList). В макете колонки
// слева нет ни на одном экране, а список один — с тремя состояниями строки:
// пройдено (галочка), текущая (заливка), впереди (пустой кружок). Переходить
// по темам всё так же можно кликом — этим список и заменяет маршрут.
//
// Заголовка и счётчика у списка нет: и то и другое ушло во вкладку колонки
// («Темы N», см. LessonSidePanel) — в макете список начинается сразу строками.
//
// Бегунка «У» здесь нет: ученик и так стоит на подсвеченной теме. А вот где
// преподаватель — метка осталась: раньше это показывал бегунок «Т» на треке
// маршрута, и без неё ученик не видит, что учитель ушёл смотреть другую тему.
// Преподаватель, в свою очередь, узнаёт позицию ученика из баннера над
// заданием («{имя} сейчас на шаге …») — см. LiveLessonPage.
export default function LessonTopics({ steps, activeStepId, statusById, onSelect, hiddenIds, teacherStepId }) {
  const { t } = useI18n()
  // Скрытые темы видит только преподаватель — у ученика их вовсе нет в списке
  // (`visibleSteps` отфильтровал их выше по течению). Бейдж макета «Скрыто от
  // ученика» стоит на карточке задания, но скрывается у нас тема целиком —
  // значит и метка её.
  const hidden = new Set((hiddenIds || []).map(String))
  const list = steps || []

  return (
    <ol className="lv-topics__list">
      {list.map((step) => {
        const status = statusById?.[step.id] || 'locked'
        const isActive = String(step.id) === String(activeStepId)

        return (
          <li key={step.id} className={`lv-topics__item is-${status}${isActive ? ' is-active' : ''}`}>
            <button
              type="button"
              className="lv-topics__btn"
              onClick={() => onSelect?.(step.id)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="lv-topics__marker" aria-hidden="true">
                {status === 'done' && !isActive && (
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
                    <path d="m4 8.4 2.6 2.6L12 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="lv-topics__text">
                {step.title}
                {teacherStepId != null && String(step.id) === String(teacherStepId) && (
                  <span className="lv-topics__teacher" title={t('lesson.ws.riderTeacher')}>
                    {t('lesson.ws.riderTeacherShort')}
                  </span>
                )}
                {hidden.has(String(step.id)) && (
                  <span className="lv-topics__hidden">{t('live.hiddenFromStudent')}</span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
