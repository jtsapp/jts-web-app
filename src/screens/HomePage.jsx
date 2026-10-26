import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import DemoBanner from '../components/DemoBanner.jsx'
import AssetImage from '../components/AssetImage.jsx'
import OnboardingTour, { isTourSeen, useScreenTour } from '../tutor/OnboardingTour.jsx'
import { useI18n } from '../i18n.jsx'
import { plural } from '../lib/plural.js'
import { goalOptions, levelSummary, levelTrack, sanitizeGoal, touchWeeklySnapshot } from '../lib/levelProgress.js'
import { loadLevelGoal, readCachedGoal, saveLevelGoal } from '../lib/levelGoal.js'
import { GoalDialog } from './home/GoalPicker.jsx'
import IeltsHomeCard from './home/IeltsHomeCard.jsx'
import GeGoalBanner from './home/GeGoalBanner.jsx'
import GeStartHero, { StartHereCard } from './home/GeStartHero.jsx'
import { PlacementNext, PlacementResults, usePlacementReport } from './home/PlacementReport.jsx'
import GeTodayCard from './home/GeTodayCard.jsx'
import TourSections from './home/TourSections.jsx'
import TemperInvite from './home/TemperInvite.jsx'
import { armTemperInvite, closeTemperInvite, isTemperInvitePending, temperInviteKey } from './home/temperInvite.js'
import NewReportCard from '../feedback/NewReportCard.jsx'
import TeacherMatchingPanel from '../matching/TeacherMatchingPanel.jsx'
import { useGePlan } from '../ge/plan/useGePlan.js'
import { homeTopState } from '../ge/homeState.js'
import { routeOptions } from '../ge/route.js'
import { loadSkillStatsRemote, readLocalSkillStats } from '../practice/skillStats.js'
import { getTrialRequestState, requestTrialLesson, getMyLessonOccurrences, getMyHomework, getLevelProgress, getIeltsPlan } from '../api.js'
import { ieltsHomeworkCards } from './homework/ieltsHomework.js'
import { pickRecommendation } from '../lib/assistant/recommend.js'
import { pickFeaturedOccurrence } from './schedule/liveNow.js'
import { parseLessonDate, lessonTimeRange, dayLabelKey } from './schedule/lessonFormat.js'

