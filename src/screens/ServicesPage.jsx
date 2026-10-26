import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import DemoOfferCard from '../components/DemoOfferCard.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import AssetImage from '../components/AssetImage.jsx'
import { ChevronRightIcon, UserIcon } from '../components/icons.jsx'
import { useMenuItems } from '../components/useMenuItems.js'
import { serviceItems } from '../lib/navSections.js'
import { groupNum } from '../lib/groupNum.js'
import { loadToken } from '../lib/session.js'
import { getBalance, getDemoAccess } from '../api.js'
import { useI18n } from '../i18n.jsx'

// Значок плитки — из кадра «Сервисы» (Figma «Mobile», 6419:6295); фон и цвет значка — модификатором .svc-tile--<раздел>
// в services.css (классом, а не инлайном: тёмная тема перекрашивает их токенами, theme-dark.css). Раздел, которого в
// макете нет (награды на dev-стенде), берёт лавандовую плитку и свой значок из меню.
const TILE_ICO = {
  learning: 'restart_alt',
  homework: 'assignment',
  ielts: 'school',
  sat: 'calculate',
  vocab: 'menu_book',
}

/**
 * «Сервисы» — пятая вкладка нижней панели телефона (дизайн приложения, спека 2026-10-26): профиль и разделы, которые
 * не стали вкладками. Монеты и стрик живут здесь же — на телефоне сайдбара нет, а других мест для них приложение не
 * рисует (решение владельца 26.10.2026). У преподавателя и аккаунта IELTS плашек уровня и счётчиков нет, у демо —
 * счётчиков (вместо них плашка скидки), как в их сайдбаре.
 */
export default function ServicesPage({ userName, userLevel, token, onNav, onProfile }) {
  const { t } = useI18n()
  const { items, teacher, ieltsAccount } = useMenuItems(token)
  const [demo, setDemo] = useState(false)
  const [balance, setBalance] = useState(null)
  useEffect(() => {
    const authToken = token || loadToken()
    if (!authToken) return
    let alive = true
    getDemoAccess(authToken).then((d) => {
      if (alive) setDemo(d.isDemo)
    })
    const apply = (b) => {
      if (alive && b) setBalance({ coins: b.coins ?? 0, streak: b.streak ?? 0 })
    }
    getBalance(authToken, apply).then(apply).catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  const name = (userName || '').trim()
  const student = !teacher && !ieltsAccount
  const tiles = serviceItems(items)

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="services" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="svc">
        <button type="button" className="svc-hero" onClick={onProfile}>
          <AssetImage className="svc-hero__mascot" src="/assets/m/services/mascot.webp" alt="" />
          <span className="svc-hero__who">
            <span className="svc-hero__avatar">{name ? name.charAt(0).toUpperCase() : <UserIcon size={28} />}</span>
            <span className="svc-hero__name">
              <b>{name || t('kingdom.profile')}</b>
              {/* Без имени подпись уже наверху — не повторяем «Профиль» над «Профиль», как в сайдбаре. */}
              {name && (
                <span>
                  {t('kingdom.profile')}
                  <ChevronRightIcon size={20} />
                </span>
              )}
            </span>
          </span>
          {student && (
            <span className="svc-hero__chips">
              <span className="svc-chip">
                <i className="svc-chip__ico" aria-hidden="true" />
                {t('home.level.stop', { level: (userLevel || 'A1').toUpperCase() })}
              </span>
              {!demo && balance && (
                <>
                  <span className="svc-chip" title={t('services.streak')}>
                    <img src="/assets/world/streak.svg" alt={t('services.streak')} />
                    {balance.streak}
                  </span>
                  <span className="svc-chip" title={t('services.coins')}>
                    <img src="/assets/world/coin.png" alt={t('services.coins')} />
                    {groupNum(balance.coins)}
                  </span>
                </>
              )}
            </span>
          )}
        </button>

        <div className="svc-head">
          <h1 className="svc-head__title">{t('mtab.services')}</h1>
          <ThemeToggle />
        </div>

        {tiles.length > 0 && (
          <div className="svc-grid">
            {tiles.map(({ key, label, ico }) => (
              <button type="button" key={key} className={`svc-tile svc-tile--${key}`} onClick={() => onNav?.(key)}>
                <span className="svc-tile__top">
                  <span className="svc-tile__plate">
                    <i style={{ '--svc-ico': `url(/assets/home-v2/ico/${TILE_ICO[key] || ico}.svg)` }} aria-hidden="true" />
                  </span>
                  <span className="svc-tile__go" aria-hidden="true" />
                </span>
                <span className="svc-tile__name">{t(label)}</span>
              </button>
            ))}
          </div>
        )}

        {demo && <DemoOfferCard onUse={() => onNav?.('pricing')} />}
      </div>
    </LearningLayout>
  )
}
