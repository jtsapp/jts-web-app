'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import WelcomePage from './screens/WelcomePage.jsx'
import RegistrationPage from './screens/RegistrationPage.jsx'
import PhoneLoginPage from './screens/PhoneLoginPage.jsx'
import OtpPage from './screens/OtpPage.jsx'
import RegisterPhonePage from './screens/RegisterPhonePage.jsx'
import RegisterEmailPage from './screens/RegisterEmailPage.jsx'
import RegisterBirthDatePage from './screens/RegisterBirthDatePage.jsx'
import SetPasswordPage from './screens/SetPasswordPage.jsx'
import CompleteRegistrationPage from './screens/CompleteRegistrationPage.jsx'
import PasswordLoginPage from './screens/PasswordLoginPage.jsx'
import SuccessPage from './screens/SuccessPage.jsx'
import PlacementPage from './screens/PlacementPage.jsx'
import LearningPage from './screens/LearningPage.jsx'
import HomePage from './screens/HomePage.jsx'
import PricingPage from './screens/PricingPage.jsx'
import MinutesTopUpPage from './screens/MinutesTopUpPage.jsx'
import PurchaseSuccessModal from './components/PurchaseSuccessModal.jsx'
import SessionExpiredNotice from './components/SessionExpiredNotice.jsx'
import PracticePage from './screens/PracticePage.jsx'
import ListeningPage from './screens/ListeningPage.jsx'
import ShadowingPage from './screens/ShadowingPage.jsx'
import WritingPage from './screens/WritingPage.jsx'
import WorkbookPage from './screens/WorkbookPage.jsx'
import ReadingPage from './screens/ReadingPage.jsx'
import WordsPage from './screens/WordsPage.jsx'
import VerbsPage from './screens/VerbsPage.jsx'
import SpeakSpinPage from './screens/SpeakSpinPage.jsx'
import NumbersPage from './screens/NumbersPage.jsx'
import SituationsPage from './screens/SituationsPage.jsx'
import ListenChoosePage from './screens/ListenChoosePage.jsx'
import ArcadePage from './screens/ArcadePage.jsx'
import LessonsPage from './screens/LessonsPage.jsx'
import HomeworkPage from './screens/HomeworkPage.jsx'
import LiveLessonPage from './screens/LiveLessonPage.jsx'
import IeltsPage from './screens/IeltsPage.jsx'
import IeltsWritingPage from './screens/IeltsWritingPage.jsx'
import IeltsListeningPage from './screens/IeltsListeningPage.jsx'
import IeltsReadingPage from './screens/IeltsReadingPage.jsx'
import IeltsSpeakingPage from './screens/IeltsSpeakingPage.jsx'
import IeltsProgressPage from './screens/IeltsProgressPage.jsx'
import IeltsReadingRunPage from './screens/IeltsReadingRunPage.jsx'
import IeltsReadingReviewPage from './screens/IeltsReadingReviewPage.jsx'
import IeltsListeningRunPage from './screens/IeltsListeningRunPage.jsx'
import IeltsDictationPage from './screens/IeltsDictationPage.jsx'
import IeltsWritingRunPage from './screens/IeltsWritingRunPage.jsx'
import IeltsSpeakingRunPage from './screens/IeltsSpeakingRunPage.jsx'
import IeltsMockPage from './screens/IeltsMockPage.jsx'
import IeltsOnboardingPage from './screens/IeltsOnboardingPage.jsx'
import SatPage from './screens/SatPage.jsx'
import SatRunPage from './screens/SatRunPage.jsx'
import SatDiagnosticPage from './screens/SatDiagnosticPage.jsx'
import SatStudyPage from './screens/SatStudyPage.jsx'
import SatDailyPage from './screens/SatDailyPage.jsx'
import SatWeeklyPage from './screens/SatWeeklyPage.jsx'
import SatPapersPage from './screens/SatPapersPage.jsx'
import SatMockPage from './screens/SatMockPage.jsx'
import SatMockReviewPage from './screens/SatMockReviewPage.jsx'
import SatUnitPage from './screens/SatUnitPage.jsx'
import SatOnboardingPage from './screens/SatOnboardingPage.jsx'
import ExamPricingPage from './screens/ExamPricingPage.jsx'
import IeltsDiagnosticPage from './screens/IeltsDiagnosticPage.jsx'
import IeltsDiagnosticResultPage from './screens/IeltsDiagnosticResultPage.jsx'
import IeltsRoutePage from './screens/IeltsRoutePage.jsx'
import GeOnboardingPage from './screens/GeOnboardingPage.jsx'
import GeRoutePage from './screens/GeRoutePage.jsx'
import GePlanPage from './screens/GePlanPage.jsx'
import { syncLegacyGoal } from './ge/legacyGoal.js'
import { ieltsAccountRedirect } from './lib/ieltsAccountRedirect.js'
import SpeakingTestPage from './screens/SpeakingTestPage.jsx'
import VocabularyPage from './screens/VocabularyPage.jsx'
import KingdomInteriorPage from './screens/KingdomInteriorPage.jsx'
import TutorLanguagePage from './screens/TutorLanguagePage.jsx'
import TutorChoosePage from './screens/TutorChoosePage.jsx'
import TutorLoadingPage from './screens/TutorLoadingPage.jsx'
import TutorLevelOfferPage from './screens/TutorLevelOfferPage.jsx'
import TutorVoiceIntroPage from './screens/TutorVoiceIntroPage.jsx'
import TutorVoiceChatPage from './screens/TutorVoiceChatPage.jsx'
import TutorLevelResultPage from './screens/TutorLevelResultPage.jsx'
import TutorInterestsPage from './screens/TutorInterestsPage.jsx'
import TutorProfessionPage from './screens/TutorProfessionPage.jsx'
import TutorAnalysisPage from './screens/TutorAnalysisPage.jsx'
import TutorDashboardPage from './screens/TutorDashboardPage.jsx'
import TutorLessonPlanPage from './screens/TutorLessonPlanPage.jsx'
import TutorManagePage from './screens/TutorManagePage.jsx'
import TutorPracticeResultPage from './screens/TutorPracticeResultPage.jsx'
import TutorErrorAnalyticsPage from './screens/TutorErrorAnalyticsPage.jsx'
import TutorScenariosPage from './screens/TutorScenariosPage.jsx'
import TutorChatHistoryPage from './screens/TutorChatHistoryPage.jsx'
import TutorCallReportPage from './screens/TutorCallReportPage.jsx'
import { NO_PREVIOUS_CALL } from './lib/callSummary/freshCall.js'
import ProfilePage from './screens/ProfilePage.jsx'
import LessonWorkspacePage from './screens/LessonWorkspacePage.jsx'
import CourseCatalogPage from './screens/CourseCatalogPage.jsx'
import BoothEntryPage from './screens/BoothEntryPage.jsx'
import { loadCatalogLesson } from './screens/workspace/loadCatalogLesson.js'
import { getTutor, temperFor } from './tutor/tutors.js'
// Звук трансляции учителя разрешается ЗАРАНЕЕ, на жесте входа в урок: на iOS
// сокет-событие такого разрешения уже не получит (см. live/audioReport.js).
import { unlockBroadcastAudio } from './screens/live/audioReport.js'
import { interestIdsToEn, enToInterestIds } from './tutor/interests.js'
import { tourKeyFor, isTourSeen } from './tutor/OnboardingTour.jsx'
// getDemoAccess, а не getIsDemoAccount: «Главной» нужен не только признак
// демо, но и срок — по нему рисуется обратный отсчёт в шапке.
import { sendRegistrationOtp, verifyRegistrationOtp, requestLoginOtp, verifyLoginOtp, loginWithGoogle, loginWithPassword, setPassword, getLanguageLevel, getDemoAccess, getIsBoothAccount, getCurrentUser, updateUser, isEmailIdentifier, getIeltsMe, getGeProfile, saveGeProfile } from './api.js'
import { saveToken, clearToken, loadToken, restoreSession, setSessionHooks, mergeAnonymousProgress, saveUserSnapshot, patchUserSnapshot, patchBoothAccount, saveBoothLessonId, loadBoothLessonId } from './lib/session.js'
import { getDeviceId, authHeaders } from './lib/identity.js'
import { homeScreenFor, testExitScreen } from './lib/homeScreen.js'
import { isTeacher, userIdFromToken } from './lib/jwt.js'
import AssistantWidget from './components/AssistantWidget.jsx'
import { assistantAllowedOn } from './lib/assistant/visibility.js'
import { onAssistantNavigate } from './lib/assistant/assistantBus.js'
import { destinationOf } from './lib/assistant/destinations.js'
import { useTourRequest } from './lib/tourBus.js'
import { isStudentOnlyScreen } from './lib/screenAccess.js'
import { rememberPendingScreen, consumePendingScreen, clearPendingScreen, pendingScreenAfterLogin } from './lib/pendingScreen.js'
import { openLandingHandoff } from './landing/handoffClient.js'
import { captureAttribution, safeStorage } from './lib/attribution.js'
import { screenUrlParams, applyScreenUrlParams } from './lib/screenUrlParams.js'
import { practiceUnitTarget } from './lib/studentDeepLink.js'
import { pushNav, popNav, readNavStack, writeNavStack, placeOf, setResume, resumeOf, isReturnable, backLabelKey } from './lib/navStack.js'
import { restoreScroll } from './lib/scrollRestore.js'
import { hydratePractice, clearLocalPractice } from './practice/practiceSync.js'
import { flushSkillStats } from './practice/skillStats.js'
import { clearAccountLeftovers, forgetExpiredSession } from './lib/accountLeftovers.js'
import { loadTutorProfile, saveTutorPrefs } from './lib/tutorPrefs.js'
import { persistPlacementLevel, syncProfileLevel } from './lib/levelSave.js'
import { resolveHomeLevel } from './lib/homeLevel.js'
import { levelFromEnvelope } from './placement/envelope.js'
import { geProfileBody } from './placement/geMapping.js'
import { navForActivity, navForSection } from './placement/activityRoutes.js'
import { saveAttempt } from './placement/api.js'
import { isExistingStudent } from './placement/existingStudent.js'
import { useI18n } from './i18n.jsx'
import { TUTOR_ONLY, TUTOR_ONLY_SECTIONS } from './config.js'
import { SUPPORT_WHATSAPP_URL } from './lib/support.js'
import { trackDemoState, forgetDemoState } from './lib/purchaseCelebration.js'
import { KINGDOMS } from './kingdoms.js'

// Переводит ошибку запроса кода в ключ локализованного сообщения — или null,
// если случай не распознан (тогда показываем текст бэкенда/общий фолбэк). Коды
// проставляет api.js: USER_EXISTS (регистрация занятого номера/почты) и
// USER_NOT_FOUND (вход незарегистрированным номером).
function phoneErrorKey(e) {
  if (e?.code === 'USER_EXISTS') return 'err.userExists'
  if (e?.code === 'USER_NOT_FOUND') return 'err.userNotFound'
  return null
}

// Экраны верхнего уровня (сайдбар «Обучение»/«Практика»/«Домашняя работа»/…),
// которые можно синхронизировать в ?screen= без доп. параметров. Экраны с
// обязательным runtime-id (live-lesson, lesson-workspace, kingdom-interior,
// shadowing) сюда намеренно не входят: без своего параметра (?lesson=,
// ?level=…) в URL они открылись бы пустыми, а не тем же самым местом.
const PERSISTABLE_SCREENS = new Set([
  'home', 'pricing', 'minutes', 'kingdom', 'practice', 'listening', 'writing', 'workbook', 'reading', 'words', 'verbs', 'listenchoose', 'speakspin', 'numbers', 'arcade', 'homework', 'lessons',
  'ielts', 'vocab', 'course-catalog', 'profile',
  // Прохождение и разбор теста IELTS держат свой id в ?ieltsRun= / ?ieltsAttempt= сами (см. экраны)
  'ielts-reading-run', 'ielts-reading-review', 'ielts-listening-run', 'ielts-dictation', 'ielts-writing-run', 'ielts-speaking-run',
  'ielts-onboarding', 'ielts-diagnostic', 'ielts-diagnostic-result', 'ielts-route', 'ielts-mock',
  // Анкета, маршрут и план General English (спеки 2026-10-12 и 2026-10-13): данные берут у бэкенда сами
  'ge-onboarding', 'ge-route', 'ge-plan',
  // Тест уровня v16: прогон тест хранит сам (localStorage с пространством профиля), F5 продолжает с того же места
  'placement',
  // SAT: хаб держит вкладку в ?satTab= сам (docs/sat/PLAN.md)
  'sat', 'sat-onboarding',
  // образец экрана вопроса (фаза 3): режим — в ?satSample=, черновик — на устройстве
  'sat-run',
  // диагностика держит шаг в ?satDiag= сама
  'sat-diagnostic',
  // учебная сессия держит себя в ?satSession= (или ?satLesson= до старта)
  'sat-study',
  // ежедневная проверка — одна на день, свой экран без меню (с 14.10.2026 из навигации убрана, диплинк остался)
  'sat-daily',
  // недельный тест (SAT-SYNC-PLAN B1) и past papers во всё окно (B6)
  'sat-weekly', 'sat-papers',
  // пробник и его разбор держат прохождение в ?satMock= (фаза — на сервере)
  'sat-mock',
  'sat-mock-review',
  // юнит курса держит код в ?satUnit=
  'sat-unit',
  // тарифы экзаменов: свои у SAT и IELTS, отдельно от витрины General English
  'sat-pricing', 'ielts-pricing',
])

// Тьютор раньше в URL не писался: F5 снимал ?screen=, restoreSession без
// deepLink оставлял стартовый 'welcome' (или уводил на kingdom) — жалоба
// «в тьюторе обновить = выкинуло на логин, в остальных разделах норм».
// Префикс tutor-* без runtime-id безопасен: дашборд/онбординг/сценарии
// поднимаются из профиля; voice-chat на F5 просто запросит новый LiveKit-токен.
function persistsInUrl(screen) {
  return PERSISTABLE_SCREENS.has(screen) || (typeof screen === 'string' && screen.startsWith('tutor-'))
}

// Всё, что открыто аккаунту класса преподавателя (признак boothAccount из
// /user/me). Остальной кабинет ему закрыт: аккаунт служебный и общий, копить в
// нём нечего — значит и чистить между учениками нечего.
const BOOTH_SCREENS = new Set(['booth', 'live-lesson'])

// Через сколько повторить проверку признака класса, если getIsBoothAccount
// (api.js) вернул null — сеть или бэкенд промолчали в момент входа. Пауза, не
// мгновенный повтор: та же секунда сети, скорее всего, ещё не отпустила.
const BOOTH_ACCOUNT_RETRY_MS = 4000

