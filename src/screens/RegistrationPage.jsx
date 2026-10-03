import { useState, useRef, useEffect } from 'react'
import Logo from '../components/Logo.jsx'
import LangSelector from '../components/LangSelector.jsx'
import Footer from '../components/Footer.jsx'
import { ChevronLeftIcon, SendIcon, PhoneChatIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'

// Регистрация — только через номер: почту берёт следующий шаг (reg-email).
// Входа через Google здесь нет намеренно (решение владельца 04.10.2026): он
// заводил аккаунт вовсе без номера, а в макете номер обязателен. Google
// остался на экране входа (PasswordLoginPage).
export default function RegistrationPage({ onBack, onPhoneLogin, error }) {
  const { t } = useI18n()

  // Реплики Декстера после того, как пользователь назвал имя.
  // delay — сколько «печатать» перед показом. В стейте лежат i18n-ключи, а не
  // готовые строки: перевод происходит при рендере, поэтому смена языка
  // селектором в шапке мгновенно переводит и уже показанные реплики.
  // Четыре реплики — как в кадре 1434:5833; длинной про сказки и игры даём
  // «печатать» дольше остальных.
  const dexterScript = [
    { key: 'dexter.nice', delay: 900 },
    { key: 'dexter.features', delay: 1800 },
    { key: 'dexter.fun', delay: 1200 },
    { key: 'dexter.toReg', delay: 1300 },
  ]

  const [messages, setMessages] = useState([
    { from: 'dexter', key: 'dexter.greet' },
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

  function pushDexter(key) {
    setMessages((prev) => [...prev, { from: 'dexter', key }])
  }

  // Проигрывает сценарий: печатает -> сообщение -> ... -> показывает кнопки входа
  function playScript() {
    let elapsed = 0
    dexterScript.forEach((line, i) => {
      timers.current.push(setTimeout(() => setTyping(true), elapsed))
      elapsed += line.delay
      timers.current.push(
        setTimeout(() => {
          setTyping(false)
          pushDexter(line.key)
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
    // В поле ученик вводит только имя — «Меня зовут» стоит перед полем
    // неизменяемой приставкой (кадр 1434:6126), а пузырь показывает фразу
    // целиком. Храним ключ, а не готовую строку, — как у реплик Декстера.
    setMessages((prev) => [...prev, { from: 'me', key: 'chat.myName' }])
    setValue('')
    setName(text)
    playScript()
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
            <button className="back-btn" onClick={onBack} aria-label={t('common.back')}>
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
                      {t(m.key, { name })}
                    </div>
                  ))}

                  {typing && (
                    <div className="bubble bubble--dexter bubble--typing" aria-label={t('dexter.typing')}>
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  )}
                </div>

                {/* После диалога — одна кнопка: регистрация по номеру */}
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
                    {error && <div className="form-error">{error}</div>}
                  </div>
                )}
              </div>

              {/* Поле ввода — пока идёт знакомство */}
              {!showAuth && (
                <div className="chat__input">
                  <span className="chat__prefix">{t('chat.prefix')}</span>
                  <input
                    type="text"
                    aria-label={t('chat.prefix')}
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
