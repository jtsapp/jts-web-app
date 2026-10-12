import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getIeltsMe, getIeltsProfile } from '../../api.js'

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
  // онбординг пройден, а материалы ещё закрыты (backend V324): заявка у менеджера — до диагностики можно дойти и сейчас
  const waiting = started && me?.access === false
  // Пройдена ли диагностика, plan/me не говорит — смотрим баллы в профиле, и только пока ждём менеджера: раньше карточка
  // звала «Пройти диагностику» и после неё, и ученик проходил её заново вместо того, чтобы увидеть результат.
  const [diagnosed, setDiagnosed] = useState(false)
  useEffect(() => {
    if (!waiting) return undefined
    let alive = true
    getIeltsProfile(token)
      .then((p) => alive && setDiagnosed(p?.bands?.overall != null))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token, waiting])
  const track = me?.track === 'general' ? 'General Training' : 'Academic'
  const key = waiting ? (diagnosed ? 'WaitDone' : 'Wait') : started ? 'Go' : 'Start'
  return (
    <section className="hm-card hm-placement hm-ielts">
      <span className="hm-ielts__chip">IELTS · {track}</span>
      <h1 className="hm-placement__title">{t(`home.ielts.title${key}`)}</h1>
      <p className="hm-placement__sub">
        {key === 'Go' ? t('home.ielts.subGo', { programme: me?.programmeName || 'IELTS' }) : t(`home.ielts.sub${key}`)}
      </p>
      <button type="button" className="hm-placement__cta" onClick={() => onNav?.(waiting ? (diagnosed ? 'ielts-diagnostic-result' : 'ielts-diagnostic') : started ? 'ielts' : 'ielts-onboarding')}>
        {t(`home.ielts.cta${key}`)}
      </button>
    </section>
  )
}