// «Главная» демо-аккаунта (макет демо-доступа, экран 1): срок демо, свой
// уровень с прогрессом до следующего, сильные и слабые стороны, вход на
// пробный урок.
//
// Экран сводит уже существующие данные, а не заводит новые: уровень — тот же,
// что в сайдбаре и на карте королевств, проценты навыков — тот же рейтинг, что
// в профиле (см. lib/levelProgress.js, там объяснено почему шкала общая).
// Придумать «свои» цифры для витрины было бы проще, но ученик видел бы два
// разных прогресса об одном себе.
export default function HomePage({
  userLevel = 'A1',
  userName,
  token,
  isDemoAccount = false,
  demoExpiresAt = null,
  // Уровня в профиле нет — тест ещё не пройден. Показывать вместо него карточку
  // с 'A1' нельзя: человек читал бы её как свой определённый уровень.
  levelUnknown = false,
  // Аккаунт IELTS (App: getIeltsMe, на проде IELTS скрыт — тогда false): вместо уровня General English — старт IELTS.
  ieltsAccount = false,
  // Профиль General English (App: getGeProfile; null — ручки нет, IELTS-аккаунт или гость): анкета, цель и формат.
  // Есть профиль — сверху приглашение или блок цели вместо прежней карточки уровня (спека 2026-10-12, секция 3).
  geProfile = null,
  // Ответил ли запрос профиля (App). false — ещё в пути: null профиля тогда не значит «ручки нет», и ни старую карточку,
  // ни тур показывать нельзя. По умолчанию true — для вызовов без анкеты (тесты прежней «Главной»).
  geLoaded = true,
  onGeStart,
  onGeEdit,
  onGeRoute,
  onGeTest,
  onNav,
  onProfile,
  onOpenPricing,
  onOpenTrial,
  onOpenLesson,
  onStartLevelTest,
  // Ключ отметки «тур показан» — из App, в нём id профиля (tourKeyFor).
  tourKey,
  // Счётчик сохранённых итогов теста уровня v16 (App): вырос — отчёт теста перечитывается.
  placementVersion = 0,
  // Ученик учился до теста v16 (аккаунт старше выкатки, src/placement/existingStudent.js): тест ему не навязываем —
  // роадмап не размывается, а на «Главной» тест числится непройденным (решение владельца 14.10.2026).
  existingStudent = false,
  // «Попробовать жёсткий режим» в окне после тура (App пишет нрав тьютора 'harsh').
  onTemperChoice,
}) {
  const { t, lang } = useI18n()
  const [stats, setStats] = useState(null)
  // Прогресс по уровню — освоенные материалы, и считает их сервер. Пока не
  // ответил, остаётся null: своей оценки на этот случай нет, и придумывать её
  // нельзя (см. lib/levelProgress.js).
  const [progress, setProgress] = useState(null)

  // Локальное зеркало сразу, сервер — следом: иначе карточка навыков секунду
  // висит пустой у человека, который вчера прошёл десяток заданий.
  useEffect(() => {
    setStats(readLocalSkillStats())
    if (!token) return
    let alive = true
    loadSkillStatsRemote(token).then((remote) => {
      if (alive && remote) setStats(remote)
    })
    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    let alive = true
    getLevelProgress(token)
      .then((p) => { if (alive) setProgress(p) })
      .catch(() => {})
    return () => { alive = false }
  }, [token])

  const summary = useMemo(() => levelSummary(userLevel, stats, progress), [userLevel, stats, progress])

  // Цель ученика — до какого уровня он идёт. Кэш сразу, сервер следом (см.
  // lib/levelGoal.js). Выбор, сделанный до ответа сервера, ответом не
  // перетираем: GET мог уйти раньше клика и принести старую цель.
  const [goal, setGoal] = useState(null)
  const pickedRef = useRef(false)
  useEffect(() => {
    setGoal(readCachedGoal(token))
    if (!token) return
    let alive = true
    loadLevelGoal(token).then((g) => {
      if (alive && g !== undefined && !pickedRef.current) setGoal(g)
    })
    return () => { alive = false }
  }, [token])

  const options = useMemo(() => goalOptions(summary), [summary])
  const pickGoal = (code) => {
    // Точка отсчёта — уровень профиля в момент выбора: по ней дорожка
    // нарисуется пройденной, когда профиль дорастёт до цели.
    const next = sanitizeGoal({ target: code, from: summary.level })
    if (!next) return
    pickedRef.current = true
    setGoal(next)
    saveLevelGoal(token, next)
  }
  const [goalOpen, setGoalOpen] = useState(false)

  // Дорожка: без цели — ближайший уровень и следующий за ним, с целью — все
  // ступени до неё (lib/levelProgress.js, levelTrack).
  // У ученика с анкетой GE цель живёт в профиле бэкенда, а прежний level_goal после 13.10 не обновляется (зеркало
  // снято, ge/legacyGoal.js). На компьютере его дорожку рисует блок цели GE; карточка уровня телефона обязана
  // показывать ту же цель — иначе «Изменить» правило бы одну цель, а карточка писала бы другую.
  const geTarget = (!ieltsAccount && geProfile?.targetLevel) || null
  const geFrom = geProfile?.fromLevel || geProfile?.journey?.start || null
  const track = useMemo(
    () => levelTrack(summary, geTarget ? { target: geTarget, from: geFrom || summary.level } : goal),
    [summary, goal, geTarget, geFrom],
  )
  const reached = track.mode === 'reached'
  // Выбранная цель, если она ещё впереди, — её и подсвечиваем в выборе.
  const goalValue = track.mode === 'goal' ? track.goal : null

  // Верхний блок General English. У IELTS-аккаунта свой (IeltsHomeCard) — профиль General English ему не показываем.
  const geTop = ieltsAccount ? 'legacy' : homeTopState({ geProfile, levelUnknown, level: userLevel, existing: existingStudent })
  const geMode = geTop !== 'legacy'
  // План по дням (спека 2026-10-13): есть блок цели — есть и план; его «Сегодня» встаёт вместо «Что сделать сегодня».
  // Нет ручки (старый бэкенд) или план не собран — карточка прежняя.
  const gePlan = useGePlan(token, { enabled: geTop === 'goal', level: summary.level || userLevel })
  const geToday = gePlan.status === 'ready' && gePlan.plan?.state === 'ready'
  // Отчёт теста уровня — одни данные на две карточки: «Результаты теста уровня» в колонке и «Что делать дальше» внизу.
  const report = usePlacementReport(ieltsAccount ? null : token, placementVersion)
  // Срок выбранного формата — для реплики маскота («идём по плану» / «не успеваем»). Та же формула, что на маршруте.
  // Без useMemo: три вызова калькулятора дешевле, а ручную мемоизацию React Compiler здесь сохранить не может.
  const geCur = geProfile?.journey?.current || {}
  const geOption =
    geTop === 'goal'
      ? routeOptions(
          { targetLevel: geProfile.targetLevel, dailyMinutes: geProfile.dailyMinutes, deadlineIso: geProfile.deadline?.date },
          { level: geCur.level || summary.level, percent: geCur.percent ?? summary.percent ?? 0 },
        ).find((o) => o.id === geProfile.route) || null
      : null

  // Тур решает один раз за заход (useScreenTour), поэтому ждёт, пока станет ясно, какая «Главная» на экране: ответил
  // запрос профиля анкеты, а у блока цели — ещё и план (иначе шаг «План на сегодня» нечего подсвечивать). Раньше тур
  // стартовал, пока профиль был в пути, и вёл по прежней «Главной» — с выбором цели на старой дорожке. Без пройденного
  // теста карточки уровня нет, и прежний тур ждёт, пока уровень появится.
  // Исключение — закрытый роадмап (спека 2026-10-14): новый ученик сначала проходит тур, и только потом тест, так что
  // тур здесь идёт и без уровня.
  const tourReady = (geTop === 'locked' || !levelUnknown) && geLoaded && !(geTop === 'goal' && gePlan.status === 'loading')
  // Тур общего курса — другой (анкета, план), поэтому и отметка своя: видевшие прежний увидят обновлённый один раз.
  const tourStorageKey = tourKey && geMode ? `${tourKey}:ge` : tourKey
  const tour = useScreenTour(tourReady ? tourStorageKey : null)
  // Тур «Главной» по макету «Первый заход и подсказки» (21.10.2026): приветствие с именем и три подсказки — прогресс,
  // пробный урок (демо) или «Расписание» с «Домашним заданием» одной рамкой, разделы меню. Прежние девять шагов по
  // каждому блоку макет сменил: тур видит в основном новый ученик, а у него блок цели ещё закрыт и рассказывать про
  // план по дням рано. Размеры карточек и маскоты — из макета (ширина карточки и колонки текста, рендер маскота).
  // Функцией, а не значением: шаги нужны только открытому туру.
  // Цель в туре не спрашиваем (владелец, 21.10.2026): её спрашивает анкета теста уровня. У прежней «Главной» без
  // анкеты GE цель по-прежнему меняется медалью на карточке уровня.
  const tourSteps = () => {
    // Цели шагов — списком: тур берёт из него видимый элемент. На телефоне блоки GE скрыты, и их место занимает
    // карточка уровня (дизайн приложения).
    const top =
      geTop === 'goal'
        ? { selector: ['.ge-goal', '.hm-level--phone'], title: t('tour.home.progress.title'), text: t('tour.home.progress.text') }
        : geTop === 'locked'
          ? { selector: ['.ge-locked', '.hm-level--phone'], title: t('tour.home.locked.title'), text: t('tour.home.locked.text') }
          : geMode
            ? { selector: ['.ge-invite', '.hm-level--phone'], title: t('tour.home.invite.title'), text: t('tour.home.invite.text') }
            : { selector: '.hm-level', title: t('tour.home.progress.title'), text: t('tour.home.progress.text') }
    return [
      { ...top, art: { src: '/assets/first-login/coach-progress.webp', w: 252, h: 236 }, width: 576, textWidth: 330 },
      isDemoAccount
        ? {
            selector: '.hm-trial',
            title: t('tour.home.trial.title'),
            text: t('tour.home.trial.text'),
            art: { src: '/assets/first-login/coach-trial.webp', w: 274, h: 260 },
            width: 535,
            textWidth: 277,
          }
        : {
            selector: ['.hm-sched', '.hm-hw'],
            title: t('tour.home.lessons.title'),
            text: t('tour.home.lessons.text'),
            art: { src: '/assets/first-login/coach-schedule.webp', w: 227, h: 235 },
            width: 576,
            textWidth: 330,
          },
      // Разделы: на компьютере — сайдбар, на телефоне — нижняя панель (кадр 6856:12612); на планшете сайдбар спрятан
      // в drawer — тогда список встаёт по центру без прожектора (optional). «Слева» на телефоне неправда — там свой
      // заголовок из макета. Ширину читаем здесь без риска для гидратации: шаги строятся только у открытого тура.
      {
        selector: ['.sb', '.mtab'],
        optional: true,
        title: t(phoneWidth() ? 'tour.home.sections.titlePhone' : 'tour.home.sections.title'),
        content: <TourSections />,
        width: 520,
      },
    ]
  }
  // Приветствие перед подсказками — по имени, как в макете; имени нет — только «Добро пожаловать!».
  const firstName = (userName || '').trim().split(/\s+/)[0] || ''
  const tourIntro = {
    title: t('tour.home.intro.title'),
    name: firstName,
    text: t('tour.home.intro.text'),
    cta: t('tour.home.intro.cta'),
    skip: t('tour.home.intro.skip'),
  }

  // После тура (решения владельца 21.10.2026): новый ученик сразу уходит в тест — у него закрыт роадмап, и тест и есть
  // следующий шаг; учившимся до теста v16 тест остаётся кнопкой на «Главной». Окно «Жёсткий режим общения» — один раз
  // после тура; новому — когда он вернётся с пройденным тестом (поверх закрытого роадмапа окно не выходит).
  const temperKey = temperInviteKey(tourStorageKey)
  const finishTour = () => {
    tour.finish()
    // Тур закрылся, ничего не показав (на экране не нашлось ни одного блока), — это не «пройден»: ни окна, ни теста.
    if (!isTourSeen(tourStorageKey)) return
    armTemperInvite(temperKey)
    if (geTop === 'locked') onGeStart?.()
  }
  const [temperOpen, setTemperOpen] = useState(false)
  useEffect(() => {
    if (tour.open || !geLoaded || geTop === 'locked') return
    if (isTemperInvitePending(temperKey)) setTemperOpen(true)
  }, [tour.open, geLoaded, geTop, temperKey])
  const closeTemper = (temper) => {
    closeTemperInvite(temperKey)
    setTemperOpen(false)
    if (temper) onTemperChoice?.(temper)
  }

  // Пробный урок — три состояния, и все три уже есть в данных: назначенное
  // занятие (расписание), оставленная заявка (/mobile/trial-request) и ничего.
  // Спрашиваем оба источника: заявка живёт отдельно от урока — менеджер может
  // поставить занятие, так и не отметив заявку, и наоборот.
  const [trial, setTrial] = useState(null)
  const [nextLesson, setNextLesson] = useState(null)
  const [occurrences, setOccurrences] = useState([])
  const [homework, setHomework] = useState([])
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token) return
    let alive = true
    // Ни один из запросов не критичен: не ответил — соответствующая карточка
    // показывает «пусто», а экран остаётся целым. Это честнее пустого места.
    getTrialRequestState(token).then((s) => { if (alive) setTrial(s) }).catch(() => {})
    // Домашние задания IELTS (преподаватель задаёт их в web-admin) живут в плане IELTS, а не в /admin/homework/my —
    // у ученика IELTS «Главная» иначе писала бы «Заданий нет» при открытом задании (то же, что в «Домашней работе»).
    Promise.all([
      getMyHomework(token).then((hw) => (Array.isArray(hw) ? hw : [])).catch(() => []),
      ieltsAccount ? getIeltsPlan(token).then(ieltsHomeworkCards).catch(() => []) : Promise.resolve([]),
    ]).then(([hw, ielts]) => { if (alive) setHomework([...hw, ...ielts]) })
    getMyLessonOccurrences(token)
      .then((occ) => {
        if (!alive) return
        const list = Array.isArray(occ) ? occ : []
        setOccurrences(list)
        setNextLesson(pickFeaturedOccurrence(list))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [token, ieltsAccount])

  const book = async () => {
    if (sending) return
    setSending(true)
    setFailed(false)
    // Разговор с менеджером открываем сразу и не ждём сети: сам сговор о
    // времени идёт там, слотов в приложении нет. Заявка его не заменяет — она
    // помечает человека в очереди менеджера, чтобы про него не забыли, даже
    // если до чата он не дошёл.
    onOpenTrial?.()
    try {
      // Тот же вызов, что в расписании. Ответ — уже свежее состояние,
      // перечитывать GET не нужно.
      setTrial(await requestTrialLesson(token))
    } catch {
      setFailed(true)
    } finally {
      setSending(false)
    }
  }

  // Прирост за неделю — от снимка в localStorage (истории на бэкенде нет,
  // см. levelProgress.js). Считаем в эффекте: снимок трогает localStorage, а
  // рендер обязан быть одинаковым на сервере и клиенте.
  const [week, setWeek] = useState(null)
  useEffect(() => {
    if (summary.percent === null) return
    setWeek(touchWeeklySnapshot(summary.percent))
  }, [summary.percent])

  // Три разных сообщения, и все три — правда о разном: уровень ещё идёт,
  // уровень пройден, выше некуда.
  const planLine = !summary.next
    ? t('home.level.max')
    : summary.remaining === null
      ? null
      // Уровень, в котором не заведено ни одного материала, даёт remaining = 0 —
      // и подпись «материалы пройдены» при пустой полосе читается издевательски.
      // Это про каталог, а не про ученика: молчим, пока считать нечего.
      : summary.total === 0
        ? null
        : summary.remaining === 0
          ? t('home.level.done', { level: summary.next })
          : t('home.level.plan', {
              materials: plural(t, lang, 'home.materials', summary.remaining),
              level: summary.next,
            })

  const hasData = summary.ranked.some((r) => r.percent > 0)
  const levelName = t(`cefr.${summary.level}`)

  // Карточка уровня. На компьютере — только у прежней «Главной» с известным уровнем. На телефоне (дизайн приложения,
  // кадр 6125:6209) — всегда: у ученика с анкетой GE и без теста она замещает блок цели, баннер маршрута и заглушку,
  // скрытые там (src/mobile/home.css). Такой экземпляр помечен hm-level--phone и на компьютере скрыт (demo.css).
  const openGoal = () => (geMode ? onGeEdit?.() : setGoalOpen(true))
  const renderLevel = (phoneOnly) => {
    const unknown = levelUnknown
    const stops = unknown ? [] : track.stops
    return (
      <section className={`hm-level hm-level--${unknown ? 'unknown' : track.mode}${phoneOnly ? ' hm-level--phone' : ''}`}>
        {/* Медаль телефона — справа вверху, обрезана краем карточки. На компьютере медаль внутри кнопки цели. */}
        {!reached && <AssetImage className="hm-level__medal-m" src="/assets/m/home/medal.webp" alt="" loading="lazy" />}
        <div className="hm-level__body">
          <span className="hm-level__label">{t(reached ? 'home.level.labelReached' : 'home.level.label')}</span>
          <div className="hm-level__head">
            <h1 className="hm-level__name">{unknown ? '?' : `${summary.level} · ${levelName}`}</h1>
            {!unknown && !reached && week > 0 && (
              <span className="hm-level__week">
                <TrendIcon up />
                {t('home.level.week', { n: String(week) })}
              </span>
            )}
          </div>

          {/* Дорожка «Старт → ступени → Финиш». Одинокая полоса показывала
              только «сколько до соседнего уровня» — по ней не было видно, куда
              путь ведёт дальше. Заполнен только первый отрезок: процент
              считается до ближайшей ступени, дальние знать неоткуда. У
              достигнутой цели залито всё (класс hm-level--reached). На телефоне
              подписи — коды уровней из data-short: полные «Уровень B2» и
              «Финиш · C1» в 370 не помещаются. */}
          <div className={`hm-level__track${track.short ? ' is-short' : ''}`}>
            <span className="hm-level__stop hm-level__stop--now">
              <i className="hm-level__dot" aria-hidden="true" />
              <span className="hm-level__lbl">{t('home.level.start')}</span>
            </span>
            {[...stops, null].map((code, i) => (
              <Fragment key={code || 'finish'}>
                <span className="hm-level__seg">
                  {i === 0 && !unknown && !reached && summary.percent !== null && (
                    <i className="hm-level__fill" style={{ width: `${summary.percent}%` }} />
                  )}
                </span>
                {code ? (
                  <span className="hm-level__stop">
                    <FlagIcon />
                    <span className="hm-level__lbl" data-short={code}>
                      {track.short ? code : t('home.level.stop', { level: code })}
                    </span>
                  </span>
                ) : (
                  <span className="hm-level__stop hm-level__stop--finish">
                    <FinishIcon />
                    <span className="hm-level__lbl" data-short={t('home.level.finish')}>
                      {!unknown && track.finish ? t('home.level.finishAt', { level: track.finish }) : t('home.level.finish')}
                    </span>
                  </span>
                )}
              </Fragment>
            ))}
          </div>

          {/* Цель достигнута — дальше учиться можно только следующим курсом,
              и подпись «ещё N материалов» тут уже не про что. */}
          {reached && (
            <button type="button" className="hm-level__buy" onClick={() => onOpenPricing?.()}>
              {t('home.level.buy')}
              <ChevronIcon />
            </button>
          )}

          {/* Остаток — в материалах курса, а не в «примерно четырёх уроках»:
              раньше его выводили из процента по средней отдаче занятия, потому
              что самого курса в этих числах не было. Пока сервер не ответил,
              подписи нет вовсе: правдоподобное число человек примет за своё. */}
          {!unknown && (reached
            ? <p className="hm-level__plan">{t('home.level.reached')}</p>
            : planLine && <p className="hm-level__plan">{planLine}</p>)}
        </div>

        {/* Без теста цели нет — вместо строки цели зовём на тест (на телефоне баннер маршрута скрыт, и начать тест
            иначе негде). Медаль — она же вход в смену цели; без выбора (потолок C2) это просто плашка: кнопка,
            которая ничего не открывает, хуже никакой. */}
        {unknown ? (
          <button type="button" className="hm-level__test" onClick={() => (geMode ? onGeStart?.() : onStartLevelTest?.())}>
            {t('geStart.test.cta')}
          </button>
        ) : reached ? (
          <AssetImage className="hm-level__trophy" src="/assets/m/home/trophy.webp" alt="" />
        ) : track.goal && (options.length ? (
          <button type="button" className="hm-level__goal" title={t('home.goal.change')} onClick={openGoal}>
            <AssetImage className="hm-level__medal" src="/assets/medal-goal.png" alt="" />
            <i className="hm-level__flag" aria-hidden="true" />
            <span>{t('home.level.goal', { level: track.goal })}</span>
            <b className="hm-level__edit">{t('home.level.goalEdit')}</b>
          </button>
        ) : (
          <div className="hm-level__goal">
            <AssetImage className="hm-level__medal" src="/assets/medal-goal.png" alt="" />
            <i className="hm-level__flag" aria-hidden="true" />
            <span>{t('home.level.goal', { level: track.goal })}</span>
          </div>
        ))}
      </section>
    )
  }

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active="home"
      token={token}
      onNav={onNav}
      onProfile={onProfile}
      onHelp={levelUnknown ? undefined : tour.start}
    >
      {/* Макет «Главная · редизайн» (21.10.2026): заголовок, баннер маршрута во всю ширину, ниже две колонки —
          слева «Сегодня», практика и результаты теста, справа расписание с домашкой (у демо — пробный урок) и
          сильные и слабые стороны, — и внизу во всю ширину «Что делать дальше». */}
      <div className="hm hm--v2">
        <header className="hm-top">
          <h1 className="hm-top__title">{t('nav.home')}</h1>
        </header>
        {isDemoAccount && <DemoBanner expiresAt={demoExpiresAt} onOpenAccess={onOpenPricing} />}
        {/* Обёртка — чтобы спрятать панель на телефоне (её классы — CSS-модуль); на компьютере display: contents. */}
        <div className="hm-matching">
          <TeacherMatchingPanel token={token} compact onOpen={() => onNav?.('lessons')} />
        </div>

        {/* Новый отчёт о прогрессе от преподавателя — выше всего остального:
            приходит раз в месяц и сам исчезает, как только ученик его открыл. */}
        <NewReportCard token={token} onNav={onNav} />

        {/* Уровня нет — тест не пройден. Вместо карточки с чужими цифрами
            зовём пройти тест: это единственный способ её наполнить. */}
        {ieltsAccount ? (
          <IeltsHomeCard token={token} onNav={onNav} />
        ) : !geLoaded ? (
          // профиль анкеты ещё в пути: заглушка вместо прежней карточки уровня, иначе она мелькала до блока цели
          <section className="hm-card ge-skel" aria-busy="true" aria-label={t('gePlan.loading')} />
        ) : (
          <>
            {geTop === 'goal' ? (
              // Под дорожкой у макета только «Как дойти до цели»: строки «ещё N материалов» и «+N% за неделю» он убрал.
              <GeGoalBanner
                profile={geProfile}
                option={geOption}
                planLine={null}
                week={0}
                onEdit={() => onGeEdit?.()}
                onOpenRoute={() => onGeRoute?.()}
                onBuy={() => onOpenPricing?.()}
              />
            ) : geMode ? (
              <GeStartHero state={geTop} onStart={onGeStart} onTest={onGeTest} onRoute={onGeRoute} />
            ) : levelUnknown ? (
              <section className="hm-card hm-placement">
                <h1 className="hm-placement__title">{t('home.level.unknown.title')}</h1>
                <p className="hm-placement__sub">{t('home.level.unknown.sub')}</p>
                <button type="button" className="hm-placement__cta" onClick={() => onStartLevelTest?.()}>
                  {t('test.start')}
                </button>
              </section>
            ) : null}
            {renderLevel(geMode || levelUnknown)}
          </>
        )}

        <div className="hm-grid">
          <div className="hm-grid__main">
            {/* «Сегодня»: план по дням, если он собран; пока плана нет (тест, формат) — «Начните отсюда» (решение
                владельца 21.10.2026); у прежней «Главной» — подсказка дня. План или профиль ещё в пути — пусто, а не
                подсказка, которая через секунду сменится на «Сегодня». */}
            {geToday ? (
              <GeTodayCard plan={gePlan.plan} frontier={gePlan.frontier} level={summary.level || userLevel} token={token} onReload={gePlan.reload} onNav={onNav} />
            ) : !geLoaded || (geTop === 'goal' && gePlan.status === 'loading') ? null : geMode && geTop !== 'goal' ? (
              <StartHereCard state={geTop} onStart={onGeStart} onTest={onGeTest} onRoute={onGeRoute} />
            ) : isDemoAccount ? null : (
              <RecommendCard t={t} summary={summary} homework={homework} occurrences={occurrences} onNav={onNav} />
            )}
            <PracticeToday t={t} onNav={onNav} />
            {/* Отчёт теста уровня v16; теста нет — тот же блок пустым и зовёт на тест (решение владельца 21.10.2026). */}
            {!ieltsAccount && <PlacementResults report={report} onRetake={onStartLevelTest} />}
          </div>

          <div className="hm-grid__side">
            {/* Пробный урок: назначенное занятие → заявка → приглашение. Платящему он не нужен — у него уже есть и
                преподаватель, и уроки, а «Записаться на пробный» рядом с расписанием читается как ошибка. */}
            {isDemoAccount ? (
              <TrialCard
                t={t}
                lang={lang}
                trial={trial}
                nextLesson={nextLesson}
                sending={sending}
                failed={failed}
                onBook={book}
                onOpenLesson={onOpenLesson}
              />
            ) : (
              <>
                <ScheduleCard t={t} lang={lang} occurrences={occurrences} onOpenLesson={onOpenLesson} onNav={onNav} />
                <HomeworkCard t={t} lang={lang} items={homework} onNav={onNav} />
              </>
            )}
            {!ieltsAccount && (
              <SkillsCard
                t={t}
                summary={summary}
                hasData={hasData}
                levelUnknown={levelUnknown}
                onTest={geMode ? onGeStart : onStartLevelTest}
              />
            )}
          </div>
        </div>

        {!ieltsAccount && <PlacementNext report={report} onNav={onNav} onRetake={onStartLevelTest} />}
      </div>
      {tour.open && (
        <OnboardingTour look="coach" intro={tourIntro} steps={tourSteps()} storageKey={tourStorageKey} onFinish={finishTour} />
      )}
      {/* «Оставить обычный» нрав не пишет: окно могло выйти и тому, у кого жёсткий уже включён (тур по «?»). */}
      {temperOpen && <TemperInvite onKeep={() => closeTemper(null)} onTry={() => closeTemper('harsh')} />}
      {goalOpen && (
        <GoalDialog options={options} value={goalValue} onPick={pickGoal} onClose={() => setGoalOpen(false)} />
      )}
    </LearningLayout>
  )
}

