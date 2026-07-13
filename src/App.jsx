import { useState } from 'react'
import WelcomePage from './pages/WelcomePage.jsx'
import RegistrationPage from './pages/RegistrationPage.jsx'
import PhoneLoginPage from './pages/PhoneLoginPage.jsx'
import OtpPage from './pages/OtpPage.jsx'
import SuccessPage from './pages/SuccessPage.jsx'
import LevelTestIntroPage from './pages/LevelTestIntroPage.jsx'
import LevelTestPage from './pages/LevelTestPage.jsx'
import TutorWelcomePage from './pages/TutorWelcomePage.jsx'
import TutorLanguagePage from './pages/TutorLanguagePage.jsx'
import TutorChoosePage from './pages/TutorChoosePage.jsx'
import TutorLoadingPage from './pages/TutorLoadingPage.jsx'
import TutorLevelOfferPage from './pages/TutorLevelOfferPage.jsx'
import TutorVoiceIntroPage from './pages/TutorVoiceIntroPage.jsx'
import TutorVoiceChatPage from './pages/TutorVoiceChatPage.jsx'
import TutorLevelResultPage from './pages/TutorLevelResultPage.jsx'
import TutorInterestsPage from './pages/TutorInterestsPage.jsx'
import TutorProfessionPage from './pages/TutorProfessionPage.jsx'
import TutorAnalysisPage from './pages/TutorAnalysisPage.jsx'
import TutorDashboardPage from './pages/TutorDashboardPage.jsx'
import TutorLessonPlanPage from './pages/TutorLessonPlanPage.jsx'
import TutorManagePage from './pages/TutorManagePage.jsx'
import TutorPracticeResultPage from './pages/TutorPracticeResultPage.jsx'
import TutorErrorAnalyticsPage from './pages/TutorErrorAnalyticsPage.jsx'
import TutorScenariosPage from './pages/TutorScenariosPage.jsx'
import TutorChatHistoryPage from './pages/TutorChatHistoryPage.jsx'
import { getTutor } from './tutor/tutors.js'
import { sendOtp, verifyOtp, loginWithOtp, saveLanguageLevel } from './api.js'

