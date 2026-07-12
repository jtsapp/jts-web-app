import { useState, useRef, useEffect } from 'react'
import Logo from '../components/Logo.jsx'
import LangSelector from '../components/LangSelector.jsx'
import Footer from '../components/Footer.jsx'
import { ChevronLeftIcon, SendIcon } from '../components/icons.jsx'

// Сценарий Декстера: реплики после того, как пользователь назвал имя.
// {name} подставляется автоматически. delay — сколько «печатать» перед показом.
const dexterScript = [
  { text: 'Приятно познакомиться, {name}', delay: 900 },
  {
    text:
      'Со мной ты действительно улучшишь свой английский — и получишь удовольствие от процесса. 💜',
    delay: 1600,
  },
  { text: 'Для начала подскажи, сколько тебе лет?', delay: 1300 },
]

export default function RegistrationPage({ onBack }) {
  const [messages, setMessages] = useState([
    { from: 'dexter', text: 'Привет! Как тебя зовут?' },
  ])
  const [typing, setTyping] = useState(false)
  const [value, setValue] = useState('')
  const [name, setName] = useState(null)
  const [step, setStep] = useState(0) // прогресс регистрации
  const listRef = useRef(null)
  const timers = useRef([])

  // Автоскролл вниз при новых сообщениях/индикаторе печати
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, typing])

  // Чистим таймеры при размонтировании
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function pushDexter(text) {
    setMessages((prev) => [...prev, { from: 'dexter', text }])
  }

  // Проигрывает сценарий: печатает -> сообщение -> печатает -> сообщение ...
  function playScript(userName) {
    let elapsed = 0
    dexterScript.forEach((line) => {
      // показать индикатор печати
      timers.current.push(
        setTimeout(() => setTyping(true), elapsed),
      )
      elapsed += line.delay
      // показать само сообщение и убрать индикатор
      timers.current.push(
        setTimeout(() => {
          setTyping(false)
          pushDexter(line.text.replace('{name}', userName))
        }, elapsed),
      )
      elapsed += 400 // пауза между репликами
    })
  }

  function send() {
    const text = value.trim()
    if (!text || typing) return
    setMessages((prev) => [...prev, { from: 'me', text }])
    setValue('')

    if (step === 0) {
      // Первый ответ — это имя, запускаем сценарий знакомства
      setName(text)
      setStep(1)
      playScript(text)
    } else {
      // Дальнейшие ответы — короткое подтверждение
      timers.current.push(setTimeout(() => setTyping(true), 200))
      timers.current.push(
        setTimeout(() => {
          setTyping(false)
          pushDexter(`Отлично${name ? ', ' + name : ''}! Идём дальше 🚀`)
        }, 1200),
      )
      setStep((s) => s + 1)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const placeholder = step === 0 ? 'Меня зовут ...' : 'Напишите ответ ...'

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
            <h2 className="reg-title">Регистрация</h2>
            <p className="reg-subtitle">
              Декстер пишет вам, отвечайте ему чтобы пройти регистрацию
            </p>

            <div className="chat">
              <div className="chat__scroll" ref={listRef}>
                <div className="chat__author">
                  <img className="chat__avatar" src="/assets/dexter.png" alt="Декстер" />
                  <div>
                    <div className="chat__name">Декстер</div>
                    <div className="chat__role">Путеводитель и тьютор</div>
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
              </div>

              <div className="chat__input">
                <input
                  type="text"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={onKeyDown}
                />
                <button className="send-btn" onClick={send} disabled={typing}>
                  <SendIcon size={15} />
                  <span>Отправить</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
