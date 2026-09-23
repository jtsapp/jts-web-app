import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { OPEN_EVENT, setAssistantAvailable } from '../lib/assistant/assistantBus.js'
import { AssistantError, askAssistant } from '../lib/assistant/client.js'
import { snapshotScreen } from '../lib/assistant/screenSnapshot.js'

// Помощник по сайту: плавающая кнопка и окно чата поверх любого экрана
// ученика. Где он показывается — решает App (lib/assistant/visibility.js).
//
// Смонтирован на уровне App, вне обёртки экрана с key, поэтому переходы между
// экранами разговор не сбрасывают: можно спросить на уроке, открыть «Практику»
// и продолжить. Разговор живёт только в памяти вкладки и сбрасывается при
// смене ученика — хранить его дольше незачем.
//
// Снимок экрана снимается в момент отправки вопроса из `.scr-in` — обёртки
// текущего экрана в App. Сам виджет лежит вне неё и в снимок не попадает
// (для надёжности ещё и помечен data-assistant-ignore).

const MAX_INPUT = 2000
const SCREEN_ROOT = '.scr-in'

// **жирный** и списки «- » — всё форматирование, которое разрешено помощнику
// (см. prompt.js). Текст идёт в React как текст, не как HTML.
function RichText({ text }) {
  const lines = text.split('\n')
  const blocks = []
  let list = null
  const inline = (line) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4
        ? <b key={i}>{part.slice(2, -2)}</b>
        : <Fragment key={i}>{part}</Fragment>,
    )
  lines.forEach((line, i) => {
    const item = /^\s*[-•]\s+(.*)$/.exec(line)
    if (item) {
      if (!list) {
        list = []
        blocks.push({ type: 'ul', items: list, key: i })
      }
      list.push(item[1])
      return
    }
    list = null
    if (line.trim()) blocks.push({ type: 'p', text: line, key: i })
  })
  return blocks.map((b) =>
    b.type === 'ul'
      ? <ul key={b.key}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>
      : <p key={b.key}>{inline(b.text)}</p>,
  )
}