// sessionStorage вкладки или null: на сервере window нет, а в приватном режиме
// Safari сам доступ к хранилищу бросает.
function sessionStore() {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export default function App() {
  const { t, lang, setLang } = useI18n()
  // Стартуем с welcome: регистрация/вход — первое, что видит пользователь.
  // ?screen=… переопределяет начальный экран — так экраны тьютора остаются
  // достижимы для отладки/диплинков.
  //
  // Читать ?screen= прямо в useState нельзя: на сервере window нет, поэтому
  // SSR отрисовал бы 'welcome', а первый рендер клиента — экран из query, и
  // React ронял бы hydration mismatch. Поэтому первый рендер везде одинаковый
  // ('welcome'), а диплинк применяется эффектом уже после гидратации.
  const [screen, setScreenState] = useState('welcome')
  // Стек «откуда пришли» (lib/navStack.js): по нему «Назад» ведёт туда, откуда
  // экран открыли, а не в зашитое место. Читается сразу, а не эффектом: эффект
  // записи ниже на первом проходе стёр бы сохранённый стек раньше, чем его
  // прочли. Гидратации это не мешает — стек ничего не рисует, пока
  // восстанавливается сессия (первый экран всё равно 'welcome').
  const [navStack, setNavStack] = useState(() => readNavStack(sessionStore()))
  useEffect(() => {
    writeNavStack(sessionStore(), navStack)
  }, [navStack])
  const screenRef = useRef('welcome')
  // «Назад», которому некуда вернуться, идёт своим запасным переходом — и
  // этот переход не должен класть в стек экран, из которого как раз вышли.
  const skipPushRef = useRef(false)
  // Контекст экранов, который держит сам App (королевство тропы, id урока),
  // снимается в момент ухода: «назад» откроет тот же урок, даже если состояние
  // успели переписать. Функцию обновляет эффект ниже, у goBack.
  const appPlaceRef = useRef(() => undefined)
  // Все переходы идут через эту обёртку — так стек видит каждый, а не только
  // те, что прошли через handleNav (их больше ста, и половина — прямые
  // setScreen в пропсах экранов).
  const setScreen = useCallback((next) => {
    const prev = screenRef.current
    const skip = skipPushRef.current
    skipPushRef.current = false
    if (next === prev) return
    screenRef.current = next
    setResume(null)
    const place = !skip && isReturnable(prev)
      ? { ...appPlaceRef.current(prev), ...placeOf(prev), scrollY: window.scrollY }
      : undefined
    setNavStack((st) => (skip ? pushNav(st, null, next) : pushNav(st, prev, next, place)))
    setScreenState(next)
  }, [])
  // Пока проверяем сохранённый токен, не рисуем ни welcome, ни kingdom — иначе
  // у вернувшегося пользователя мелькнёт экран входа. Стартовое значение true
  // одинаково на сервере и клиенте, так что гидратация не ломается.
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    let cancelled = false
    const searchParams = new URLSearchParams(window.location.search)
    const deepLink = searchParams.get('screen')
    // Пришёл с лендинга после заявки: в адресе код с именем и номером
    // (src/landing/handoff.js). Из адреса убираем сразу — ему незачем
    // оставаться в истории, закладках и на скриншотах.
    const handoffToken = searchParams.get('handoff')
    // Пришёл с лендинга или с рекламы — запоминаем до регистрации: она уйдёт
    // менеджеру с тегом «Лендинг» и UTM-метками (src/lib/attribution.js).
    captureAttribution(window.location.search, safeStorage())
    // from=landing тоже убираем: адрес, которым поделились, иначе метил бы
    // «с лендинга» каждого, кто по нему пришёл.
    if (handoffToken || searchParams.has('from')) {
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('handoff')
      cleanUrl.searchParams.delete('from')
      window.history.replaceState(null, '', cleanUrl)
    }
    const inviteMatch = window.location.pathname.match(/^\/complete-registration\/([^/]+)/)
    const inviteToken = inviteMatch?.[1] || searchParams.get('invite')
    if (inviteToken) setInviteToken(inviteToken)
    // ?lesson=<id> — id живого урока для lesson-workspace (диплинк
    // ?screen=lesson-workspace&lesson=<id>). Не завязано на deepLink, чтобы
    // работать и когда screen меняется навигацией уже после первого рендера.
    const lessonParam = searchParams.get('lesson')
    if (lessonParam) {
      setLiveWorkspaceId(lessonParam)
      setWorkspaceSource('live')
    }
    // ?catalog=<id> — id урока каталога для lesson-workspace (диплинк
    // ?screen=lesson-workspace&catalog=<id>): грузим через loadCatalogLesson.
    const catalogParam = searchParams.get('catalog')
    if (catalogParam) {
      setLiveWorkspaceId(catalogParam)
      setWorkspaceSource('catalog')
    }
    // ?card=<адрес> — карточка урока, заданная на дом (?screen=lesson-workspace
    // &catalog=<id>&card=<адрес>). Ссылку на неё ученик открывает из домашней
    // работы, и она обязана пережить F5 — поэтому и читается, и пишется (см.
    // эффект синхронизации адреса ниже).
    const cardParam = searchParams.get('card')
    if (cardParam) setWorkspaceCardId(cardParam)
    // ?live=<id> — id живого урока для «Живой урок» (диплинк
    // ?screen=live-lesson&live=<id>). Отдельный параметр от lessonParam выше:
    // тот наполняет liveWorkspaceId для другого экрана (lesson-workspace), а
    // тут своё состояние — liveLessonId для LiveLessonPage.
    const liveParam = searchParams.get('live')
    if (liveParam) {
      setLiveLessonId(liveParam)
    }
    // Сеанс класса, который эта вкладка уже открывала (Правило 1 памяти
    // вкладки — sessionStorage, см. lib/session.js): переживает перезагрузку
    // ЭТОЙ вкладки, но не переживает её закрытие. Восстанавливаем здесь же,
    // рядом с ?live= выше, — тот же смысл «что вкладка помнит при загрузке».
    // Восстановленному id всё равно не верят на слово: статус занятия
    // перепроверяет сам BoothEntryPage, прежде чем предложить «Вернуться в
    // класс» (Правило 2).
    setBoothLessonId(loadBoothLessonId())
    // ?level=<A1|A2|…> — королевство для kingdom-interior (диплинк
    // ?screen=kingdom-interior&level=b1). Через карту туда не попасть, пока
    // уровень пользователя ниже, а смотреть тропу и урок нужно и до этого.
    const levelParam = searchParams.get('level')
    if (levelParam) {
      const want = levelParam.toUpperCase()
      const k = KINGDOMS.find((x) => x.level === want)
      if (k) setKingdom(k)
      // Тот же параметр открывает нужный уровень воркбука
      // (?screen=workbook&level=b2). Без него любой диплинк вёл на A0, и
      // проверить экран B2 можно было только кликами из каталога Практики.
      if (deepLink === 'workbook') setWorkbookTarget({ level: levelParam.toLowerCase() })
      // …и нужный уровень «Чтения» (?screen=reading&level=b1): каталог там
      // стартует с уровня пользователя, и проверить чужой уровень иначе никак.
      if (deepLink === 'reading') setReadingTarget({ level: levelParam.toLowerCase() })
      // …и уровень «Ситуаций» (?screen=situations&level=b1&item=3). Уровень
      // тут не «удобнее», а обязателен: экран открывается ровно на том уровне,
      // который выдала Практика, переключателя внутри нет.
      if (deepLink === 'situations') {
        const item = Number(searchParams.get('item'))
        setSituationsTarget({
          level: levelParam.toLowerCase(),
          id: Number.isFinite(item) && item > 0 ? item : null,
        })
      }
    }
    // ?screen=words&scene=farm — конкретная сцена «Слов в картинках».
    // Уровня у сцен нет вовсе (материал разбит по темам), поэтому адресуемся
    // сценой, а не level: без этого проверить сцену можно было бы только
    // кликами через каталог из пяти секций.
    if (deepLink === 'words') {
      const scene = searchParams.get('scene')
      const sec = searchParams.get('section')
      if (scene || sec) setWordsTarget({ sceneId: scene || null, section: sec || null })
    }
    // ?screen=verbs&part=practice — нужная часть «Неправильных глаголов»
    // (learn | table | practice): без неё экран открывался бы там, где
    // человек был в прошлый раз, и проверить тренажёр по ссылке было нельзя.
    if (deepLink === 'verbs') {
      const part = searchParams.get('part')
      if (part) setVerbsTarget({ part })
    }
    // ?screen=listenchoose&difficulty=hard — сложность «Слушай и выбирай»
    // (easy | medium | hard): без неё экран открывался бы на той, где человек
    // был в прошлый раз, и проверить сложность по ссылке было нельзя.
    if (deepLink === 'listenchoose') {
      const difficulty = searchParams.get('difficulty')
      if (difficulty) setListenChooseTarget({ difficulty })
    }
    // ?screen=arcade&game=runner — сразу в игру «Аркады», минуя зал: без
    // этого проверить Word Rush по ссылке можно было бы только кликом.
    if (deepLink === 'arcade') {
      const game = searchParams.get('game')
      if (game) setArcadeTarget({ game })
    }
    // ?screen=practice&level=a2&unit=3 — конкретный юнит «Практики». Ссылку
    // строит админка: преподаватель выдал юнит на дом и должен уметь открыть
    // ровно его. До этого попасть в юнит по адресу можно было только из
    // домашней работы ученика, то есть только из ученического аккаунта.
    // ?screen=ielts-reading-run&ieltsRun=<id>&ieltsMode=exam — прохождение теста IELTS Reading;
    // ?screen=ielts-reading-review&ieltsAttempt=<id> — разбор сданной попытки.
    // ?screen=ielts-listening-run&ieltsRun=<id>&ieltsMode=… и ?screen=ielts-dictation&ieltsRun=<id> — то же для Listening.
    if (deepLink === 'ielts-reading-run' || deepLink === 'ielts-listening-run' || deepLink === 'ielts-dictation' || deepLink === 'ielts-writing-run' || deepLink === 'ielts-speaking-run') {
      const id = searchParams.get('ieltsRun')
      if (id) setIeltsRunTarget({ testId: id, mode: searchParams.get('ieltsMode') || null })
    }
    // ?screen=ielts-diagnostic-result&ieltsAttempt=<id> — итог диагностики; без id — последняя
    if (deepLink === 'ielts-diagnostic-result') {
      const id = searchParams.get('ieltsAttempt')
      if (id) setIeltsReviewTarget({ attemptId: id })
    }
    // ?screen=ielts-mock&ieltsMock=<id> — описание mock; &ieltsMockSession=<id> — идущая или сданная попытка
    if (deepLink === 'ielts-mock') {
      const sid = searchParams.get('ieltsMockSession')
      const mid = searchParams.get('ieltsMock')
      // &ieltsMockView=submitted — сданная попытка экраном «Экзамен сдан», а не итогом (проверка вида и ссылки из истории)
      if (sid || mid) setIeltsMockTarget({ sessionId: sid || null, mockId: mid || null, view: searchParams.get('ieltsMockView') || undefined })
    }
    if (deepLink === 'ielts-reading-review') {
      const id = searchParams.get('ieltsAttempt')
      if (id) setIeltsReviewTarget({ attemptId: id })
    }
    if (deepLink === 'practice') {
      const unitTarget = practiceUnitTarget(searchParams)
      if (unitTarget) setPracticeTarget(unitTarget)
    }
    // ?unlock=1 — открыть все королевства и все уроки тропы для просмотра
    // контента. Только в дев-сборке: в проде это обошло бы гейтинг по уровню,
    // поэтому флаг снимается на этапе сборки, а не проверкой в рантайме.
    if (process.env.NODE_ENV !== 'production' && searchParams.get('unlock') === '1') {
      setDevUnlock(true)
    }

    // Без токена в localStorage restoreSession() не ходит в сеть и отдаёт null
    // синхронно — аноним не видит заметной паузы.
    const hadToken = Boolean(loadToken())
    restoreSession()
      .then(async (session) => {
        // Токен был, а сессии нет — restoreSession уже стёр мёртвый токен
        // (401 и рефреш не прошёл). Чистим хвосты прежнего ученика так же, как
        // «Выйти»: иначе следующий, кто войдёт на этом компьютере, получит его
        // тропу и навыки. До проверки cancelled — это уборка, не стейт.
        if (!session && hadToken) forgetExpiredSession()
        if (cancelled) return
        // Токен был, а сессии нет — человека сейчас встретит экран входа, и он
        // должен понять, что это срок, а не сбой: без слова «Сессия истекла»
        // это выглядело как «приложение само меня разлогинило».
        if (!session && hadToken) setSessionExpired(true)
        if (session) {
          setToken(session.token)
          setBoothAccount(!!session.boothAccount)
          hydratePractice(session.token)
          if (session.name) setName(session.name)
          if (session.phone) setPhone(session.phone)
        }
        // Демо-статус нужен ДО выбора первого экрана (ниже): демо-ученику мы
        // открываем «Главную» с его сроком и тарифами, а не карту королевств.
        // Ждём здесь же, где уже ждём профиль тьютора, — лишней паузы нет.
        const demo = await getDemoAccess(session?.token)
        if (cancelled) return
        setIsDemoAccount(demo.isDemo)
        setDemoExpiresAt(demo.expiresAt)
        setAccountCreatedAt(demo.createdAt ?? null)
        if (session && trackDemoState(demo.isDemo)) setCelebrate(true)
        // Выбор тьютора/интересов/профессии закреплён за профилем (аккаунт или
        // device-id) — восстанавливаем, чтобы перезагрузка не гоняла онбординг
        // заново. Ждём здесь же: спиннер и так висит, зато к первому экрану
        // навигация «Тьютор» уже знает, вести на dashboard или на welcome.
        const profile = await loadTutorProfile(session?.token)
        if (cancelled) return
        let backendLevel = null
        if (session?.token) {
          try {
            backendLevel = await getLanguageLevel(session.token)
          } catch {
            backendLevel = session.languageLevel || null
          }
        }
        // Профиль на бэкенде важнее теста: менеджер мог поменять A1→A2.
        // Пустой профиль — тогда результат теста из Neon, иначе «нужен тест».
        const displayLevel = resolveHomeLevel(backendLevel, profile?.level)
        if (displayLevel) {
          setUserLevel(displayLevel)
          syncProfileLevel(session?.token, backendLevel || displayLevel)
        }
        if (session?.token) setNeedsLevelTest(!displayLevel)
        if (!backendLevel && profile?.level && session?.token) {
          persistPlacementLevel(session.token, profile.level).catch(() => {})
        }
        if (profile) {
          if (profile.tutor) {
            setTutorKey(profile.tutor)
            setTemper(temperFor(profile.tutor, profile.tutorTemper))
            setTutorOnboarded(true)
          }
          setInterestIds(enToInterestIds(profile.interests))
          setProfileId(profile.deviceId || null)
          if (profile.profession) setProfession(profile.profession)
        }
        // Ссылка из админки важнее сессии: студент должен задать пароль.
        if (inviteToken) setScreen('complete-registration')
        // Ученик без номера (Google-вход его не даёт) дальше не идёт, пока не укажет: восстановленная
        // сессия не должна обходить гейт, который он прошёл бы при входе.
        else if (session && session.role === 'STUDENT' && !session.phone && !session.boothAccount) {
          setPhoneGate(true)
          setScreen('reg-phone')
        }
        // Заявка с лендинга: имя и номер человек уже дал там — сразу шаг
        // почты, как решил владелец (04.10.2026). Код не открылся (просрочен,
        // подделан) — регистрация с начала. Вошедшему регистрация не нужна:
        // он идёт на свой экран, как обычно (ветка session ниже).
        else if (handoffToken && !session) {
          const lead = await openLandingHandoff(handoffToken)
          if (cancelled) return
          if (lead) {
            setName(lead.name)
            setPhone(lead.phone)
            if (lead.lang === 'kz') setLang('kk')
            setScreen('reg-email')
          } else {
            setScreen('chat')
          }
        }
        else if (deepLink && !handoffToken) {
          setScreen(deepLink)
          // Гостю раздел открывается сразу, но стоит ему пойти логиниться — и
          // намерение пропадало: адрес чистит эффект синхронизации, а после
          // входа экран назначает homeScreenFor. Запоминаем, чтобы вернуть его
          // туда, куда он шёл (см. lib/pendingScreen.js). Вошедшему помнить
          // нечего — он уже на месте.
          if (!session) rememberPendingScreen(deepLink)
        }
        // Куда вести после входа — одно решение на все пути входа, см.
        // lib/homeScreen.js: аккаунт класса в класс, преподавателя в «Уроки»,
        // ученика на «Главную».
        else if (session) setScreen(homeScreenFor({
          token: session.token,
          boothAccount: !!session.boothAccount,
          tutorOnboarded: !!profile?.tutor,
        }))
      })
      .finally(() => {
        if (!cancelled) setRestoring(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const [name, setName] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [phone, setPhone] = useState('')
  // Почта студента при регистрации: номер → почта → код (на почту) → пароль,
  // оба идентификатора собираются ДО запроса кода (см. handleRegEmailSubmit).
  // Для входа не используется — там всё ещё один идентификатор в `phone`.
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthDateGate, setBirthDateGate] = useState(false)
  // Вход через Google не даёт телефон, а школе он нужен всегда: пока номера нет, дальше не пускаем
  // (экран 'reg-phone' в режиме googleGate). Тот же гейт ловит и старые Google-аккаунты без номера.
  const [phoneGate, setPhoneGate] = useState(false)
  const [mode, setMode] = useState('register') // 'register' | 'login' — что ответил бэкенд
  const [token, setToken] = useState(null)
  // Аккаунт IELTS (дизайн «IELTS new»): теста уровня General English на входе у такого ученика нет. «Повторение»
  // (тропа kingdom) с 13.10.2026 ему доступно — пункт есть в его меню (Sidebar.jsx, IELTS_SECTIONS).
  const [ieltsAccount, setIeltsAccount] = useState(false)
  useEffect(() => {
    if (!token) {
      setIeltsAccount(false)
      return
    }
    let alive = true
    getIeltsMe(token).then((m) => {
      if (alive) setIeltsAccount(!!m.ieltsAccount)
    })
    return () => {
      alive = false
    }
  }, [token])
  useEffect(() => {
    // «Повторение» (kingdom*) у ученика IELTS / SAT больше не уводит в IELTS — пункт вернулся в меню (SAT-SYNC-PLAN E3).
    // Без уровня CEFR вход ведёт на письменный тест уровня General English ('test-intro'). Ученику IELTS он не нужен:
    // его старт — онбординг и диагностика IELTS, их зовёт «Главная» (IeltsHomeCard). Признак аккаунта приходит
    // после входа отдельным запросом, поэтому поправляем уже открытый экран. Правило — lib/ieltsAccountRedirect.js.
    const to = ieltsAccountRedirect(ieltsAccount, screen)
    if (to) setScreen(to)
  }, [ieltsAccount, screen, setScreen])
  const [tutorKey, setTutorKey] = useState('spark') // выбранный тьютор
  // Нрав выбранного тьютора (ось 18+): 'calm' | 'harsh' | null. null — у тьютора
  // оси нет (Луна, Джарвис) либо профиль ещё не загрузился. Хранится рядом с
  // tutorKey, потому что это ровно то же самое решение ученика: кого слушать.
  const [temper, setTemper] = useState(null)
  // Онбординг тьютора пройден (тьютор сохранён в профиле) — сайдбар-«Тьютор»
  // ведёт сразу на dashboard, а не на welcome-цепочку.
  const [tutorOnboarded, setTutorOnboarded] = useState(false)
  // Тур по дашборду: включается один раз — сразу после онбординг-цепочки.
  // «Один раз» держится на отметке в localStorage (tourKeyFor), а не на этом
  // стейте: стейт умирает на перезагрузке, а смена тьютора гоняет цепочку
  // заново — раньше из-за этого тур выходил на каждый выбор тьютора.
  const [showTutorTour, setShowTutorTour] = useState(false)
  // Id профиля из /api/profile (`user-<id>` или device-id анонима) — им
  // разделяются отметки тура, чтобы «один раз» считалось на аккаунт.
  const [profileId, setProfileId] = useState(null)
  const [interestIds, setInterestIds] = useState([]) // id тем из tutor/interests.js
  const [profession, setProfession] = useState('')
  // Откуда открыт экран онбординг-цепочки: null — обычный первый проход,
  // 'manage' — точечная правка из «Управления тьютором». Тест уровня и опросник
  // ученик проходит ОДИН раз: их ответы лежат в профиле (tutor, interests,
  // profession, level), поэтому смена тьютора и правка данных возвращают в
  // управление/на дашборд, а не гоняют всю цепочку заново.
  const [tutorEditFrom, setTutorEditFrom] = useState(null)
  const [userLevel, setUserLevel] = useState('A1')
  // Демо-статус текущего аккаунта — решает, показывать ли на экранах «лимит
  // исчерпан» демо-CTA со ссылкой на WhatsApp поддержки (см. src/lib/support.js)
  // или обычный текст. Саморегистрация всегда демо (см. RegistrationService на
  // бэкенде); менеджер снимает флаг вручную.
  const [isDemoAccount, setIsDemoAccount] = useState(false)
  // До какого момента действует демо: по нему «Главная» рисует обратный отсчёт.
  // null — демо без срока (менеджер выдал доступ руками), таймера тогда нет.
  const [demoExpiresAt, setDemoExpiresAt] = useState(null)
  // Когда заведён аккаунт (/user/me): учившимся до теста v16 он не навязывается (src/placement/existingStudent.js).
  const [accountCreatedAt, setAccountCreatedAt] = useState(null)
  // «Поздравляем с покупкой!»: окно показывается один раз, когда аккаунт
  // перестал быть демо (менеджер открыл полный доступ) — своей оплаты в
  // приложении нет, см. lib/purchaseCelebration.js.
  const [celebrate, setCelebrate] = useState(false)
  // Сессия кончилась сама (токен протух), а не человек нажал «Выйти»: на экране
  // входа ему нужно сказать, почему его туда вернуло. Гасится, как только он
  // вошёл снова или закрыл плашку.
  const [sessionExpired, setSessionExpired] = useState(false)
  // Свежий handleLogout для подписки ниже: сама подписка ставится один раз, а
  // функция пересоздаётся на каждый рендер.
  const handleLogoutRef = useRef(null)
  // В профиле на бэкенде нет уровня (новый аккаунт или тест ещё не пройден) —
  // после success-экрана ведём на CEFR-тест, а не сразу в королевство.
  const [needsLevelTest, setNeedsLevelTest] = useState(false)
  // Тест уровня (v16) открывается с «Главной», из профиля и плана. Куда вернуть человека по «назад» с теста (null —
  // на «Главную»). Пересдачи как отдельного режима больше нет: уровень тест пишет только в пустой аккаунт.
  const [testReturn, setTestReturn] = useState(null)
  // Профиль General English (анкета «Главной», цель, формат — бэкенд /mobile/ge). null — ручки нет (старый бэкенд),
  // аккаунт IELTS (у него своя анкета) или гость: тогда «Главная» прежняя.
  const [geProfile, setGeProfile] = useState(null)
  // Для какого токена профиль уже спросили (ответил он или нет). Без этого null значил и «ручки нет», и «ещё не
  // ответила»: «Главная» на время запроса рисовала старую карточку уровня, а тур успевал стартовать по старым шагам.
  const [geLoadedFor, setGeLoadedFor] = useState(undefined)
  const geLoaded = !token || geLoadedFor === token
  const [geEdit, setGeEdit] = useState(false)
  // Словарь открыт ссылкой из урока или раздела (а не из меню) — у него есть
  // «Назад» туда, см. handleNav('vocab').
  const [vocabReturn, setVocabReturn] = useState(false)
  // Работа, которую открыть в «Домашней работе» (карточка «Главной»); null — первая по порядку.
  const [homeworkTarget, setHomeworkTarget] = useState(null)
  // Прокрутка, к которой вернуть экран после «назад» (goBack ниже). Только пока
  // на нём и стоим: ушёл дальше раньше, чем страница доросла, — докрутка
  // прекращается, иначе она крутила бы уже следующий экран.
  const [scrollBack, setScrollBack] = useState(null)
  useEffect(
    () => (scrollBack && scrollBack.screen === screen ? restoreScroll(scrollBack.y) : undefined),
    [scrollBack, screen],
  )
  useEffect(() => {
    if (!token) {
      setGeProfile(null)
      return undefined
    }
    let alive = true
    getIeltsMe(token)
      .then((m) => (m.ieltsAccount ? null : getGeProfile(token)))
      .then((p) => syncLegacyGoal(token, p))
      .then((p) => {
        if (alive) setGeProfile(p)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setGeLoadedFor(token)
      })
    return () => {
      alive = false
    }
  }, [token])
  const [scenario, setScenario] = useState(null) // выбранный сценарий (id) или null = свободный чат
  // История голосовых звонков (список + транскрипт) для «Управления тьютором».
  const [callHistory, setCallHistory] = useState([])
  const [selectedCall, setSelectedCall] = useState(null)
  // Отчёт после разговора. reportCall = готовая строка (открыт из истории),
  // null = экран сам дождётся, пока агент допишет звонок. prevCallId — слепок
  // «последнего звонка ДО этого разговора», по нему отчёт отличает свежую запись
  // от предыдущей (сравниваем id, а не время: created_at — часы базы).
  const [reportCall, setReportCall] = useState(null)
  const [reportOrigin, setReportOrigin] = useState('call')
  const [prevCallId, setPrevCallId] = useState(null)
  // Оценка разговорного теста (уровень + честное обоснование от Sonnet).
  const [placementResult, setPlacementResult] = useState(null)
  // Грузим историю звонков при заходе в «Управление тьютором». Bearer решает
  // чью историю отдать: с токеном — user-<id>, без — deviceId анонима.
  useEffect(() => {
    if (screen !== 'tutor-manage') return
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(
          '/api/profile/calls?deviceId=' + encodeURIComponent(getDeviceId()),
          { headers: authHeaders(token) },
        )
        const data = await res.json().catch(() => ({}))
        if (alive) setCallHistory(Array.isArray(data.calls) ? data.calls : [])
      } catch {
        if (alive) setCallHistory([])
      }
    })()
    return () => {
      alive = false
    }
  }, [screen, token])
  // Слепок последнего звонка перед разговором — см. prevCallId выше.
  useEffect(() => {
    if (screen !== 'tutor-voice-chat') return
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(
          '/api/profile/calls?limit=1&deviceId=' + encodeURIComponent(getDeviceId()),
          { headers: authHeaders(token) },
        )
        const data = await res.json().catch(() => ({}))
        const last = Array.isArray(data.calls) ? data.calls[0] : null
        // NO_PREVIOUS_CALL — звонков ещё не было; это НЕ то же самое, что null
        // (мы не смогли узнать). Разницу разбирает classifyCall.
        if (alive) setPrevCallId(last?.id ?? NO_PREVIOUS_CALL)
      } catch {
        if (alive) setPrevCallId(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [screen, token])
  const [kingdom, setKingdom] = useState(null)
  // Просмотр всего контента без гейтинга (?unlock=1, только dev) — см. эффект
  // диплинков ниже.
  const [devUnlock, setDevUnlock] = useState(false)
  const [liveLessonId, setLiveLessonId] = useState(null)
  // Аккаунт класса преподавателя (признак boothAccount из /user/me): кабинета у
  // него нет, единственный экран — сам класс (см. screens/BoothEntryPage.jsx).
  const [boothAccount, setBoothAccount] = useState(false)
  // Урок класса, который эта вкладка уже открыла. Нужен, чтобы возврат из урока
  // не звал вход в класс повторно: бэкенд закрыл бы открытый сеанс как забытый
  // и завёл новое занятие — с пустой доской. Стартовое значение читается из
  // sessionStorage эффектом диплинков ниже (Правило 1 памяти вкладки, см.
  // lib/session.js) — здесь просто null, чтобы SSR и первый клиентский рендер
  // совпадали (тот же приём, что у screen: настоящее восстановление только
  // эффектом, после гидратации).
  //
  // Прошлый отдельный признак «сеанс только что завершил преподаватель»
  // (boothLessonFinished) отсюда убран: раньше он был единственным
  // источником правды для состояния BoothEntryPage «урок завершён», жил
  // только в React-состоянии и терялся при перезагрузке (находка 1 второго
  // ревью). Теперь единственный источник правды — сам BoothEntryPage: он не
  // верит присланному lessonId на слово и перепроверяет статус занятия у
  // бэкенда при каждом монтировании (Правило 2), поэтому boothLessonId здесь
  // НЕ обнуляется, когда преподаватель завершает сеанс, — сеанс просто
  // остаётся «известным», а его протухший статус ловит проверка на экране.
  const [boothLessonId, setBoothLessonId] = useState(null)
  // id живого урока для workspace-экрана (диплинк ?screen=lesson-workspace&lesson=<id>,
  // см. эффект восстановления сессии ниже). Без диплинка остаётся null —
  // LessonWorkspacePage тогда показывает SAMPLE_LESSON.
  const [liveWorkspaceId, setLiveWorkspaceId] = useState(null)
  // 'live' — id из LiveLesson (jsonUrl), 'catalog' — id урока каталога (сырой
  // L*.html + клиентское извлечение). Определяет, чем workspace грузит контент.
  const [workspaceSource, setWorkspaceSource] = useState('live')
  // Адрес карточки урока, заданной на дом (см. src/lib/lessonCardId.js). Экран
  // урока открывается на её шаге и подъезжает к ней; null — обычное открытие
  // урока целиком.
  const [workspaceCardId, setWorkspaceCardId] = useState(null)
  const [shadowingLesson, setShadowingLesson] = useState('sg') // урок Shadowing, выбранный на карточке Практики
  // Юнит «Практики», который задали на дом: с карточки домашней работы
  // открываем сразу его, а не общий список — иначе ученик ищет глазами то,
  // на что уже нажал.
  const [practiceTarget, setPracticeTarget] = useState(null)
  const [writingTarget, setWritingTarget] = useState(null) // { level?, genreId? } — прыжок из Практики сразу в уровень/жанр Writing
  const [workbookTarget, setWorkbookTarget] = useState(null) // { level } — какой воркбук открыть из Практики
  const [listeningTarget, setListeningTarget] = useState(null) // { level } — какой уровень аудирования открыть из домашки
  const [wordsTarget, setWordsTarget] = useState(null) // { section?, sceneId? } — прыжок из Практики в секцию/сцену «Слов в картинках»
  const [verbsTarget, setVerbsTarget] = useState(null) // { part? } — нужная часть «Неправильных глаголов»
  // { level, id? } — уровень «Ситуаций» и, по желанию, номер сценария. Уровень
  // обязателен: переключателя внутри экрана нет (он единица квоты), поэтому
  // без него открывать нечего.
  const [situationsTarget, setSituationsTarget] = useState(null)
  const [listenChooseTarget, setListenChooseTarget] = useState(null) // { difficulty? } — сложность «Слушай и выбирай»
  // Игра «Аркады» из диплинка или карточки Практики (+ вкладка, куда
  // вернуться): { game: 'speak'|'runner'|null, skill }.
  const [arcadeTarget, setArcadeTarget] = useState(null)
  // IELTS: куда открыть хаб (вкладка/экран «Обучения»), какой тест проходить и какую попытку разбирать
  const [ieltsTarget, setIeltsTarget] = useState(null)
  const [ieltsRunTarget, setIeltsRunTarget] = useState(null)
  const [ieltsMockTarget, setIeltsMockTarget] = useState(null)
  const [ieltsReviewTarget, setIeltsReviewTarget] = useState(null)
  const [readingTarget, setReadingTarget] = useState(null) // { level?, textId? } — прыжок из Практики в уровень/текст «Чтения»
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Единая точка простановки признака класса после входа (было продублировано
  // в трёх обработчиках). Помимо стейта дописывает признак в уже сохранённый
  // snapshot: saveUserSnapshot в обработчиках входа отрабатывает раньше, чем
  // придёт этот ответ, и без дописывания снимок остаётся без boothAccount —
  // а именно снимок держит ответ на «кто вошёл», когда бэкенд недоступен
  // (restoreSession откатывается на него и не сбрасывает токен). Перезагрузка
  // сразу после свежего входа при недоступном бэкенде тогда дала бы
  // boothAccount: false, и пришедший на пробный уехал бы в кабинет, которого
  // у его аккаунта нет.
  //
  // Патчим снимок через patchBoothAccount (lib/session.js), а не голым
  // patchUserSnapshot: тот патчит только достоверное true, не давая
  // подтверждённому классу тихо откатиться на «не класс».
  //
  // getIsBoothAccount отдаёт null, когда ответа не было вовсе (сеть/5xx, см.
  // api.js) — это НЕ «не класс», и трогать им state или снимок нельзя: аккаунт
  // класса без кабинета уехал бы на карту королевств без возврата (диплинк
  // ?screen=booth сам выгоняет не-класс на домашний экран). На null не делаем
  // ничего и один раз повторяем попытку через паузу; если и повтор ни с чем —
  // оставляем как есть, следующее восстановление сессии всё равно спросит
  // бэкенд заново.
  function applyBoothAccount(tok) {
    getIsBoothAccount(tok).then((isBooth) => {
      if (isBooth === null) {
        setTimeout(() => {
          getIsBoothAccount(tok).then((retried) => {
            if (retried === null) return
            setBoothAccount(retried)
            patchBoothAccount(retried)
          })
        }, BOOTH_ACCOUNT_RETRY_MS)
        return
      }
      setBoothAccount(isBooth)
      patchBoothAccount(isBooth)
    })
  }

  const tutor = getTutor(tutorKey) // { key, name, avatar, ... }
  // Жёсткий нрав (кнопка 18+) открыт всем — возрастной замок снят 24.09.2026
  // по решению владельца. «18+» на кнопке — название характера, не гейт.

  // Экран 'phone' — только вход по коду (фолбэк для аккаунтов без пароля,
  // см. onOtpLogin в PasswordLoginPage). Регистрация через него больше не
  // идёт — там свой путь: 'reg-phone' → 'reg-email' → 'otp', см. ниже.
  async function handlePhoneSubmit(fullPhone) {
    setError('')
    setLoading(true)
    try {
      const m = await requestLoginOtp(fullPhone)
      setMode(m)
      setPhone(fullPhone)
      setScreen('otp')
    } catch (e) {
      const key = phoneErrorKey(e)
      setError(key ? t(key) : e.message || t('err.send'))
    } finally {
      setLoading(false)
    }
  }

  // Шаг 1 регистрации: только номер — код ещё не запрашиваем, сперва нужна
  // почта (см. handleRegEmailSubmit), она и есть канал OTP.
  function handleRegPhoneSubmit(fullPhone) {
    if (phoneGate) return handleGooglePhoneSubmit(fullPhone)
    setError('')
    setPhone(fullPhone)
    setScreen('reg-email')
  }

  // Шаг 2 регистрации: почта собрана — дальше дата рождения, потом OTP.
  function handleRegEmailSubmit(emailValue) {
    setError('')
    setEmail(emailValue)
    setScreen('reg-birth')
  }

  // Шаг 3 регистрации: дата рождения — оба идентификатора и birthDate известны,
  // теперь запрашиваем код на почту.
  async function handleRegBirthSubmit(birthDateValue) {
    setError('')
    setLoading(true)
    try {
      if (birthDateGate) {
        await updateUser(token, { name: name || 'User', birthDate: birthDateValue })
        setBirthDate(birthDateValue)
        setBirthDateGate(false)
        await finishGoogleSession(token)
        return
      }
      setBirthDate(birthDateValue)
      const m = await sendRegistrationOtp(name, phone, email, birthDateValue)
      setMode(m)
      setScreen('otp')
    } catch (e) {
      const key = phoneErrorKey(e)
      setError(key ? t(key) : e.message || t('err.send'))
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(code) {
    setError('')
    setLoading(true)
    try {
      // Регистрация шлёт номер и почту вместе (оба уже собраны на предыдущих
      // шагах) и создаёт аккаунт сразу с обоими; вход проверяет код по тому
      // единственному идентификатору, с которого начали. Оба пути отдают
      // токен прямо в ответе — код теперь настоящий случайный (см. бэкенд,
      // RandomOtpGeneratorService), получить токен повторным запросом OTP и
      // угадыванием кода, как раньше, больше нельзя.
      const data =
        mode === 'register'
          ? await verifyRegistrationOtp(name, phone, email, code, birthDate)
          : await verifyLoginOtp(phone, code)
      const tok = data?.accessToken || null
      // Та же причина, что у входа по паролю: у входа по коду имя в стейте
      // пустое, и взять его неоткуда, кроме ответа. Регистрации ответ вернёт
      // ровно то имя, которое она и отправила, поэтому ветка одна на два режима
      // — и совпадает с тем, что уходит в снимок строчкой ниже.
      setName(data?.name || name || '')
      setToken(tok || null)
      saveToken(tok || null, data?.refreshToken || null)
      if (tok && data) {
        saveUserSnapshot({
          userId: data.userId,
          name: data.name || name || null,
          phone: data.phone || phone || null,
          email: data.email || email || null,
          role: data.role || null,
        })
      }
      // Уровень: профиль на бэкенде главнее теста. Если в карточке пусто —
      // берём результат онбординга из профиля приложения.
      let lvl = null
      let lvlKnown = false
      if (tok) {
        try {
          lvl = await getLanguageLevel(tok)
          lvlKnown = true
        } catch (e) {
          console.warn('Не удалось получить уровень из профиля:', e)
        }
      }
      if (lvl) setUserLevel(lvl)
      // Профиль на бэкенде — истина: там же лежит ручная правка менеджера.
      // Переносим её в свою копию, из которой читает тьютор (syncProfileLevel).
      syncProfileLevel(tok, lvl)
      if (tok) applyDemoAccess(tok)
      if (tok) applyBoothAccount(tok)
      // При сетевой осечке уровень неизвестен — тестом не пристаём, кроме
      // свежей регистрации: у неё уровня заведомо ещё нет.
      setNeedsLevelTest(lvlKnown ? !lvl : mode !== 'login')
      // Новый аккаунт всегда проходит онбординг тьютора с нуля: сбрасываем
      // выбор, который мог остаться в стейте вкладки от анонима или прошлого
      // юзера этого браузера (merge анкету тоже не переносит — см. merge.js).
      if (mode === 'register') {
        setTutorKey('spark')
        setTemper(null)
        setTutorOnboarded(false)
        setInterestIds([])
        setProfession('')
      }
      // Прогресс, накопленный до входа, перевешиваем на аккаунт — иначе человек
      // увидит пустой словарь и забывшего его тьютора. Не ждём: вход не должен
      // упираться в эту запись. После переноса подтягиваем профиль аккаунта:
      // у вернувшегося юзера (login) там уже лежат тьютор/интересы с прошлых
      // сессий; у свежего аккаунта анкета пуста, и подтяжка ничего не меняет.
      if (tok) {
        mergeAnonymousProgress(tok)
          .then(() => loadTutorProfile(tok))
          .then((profile) => {
            if (!profile) return
            // Тест, пройденный до регистрации, переносится на аккаунт вместе с
            // профилем — но бэкенд о его уровне не знает (аноним туда не
            // писал). Дописываем: иначе аккаунт снова попросят пройти тест, а
            // пройти его уже нельзя — он проходится один раз.
            const display = resolveHomeLevel(lvl, profile.level)
            if (display) {
              setUserLevel(display)
              if (!lvl) persistPlacementLevel(tok, display).catch(() => {})
              setNeedsLevelTest(false)
            }
            if (profile.tutor) {
              setTutorKey(profile.tutor)
              setTemper(temperFor(profile.tutor, profile.tutorTemper))
              setTutorOnboarded(true)
            }
            setInterestIds(enToInterestIds(profile.interests))
            setProfileId(profile.deviceId || null)
            if (profile.profession) setProfession(profile.profession)
          })
        clearLocalPractice()
        hydratePractice(tok)
      }
      // Оба идентификатора уже собраны и отправлены на верификацию выше —
      // после кода сразу «задать пароль». Свежий аккаунт заводится без
      // пароля (RegistrationService пишет null) — просим задать его, иначе
      // войти потом можно будет только новым OTP-кодом. Без токена шаг
      // пропускаем: ставить пароль нечем.
      setScreen(mode === 'register' && tok ? 'set-password' : 'success')
    } catch (e) {
      const key = phoneErrorKey(e)
      setError(key ? t(key) : e.message || t('err.otp'))
    } finally {
      setLoading(false)
    }
  }

  // Постоянный пароль сразу после регистрации. Токен уже есть (получен по OTP
  // строчкой выше), поэтому эндпоинт авторизованный и текущий пароль не нужен.
  async function handleSetPassword(password) {
    setError('')
    setLoading(true)
    try {
      await setPassword(token, password)
      setScreen('success')
    } catch (e) {
      setError(e.message || t('setpass.error'))
    } finally {
      setLoading(false)
    }
  }

  // Вход по паролю (телефон или почта). Пост-логин — тот же, что у OTP:
  // уровень из профиля, перенос анонимного прогресса, тьютор-профиль.
  async function handlePasswordLogin(identifier, password) {
    setError('')
    setLoading(true)
    try {
      const data = await loginWithPassword(identifier, password)
      const tok = data?.accessToken || null
      if (!tok) throw new Error(t('login.failed'))
      // Имя приезжает только этим ответом: экран входа его перед собой чистит
      // (onLogin → setName('')), а сам сеанс восстановления не проходит. Без
      // этой строки сайдбар и профиль весь сеанс показывали «Без имени», и имя
      // появлялось лишь после F5 — там его ставит restoreSession. В снимок
      // localStorage строчкой ниже оно писалось и раньше, в стейт — нет.
      setName(data.name || '')
      setPhone(identifier)
      setToken(tok)
      saveToken(tok, data?.refreshToken || null)
      saveUserSnapshot({
        userId: data.userId,
        name: data.name || null,
        phone: data.phone || (isEmailIdentifier(identifier) ? null : identifier),
        email: data.email || (isEmailIdentifier(identifier) ? identifier : null),
        role: data.role || null,
      })
      let lvl = null
      try {
        // null = уровня в профиле нет (тест не пройден или его результат не
        // сохранился) — предлагаем тест снова. Исключение = «не знаю»: тестом
        // не пристаём, чтобы сетевая осечка не гоняла студента по кругу.
        lvl = await getLanguageLevel(tok)
        if (lvl) setUserLevel(lvl)
        syncProfileLevel(tok, lvl)
        setNeedsLevelTest(!lvl)
      } catch (e) {
        console.warn('Не удалось получить уровень из профиля:', e)
      }
      applyDemoAccess(tok)
      applyBoothAccount(tok)
      mergeAnonymousProgress(tok)
        .then(() => loadTutorProfile(tok))
        .then((profile) => {
          if (!profile) return
          const display = resolveHomeLevel(lvl, profile.level)
          if (display) {
            setUserLevel(display)
            if (!lvl) persistPlacementLevel(tok, display).catch(() => {})
            setNeedsLevelTest(false)
          }
          if (profile.tutor) {
            setTutorKey(profile.tutor)
            setTemper(temperFor(profile.tutor, profile.tutorTemper))
            setTutorOnboarded(true)
          }
          setInterestIds(enToInterestIds(profile.interests))
          setProfileId(profile.deviceId || null)
          if (profile.profession) setProfession(profile.profession)
        })
      clearLocalPractice()
      hydratePractice(tok)
      setScreen('success')
    } catch (e) {
      // Бэкенд на неверную пару отдаёт 401 с техническим текстом — показываем
      // человеческую формулировку.
      setError(e?.status === 401 ? t('login.failed') : e.message || t('login.failed'))
    } finally {
      setLoading(false)
    }
  }

  async function finishGoogleSession(tok) {
    let lvl = null
    try {
      lvl = await getLanguageLevel(tok)
      if (lvl) setUserLevel(lvl)
      syncProfileLevel(tok, lvl)
      setNeedsLevelTest(!lvl)
    } catch (e) {
      console.warn('Не удалось получить уровень из профиля:', e)
    }
    applyDemoAccess(tok)
    applyBoothAccount(tok)
    mergeAnonymousProgress(tok)
      .then(() => loadTutorProfile(tok))
      .then((profile) => {
        if (!profile) return
        const display = resolveHomeLevel(lvl, profile.level)
        if (display) {
          setUserLevel(display)
          if (!lvl) persistPlacementLevel(tok, display).catch(() => {})
          setNeedsLevelTest(false)
        }
        if (profile.tutor) {
          setTutorKey(profile.tutor)
          setTemper(temperFor(profile.tutor, profile.tutorTemper))
          setTutorOnboarded(true)
        }
        setInterestIds(enToInterestIds(profile.interests))
        setProfileId(profile.deviceId || null)
        if (profile.profession) setProfession(profile.profession)
      })
    clearLocalPractice()
    hydratePractice(tok)
    setScreen('success')
  }

  // Вход через Google: GIS уже отдал проверяемый id_token, бэкенд его
  // верифицирует и находит/создаёт пользователя. Дальше — тот же пост-логин,
  // что и после OTP: токен, уровень из профиля, перенос анонимного прогресса.
  async function handleGoogleCredential(idToken, chatName) {
    setError('')
    setLoading(true)
    try {
      const data = await loginWithGoogle(idToken)
      const tok = data?.accessToken || null
      if (!tok) throw new Error(t('err.otp'))
      setName(data?.name || chatName || '')
      setToken(tok)
      saveToken(tok, data?.refreshToken || null)
      saveUserSnapshot({
        userId: data.userId,
        name: data?.name || chatName || null,
        phone: data.phone || null,
        email: data.email || null,
        role: data.role || null,
      })
      const me = await getCurrentUser(tok).catch(() => null)
      // Номер обязателен: бэкенд говорит об этом флагом, а при его отсутствии (старый сервер) смотрим профиль.
      if (data?.phoneRequired === true || (me && !me.phone)) {
        setPhoneGate(true)
        setScreen('reg-phone')
        return
      }
      await continueGoogleOnboarding(tok, me)
    } catch (e) {
      setError(e.message || t('err.otp'))
    } finally {
      setLoading(false)
    }
  }

  // После номера (или если он уже был): дата рождения, затем обычный пост-логин.
  async function continueGoogleOnboarding(tok, knownMe) {
    const me = knownMe ?? (await getCurrentUser(tok).catch(() => null))
    if (!me?.birthDate) {
      setBirthDateGate(true)
      setScreen('reg-birth')
      return
    }
    setBirthDate(String(me.birthDate).slice(0, 10))
    await finishGoogleSession(tok)
  }

  // Номер после Google-входа: сохраняем в профиль (PUT /user/update) БЕЗ подтверждения кодом — SMSC пока не
  // настроен, ученик просто вводит номер и проходит дальше. Проверку кодом (запрос OTP → ввод → сохранение)
  // подключать здесь, между экраном номера и updateUser. Смена номера меняет JWT subject, поэтому
  // бэкенд присылает свежую пару токенов — подменяем её, иначе refresh пойдёт по старому subject.
  async function handleGooglePhoneSubmit(fullPhone) {
    setError('')
    setLoading(true)
    try {
      const saved = await updateUser(token, { name: name || 'User', phone: fullPhone })
      let tok = token
      if (saved?.accessToken) {
        tok = saved.accessToken
        setToken(tok)
        saveToken(tok, saved.refreshToken || null)
      }
      setPhone(fullPhone)
      patchUserSnapshot({ phone: saved?.phone || fullPhone })
      setPhoneGate(false)
      await continueGoogleOnboarding(tok, null)
    } catch (e) {
      // Занятый номер бэкенд называет по-русски; показываем текст на языке интерфейса.
      setError(/уже есть/i.test(e?.message || '') ? t('err.userExists') : e?.message || t('regphone.error'))
    } finally {
      setLoading(false)
    }
  }

  // Уровень, поставленный тестом, пишем в оба стора (persistPlacementLevel): backend — источник правды при входе,
  // Neon-профиль — то, что читает голосовой тьютор. Только в пустой аккаунт: тарифный уровень тест не трогает
  // (решение владельца 30.09.2026, подтверждено 14.10 для теста v16). Тест отдаёт итог несколько раз (показан,
  // «продолжить», переход в задание) — уже записанный уровень второй раз в сеть не шлём.
  const lastSavedTestLevel = useRef(null)

  async function saveTestLevel(level) {
    if (!level) return null
    if (lastSavedTestLevel.current === level) return level
    // Уровень показываем сразу: экраны читают его из стейта, ждать сети незачем.
    setUserLevel(level)
    const res = await persistPlacementLevel(token, level)
    if (res.level && res.level !== level) setUserLevel(res.level)
    if (!res.ok) {
      console.warn('Не удалось сохранить уровень:', res.error)
      return null
    }
    lastSavedTestLevel.current = level
    // Снимаем «нужен тест» только когда уровень действительно лёг в профиль: иначе «Главная» должна звать на тест
    // снова, а не считать его пройденным по несохранённому результату.
    setNeedsLevelTest(false)
    return res.level || level
  }

  // Куда уходить с теста уровня — см. testExitScreen (lib/homeScreen.js). Функция, а
  // не константа: tutorHome объявлен ниже по телу компонента.
  function testExit() {
    return testExitScreen({ testReturn, tutorHome })
  }

  // Тест уровня v16 — откуда бы его ни открыли (закрытый блок «Главной», профиль, план, старые адреса test-intro и
  // test). returnTo — куда вернуть по «назад».
  function openPlacement(returnTo = null) {
    setTestReturn(returnTo)
    setScreen('placement')
  }

  // Мост теста ставит колбэки в iframe один раз на загрузку, а между событиями итога (показан → «продолжить») App
  // успевает перерисоваться: колбэки читают свежее состояние отсюда, иначе второе событие увидело бы старый профиль
  // GE и записало бы анкету дважды.
  const placementState = useRef({})
  useEffect(() => {
    placementState.current = { token, needsLevelTest, userLevel, geProfile }
  })
  const placementChain = useRef(Promise.resolve())
  // Растёт с каждым сохранённым итогом — «Главная» по нему перечитывает отчёт.
  const [placementVersion, setPlacementVersion] = useState(0)

  // Итог теста v16 (спека 2026-10-14): конверт — в базу (отчёт «Главной»), уровень — в пустой аккаунт, ответы анкеты —
  // в профиль General English, если анкета ещё не заполнялась (анкета теста заменила нашу). События идут цепочкой.
  function finalizePlacement(env) {
    const run = async () => {
      const st = placementState.current
      if (!st.token || !env) return
      if (await saveAttempt(st.token, env)) setPlacementVersion((v) => v + 1)
      let level = st.needsLevelTest ? null : st.userLevel
      const tested = levelFromEnvelope(env)
      if (st.needsLevelTest && tested) level = await saveTestLevel(tested)
      const ge = placementState.current.geProfile
      if (!level || !ge || ge.onboarded) return
      const body = geProfileBody(env, level)
      const p = body ? await saveGeProfile(st.token, body).catch(() => null) : null
      if (p) {
        placementState.current = { ...placementState.current, geProfile: p }
        setGeProfile(p)
      }
    }
    placementChain.current = placementChain.current.then(run, run)
    return placementChain.current
  }

  // «Продолжить» на итоге теста: анкета только что легла в профиль GE и формат не выбран — на маршрут (формат
  // обучения спрашивает он, решение 14.10); иначе туда, откуда пришли.
  async function continueAfterPlacement(env) {
    await finalizePlacement(env)
    const ge = placementState.current.geProfile
    const next = ge?.onboarded && !ge.route ? 'ge-route' : testExit()
    setTestReturn(null)
    setScreen(next)
  }

  // Задание из рекомендаций или раздел с экрана итога: итог сохраняем до ухода — iframe с ним сейчас размонтируется.
  async function leavePlacementTo(nav, env) {
    await finalizePlacement(env)
    setTestReturn(null)
    handleNav(nav.key, nav.payload)
  }

  // Ответы анкеты сохранены. «С нуля» бэкенд сам поставил A0 — App узнаёт уровень из ответа, без перечитывания профиля.
  // Анкету теперь открывают только правкой цели с «Главной» и маршрута; «нужен тест» — это тест v16.
  function handleGeSaved(p, next) {
    if (p) {
      setGeProfile(p)
      const lv = p.journey?.current?.level
      if (lv && needsLevelTest) {
        setUserLevel(lv)
        setNeedsLevelTest(false)
      }
    }
    setGeEdit(false)
    if (next === 'test') openPlacement('home')
    else setScreen('ge-route')
  }

  // Завершение голосового placement-теста: сохраняем определённый Sonnet уровень
  // в профиль и показываем экран результата (кружок с уровнем).
  async function handlePlacementDone(level, assessment) {
    setPlacementResult(assessment || null)
    if (level) setUserLevel(level)
    if (level) {
      // Тот же путь, что у письменного теста: запись с повтором и проверкой
      // чтением. «Тест не нужен» снимаем только по подтверждённой записи.
      const res = await persistPlacementLevel(token, level)
      if (res.ok) setNeedsLevelTest(false)
      else console.warn('Не удалось сохранить уровень:', res.error)
    }
    setScreen('tutor-level-result')
  }

  // Выход из аккаунта: чистим токен и возвращаем на welcome.
  /**
   * Куда сажать человека сразу после входа.
   *
   * Обычно — домашний экран его роли (lib/homeScreen.js). Но если он пришёл по
   * присланной ссылке и логинился ровно затем, чтобы её открыть, вернуть его
   * надо туда, куда он шёл, а не на «Главную», где этот текст ещё надо найти.
   *
   * Намерение съедается при первом же применении: следующий вход в этой
   * вкладке — уже про другое, в том числе под другим аккаунтом.
   *
   * Сверяем с persistsInUrl, а не просто «строка не пуста»: возвращаем только
   * на экраны, которые вообще открываются по адресу. Значение могло лечь ещё
   * прошлой версией приложения, где экран назывался иначе, — и человек получил
   * бы пустоту вместо кабинета.
   */
  function screenAfterLogin() {
    const home = homeScreenFor({ token, boothAccount, needsLevelTest, tutorOnboarded })
    const pending = consumePendingScreen()
    // Аккаунт класса важнее любой ссылки: кабинет ему закрыт весь, кроме
    // класса и урока (BOOTH_SCREENS выше), и страж всё равно увёл бы его назад.
    if (boothAccount) return home
    const target = pendingScreenAfterLogin(pending, {
      persists: persistsInUrl,
      // Урок с карточкой открывается не по имени экрана, а по прочитанному из
      // ссылки адресу — см. pendingScreenAfterLogin.
      hasCardAddress: Boolean(workspaceCardId) && liveWorkspaceId != null,
    })
    // Теста при входе больше нет (14.10.2026): ученик попадает на «Главную», где тест ждёт в закрытом блоке
    // роадмапа, — поэтому и ссылка, по которой он пришёл, открывается сразу.
    return target ?? home
  }

  // Сессия кончилась посреди работы: lib/session.js сообщает сюда, когда
  // бэкенд отверг и access, и refresh. Выход тот же, что по кнопке «Выйти» —
  // иначе следующий вошедший унаследовал бы чужие хвосты, — плюс слово о причине.
  useEffect(() => {
    handleLogoutRef.current = handleLogout
  })
  useEffect(() => {
    setSessionHooks({
      // Access протух, но refresh принят: человек даже не заметил, но состояние
      // держит старый токен — без обновления каждый следующий запрос снова бы 401.
      onRefreshed: (tok) => setToken(tok),
      onExpired: () => {
        handleLogoutRef.current?.()
        setSessionExpired(true)
      },
    })
    return () => setSessionHooks({})
  }, [])
  // Вошёл снова — плашка своё отработала.
  useEffect(() => {
    if (token) setSessionExpired(false)
  }, [token])

  function handleLogout() {
    // Последние ответы уходящего ученика ещё могут ждать отправки (флаш через
    // 800 мс) — отправляем их под его токеном, пока токен не стёрт. Ниже
    // clearAccountLeftovers снимет таймер, и под чужим токеном они не уйдут.
    flushSkillStats()
    clearToken()
    clearLocalPractice()
    // Прогресс уроков, навыки и недельный снимок не привязаны к аккаунту и
    // иначе доставались следующему ученику на этом же компьютере.
    clearAccountLeftovers()
    // Намерение принадлежит тому, кто пришёл по ссылке. Не сняв его, следующий
    // вход в этой же вкладке увёл бы другого человека на чужой текст.
    clearPendingScreen()
    // Путь «откуда пришли» — тоже его: «назад» следующего ученика в этой
    // вкладке не должен вести по чужим экранам. skipPush — и экран, с которого
    // вышли, в новый путь не кладём.
    setNavStack([])
    skipPushRef.current = true
    setToken(null)
    setName('')
    setPhone('')
    setEmail('')
    setIsDemoAccount(false)
    setDemoExpiresAt(null)
    // Иначе следующий вход под обычным аккаунтом поймал бы чужой переход и
    // поздравил с покупкой человека, который ничего не покупал.
    forgetDemoState()
    setCelebrate(false)
    // Аккаунт класса общий: в той же вкладке следующий пользователь не должен
    // унаследовать ни признак, ни чужой сеанс урока. Снимаем признак ЗДЕСЬ, в
    // одном обновлении с setScreen('welcome') ниже: страж кабинета (задача 6)
    // смотрит на пару «признак + экран», и если бы признак снимался отдельным
    // тиком, он успел бы вернуть вышедшего обратно в класс.
    setBoothAccount(false)
    setBoothLessonId(null)
    // Забываем и в sessionStorage — иначе следующий вошедший в этой же
    // вкладке (аккаунт общий, устройство общее) унаследовал бы чужой сеанс
    // урока при простом восстановлении по Правилу 1 памяти вкладки.
    saveBoothLessonId(null)
    // liveLessonId — та же история: «известный урок» ниже (knownBoothLessonId)
    // иначе прочитал бы чужой liveLessonId прошлого пользователя вкладки как
    // сеанс следующего аккаунта класса.
    setLiveLessonId(null)
    // Тьютор-профиль принадлежит аккаунту — в той же вкладке следующий юзер
    // не должен унаследовать чужой выбор.
    setTutorKey('spark')
    setTemper(null)
    setTutorOnboarded(false)
    setProfileId(null)
    setInterestIds([])
    setProfession('')
    setNeedsLevelTest(false)
    setTestReturn(null)
    setAccountCreatedAt(null)
    setScreen('welcome')
  }

  // Домашний экран тьютора: dashboard после онбординга, welcome-цепочка до.
  const tutorHome = tutorOnboarded ? 'tutor-dashboard' : 'tutor-welcome'

  // Куда уходить с экрана онбординг-цепочки. Обычный проход идёт дальше по
  // цепочке; заход из «Управления тьютором» (смена тьютора, правка интересов,
  // пересдача теста) возвращает назад в управление и снимает пометку, чтобы она
  // не протекла в следующий проход.
  function goAfterTutorEdit(nextInChain, back = 'tutor-manage') {
    if (tutorEditFrom === 'manage') {
      setTutorEditFrom(null)
      setScreen(back)
      return
    }
    setScreen(nextInChain)
  }

  // Отметка «тур дашборда показан» — на профиль. Профиль ещё не подтянулся
  // (свежая регистрация) — падаем на device-id: он стабилен для этого браузера.
  const tutorTourKey = tourKeyFor(profileId || getDeviceId())
  // Туры «Обучения» и «Практики» отмечаются своими ключами: экраны разные, и
  // пройденный тьюторский не должен закрывать их (и наоборот).
  const learnTourKey = tourKeyFor(profileId || getDeviceId(), 'learn')
  const practiceTourKey = tourKeyFor(profileId || getDeviceId(), 'practice')
  const lessonsTourKey = tourKeyFor(profileId || getDeviceId(), 'lessons')
  const homeworkTourKey = tourKeyFor(profileId || getDeviceId(), 'homework')
  const vocabTourKey = tourKeyFor(profileId || getDeviceId(), 'vocab')
  const homeTourKey = tourKeyFor(profileId || getDeviceId(), 'home')
  const gePlanTourKey = tourKeyFor(profileId || getDeviceId(), 'ge-plan')

  // Держим ?screen= (и служебный ?live= для «Живого урока») в URL синхронными
  // с текущим экраном (см. PERSISTABLE_SCREENS выше) — обновление страницы (F5)
  // читает их тем же deepLink-путём, что и явный диплинк, и остаётся там же, а
  // не на дефолтном экране роли (жалоба: во время живого урока F5 выбрасывал
  // на главную).
  useEffect(() => {
    if (restoring) return
    // Само решение — чистой функцией в lib/screenUrlParams.js: там оно
    // проверяется тестами, а здесь остаётся только запись.
    const url = new URL(window.location.href)
    const changed = applyScreenUrlParams(url, screenUrlParams({
      screen,
      persists: persistsInUrl(screen),
      liveLessonId,
      liveWorkspaceId,
      workspaceCardId,
    }))
    // SAT держит своё состояние в ?satTab=, ?satMock= и т.п.; вне SAT-экранов оно не нужно и не должно оставаться в адресе
    let satLeft = false
    if (!screen.startsWith('sat')) {
      for (const key of [...url.searchParams.keys()]) {
        if (/^sat[A-Z]/.test(key)) {
          url.searchParams.delete(key)
          satLeft = true
        }
      }
    }
    if (changed || satLeft) window.history.replaceState(null, '', url)
  }, [screen, restoring, liveLessonId, liveWorkspaceId, workspaceCardId])

  // «Известный урок» экрана класса — одно выражение на оба источника, а не два
  // разных по месту использования. boothLessonId — обычный случай (сеанс
  // открыт в этой же вкладке через /enter). liveLessonId — сеанс восстановлен
  // из адреса после перезагрузки прямо внутри урока (?live=<id>, см. эффект
  // диплинков выше): boothLessonId тогда ещё null, а посетитель тем не менее
  // сидит в живом уроке. Без этого «Выйти из урока» после F5 не находило бы
  // сеанс и звало вход в класс заново — тот же побочный эффект, ради которого
  // вообще завели boothLessonId (находка 2 финального ревью). Приводим к
  // числу: параметр адреса — строка, а boothLessonId — число из ответа API.
  //
  // Number.isFinite, а не просто «не null»: ?live= может прийти мусором
  // (?live=abc) — Number('abc') это NaN, а `NaN != null` истинно, и голая
  // проверка на null приняла бы такой мусор за «известный урок» (находка 4б
  // финального ревью). Number.isFinite отсекает и NaN, и Infinity, а null —
  // ветка выше уже привела его к null явно, до вызова Number().
  const parsedLiveLessonId = liveLessonId != null ? Number(liveLessonId) : null
  const knownBoothLessonId = boothLessonId ?? (Number.isFinite(parsedLiveLessonId) ? parsedLiveLessonId : null)

  // Урок сеанса класса дошёл до терминального статуса — уводим аккаунт класса
  // на экран ожидания следующего посетителя (находка 1 финального ревью).
  // boothLessonId НЕ обнуляем (в отличие от прежней версии): урок остаётся
  // «известным», а решение «сеанс жив или кончился» теперь принимает сам
  // BoothEntryPage при монтировании, перепроверяя статус у бэкенда (Правило 2
  // памяти вкладки, см. lib/session.js и BoothEntryPage.jsx) — тот же ответ
  // COMPLETED, который сейчас увидела эта функция через onLessonClosed,
  // экран увидит секундой позже сам и покажет «Урок завершён» без автовхода.
  // Раннее обнуление плюс отдельный признак boothLessonFinished было вторым,
  // расходящимся источником той же правды: перезагрузка стирала признак из
  // React-состояния и включала автовход, хотя за планшетом ещё никого нет
  // (находка второго ревью).
  //
  // liveLessonId всё же обнуляем: он держит ?live= в адресе для экрана
  // «Живой урок», а этот экран мы покидаем — держать сеанс актуальным для
  // BoothEntryPage должен только boothLessonId.
  function handleBoothLessonClosed() {
    setLiveLessonId(null)
    setScreen('booth')
  }

  // Кабинет аккаунту класса закрыт, и закрыт он здесь, а не в каждом экране:
  // сюда сходятся все способы туда попасть — диплинк ?screen=…, кнопка внутри
  // экрана, домашний экран после входа. Признак приезжает ответом сети и может
  // опоздать (SuccessPage уводит через 1.8 с), поэтому проверка живёт эффектом,
  // а не одной веткой в момент входа.
  //
  // Обратная сторона того же правила: 'booth' не-классу тоже не положен.
  // Диплинк ?screen=booth не проверяет, кто его открыл, — обычный ученик или
  // аноним получил бы чужой POST /trial/booth/enter, 403 и тупик «Класс
  // закрыт» (находка 2 финального ревью). Уводим той же функцией, что решает
  // домашний экран после входа, — не отдельным набором условий здесь.
  // Синхронный аналог этой ветки живёт в view (см. ниже, перед return): он не
  // даёт BoothEntryPage смонтироваться и позвонить /enter даже на один кадр,
  // а этот эффект следом приводит screen в согласие с тем, что нарисовано.
  useEffect(() => {
    if (boothAccount && !BOOTH_SCREENS.has(screen)) setScreen('booth')
    else if (!boothAccount && screen === 'booth') {
      setScreen(homeScreenFor({ token, boothAccount, needsLevelTest, tutorOnboarded }))
    }
  }, [boothAccount, screen, token, needsLevelTest, tutorOnboarded, setScreen])

  // Тот же страж для преподавателя: ученические разделы ему не положены, а
  // `?screen=` до сих пор клался в состояние без сверки с ролью — и в меню, из
  // которого эти разделы вырезаны, вернуться было нечем. Уводим той же
  // функцией, что решает домашний экран после входа, — не отдельным условием
  // здесь. Аккаунт класса разбирает страж выше: у него свой, более узкий набор.
  useEffect(() => {
    if (boothAccount || !isTeacher(token)) return
    if (isStudentOnlyScreen(screen)) {
      setScreen(homeScreenFor({ token, boothAccount, needsLevelTest, tutorOnboarded }))
    }
  }, [boothAccount, screen, token, needsLevelTest, tutorOnboarded, setScreen])

  // Навигация по левому сайдбару обучающей зоны. В тьютор-онли (main)
  // скрытые разделы недоступны и через навигацию — только разделы
  // из TUTOR_ONLY_SECTIONS (тьютор, практика, словарь, аудирование, шэдоуинг).
  // Демо-статус и его срок разом: оба приезжают одним GET /user/me, и разводить
  // их по разным вызовам значило бы дважды спрашивать одно и то же.
  function applyDemoAccess(tok) {
    getDemoAccess(tok).then((d) => {
      setIsDemoAccount(d.isDemo)
      setDemoExpiresAt(d.expiresAt)
      setAccountCreatedAt(d.createdAt ?? null)
      if (trackDemoState(d.isDemo)) setCelebrate(true)
    })
  }

  function handleNav(key, payload) {
    // Аккаунт класса ходит только в свой урок. Сайдбара у него нет вовсе, но
    // навигацию зовёт не только сайдбар (колокольчик уведомлений, карточки
    // внутри экранов) — поэтому запрет стоит здесь, у самой навигации.
    if (boothAccount) return
    if (TUTOR_ONLY && !TUTOR_ONLY_SECTIONS.includes(key)) return
    if (key === 'home') setScreen('home')
    else if (key === 'pricing') setScreen('pricing')
    else if (key === 'minutes') setScreen('minutes')
    // Профиль из меню открывается своей кнопкой; сюда приходит от Луны (destinations.js).
    else if (key === 'profile') setScreen('profile')
    else if (key === 'learning' || key === 'learn') setScreen('kingdom')
    // «Урок курса» из плана по дням — сразу в тропу уровня, который ученик проходит, а не на карту королевств
    else if (key === 'course') {
      const k = KINGDOMS.find((x) => x.level === String(payload?.level || userLevel || '').toUpperCase())
      if (k) {
        setKingdom(k)
        setScreen('kingdom-interior')
      } else setScreen('kingdom')
    }
    else if (key === 'ge-plan') setScreen('ge-plan')
    // Практика открывается и с домашней работы: payload несёт адрес юнита,
    // который задал преподаватель.
    else if (key === 'practice') { setPracticeTarget(payload || null); setScreen('practice') }
    // Уровень аудирования приходит из домашней работы: сам экран уровня не
    // выбирает, он идёт от уровня ученика.
    else if (key === 'listening') { setListeningTarget(payload || null); setScreen('listening') }
    // Shadowing открывается с карточки Практики — payload несёт id урока.
    else if (key === 'shadowing') { if (payload) setShadowingLesson(payload); setScreen('shadowing') }
    // Цель СБРАСЫВАЕТСЯ переходом без payload — иначе вчерашняя домашка
    // выбрасывала бы ученика в свой текст при каждом заходе из сайдбара.
    else if (key === 'writing') { setWritingTarget(payload || null); setScreen('writing') }
    else if (key === 'workbook') { setWorkbookTarget(payload || null); setScreen('workbook') }
    else if (key === 'reading') { setReadingTarget(payload || null); setScreen('reading') }
    else if (key === 'words') { setWordsTarget(payload || null); setScreen('words') }
    else if (key === 'verbs') { setVerbsTarget(payload || null); setScreen('verbs') }
    else if (key === 'speakspin') setScreen('speakspin')
    else if (key === 'numbers') setScreen('numbers')
    // Уровень приносит карточка Практики — она же и списала квоту.
    // replace — Практика лишь переслала сюда цель из домашки: в стек её не кладём.
    else if (key === 'situations') {
      setSituationsTarget(payload || null)
      if (payload?.replace) skipPushRef.current = true
      setScreen('situations')
    }
    else if (key === 'listenchoose') { setListenChooseTarget(payload || null); setScreen('listenchoose') }
    else if (key === 'arcade') { setArcadeTarget(payload || null); setScreen('arcade') }
    else if (key === 'tutor') setScreen(tutorHome)
    else if (key === 'lessons') {
      if (payload && payload.lessonId) {
        setLiveLessonId(payload.lessonId)
        setScreen('live-lesson')
      } else setScreen('lessons')
    }
    // payload.id — конкретная работа (карточка «Главной»): открыть её, а не первую в списке.
    else if (key === 'homework') { setHomeworkTarget(payload?.id ?? null); setScreen('homework') }
    // Урок, заданный на дом: домашка зовёт с адресом урока каталога и адресом
    // карточки — или без карточки, если задан весь урок. Без урока никуда не
    // идём — экран без id открылся бы демонстрационным уроком, то есть чужим
    // материалом вместо задания. Источник свой, а не 'catalog': урок целиком
    // карточки не несёт, и «Назад» по одной только карточке уводил бы ученика
    // в каталог курса вместо домашки, откуда он пришёл.
    else if (key === 'lesson-workspace') {
      if (payload?.catalogLessonId != null) {
        setLiveWorkspaceId(payload.catalogLessonId)
        setWorkspaceSource('homework')
        setWorkspaceCardId(payload.cardId || null)
        setScreen('lesson-workspace')
      }
    }
    // payload: { tab, view, testId } — вернуться в нужное место хаба (выход из прохождения или разбора)
    else if (key === 'ielts') { setIeltsTarget(payload || null); setScreen('ielts') }
    else if (key === 'ielts-reading-run') { if (payload?.testId) { setIeltsRunTarget(payload); setScreen('ielts-reading-run') } }
    else if (key === 'ielts-listening-run' || key === 'ielts-dictation' || key === 'ielts-writing-run' || key === 'ielts-speaking-run') { if (payload?.testId) { setIeltsRunTarget(payload); setScreen(key) } }
    else if (key === 'ielts-onboarding' || key === 'ielts-diagnostic' || key === 'ielts-route') { setIeltsRunTarget(payload || null); setScreen(key) }
    else if (key === 'ielts-diagnostic-result') { setIeltsReviewTarget(payload || null); setScreen(key) }
    else if (key === 'ielts-mock') { if (payload?.mockId || payload?.sessionId) { setIeltsMockTarget(payload); setScreen('ielts-mock') } }
    else if (key === 'sat' || key === 'sat-onboarding' || key === 'sat-run' || key === 'sat-diagnostic' || key === 'sat-study' || key === 'sat-daily' || key === 'sat-weekly' || key === 'sat-papers' || key === 'sat-mock' || key === 'sat-mock-review' || key === 'sat-unit' || key === 'sat-pricing' || key === 'ielts-pricing') setScreen(key)
    else if (key === 'ielts-reading-review') { if (payload?.attemptId) { setIeltsReviewTarget(payload); setScreen('ielts-reading-review') } }
    // back: словарь открыт ссылкой изнутри урока или раздела — у него появляется
    // «Назад» туда. Из меню словарь — раздел верхнего уровня, кнопки нет.
    else if (key === 'vocab') { setVocabReturn(Boolean(payload?.back)); setScreen('vocab') }
  }

  // ── «Назад» по стеку (lib/navStack.js) ──────────────────────────────────
  // Контекст экранов, который держит App: уходя с тропы, урока или рабочего
  // листа, запоминаем, какой это был, — «назад» откроет его же.
  useEffect(() => {
    appPlaceRef.current = (from) => {
      if (from === 'kingdom-interior' && kingdom) return { level: kingdom.level }
      if (from === 'live-lesson' && liveLessonId != null) return { lessonId: liveLessonId }
      if (from === 'lesson-workspace' && liveWorkspaceId != null) {
        return { workspaceId: liveWorkspaceId, workspaceSource, workspaceCardId }
      }
      if (from === 'vocab') return { vocabReturn }
      return undefined
    }
  }, [kingdom, liveLessonId, liveWorkspaceId, workspaceSource, workspaceCardId, vocabReturn])

  // ── Луна открывает раздел (lib/assistant/destinations.js) ───────────────
  // Переход тот же, что у сайдбара и карточек, — handleNav, без обходных
  // путей. Ученик уже на этом экране, а цель другая (вкладка Практики): экран
  // открываем заново — setScreen на тот же экран ничего не делает, а цель
  // экран читает только при монтировании. Ключ обёртки .scr-in несёт счётчик
  // таких повторных открытий.
  const [screenNonce, setScreenNonce] = useState(0)
  const handleNavRef = useRef(null)
  useEffect(() => {
    handleNavRef.current = handleNav
  })
  useEffect(
    () =>
      onAssistantNavigate((target) => {
        const dest = destinationOf(target)
        if (!dest) return
        if (dest.screen === screenRef.current) {
          if (!dest.payload) return
          setResume(null)
          setScreenNonce((n) => n + 1)
        }
        handleNavRef.current?.(dest.nav, dest.payload)
      }),
    [],
  )
  // Тур Speaking Buddy живёт не в экране, а здесь (showTutorTour), поэтому
  // заявку Луны на него забирает App, пока открыт дашборд тьютора.
  useTourRequest(screen === 'tutor-dashboard' ? () => setShowTutorTour(true) : null)

  function restoreAppPlace(to, place) {
    // Цель перехода в Практику (книги с «Главной», юнит домашки) уже отыграла:
    // вернувшись, Практика открывается на своём месте — вкладке и разделе,
    // где её оставили, — а не снова по цели.
    if (to === 'practice') setPracticeTarget(null)
    else if (to === 'kingdom-interior' && place.level) {
      const k = KINGDOMS.find((x) => x.level === place.level)
      if (k) setKingdom(k)
    } else if (to === 'live-lesson' && place.lessonId != null) setLiveLessonId(place.lessonId)
    else if (to === 'lesson-workspace' && place.workspaceId != null) {
      setLiveWorkspaceId(place.workspaceId)
      setWorkspaceSource(place.workspaceSource || 'live')
      setWorkspaceCardId(place.workspaceCardId ?? null)
    } else if (to === 'vocab') setVocabReturn(Boolean(place.vocabReturn))
  }

  // Куда ведёт «назад» с текущего экрана: туда, откуда пришли, а без истории
  // (диплинк, F5 на первом экране вкладки) — по запасному переходу экрана.
  function goBack(fallback) {
    const hit = popNav(navStack, screen)
    if (!hit) {
      skipPushRef.current = true
      fallback?.()
      skipPushRef.current = false
      return
    }
    const { entry, rest } = hit
    const place = entry.place || {}
    restoreAppPlace(entry.screen, place)
    screenRef.current = entry.screen
    setResume(entry.screen, place)
    setNavStack(rest)
    setScreenState(entry.screen)
    if (place.scrollY > 0) setScrollBack({ y: place.scrollY, screen: entry.screen })
  }

  // Подпись кнопки называет место назначения («На главную», «В Практику»).
  function backLabel(fallbackScreen) {
    return t(backLabelKey(popNav(navStack, screen)?.entry.screen || fallbackScreen))
  }

  // «Назад» раздела Практики: туда, откуда открыли, иначе — во вкладку
  // Практики, где лежит карточка раздела. canReturn — есть ли откуда пришли:
  // экран, открытый сразу на сценарии или игре, по нему решает, выйти ли
  // назад целиком (пришли с карточки) или в список раздела (диплинк).
  function sectionBack(skill) {
    return {
      onBack: () => goBack(() => handleNav('practice', skill ? { skill } : undefined)),
      backLabel: backLabel('practice'),
      canReturn: Boolean(popNav(navStack, screen)),
    }
  }

  // Навигация из сайдбара зоны тьютора: «Обучение»/«Практика» уводят из тьютора,
  // «Тьютор» возвращает на домашний экран (welcome до онбординга, dashboard после).
  function handleTutorNav(key, tutorHome = 'tutor-dashboard') {
    if (boothAccount) return
    if (TUTOR_ONLY && !TUTOR_ONLY_SECTIONS.includes(key)) return
    if (key === 'tutor') setScreen(tutorHome)
    // Остальное — обычная навигация без адреса: она же сбрасывает цели
    // разделов (юнит из домашки, уровень, текст; урок шэдоуинга она не
    // сбрасывает и не сбрасывала). Свой список переходов здесь целей не
    // сбрасывал вовсе, и из зоны тьютора Практика снова открывала вчерашний
    // юнит домашки (ревью 08.10.2026, #79).
    else handleNav(key)
  }

  // Общие пропсы всех экранов IELTS: сайдбар + внутренняя навигация по секциям.
  const ieltsProps = {
    userLevel,
    userName: name,
    token,
    onNav: handleNav,
    onGo: setScreen,
    onProfile: () => setScreen('profile'),
    isDemoAccount,
  }

  async function handleResend() {
    setError('')
    try {
      if (mode === 'register') {
        await sendRegistrationOtp(name, phone, email, birthDate)
      } else {
        const m = await requestLoginOtp(phone)
        setMode(m)
      }
    } catch (e) {
      const key = phoneErrorKey(e)
      setError(key ? t(key) : e.message || 'Не удалось отправить код повторно.')
    }
  }

  if (restoring) {
    return (
      <div className="screen">
        <div className="spinner" aria-label="Загрузка" />
      </div>
    )
  }

  // Что бы ни стояло в screen — диплинк, кнопка из урока, опоздавший ответ про
  // признак аккаунта, — аккаунту класса рисуем класс. Эффект выше приводит сам
  // screen в согласие, а эта строка не даёт запретному экрану смонтироваться
  // даже на один кадр: оболочка кабинета на монтировании поднимает сайдбар и
  // колокольчик, а те сразу уходят в сеть.
  //
  // Обратная ветка — той же строкой, а не отдельной проверкой в case 'booth':
  // диплинк ?screen=booth не проверяет, кто его открыл (находка 2 финального
  // ревью), и без неё BoothEntryPage смонтировался бы под чужим аккаунтом и
  // сам вызвал бы /trial/booth/enter ещё до того, как эффект выше успел бы
  // увести на homeScreenFor.
  //
  // Единая анимация перехода между экранами: ключ обёртки ниже — этот же
  // вычисленный view, а не сырой screen. Раньше ключевали screen, а рисовали
  // view — свежий вход ставит screen='success', view в тот же миг уже 'booth'
  // (см. строку выше): BoothEntryPage монтируется под key='success' и шлёт
  // /trial/booth/enter, а когда страж кабинета эффектом переписывает screen на
  // 'booth' следующим тиком, ключ обёртки менялся вместе с ним — React
  // перемонтировал уже отрисованный BoothEntryPage заново, и уходил второй
  // /enter на тот же вход (находка 1 финального ревью). key=view между этими
  // двумя рендерами не меняется (оба раза 'booth') — перемонтажа нет. Смену
  // ЛЮБОГО другого экрана key=view отличает так же честно, как отличал бы
  // key=screen: CSS-анимация .scr-in по-прежнему проигрывается заново на
  // каждый переход (fade + лёгкий подъём; отключается при
  // prefers-reduced-motion).
  const view = boothAccount
    ? (BOOTH_SCREENS.has(screen) ? screen : 'booth')
    // Ученический экран преподавателю не даём смонтировать даже на один кадр:
    // эффект-страж выше приведёт screen в согласие следующим тиком, но экран
    // успел бы сходить в сеть за чужим содержимым (та же грабля, что была у
    // BoothEntryPage с повторным /enter).
    : ((screen === 'booth' || (isTeacher(token) && isStudentOnlyScreen(screen)))
        ? homeScreenFor({ token, boothAccount, needsLevelTest, tutorOnboarded })
        : screen)
  const page = renderScreen(view)
  return (
    <>
      {page && (
        <div key={`${view}#${screenNonce}`} className="scr-in">
          {page}
        </div>
      )}
      {/* Поздравление живёт вне обёртки с key: иначе смена экрана
          перемонтировала бы его и окно моргало бы анимацией входа. */}
      {celebrate && <PurchaseSuccessModal onClose={() => setCelebrate(false)} />}
      {/* «Сессия истекла» — тоже вне обёртки с key: смена экрана после выхода
          не должна её перемонтировать и сбивать анимацию. Только гостю: у
          вошедшего сообщать не о чем. */}
      {sessionExpired && !token && (
        <SessionExpiredNotice
          onLogin={() => {
            setSessionExpired(false)
            setScreen('welcome')
          }}
          onClose={() => setSessionExpired(false)}
        />
      )}
      {/* Помощник по сайту — тоже вне обёртки с key: разговор переживает
          переходы между экранами. Смонтирован для любого ученика, а на
          экзаменах, живом уроке и звонке тьютора только скрыт (enabled). */}
      {token && !boothAccount && !isTeacher(token) && (
        <AssistantWidget token={token} screen={view} enabled={assistantAllowedOn(view, { token })} greetOnOpen />
      )}
    </>
  )

  function renderScreen(view) {
  switch (view) {
    case 'welcome':
      return (
        <WelcomePage
          onRegister={() => {
            setError('')
            setScreen('chat')
          }}
          // Вход — телефон/почта + пароль. Вход по коду остался запасным
          // путём (ссылка на самом экране): у аккаунтов, заведённых до
          // появления шага «задай пароль», пароля нет вовсе.
          onLogin={() => {
            setError('')
            setName('')
            setScreen('login-password')
          }}
        />
      )
    case 'chat':
      return (
        <RegistrationPage
          onGoogleToken={handleGoogleCredential}
          onBack={() => setScreen('welcome')}
          onPhoneLogin={(userName) => {
            setName(userName || '')
            setError('')
            setScreen('reg-phone')
          }}
          error={error}
        />
      )
    // Только вход по коду (фолбэк для аккаунтов без пароля) — регистрация
    // сюда больше не заходит, у неё свой путь: reg-phone → reg-email → otp.
    case 'phone':
      return (
        <PhoneLoginPage
          onGoogleToken={handleGoogleCredential}
          onBack={() => { setError(''); setScreen('welcome') }}
          onSubmit={handlePhoneSubmit}
          loading={loading}
          error={error}
        />
      )
    case 'reg-phone':
      return (
        <RegisterPhonePage
          googleGate={phoneGate}
          onBack={phoneGate ? undefined : () => { setError(''); setScreen('chat') }}
          onSubmit={handleRegPhoneSubmit}
          loading={loading}
          error={error}
        />
      )
    case 'reg-email':
      return (
        <RegisterEmailPage
          onBack={() => { setError(''); setScreen('reg-phone') }}
          onSubmit={handleRegEmailSubmit}
          loading={loading}
          error={error}
        />
      )
    case 'reg-birth':
      return (
        <RegisterBirthDatePage
          googleGate={birthDateGate}
          onBack={
            birthDateGate
              ? undefined
              : () => {
                  setError('')
                  setScreen('reg-email')
                }
          }
          onSubmit={handleRegBirthSubmit}
          loading={loading}
          error={error}
        />
      )
    case 'otp':
      return (
        <OtpPage
          phone={mode === 'register' ? email : phone}
          // Куда ушёл код, видно по самому адресату: регистрация шлёт его на
          // почту, вход по коду — туда, что ввели (номер или почту).
          channel={isEmailIdentifier(mode === 'register' ? email : phone) ? 'email' : 'sms'}
          onBack={() => { setError(''); setScreen(mode === 'register' ? 'reg-birth' : 'phone') }}
          onSubmit={handleOtpSubmit}
          onResend={handleResend}
          loading={loading}
          error={error}
        />
      )
    case 'login-password':
      return (
        <PasswordLoginPage
          onGoogleToken={handleGoogleCredential}
          onBack={() => { setError(''); setScreen('welcome') }}
          onSubmit={handlePasswordLogin}
          onOtpLogin={() => { setError(''); setScreen('phone') }}
          loading={loading}
          error={error}
        />
      )
    case 'complete-registration':
      return (
        <CompleteRegistrationPage
          token={inviteToken}
          onDone={() => {
            setInviteToken('')
            setError('')
            if (typeof window !== 'undefined') window.history.replaceState({}, '', '/')
            setScreen('login-password')
          }}
        />
      )
    case 'set-password':
      return (
        <SetPasswordPage
          onSubmit={handleSetPassword}
          loading={loading}
          error={error}
        />
      )
    case 'success':
      // Куда вести после входа, решает одна функция на все пути (см.
      // lib/homeScreen.js): аккаунт класса — в класс, преподавателя — в
      // «Уроки», ученику — тест уровня или королевства.
      return (
        <SuccessPage
          onDone={() => setScreen(screenAfterLogin())}
        />
      )
    // Тест уровня v16 методиста (спека 2026-10-14-placement-v16-first-login-design.md): страница теста в iframe, итог —
    // через мост (finalizePlacement). Прежние экраны теста ('test-intro', 'test') ведут сюда же: их адреса остались в
    // закладках и стеке «назад» старых версий.
    case 'test-intro':
    case 'test':
    case 'placement':
      return (
        <PlacementPage
          token={token}
          // Пространство прогона в localStorage — аккаунт из токена: profileId приходит из /api/profile позже и на
          // первом кадре ещё пуст, а прогон «guest» был бы общим у всех учеников устройства.
          profileId={userIdFromToken(token) ? `user-${userIdFromToken(token)}` : profileId}
          backLabel={backLabel(testReturn || 'home')}
          onExit={() => {
            setTestReturn(null)
            goBack(() => setScreen(testExit()))
          }}
          onResult={finalizePlacement}
          onContinue={continueAfterPlacement}
          onActivity={(rec, env) => leavePlacementTo(navForActivity(rec), env)}
          onSection={(section, env) => leavePlacementTo(navForSection(section), env)}
        />
      )
    case 'home':
      return (
        <HomePage
          userLevel={userLevel}
          userName={name}
          token={token}
          isDemoAccount={isDemoAccount}
          demoExpiresAt={demoExpiresAt}
          // Без уровня «Главная» показывает приглашение на тест, а не чужие цифры.
          levelUnknown={needsLevelTest}
          ieltsAccount={ieltsAccount}
          onStartLevelTest={() => openPlacement('home')}
          geProfile={ieltsAccount ? null : geProfile}
          geLoaded={geLoaded}
          // Анкета «Главной» заменена анкетой теста v16 (14.10.2026): «начать» — это тест, правка цели — прежний экран.
          onGeStart={() => openPlacement('home')}
          onGeEdit={() => { setGeEdit(true); setScreen('ge-onboarding') }}
          onGeRoute={() => setScreen('ge-route')}
          onGeTest={() => openPlacement('home')}
          placementVersion={placementVersion}
          existingStudent={isExistingStudent(accountCreatedAt)}
          tourKey={homeTourKey}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          onOpenPricing={() => setScreen('pricing')}
          // Назначенный урок открывается тем же путём, что из расписания.
          onOpenLesson={(id) => { setLiveLessonId(id); setScreen('live-lesson') }}
          // Записи на пробный урок в приложении нет: слоты подбирает менеджер,
          // и запись идёт через него же — тем самым WhatsApp, куда ведут все
          // остальные демо-призывы (src/lib/support.js).
          onOpenTrial={() => window.open(SUPPORT_WHATSAPP_URL, '_blank', 'noopener')}
        />
      )
    case 'minutes':
      // Витрина пакетов минут. «Назад» — туда, откуда пришли: разговор к этому
      // моменту уже закрыт лимитом, поэтому возвращаем на домашний экран тьютора.
      return (
        <MinutesTopUpPage token={token} onBack={() => setScreen(tutorHome)} />
      )
    case 'pricing':
      // Витрина без сайдбара — как в макете: это шаг покупки, и уводить с него
      // обратно в разделы посреди выбора тарифа не нужно. Возврат — стрелкой.
      return (
        <PricingPage
          token={token}
          // Туда, откуда пришли за тарифом: стек переживает и перезагрузку,
          // которой оплата возвращает на ?screen=pricing.
          onBack={() => goBack(() => setScreen(isDemoAccount ? 'home' : 'kingdom'))}
        />
      )
    case 'kingdom':
      return (
        <LearningPage
          userLevel={userLevel}
          userName={name}
          token={token}
          unlockAll={devUnlock}
          tourKey={learnTourKey}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          onOpenKingdom={(k) => {
            setKingdom(k)
            setScreen('kingdom-interior')
          }}
        />
      )
    case 'profile':
      return (
        <ProfilePage
          userName={name}
          userLevel={userLevel}
          userPhone={phone}
          token={token}
          onNav={handleNav}
          onLogout={handleLogout}
          onUpdateName={setName}
          // Гостю тест из профиля не предлагаем: уровня у него нет по
          // определению, а прогон без аккаунта ляжет на устройство.
          levelUnknown={needsLevelTest}
          ieltsAccount={ieltsAccount}
          onLevelTest={token ? () => openPlacement('profile') : undefined}
          // Без истории (диплинк, F5) идти некуда — кнопки нет, остаётся меню.
          onBack={popNav(navStack, screen) ? () => goBack() : undefined}
          backLabel={backLabel('home')}
        />
      )
    case 'practice':
      return (
        <PracticePage
          userLevel={userLevel}
          userName={name}
          token={token}
          openTarget={practiceTarget}
          tourKey={practiceTourKey}
          onLeave={popNav(navStack, screen) ? () => goBack() : undefined}
          leaveLabel={backLabel('home')}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          isDemoAccount={isDemoAccount}
        />
      )
    case 'listening':
      return (
        <ListeningPage
          {...sectionBack('listening')}
          userLevel={userLevel}
          userName={name}
          token={token}
          initialTarget={listeningTarget}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          isDemoAccount={isDemoAccount}
        />
      )
    case 'shadowing':
      return (
        <ShadowingPage
          {...sectionBack(null)}
          userLevel={userLevel}
          userName={name}
          token={token}
          lessonId={shadowingLesson}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          isDemoAccount={isDemoAccount}
        />
      )
    case 'writing':
      return (
        <WritingPage
          {...sectionBack('writing')}
          userLevel={userLevel}
          userName={name}
          token={token}
          initialTarget={writingTarget}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          isDemoAccount={isDemoAccount}
        />
      )
    case 'workbook':
      return (
        <WorkbookPage
          {...sectionBack('writing')}
          userLevel={userLevel}
          userName={name}
          token={token}
          initialTarget={workbookTarget}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          isDemoAccount={isDemoAccount}
        />
      )
    case 'words':
      return (
        <WordsPage
          {...sectionBack('listening')}
          userLevel={userLevel}
          userName={name}
          token={token}
          initialTarget={wordsTarget}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
        />
      )
    case 'numbers':
      return (
        <NumbersPage
          {...sectionBack('listening')}
          userLevel={userLevel}
          userName={name}
          token={token}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
        />
      )
    case 'speakspin':
      return (
        <SpeakSpinPage
          {...sectionBack('speaking')}
          userLevel={userLevel}
          userName={name}
          token={token}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
        />
      )
    case 'verbs':
      return (
        <VerbsPage
          {...sectionBack('writing')}
          userLevel={userLevel}
          userName={name}
          token={token}
          initialTarget={verbsTarget}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
        />
      )
    case 'situations':
      return (
        <SituationsPage
          {...sectionBack('speaking')}
          userLevel={userLevel}
          userName={name}
          token={token}
          initialTarget={situationsTarget}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
        />
      )
    case 'listenchoose':
      return (
        <ListenChoosePage
          {...sectionBack('listening')}
          userLevel={userLevel}
          userName={name}
          token={token}
          initialTarget={listenChooseTarget}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
        />
      )
    case 'arcade':
      return (
        <ArcadePage
          {...sectionBack(arcadeTarget?.skill || 'speaking')}
          initialTarget={arcadeTarget}
          userLevel={userLevel}
          userName={name}
          token={token}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
        />
      )
    case 'reading':
      return (
        <ReadingPage
          {...sectionBack('reading')}
          userLevel={userLevel}
          userName={name}
          token={token}
          initialTarget={readingTarget}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          isDemoAccount={isDemoAccount}
        />
      )
    case 'lessons':
      return <LessonsPage userLevel={userLevel} userName={name} token={token} initialTab={resumeOf('lessons')?.tab} onNav={handleNav} onProfile={() => setScreen('profile')} onOpenLesson={(id) => { unlockBroadcastAudio(); setLiveLessonId(id); setScreen('live-lesson') }} onOpenCatalog={() => setScreen('course-catalog')} onOpenSelfStudy={(id) => { setLiveWorkspaceId(id); setWorkspaceSource('self'); setWorkspaceCardId(null); setScreen('lesson-workspace') }} onOpenPricing={() => setScreen('pricing')} tourKey={lessonsTourKey} />
    case 'homework':
      return <HomeworkPage userLevel={userLevel} userName={name} token={token} initialId={homeworkTarget} onNav={handleNav} onProfile={() => setScreen('profile')} tourKey={homeworkTourKey} />
    case 'course-catalog':
      return <CourseCatalogPage userLevel={userLevel} userName={name} token={token} onNav={handleNav} onProfile={() => setScreen('profile')} onBack={() => goBack(() => setScreen('lessons'))} onOpenLesson={(id) => { setLiveWorkspaceId(id); setWorkspaceSource('catalog'); setWorkspaceCardId(null); setScreen('lesson-workspace') }} />
    case 'booth':
      return (
        <BoothEntryPage
          token={token}
          lessonId={knownBoothLessonId}
          onEnter={(id) => {
            setBoothLessonId(id)
            // Единственное место, где сеанс класса пишется в sessionStorage
            // (Правило 1 памяти вкладки) — симметрично saveBoothLessonId(null)
            // в handleLogout, который его стирает. Пишем и на «Вернуться в
            // класс» (BoothEntryPage вызывает onEnter с тем же id, который уже
            // лежал в сторадже) — идемпотентно, лишним не будет.
            saveBoothLessonId(id)
            setLiveLessonId(id)
            setScreen('live-lesson')
          }}
          // Проверка статуса известного урока не удалась — экран не знает про
          // урок ничего и предлагает войти заново. Выход тут обычный, тот же
          // самый: чистит токен, признак класса и память вкладки о сеансе и
          // уводит на 'welcome' — экран входа и регистрации.
          onSignOut={handleLogout}
        />
      )
    case 'live-lesson':
      // Аккаунт класса выходит из урока не в расписание, которого у него нет, а
      // обратно на экран класса — тот вернёт его в тот же урок. onLessonClosed
      // передаём только аккаунту класса: обычный ученик и преподаватель этот
      // проп не получают, и их сценарий не меняется ни на йоту.
      // key — урок: следование за классом, очередь снимков и буфер показа живут
      // в ref-ах экрана и не должны переживать смену занятия.
      return <LiveLessonPage key={liveLessonId} lessonId={liveLessonId} userName={name} userLevel={userLevel} token={token} onNav={handleNav} onProfile={() => setScreen('profile')} onBack={() => (boothAccount ? setScreen('booth') : goBack(() => setScreen('lessons')))} onLessonClosed={boothAccount ? handleBoothLessonClosed : undefined} />
    // Секции IELTS ходят друг к другу по имени экрана — своя мини-навигация
    // поверх общей (onGo), сайдбар при этом остаётся на пункте «IELTS».
    case 'ielts':
      return <IeltsPage {...ieltsProps} target={ieltsTarget} />
    // Прохождение и разбор — без меню платформы (режим фокуса, Figma «6 · Reading — экзамен»).
    // «Назад» ведёт туда, откуда пришли: back несёт вкладку и экран хаба.
    case 'ielts-reading-run':
      return (
        <IeltsReadingRunPage
          token={token}
          target={ieltsRunTarget}
          onExit={(testId, hub) => handleNav('ielts', hub || ieltsRunTarget?.back || { tab: 'learn', testId })}
          onReview={(attemptId) => handleNav('ielts-reading-review', { attemptId, back: ieltsRunTarget?.back })}
        />
      )
    case 'ielts-listening-run':
      return (
        <IeltsListeningRunPage
          token={token}
          target={ieltsRunTarget}
          onExit={(testId, hub) => handleNav('ielts', hub || ieltsRunTarget?.back || { tab: 'learn', testId })}
          onReview={(attemptId) => handleNav('ielts-reading-review', { attemptId, back: ieltsRunTarget?.back })}
        />
      )
    // Редактор Writing (Figma 9). Сданная работа открывается в хабе («Мои работы», Figma 10) и сразу уходит на ИИ-проверку.
    // Прохождение Speaking (Figma 11). Оценённый ответ открывается в хабе — как работа Writing.
    // Онбординг и диагностика (Figma 1.1–1.6) — режим фокуса без меню; итог (Figma 2.1) и маршрут (Figma 3) — в меню.
    case 'ge-onboarding':
      return (
        <GeOnboardingPage
          token={token}
          level={needsLevelTest ? null : userLevel}
          edit={geEdit}
          onExit={() => { setGeEdit(false); goBack(() => setScreen('home')) }}
          onSaved={handleGeSaved}
        />
      )
    case 'ge-route':
      return (
        <GeRoutePage
          token={token}
          userName={name}
          userLevel={userLevel}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          onLoaded={setGeProfile}
          onChosen={(p) => { if (p) setGeProfile(p); goBack(() => setScreen('home')) }}
          onPricing={(p) => { if (p) setGeProfile(p); setScreen('pricing') }}
          onEdit={() => { setGeEdit(true); setScreen('ge-onboarding') }}
          onTest={() => openPlacement('ge-route')}
          onBack={() => goBack(() => setScreen('home'))}
          backLabel={backLabel('home')}
        />
      )
    case 'ge-plan':
      return (
        <GePlanPage
          token={token}
          userName={name}
          userLevel={userLevel}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          onGeStart={() => openPlacement('ge-plan')}
          onGeRoute={() => setScreen('ge-route')}
          onGeTest={() => openPlacement('ge-plan')}
          onGeEdit={() => { setGeEdit(true); setScreen('ge-onboarding') }}
          tourKey={gePlanTourKey}
          onBack={() => goBack(() => setScreen('home'))}
          backLabel={backLabel('home')}
        />
      )
    case 'ielts-onboarding':
      return <IeltsOnboardingPage token={token} onExit={() => handleNav('ielts', { tab: 'today' })} onDiagnostic={() => handleNav('ielts-diagnostic')} />
    case 'sat':
      return <SatPage {...ieltsProps} />
    case 'sat-run':
      return <SatRunPage onNav={handleNav} />
    case 'sat-daily':
      return <SatDailyPage token={token} onNav={handleNav} />
    case 'sat-weekly':
      return <SatWeeklyPage token={token} onNav={handleNav} />
    case 'sat-papers':
      return <SatPapersPage token={token} onNav={handleNav} />
    case 'sat-mock':
      return <SatMockPage token={token} onNav={handleNav} />
    case 'sat-mock-review':
      return <SatMockReviewPage token={token} onNav={handleNav} />
    case 'sat-unit':
      return <SatUnitPage token={token} onNav={handleNav} />
    case 'sat-study':
      return <SatStudyPage token={token} onNav={handleNav} />
    case 'sat-diagnostic':
      return <SatDiagnosticPage token={token} onNav={handleNav} />
    case 'sat-pricing':
    case 'ielts-pricing':
      // витрина без сайдбара, как общая: шаг покупки, «назад» — в свой раздел
      return <ExamPricingPage product={view === 'sat-pricing' ? 'sat' : 'ielts'} onBack={() => handleNav(view === 'sat-pricing' ? 'sat' : 'ielts')} />
    case 'sat-onboarding':
      return <SatOnboardingPage token={token} onExit={() => handleNav('sat')} onDiagnostic={() => handleNav('sat-diagnostic')} />
    case 'ielts-diagnostic':
      return (
        <IeltsDiagnosticPage
          {...ieltsProps}
          target={ieltsRunTarget}
          onExit={() => handleNav('ielts', { tab: 'today' })}
          onDone={(attemptId) => handleNav('ielts-diagnostic-result', { attemptId: String(attemptId) })}
        />
      )
    case 'ielts-diagnostic-result':
      return <IeltsDiagnosticResultPage {...ieltsProps} target={ieltsReviewTarget} onRoute={() => handleNav('ielts-route')} />
    case 'ielts-route':
      return <IeltsRoutePage {...ieltsProps} onChosen={() => handleNav('ielts', { tab: 'today' })} />
    case 'ielts-mock': {
      const toMocks = () => handleNav('ielts', { tab: 'mocks' })
      return (
        <IeltsMockPage
          token={token}
          target={ieltsMockTarget}
          onExit={toMocks}
          onHistory={toMocks}
          onToday={() => handleNav('ielts', { tab: 'today' })}
          onPlan={() => handleNav('ielts', { tab: 'plan' })}
          onTrain={(skill) => handleNav('ielts', skill ? { tab: 'learn', view: `skill-${skill}` } : { tab: 'learn' })}
          onReviewAttempt={(attemptId) => handleNav('ielts-reading-review', { attemptId: String(attemptId), back: { tab: 'mocks' } })}
          onWork={(skill, attemptId) => handleNav('ielts', { tab: 'learn', view: `${skill}-work`, attemptId: String(attemptId) })}
        />
      )
    }
    case 'ielts-speaking-run':
      return (
        <IeltsSpeakingRunPage
          token={token}
          target={ieltsRunTarget}
          onExit={(testId, hub) => handleNav('ielts', hub || ieltsRunTarget?.back || { tab: 'learn', testId })}
          onDone={(attemptId) => handleNav('ielts', { tab: 'learn', view: 'speaking-work', attemptId: String(attemptId) })}
        />
      )
    case 'ielts-writing-run':
      return (
        <IeltsWritingRunPage
          token={token}
          target={ieltsRunTarget}
          onExit={(testId, hub) => handleNav('ielts', hub || ieltsRunTarget?.back || { tab: 'learn', testId })}
          onDone={(attemptId) => handleNav('ielts', { tab: 'learn', view: 'writing-work', attemptId: String(attemptId), autoGrade: true })}
        />
      )
    case 'ielts-dictation':
      return <IeltsDictationPage token={token} target={ieltsRunTarget} onExit={() => handleNav('ielts', ieltsRunTarget?.back || { tab: 'learn' })} />
    case 'ielts-reading-review':
      return (
        <IeltsReadingReviewPage
          token={token}
          target={ieltsReviewTarget}
          onExit={(testId) => handleNav('ielts', ieltsReviewTarget?.back || { tab: 'learn', testId })}
          onRetry={(testId) => handleNav('ielts', { ...(ieltsReviewTarget?.back || { tab: 'learn' }), testId })}
          onToday={() => handleNav('ielts', { tab: 'today' })}
          onTrainType={() => handleNav('ielts', { tab: 'learn', view: 'types' })}
        />
      )
    case 'ielts-writing':
      return <IeltsWritingPage {...ieltsProps} />
    case 'ielts-listening':
      return <IeltsListeningPage {...ieltsProps} />
    case 'ielts-reading':
      return <IeltsReadingPage {...ieltsProps} />
    case 'ielts-speaking':
      return <IeltsSpeakingPage {...ieltsProps} />
    case 'ielts-progress':
      return <IeltsProgressPage {...ieltsProps} />
    case 'speaking-test':
      return (
        <SpeakingTestPage
          user={{ name, level: userLevel }}
          tutor={tutor}
          token={token}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-voice-intro')}
          onComplete={handlePlacementDone}
        />
      )
    case 'vocab':
      return (
        <VocabularyPage
          userLevel={userLevel}
          userName={name}
          token={token}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          isDemoAccount={isDemoAccount}
          tourKey={vocabTourKey}
          // «Назад» — только если словарь открыли ссылкой из урока или раздела.
          onBack={vocabReturn ? () => goBack(() => setScreen('home')) : undefined}
          backLabel={backLabel('home')}
        />
      )
    case 'kingdom-interior':
      return (
        <KingdomInteriorPage
          kingdom={kingdom}
          userName={name}
          userLevel={userLevel}
          token={token}
          unlockAll={devUnlock}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          // Тропу открывают и с карты, и из плана дня («Урок курса»): назад — туда же.
          onBack={() => goBack(() => setScreen('kingdom'))}
          backLabel={backLabel('kingdom')}
          isDemoAccount={isDemoAccount}
        />
      )
    // Приветствие и выбор тьютора — один экран (макет «Speaking Buddy»,
    // сентябрь 2026). Имя tutor-welcome осталось живым: на него смотрят
    // tutorHome, диплинки и тесты, и вести оба имени в одно место дешевле, чем
    // выискивать все ссылки.
    case 'tutor-welcome':
    case 'tutor-choose':
      return (
        <TutorChoosePage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          // Из «Управления» — обратно туда; иначе — откуда открыли тьютора
          // (Главная, Практика, план дня), а не всегда на «Главную».
          onBack={() => (tutorEditFrom === 'manage' ? goAfterTutorEdit('home') : goBack(() => setScreen('home')))}
          tutorKey={tutorKey}
          temper={temper}
          selected={tutorEditFrom === 'manage' ? tutorKey : ''}
          onChoose={(key, chosenTemper = null) => {
            setTutorKey(key)
            setTemper(chosenTemper)
            // Выбор сразу в профиль: перезагрузка не должна заставлять выбирать заново.
            setTutorOnboarded(true)
            // Тьютор и нрав пишутся ОДНИМ патчем: разними их — и при осечке сети
            // в профиле останется тьютор с чужим характером.
            saveTutorPrefs(token, { tutor: key, tutorTemper: chosenTemper })
            // Язык спрашиваем только в первый проход. Смена тьютора из
            // «Управления» идёт сразу в загрузку: язык уже выбран, а флаг
            // tutorEditFrom должен дожить до конца цепочки (goAfterTutorEdit).
            setScreen(tutorEditFrom === 'manage' ? 'tutor-loading' : 'tutor-lang')
          }}
        />
      )
    case 'tutor-lang':
      return (
        <TutorLanguagePage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onSelect={() => {
            setTutorEditFrom(null)
            setScreen('tutor-loading')
          }}
        />
      )
    case 'tutor-loading':
      return (
        <TutorLoadingPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-choose')}
          tutor={tutor}
          // После «подстройки» — сразу вопрос об интересах. Голосовой
          // placement-тест (tutor-level-offer → voice-intro) и «кем работаешь»
          // из первого прохода убраны (решение владельца 18.10.2026): остались
          // в «Управлении тьютором» — «Пройти тест заново» и правка профессии.
          // Смена тьютора (пришли из управления) цепочку пропускает: ответы уже
          // в профиле.
          onDone={() => goAfterTutorEdit('tutor-interests', 'tutor-dashboard')}
        />
      )
    case 'tutor-level-offer':
      return (
        <TutorLevelOfferPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-choose')}
          tutor={tutor}
          onStartTest={() => setScreen('tutor-voice-intro')}
          onLater={() => setScreen('tutor-interests')}
        />
      )
    case 'tutor-voice-intro':
      return (
        <TutorVoiceIntroPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => goAfterTutorEdit('tutor-choose')}
          tutor={tutor}
          onStart={() => {
            setScenario(null)
            setScreen('speaking-test')
          }}
          // «Не могу говорить сейчас» — пропуск теста, дальше по онбордингу.
          onDecline={() => goAfterTutorEdit('tutor-interests')}
        />
      )
    case 'tutor-voice-chat':
      return (
        <TutorVoiceChatPage
          user={{ name, level: userLevel }}
          token={token}
          interests={interestIdsToEn(interestIds)}
          profession={profession}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          // «Назад» — туда, откуда начали разговор: сценарии, дашборд, разбор
          // ошибок. Без истории — на дашборд, а до онбординга в placement-цепочку
          // (voice-intro), достижимую диплинком.
          onBack={() => goBack(() => setScreen(tutorOnboarded ? 'tutor-dashboard' : 'tutor-voice-intro'))}
          onTopUpMinutes={() => setScreen('minutes')}
          tutor={tutor}
          temper={temper}
          scenario={scenario}
          // Разговор больше не заканчивается ничем: ведём на отчёт, а он уже
          // отпускает туда, куда раньше уходил onFinish (кнопка «Готово»).
          onFinish={() => {
            setReportCall(null)
            setReportOrigin('call')
            setScreen('tutor-call-report')
          }}
          onSessionExpired={handleLogout}
        />
      )
    // (голосовой чат завершается тапом по орбу → результат уровня)
    case 'tutor-level-result':
      return (
        <TutorLevelResultPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('speaking-test')}
          tutor={tutor}
          level={userLevel}
          assessment={placementResult}
          onContinue={() => goAfterTutorEdit('tutor-interests')}
          onRetry={() => setScreen('speaking-test')}
        />
      )
    case 'tutor-interests':
      return (
        <TutorInterestsPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => goAfterTutorEdit('tutor-choose')}
          tutor={tutor}
          initialIds={interestIds}
          onContinue={(ids) => {
            setInterestIds(ids)
            saveTutorPrefs(token, { interests: interestIdsToEn(ids) })
            // Правка из «Управления» возвращает туда же.
            if (tutorEditFrom === 'manage') return goAfterTutorEdit('tutor-voice-chat')
            // Интересы — последний вопрос онбординга, дальше сразу разговор.
            // Тур дашборда выйдет, когда ученик впервые попадёт на дашборд —
            // уже после звонка.
            setShowTutorTour(!isTourSeen(tutorTourKey))
            setScenario(null)
            // Опрос позади: «Назад» из звонка не должен возвращать в него по
            // стеку (интересы → снова звонок по кругу). Стек чистим — звонок
            // уйдёт на свой запасной путь, дашборд.
            setNavStack([])
            skipPushRef.current = true
            setScreen('tutor-voice-chat')
          }}
        />
      )
    case 'tutor-profession':
      return (
        <TutorProfessionPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => goAfterTutorEdit('tutor-interests')}
          tutor={tutor}
          initialValue={profession}
          onSubmit={(prof) => {
            const p = typeof prof === 'string' ? prof.trim() : ''
            if (p) {
              setProfession(p)
              saveTutorPrefs(token, { profession: p })
            }
            goAfterTutorEdit('tutor-analysis')
          }}
          onSkip={() => goAfterTutorEdit('tutor-analysis')}
        />
      )
    case 'tutor-analysis':
      return (
        <TutorAnalysisPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-profession')}
          tutor={tutor}
          // Цепочка завершена — первый dashboard показываем с туром. «Первый» тут
          // буквально: смена тьютора гоняет эту же цепочку, и без отметки тур
          // выходил снова на каждый выбор.
          onDone={() => {
            setShowTutorTour(!isTourSeen(tutorTourKey))
            setScreen('tutor-dashboard')
          }}
        />
      )
    case 'tutor-dashboard':
      return (
        <TutorDashboardPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => setScreen('profile')}
          showTour={showTutorTour}
          tourStorageKey={tutorTourKey}
          onTourDone={() => setShowTutorTour(false)}
          tutor={tutor}
          onManage={() => setScreen('tutor-manage')}
          onTalk={() => {
            setScenario(null)
            setScreen('tutor-voice-chat')
          }}
          onSuggest={(id) => {
            setScenario(id || null)
            setScreen('tutor-voice-chat')
          }}
          onSeeScenarios={() => setScreen('tutor-scenarios')}
          // Карточка в панели запускает свою сцену сразу: панель показывает весь
          // список, и переброс на страницу «Сценарии» ради того же выбора лишний.
          onScenario={(id) => {
            setScenario(id || null)
            setScreen('tutor-voice-chat')
          }}
        />
      )
    case 'tutor-scenarios':
      return (
        <TutorScenariosPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-dashboard')}
          onStart={(id) => {
            setScenario(id || null)
            setScreen('tutor-voice-chat')
          }}
        />
      )
    case 'tutor-call-report':
      return (
        <TutorCallReportPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => setScreen('profile')}
          onBack={() =>
            setScreen(
              reportOrigin === 'history'
                ? 'tutor-manage'
                : tutorOnboarded
                  ? 'tutor-dashboard'
                  : 'tutor-voice-intro',
            )
          }
          tutor={tutor}
          token={token}
          call={reportCall}
          prevCallId={prevCallId}
          // Строку запоминаем: без неё возврат из расшифровки заново запустил бы
          // поллинг, а звонок к тому моменту уже равен prevCallId — отчёт бы его
          // не признал своим и показал пустое состояние.
          onTranscript={(row) => {
            setReportCall(row)
            setSelectedCall(row)
            setScreen('tutor-chat-history')
          }}
          onLogin={() => setScreen('welcome')}
          onHistory={() => setScreen('tutor-manage')}
          onDone={() =>
            setScreen(
              scenario ? 'tutor-scenarios' : tutorOnboarded ? 'tutor-dashboard' : 'tutor-level-result',
            )
          }
        />
      )
    case 'tutor-chat-history':
      return (
        <TutorChatHistoryPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-call-report')}
          call={selectedCall}
        />
      )
    case 'tutor-lesson-plan':
      return (
        <TutorLessonPlanPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => setScreen('profile')}
          // План открывают из итогов практики и разбора ошибок — назад туда же.
          onBack={() => goBack(() => setScreen('tutor-dashboard'))}
        />
      )
    case 'tutor-manage':
      return (
        <TutorManagePage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => setScreen('profile')}
          // Из отчёта о звонке («История») — обратно в отчёт, с дашборда — на него.
          onBack={() => goBack(() => setScreen('tutor-dashboard'))}
          tutor={tutor}
          onChangeTutor={() => {
            setTutorEditFrom('manage')
            setScreen('tutor-choose')
          }}
          level={userLevel}
          interestIds={interestIds}
          profession={profession}
          // Опросник больше не показывается на каждую смену тьютора, поэтому
          // единственная точка правки этих ответов — здесь.
          onEditInterests={() => {
            setTutorEditFrom('manage')
            setScreen('tutor-interests')
          }}
          onEditProfession={() => {
            setTutorEditFrom('manage')
            setScreen('tutor-profession')
          }}
          onRetakeTest={() => {
            setTutorEditFrom('manage')
            setScreen('tutor-voice-intro')
          }}
          temper={temper}
          onToggleTemper={() => {
            const next = temper === 'harsh' ? 'calm' : 'harsh'
            setTemper(next)
            saveTutorPrefs(token, { tutorTemper: next })
          }}
          calls={callHistory}
          onOpenCall={(call) => {
            setSelectedCall(call)
            setReportCall(call)
            setReportOrigin('history')
            setScreen('tutor-call-report')
          }}
        />
      )
    case 'tutor-practice-result':
      return (
        <TutorPracticeResultPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-dashboard')}
          variant="fail"
          onAnalytics={() => setScreen('tutor-error-analytics')}
          onRetry={() => setScreen('tutor-voice-chat')}
          onToPlan={() => setScreen('tutor-lesson-plan')}
        />
      )
    case 'tutor-error-analytics':
      return (
        <TutorErrorAnalyticsPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-practice-result')}
          tutor={tutor}
          onToPlan={() => setScreen('tutor-lesson-plan')}
          onRetry={() => setScreen('tutor-voice-chat')}
        />
      )
    // Выход возвращает туда, откуда пришли: из домашки (карточка или урок
    // целиком) — в домашнюю работу, из каталога — в каталог. Иначе ученик,
    // открывший задание, уходил бы в чужой список уроков и искал домашку заново.
    // Карточка из адреса (F5 на ней) приезжает с источником 'catalog' — её
    // возвращает в домашку сам адрес карточки.
    case 'lesson-workspace': {
      const catalogSource = workspaceSource === 'catalog' || workspaceSource === 'self' || workspaceSource === 'homework'
      const fromHomework = workspaceSource === 'homework' || Boolean(workspaceCardId)
      return <LessonWorkspacePage lessonId={liveWorkspaceId} cardId={workspaceCardId} token={token} userName={name} userLevel={userLevel} onNav={handleNav} onProfile={() => setScreen('profile')} onVocab={() => handleNav('vocab', { back: true })} catalogLessonId={catalogSource && liveWorkspaceId != null ? Number(liveWorkspaceId) : undefined} loadLesson={catalogSource ? loadCatalogLesson : undefined} onExit={() => goBack(() => setScreen(fromHomework ? 'homework' : workspaceSource === 'catalog' ? 'course-catalog' : 'lessons'))} backLabel={backLabel(fromHomework ? 'homework' : workspaceSource === 'catalog' ? 'course-catalog' : 'lessons')} />
    }
    default:
      // Неизвестный экран (опечатка в диплинке ?screen=, старая закладка, экран, которого больше нет) раньше давал
      // пустую страницу без единой кнопки. Уводим на «Главную», а без входа — на приветствие.
      return <ScreenFallback to={token ? 'home' : 'welcome'} onGo={setScreen} />
  }
  }
}

function ScreenFallback({ to, onGo }) {
  useEffect(() => {
    onGo(to)
  }, [to, onGo])
  return null
}
