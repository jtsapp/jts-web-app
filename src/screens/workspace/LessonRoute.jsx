import { useI18n } from '../../i18n.jsx'
import { CheckIcon } from '../../components/icons.jsx'

// Левая колонка «Маршрут урока»: список шагов со статусами done/current/locked
// (statusById), вертикальным коннектором между ними и свободным кликом по
// любому шагу — в №1 (моковый урок) статусы чисто визуальные, навигация не
// блокируется (см. design-spec: «клик по любому шагу»), поэтому locked-шаг
// остаётся кликабельным <button> — просто приглушённым, с cursor: default.
export default function LessonRoute({ steps, activeStepId, statusById, onSelect }) {
  const { t } = useI18n()
  const list = steps || []

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

          return (
            <li key={step.id} className={`lw-route__item is-${status}`}>
              <button
                type="button"
                className={`lw-route__step is-${status}${isActive ? ' is-active' : ''}`}
                onClick={() => onSelect?.(step.id)}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="lw-route__marker" aria-hidden="true">
                  {status === 'done' && <CheckIcon size={13} />}
                </span>
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
