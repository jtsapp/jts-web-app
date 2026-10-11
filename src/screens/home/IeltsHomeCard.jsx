import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getIeltsMe } from '../../api.js'

/**
 * Верх «Главной» у ученика с аккаунтом IELTS — вместо уровня General English. Курса General English у такого ученика
 * нет, поэтому карточка уровня с чужими цифрами и приглашение на письменный тест уровня (CEFR) для него неверны:
 * его старт — онбординг и диагностика IELTS, а дальше — план дня в разделе IELTS. Вид — тот же блок, что у
 * приглашения на тест (hm-placement), чтобы «Главная» не меняла сетку.
 */
export default function IeltsHomeCard({ token, onNav }) {
  const { t } = useI18n()
  const [me, setMe] = useState(null)
  useEffect(() => {
    let alive = true
    getIeltsMe(token).then((m) => alive && setMe(m)).catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  const started = !!me?.onboarded
  const track = me?.track === 'general' ? 'General Training' : 'Academic'
  return (
    <section className="hm-card hm-placement hm-ielts">
      <span className="hm-ielts__chip">IELTS · {track}</span>
      <h1 className="hm-placement__title">{t(started ? 'home.ielts.titleGo' : 'home.ielts.titleStart')}</h1>
      <p className="hm-placement__sub">
        {started ? t('home.ielts.subGo', { programme: me?.programmeName || 'IELTS' }) : t('home.ielts.subStart')}
      </p>
      <button type="button" className="hm-placement__cta" onClick={() => onNav?.(started ? 'ielts' : 'ielts-onboarding')}>
        {t(started ? 'home.ielts.ctaGo' : 'home.ielts.ctaStart')}
      </button>
    </section>
  )
}
