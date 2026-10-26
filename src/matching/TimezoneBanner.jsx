import { useState } from 'react'
import { saveMatchingTimezone } from '../api.js'
import { applyMatchingCard } from './matchingStore.js'
import { deviceTimezone, zoneOffsetMin } from './slots.js'
import { zoneTitle } from './TimezoneModal.jsx'
import { useMatchingT } from './texts.js'

const dismissKey = (tz) => `jts_matching_tz_dismissed:${tz}`

// «Похоже, вы в другом часовом поясе ({tz}). Показывать время по нему?» (ТЗ §2.12, уведомление №21). Сравниваем
// смещения, а не имена: Asia/Almaty и Asia/Qostanay — один и тот же час. «Нет» помним на устройстве для этого пояса.
export default function TimezoneBanner({ token, saved, toast }) {
  const { t } = useMatchingT()
  const device = deviceTimezone()
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(dismissKey(device)) === '1'
    } catch {
      return false
    }
  })
  if (!saved || hidden || zoneOffsetMin(saved) === zoneOffsetMin(device)) return null
  const yes = async () => {
    try {
      applyMatchingCard(await saveMatchingTimezone(token, device))
      toast?.(t('tz.saved'))
    } catch {
      /* баннер останется — ученик может поменять пояс в профиле */
    }
  }
  const no = () => {
    try {
      localStorage.setItem(dismissKey(device), '1')
    } catch {
      /* без хранилища баннер вернётся при следующем заходе */
    }
    setHidden(true)
  }
  return (
    <div className="mt-banner mt-banner--brand">
      <p>{t('tz.banner', { tz: zoneTitle(device) })}</p>
      <div className="mt-row">
        <button type="button" className="mt-btn mt-btn--sm" onClick={yes}>{t('tz.yes')}</button>
        <button type="button" className="mt-btn mt-btn--sm mt-btn--line" onClick={no}>{t('tz.no')}</button>
      </div>
    </div>
  )
}
