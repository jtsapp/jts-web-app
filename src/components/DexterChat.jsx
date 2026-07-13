import { useState, useRef, useEffect } from 'react'
import { useI18n } from '../i18n.jsx'

// Проигрывает сценарий реплик Декстера с индикатором «печатает…»,
// после последней реплики показывает footer (например, кнопки).
export default function DexterChat({ script, footer }) {
  const { t } = useI18n()
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [done, setDone] = useState(false)
  const listRef = useRef(null)
  const timers = useRef([])

  useEffect(() => {
    let elapsed = 0
    script.forEach((line, i) => {
      timers.current.push(setTimeout(() => setTyping(true), elapsed))
      elapsed += line.delay
      timers.current.push(
        setTimeout(() => {
          setTyping(false)
          setMessages((prev) => [...prev, line.text])
        }, elapsed),
      )
      elapsed += 400
      if (i === script.length - 1) {
        timers.current.push(setTimeout(() => setDone(true), elapsed + 200))
      }
    })
    const t = timers.current
    return () => t.forEach(clearTimeout)
    // сценарий фиксирован на маунте
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, typing, done])

  return (
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
          {messages.map((t, i) => (
            <div key={i} className="bubble bubble--dexter">
              {t}
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

        {done && footer}
      </div>
    </div>
  )
}