// Цвет полосы навыка: зелёный — уверенно, фиолетовый — рабочий уровень,
// оранжевый — то, что стоит подтянуть. Границы те же, что у стрелки тренда.
function band(percent) {
  if (percent >= 70) return 'high'
  if (percent >= 60) return 'mid'
  return 'low'
}

// Ступень впереди — флажок на лунке (golf_course из макета): вешка, до которой
// ещё идти. Иконки местные, как TrendIcon ниже: тащить их в общий icons.jsx
// ради одного экрана незачем. Контуры — экспортом из Figma, не на глаз.
function FlagIcon() {
  return (
    <svg className="hm-level__ico" width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.0072 15.3265C13.6405 15.3265 13.3289 15.1982 13.0722 14.9415C12.8155 14.6849 12.6872 14.3732 12.6872 14.0065C12.6872 13.6399 12.8155 13.3282 13.0722 13.0715C13.3289 12.8149 13.6405 12.6865 14.0072 12.6865C14.3739 12.6865 14.6855 12.8149 14.9422 13.0715C15.1989 13.3282 15.3272 13.6399 15.3272 14.0065C15.3272 14.3732 15.1989 14.6849 14.9422 14.9415C14.6855 15.1982 14.3739 15.3265 14.0072 15.3265ZM7.04055 16.2432C5.72666 16.2432 4.60985 16.0675 3.69013 15.7161C2.77041 15.3646 2.31055 14.9421 2.31055 14.4487C2.31055 14.1206 2.49388 13.8243 2.86055 13.5599C3.22721 13.2954 3.80166 13.0776 4.58388 12.9065V13.6582C4.58388 13.8816 4.65911 14.0689 4.80956 14.2199C4.9599 14.371 5.14629 14.4465 5.36873 14.4465C5.59105 14.4465 5.7786 14.371 5.93138 14.2199C6.08416 14.0689 6.16055 13.8816 6.16055 13.6582V2.73153C6.16055 2.40764 6.3011 2.15556 6.58221 1.97528C6.86332 1.795 7.15055 1.7782 7.44388 1.92486L11.1105 3.7582C11.4283 3.91391 11.5903 4.17284 11.5964 4.53498C11.6025 4.89712 11.4405 5.16375 11.1105 5.33486L7.95721 6.92986V12.7074C9.08166 12.7668 9.99832 12.9549 10.7072 13.2717C11.4161 13.5885 11.7705 13.9773 11.7705 14.4381C11.7705 14.9448 11.3046 15.3724 10.3726 15.7207C9.44069 16.069 8.32999 16.2432 7.04055 16.2432Z"
      />
    </svg>
  )
}

