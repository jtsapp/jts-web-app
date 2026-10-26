import { useMatching } from './matchingStore.js'
import { matchingView } from './matchingState.js'
import { useMatchingT } from './texts.js'

// В «Уроках» вместо прежней панели подбора — короткая ссылка в «Мой учитель», пока учитель не назначен: сам подбор
// живёт в своём разделе (ТЗ 08 §1), а «Расписание» ученик по-прежнему ищет здесь.
const SHOWN = new Set(['none', 'tariff_pending', 'matching', 'manager_picking', 'schedule_proposed', 'change_requested', 'confirm_expired'])

export default function MatchingLinkCard({ token, onOpen }) {
  const { t } = useMatchingT()
  const view = matchingView(useMatching(token))
  if (!SHOWN.has(view.status)) return null
  const action = view.badge > 0
  return (
    <div className="mt">
      <div className={`mt-banner ${action ? 'mt-banner--brand' : 'mt-banner--warn'}`} style={{ marginBottom: 16 }}>
        <p>
          <b>{t('st.' + view.status)}</b>
          {view.status === 'none' && <span className="mt-muted"> · {t('link.noneText')}</span>}
        </p>
        <button type="button" className="mt-btn mt-btn--sm" onClick={onOpen}>
          {t('link.open')}
        </button>
      </div>
    </div>
  )
}
