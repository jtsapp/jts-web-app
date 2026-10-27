import { useI18n } from '../../i18n.jsx'
import { usePhoneWidth } from '../../lib/usePhoneWidth.js'
import { MicIcon } from '../../components/icons.jsx'
import { PkChevron } from '../practice/PracticeIcons.jsx'
import { SawArt, TreeArt } from './ArcadeScene.jsx'

// Зал «Аркады»: карточки игр. Ключи — те же, что в диплинке
// ?screen=arcade&game=… и в навигации из карточки Практики.
export const ARCADE_GAMES = ['speak', 'runner']

export default function ArcadeHub({ onPick }) {
  const { t } = useI18n()
  // «Бета» у названия игры — только на телефоне, как в зале приложения
  // (Figma «Mobile», 6605:10811); на компьютере пометка стоит в шапке игры.
  const phone = usePhoneWidth()
  const beta = phone ? <span className="ar-hub__beta">{t('arcade.beta')}</span> : null
  return (
    <div className="ar-hub">
      <button type="button" className="ar-hub__card" onClick={() => onPick('speak')}>
        <span className="ar-hub__art" aria-hidden="true">
          <span className="ar-hub__saw">
            <SawArt />
          </span>
          <span className="ar-hub__tree">
            <TreeArt />
          </span>
        </span>
        <span className="ar-hub__body">
          <span className="ar-hub__title">
            {t('arcade.title')}
            {beta}
          </span>
          <span className="ar-hub__desc">{t('arcade.hub.speak.desc')}</span>
          <span className="ar-hub__meta">
            <MicIcon size={14} />
            {t('arcade.hub.speak.meta')}
          </span>
          <span className="ar-hub__cta">
            {t('arcade.hub.play')}
            <PkChevron size={16} />
          </span>
        </span>
      </button>
      <button type="button" className="ar-hub__card" onClick={() => onPick('runner')}>
        <span className="ar-hub__art" aria-hidden="true">
          <img src="/arcade/runner/card.webp" alt="" loading="lazy" />
        </span>
        <span className="ar-hub__body">
          <span className="ar-hub__title">
            {t('arcade.run.title')}
            {beta}
          </span>
          <span className="ar-hub__desc">{t('arcade.hub.runner.desc')}</span>
          <span className="ar-hub__meta">{t('arcade.hub.runner.meta')}</span>
          <span className="ar-hub__cta">
            {t('arcade.hub.play')}
            <PkChevron size={16} />
          </span>
        </span>
      </button>
    </div>
  )
}
