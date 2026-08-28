'use client'

import { useEffect, useState, useRef } from 'react'
import WelcomePage from './screens/WelcomePage.jsx'
import RegistrationPage from './screens/RegistrationPage.jsx'
import PhoneLoginPage from './screens/PhoneLoginPage.jsx'
import OtpPage from './screens/OtpPage.jsx'
import RegisterPhonePage from './screens/RegisterPhonePage.jsx'
import RegisterEmailPage from './screens/RegisterEmailPage.jsx'
import RegisterBirthDatePage from './screens/RegisterBirthDatePage.jsx'
import SetPasswordPage from './screens/SetPasswordPage.jsx'
import PasswordLoginPage from './screens/PasswordLoginPage.jsx'
import SuccessPage from './screens/SuccessPage.jsx'
import LevelTestIntroPage from './screens/LevelTestIntroPage.jsx'
import PlacementTestPage from './screens/PlacementTestPage.jsx'
import LearningPage from './screens/LearningPage.jsx'
import PracticePage from './screens/PracticePage.jsx'
import ListeningPage from './screens/ListeningPage.jsx'
import ShadowingPage from './screens/ShadowingPage.jsx'
import WritingPage from './screens/WritingPage.jsx'
import WorkbookPage from './screens/WorkbookPage.jsx'
import LessonsPage from './screens/LessonsPage.jsx'
import HomeworkPage from './screens/HomeworkPage.jsx'
import LiveLessonPage from './screens/LiveLessonPage.jsx'
import IeltsPage from './screens/IeltsPage.jsx'
import IeltsWritingPage from './screens/IeltsWritingPage.jsx'
import IeltsListeningPage from './screens/IeltsListeningPage.jsx'
import IeltsReadingPage from './screens/IeltsReadingPage.jsx'
import IeltsSpeakingPage from './screens/IeltsSpeakingPage.jsx'
import IeltsProgressPage from './screens/IeltsProgressPage.jsx'
import SpeakingTestPage from './screens/SpeakingTestPage.jsx'
import VocabularyPage from './screens/VocabularyPage.jsx'
import KingdomInteriorPage from './screens/KingdomInteriorPage.jsx'
import TutorWelcomePage from './screens/TutorWelcomePage.jsx'
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
import { loadCatalogLesson } from './screens/workspace/loadCatalogLesson.js'
import { getTutor, temperFor } from './tutor/tutors.js'
import { isMinor } from './lib/birthDate.js'
import { playTutorSample } from './lib/ielts-audio.js'
import { interestIdsToEn, enToInterestIds } from './tutor/interests.js'
import { tourKeyFor, isTourSeen } from './tutor/OnboardingTour.jsx'
import { sendRegistrationOtp, verifyRegistrationOtp, requestLoginOtp, verifyLoginOtp, loginWithGoogle, loginWithPassword, setPassword, saveLanguageLevel, getLanguageLevel, getIsDemoAccount, getCurrentUser, updateUser } from './api.js'
import { saveToken, clearToken, restoreSession, mergeAnonymousProgress } from './lib/session.js'
import { getDeviceId, authHeaders } from './lib/identity.js'
import { isTeacher } from './lib/jwt.js'
import { hydratePractice, clearLocalPractice } from './practice/practiceSync.js'
import { loadTutorProfile, saveTutorPrefs, savePlacementLevel } from './lib/tutorPrefs.js'
import { useI18n } from './i18n.jsx'
import { TUTOR_ONLY, TUTOR_ONLY_SECTIONS } from './config.js'
import { KINGDOMS } from './kingdoms.js'

// Переводит ошибку запроса кода в ключ локализованного сообщения — или null,
// если случай не распознан (тогда показываем текст бэкенда/общий фолбэк). Коды
// проставляет api.js: USER_EXISTS (регистрация занятого номера) и
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
  'kingdom', 'practice', 'listening', 'writing', 'workbook', 'homework', 'lessons',
  'ielts', 'vocab', 'course-catalog', 'profile',
])

