import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n.jsx'

// «Жёсткий режим общения» — приглашение попробовать нрав harsh у Speaking Buddy
// (та же настройка, что кнопка «18+» у тьютора, см. TemperToggle). Макет
// «Первый заход и подсказки», кадр с Декстером у доски: картинка 634×394 —
// готовый рендер Figma вместе с ногами, свисающими ниже фото.
export default function TemperInvite({ onKeep, onTry }) {
  const { t } = useI18n()

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onKeep()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKeep])

  return createPortal(
    <div className="hm-temper" role="dialog" aria-modal="true" aria-labelledby="hm-temper-title">
      <div className="hm-temper__scrim" onClick={onKeep} />
      <div className="hm-temper__card">
        <img className="hm-temper__art" src="/assets/first-login/temper-harsh.webp" alt="" width="634" height="394" />
        <div className="hm-temper__copy">
          <h2 className="hm-temper__title" id="hm-temper-title">
            {t('temper.invite.title')}
          </h2>
          <p className="hm-temper__text">{t('temper.invite.text')}</p>
        </div>
        <div className="hm-temper__acts">
          <button type="button" className="hm-temper__keep" onClick={onKeep}>
            {t('temper.invite.keep')}
          </button>
          <button type="button" className="hm-temper__try" onClick={onTry}>
            {t('temper.invite.try')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
