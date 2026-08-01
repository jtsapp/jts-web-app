import { useI18n } from '../../i18n.jsx'

export default function PresenceRoster({ roster, connected, nameFor }) {
  const { t } = useI18n()
  return (
    <div className="live__section">
      <div className="live__section-h">
        {t('live.roster.title')}
        <span className={`live-conn ${connected ? 'live-conn--on' : 'live-conn--off'}`}>
          {connected ? t('live.connected') : t('live.disconnected')}
        </span>
      </div>
      {roster.length === 0 ? (
        <div className="live-roster__name">{t('live.roster.empty')}</div>
      ) : (
        <div className="live-roster">
          {roster.map((p) => {
            const label = nameFor(p.userId)
            const initial = (label || '·').trim().charAt(0).toUpperCase()
            return (
              <div key={p.userId} className="live-roster__item">
                <span className="live-roster__avatar">{initial}<span className="live-roster__dot" /></span>
                <span className="live-roster__name">{label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
