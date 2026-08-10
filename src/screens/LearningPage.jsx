import { useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { computeKingdoms } from '../kingdoms.js'

// Картинка маскота лежит в public/assets/world/levels/<уровень>.webp — она
// есть не для всех уровней (после сдвига карты, например, нет a0.webp).
// KingdomInteriorPage в этой ситуации просто прячет img через onError, но там
// вокруг остаётся достаточно контекста (шапка города, прогресс). Узел карты —
// это кольцо-аватар и больше ничего внутри, поэтому спрятать картинку значит
// оставить пустой цветной кружок без опознавательных знаков. Вместо этого при
// ошибке загрузки показываем код уровня — узел остаётся понятным и кликабельным.
function LevelMascot({ src, alt, level }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <span className="lp-node__fallback" aria-hidden="true">
        {level}
      </span>
    )
  }
  return <img className="lp-node__av" src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} />
}

export default function LearningPage({ userLevel = 'A1', userName, token, onOpenKingdom, onNav, onProfile }) {
  const { t } = useI18n()
  const kingdoms = computeKingdoms(userLevel)

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="learning" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="lp lp--map">
        <div className="lp__center">
          <div className="lp__head">
            <div>
              <h1 className="lp__title">{t('nav.learning')}</h1>
              <p className="lp__sub">{t('learn.subtitle')}</p>
            </div>
          </div>

          <div className="lp-map">
            <div className="lp-map__canvas">
              {kingdoms.map((k) => {
                const locked = !k.unlocked
                const cls = `lp-node${k.current ? ' is-current' : ''}${locked ? ' is-locked' : ''}`
                return (
                  <button
                    key={k.id}
                    className={cls}
                    style={{ left: `${k.map.x}%`, top: `${k.map.y}%`, '--ring': k.ring }}
                    disabled={locked}
                    aria-disabled={locked}
                    title={locked ? t('learn.locked', { label: k.level }) : k.name}
                    onClick={() => !locked && onOpenKingdom?.(k)}
                  >
                    <span className="lp-node__ring">
                      <LevelMascot src={`/assets/world/levels/${k.level.toLowerCase()}.webp`} alt={k.name} level={k.level} />
                      {locked && (
                        <span className="lp-node__lock" aria-hidden="true">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="#fff" />
                            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                          </svg>
                        </span>
                      )}
                    </span>
                    <span className="lp-node__label">{t('kingdom.levelBadge', { label: k.level })}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </LearningLayout>
  )
}
