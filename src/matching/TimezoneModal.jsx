import { useMemo, useState } from 'react'
import { saveMatchingTimezone } from '../api.js'
import { applyMatchingCard } from './matchingStore.js'
import { MtModal, errorText, useBusy } from './ui.jsx'
import { deviceTimezone, utcLabel } from './slots.js'
import { useMatchingT } from './texts.js'

// Пояса, которые ученикам школы нужны чаще всего (ТЗ §3: определяется по устройству, меняется вручную). Остальные —
// полным списком IANA ниже, если браузер его отдаёт.
const FEATURED = ['Asia/Almaty', 'Europe/Moscow', 'Asia/Bishkek', 'Asia/Tashkent', 'Asia/Dubai', 'Asia/Seoul', 'Europe/London', 'Europe/Berlin']

export function zoneName(tz) {
  return String(tz || '').split('/').pop().replace(/_/g, ' ')
}

export function zoneTitle(tz) {
  return `${zoneName(tz)} (${utcLabel(tz)})`
}

export default function TimezoneModal({ token, current, onClose, onSaved }) {
  const { t } = useMatchingT()
  const device = deviceTimezone()
  const [value, setValue] = useState(current || device)
  const [error, setError] = useState('')
  const [busy, run] = useBusy()
  const others = useMemo(() => {
    try {
      return (Intl.supportedValuesOf?.('timeZone') || []).filter((z) => !FEATURED.includes(z) && z !== device)
    } catch {
      return []
    }
  }, [device])

  const save = () =>
    run(async () => {
      setError('')
      try {
        applyMatchingCard(await saveMatchingTimezone(token, value))
        onSaved?.(t('tz.saved'))
        onClose()
      } catch (e) {
        setError(errorText(e, t))
      }
    })

  return (
    <MtModal title={t('tz.title')} onClose={onClose}>
      <p className="mt-small mt-muted">{t('tz.note')}</p>
      <select className="mt-select" value={value} onChange={(e) => setValue(e.target.value)} aria-label={t('tz.title')}>
        <option value={device}>{t('tz.auto', { tz: zoneTitle(device) })}</option>
        {FEATURED.filter((z) => z !== device).map((z) => <option key={z} value={z}>{zoneTitle(z)}</option>)}
        {others.length > 0 && (
          <optgroup label={t('tz.other')}>
            {others.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </optgroup>
        )}
      </select>
      {error && <p className="mt-small mt-error" role="alert">{error}</p>}
      <div className="mt-row mt-end">
        <button type="button" className="mt-btn mt-btn--line" onClick={onClose}>{t('btn.cancel')}</button>
        <button type="button" className="mt-btn" disabled={busy} onClick={save}>{t('btn.save')}</button>
      </div>
    </MtModal>
  )
}
