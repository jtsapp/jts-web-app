// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { NAVIGATE_EVENT } from '../lib/assistant/assistantBus.js'
import { OPENING_MARK } from '../lib/assistant/opening.js'

// Звонок Луне в окне помощника. Комната LiveKit (AssistantCall) подменена: тест
// играет за агента — задаёт вопросы (onAsk), сообщает состояние (onState) — и
// проверяет, что окно отвечает тем же чат-роутом и отдаёт ответ фразами.
const room = vi.hoisted(() => ({ props: null, ctl: null }))
vi.mock('./AssistantCall.jsx', () => ({
  default: (props) => {
    room.props = props
    props.controlRef.current = room.ctl
    return null
  },
}))
vi.mock('../lib/speech.js', () => ({ unlockSpeech: () => {}, stopTts: () => {}, playUrl: () => true }))

const { default: AssistantWidget } = await import('./AssistantWidget.jsx')

const WAIT = { timeout: 5000 }
const ROOM = 'jts-luna-abc123-1760600000000'

function streamResponse(chunks) {
  const enc = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(c) {
        chunks.forEach((ch) => c.enqueue(enc.encode(ch)))
        c.close()
      },
    }),
    { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } },
  )
}

// Без первой реплики при открытии окна: звонок здесь начинается в пустом окне
// (кроме теста, где разговор уже идёт).
function Harness({ greetOnOpen = false }) {
  return (
    <I18nProvider>
      <div className="scr-in">
        <p>Главная. Домашка: Unit 4</p>
      </div>
      <AssistantWidget token="tok" screen="home" enabled greetOnOpen={greetOnOpen} />
    </I18nProvider>
  )
}

const sender = () => {
  const s = { phrases: [], ended: 0, silent: null, t: null }
  s.timing = (t) => {
    s.t = t
  }
  s.phrase = (t) => s.phrases.push(t)
  s.end = ({ silent = false } = {}) => {
    s.ended += 1
    s.silent = silent
  }
  return s
}

