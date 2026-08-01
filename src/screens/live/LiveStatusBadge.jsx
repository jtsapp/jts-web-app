import { useI18n } from '../../i18n.jsx'
import { statusKey } from './liveStatus.js'

export default function LiveStatusBadge({ status }) {
  const { t } = useI18n()
  const key = statusKey(status)
  return <span className={`live-badge live-badge--${key}`}>{t(`live.status.${key}`)}</span>
}
