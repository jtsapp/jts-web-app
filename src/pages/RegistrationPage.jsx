import { useState, useRef, useEffect } from 'react'
import Logo from '../components/Logo.jsx'
import LangSelector from '../components/LangSelector.jsx'
import Footer from '../components/Footer.jsx'
import {
  ChevronLeftIcon,
  SendIcon,
  PhoneChatIcon,
  AppleIcon,
  GoogleIcon,
} from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'

export default function RegistrationPage({ onBack, onPhoneLogin }) {
  const { t } = useI18n()

  // Реплики Декстера после того, как пользователь назвал имя.
  // {name} подставляется автоматически. delay — сколько «печатать» перед показом.
  const dexterScript = [
    { text: t('dexter.nice'), delay: 900 },
    { text: t('dexter.motiv'), delay: 1600 },
    { text: t('dexter.toReg'), delay: 1300 },
  ]

  const [messages, setMessages] = useState([
    { from: 'dexter', text: t('dexter.greet') },
  ])
  const [typing, setTyping] = useState(false)
  const [value, setValue] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [name, setName] = useState('')
  const listRef = useRef(null)
  const timers = useRef([])

  // Автоскролл вниз при новых сообщениях/индикаторе печати/появлении кнопок
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, typing, showAuth])

  // Чистим таймеры при размонтировании
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function pushDexter(text) {
    setMessages((prev) => [...prev, { from: 'dexter', text }])
  }

  // Проигрывает сценарий: печатает -> сообщение -> ... -> показывает кнопки входа
  function playScript(userName) {
    let elapsed = 0
    dexterScript.forEach((line, i) => {
      timers.current.push(setTimeout(() => setTyping(true), elapsed))
      elapsed += line.delay
      timers.current.push(
        setTimeout(() => {
          setTyping(false)
          pushDexter(line.text.replace('{name}', userName))
        }, elapsed),
      )
      elapsed += 400
      // после последней реплики показываем варианты входа
      if (i === dexterScript.length - 1) {
        timers.current.push(setTimeout(() => setShowAuth(true), elapsed + 300))
      }
    })
  }

  function send() {
    const text = value.trim()
    if (!text || typing || showAuth) return
    setMessages((prev) => [...prev, { from: 'me', text }])
    setValue('')
    setName(text)
    playScript(text)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="screen">
      <div className="card card--plain">
        {/* Шапка */}
        <header className="reg-header">
          <div className="reg-header__left">
            <button className="back-btn" onClick={onBack} aria-label="Назад">
              <ChevronLeftIcon size={20} />
            </button>
            <Logo variant="dark" />
          </div>
          <LangSelector />
        </header>

        {/* Контент */}
        <section className="reg-body">
          <div className="reg-inner">
            <h2 className="reg-title">{t('reg.title')}</h2>
            <p className="reg-subtitle">{t('reg.subtitle')}</p>

            <div className="chat">
              <div className="chat__scroll" ref={listRef}>
                <div className="chat__author">
                  <img className="chat__avatar" src="/assets/dexter.png" alt={t('dexter.name')} />
                  <div>
                    <div className="chat__name">{t('dexter.name')}</div>
                    <div className="chat__role">{t('dexter.role')}</div>
                  </div>
                </div>

                <div className="chat__messages">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`bubble ${m.from === 'me' ? 'bubble--me' : 'bubble--dexter'}`}
                    >
                      {m.text}
                    </div>
                  ))}

                  {typing && (
                    <div className="bubble bubble--dexter bubble--typing" aria-label="Декстер печатает">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  )}
                </div>

                {/* Варианты входа появляются после диалога */}
                {showAuth && (
                  <div className="auth">
                    <button
                      className="auth-primary"
                      type="button"
                      onClick={() => onPhoneLogin?.(name)}
                    >
                      <PhoneChatIcon size={18} />
                      <span>{t('auth.phone')}</span>
                    </button>
                    <div className="auth-row">
                      <button className="auth-btn auth-btn--apple" type="button">
                        <AppleIcon size={17} />
                        <span>{t('auth.apple')}</span>
                      </button>
                      <button className="auth-btn auth-btn--google" type="button">
                        <GoogleIcon size={17} />
                        <span>{t('auth.google')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Поле ввода — пока идёт знакомство */}
              {!showAuth && (
                <div className="chat__input">
                  <input
                    type="text"
                    placeholder={t('chat.placeholder')}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={onKeyDown}
                  />
                  <button className="send-btn" onClick={send} disabled={typing}>
                    <SendIcon size={15} />
                    <span>{t('common.send')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
