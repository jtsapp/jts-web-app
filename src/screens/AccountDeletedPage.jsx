import { useI18n } from '../i18n.jsx'
import { MaskIcon } from './profile/MaskIcon.jsx'

/**
 * «Аккаунт удалён» (Figma «Mobile» → «Профиль», 7419:13541) — итог DELETE /user/me. Сессии к этому моменту уже нет
 * (App.handleAccountDeleted чистит её так же, как выход), поэтому экран без меню и оболочки кабинета: дальше только
 * приветствие. На компьютере своего кадра нет — то же содержимое карточкой по центру.
 */
export default function AccountDeletedPage({ onHome }) {
  const { t } = useI18n()
  return (
    <main className="pfdone">
      <div className="pfdone__card">
        <div className="pfdone__body">
          <span className="pfdone__plate">
            <MaskIcon name="check_circle" />
          </span>
          <h1 className="pfdone__title">{t('profile.deleted.title')}</h1>
          <p className="pfdone__text">{t('profile.deleted.text')}</p>
        </div>
        <div className="pfdone__bar">
          <button type="button" className="pfdone__home" onClick={onHome}>
            {t('profile.deleted.home')}
          </button>
        </div>
      </div>
    </main>
  )
}
