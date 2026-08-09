import { useI18n } from '../../i18n.jsx'

// Кто сейчас в классе — строкой в шапке урока, а не отдельной секцией.
//
// Раньше это была карточка во всю ширину с заголовком и списком имён: она
// съедала верх экрана и отодвигала вниз то, ради чего урок и открывают — сам
// материал. Информации в ней на одну строку (обычно двое), поэтому строкой она
// и стала: аватары с онлайн-точкой плюс состояние связи.
export default function PresenceRoster({ roster, connected, nameFor }) {
  const { t } = useI18n()
  const list = roster || []

  return (
    <div className="live-presence">
      <div className="live-presence__people">
        {list.length === 0 ? (
          <span className="live-presence__empty">{t('live.roster.empty')}</span>
        ) : (
          list.map((p) => {
            const label = nameFor(p.userId)
            const initial = (label || '·').trim().charAt(0).toUpperCase()
            return (
              <span key={p.userId} className="live-presence__item" title={label}>
                <span className="live-presence__avatar" aria-hidden="true">{initial}</span>
                <span className="live-presence__name">{label}</span>
              </span>
            )
          })
        )}
      </div>
      <span className={`live-conn ${connected ? 'live-conn--on' : 'live-conn--off'}`}>
        {connected ? t('live.connected') : t('live.disconnected')}
      </span>
    </div>
  )
}
