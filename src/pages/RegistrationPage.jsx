import { useState, useRef, useEffect } from 'react'
import Logo from '../components/Logo.jsx'
import LangSelector from '../components/LangSelector.jsx'
import Footer from '../components/Footer.jsx'
import { ChevronLeftIcon, SendIcon } from '../components/icons.jsx'

export default function RegistrationPage({ onBack }) {
  const [messages, setMessages] = useState([
    { from: 'dexter', text: 'Привет! Как тебя зовут?' },
  ])
  const [value, setValue] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  function send() {
    const text = value.trim()
    if (!text) return
    setMessages((prev) => [...prev, { from: 'me', text }])
    setValue('')

    // Ответ Декстера с небольшой задержкой
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          from: 'dexter',
          text: `Приятно познакомиться, ${text}! Давай продолжим регистрацию 🎓`,
        },
      ])
    }, 700)
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
                </div>
              </div>

              <div className="chat__input">
                <input
                  type="text"
                  placeholder="Меня зовут ..."
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={onKeyDown}
                />
                <button className="send-btn" onClick={send}>
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
