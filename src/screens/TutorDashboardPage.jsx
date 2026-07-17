import Sidebar from '../components/Sidebar.jsx'
import Footer from '../components/Footer.jsx'
import OnboardingTour from '../tutor/OnboardingTour.jsx'
import { MenuIcon, MicIcon, ArrowRightIcon } from '../tutor/TutorIcons.jsx'
import { useT } from '../i18n/LanguageContext.jsx'
import { SCENARIOS, DASHBOARD_SCENARIO_COUNT } from '../tutor/scenarios.js'

const LESSON_DESC =
  'Разберём, как строится форма am/is/are + глагол с -ing, когда её использовать, а когда нет'
const LESSONS = [
  { num: '01', title: 'Практика Present Continious', desc: LESSON_DESC },
  { num: '02', title: 'Практика Present Continious', desc: LESSON_DESC },
  { num: '03', title: 'Практика Present Continious', desc: LESSON_DESC },
  { num: '04', title: 'Практика Present Continious', desc: LESSON_DESC },
]
// Виджет-превью: полный список — на странице «Сценарии» по кнопке «Посмотреть все».
const DASH_SCENARIOS = SCENARIOS.slice(0, DASHBOARD_SCENARIO_COUNT)

export default function TutorDashboardPage({
  user,
  onNavigate,
  onProfile,
  tutor = {},
  // Тур по дашборду. Раньше решал браузерный флаг в localStorage — один показ
  // на устройство: новый аккаунт на том же браузере тура не видел. Теперь
  // решает App: тур идёт сразу после онбординг-цепочки, один раз на аккаунт.
  showTour = false,
  onTourDone,
  onManage,
  onTalk,
  onSuggest,
  onSeeLessons,
  onSeeScenarios,
  onScenario,
}) {
  const t = useT()
  const { name = 'Спарк', avatar = '/tutor/tutor-spark.png' } = tutor
  const tourSteps = [
    { selector: '.t-dash__mic', title: t('tour.mic.title'), text: t('tour.mic.text') },
    {
      selector: '.t-dash__panel .t-panel__section:first-child',
      title: t('tour.plan.title'),
      text: t('tour.plan.text'),
    },
    { selector: '.t-scenarios', title: t('tour.scenarios.title'), text: t('tour.scenarios.text') },
  ]

  return (
    <div className="t-app">
      <div className="t-body">
        <Sidebar
          active="tutor"
          userName={user?.name}
          userLevel={user?.level}
          onNav={onNavigate}
          onProfile={onProfile}
        />

        <div className="t-dash">
          <section className="t-dash__center">
            <div className="t-dash__topbar">
              <div className="t-dash__tutor">
                <img src={avatar} alt="" />
                <div className="t-dash__tutormeta">
                  <b>{name}</b>
                  <span>{t('dash.level', { level: 'A1' })}</span>
                </div>
              </div>
              <button className="t-dash__manage" type="button" onClick={onManage}>
                <MenuIcon size={20} />
                {t('dash.manage')}
              </button>
            </div>

            <div className="t-dash__cta">
              <button className="t-dash__mic" type="button" onClick={onTalk} aria-label="Поболтать с тьютором">
                <MicIcon size={64} />
              </button>
              <h1 className="t-dash__ctatitle">{t('dash.ctaTitle')}</h1>
              <button className="t-dash__suggest" type="button" onClick={onSuggest}>
                <span className="t-dash__suggesttext">
                  <small>{t('dash.suggestLabel')}</small>
                  <b>Практика Present Continious</b>
                </span>
                <span className="t-dash__suggestarrow">
                  <ArrowRightIcon size={20} />
                </span>
              </button>
            </div>
          </section>

          <aside className="t-dash__panel">
            <div className="t-panel__section">
              <div className="t-panel__head">
                <h2>{t('dash.lessonsTitle')}</h2>
                <button className="t-seeall" type="button" onClick={onSeeLessons}>
                  {t('dash.seeAll')}
                  <span className="t-seeall__arrow">
                    <ArrowRightIcon size={14} />
                  </span>
                </button>
              </div>

              <div className="t-progress">
                <b>{t('dash.progress', { done: 0, total: 7 })}</b>
                <div className="t-progress__bar">
                  <span />
                </div>
              </div>

              <div className="t-lessons">
                {LESSONS.map((l) => (
                  <div className="t-lesson" key={l.num}>
                    <div className="t-lesson__head">
                      <span className="t-lesson__num">{l.num}</span>
                      <span className="t-lesson__title">{l.title}</span>
                      <span className="t-radio" />
                    </div>
                    <p className="t-lesson__desc">{l.desc}</p>
                  </div>
                ))}
              </div>
            </div>

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

              <div className="t-scenarios">
                {DASH_SCENARIOS.map((s) => (
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
        </div>
      </div>

      <Footer />

      {showTour && <OnboardingTour steps={tourSteps} onFinish={onTourDone} />}
    </div>
  )
}
