import { useState } from 'react'
import WelcomePage from './pages/WelcomePage.jsx'
import RegistrationPage from './pages/RegistrationPage.jsx'

export default function App() {
  // Простая навигация между экранами без роутера
  const [screen, setScreen] = useState('welcome')

  return (
    <div className="app">
      {screen === 'welcome' ? (
        <WelcomePage
          onRegister={() => setScreen('registration')}
          onLogin={() => setScreen('registration')}
        />
      ) : (
        <RegistrationPage onBack={() => setScreen('welcome')} />
      )}
    </div>
  )
}
