import { useState } from 'react'
import WelcomePage from './pages/WelcomePage.jsx'
import RegistrationPage from './pages/RegistrationPage.jsx'
import PhoneLoginPage from './pages/PhoneLoginPage.jsx'
import OtpPage from './pages/OtpPage.jsx'
import SuccessPage from './pages/SuccessPage.jsx'
import LevelTestIntroPage from './pages/LevelTestIntroPage.jsx'
import LevelTestPage from './pages/LevelTestPage.jsx'
import LearningPage from './pages/LearningPage.jsx'
import KingdomInteriorPage from './pages/KingdomInteriorPage.jsx'
import { sendOtp, verifyOtp, loginWithOtp, saveLanguageLevel } from './api.js'
import { useI18n } from './i18n.jsx'

export default function App() {
  const { t } = useI18n()
  // Стартуем сразу с теста уровня (регистрацию можно пройти позже)
  const [screen, setScreen] = useState('test-intro')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [mode, setMode] = useState('register') // 'register' | 'login'
  const [token, setToken] = useState(null)
  const [userLevel, setUserLevel] = useState('A1')
  const [kingdom, setKingdom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePhoneSubmit(fullPhone) {
    setError('')
    setLoading(true)
    try {
      const m = await sendOtp(fullPhone, name)
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

  // Пропуск регистрации — сразу к тесту уровня, без обращений к backend
  function handleSkip() {
    setError('')
    setScreen('test-intro')
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
          onRegister={() => setScreen('chat')}
          onLogin={() => setScreen('chat')}
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
          onBack={() => { setError(''); setScreen('chat') }}
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
          onOpenKingdom={(k) => {
            setKingdom(k)
            setScreen('kingdom-interior')
          }}
        />
      )
    case 'kingdom-interior':
      return (
        <KingdomInteriorPage
          kingdom={kingdom}
          userName={name}
          userLevel={userLevel}
          onBack={() => setScreen('kingdom')}
        />
      )
    default:
      return null
  }
}