// Финиш — флажок в круге (flag_circle из макета): конец пути, а не очередная ступень.
function FinishIcon() {
  return (
    <svg className="hm-level__ico" width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.0405 9.60619H8.5805L9.1855 10.5045C9.27105 10.639 9.38282 10.7429 9.52081 10.8162C9.6588 10.8895 9.8037 10.9262 9.9555 10.9262H12.6688C12.9169 10.9262 13.1287 10.8386 13.3041 10.6635C13.4795 10.4882 13.5672 10.2767 13.5672 10.029V7.13632C13.5672 6.88845 13.4795 6.67591 13.3041 6.49869C13.1287 6.32146 12.9169 6.23285 12.6688 6.23285H11.3672L10.7622 5.33452C10.6766 5.20007 10.5648 5.09618 10.4268 5.02285C10.2889 4.94952 10.144 4.91285 9.99216 4.91285H6.69216C6.44405 4.91285 6.2323 5.00055 6.05691 5.17593C5.88152 5.35132 5.79383 5.56307 5.79383 5.81119V12.9429C5.79383 13.1229 5.85353 13.2718 5.97294 13.3896C6.09223 13.5073 6.2389 13.5662 6.41294 13.5662C6.58687 13.5662 6.73494 13.5073 6.85716 13.3896C6.97938 13.2718 7.0405 13.1229 7.0405 12.9429V9.60619ZM8.80563 16.4262C7.7555 16.4262 6.76696 16.2275 5.84003 15.83C4.91309 15.4325 4.10239 14.8866 3.40793 14.1921C2.71346 13.4976 2.16749 12.6872 1.77003 11.7607C1.37256 10.8343 1.17383 9.8444 1.17383 8.79109C1.17383 7.7346 1.37293 6.7446 1.77113 5.82108C2.16933 4.89745 2.71627 4.08742 3.41196 3.391C4.10765 2.69446 4.91811 2.15063 5.84333 1.75952C6.76843 1.36841 7.75696 1.17285 8.80893 1.17285C9.8653 1.17285 10.8552 1.36841 11.7786 1.75952C12.7021 2.15063 13.5122 2.69452 14.2088 3.39119C14.9055 4.08785 15.4494 4.89947 15.8405 5.82603C16.2316 6.7526 16.4272 7.7426 16.4272 8.79603C16.4272 9.84947 16.2316 10.8376 15.8405 11.7604C15.4494 12.6831 14.9056 13.4924 14.209 14.1881C13.5126 14.8837 12.7012 15.4307 11.7749 15.8289C10.8486 16.2271 9.85882 16.4262 8.80563 16.4262Z"
      />
    </svg>
  )
}

