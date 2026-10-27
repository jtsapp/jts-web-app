import { useState, useEffect } from 'react'
import Logo from './Logo.jsx'
import { useI18n } from '../i18n.jsx'
import { roleForLevel } from '../kingdoms.js'
import { getBalance, getDemoAccess } from '../api.js'
import DemoOfferCard from './DemoOfferCard.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { loadToken } from '../lib/session.js'
import { groupNum } from '../lib/groupNum.js'
import { useMenuItems } from './useMenuItems.js'
import { ChevronRightIcon, CloseIcon, UserIcon, SettingsIcon } from './icons.jsx'

// Состав меню по роли — lib/navSections.js: его же показывают нижняя панель телефона и «Сервисы».
// Значки пунктов рисуются маской (.sb__ico), поэтому цвет берут от пункта: фиолетовый, у активного белый.

// Левый сайдбар обучающей зоны. Монеты и стрик — из бэкенда
// (GET /mobile/balance/info), логика начисления живёт там же.
export default function Sidebar({
  userName,
  userLevel = 'A1',
  active = 'learning',
  token,
  onNav,
  onProfile,
  // Мобильный drawer: `open` выезжает сайдбар поверх контента, `onClose` его прячет.
  // На десктопе оба не влияют — там сайдбар статичная колонка (управляется CSS).
  open = false,
  onClose,
  rail = false,
}) {
  // Демо-статус сайдбар выясняет сам — как и баланс ниже. Тянуть его пропсом
  // пришлось бы через полтора десятка экранов ради двух элементов меню; ответ
  // мемоизирован в api.js, так что переход по разделам не стоит запроса.
  const [demo, setDemo] = useState(false)
  useEffect(() => {
    const authToken = token || loadToken()
    if (!authToken) return
    let alive = true
    getDemoAccess(authToken).then((d) => {
      if (alive) setDemo(d.isDemo)
    })
    return () => {
      alive = false
    }
  }, [token])

  // Роль, аккаунт IELTS и подписки на экзамены — в общем хуке меню (тот же список у панели телефона и «Сервисов»).
  const { items: nav, teacher, ieltsAccount, badges } = useMenuItems(token)
  const { t } = useI18n()
  const role = roleForLevel(userLevel)
  const trimmedName = (userName || '').trim()
  const initial = trimmedName ? trimmedName.charAt(0).toUpperCase() : null

  // На мобилке любой выбор в сайдбаре сначала закрывает drawer, потом навигирует.
  const pick = (fn) => (...args) => {
    onClose?.()
    fn?.(...args)
  }

  const [balance, setBalance] = useState({ coins: 0, streak: 0, streakActiveToday: false })

  useEffect(() => {
    // Не все экраны пробрасывают token (тьютор, профиль) — тогда берём его
    // из localStorage сами, чтобы монеты и стрик не залипали на нуле.
    const authToken = token || loadToken()
    if (!authToken) return
    let alive = true
    // apply получает и кэш (мгновенно, без «мигания» нулей при перемонтировании
    // сайдбара на смене экрана), и свежий баланс, когда фоновый запрос дойдёт.
    const apply = (b) => {
      if (alive && b) {
        setBalance({
          coins: b.coins ?? 0,
          streak: b.streak ?? 0,
          streakActiveToday: !!b.streakActiveToday,
        })
      }
    }
    getBalance(authToken, apply).then(apply).catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  return (
    <>
      {/* Затемнение под открытым drawer (только мобилка) */}
      <div
        className={`sb-overlay ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sb ${open ? 'is-open' : ''} ${rail ? 'sb--rail' : ''}`}>
        <button className="sb__close" type="button" onClick={onClose} aria-label={t('common.back')}>
          <CloseIcon size={22} />
        </button>

        <div className="sb__head">
          <div className="sb__logo">
            <Logo variant="dark" />
          </div>
          <ThemeToggle />
        </div>

        <button className="sb__profile" onClick={pick(onProfile)}>
          <span className="sb__avatar">{initial || <UserIcon size={18} />}</span>
          <span className="sb__profile-text">
            <b>{userName || t('kingdom.profile')}</b>
            {/* Без имени верхняя строка уже показывает подпись — не дублируем
                её («Профиль» над «Профиль»); та же развилка в MobileTopBar. */}
            {userName && <span>{t('kingdom.profile')}</span>}
          </span>
          <span className="sb__profile-chev">
            <ChevronRightIcon size={24} />
          </span>
        </button>

        <nav className="sb__nav">
          {nav.map(({ key, label, ico }) => (
            <button
              key={key}
              className={`sb__item ${active === key ? 'sb__item--active' : ''}`}
              // data-nav читает тур «Главной»: список разделов в нём — ровно те, что в меню этого ученика
              data-nav={key}
              onClick={() => pick(onNav)(key)}
            >
              <i className="sb__ico" style={{ '--sb-ico': `url(/assets/home-v2/ico/${ico}.svg)` }} aria-hidden="true" />
              <span>{t(label)}</span>
              {badges[key] > 0 && <b className="sb__badge">{badges[key]}</b>}
            </button>
          ))}
        </nav>

      <div className="sb__spacer" />

      {ieltsAccount && !teacher && (
        <button className="sb__item sb__item--settings" onClick={pick(onProfile)}>
          <SettingsIcon size={24} />
          <span>{t('nav.settings')}</span>
        </button>
      )}

      {!teacher && !ieltsAccount && (
        <>
      <div className="sb__role">
        <img className="sb__role-ic" src={`/assets/world/roles/${role.key}.png`} alt="" />
        <span className="sb__role-text">
          {t('nav.you')} {t('role.' + role.key)}
        </span>
        <span className="sb__role-lvl">{(userLevel || 'A1').toUpperCase()}</span>
      </div>

      {/* У демо-ученика на месте стрика и монет — плашка скидки: игровые
          счётчики у него всё равно пустые (заданий он почти не проходил), а
          продать полный доступ здесь важнее. */}
      {demo ? (
        <DemoOfferCard onUse={() => pick(onNav)('pricing')} />
      ) : (
      <div className="sb__balance">
        <div className="sb__stat">
          <img
            className={`sb__flame ${balance.streakActiveToday ? 'sb__flame--hot' : ''}`}
            src="/assets/world/streak.svg"
            alt=""
          />
          <span className={`sb__stat-num ${balance.streakActiveToday ? 'sb__stat-num--hot' : ''}`}>
            {balance.streak}
          </span>
        </div>
        <div className="sb__stat">
          <img className="sb__coin" src="/assets/world/coin.png" alt="" />
          <span className="sb__stat-num sb__stat-num--coin">{groupNum(balance.coins)}</span>
        </div>
        </div>
      )}
        </>
      )}
      </aside>
    </>
  )
}
