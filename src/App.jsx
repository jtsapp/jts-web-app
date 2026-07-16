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
import { getTutor } from './tutor/tutors.js'
import { sendOtp, requestLoginOtp, verifyOtp, loginWithOtp, saveLanguageLevel } from './api.js'
import { saveToken, clearToken, restoreSession, mergeAnonymousProgress } from './lib/session.js'
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
      .then((session) => {
        if (cancelled) return
        if (session) {
          setToken(session.token)
          if (session.name) setName(session.name)
          if (session.phone) setPhone(session.phone)
          if (session.languageLevel) setUserLevel(session.languageLevel)
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
  const [userLevel, setUserLevel] = useState('A1')
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
      // Прогресс, накопленный до входа, перевешиваем на аккаунт — иначе человек
      // увидит пустой словарь и забывшего его тьютора. Не ждём: вход не должен
      // упираться в эту запись.
      if (tok) mergeAnonymousProgress(tok)
      setScreen('success')
    } catch (e) {
      setError(e.message || t('err.otp'))
    } finally {
      setLoading(false)
    }
  }

  // Завершение теста — сохраняем уровень в профиль и открываем королевство
  async function handleTestDone(res) {
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

  // Выход из аккаунта: чистим токен и возвращаем на welcome.
  function handleLogout() {
    clearToken()
    setToken(null)
    setName('')
    setPhone('')
    setScreen('welcome')
  }

  // Навигация по левому сайдбару обучающей зоны.
  function handleNav(key) {
    if (key === 'learning' || key === 'learn') setScreen('kingdom')
    else if (key === 'practice') setScreen('practice')
    else if (key === 'tutor') setScreen('tutor-welcome')
    else if (key === 'lessons') setScreen('lessons')
    else if (key === 'ielts') setScreen('ielts')
  }

  // Навигация из сайдбара зоны тьютора: «Обучение»/«Практика» уводят из тьютора,
  // «Тьютор» возвращает на домашний экран (welcome до онбординга, dashboard после).
  function handleTutorNav(key, tutorHome = 'tutor-dashboard') {
    if (key === 'learn' || key === 'learning') setScreen('kingdom')
    else if (key === 'practice') setScreen('practice')
    else if (key === 'tutor') setScreen(tutorHome)
    else if (key === 'lessons') setScreen('lessons')
    else if (key === 'ielts') setScreen('ielts')
  }

  // Пропуск регистрации — сразу к тесту уровня, без обращений к backend
  function handleSkip() {
    setError('')
    setScreen('test-intro')
  }

  // Общие пропсы всех экранов IELTS: сайдбар + внутренняя навигация по секциям.
  const ieltsProps = {
    userLevel,
    userName: name,
    token,
    onNav: handleNav,
    onGo: setScreen,
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
          onSkip={handleSkip}
          onPhoneLogin={(userName) => {
            setName(userName || '')
            setError('')
            setScreen('phone')
          }}
        />
      )
    case 'phone':
      return (
        <PhoneLoginPage
          onBack={() => { setError(''); setScreen(authIntent === 'login' ? 'welcome' : 'chat') }}
          onSubmit={handlePhoneSubmit}
          onSkip={handleSkip}
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
          onSkip={handleSkip}
          loading={loading}
          error={error}
        />
      )
    case 'success':
      return <SuccessPage onDone={() => setScreen('test-intro')} />
    case 'test-intro':
      return (
        <LevelTestIntroPage
          onBack={() => setScreen('welcome')}
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
      return <LessonsPage userLevel={userLevel} userName={name} onNav={handleNav} onProfile={() => setScreen('profile')} />
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
    case 'kingdom-interior':
      return (
        <KingdomInteriorPage
          kingdom={kingdom}
          userName={name}
          userLevel={userLevel}
          onNav={handleNav}
          onBack={() => setScreen('kingdom')}
        />
      )
    case 'tutor-welcome':
      return (
        <TutorWelcomePage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-welcome')}
          onProfile={() => {}}
          onContinue={() => setScreen('tutor-lang')}
        />
      )
    case 'tutor-lang':
      return (
        <TutorLanguagePage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-welcome')}
          onProfile={() => {}}
          onSelect={() => setScreen('tutor-choose')}
        />
      )
    case 'tutor-choose':
      return (
        <TutorChoosePage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-lang')}
          onChoose={(key) => { setTutorKey(key); setScreen('tutor-loading') }}
          onListen={() => {}}
        />
      )
    case 'tutor-loading':
      return (
        <TutorLoadingPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-choose')}
          tutor={tutor}
          onDone={() => setScreen('tutor-level-offer')}
        />
      )
    case 'tutor-level-offer':
      return (
        <TutorLevelOfferPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-welcome')}
          onProfile={() => {}}
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
          onNavigate={(key) => handleTutorNav(key, 'tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-level-offer')}
          tutor={tutor}
          onStart={() => {
            setScenario(null)
            setScreen('tutor-voice-chat')
          }}
          onDecline={() => setScreen('tutor-interests')}
        />
      )
    case 'tutor-voice-chat':
      return (
        <TutorVoiceChatPage
          user={{ name, level: userLevel }}
          token={token}
          onNavigate={(key) => handleTutorNav(key, 'tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-voice-intro')}
          tutor={tutor}
          scenario={scenario}
          onFinish={() => setScreen(scenario ? 'tutor-scenarios' : 'tutor-level-result')}
        />
      )
    // (голосовой чат завершается тапом по орбу → результат уровня)
    case 'tutor-level-result':
      return (
        <TutorLevelResultPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-voice-chat')}
          tutor={tutor}
          level="A1"
          onContinue={() => setScreen('tutor-interests')}
          onRetry={() => setScreen('tutor-voice-intro')}
        />
      )
    case 'tutor-interests':
      return (
        <TutorInterestsPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-level-result')}
          tutor={tutor}
          onContinue={() => setScreen('tutor-profession')}
        />
      )
    case 'tutor-profession':
      return (
        <TutorProfessionPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-interests')}
          tutor={tutor}
          onSubmit={() => setScreen('tutor-analysis')}
          onSkip={() => setScreen('tutor-analysis')}
        />
      )
    case 'tutor-analysis':
      return (
        <TutorAnalysisPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-profession')}
          tutor={tutor}
          onDone={() => setScreen('tutor-dashboard')}
        />
      )
    case 'tutor-dashboard':
      return (
        <TutorDashboardPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => {}}
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
          onProfile={() => {}}
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
          onProfile={() => {}}
          onBack={() => setScreen('tutor-manage')}
        />
      )
    case 'tutor-lesson-plan':
      return (
        <TutorLessonPlanPage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-dashboard')}
        />
      )
    case 'tutor-manage':
      return (
        <TutorManagePage
          user={{ name, level: userLevel }}
          onNavigate={(key) => handleTutorNav(key, 'tutor-dashboard')}
          onProfile={() => {}}
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
          onProfile={() => {}}
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
          onProfile={() => {}}
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