// Срок и число заданий в домашке — иконки schedule и assignment из макета.
// На десктопе прячутся (.hm-hw__ico): там строки без иконок.
function ClockIcon() {
  return (
    <svg className="hm-hw__ico" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.65 8.35L8.35 7.65L6.5 5.8V3.5H5.5V6.2L7.65 8.35ZM6 11C5.30833 11 4.65833 10.8688 4.05 10.6063C3.44167 10.3438 2.9125 9.9875 2.4625 9.5375C2.0125 9.0875 1.65625 8.55833 1.39375 7.95C1.13125 7.34167 1 6.69167 1 6C1 5.30833 1.13125 4.65833 1.39375 4.05C1.65625 3.44167 2.0125 2.9125 2.4625 2.4625C2.9125 2.0125 3.44167 1.65625 4.05 1.39375C4.65833 1.13125 5.30833 1 6 1C6.69167 1 7.34167 1.13125 7.95 1.39375C8.55833 1.65625 9.0875 2.0125 9.5375 2.4625C9.9875 2.9125 10.3438 3.44167 10.6063 4.05C10.8688 4.65833 11 5.30833 11 6C11 6.69167 10.8688 7.34167 10.6063 7.95C10.3438 8.55833 9.9875 9.0875 9.5375 9.5375C9.0875 9.9875 8.55833 10.3438 7.95 10.6063C7.34167 10.8688 6.69167 11 6 11ZM6 10C7.10833 10 8.05208 9.61042 8.83125 8.83125C9.61042 8.05208 10 7.10833 10 6C10 4.89167 9.61042 3.94792 8.83125 3.16875C8.05208 2.38958 7.10833 2 6 2C4.89167 2 3.94792 2.38958 3.16875 3.16875C2.38958 3.94792 2 4.89167 2 6C2 7.10833 2.38958 8.05208 3.16875 8.83125C3.94792 9.61042 4.89167 10 6 10Z"
      />
    </svg>
  )
}

