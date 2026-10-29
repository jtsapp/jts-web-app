import { useEffect, useRef, useState } from 'react'
import AssetImage from '../components/AssetImage.jsx'
import LearningLayout from '../components/LearningLayout.jsx'
import OnboardingTour, { TOUR_COACH_CARD, tourIntroArt, tourMascot, useScreenTour } from '../tutor/OnboardingTour.jsx'
import { useI18n } from '../i18n.jsx'
import { computeKingdoms, kingdomAvatar } from '../kingdoms.js'
import { getCourseIndex, courseTrail } from '../learning/courseData.js'
import { getLevelLessons } from '../learning/lessonData.js'
import { loadDone } from '../learning/lessonProgress.js'
import { loadLevelExam } from '../learning/levelExam.js'

// «Пройдено N/M» своего уровня для плашки «Текущий уровень» (телефон, макет
// «Mobile» 6609:21780). Считаем, как тропа (KingdomInteriorPage): уроки курса
// плюс экзамен последним узлом. Пройденное — только локальное зеркало
// прогресса, без бэкенда: тропа сама кладёт туда серверные отметки при каждом
// заходе, а карте ради одной цифры ходить за модулем, токеном практики и
// прогрессом незачем. Ошибка — плашка без полосы.
function useLevelProgress(level) {
  const [prog, setProg] = useState(null)
  useEffect(() => {
    if (!level) return undefined
    let alive = true
    ;(async () => {
      try {
        const [index, exam, done] = await Promise.all([
          getCourseIndex(level),
          loadLevelExam(level),
          loadDone(level, null, null),
        ])
        const lessons = index ? courseTrail(index) : await getLevelLessons(level).catch(() => [])
        const total = lessons.length + (exam && lessons.length ? 1 : 0)
        const doneCount = lessons.filter((l) => done.has(l.code)).length
        if (alive && total) setProg({ done: Math.min(doneCount, total), total })
      } catch {
        /* без полосы */
      }
    })()
    return () => {
      alive = false
    }
  }, [level])
  return prog
}

