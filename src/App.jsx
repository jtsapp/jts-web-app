import { useState } from 'react'
import WelcomePage from './pages/WelcomePage.jsx'
import RegistrationPage from './pages/RegistrationPage.jsx'
import PhoneLoginPage from './pages/PhoneLoginPage.jsx'
import OtpPage from './pages/OtpPage.jsx'
import SuccessPage from './pages/SuccessPage.jsx'
import { sendOtp, verifyOtp } from './api.js'

export default function App() {
  // Машина состояний экранов регистрации
  const [screen, setScreen] = useState('welcome')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [mode, setMode] = useState('register') // 'register' | 'login'
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
      setError(e.message || 'Не удалось отправить код. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpSubmit(code) {
    setError('')
    setLoading(true)
    try {
      await verifyOtp(phone, code, name, mode)
      setScreen('success')
    } catch (e) {
      setError(e.message || 'Неверный код. Проверьте и попробуйте снова.')
    } finally {
      setLoading(false)
    }
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
      return <SuccessPage name={name} onHome={() => setScreen('welcome')} />
    default:
      return null
  }
}