// enabled=false — экран, где помощника быть не должно (экзамен, живой урок):
// окно закрывается и кнопка пропадает, но разговор остаётся и вернётся вместе
// с кнопкой на следующем обычном экране.
export default function AssistantWidget({ token, screen, enabled = true }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // {role, content}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null) // {text, retry: string|null}
  const abortRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  // Вопрос в пути. Отдельно от busy: два клика подряд успевают до перерисовки,
  // и по одному busy ушли бы два одинаковых вопроса.
  const inFlightRef = useRef(false)
  // Актуальные значения для send и обработчика события открытия: они живут
  // дольше одного рендера и иначе видели бы устаревший разговор.
  const stateRef = useRef(null)
  useEffect(() => {
    stateRef.current = { messages, screen, token, lang, enabled }
  })

  // Экран стал запрещённым — окно закрывается. Не эффектом, а при рендере: так
  // окно не успевает мелькнуть на экзамене ни на кадр.
  const [prevEnabled, setPrevEnabled] = useState(enabled)
  if (enabled !== prevEnabled) {
    setPrevEnabled(enabled)
    if (!enabled) setOpen(false)
  }

  // Другой ученик на том же устройстве не должен увидеть чужой разговор.
  const [prevToken, setPrevToken] = useState(token)
  if (token !== prevToken) {
    setPrevToken(token)
    setMessages([])
    setError(null)
    setBusy(false)
  }
  // Ответ, который ещё идёт прошлому ученику, обрываем.
  useEffect(() => () => abortRef.current?.abort(), [token])

  useEffect(() => {
    setAssistantAvailable(enabled)
  }, [enabled])

  useEffect(() => () => setAssistantAvailable(false), [])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, busy, error, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const send = useCallback(async (raw) => {
    const text = String(raw ?? '').trim().slice(0, MAX_INPUT)
    const cur = stateRef.current
    if (!text || !cur?.token || inFlightRef.current) return
    inFlightRef.current = true

    const history = [...cur.messages, { role: 'user', content: text }]
    setMessages([...history, { role: 'assistant', content: '' }])
    // Пары «вопрос не по теме — отказ» модели не нужны: они только удлиняют
    // каждый следующий запрос. На экране остаются, в запрос не идут.
    const toSend = history.filter((m) => !m.offtopic).map(({ role, content }) => ({ role, content }))
    setInput('')
    setError(null)
    setBusy(true)

    const controller = new AbortController()
    abortRef.current = controller
    const root = typeof document !== 'undefined' ? document.querySelector(SCREEN_ROOT) : null
    try {
      const reply = await askAssistant({
        token: cur.token,
        messages: toSend,
        screen: { id: cur.screen || null, text: snapshotScreen(root) },
        lang: cur.lang,
        signal: controller.signal,
        onDelta: (chunk) =>
          setMessages((prev) => {
            const next = prev.slice()
            const last = next[next.length - 1]
            next[next.length - 1] = { ...last, content: last.content + chunk }
            return next
          }),
      })
      if (reply.offtopic) {
        setMessages((prev) => {
          const next = prev.slice()
          next[next.length - 2] = { ...next[next.length - 2], offtopic: true }
          next[next.length - 1] = { ...next[next.length - 1], offtopic: true }
          return next
        })
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
      // Неудачный вопрос убираем из разговора вместе с недописанным ответом:
      // иначе полуответ ушёл бы в историю следующего вопроса как настоящий.
      setMessages(cur.messages)
      const kind = err instanceof AssistantError ? err.kind : 'unavailable'
      setError({
        text:
          kind === 'rate' || kind === 'cooldown'
            ? t(kind === 'rate' ? 'assistant.err.rate' : 'assistant.err.cooldown', {
                min: Math.max(1, Math.ceil((err.retryAfterSec || 60) / 60)),
              })
            : kind === 'auth'
              ? t('assistant.err.auth')
              : t('assistant.err.generic'),
        // Повтор сразу после паузы или лимита снова упрётся в них — кнопки нет.
        retry: kind === 'auth' || kind === 'cooldown' ? null : text,
      })
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        inFlightRef.current = false
        setBusy(false)
      }
    }
  }, [t])

  // Кнопка «Спросить помощника» из плеера урока: открыть окно и сразу задать
  // вопрос — снимок снимется с того же экрана, где ученик её нажал.
  useEffect(() => {
    const onOpen = (e) => {
      if (!stateRef.current?.enabled) return
      setOpen(true)
      const prompt = e.detail?.prompt
      if (prompt) send(prompt)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [send])

  const reset = () => {
    abortRef.current?.abort()
    abortRef.current = null
    inFlightRef.current = false
    setMessages([])
    setError(null)
    setBusy(false)
    inputRef.current?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(input)
    }
  }

  const suggestions = [
    t('assistant.suggest.plan'),
    t('assistant.suggest.whyWrong'),
    t('assistant.suggest.rule'),
    t('assistant.suggest.page'),
  ]
  const last = messages[messages.length - 1]
  const waitingFirstChunk = busy && last?.role === 'assistant' && !last.content

  if (!enabled) return null

  return (
    <div className="asst" data-assistant-ignore="">
      {open && (
        <div
          className="asst__panel"
          role="dialog"
          aria-label={t('assistant.title')}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <div className="asst__head">
            <img className="asst__avatar" src="/assets/dexter.png" alt="" width="36" height="36" />
            <div className="asst__who">
              <b>{t('assistant.title')}</b>
              <span>{t('assistant.sub')}</span>
            </div>
            {messages.length > 0 && (
              <button type="button" className="asst__ghost" onClick={reset}>
                {t('assistant.reset')}
              </button>
            )}
            <button type="button" className="asst__x" aria-label={t('assistant.close')} onClick={() => setOpen(false)}>
              ×
            </button>
          </div>

          <div className="asst__list" ref={listRef} data-selectable="" aria-live="polite">
            {messages.length === 0 && (
              <>
                <div className="asst__msg asst__msg--bot">
                  <p>{t('assistant.hello')}</p>
                </div>
                <div className="asst__chips">
                  {suggestions.map((s) => (
                    <button key={s} type="button" className="asst__chip" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            {messages.map((m, i) =>
              m.role === 'assistant' && !m.content ? null : (
                <div key={i} className={`asst__msg asst__msg--${m.role === 'user' ? 'me' : 'bot'}`}>
                  {m.role === 'user' ? <p>{m.content}</p> : <RichText text={m.content} />}
                </div>
              ),
            )}
            {waitingFirstChunk && (
              <div className="asst__msg asst__msg--bot asst__msg--typing">{t('assistant.thinking')}</div>
            )}
            {error && (
              <div className="asst__err" role="alert">
                <span>{error.text}</span>
                {error.retry && (
                  <button type="button" className="asst__ghost" onClick={() => send(error.retry)}>
                    {t('assistant.retry')}
                  </button>
                )}
              </div>
            )}
          </div>

          <form
            className="asst__form"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <textarea
              ref={inputRef}
              className="asst__input"
              rows={1}
              value={input}
              maxLength={MAX_INPUT}
              placeholder={t('assistant.placeholder')}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button type="submit" className="asst__send" disabled={busy || !input.trim()} aria-label={t('assistant.send')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <p className="asst__privacy">{t('assistant.privacy')}</p>
        </div>
      )}

      <button
        type="button"
        className={`asst__launcher${open ? ' is-open' : ''}`}
        aria-label={t('assistant.launcher')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <span className="asst__launcher-x">×</span> : <img src="/assets/dexter.png" alt="" width="40" height="40" />}
      </button>
    </div>
  )
}

