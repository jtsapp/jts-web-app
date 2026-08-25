import { useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import MobileTopBar from '../components/MobileTopBar.jsx'
import Footer from '../components/Footer.jsx'
import OnboardingTour from '../tutor/OnboardingTour.jsx'
import TutorFace from '../tutor/TutorFace.jsx'
import JarvisOrb from '../tutor/JarvisOrb.jsx'
import TutorThumb from '../tutor/TutorThumb.jsx'
import { MenuIcon, ArrowRightIcon } from '../tutor/TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'
import { SCENARIOS } from '../tutor/scenarios.js'
import { usePassedScenarios } from '../tutor/scenarioProgress.js'
import { useEnglishOnly } from '../lib/englishOnly.js'

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
  onTalk,
  onSuggest,
  onSeeScenarios,
  onScenario,
}) {
  const t = useT()
  const [drawer, setDrawer] = useState(false)
  // avatar не разбираем — см. TutorThumb: у Джарвиса картинки нет, и дефолт
  // подставил бы ему аватарку Спарка.
  const { name = 'Спарк', mood = 'idle' } = tutor
  // Ассистент (Джарвис) — не преподаватель английского, см. tutors.js. У него
  // на дашборде нет ничего «урочного»: ни сценариев, ни подсказки дня, ни
  // тумблера языка. Разговор начинается нажатием на орб — отдельной кнопки
  // «начать разговор» тоже нет.
  const isAssistant = Boolean(tutor.assistant)
  // Тумблер «только английский» — общий для всех тьюторов, читается при выдаче
  // токена комнаты (см. TutorVoiceChatPage → englishOnly в metadata).
  const [englishOnly, toggleEnglishOnly] = useEnglishOnly()
  // «Советуем сегодня» — первый несданный сценарий сюжетной цепочки (пока
  // прогресс не прочитан, это просто первая сцена). Раньше тут висел хардкод
  // «Практика Present Continious» с пустым обработчиком.
  const passed = usePassedScenarios()
  const suggested = SCENARIOS.find((s) => !passed?.has(s.id)) || SCENARIOS[0]
  // Замков нет: все сценарии открыты сразу, независимо от уровня и прогресса.
  // Прогресс нужен только чтобы выбрать «Советуем сегодня».
  // Шаг про сценарии выкидываем вместе с самой панелью: OnboardingTour ищет
  // элемент по селектору, и подсветка несуществующего .t-scenarios сломала бы
  // тур на первом же ассистенте.
  const tourSteps = [
    { selector: '.t-dash__orb', title: t('tour.mic.title'), text: t('tour.mic.text') },
    ...(isAssistant
      ? []
      : [{ selector: '.t-scenarios', title: t('tour.scenarios.title'), text: t('tour.scenarios.text') }]),
  ]

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

        <div className="t-dash">
          <section className="t-dash__center">
            <div className="t-dash__topbar">
              <div className="t-dash__tutor">
                <TutorThumb tutor={tutor} />
                <div className="t-dash__tutormeta">
                  <b>{name}</b>
                  <span>{t('dash.level', { level: user?.level || 'A1' })}</span>
                </div>
              </div>
              {/* На телефоне в кадре 4338:2205 это круглая кнопка-значок без
                  подписи — подпись прячется стилями, поэтому имя кнопке даём
                  явно. */}
              <button className="t-dash__manage" type="button" onClick={onManage} aria-label={t('dash.manage')}>
                <MenuIcon size={20} />
                <span className="t-dash__managelabel">{t('dash.manage')}</span>
              </button>
            </div>

            <div className={'t-dash__cta' + (isAssistant ? ' t-dash__cta--solo' : '')}>
              {/* Орб вместо микрофона: у кнопки лицо выбранного тьютора в его
                  характере (Декстер злится, Луна спокойна, Спарк радуется) —
                  то же лицо, что потом ведёт разговор. */}
              <button
                className="t-dash__orb"
                type="button"
                onClick={onTalk}
                aria-label={t('dash.ctaTitle').replace('\n', ' ')}
              >
                {tutor.face === 'orb' ? (
                  <JarvisOrb className="t-dash__face" label={name} />
                ) : (
                  <TutorFace className="t-dash__face" emotion={mood} />
                )}
              </button>
              {/* Всё ниже — про урок английского, поэтому у ассистента этого нет.
                  Кнопка «начать разговор» появилась потому, что по одному орбу
                  половина людей не пробовала кликнуть; у Джарвиса орб остаётся
                  единственным стартом — так решено по продукту. */}
              {!isAssistant && (
                <>
                  {/* Раньше тут висел заголовок «Нажмите, чтобы поболтать» — надпись,
                      по которой половина людей и не пробовала кликнуть. Теперь явная
                      кнопка старта в цвете «Советуем сегодня»; орб остался кликабельным. */}
                  <button className="t-dash__talk" type="button" onClick={onTalk}>
                    {t('scen.start')}
                  </button>

                  {/* Порядок в стопке = порядок важности: разговор → что делать
                      дальше → настройка. Тумблер стоял вторым и разрывал связку
                      кнопки с подсказкой дня. */}

                  {/* Контекстная карточка: превью сцены здесь не украшение — по нему
                      видно, КУДА ведёт нажатие, до перехода на экран сценария. */}
                  <button
                    className="t-dash__suggest"
                    type="button"
                    onClick={() => onSuggest && onSuggest(suggested.id)}
                  >
                    <span
                      className="t-dash__suggestthumb"
                      style={{ backgroundImage: `url(${suggested.img})` }}
                    />
                    <span className="t-dash__suggesttext">
                      <small>{t('dash.suggestLabel')}</small>
                      <b>{suggested.label}</b>
                    </span>
                    <span className="t-dash__suggestarrow">
                      <ArrowRightIcon size={18} />
                    </span>
                  </button>

                  <button
                    className={'t-dash__engonly' + (englishOnly ? ' is-on' : '')}
                    type="button"
                    role="switch"
                    aria-checked={englishOnly}
                    onClick={() => toggleEnglishOnly()}
                  >
                    <span className="t-dash__engonlytext">
                      <b>{t('dash.englishOnly')}</b>
                      <small>{t('dash.englishOnlyHint')}</small>
                    </span>
                    <span className="t-dash__switch" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Панель сценариев — тоже про урок английского: у ассистента её нет.
              Правок в CSS не потребовалось: .t-dash это flex, а .t-dash__center
              стоит на flex: 1 — без панели он просто занимает всю ширину. */}
          {!isAssistant && (
            <aside className="t-dash__panel">
              <div className="t-panel__section">
                <div className="t-panel__head">
                  <h2>{t('dash.scenariosTitle')}</h2>
                  <button className="t-seeall" type="button" onClick={onSeeScenarios}>
                    {t('dash.seeAll')}
                    <span className="t-seeall__arrow">
                      <ArrowRightIcon size={14} />
                    </span>
                  </button>
                </div>
                <p className="t-panel__sub">{t('dash.scenariosSub')}</p>

                {/* Панель отдаёт ВСЕ сценарии и скроллится: раньше висели два
                    превью, а остальное было только за «Посмотреть все». */}
                <div className="t-scenarios">
                  {SCENARIOS.map((s) => (
                    <button
                      className="t-scenario"
                      key={s.id}
                      type="button"
                      onClick={() => onScenario && onScenario(s.id)}
                    >
                      <span
                        className="t-scenario__img"
                        style={{ backgroundImage: `url(${s.img})` }}
                      >
                        <span className="t-scenario__badge">{s.badge}</span>
                      </span>
                      <span className="t-scenario__label">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      <Footer />

      {showTour && (
        <OnboardingTour steps={tourSteps} storageKey={tourStorageKey} onFinish={onTourDone} />
      )}
    </div>
  )
}
