import { useI18n } from '../../i18n.jsx'
import Logo from '../../components/Logo.jsx'
import { CloseIcon } from '../../components/icons.jsx'

// mm:ss без внешних зависимостей; NaN/отрицательные значения → 00:00.
function formatTime(totalSeconds) {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Шапка workspace живого урока: логотип, бейдж уровня + unit, точки-прогресс
// по шагам (пройдено = stepIndex, текущая — длиннее капсула), таймер
// elapsed/duration, «Выйти из урока».
export default function WorkspaceHeader({ lesson, stepIndex, elapsedSec, onExit }) {
  const { t } = useI18n()
  const steps = lesson?.steps || []
  const progressLabel = `${t('lesson.ws.step', { n: String(stepIndex + 1).padStart(2, '0') })} / ${steps.length}`

  return (
    <header className="lw-header">
      <div className="lw-header__left">
        <Logo />
        {lesson?.level && <span className="lw-header__badge">{lesson.level}</span>}
        {lesson?.unit && <span className="lw-header__unit">{lesson.unit}</span>}
      </div>

      {steps.length > 0 && (
        <ul className="lw-header__progress" aria-label={progressLabel}>
          {steps.map((step, i) => (
            <li
              key={step.id}
              aria-hidden="true"
              className={`lw-header__dot${i < stepIndex ? ' is-done' : i === stepIndex ? ' is-current' : ''}`}
            />
          ))}
        </ul>
      )}

      <div className="lw-header__right">
        <span className="lw-header__timer">
          {formatTime(elapsedSec)}
          <span className="lw-header__timer-sep"> / </span>
          {formatTime(lesson?.durationSec)}
        </span>
        <button type="button" className="lw-header__exit" onClick={onExit}>
          <CloseIcon size={16} />
          <span className="lw-header__exit-label">{t('lesson.ws.exit')}</span>
        </button>
      </div>
    </header>
  )
}