export default function App() {
  const { t, lang } = useI18n()
  // Стартуем с welcome: регистрация/вход — первое, что видит пользователь.
  // ?screen=… переопределяет начальный экран — так экраны тьютора остаются
  // достижимы для отладки/диплинков.
  //
  // Читать ?screen= прямо в useState нельзя: на сервере window нет, поэтому
  // SSR отрисовал бы 'welcome', а первый рендер клиента — экран из query, и
  // React ронял бы hydration mismatch. Поэтому первый рендер везде одинаковый
  // ('welcome'), а диплинк применяется эффектом уже после гидратации.
  const [screen, setScreen] = useState('welcome')
  // Пока проверяем сохранённый токен, не рисуем ни welcome, ни kingdom — иначе
  // у вернувшегося пользователя мелькнёт экран входа. Стартовое значение true
  // одинаково на сервере и клиенте, так что гидратация не ломается.
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    let cancelled = false
    const searchParams = new URLSearchParams(window.location.search)
    const deepLink = searchParams.get('screen')
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
    // ?live=<id> — id живого урока для «Живой урок» (диплинк
    // ?screen=live-lesson&live=<id>). Отдельный параметр от lessonParam выше:
    // тот наполняет liveWorkspaceId для другого экрана (lesson-workspace), а
    // тут своё состояние — liveLessonId для LiveLessonPage.
    const liveParam = searchParams.get('live')
    if (liveParam) {
      setLiveLessonId(liveParam)
    }
    // ?level=<A1|A2|…> — королевство для kingdom-interior (диплинк
    // ?screen=kingdom-interior&level=b1). Через карту туда не попасть, пока
    // уровень пользователя ниже, а смотреть тропу и урок нужно и до этого.
    const levelParam = searchParams.get('level')
    if (levelParam) {
      const want = levelParam.toUpperCase()
      const k = KINGDOMS.find((x) => x.level === want)
      if (k) setKingdom(k)
    }
    // ?unlock=1 — открыть все королевства и все уроки тропы для просмотра
    // контента. Только в дев-сборке: в проде это обошло бы гейтинг по уровню,
    // поэтому флаг снимается на этапе сборки, а не проверкой в рантайме.
    if (process.env.NODE_ENV !== 'production' && searchParams.get('unlock') === '1') {
      setDevUnlock(true)
    }

    // Без токена в localStorage restoreSession() не ходит в сеть и отдаёт null
    // синхронно — аноним не видит заметной паузы.
    restoreSession()
      .then(async (session) => {
        if (cancelled) return
        if (session) {
          setToken(session.token)
          hydratePractice(session.token)
          if (session.name) setName(session.name)
          if (session.phone) setPhone(session.phone)
          if (session.languageLevel) setUserLevel(session.languageLevel)
          // Возраст решает, открыт ли жёсткий нрав тьютора (кнопка 18+).
          if (session.birthDate) setBirthDate(String(session.birthDate).slice(0, 10))
          getIsDemoAccount(session.token).then((v) => { if (!cancelled) setIsDemoAccount(v) })
        }
        // Выбор тьютора/интересов/профессии закреплён за профилем (аккаунт или
        // device-id) — восстанавливаем, чтобы перезагрузка не гоняла онбординг
        // заново. Ждём здесь же: спиннер и так висит, зато к первому экрану
        // навигация «Тьютор» уже знает, вести на dashboard или на welcome.
        const profile = await loadTutorProfile(session?.token)
        if (cancelled) return
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
        // Диплинк важнее восстановления: им открывают конкретный экран для отладки.
        if (deepLink) setScreen(deepLink)
        // Преподаватель приходит сюда работать, а не учиться: карта уровней с
        // запертыми королевствами — ученический экран, и открывать его первым
        // ему бессмысленно (сайдбар ему всё остальное и так не показывает).
        else if (session && isTeacher(session.token)) setScreen('lessons')
        else if (session) setScreen(TUTOR_ONLY ? (profile?.tutor ? 'tutor-dashboard' : 'tutor-welcome') : 'kingdom')
      })
      .finally(() => {
        if (!cancelled) setRestoring(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  // Почта студента при регистрации: номер → почта → код (на почту) → пароль,
  // оба идентификатора собираются ДО запроса кода (см. handleRegEmailSubmit).
  // Для входа не используется — там всё ещё один идентификатор в `phone`.
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthDateGate, setBirthDateGate] = useState(false)
  const [mode, setMode] = useState('register') // 'register' | 'login' — что ответил бэкенд
  const [token, setToken] = useState(null)
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
  // В профиле на бэкенде нет уровня (новый аккаунт или тест ещё не пройден) —
  // после success-экрана ведём на CEFR-тест, а не сразу в королевство.
  const [needsLevelTest, setNeedsLevelTest] = useState(false)
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
  // id живого урока для workspace-экрана (диплинк ?screen=lesson-workspace&lesson=<id>,
  // см. эффект восстановления сессии ниже). Без диплинка остаётся null —
  // LessonWorkspacePage тогда показывает SAMPLE_LESSON.
  const [liveWorkspaceId, setLiveWorkspaceId] = useState(null)
  // 'live' — id из LiveLesson (jsonUrl), 'catalog' — id урока каталога (сырой
  // L*.html + клиентское извлечение). Определяет, чем workspace грузит контент.
  const [workspaceSource, setWorkspaceSource] = useState('live')
  const [shadowingLesson, setShadowingLesson] = useState('sg') // урок Shadowing, выбранный на карточке Практики
  const [writingTarget, setWritingTarget] = useState(null) // { level?, genreId? } — прыжок из Практики сразу в уровень/жанр Writing
  const [workbookTarget, setWorkbookTarget] = useState(null) // { level } — какой воркбук открыть из Практики
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tutor = getTutor(tutorKey) // { key, name, avatar, ... }
  // Жёсткий нрав тьютора (кнопка 18+) запираем, когда в профиле стоит возраст
  // меньше 18. Неизвестная дата не запирает — у анонима и у аккаунтов, заведённых
  // до обязательного поля, её нет вовсе (см. isMinor). Сервер держит тот же
  // запрет отдельно: /api/profile не сохранит harsh, а токен LiveKit выдаётся с
  // calm — клиентская проверка здесь ради понятной кнопки, а не как защита.
  const adultLocked = isMinor(birthDate)

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
      setToken(tok || null)
      saveToken(tok || null) // без этого сессия умрёт на первой перезагрузке
      // Уровень берём из профиля на backend. Если его там нет — аккаунт новый
      // (или тест пропускали), и после success покажем CEFR-тест.
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
      if (tok) getIsDemoAccount(tok).then(setIsDemoAccount)
      // При входе (в отличие от регистрации) даты рождения в стейте нет, а от
      // неё зависит доступ к жёсткому нраву тьютора — подтягиваем из профиля.
      if (tok && mode !== 'register') {
        getCurrentUser(tok)
          .then((me) => {
            if (me?.birthDate) setBirthDate(String(me.birthDate).slice(0, 10))
          })
          .catch(() => {})
      }
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
      setError(e.message || t('err.otp'))
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
      const tok = await loginWithPassword(identifier, password)
      if (!tok) throw new Error(t('login.failed'))
      setPhone(identifier)
      setToken(tok)
      saveToken(tok)
      try {
        const lvl = await getLanguageLevel(tok)
        if (lvl) setUserLevel(lvl)
        setNeedsLevelTest(!lvl)
      } catch (e) {
        console.warn('Не удалось получить уровень из профиля:', e)
      }
      getIsDemoAccount(tok).then(setIsDemoAccount)
      // Возраст решает доступ к жёсткому нраву тьютора — тянем из профиля.
      getCurrentUser(tok)
        .then((me) => {
          if (me?.birthDate) setBirthDate(String(me.birthDate).slice(0, 10))
        })
        .catch(() => {})
      mergeAnonymousProgress(tok)
        .then(() => loadTutorProfile(tok))
        .then((profile) => {
          if (!profile) return
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
    try {
      const lvl = await getLanguageLevel(tok)
      if (lvl) setUserLevel(lvl)
      setNeedsLevelTest(!lvl)
    } catch (e) {
      console.warn('Не удалось получить уровень из профиля:', e)
    }
    getIsDemoAccount(tok).then(setIsDemoAccount)
    mergeAnonymousProgress(tok)
      .then(() => loadTutorProfile(tok))
      .then((profile) => {
        if (!profile) return
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
      saveToken(tok)
      const me = await getCurrentUser(tok).catch(() => null)
      if (!me?.birthDate) {
        setBirthDateGate(true)
        setScreen('reg-birth')
        return
      }
      setBirthDate(String(me.birthDate).slice(0, 10))
      await finishGoogleSession(tok)
    } catch (e) {
      setError(e.message || t('err.otp'))
    } finally {
      setLoading(false)
    }
  }

  // Завершение письменного CEFR-теста (после регистрации) — сохраняем уровень и
  // открываем королевство. Уровень пишем в оба стора: backend — источник правды
  // при входе, Neon-профиль — то, что читает голосовой тьютор; без второй
  // записи они расходились.
  // Сохранение уровня отделено от перехода: тест отдаёт уровень дважды —
  // сразу по подсчёту и по кнопке «Let's go», — и записать его надо на первом
  // же событии, а увести с экрана только по кнопке. Повтор того же уровня в
  // сеть не шлём: второй вызов приходит через секунды с тем же значением.
  const lastSavedTestLevel = useRef(null)
  async function saveTestLevel(level) {
    if (!level || lastSavedTestLevel.current === level) return
    lastSavedTestLevel.current = level
    setNeedsLevelTest(false)
    setUserLevel(level)
    savePlacementLevel(token, level) // best-effort, не блокируем переход
    if (token) {
      try {
        await saveLanguageLevel(token, level)
      } catch (e) {
        console.warn('Не удалось сохранить уровень:', e)
      }
    }
  }

  async function handleTestDone(res) {
    setNeedsLevelTest(false)
    await saveTestLevel(res?.level)
    setScreen(TUTOR_ONLY ? tutorHome : 'kingdom')
  }

  // Завершение голосового placement-теста: сохраняем определённый Sonnet уровень
  // в профиль и показываем экран результата (кружок с уровнем).
  async function handlePlacementDone(level, assessment) {
    setNeedsLevelTest(false)
    setPlacementResult(assessment || null)
    if (level) setUserLevel(level)
    if (token && level) {
      try {
        await saveLanguageLevel(token, level)
      } catch (e) {
        console.warn('Не удалось сохранить уровень:', e)
      }
    }
    setScreen('tutor-level-result')
  }

  // Выход из аккаунта: чистим токен и возвращаем на welcome.
  function handleLogout() {
    clearToken()
    clearLocalPractice()
    setToken(null)
    setName('')
    setPhone('')
    setEmail('')
    setIsDemoAccount(false)
    // Тьютор-профиль принадлежит аккаунту — в той же вкладке следующий юзер
    // не должен унаследовать чужой выбор.
    setTutorKey('spark')
    setTemper(null)
    setTutorOnboarded(false)
    setProfileId(null)
    setInterestIds([])
    setProfession('')
    setNeedsLevelTest(false)
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

  // Держим ?screen= (и служебный ?live= для «Живого урока») в URL синхронными
  // с текущим экраном (см. PERSISTABLE_SCREENS выше) — обновление страницы (F5)
  // читает их тем же deepLink-путём, что и явный диплинк, и остаётся там же, а
  // не на дефолтном экране роли (жалоба: во время живого урока F5 выбрасывал
  // на главную).
  useEffect(() => {
    if (restoring) return
    const url = new URL(window.location.href)
    const hadScreen = url.searchParams.get('screen')
    const hadLive = url.searchParams.get('live')
    const isLiveLesson = screen === 'live-lesson' && liveLessonId != null
    const wantLive = isLiveLesson ? String(liveLessonId) : null
    if (PERSISTABLE_SCREENS.has(screen) || isLiveLesson) {
      if (hadScreen === screen && hadLive === wantLive) return
      url.searchParams.set('screen', screen)
      if (wantLive != null) url.searchParams.set('live', wantLive)
      else url.searchParams.delete('live')
    } else {
      if (!hadScreen && !hadLive) return
      url.searchParams.delete('screen')
      url.searchParams.delete('live')
    }
    window.history.replaceState(null, '', url)
  }, [screen, restoring, liveLessonId])

  // Навигация по левому сайдбару обучающей зоны. В тьютор-онли (main)
  // скрытые разделы недоступны и через навигацию — только разделы
  // из TUTOR_ONLY_SECTIONS (тьютор, практика, словарь, аудирование, шэдоуинг).
  function handleNav(key, payload) {
    if (TUTOR_ONLY && !TUTOR_ONLY_SECTIONS.includes(key)) return
    if (key === 'learning' || key === 'learn') setScreen('kingdom')
    else if (key === 'practice') setScreen('practice')
    else if (key === 'listening') setScreen('listening')
    // Shadowing открывается с карточки Практики — payload несёт id урока.
    else if (key === 'shadowing') { if (payload) setShadowingLesson(payload); setScreen('shadowing') }
    else if (key === 'writing') { if (payload) setWritingTarget(payload); setScreen('writing') }
    else if (key === 'workbook') { if (payload) setWorkbookTarget(payload); setScreen('workbook') }
    else if (key === 'tutor') setScreen(tutorHome)
    else if (key === 'lessons') {
      if (payload && payload.lessonId) {
        setLiveLessonId(payload.lessonId)
        setScreen('live-lesson')
      } else setScreen('lessons')
    }
    else if (key === 'homework') setScreen('homework')
    else if (key === 'ielts') setScreen('ielts')
    else if (key === 'vocab') setScreen('vocab')
  }

  // Навигация из сайдбара зоны тьютора: «Обучение»/«Практика» уводят из тьютора,
  // «Тьютор» возвращает на домашний экран (welcome до онбординга, dashboard после).
  function handleTutorNav(key, tutorHome = 'tutor-dashboard') {
    if (TUTOR_ONLY && !TUTOR_ONLY_SECTIONS.includes(key)) return
    if (key === 'learn' || key === 'learning') setScreen('kingdom')
    else if (key === 'practice') setScreen('practice')
    else if (key === 'listening') setScreen('listening')
    else if (key === 'shadowing') setScreen('shadowing')
    else if (key === 'writing') setScreen('writing')
    else if (key === 'workbook') setScreen('workbook')
    else if (key === 'tutor') setScreen(tutorHome)
    else if (key === 'lessons') setScreen('lessons')
    else if (key === 'homework') setScreen('homework')
    else if (key === 'ielts') setScreen('ielts')
    else if (key === 'vocab') setScreen('vocab')
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
      setError(e.message || 'Не удалось отправить код повторно.')
    }
  }

  if (restoring) {
    return (
      <div className="screen">
        <div className="spinner" aria-label="Загрузка" />
      </div>
    )
  }

  // Единая анимация перехода между экранами: key={screen} перемонтирует
  // обёртку при каждой смене экрана, и CSS-анимация .scr-in проигрывается
  // заново (fade + лёгкий подъём; отключается при prefers-reduced-motion).
  const page = renderScreen()
  return page && (
    <div key={screen} className="scr-in">
      {page}
    </div>
  )

  function renderScreen() {
  switch (screen) {
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
          onBack={() => { setError(''); setScreen('chat') }}
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
    case 'set-password':
      return (
        <SetPasswordPage
          onSubmit={handleSetPassword}
          loading={loading}
          error={error}
        />
      )
    case 'success':
      // Уровень уже взят из профиля; если его там не было (новая регистрация) —
      // сначала письменный CEFR-тест, иначе сразу в обучение. В режиме «только
      // тьютор» королевств нет: свежий вход ведёт в онбординг тьютора (там свой
      // голосовой тест уровня), вернувшийся пользователь — сразу на дашборд.
      return (
        <SuccessPage
          onDone={() =>
            // Преподавателя ведём в «Уроки»: карта уровней и CEFR-тест — часть
            // ученического пути, ему они не нужны (см. восстановление сессии).
            setScreen(
              isTeacher(token) ? 'lessons'
                : TUTOR_ONLY ? tutorHome
                  : needsLevelTest ? 'test-intro' : 'kingdom'
            )
          }
        />
      )
    case 'test-intro':
      return (
        <LevelTestIntroPage
          // Сюда попадают уже залогиненными — «назад» ведёт в королевство,
          // как и «позже», а не на экран входа.
          onBack={() => setScreen('kingdom')}
          onStart={() => setScreen('test')}
          onLater={() => setScreen('kingdom')}
        />
      )
    case 'test':
      // Тест на определение уровня: движок школы, перенесённый в проект
      // (src/practice/placement/), экран — в оформлении приложения. Он же
      // определяет A0, которого прежний адаптивный тест выдать не мог.
      // Уровень сохраняем сразу по подсчёту, не дожидаясь кнопки: иначе
      // пройденный тест пропадёт, если закрыть вкладку на экране результата.
      return (
        <PlacementTestPage
          lang={lang}
          onLevel={(level) => saveTestLevel(level)}
          onDone={(level) => handleTestDone({ level })}
        />
      )
    case 'kingdom':
      return (
        <LearningPage
          userLevel={userLevel}
          userName={name}
          token={token}
          unlockAll={devUnlock}
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
        />
      )
    case 'practice':
      return (
        <PracticePage
          userLevel={userLevel}
          userName={name}
          token={token}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          isDemoAccount={isDemoAccount}
        />
      )
    case 'listening':
      return (
        <ListeningPage
          userLevel={userLevel}
          userName={name}
          token={token}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          isDemoAccount={isDemoAccount}
        />
      )
    case 'shadowing':
      return (
        <ShadowingPage
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
          userLevel={userLevel}
          userName={name}
          token={token}
          initialTarget={workbookTarget}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          isDemoAccount={isDemoAccount}
        />
      )
    case 'lessons':
      return <LessonsPage userLevel={userLevel} userName={name} token={token} onNav={handleNav} onProfile={() => setScreen('profile')} onOpenLesson={(id) => { setLiveLessonId(id); setScreen('live-lesson') }} onOpenCatalog={() => setScreen('course-catalog')} />
    case 'homework':
      return <HomeworkPage userLevel={userLevel} userName={name} token={token} onNav={handleNav} onProfile={() => setScreen('profile')} />
    case 'course-catalog':
      return <CourseCatalogPage userLevel={userLevel} userName={name} token={token} onNav={handleNav} onProfile={() => setScreen('profile')} onBack={() => setScreen('lessons')} onOpenLesson={(id) => { setLiveWorkspaceId(id); setWorkspaceSource('catalog'); setScreen('lesson-workspace') }} />
    case 'live-lesson':
      return <LiveLessonPage lessonId={liveLessonId} userName={name} userLevel={userLevel} token={token} onNav={handleNav} onProfile={() => setScreen('profile')} onBack={() => setScreen('lessons')} />
    // Секции IELTS ходят друг к другу по имени экрана — своя мини-навигация
    // поверх общей (onGo), сайдбар при этом остаётся на пункте «IELTS».
    case 'ielts':
      return <IeltsPage {...ieltsProps} />
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
          onBack={() => setScreen('kingdom')}
          isDemoAccount={isDemoAccount}
        />
      )
    case 'tutor-welcome':
      return (
        <TutorWelcomePage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onContinue={() => setScreen('tutor-lang')}
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
            setScreen('tutor-choose')
          }}
        />
      )
    case 'tutor-choose':
      return (
        <TutorChoosePage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => goAfterTutorEdit('tutor-lang')}
          tutorKey={tutorKey}
          temper={temper}
          adultLocked={adultLocked}
          onChoose={(key, chosenTemper = null) => {
            setTutorKey(key)
            // Страховка от рассинхрона: экран запертую кнопку не включает, но
            // характер приезжает сюда параметром — жёсткий у школьника режем.
            const safeTemper = chosenTemper === 'harsh' && adultLocked ? 'calm' : chosenTemper
            setTemper(safeTemper)
            // Выбор сразу в профиль: перезагрузка не должна заставлять выбирать заново.
            setTutorOnboarded(true)
            // Тьютор и нрав пишутся ОДНИМ патчем: разними их — и при осечке сети
            // в профиле останется тьютор с чужим характером.
            saveTutorPrefs(token, { tutor: key, tutorTemper: safeTemper })
            setScreen('tutor-loading')
          }}
          // Образец голоса — готовый файл, а не живой синтез: фраза одна и та
          // же у всех, платить за неё провайдеру на каждое нажатие незачем.
          onListen={(key) => playTutorSample(key)}
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
          // После «подстройки» — предложение пройти голосовой placement-тест
          // (экран tutor-level-offer), оттуда либо сам тест, либо «позже» сразу
          // к интересам. Раньше загрузка вела прямо в тест, и экран-предложение,
          // хотя и свёрстан по макету, был недостижим — уйти от теста было
          // нечем. Смена тьютора (пришли из управления) цепочку пропускает:
          // ответы уже в профиле.
          onDone={() => goAfterTutorEdit('tutor-level-offer', 'tutor-dashboard')}
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
          // После онбординга разговор запускается с dashboard — «Назад» и финиш
          // возвращают туда же. Экран результата уровня остался только в
          // placement-цепочке (voice-intro), достижимой диплинком.
          onBack={() => setScreen(tutorOnboarded ? 'tutor-dashboard' : 'tutor-voice-intro')}
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
            goAfterTutorEdit('tutor-profession')
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
          onBack={() => setScreen('tutor-dashboard')}
        />
      )
    case 'tutor-manage':
      return (
        <TutorManagePage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-dashboard')}
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
          adultLocked={adultLocked}
          onToggleTemper={() => {
            const next = temper === 'harsh' ? 'calm' : 'harsh'
            // Запертую кнопку экран не нажимает, но обработчик — вход в общий
            // стейт: включить 18+ школьнику нельзя и отсюда.
            if (next === 'harsh' && adultLocked) return
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
    case 'lesson-workspace':
      return <LessonWorkspacePage lessonId={liveWorkspaceId} token={token} catalogLessonId={workspaceSource === 'catalog' && liveWorkspaceId != null ? Number(liveWorkspaceId) : undefined} loadLesson={workspaceSource === 'catalog' ? loadCatalogLesson : undefined} onExit={() => setScreen(workspaceSource === 'catalog' ? 'course-catalog' : 'lessons')} />
    default:
      return null
  }
  }
}
