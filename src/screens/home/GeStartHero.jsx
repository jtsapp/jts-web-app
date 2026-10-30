import { useI18n } from '../../i18n.jsx'
import { EventIcon } from '../../ielts/icons.jsx'

/**
 * Верх «Главной», пока маршрута нет (макет «Главная · редизайн», кадр «новый ученик», 21.10.2026): тот же баннер, что у
 * блока цели (GeGoalBanner — фон с горами, маскот с репликой), но вместо дорожки — «Здесь будет ваш маршрут» и кнопка.
 * Раньше на этом месте стоял размытый образец маршрута (GeLockedRoadmap) — макет его убрал.
 *
 * state — из homeTopState: locked и notTested (теста нет), needTest (анкета есть, теста нет), needRoute (нет формата),
 * invite (старая анкета). У закрытого роадмапа класс ge-locked — на него смотрит тур «Главной», у остальных ge-invite.
 */
export default function GeStartHero({ state, onStart, onTest, onRoute }) {
  const { t } = useI18n()
  const test = state === 'locked' || state === 'notTested' || state === 'needTest'
  const key = test ? 'test' : state === 'needRoute' ? 'route' : 'invite'
  const action = state === 'needTest' ? onTest : state === 'needRoute' ? onRoute : onStart
  return (
    <div className="ge-skin">
      <section
        className={`ih-gb ge-start ${state === 'locked' ? 'ge-locked' : 'ge-invite'}`}
        aria-labelledby="ge-start-title"
      >
        <img className="ih-gb__bg" src="/ielts/mascot/goal-bg.webp" alt="" aria-hidden="true" />
        <div className="ih-gb__mascot">
          <p className="ih-gb__bubble">{t(`geStart.${key}.say`)}</p>
          <img src="/ielts/mascot/cheer.webp" alt="" aria-hidden="true" width="300" height="237" />
        </div>
        <div className="ih-gb__journey ge-start__body">
          <h2 id="ge-start-title" className="ge-start__title">
            {t(`geStart.${key}.title`)}
          </h2>
          <p className="ge-start__sub">{t(`geStart.${key}.sub`)}</p>
          <button type="button" className="ge-start__cta" onClick={() => action?.()}>
            {test && <EventIcon size={18} />}
            {t(`geStart.${key}.cta`)}
          </button>
        </div>
      </section>
    </div>
  )
}

/**
 * Верх «Главной» у ученика на потолке курса (homeTopState → finish: уровень C1+, анкеты нет). Цель выше не поставить,
 * поэтому ни маршрута, ни теста не предлагаем — тот же баннер говорит, что курс пройден, и ведёт в практику. Класс
 * ge-start общий со стартовым баннером: телефон прячет его так же (src/mobile/home.css), там остаётся карточка уровня.
 */
export function GeFinishHero({ level, onPractice }) {
  const { t } = useI18n()
  return (
    <div className="ge-skin">
      <section className="ih-gb ge-start ge-finish" aria-labelledby="ge-finish-title">
        <img className="ih-gb__bg" src="/ielts/mascot/goal-bg.webp" alt="" aria-hidden="true" />
        <div className="ih-gb__mascot">
          <p className="ih-gb__bubble">{t('geStart.finish.say')}</p>
          <img src="/ielts/mascot/cheer.webp" alt="" aria-hidden="true" width="300" height="237" />
        </div>
        <div className="ih-gb__journey ge-start__body">
          <h2 id="ge-finish-title" className="ge-start__title">
            {t('geStart.finish.title')}
          </h2>
          <p className="ge-start__sub">{t('geStart.finish.sub', { level })}</p>
          <button type="button" className="ge-start__cta" onClick={() => onPractice?.()}>
            {t('geStart.finish.cta')}
          </button>
        </div>
      </section>
    </div>
  )
}

/**
 * «Начните отсюда» на месте «Сегодня», пока плана нет (решение владельца 21.10.2026: у нового ученика вместо списка
 * заданий — приглашение; план по дням соберётся после теста и выбора формата).
 */
export function StartHereCard({ state, onStart, onTest, onRoute }) {
  const { t } = useI18n()
  const key = state === 'needRoute' ? 'route' : state === 'invite' ? 'invite' : 'test'
  const action = state === 'needTest' ? onTest : state === 'needRoute' ? onRoute : onStart
  return (
    <section className="hm-card hm-start" aria-labelledby="hm-start-title">
      <span className="hm-start__plate" aria-hidden="true" />
      <div className="hm-start__text">
        <h2 id="hm-start-title" className="hm-card__title">
          {t('home.start.title')}
        </h2>
        <p className="hm-start__sub">{t(`home.start.${key}.sub`)}</p>
      </div>
      <button type="button" className="hm-start__cta" onClick={() => action?.()}>
        {t(`geStart.${key}.cta`)}
      </button>
    </section>
  )
}