function TasksIcon() {
  return (
    <svg className="hm-hw__ico" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.5 10.5C2.225 10.5 1.98958 10.4021 1.79375 10.2063C1.59792 10.0104 1.5 9.775 1.5 9.5V2.5C1.5 2.225 1.59792 1.98958 1.79375 1.79375C1.98958 1.59792 2.225 1.5 2.5 1.5H4.6C4.70833 1.2 4.88958 0.958333 5.14375 0.775C5.39792 0.591667 5.68333 0.5 6 0.5C6.31667 0.5 6.60208 0.591667 6.85625 0.775C7.11042 0.958333 7.29167 1.2 7.4 1.5H9.5C9.775 1.5 10.0104 1.59792 10.2063 1.79375C10.4021 1.98958 10.5 2.225 10.5 2.5V9.5C10.5 9.775 10.4021 10.0104 10.2063 10.2063C10.0104 10.4021 9.775 10.5 9.5 10.5H2.5ZM2.5 9.5H9.5V2.5H2.5V9.5ZM3.5 8.5H7V7.5H3.5V8.5ZM3.5 6.5H8.5V5.5H3.5V6.5ZM3.5 4.5H8.5V3.5H3.5V4.5ZM6.26875 2.01875C6.33958 1.94792 6.375 1.85833 6.375 1.75C6.375 1.64167 6.33958 1.55208 6.26875 1.48125C6.19792 1.41042 6.10833 1.375 6 1.375C5.89167 1.375 5.80208 1.41042 5.73125 1.48125C5.66042 1.55208 5.625 1.64167 5.625 1.75C5.625 1.85833 5.66042 1.94792 5.73125 2.01875C5.80208 2.08958 5.89167 2.125 6 2.125C6.10833 2.125 6.19792 2.08958 6.26875 2.01875Z"
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8.40065 8L5.33398 4.93333L6.26732 4L10.2673 8L6.26732 12L5.33398 11.0667L8.40065 8Z" fill="currentColor" />
    </svg>
  )
}

// Плашка со значком — только телефон (дизайн приложения): строки расписания, домашки и пробного урока начинаются с
// неё. На компьютере скрыта (demo.css), значок — маской из public/assets/home-v2/ico.
function Plate({ ico }) {
  return <span className="hm-plate" style={{ '--hm-ico': `url(/assets/home-v2/ico/${ico}.svg)` }} aria-hidden="true" />
}

// Телефонная ширина мобильного слоя (src/mobile/*.css) — только для того, что рисуется после монтирования.
function phoneWidth() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 560px)').matches
}

/** «Сегодня» / «Завтра» / «8 августа» — день урока в строке расписания телефона. */
function dayWord(date, locale, t) {
  const key = dayLabelKey(date)
  return key ? t(`schedule.${key}`) : date.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
}