// Карта уровней (макет Figma «Обучение», Screen 2060:2401 / 2062:2883).
//
// Остров — картинка, а не фон панели: узлы позиционируются в процентах ОТ
// КАРТИНКИ (kingdoms.js), иначе при любой другой ширине короли уезжают со
// своих городов. Кадр острова — колонкой по центру контента (ширина как у
// продовой карты), вокруг — океан; заголовок и его затемнение липнут сверху.
export default function LearningPage({
  userLevel = 'A1',
  userName,
  token,
  unlockAll = false,
  onOpenKingdom,
  onNav,
  onProfile,
  // Ключ отметки «тур показан» приходит из App — в нём id профиля (tourKeyFor).
  tourKey,
}) {
  const { t } = useI18n()
  // unlockAll — режим просмотра контента (?unlock=1, только dev): замки на
  // карте сняты, гейтинг по уровню не применяется.
  const kingdoms = computeKingdoms(userLevel).map((k) => (unlockAll ? { ...k, unlocked: true } : k))
  const current = kingdoms.find((k) => k.current)
  const prog = useLevelProgress(current?.level)

  // Остров выше экрана и нарисован снизу вверх: в самом верху — C1, до
  // которого ещё расти. Открываем карту на своём уровне, иначе первое, что
  // видит студент, — чужие закрытые города (в макете кадр тоже нижний).
  const currentRef = useRef(null)
  useEffect(() => {
    const el = currentRef.current
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [])

  // Плашки «Домашняя работа · N ждут вас» здесь больше нет.
  //
  // Про невыполненную домашку ученику говорит колокольчик уведомлений, и та же
  // цифра висела прямо под ним на карте — два счётчика об одном и том же в
  // одном углу экрана. Сам вход никуда не делся: «Домашние задания» есть в
  // боковом меню (Sidebar), и туда же ведёт уведомление.
  //
  // Вместе с плашкой ушёл и запрос `/homework/my` — карта уровней грузила весь
  // список работ ради одной цифры при каждом открытии.

  // Онбординг-тур карты: шапка → свой город → замки. Шаг про замки отпадает сам
  // (тур пропускает шаги без элемента), когда закрытых уровней не осталось или
  // включён unlockAll.
  const tour = useScreenTour(tourKey)
  const tourSteps = [
    // Первый шаг подсвечивает сам остров, а не шапку: на телефоне заголовок с
    // подписью из макета убран, и подсветка шапки — это светящаяся полоса без
    // содержимого. Остров выше экрана, поэтому прожектор его обрежет (см.
    // OnboardingTour), зато видно, о чём речь.
    { selector: '.lp-isle__map', title: t('tour.learn.map.title'), text: t('tour.learn.map.text'), art: tourMascot('sport-wave'), ...TOUR_COACH_CARD },
    // С подписью «Уровень …»: она стоит под кружком, вне его бокса, и на телефоне уходила под карточку.
    { selector: ['.lp-node.is-current', '.lp-node.is-current .lp-node__label'], title: t('tour.learn.current.title'), text: t('tour.learn.current.text'), art: tourMascot('aizere-cheer'), ...TOUR_COACH_CARD },
    { selector: ['.lp-node.is-locked', '.lp-node.is-locked .lp-node__label'], title: t('tour.learn.locked.title'), text: t('tour.learn.locked.text'), art: tourMascot('artist-coffee', 170), ...TOUR_COACH_CARD },
  ]
  // Вид тура — как у «Главной» (look="coach"): приветствие и маскот в каждой карточке.
  const tourIntro = {
    title: t('tour.intro.title'),
    name: t('nav.learning'),
    text: t('tour.learn.intro.text'),
    cta: t('tour.intro.cta'),
    skip: t('tour.intro.skip'),
    art: tourIntroArt('aizere-book', 'dexter-book'),
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="learning" token={token} onNav={onNav} onProfile={onProfile} onHelp={tour.start}>
      <div className="lp lp--map">
        <div className="lp-isle">
          {/* Шапка с затемнением: липнет сверху и не перехватывает клики —
              под ней прокручиваются и остаются кликабельными узлы карты. */}
          <div className="lp-isle__head">
            <h1 className="lp-isle__title">{t('nav.learning')}</h1>
            <p className="lp-isle__sub">{t('learn.subtitle')}</p>
          </div>

          <div className="lp-isle__map">
            <img className="lp-isle__art" src="/assets/learning/island.webp" alt="" />

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
                  {/* Узел карты — готовый рендер из макета: обводка, белый
                      зазор и круг с королём внутри собраны в Figma и вывезены
                      экспортом. Повторять «круг в круге» масками по числам не
                      надо — кадр персонажа в макете свой у каждого уровня
                      (см. Group 77…82, Screen 2062:2883). */}
                  <span className="lp-node__ring">
                    {/* Без loading="lazy": узлов всего шесть, карта сама
                        прокручивается к текущему уровню, и отложенная загрузка
                        оставляла бы соседние кружки пустыми. */}
                    <AssetImage className="lp-node__av" src={`/assets/world/nodes/${kingdomAvatar(k)}.webp`} alt={k.name} />
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

        {/* Плашка своего уровня внизу карты — только на телефоне (макет
            приложения), на компьютере скрыта: там тропа открывается с острова. */}
        {current && (
          <button type="button" className="lp-cur" style={{ '--ring': current.ring }} onClick={() => onOpenKingdom?.(current)}>
            <span className="lp-cur__av">
              <AssetImage src={`/assets/world/nodes/${kingdomAvatar(current)}.webp`} alt="" />
            </span>
            <span className="lp-cur__body">
              <span className="lp-cur__title">{t('learn.currentLevel', { label: current.level })}</span>
              {prog && (
                <span className="lp-cur__prog">
                  <span className="lp-cur__bar">
                    <span style={{ width: `${Math.round((prog.done / prog.total) * 100)}%` }} />
                  </span>
                  <span className="lp-cur__num">{prog.done}/{prog.total}</span>
                </span>
              )}
            </span>
          </button>
        )}
      </div>

      {tour.open && (
        <OnboardingTour look="coach" intro={tourIntro} steps={tourSteps} storageKey={tourKey} onFinish={tour.finish} />
      )}
    </LearningLayout>
  )
}