export default function App() {
  // Машина состояний экранов регистрации.
  // Начальный экран можно задать через ?screen=… (удобно для отладки/диплинков).
  const [screen, setScreen] = useState(
    () => new URLSearchParams(window.location.search).get('screen') || 'welcome',
  )
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [mode, setMode] = useState('register') // 'register' | 'login'
  const [token, setToken] = useState(null)
  const [tutorKey, setTutorKey] = useState('spark') // выбранный тьютор
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tutor = getTutor(tutorKey) // { key, name, avatar, ... }

  async function handlePhoneSubmit(fullPhone) {
    setError('')
    setLoading(true)
    try {
      const m = await sendOtp(fullPhone, name)
      setMode(m)
      setPhone(fullPhone)
      setScreen('otp')
    } catch (e) {
      setError(e.message || 'Не удалось отправить код. Попробуйте ещё раз.')
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
      setScreen('success')
    } catch (e) {
      setError(e.message || 'Неверный код. Проверьте и попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  // Завершение теста — сохраняем уровень в профиль пользователя
  async function handleTestDone(res) {
    if (token && res?.level) {
      try {
        await saveLanguageLevel(token, res.level)
      } catch (e) {
        console.warn('Не удалось сохранить уровень:', e)
      }
    }
    setScreen('tutor-welcome')
  }

  async function handleResend() {
    setError('')
    try {
      const m = await sendOtp(phone, name)
      setMode(m)
    } catch (e) {
      setError(e.message || 'Не удалось отправить код повторно.')
    }
  }

  switch (screen) {
    case 'welcome':
      return (
        <WelcomePage
          // DEV: вход временно сломан — обе кнопки пропускают авторизацию.
          // Вернуть на () => setScreen('chat'), когда починим вход.
          onRegister={() => setScreen('tutor-welcome')}
          onLogin={() => setScreen('tutor-welcome')}
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
        />
      )
    case 'phone':
      return (
        <PhoneLoginPage
          onBack={() => { setError(''); setScreen('chat') }}
          onSubmit={handlePhoneSubmit}
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
      return <SuccessPage onDone={() => setScreen('test-intro')} />
    case 'test-intro':
      return (
        <LevelTestIntroPage
          onBack={() => setScreen('welcome')}
          onStart={() => setScreen('test')}
          onLater={() => setScreen('welcome')}
        />
      )
    case 'test':
      return (
        <LevelTestPage
          onClose={() => setScreen('test-intro')}
          onDone={handleTestDone}
        />
      )
    case 'tutor-welcome':
      return (
        <TutorWelcomePage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={() => {}}
          onProfile={() => {}}
          onContinue={() => setScreen('tutor-lang')}
        />
      )
    case 'tutor-lang':
      return (
        <TutorLanguagePage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-welcome')}
          onProfile={() => {}}
          onSelect={() => setScreen('tutor-choose')}
        />
      )
    case 'tutor-choose':
      return (
        <TutorChoosePage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-lang')}
          onChoose={(key) => { setTutorKey(key); setScreen('tutor-loading') }}
          onListen={() => {}}
        />
      )
    case 'tutor-loading':
      return (
        <TutorLoadingPage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-choose')}
          tutor={tutor}
          onDone={() => setScreen('tutor-level-offer')}
        />
      )
    case 'tutor-level-offer':
      return (
        <TutorLevelOfferPage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-welcome')}
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
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-level-offer')}
          tutor={tutor}
          onStart={() => setScreen('tutor-voice-chat')}
          onDecline={() => setScreen('tutor-interests')}
        />
      )
    case 'tutor-voice-chat':
      return (
        <TutorVoiceChatPage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-voice-intro')}
          tutor={tutor}
          onFinish={() => setScreen('tutor-level-result')}
        />
      )
    // (голосовой чат завершается тапом по орбу → результат уровня)
    case 'tutor-level-result':
      return (
        <TutorLevelResultPage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-welcome')}
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
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-level-result')}
          tutor={tutor}
          onContinue={() => setScreen('tutor-profession')}
        />
      )
    case 'tutor-profession':
      return (
        <TutorProfessionPage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-welcome')}
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
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-welcome')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-profession')}
          tutor={tutor}
          onDone={() => setScreen('tutor-dashboard')}
        />
      )
    case 'tutor-dashboard':
      return (
        <TutorDashboardPage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-dashboard')}
          onProfile={() => {}}
          tutor={tutor}
          onManage={() => setScreen('tutor-manage')}
          onTalk={() => setScreen('tutor-voice-chat')}
          onSuggest={() => {}}
          onSeeLessons={() => setScreen('tutor-lesson-plan')}
          onSeeScenarios={() => setScreen('tutor-scenarios')}
          onScenario={() => setScreen('tutor-scenarios')}
        />
      )
    case 'tutor-scenarios':
      return (
        <TutorScenariosPage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-dashboard')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-dashboard')}
          onStart={() => setScreen('tutor-voice-chat')}
        />
      )
    case 'tutor-chat-history':
      return (
        <TutorChatHistoryPage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-dashboard')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-manage')}
        />
      )
    case 'tutor-lesson-plan':
      return (
        <TutorLessonPlanPage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-dashboard')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-dashboard')}
        />
      )
    case 'tutor-manage':
      return (
        <TutorManagePage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-dashboard')}
          onProfile={() => {}}
          onBack={() => setScreen('tutor-dashboard')}
          tutor={tutor}
          onChangeTutor={() => setScreen('tutor-choose')}
        />
      )
    case 'tutor-practice-result':
      return (
        <TutorPracticeResultPage
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-dashboard')}
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
          user={{ name: name || 'Сакен', rank: 'Вы Барон', level: 'B1' }}
          onNavigate={(key) => key === 'tutor' && setScreen('tutor-dashboard')}
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