function TrendIcon({ up = false, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={up ? 'M4 17 10 11l4 4 6-6' : 'M4 7 10 13l4-4 6 6'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={up ? 'M15 5h5v5' : 'M15 19h5v-5'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** «Завтра, 14:00 — 14:50 · Айгерим» — когда и с кем. */
function lessonWhen(occ, lang, t) {
  const date = parseLessonDate(occ.scheduledAt)
  const locale = lang === 'kk' ? 'kk' : 'ru'
  const day = date
    ? date.toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'long' })
    : ''
  const time = lessonTimeRange(occ, locale)
  const who = occ.teacherName ? ` · ${occ.teacherName}` : ''
  return [day, time].filter(Boolean).join(', ') + who || t('home.trial.sub')
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Расписание на ближайшие дни.
 *
 * Не календарь: экран «Уроки» уже показывает месяц целиком, и повторять его
 * здесь незачем. Здесь — семь дней подряд, включая пустые: «нет уроков» в
 * субботу это тоже ответ на вопрос «что у меня на неделе», а список из двух
 * строк с пропусками между ними на него не отвечает.
 */
function ScheduleCard({ t, lang, occurrences, onOpenLesson, onNav }) {
  const locale = lang === 'kk' ? 'kk-KZ' : 'ru-RU'
  const days = useMemo(() => {
    const byDay = new Map()
    for (const o of occurrences || []) {
      const d = parseLessonDate(o.scheduledAt)
      if (!d) continue
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key).push(o)
    }
    const out = []
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getTime() + i * 86400000)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const items = (byDay.get(key) || []).sort(
        (a, b) => parseLessonDate(a.scheduledAt) - parseLessonDate(b.scheduledAt),
      )
      out.push({ date: d, items })
    }
    return out
  }, [occurrences])

  // Телефон (дизайн приложения): полоса из семи дней, под ней уроки одного выбранного дня — по умолчанию сегодня.
  // На компьютере полосы нет, а список показывает все семь дней, как раньше.
  const [picked, setPicked] = useState(0)

  return (
    <section className="hm-card hm-sched">
      <h2 className="hm-card__title">{t('home.schedule.title')}</h2>
      <div className="hm-sched__week">
        {days.map(({ date, items }, i) => (
          <button
            type="button"
            key={date.toISOString()}
            className={`hm-sched__wday${i === picked ? ' is-picked' : ''}${items.length ? ' is-busy' : ''}`}
            aria-pressed={i === picked}
            // Точку «есть урок» читалка экрана не видит — она словом в имени кнопки, вместе с полной датой.
            aria-label={
              date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) +
              (items.length ? `, ${t('home.schedule.hasLesson')}` : '')
            }
            onClick={() => setPicked(i)}
          >
            <b>{date.getDate()}</b>
            <i>{date.toLocaleDateString(locale, { weekday: 'short' })}</i>
          </button>
        ))}
      </div>
      <ul className="hm-sched__list">
        {days.map(({ date, items }, i) => (
          <li className={`hm-sched__day${i === picked ? ' is-picked' : ''}`} key={date.toISOString()}>
            {/* Сегодня — первая строка: на телефоне по макету её число в
                красной плашке, чтобы неделя читалась от «сейчас». */}
            <span className={`hm-sched__date${items.length ? ' is-busy' : ''}${i === 0 ? ' is-today' : ''}`}>
              <b>{date.getDate()}</b>
              <i>{date.toLocaleDateString(locale, { weekday: 'short' })}</i>
            </span>
            {items.length === 0 ? (
              <span className="hm-sched__empty">
                <Plate ico="event" />
                <span>{t('home.schedule.free')}</span>
                <small>{t('home.schedule.freeSub')}</small>
              </span>
            ) : (
              <span className="hm-sched__items">
                {items.map((o) => (
                  <button
                    type="button"
                    className="hm-sched__item"
                    key={o.lessonId}
                    onClick={() => onOpenLesson?.(o.lessonId)}
                  >
                    <Plate ico="videocam" />
                    <b>{o.teacherName || t('home.schedule.lesson')}</b>
                    <i>
                      <span className="hm-sched__when">{dayWord(date, locale, t)} · </span>
                      {lessonTimeRange(o, lang === 'kk' ? 'kk' : 'ru')}
                    </i>
                    <span className="hm-sched__chev" aria-hidden="true"><ChevronIcon /></span>
                  </button>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="hm-card__more" onClick={() => onNav?.('lessons')}>
        {t('home.schedule.all')}
      </button>
    </section>
  )
}

// Срок задания для сортировки; нет срока или он нечитаем — «когда-нибудь».
function dueTime(h) {
  const t = h.dueDate ? new Date(h.dueDate).getTime() : NaN
  return Number.isNaN(t) ? Infinity : t
}

/** Незакрытые домашние задания: сначала те, у которых срок ближе. */
function HomeworkCard({ t, lang, items, onNav }) {
  const locale = lang === 'kk' ? 'kk-KZ' : 'ru-RU'
  const open = useMemo(() => {
    // Проверенные и сданные сюда не идут: «Главная» — про то, что ещё нужно
    // сделать, а история заданий живёт в своём разделе.
    const done = new Set(['SUBMITTED', 'CHECKED', 'COMPLETED', 'GRADED'])
    return (items || [])
      .filter((h) => !done.has(String(h.status || '').toUpperCase()))
      // Без срока — в конец. Раньше пустой срок читался как 0, то есть как
      // 1970 год, и бессрочные задания вытесняли из тройки то, что сдавать
      // завтра.
      .sort((a, b) => dueTime(a) - dueTime(b))
      .slice(0, 3)
  }, [items])

  return (
    <section className="hm-card hm-hw">
      <h2 className="hm-card__title">{t('home.homework.title')}</h2>
      {/* «Все ›» в заголовке — телефон (макет приложения); на компьютере раздел открывается из меню. */}
      <button type="button" className="hm-card__all" onClick={() => onNav?.('homework')}>
        {t('home.homework.all')}
      </button>
      {open.length === 0 ? (
        <p className="hm-hw__empty">{t('home.homework.empty')}</p>
      ) : (
        <ul className="hm-hw__list">
          {open.map((h) => {
            // Части-материалы (одна домашка на занятие, spec §5, §9) — тоже
            // задания работы, просто не через exercises: без них счёт занижен
            // ровно на то, что раньше было отдельными карточками материалов.
            // И то, и другое у /admin/homework/my — всегда массив (пустой,
            // если пусто); null остаётся только когда карточка синтетическая
            // и обоих полей нет вовсе — тогда строку «N заданий» не рисуем.
            const hasCounts = h.exercises != null || h.materialParts != null
            const count = h.exerciseCount ?? (hasCounts ? (h.exercises?.length ?? 0) + (h.materialParts?.length ?? 0) : null)
            return (
              <li key={h.id}>
                <button type="button" className="hm-hw__item" onClick={() => onNav?.('homework', { id: h.id })}>
                  <Plate ico="assignment" />
                  <b>{h.title}</b>
                  <span>
                    {h.dueDate && (
                      <i>
                        <ClockIcon />
                        {t('home.homework.due', {
                          date: new Date(h.dueDate).toLocaleDateString(locale, { day: 'numeric', month: 'long' }),
                        })}
                      </i>
                    )}
                    {count != null && (
                      <i>
                        <TasksIcon />
                        {t('home.homework.tasks', { n: String(count) })}
                      </i>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/**
 * Пробный урок демо: назначенное занятие → заявка → приглашение. Состояние меняется под курсором после нажатия —
 * озвучиваем смену тем, кто кнопку не видит.
 */
function TrialCard({ t, lang, trial, nextLesson, sending, failed, onBook, onOpenLesson }) {
  return (
    <section className="hm-card hm-trial">
      <Plate ico="videocam" />
      <div className="hm-trial__art">
        <AssetImage src="/assets/demo/trial-call.webp" alt="" />
      </div>
      <div className="hm-trial__body" aria-live="polite">
        <b className="hm-trial__title">
          {nextLesson ? t('home.trial.scheduled') : trial?.requested ? t('trial.doneTitle') : t('home.trial.title')}
        </b>
        <span className="hm-trial__sub">
          {nextLesson
            ? lessonWhen(nextLesson, lang, t)
            : trial?.requested
              ? t(trial.managerAssigned ? 'trial.doneManager' : 'trial.doneText')
              : t('home.trial.sub')}
        </span>
      </div>
      {nextLesson ? (
        <button type="button" className="hm-trial__cta" onClick={() => onOpenLesson?.(nextLesson.lessonId)}>
          {t('home.trial.open')}
          <Arrow />
        </button>
      ) : trial?.requested ? null : (
        <button type="button" className="hm-trial__cta" disabled={sending} onClick={onBook}>
          {t(sending ? 'trial.sending' : 'home.trial.cta')}
          <Arrow />
        </button>
      )}
      {/* role="alert" на самом абзаце: живая область объявляет изменения внутри себя, а этот абзац — её сосед. */}
      {failed && <p className="hm-trial__error" role="alert">{t('trial.failed')}</p>}
    </section>
  )
}

const SKILL_ROWS = ['speaking', 'listening', 'vocab', 'grammar', 'writing']

/**
 * Сильные и слабые стороны (макет: строка навыка — название, тренд и процент, под ней полоса; ниже две плашки
 * «Сильнее всего» и «Стоит подтянуть»). Без теста — те же строки с «???» и пустыми полосами и приглашение пройти тест
 * (кадр «новый ученик»); тест есть, а заданий в практике нет — та же заглушка с прежним текстом и без кнопки.
 */
function SkillsCard({ t, summary, hasData, levelUnknown, onTest }) {
  const rows = hasData ? summary.ranked : SKILL_ROWS.map((skill) => ({ skill, percent: null }))
  return (
    <section className={`hm-card hm-skills${!hasData && !levelUnknown ? ' hm-skills--empty' : ''}`}>
      <h2 className="hm-card__title">{t('home.skills.title')}</h2>
      <div className="hm-skills__list">
        {rows.map(({ skill, percent }) => (
          <div className="hm-skill" key={skill}>
            <span className="hm-skill__name">{t(`profile.skills.${skill}`)}</span>
            {percent != null && (
              <span className={`hm-skill__trend hm-skill__trend--${band(percent)}`} aria-hidden="true">
                <TrendIcon up={percent >= 60} size={18} />
              </span>
            )}
            <span className="hm-skill__pct">{percent != null ? `${percent}%` : '???'}</span>
            <div className="hm-skill__bar">
              {percent != null && (
                <i
                  // Красная ступень ниже 45% — только телефон (макет приложения); на компьютере полоса оранжевая.
                  className={`hm-skill__fill hm-skill__fill--${band(percent)}${percent < 45 ? ' is-bad' : ''}`}
                  style={{ width: `${percent}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      {hasData ? (
        <>
          <div className="hm-skills__tags">
            {summary.strongest && (
              <span className="hm-tag hm-tag--up">
                <TrendIcon up size={24} />
                <span>
                  <small>{t('home.skills.bestLabel')}</small>
                  <b>{t(`profile.skills.${summary.strongest.skill}`)}</b>
                </span>
              </span>
            )}
            {summary.weakest && (
              <span className="hm-tag hm-tag--down">
                <TrendIcon size={24} />
                <span>
                  <small>{t('home.skills.worstLabel')}</small>
                  <b>{t(`profile.skills.${summary.weakest.skill}`)}</b>
                </span>
              </span>
            )}
          </div>
          {/* Телефон: одна строка вместо двух плашек (кадр 6125:6209). */}
          <p className="hm-skills__sum">
            <i className="hm-skills__sumIco" aria-hidden="true" />
            <span>
              {[
                summary.strongest && t('home.skills.best', { skill: t(`profile.skills.${summary.strongest.skill}`) }),
                summary.weakest && t('home.skills.worst', { skill: t(`profile.skills.${summary.weakest.skill}`) }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </p>
        </>
      ) : (
        <div className="hm-skills__msg">
          <span className="hm-skills__msgIco" aria-hidden="true" />
          <b>{t(levelUnknown ? 'home.skills.noTest.title' : 'home.skills.noData.title')}</b>
          <p>{t(levelUnknown ? 'home.skills.noTest.sub' : 'home.skills.empty')}</p>
          {levelUnknown && onTest && (
            <button type="button" className="hm-skills__cta" onClick={() => onTest()}>
              {t('geStart.test.cta')}
              <Arrow />
            </button>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * Практика на сегодня — четыре входа в разделы, а не подобранные задания.
 *
 * Подборки на бэкенде нет: ни ручки, ни признака «что человеку сегодня
 * полезнее». Изобретать её на клиенте значило бы выдавать случайный выбор за
 * рекомендацию. Пока это ярлыки в разделы Практики — они экономят два клика и
 * не обещают того, чего система не знает.
 */
/**
 * Одна карточка «что сделать сегодня» — по данным, которые экран и так уже
 * загрузил (levelSummary, домашка, расписание). Ничего не запрашивает и не
 * зовёт помощника: pickRecommendation — чистая функция (lib/assistant/recommend.js),
 * поэтому у карточки нет ни задержки, ни цены, ни риска упереться в лимит
 * вопросов помощнику — при желании больше узнать про свой прогресс ведёт в чат
 * с ним (см. AssistantWidget), а не сама вызывает модель.
 */
function RecommendCard({ t, summary, homework, occurrences, onNav }) {
  const rec = useMemo(
    () => pickRecommendation({ summary, homework, occurrences }),
    [summary, homework, occurrences],
  )
  if (!rec) return null
  const reason = t(rec.reasonKey, rec.reasonVars ? { skill: t(`profile.skills.${rec.reasonVars.skill}`) } : undefined)
  return (
    <section className="hm-card hm-recommend">
      <h2 className="hm-card__title">{t('home.recommend.title')}</h2>
      <button
        type="button"
        className="hm-recommend__cta"
        onClick={() => (rec.nav.payload ? onNav?.(rec.nav.to, rec.nav.payload) : onNav?.(rec.nav.to))}
      >
        <span className="hm-recommend__reason">{reason}</span>
        <span className="hm-recommend__go">{t(rec.ctaKey)}</span>
      </button>
    </section>
  )
}

function PracticeToday({ t, onNav }) {
  // Плитка ведёт в свой раздел, а не в общую ленту: раньше «Книги» и
  // «Аудирование» открывали «Практику» целиком, и нажавший на книги искал их
  // заново. Аудирование — отдельный экран, книги — фильтр «Практики».
  const tiles = [
    { key: 'books', img: 'book', emoji: '📚', to: 'practice', payload: { filter: 'books' } },
    { key: 'tutor', img: 'tutor', emoji: '🖥️', to: 'tutor' },
    { key: 'listening', img: 'listening', emoji: '🎧', to: 'listening' },
    { key: 'vocab', img: 'vocab', emoji: '📖', to: 'vocab' },
  ]
  return (
    <section className="hm-card hm-prac">
      <div className="hm-card__head">
        <h2 className="hm-card__title">{t('home.practice.title')}</h2>
        <p className="hm-card__sub">{t('home.practice.sub')}</p>
      </div>
      <div className="hm-prac__grid">
        {tiles.map((tile) => (
          <button
            type="button"
            className="hm-prac__tile"
            key={tile.key}
            onClick={() => (tile.payload ? onNav?.(tile.to, tile.payload) : onNav?.(tile.to))}
          >
            <span className="hm-prac__text">
              <b>{t(`home.practice.${tile.key}.title`)}</b>
              <i>{t(`home.practice.${tile.key}.sub`)}</i>
            </span>
            <span className="hm-prac__emoji" aria-hidden="true">{tile.emoji}</span>
            {/* Телефонный макет рисует плитки картинками вместо эмодзи (CSS
                переключает одно на другое). lazy: на десктопе картинка скрыта и
                грузиться ей незачем. */}
            <AssetImage className="hm-prac__img" src={`/assets/home-v2/prac-${tile.img}.webp`} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </section>
  )
}
