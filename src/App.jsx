'use client'

import { useEffect, useState } from 'react'
import WelcomePage from './screens/WelcomePage.jsx'
import RegistrationPage from './screens/RegistrationPage.jsx'
import PhoneLoginPage from './screens/PhoneLoginPage.jsx'
import OtpPage from './screens/OtpPage.jsx'
import SuccessPage from './screens/SuccessPage.jsx'
import LevelTestIntroPage from './screens/LevelTestIntroPage.jsx'
import LevelTestPage from './screens/LevelTestPage.jsx'
import LearningPage from './screens/LearningPage.jsx'
import PracticePage from './screens/PracticePage.jsx'
import LessonsPage from './screens/LessonsPage.jsx'
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
import ProfilePage from './screens/ProfilePage.jsx'
import { getTutor, TUTOR_GREETING } from './tutor/tutors.js'
import { speakTutorVoice } from './lib/ielts-audio.js'
import { interestIdsToEn, enToInterestIds } from './tutor/interests.js'
import { sendOtp, requestLoginOtp, verifyOtp, loginWithOtp, loginWithGoogle, saveLanguageLevel, getLanguageLevel } from './api.js'
import { saveToken, clearToken, restoreSession, mergeAnonymousProgress } from './lib/session.js'
import { loadTutorProfile, saveTutorPrefs } from './lib/tutorPrefs.js'
import { useI18n } from './i18n.jsx'

