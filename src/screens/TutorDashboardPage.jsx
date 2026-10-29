import { useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import MobileTopBar from '../components/MobileTopBar.jsx'
import { useMobileTab } from '../components/mobileTab.js'
import Footer from '../components/Footer.jsx'
import OnboardingTour, { TOUR_COACH_CARD, tourIntroArt, tourMascot } from '../tutor/OnboardingTour.jsx'
import TutorHero from '../tutor/TutorHero.jsx'
import TutorPortrait from '../tutor/TutorPortrait.jsx'
import SituationGrid from '../tutor/SituationGrid.jsx'
import { ChevronRightIcon, MicLineIcon, TickIcon } from '../tutor/TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'
import { SCENARIOS } from '../tutor/scenarios.js'
import { useEnglishOnly } from '../lib/englishOnly.js'
import { usePushToTalkSetting } from '../lib/pushToTalk.js'
import { useMediaQuery, MOBILE_QUERY } from '../lib/useMediaQuery.js'

// Страница тьютора по макету 29.10.2026 (Figma «pitch JTS (Copy)»: компьютер —
// «АВАТАР ТЬЮТОРА» → Section 1, кадр 7200:13545; телефон — «Mobile» →
// «AI-тьютор», кадр 7248:19558). Сверху фиолетовая шапка с лицом тьютора и
// карточкой настроек разговора, ниже — сетка ситуаций.
//
// Настройки звонка теперь здесь, до разговора: «Только английский», режим
// микрофона (свободно / рация) и ситуация. На компьютере это две колонки
// карточки, на телефоне — вкладки «Настройки | Ситуации» (так нарисовано, и
// разметка разная, а не только стили: поэтому порог телефона нужен и в JS).
// Внутри звонка переключателя режима больше нет — выбор уходит в metadata
// комнаты при выдаче токена (см. TutorVoiceChatPage).
//
// Прежние «Советуем сегодня» и правая панель сценариев ушли вместе со старым
// макетом: ситуация выбирается в карточке, а все сцены — в сетке ниже.

// Сколько сцен видно в карточке до «Смотреть все»: на компьютере пять, на
// телефоне две — как в кадрах. Порядок — порядок SCENARIOS (сначала сюжет).
const CHIPS_DESKTOP = 5
const CHIPS_PHONE = 2

export default function TutorDashboardPage({
  user,
  onNavigate,
  onProfile,
  tutor = {},
  // Тур по дашборду. Раньше решал браузерный флаг в localStorage — один показ
  // на устройство: новый аккаунт на том же браузере тура не видел. Теперь
  // решает App: тур идёт сразу после онбординг-цепочки, один раз на аккаунт.
  // Ключ отметки тоже приходит от App — в нём id профиля, поэтому «один раз»
  // считается на аккаунт, а не на браузер.
  showTour = false,
  tourStorageKey,
  onTourDone,
  onManage,
  onChangeTutor,
  onTalk,
  onSuggest,
  onSeeScenarios,
  onScenario,
}) {
  const t = useT()
  const [drawer, setDrawer] = useState(false)
  // Дашборд рисует оболочку сам (без TutorShell) — и сам сообщает вкладку нижней панели телефона (mobileTab.js).
  useMobileTab('tutor')
  const phone = useMediaQuery(MOBILE_QUERY)
  // Ассистент (Джарвис) — не преподаватель английского, см. tutors.js. У него
  // на странице нет ничего «урочного»: ни карточки настроек, ни ситуаций.
  // Разговор начинается нажатием на лицо.
  const isAssistant = Boolean(tutor.assistant)
  // «Только английский» и рация — настройки устройства (localStorage), их
  // читает выдача токена комнаты (TutorVoiceChatPage).
  const [englishOnly, toggleEnglishOnly] = useEnglishOnly()
  const [ptt, togglePtt] = usePushToTalkSetting()
  // Ситуация звонка: '' — без ситуации, как отмечено в макете по умолчанию.
  const [situation, setSituation] = useState('')
  const [tab, setTab] = useState('settings')

  const talk = () => (situation ? onSuggest?.(situation) : onTalk?.())

  // Шаг про сценарии выкидываем вместе с самой сеткой: OnboardingTour ищет
  // элемент по селектору, и подсветка несуществующего .t-scenarios сломала бы
  // тур на первом же ассистенте.
  const tourSteps = [
    // Лицо вместе с «Начать разговор»: на компьютере кнопка в карточке под лицом, и рамка вокруг одного лица
    // показывала бы, на что смотреть, но не куда нажать.
    {
      selector: isAssistant ? '.t-dash__orb' : ['.t-dash__orb', '.t-dash__talk'],
      title: t('tour.mic.title'),
      text: t('tour.mic.text'),
      art: tourMascot('aizere-cheer'),
      ...TOUR_COACH_CARD,
    },
    ...(isAssistant
      ? []
      : [{ selector: '.t-scenarios', title: t('tour.scenarios.title'), text: t('tour.scenarios.text'), art: tourMascot('artist-paint'), ...TOUR_COACH_CARD }]),
  ]
  // Вид тура — как у «Главной» (look="coach"): приветствие и маскот в каждой карточке.
  // Тьюторы Speaking Buddy и есть маскоты — сверху Айзере и Декстер.
  const tourIntro = {
    title: t('tour.intro.title'),
    name: t('tour.tutor.intro.name'),
    text: t('tour.tutor.intro.text'),
    cta: t('tour.intro.cta'),
    skip: t('tour.skip'),
    art: tourIntroArt('aizere-thumbs', 'dexter-cool'),
  }

  const chips = (
    <div className="tp-chips">
      <button
        className={'tp-chip' + (!situation ? ' is-on' : '')}
        type="button"
        aria-pressed={!situation}
        onClick={() => setSituation('')}
      >
        {t('dash.noSituation')}
      </button>
      {SCENARIOS.slice(0, phone ? CHIPS_PHONE : CHIPS_DESKTOP).map((s) => (
        <button
          className={'tp-chip' + (situation === s.id ? ' is-on' : '')}
          type="button"
          key={s.id}
          aria-pressed={situation === s.id}
          onClick={() => setSituation(s.id)}
        >
          {s.label}
        </button>
      ))}
      <button className="tp-chip tp-chip--all" type="button" onClick={onSeeScenarios}>
        {t('dash.allSituations')}
        <ChevronRightIcon size={18} />
      </button>
    </div>
  )

  const englishRow = (
    <CheckRow on={englishOnly} onToggle={() => toggleEnglishOnly()} title={t('dash.englishOnly')} hint={t('dash.englishOnlyHint')} />
  )

  const talkButton = (
    <button className="tp-talk t-dash__talk" type="button" onClick={talk}>
      {t('scen.start')}
      <MicLineIcon size={24} />
    </button>
  )

  return (
    <div className="t-app">
      <MobileTopBar
        userName={user?.name}
        profileLabel={t('sidebar.profile')}
        menuLabel={t('nav.tutor')}
        onMenu={() => setDrawer(true)}
        onProfile={onProfile}
      />
      <div className="t-body">
        <Sidebar
          active="tutor"
          userName={user?.name}
          userLevel={user?.level}
          onNav={onNavigate}
          onProfile={onProfile}
          open={drawer}
          onClose={() => setDrawer(false)}
        />

        <div className="t-dash tp-page">
          <TutorHero tutor={tutor} level={user?.level || 'A1'} onOthers={onChangeTutor} onManage={onManage}>
            <div className={'tp-dash' + (isAssistant ? ' tp-dash--solo' : '')}>
              {/* Лицо по-прежнему начинает разговор: по нему кликали и до кнопки. */}
              <button className="tp-dash__frame t-dash__orb" type="button" onClick={talk} aria-label={t('scen.start')}>
                <TutorPortrait tutor={tutor} />
              </button>

              {!isAssistant && !phone && (
                <div className="tp-composer">
                  <div className="tp-composer__pane tp-composer__pane--left">
                    <div className="tp-composer__group">
                      <h3>{t('dash.modeTitle')}</h3>
                      {englishRow}
                    </div>
                    <div className="tp-composer__group">
                      <h3>{t('dash.micTitle')}</h3>
                      <div className="tp-seg tp-seg--mode" role="radiogroup" aria-label={t('dash.micTitle')}>
                        <SegOption on={!ptt} onPick={() => togglePtt(false)} label={t('dash.micFree')} />
                        <SegOption on={ptt} onPick={() => togglePtt(true)} label={t('dash.micPtt')} />
                      </div>
                      <p className="tp-composer__hint">{t(ptt ? 'dash.micPttHint' : 'dash.micFreeHint')}</p>
                    </div>
                  </div>
                  <div className="tp-composer__pane tp-composer__pane--right">
                    <h3>{t('dash.situationTitle')}</h3>
                    {chips}
                    {talkButton}
                  </div>
                </div>
              )}

              {!isAssistant && phone && (
                <div className="tp-composer tp-composer--tabs">
                  <div className="tp-seg tp-seg--tabs" role="tablist">
                    <SegOption tab on={tab === 'settings'} onPick={() => setTab('settings')} label={t('dash.tabSettings')} />
                    <SegOption tab on={tab === 'situations'} onPick={() => setTab('situations')} label={t('dash.tabSituations')} />
                  </div>
                  {tab === 'settings' ? (
                    <div className="tp-composer__group">
                      <h3>{t('dash.modeTitle')}</h3>
                      {englishRow}
                      <CheckRow on={ptt} onToggle={() => togglePtt()} title={t('dash.pttCheck')} hint={t('dash.micPttHint')} />
                    </div>
                  ) : (
                    <div className="tp-composer__group">
                      <h3>{t('dash.situationTitle')}</h3>
                      {chips}
                    </div>
                  )}
                  <hr className="tp-composer__rule" />
                  {talkButton}
                </div>
              )}
            </div>
          </TutorHero>

          {/* Сетка — тоже про урок английского: у ассистента её нет. */}
          {!isAssistant && <SituationGrid onScenario={onScenario} />}
        </div>
      </div>

      <Footer />

      {showTour && (
        <OnboardingTour look="coach" intro={tourIntro} steps={tourSteps} storageKey={tourStorageKey} onFinish={onTourDone} />
      )}
    </div>
  )
}

// Галочка макета: тёмный квадрат 22 r6 с белой галкой, выключенная — рамка.
function CheckRow({ on, onToggle, title, hint }) {
  return (
    <button className={'tp-check' + (on ? ' is-on' : '')} type="button" role="checkbox" aria-checked={on} onClick={onToggle}>
      <span className="tp-check__box" aria-hidden="true">
        {on && <TickIcon size={12} />}
      </span>
      <span className="tp-check__text">
        <b>{title}</b>
        <small>{hint}</small>
      </span>
    </button>
  )
}

// Сегмент переключателя: и «Свободно | Рация», и вкладки телефона — один вид.
function SegOption({ on, onPick, label, tab = false }) {
  return (
    <button
      className={'tp-seg__opt' + (on ? ' is-on' : '')}
      type="button"
      role={tab ? 'tab' : 'radio'}
      {...(tab ? { 'aria-selected': on } : { 'aria-checked': on })}
      onClick={onPick}
    >
      {label}
    </button>
  )
}
