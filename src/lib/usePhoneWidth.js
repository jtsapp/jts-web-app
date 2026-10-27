import { useEffect, useState } from 'react'

// Телефонная ширина мобильного слоя (src/mobile/*.css, ≤560px) — для разметки,
// которой на телефоне по макету приложения другая (неделя вместо месяца в
// расписании, «Следующий материал» в «Самостоятельно»). Узнаём после
// монтирования и следим за поворотом: первый рендер совпадает с серверным, без
// hydration mismatch.
export function usePhoneWidth() {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia?.('(max-width: 560px)') : null
    if (!mq) return undefined
    const sync = () => setPhone(mq.matches)
    sync()
    mq.addEventListener?.('change', sync)
    return () => mq.removeEventListener?.('change', sync)
  }, [])
  return phone
}
