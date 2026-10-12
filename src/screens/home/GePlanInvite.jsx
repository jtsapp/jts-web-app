import { useI18n } from '../../i18n.jsx'

/**
 * Приглашение и следующий шаг плана General English на «Главной» (спека 2026-10-12, секция 3): «Составим ваш план»,
 * «Пройдите тест — посчитаем срок», «Выберите, как будете заниматься». Вид — прежней карточки «Пройдите тестирование».
 */
export default function GePlanInvite({ state, level, percent, onStart, onTest, onRoute }) {
  const { t } = useI18n()
  const action = state === 'needTest' ? onTest : state === 'needRoute' ? onRoute : onStart
  const sub =
    state === 'invite' && level
      ? t(typeof percent === 'number' ? 'geHome.invite.subLevel' : 'geHome.invite.subLevelNoPct', { level, percent: String(percent) })
      : t(`geHome.${state}.sub`)
  return (
    <section className="hm-card hm-placement ge-invite">
      <h1 className="hm-placement__title">{t(`geHome.${state}.title`)}</h1>
      <p className="hm-placement__sub">{sub}</p>
      <button type="button" className="hm-placement__cta" onClick={() => action?.()}>
        {t(`geHome.${state}.cta`)}
      </button>
    </section>
  )
}
