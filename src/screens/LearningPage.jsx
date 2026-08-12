import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { computeKingdoms } from '../kingdoms.js'

// Карта уровней — по макету Figma «Обучение» (Screen 2062:2883).
//
// Остров в макете 1485×1947 и лежит НЕ внутри колонки контента, а поверх неё:
// левым краем уходит под сайдбар, сверху и снизу выходит за экран. Поэтому это
// не «картинка в панели», а сама страница: остров прокручивается целиком, а
// заголовок с затемнением липнет сверху.
//
// Узлы привязаны процентами к КАРТИНКЕ (kingdoms.js), иначе на другой ширине
// экрана короли уезжают со своих городов.
export default function LearningPage({ userLevel = 'A1', userName, token, unlockAll = false, onOpenKingdom, onNav, onProfile }) {
  const { t } = useI18n()
  // unlockAll — режим просмотра контента (?unlock=1, только dev): замки на
  // карте сняты, гейтинг по уровню не применяется.
  const kingdoms = computeKingdoms(userLevel).map((k) => (unlockAll ? { ...k, unlocked: true } : k))

  // Остров вдвое выше экрана и нарисован снизу вверх: наверху C1, до которого
  // ещё расти. Открываем карту на своём уровне, иначе первое, что видит
  // студент, — чужие закрытые города.
  const currentRef = useRef(null)
  useEffect(() => {
    const el = currentRef.current
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [])

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="learning" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="lp lp--map">
        {/* Затемнение под заголовком: в макете это отдельный прямоугольник
            1168×357 (во всю колонку контента) с градиентом от rgba(2,2,2,.6)
            к прозрачному. Лежит поверх острова, кликов не перехватывает. */}
        <div className="lp-isle__head">
          <h1 className="lp-isle__title">{t('nav.learning')}</h1>
          <p className="lp-isle__sub">{t('learn.subtitle')}</p>
        </div>

        {/* Панель-океан во всю ширину контента, остров — колонкой по центру;
            картинка и её кадр остались продовыми. */}
        <div className="lp-map">
          <div className="lp-map__canvas">

          {kingdoms.map((k) => {
            const locked = !k.unlocked
            const cls = `lp-node${k.current ? ' is-current' : ''}${locked ? ' is-locked' : ''}`
            return (
              <button
                key={k.id}
                ref={k.current ? currentRef : undefined}
                className={cls}
                style={{ left: `${k.map.x}%`, top: `${k.map.y}%`, '--ring': k.ring }}
                disabled={locked}
                aria-disabled={locked}
                title={locked ? t('learn.locked', { label: k.level }) : k.name}
                onClick={() => !locked && onOpenKingdom?.(k)}
              >
                <span className="lp-node__ring">
                  {/* Арт короля — круглый кроп из макета: он принадлежит городу,
                      а не ступени, поэтому файл назван по королевству. */}
                  <img className="lp-node__av" src={`/assets/learning/king-${k.id}.webp`} alt={k.name} loading="lazy" />
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
    </LearningLayout>
  )
}
