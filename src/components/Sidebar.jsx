import { useState, useEffect } from 'react'
import Logo from './Logo.jsx'
import { useI18n } from '../i18n.jsx'
import { TUTOR_ONLY, TUTOR_ONLY_SECTIONS, areRewardsEnabled, isRewardsScreen } from '../config.js'
import { roleForLevel } from '../kingdoms.js'
import { getBalance, getDemoAccess, getIeltsMe, getSatMeCached } from '../api.js'
import DemoOfferCard from './DemoOfferCard.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { loadToken } from '../lib/session.js'
import { isTeacher } from '../lib/jwt.js'
import { ChevronRightIcon, CloseIcon, UserIcon, SettingsIcon } from './icons.jsx'
import { useMatching } from '../matching/matchingStore.js'
import { matchingView } from '../matching/matchingState.js'

// «Главная» держится отдельно от NAV не по правам, а по порядку: она всегда
// первая, а NAV — общий список разделов. Пункт есть у КАЖДОГО ученика, демо и
// оплаченного (см. сборку `base` ниже): экран давно перестал быть сводкой
// демо-доступа и показывает уровень, прогресс, расписание и домашку.
// Преподаватель — исключение: у него свой набор разделов.
//
// Значки пунктов — контурные Material Symbols из макета «Главная · редизайн»
// (21.10.2026), файлами в public/assets/home-v2/ico. Рисуются маской
// (.sb__ico), поэтому цвет берут от пункта: фиолетовый, у активного белый.
const HOME_ITEM = { key: 'home', label: 'nav.home', ico: 'home' }

// «Мой учитель» (ТЗ 08 §1): сразу под «Главной», только ученику и только когда на стенде есть подбор v2 —
// без него пункт вёл бы на «раздел скоро появится». Бейдж — когда от ученика ждут действия (matchingView).
const MY_TEACHER_ITEM = { key: 'my-teacher', label: 'nav.myTeacher', ico: 'person' }
const MATCHING_HIDDEN = new Set(['idle', 'loading', 'unavailable'])

const NAV_FULL = [
  { key: 'learning', label: 'nav.learning', ico: 'map' },
  { key: 'practice', label: 'nav.practice', ico: 'auto_stories' },
  { key: 'tutor', label: 'nav.tutor', ico: 'auto_awesome' },
  { key: 'lessons', label: 'nav.lessons', ico: 'videocam' },
  { key: 'homework', label: 'nav.homework', ico: 'assignment' },
  // IELTS вернулся в меню вместе с хабом раздела (макет Screen MS, 01.10.2026).
  // Пунктов стало восемь — на низких экранах их ужимает CSS (.sb в styles.css).
  { key: 'ielts', label: 'nav.ielts', ico: 'school' },
  { key: 'sat', label: 'nav.sat', ico: 'quiz' },
  { key: 'vocab', label: 'nav.vocab', ico: 'menu_book' },
  { key: 'tokens', label: 'nav.tokens', ico: 'insights' },
  { key: 'prizes', label: 'nav.prizes', ico: 'school' },
  // «Feedback» — отзывы и жалобы ученика (ТЗ кабинетов, раздел 5); раньше экран открывался только из профиля.
  { key: 'feedback', label: 'nav.feedback', ico: 'forum' },
]
// Тьютор-онли (прод, main): в сайдбаре остаются только разделы из
// TUTOR_ONLY_SECTIONS (Тьютор, Практика, Словарь) — остальные скрыты от
// обычных пользователей (доступны диплинком ?screen=… для отладки).
const NAV = TUTOR_ONLY ? NAV_FULL.filter((i) => TUTOR_ONLY_SECTIONS.includes(i.key)) : NAV_FULL

// Разделы преподавателя. Остальное в списке — его собственное обучение, которого
// у него нет: Тьютор, IELTS и Словарь ученические (design-spec §4.2).
//
// «Практика» — исключение, и по просьбе самих преподавателей: заданий там
// больше, чем в уроках, а выдать их на дом было неоткуда. Прогресс и лимиты у
// преподавателя при этом свои, пустые, — он раздел не проходит, а выдаёт из
// него задания (см. AssignPracticeBar).
const TEACHER_SECTIONS = ['lessons', 'practice']

// Аккаунт IELTS (дизайн «IELTS new», 08.10.2026): ровно эти разделы и в этом порядке — без «Повторения» (курс
// General English), а внизу «Настройки». Игровых счётчиков и плашки уровня в макете нет.
// С 13.10.2026 то же меню у ученика с открытым доступом к IELTS или SAT — и в нём всегда ОБА экзамена: доступ к
// одному не прячет второй (решение владельца), «Повторение» (Review) остаётся в меню — владелец, 13.10.2026.
const IELTS_SECTIONS = ['learning', 'practice', 'tutor', 'lessons', 'homework', 'vocab', 'ielts', 'sat', 'tokens', 'prizes']

// 1253 → «1 253» (как в мобильном HUD)
function groupNum(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

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
  // Роль читается из токена прямо здесь: сайдбар и так его получает, а
  // прокидывать признак сверху пришлось бы через полдюжины экранов.
  const teacher = isTeacher(token)
  const rewardsEnabled = areRewardsEnabled()
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

  // «Главная» теперь у всех: сводка уровня, расписания и домашки нужна и
  // платящему. Раньше пункт был только у демо, потому что экран показывал
  // только демо-блоки.
  // Аккаунт IELTS спрашиваем у бэкенда (ответ помнится по токену). До ответа — прежнее меню: у обычного ученика
  // ничего не мигает, а у ученика IELTS «Повторение» пропадает с первым ответом.
  const [ieltsAccount, setIeltsAccount] = useState(false)
  // Вкладки экзаменов только при своей подписке, абонементе или тарифе. Пока ответ не пришёл — прячем,
  // чтобы ученик General не видел разделы даже на мгновение.
  const [examTabs, setExamTabs] = useState({ ielts: false, sat: false })
  useEffect(() => {
    const authToken = token || loadToken()
    if (!authToken || teacher) return
    let alive = true
    getIeltsMe(authToken).then((m) => {
      if (!alive) return
      if (m.ieltsAccount) setIeltsAccount(true)
      setExamTabs((prev) => ({ ...prev, ielts: !!(m.purchased || m.ieltsAccount) }))
    })
    getSatMeCached(authToken).then((m) => {
      if (alive) setExamTabs((prev) => ({ ...prev, sat: !!m?.purchased }))
    })
    return () => {
      alive = false
    }
  }, [token, teacher])

  const matching = matchingView(useMatching(teacher ? null : token || loadToken()))
  const head = !teacher && !MATCHING_HIDDEN.has(matching.status) ? [HOME_ITEM, MY_TEACHER_ITEM] : [HOME_ITEM]
  const badges = { 'my-teacher': matching.badge || 0 }

  const base = [...head, ...NAV]
  // из NAV, а не NAV_FULL: в тьютор-онли аккаунт IELTS не должен видеть скрытые от всех разделы
  const ieltsNav = [...head, ...IELTS_SECTIONS.map((k) => NAV.find((i) => i.key === k)).filter(Boolean)]
  const navAll = teacher ? NAV.filter((item) => TEACHER_SECTIONS.includes(item.key)) : ieltsAccount ? ieltsNav : base
  const nav = navAll.filter((item) => {
    if (!rewardsEnabled && isRewardsScreen(item.key)) return false
    if (item.key === 'ielts') return examTabs.ielts
    if (item.key === 'sat') return examTabs.sat
    return true
  })
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