describe('звонок Луне', () => {
  let chatReplies
  let fetchMock
  let navigations
  const onNavigate = (e) => navigations.push(e.detail.target)

  beforeEach(() => {
    localStorage.setItem('lang', 'ru')
    room.props = null
    room.ctl = { hangUp: vi.fn(() => room.props.onEnded('disconnected')), toggleMic: vi.fn(), say: vi.fn(async () => {}), startAudio: vi.fn() }
    navigations = []
    window.addEventListener(NAVIGATE_EVENT, onNavigate)
    chatReplies = []
    fetchMock = vi.fn(async (url) => {
      if (url === '/api/assistant/call') {
        return Response.json({ configured: true, token: 'lk', url: 'wss://x', room: ROOM, identity: 'student-1', ttl: 900, limitSec: 900 })
      }
      return streamResponse(chatReplies.shift() || ['Хорошо.'])
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop() {} }] })) },
    })
  })
  afterEach(() => {
    window.removeEventListener(NAVIGATE_EVENT, onNavigate)
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  const chatBodies = () => fetchMock.mock.calls.filter(([u]) => u === '/api/assistant/chat').map(([, o]) => JSON.parse(o.body))

  async function startCall(props = {}) {
    render(<Harness {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Позвонить Луне' }))
    await waitFor(() => expect(room.props).not.toBeNull(), WAIT)
    act(() => room.props.onState({ agentState: 'listening', micOn: true, audioBlocked: false, userText: '' }))
  }

  it('кнопка «Позвонить»: микрофон, токен звонка, полоса звонка вместо поля ввода', async () => {
    await startCall()
    const [, opts] = fetchMock.mock.calls.find(([u]) => u === '/api/assistant/call')
    expect(opts.headers.authorization).toBe('Bearer tok')
    expect(JSON.parse(opts.body)).toEqual({ lang: 'ru' })
    expect(room.props.session.room).toBe(ROOM)
    expect(screen.getByRole('group', { name: 'Звонок Луне' })).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('Слушаю')).toBeTruthy()
  })

  it('агент открыл звонок — первая реплика с пометкой, голосом и комнатой звонка; фразы уходят агенту', async () => {
    chatReplies.push(['Айгерім, вы на Главной. ', 'У вас домашка «Unit 4», с неё и начнём.'])
    await startCall()
    const s = sender()
    await act(async () => room.props.onAsk({ id: '1', text: '', opening: true, sender: s }))
    await waitFor(() => expect(s.ended).toBe(1), WAIT)
    const body = chatBodies()[0]
    expect(body.messages).toStrictEqual([{ role: 'user', content: OPENING_MARK }])
    expect(body.voice).toBe(true)
    expect(body.call).toBe(ROOM)
    expect(body.screen.text).toContain('Unit 4')
    expect(s.phrases.join(' ')).toContain('с неё и начнём')
    expect(await screen.findByText(/с неё и начнём/)).toBeTruthy()
  })

  it('«открой словарь» в звонке — переход, когда Луна договорила, а не сразу', async () => {
    chatReplies.push(['Открываю Словарь.\n', '[[ASST_ACTION open vocab now]]'])
    await startCall()
    const s = sender()
    await act(async () => room.props.onAsk({ id: '2', text: 'открой словарь', opening: false, sender: s }))
    await waitFor(() => expect(s.ended).toBe(1), WAIT)
    expect(chatBodies()[0].messages.at(-1)).toEqual({ role: 'user', content: 'открой словарь' })
    expect(screen.getByText('открой словарь')).toBeTruthy()
    expect(navigations).toEqual([])
    act(() => room.props.onState({ agentState: 'speaking' }))
    expect(navigations).toEqual([])
    act(() => room.props.onState({ agentState: 'listening' }))
    expect(navigations).toEqual(['vocab'])
  })

  it('агент передумал (ученик перебил) — ответ обрывается, фраз больше нет', async () => {
    let release
    await startCall()
    fetchMock.mockImplementationOnce(
      (url, opts) =>
        new Promise((resolve, reject) => {
          release = resolve
          opts.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
        }),
    )
    const s = sender()
    act(() => {
      room.props.onAsk({ id: '3', text: 'расскажи про практику', opening: false, sender: s })
    })
    await waitFor(() => expect(chatBodies()).toHaveLength(1), WAIT)
    act(() => room.props.onCancel('3'))
    await waitFor(() => expect(s.ended).toBe(1), WAIT)
    expect(s.phrases).toEqual([])
    expect(s.silent).toBe(true)
    expect(release).toBeTypeOf('function')
  })

  it('черновой ход (pending): ответ готовится сразу, а в окне появляется только по commit', async () => {
    chatReplies.push(['Словарь — в меню слева. ', 'Нажмите «Словарь».'])
    await startCall()
    const s = sender()
    await act(async () => room.props.onAsk({ id: '11', text: 'как открыть словарь', opening: false, pending: true, sender: s }))
    await waitFor(() => expect(s.ended).toBe(1), WAIT)
    // Модель спросили и фразы агенту отдали — он придержит их до своего решения...
    expect(chatBodies()).toHaveLength(1)
    expect(s.phrases.join(' ')).toContain('Словарь — в меню слева.')
    expect(s.t).toMatchObject({ pending: true })
    expect(s.t.phrase).toBeTypeOf('number')
    // ...а в переписке хода ещё нет.
    expect(screen.queryByText('как открыть словарь')).toBeNull()
    expect(screen.queryByText(/в меню слева/)).toBeNull()
    act(() => room.props.onCommit('11'))
    expect(await screen.findByText('как открыть словарь', {}, WAIT)).toBeTruthy()
    expect(screen.getByText(/Словарь — в меню слева\. Нажмите «Словарь»\./)).toBeTruthy()
  })

  it('черновик подтвердили после неудачного ответа — строка «не вышло» в окне, «Думаю…» не висит', async () => {
    fetchMock.mockImplementation(async (url) =>
      url === '/api/assistant/call'
        ? Response.json({ configured: true, token: 'lk', url: 'wss://x', room: ROOM, identity: 's', ttl: 900 })
        : new Response('{}', { status: 502 }),
    )
    await startCall()
    const s = sender()
    await act(async () => room.props.onAsk({ id: '14', text: 'где домашка', opening: false, pending: true, sender: s }))
    await waitFor(() => expect(s.ended).toBe(1), WAIT)
    act(() => room.props.onCommit('14'))
    expect(await screen.findByText('где домашка', {}, WAIT)).toBeTruthy()
    expect(document.querySelector('.asst__status')).toBeNull()
  })

  it('черновик выброшен (cancel с drop) — ни вопроса, ни ответа в окне, и в историю он не идёт', async () => {
    let release
    fetchMock.mockImplementation(async (url, opts) =>
      url === '/api/assistant/call'
        ? Response.json({ configured: true, token: 'lk', url: 'wss://x', room: ROOM, identity: 's', ttl: 900 })
        : new Promise((resolve, reject) => {
            release = () => resolve(streamResponse(['Ответ на обрывок.']))
            opts.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
          }),
    )
    await startCall()
    const s1 = sender()
    act(() => {
      room.props.onAsk({ id: '12', text: 'как открыть', opening: false, pending: true, sender: s1 })
    })
    await waitFor(() => expect(chatBodies()).toHaveLength(1), WAIT)
    act(() => room.props.onCancel('12', { drop: true }))
    await waitFor(() => expect(s1.ended).toBe(1), WAIT)
    expect(s1.silent).toBe(true)
    expect(release).toBeTypeOf('function')
    act(() => room.props.onCommit('12')) // поздний commit выброшенного — ничего
    expect(screen.queryByText('как открыть')).toBeNull()
    // Окончательный вопрос: история без обрывка.
    fetchMock.mockImplementation(async () => streamResponse(['Словарь в меню.']))
    const s2 = sender()
    await act(async () => room.props.onAsk({ id: '13', text: 'как открыть словарь', opening: false, sender: s2 }))
    await waitFor(() => expect(s2.ended).toBe(1), WAIT)
    const last = chatBodies().at(-1)
    expect(last.messages.filter((m) => m.role === 'user').map((m) => m.content)).toEqual(['как открыть словарь'])
    expect(await screen.findByText('Словарь в меню.', {}, WAIT)).toBeTruthy()
  })

  it('разговор в окне уже идёт — в начале звонка Луна только говорит, что на связи, без запроса к модели', async () => {
    chatReplies.push(['Вы на Главной, начните с домашки.'])
    // Озвучка чата выключена: текст первой реплики виден сразу, без ожидания голоса.
    localStorage.setItem('jts_assistant_voice_muted', '1')
    render(<Harness greetOnOpen />)
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    expect(await screen.findByText('Вы на Главной, начните с домашки.', {}, WAIT)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Позвонить Луне' }))
    await waitFor(() => expect(room.props).not.toBeNull(), WAIT)
    const s = sender()
    await act(async () => room.props.onAsk({ id: '9', text: '', opening: true, sender: s }))
    expect(s.phrases).toEqual(['Я на связи — слушаю вас.'])
    expect(s.ended).toBe(1)
    expect(chatBodies()).toHaveLength(1)
  })

  it('«Новый чат» посреди звонка: ответ снят тихо, Луна замолкает, обещанный переход не случается', async () => {
    chatReplies.push(['Открываю Словарь.\n', '[[ASST_ACTION open vocab now]]'])
    await startCall()
    const s1 = sender()
    await act(async () => room.props.onAsk({ id: '5', text: 'открой словарь', opening: false, sender: s1 }))
    await waitFor(() => expect(s1.ended).toBe(1), WAIT)
    act(() => room.props.onState({ agentState: 'speaking' }))
    fireEvent.click(screen.getByRole('button', { name: 'Новый чат' }))
    act(() => room.props.onState({ agentState: 'listening' }))
    expect(navigations).toEqual([])
  })

  it('первая реплика не удалась — Луна всё равно отзывается в звонке', async () => {
    fetchMock.mockImplementation(async (url) =>
      url === '/api/assistant/call'
        ? Response.json({ configured: true, token: 'lk', url: 'wss://x', room: ROOM, identity: 's', ttl: 900 })
        : new Response('{}', { status: 502 }),
    )
    await startCall()
    const s = sender()
    await act(async () => room.props.onAsk({ id: '6', text: '', opening: true, sender: s }))
    await waitFor(() => expect(s.ended).toBe(1), WAIT)
    expect(s.phrases).toEqual(['Я на связи — слушаю вас.'])
  })

  it('звонок уже идёт в другой вкладке — 409 и понятная строка', async () => {
    fetchMock.mockImplementation(async (url) =>
      url === '/api/assistant/call' ? Response.json({ error: 'call_busy' }, { status: 409 }) : streamResponse(['ok']),
    )
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Позвонить Луне' }))
    expect(await screen.findByText(/Звонок уже идёт/, {}, WAIT)).toBeTruthy()
    expect(room.props).toBeNull()
  })

  it('лимит на сегодня — понятная строка, звонка нет', async () => {
    fetchMock.mockImplementation(async (url) =>
      url === '/api/assistant/call'
        ? Response.json({ configured: true, limited: true, error: 'daily_limit', limitSec: 900 }, { status: 403 })
        : streamResponse(['ok']),
    )
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Позвонить Луне' }))
    expect(await screen.findByText(/Минуты звонка на сегодня закончились \(15 мин в день\)/, {}, WAIT)).toBeTruthy()
    expect(room.props).toBeNull()
  })

  it('«Завершить» — трубка положена, снова поле ввода; окно закрыто посреди звонка — звонок идёт', async () => {
    await startCall()
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }))
    expect(screen.getByRole('button', { name: 'Помощник' }).className).toContain('is-call')
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    fireEvent.click(screen.getByRole('button', { name: 'Завершить звонок' }))
    expect(room.ctl.hangUp).toHaveBeenCalled()
    expect(await screen.findByRole('textbox')).toBeTruthy()
    // Трубку положил сам ученик — строки «звонок завершён» нет.
    expect(screen.queryByText('Звонок завершён.')).toBeNull()
    // Повторное «отключено» от снимающейся комнаты — не новый конец звонка.
    act(() => room.props.onEnded('disconnected'))
    expect(screen.queryByText('Звонок завершён.')).toBeNull()
  })

  it('звонок кончился сам (лимит, связь) — строка «звонок завершён»', async () => {
    await startCall()
    act(() => room.props.onEnded('disconnected'))
    expect(await screen.findByText('Звонок завершён.')).toBeTruthy()
  })
})