export default function App() {
  const { t } = useI18n()
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
    const deepLink = new URLSearchParams(window.location.search).get('screen')

    // Без токена в localStorage restoreSession() не ходит в сеть и отдаёт null
    // синхронно — аноним не видит заметной паузы.
    restoreSession()
      .then(async (session) => {
        if (cancelled) return
        if (session) {
          setToken(session.token)
          if (session.name) setName(session.name)
          if (session.phone) setPhone(session.phone)
          if (session.languageLevel) setUserLevel(session.languageLevel)
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
            setTutorOnboarded(true)
          }
          setInterestIds(enToInterestIds(profile.interests))
          if (profile.profession) setProfession(profile.profession)
        }
        // Диплинк важнее восстановления: им открывают конкретный экран для отладки.
        if (deepLink) setScreen(deepLink)
        else if (session) setScreen('kingdom')
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
  const [mode, setMode] = useState('register') // 'register' | 'login' — что ответил бэкенд
  // Что пользователь нажал на welcome. Вход бьёт в /auth/otp/request напрямую,
  // регистрация — в /registration/initiate. Определяет и «назад» с экрана телефона.
  const [authIntent, setAuthIntent] = useState('register')
  const [token, setToken] = useState(null)
  const [tutorKey, setTutorKey] = useState('spark') // выбранный тьютор
  // Онбординг тьютора пройден (тьютор сохранён в профиле) — сайдбар-«Тьютор»
  // ведёт сразу на dashboard, а не на welcome-цепочку.
  const [tutorOnboarded, setTutorOnboarded] = useState(false)
  // Тур по дашборду: включается один раз — сразу после онбординг-цепочки.
  const [showTutorTour, setShowTutorTour] = useState(false)
  const [interestIds, setInterestIds] = useState([]) // id тем из tutor/interests.js
  const [profession, setProfession] = useState('')
  const [userLevel, setUserLevel] = useState('A1')
  // В профиле на бэкенде нет уровня (новый аккаунт или тест ещё не пройден) —
  // после success-экрана ведём на CEFR-тест, а не сразу в королевство.
  const [needsLevelTest, setNeedsLevelTest] = useState(false)
  const [scenario, setScenario] = useState(null) // выбранный сценарий (id) или null = свободный чат
  const [kingdom, setKingdom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tutor = getTutor(tutorKey) // { key, name, avatar, ... }

  // Запрос кода: вход — строго /auth/otp/request, регистрация — с фолбэком
  // на вход, если номер уже занят. Бэкенд решает итоговый режим.
  function requestCode(fullPhone) {
    return authIntent === 'login' ? requestLoginOtp(fullPhone) : sendOtp(fullPhone, name)
  }

  async function handlePhoneSubmit(fullPhone) {
    setError('')
    setLoading(true)
    try {
      const m = await requestCode(fullPhone)
      setMode(m)
      setPhone(fullPhone)
      setScreen('otp')
    } catch (e) {
      setError(e.message || t('err.send'))
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(code) {
    setError('')
    setLoading(true)
    try {
      const data = await verifyOtp(phone, code, name, mode)
      // токен: в login-режиме приходит сразу; после регистрации — отдельным входом
      let tok = mode === 'login' ? data?.accessToken : null
      if (!tok) {
        try {
          tok = await loginWithOtp(phone)
        } catch (e) {
          console.warn('Не удалось получить токен:', e)
        }
      }
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
      // При сетевой осечке уровень неизвестен — тестом не пристаём, кроме
      // свежей регистрации: у неё уровня заведомо ещё нет.
      setNeedsLevelTest(lvlKnown ? !lvl : mode !== 'login')
      // Новый аккаунт всегда проходит онбординг тьютора с нуля: сбрасываем
      // выбор, который мог остаться в стейте вкладки от анонима или прошлого
      // юзера этого браузера (merge анкету тоже не переносит — см. merge.js).
      if (mode === 'register') {
        setTutorKey('spark')
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
              setTutorOnboarded(true)
            }
            setInterestIds(enToInterestIds(profile.interests))
            if (profile.profession) setProfession(profile.profession)
          })
      }
      setScreen('success')
    } catch (e) {
      setError(e.message || t('err.otp'))
    } finally {
      setLoading(false)
    }
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
      // Имя из Google-профиля надёжнее введённого в чате, но чат — фолбэк.
      setName(data?.name || chatName || '')
      setToken(tok)
      saveToken(tok)
      try {
        const lvl = await getLanguageLevel(tok)
        if (lvl) setUserLevel(lvl)
        // Уровня в профиле нет — Google-аккаунт свежесозданный (или тест
        // пропускали), после success ведём на CEFR-тест.
        setNeedsLevelTest(!lvl)
      } catch (e) {
        console.warn('Не удалось получить уровень из профиля:', e)
      }
      // Как и после OTP: перенос анонимного прогресса, затем тьютор-профиль
      // аккаунта (тьютор/интересы/профессия с прошлых сессий).
      mergeAnonymousProgress(tok)
        .then(() => loadTutorProfile(tok))
        .then((profile) => {
          if (!profile) return
          if (profile.tutor) {
            setTutorKey(profile.tutor)
            setTutorOnboarded(true)
          }
          setInterestIds(enToInterestIds(profile.interests))
          if (profile.profession) setProfession(profile.profession)
        })
      setScreen('success')
    } catch (e) {
      setError(e.message || t('err.otp'))
    } finally {
      setLoading(false)
    }
  }

  // Завершение письменного CEFR-теста (после регистрации) — сохраняем уровень и
  // открываем королевство.
  async function handleTestDone(res) {
    setNeedsLevelTest(false)
    if (res?.level) setUserLevel(res.level)
    if (token && res?.level) {
      try {
        await saveLanguageLevel(token, res.level)
      } catch (e) {
        console.warn('Не удалось сохранить уровень:', e)
      }
    }
    setScreen('kingdom')
  }

  // Завершение голосового placement-теста: сохраняем определённый Sonnet уровень
  // в профиль и показываем экран результата (кружок с уровнем).
  async function handlePlacementDone(level) {
    setNeedsLevelTest(false)
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
    setToken(null)
    setName('')
    setPhone('')
    // Тьютор-профиль принадлежит аккаунту — в той же вкладке следующий юзер
    // не должен унаследовать чужой выбор.
    setTutorKey('spark')
    setTutorOnboarded(false)
    setInterestIds([])
    setProfession('')
    setNeedsLevelTest(false)
    setScreen('welcome')
  }

  // Домашний экран тьютора: dashboard после онбординга, welcome-цепочка до.
  const tutorHome = tutorOnboarded ? 'tutor-dashboard' : 'tutor-welcome'

  // Навигация по левому сайдбару обучающей зоны.
  function handleNav(key) {
    if (key === 'learning' || key === 'learn') setScreen('kingdom')
    else if (key === 'practice') setScreen('practice')
    else if (key === 'tutor') setScreen(tutorHome)
    else if (key === 'lessons') setScreen('lessons')
    else if (key === 'ielts') setScreen('ielts')
    else if (key === 'vocab') setScreen('vocab')
  }

  // Навигация из сайдбара зоны тьютора: «Обучение»/«Практика» уводят из тьютора,
  // «Тьютор» возвращает на домашний экран (welcome до онбординга, dashboard после).
  function handleTutorNav(key, tutorHome = 'tutor-dashboard') {
    if (key === 'learn' || key === 'learning') setScreen('kingdom')
    else if (key === 'practice') setScreen('practice')
    else if (key === 'tutor') setScreen(tutorHome)
    else if (key === 'lessons') setScreen('lessons')
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
  }

  async function handleResend() {
    setError('')
    try {
      const m = await requestCode(phone)
      setMode(m)
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

  switch (screen) {
    case 'welcome':
      return (
        <WelcomePage
          onRegister={() => {
            setError('')
            setAuthIntent('register')
            setScreen('chat')
          }}
          // Вход не требует знакомства — сразу телефон + OTP.
          onLogin={() => {
            setError('')
            setName('')
            setAuthIntent('login')
            setScreen('phone')
          }}
        />
      )
    case 'chat':
      return (
        <RegistrationPage
          onBack={() => setScreen('welcome')}
          onPhoneLogin={(userName) => {
            setName(userName || '')
            setError('')
            setScreen('phone')
          }}
          onGoogleToken={handleGoogleCredential}
          error={error}
        />
      )
    case 'phone':
      return (
        <PhoneLoginPage
          onBack={() => { setError(''); setScreen(authIntent === 'login' ? 'welcome' : 'chat') }}
          onSubmit={handlePhoneSubmit}
          onGoogleToken={handleGoogleCredential}
          loading={loading}
          error={error}
        />
      )
    case 'otp':
      return (
        <OtpPage
          phone={phone}
          onBack={() => { setError(''); setScreen('phone') }}
          onSubmit={handleOtpSubmit}
          onResend={handleResend}
          loading={loading}
          error={error}
        />
      )
    case 'success':
      // Уровень уже взят из профиля; если его там не было (новая регистрация) —
      // сначала письменный CEFR-тест, иначе сразу в обучение.
      return <SuccessPage onDone={() => setScreen(needsLevelTest ? 'test-intro' : 'kingdom')} />
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
      return (
        <LevelTestPage
          onClose={() => setScreen('test-intro')}
          onDone={handleTestDone}
        />
      )
    case 'kingdom':
      return (
        <LearningPage
          userLevel={userLevel}
          userName={name}
          token={token}
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
        />
      )
    case 'lessons':
      return <LessonsPage userLevel={userLevel} userName={name} token={token} onNav={handleNav} onProfile={() => setScreen('profile')} />
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
        />
      )
    case 'kingdom-interior':
      return (
        <KingdomInteriorPage
          kingdom={kingdom}
          userName={name}
          userLevel={userLevel}
          token={token}
          onNav={handleNav}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('kingdom')}
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
          onSelect={() => setScreen('tutor-choose')}
        />
      )
    case 'tutor-choose':
      return (
        <TutorChoosePage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-lang')}
          onChoose={(key) => {
            setTutorKey(key)
            // Выбор сразу в профиль: перезагрузка не должна заставлять выбирать заново.
            setTutorOnboarded(true)
            saveTutorPrefs(token, { tutor: key })
            setScreen('tutor-loading')
          }}
          // Образец голоса: тьютор здоровается своим голосом (Gemini/Soniox).
          onListen={(key) => speakTutorVoice(key, TUTOR_GREETING[key] || '')}
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
          // После «подстройки» — голосовой placement-тест (Спарк), затем интересы
          // и работа. Уровень определяет Sonnet по записи монолога.
          onDone={() => setScreen('tutor-voice-intro')}
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
          onBack={() => setScreen('tutor-choose')}
          tutor={tutor}
          onStart={() => {
            setScenario(null)
            setScreen('speaking-test')
          }}
          // «Не могу говорить сейчас» — пропуск теста, дальше по онбордингу.
          onDecline={() => setScreen('tutor-interests')}
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
          scenario={scenario}
          onFinish={() =>
            setScreen(
              scenario ? 'tutor-scenarios' : tutorOnboarded ? 'tutor-dashboard' : 'tutor-level-result',
            )
          }
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
          onContinue={() => setScreen('tutor-interests')}
          onRetry={() => setScreen('speaking-test')}
        />
      )
    case 'tutor-interests':
      return (
        <TutorInterestsPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-choose')}
          tutor={tutor}
          initialIds={interestIds}
          onContinue={(ids) => {
            setInterestIds(ids)
            saveTutorPrefs(token, { interests: interestIdsToEn(ids) })
            setScreen('tutor-profession')
          }}
        />
      )
    case 'tutor-profession':
      return (
        <TutorProfessionPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, tutorHome)}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-interests')}
          tutor={tutor}
          onSubmit={(prof) => {
            const p = typeof prof === 'string' ? prof.trim() : ''
            if (p) {
              setProfession(p)
              saveTutorPrefs(token, { profession: p })
            }
            setScreen('tutor-analysis')
          }}
          onSkip={() => setScreen('tutor-analysis')}
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
          // Цепочка завершена — первый dashboard показываем с туром.
          onDone={() => {
            setShowTutorTour(true)
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
          onTourDone={() => setShowTutorTour(false)}
          tutor={tutor}
          onManage={() => setScreen('tutor-manage')}
          onTalk={() => {
            setScenario(null)
            setScreen('tutor-voice-chat')
          }}
          onSuggest={() => {}}
          onSeeLessons={() => setScreen('tutor-lesson-plan')}
          onSeeScenarios={() => setScreen('tutor-scenarios')}
          onScenario={() => setScreen('tutor-scenarios')}
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
    case 'tutor-chat-history':
      return (
        <TutorChatHistoryPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => setScreen('profile')}
          onBack={() => setScreen('tutor-manage')}
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
          onChangeTutor={() => setScreen('tutor-choose')}
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
    default:
      return null
  }
}
