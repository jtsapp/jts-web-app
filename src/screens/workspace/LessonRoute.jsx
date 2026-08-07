import { useI18n } from '../../i18n.jsx'

// Левая колонка «Маршрут урока»: список шагов со статусами done/current/locked
// (statusById), вертикальным треком между ними и свободным кликом по любому
// шагу — в №1 (моковый урок) статусы чисто визуальные, навигация не
// блокируется (см. design-spec: «клик по любому шагу»), поэтому locked-шаг
// остаётся кликабельным <button> — просто приглушённым.
//
// Бегунки «У» и «Т» показывают, на каком шаге сейчас ученик и тьютор. Они
// рендерятся внутри своей строки, а не позиционируются от верха списка:
// названия шагов переносятся на две строки, так что вычислять смещение
// пришлось бы измерением DOM. Позиции независимы — по спеке тьютор может
// открыть шаг вперёд или назад, не утягивая ученика.
export default function LessonRoute({
  steps,
  activeStepId,
  statusById,
  onSelect,
  studentStepId,
  teacherStepId,
}) {
  const { t } = useI18n()
  const list = steps || []

  // Ученик стоит там, где он сейчас смотрит, пока явно не сказано иное.
  const studentAt = studentStepId ?? activeStepId
  const teacherAt = teacherStepId ?? null

  return (
    <nav className="lw-route" aria-label={t('lesson.ws.route')}>
      <div className="lw-route__head">
        <h2 className="lw-route__title">{t('lesson.ws.route')}</h2>
        <span className="lw-route__count">{t('lesson.ws.steps', { n: list.length })}</span>
      </div>

      <ol className="lw-route__list">
        {list.map((step) => {
          const status = statusById?.[step.id] || 'locked'
          const isActive = step.id === activeStepId
          const hasStudent = step.id === studentAt
          const hasTeacher = step.id === teacherAt

          return (
            <li
              key={step.id}
              className={`lw-route__item is-${status}${hasStudent || hasTeacher ? ' has-rider' : ''}`}
            >
              {(hasStudent || hasTeacher) && (
                <span className="lw-route__riders">
                  {hasStudent && (
                    <span
                      className="lw-route__rider lw-route__rider--student"
                      title={t('lesson.ws.riderStudent')}
                    >
                      {t('lesson.ws.riderStudentShort')}
                    </span>
                  )}
                  {hasTeacher && (
                    <span
                      className="lw-route__rider lw-route__rider--teacher"
                      title={t('lesson.ws.riderTeacher')}
                    >
                      {t('lesson.ws.riderTeacherShort')}
                    </span>
                  )}
                </span>
              )}

              <button
                type="button"
                className={`lw-route__step is-${status}${isActive ? ' is-active' : ''}`}
                onClick={() => onSelect?.(step.id)}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="lw-route__marker" aria-hidden="true" />
                <span className="lw-route__body">
                  <span className="lw-route__num">
                    {t('lesson.ws.step', { n: String(step.order).padStart(2, '0') })}
                  </span>
                  <span className="lw-route__title-text">{step.title}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
