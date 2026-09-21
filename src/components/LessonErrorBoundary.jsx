// Перехват падения урока. Без него ошибка рендера в плеере (например, шаг в
// формате, которого этот бандл ещё не знает: вкладка открыта до выкатки, а
// шаги урока скачались свежие) роняла всё приложение в белый экран — без
// сайдбара, без кнопки назад, понять ничего нельзя. Теперь падает только
// урок: ученик видит «обновите страницу» и может выйти.
import { Component } from 'react'
import { useI18n } from '../i18n.jsx'

function Fallback({ onExit }) {
  const { t } = useI18n()
  return (
    <div className="le-crash" role="alert">
      <p className="le-crash__text">{t('lesson.crashed')}</p>
      <div className="le-crash__actions">
        <button type="button" className="le-btn" onClick={() => window.location.reload()}>
          {t('lesson.crashedReload')}
        </button>
        {onExit && (
          <button type="button" className="le-btn le-btn--ghost" onClick={onExit}>
            {t('lesson.crashedExit')}
          </button>
        )}
      </div>
    </div>
  )
}

export default class LessonErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    // В консоль — чтобы по жалобе было что искать в DevTools.
    console.error('[lesson] урок упал:', error)
  }

  render() {
    if (this.state.failed) return <Fallback onExit={this.props.onExit} />
    return this.props.children
  }
}
