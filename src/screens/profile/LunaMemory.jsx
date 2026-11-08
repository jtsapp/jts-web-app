import { useI18n } from '../../i18n.jsx'

// «Память Луны» (ТЗ v2.0, 8.1): список фактов, которые Луна запомнила, и «удалить» у каждого. Один компонент на обе
// раскладки: на компьютере — карточка в Профиле, на телефоне — экран (ProfilePhone). Данные — useLunaMemory.
export default function LunaMemory({ memory, phone = false }) {
  const { t, lang } = useI18n()
  const date = (iso) => {
    try {
      return new Date(iso).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' })
    } catch {
      return ''
    }
  }
  const base = phone ? 'pfm-mem' : 'pf-mem'
  return (
    <div className={base} data-luna-memory="">
      <p className={`${base}__note`}>{t('profile.lunaMemory.note')}</p>
      {memory.facts.length === 0 ? (
        <p className={`${base}__empty`}>{t('profile.lunaMemory.empty')}</p>
      ) : (
        <ul className={`${base}__list`}>
          {memory.facts.map((f) => (
            <li key={f.id} className={`${base}__item`}>
              <span className={`${base}__fact`}>
                {f.fact}
                {f.expiresAt && <small className={`${base}__until`}>{t('profile.lunaMemory.until', { date: date(f.expiresAt) })}</small>}
              </span>
              <button type="button" className={`${base}__del`} aria-label={t('profile.lunaMemory.delete')} title={t('profile.lunaMemory.delete')} onClick={() => memory.remove(f.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
