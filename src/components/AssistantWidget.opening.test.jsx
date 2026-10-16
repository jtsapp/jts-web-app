// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { NAVIGATE_EVENT } from '../lib/assistant/assistantBus.js'
import { OPENING_MARK } from '../lib/assistant/opening.js'

// Первая реплика Луны: открыл окно — она заговаривает сама (opening.js). Очередь
// озвучки подменена: звук тут не проверить, а что сказано — можно.
const queue = vi.hoisted(() => ({ said: [], stopped: 0 }))
// Фраза «звучит» сразу (onPhrase) — текст ответа виден, как только сказан.
vi.mock('../lib/assistant/voiceQueue.js', () => ({
  createVoiceQueue: (opts) => {
    let n = 0
    return {
      say: (t) => {
        queue.said.push(t)
        opts.onPhrase?.(n++)
      },
      end: () => {},
      stop: () => {
        queue.stopped++
      },
    }
  },
}))
const speech = vi.hoisted(() => ({ unlocks: 0 }))
vi.mock('../lib/speech.js', () => ({
  unlockSpeech: () => {
    speech.unlocks++
  },
  stopTts: () => {},
  playUrl: () => true,
}))

const { default: AssistantWidget } = await import('./AssistantWidget.jsx')

function streamResponse(chunks, status = 200) {
  const enc = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(c) {
        chunks.forEach((ch) => c.enqueue(enc.encode(ch)))
        c.close()
      },
    }),
    { status, headers: { 'content-type': 'text/plain; charset=utf-8' } },
  )
}

const WAIT = { timeout: 5000 }
const GREETING = 'Здравствуйте, Айгерім, вы на Главной, и у вас домашка «Unit 4». С неё и стоит начать. Открыть?'

function Harness({ screenId = 'home', text = 'Главная', greetOnOpen = true }) {
  return (
    <I18nProvider>
      <div className="scr-in">
        <p>{text}</p>
      </div>
      <AssistantWidget token="tok" screen={screenId} enabled greetOnOpen={greetOnOpen} />
    </I18nProvider>
  )
}

const launcher = () => screen.getByRole('button', { name: 'Помощник' })
const sentBody = (call) => JSON.parse(call[1].body)

describe('первая реплика Луны при открытии окна', () => {
  let fetchMock
  let navigations
  const onNavigate = (e) => navigations.push(e.detail.target)
  beforeEach(() => {
    localStorage.setItem('lang', 'ru')
    queue.said.length = 0
    queue.stopped = 0
    speech.unlocks = 0
    navigations = []
    window.addEventListener(NAVIGATE_EVENT, onNavigate)
    fetchMock = vi.fn(async () => streamResponse([`${GREETING}\n`, '[[ASST_ACTION open homework offer]]']))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    window.removeEventListener(NAVIGATE_EVENT, onNavigate)
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('открыл окно — Луна говорит первой: пометка вместо вопроса, голосом, со снимком экрана', async () => {
    render(<Harness />)
    fireEvent.click(launcher())
    // Жест — в самом нажатии: иначе iPhone не сыграет реплику, пришедшую через секунды.
    expect(speech.unlocks).toBeGreaterThan(0)
    expect(await screen.findByText(GREETING, {}, WAIT)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = sentBody(fetchMock.mock.calls[0])
    expect(body.messages).toStrictEqual([{ role: 'user', content: OPENING_MARK }])
    expect(body.voice).toBe(true)
    expect(body.screen).toMatchObject({ id: 'home' })
    expect(body.screen.text).toContain('Главная')
    // Пометку ученик не видит; вопросы-подсказки после реплики на месте — он сам ещё ничего не спросил.
    expect(screen.queryByText(OPENING_MARK)).toBeNull()
    expect(screen.getByRole('button', { name: 'Почему мой ответ неверный?' })).toBeTruthy()
    // Озвучено то, что написано.
    await waitFor(() => expect(queue.said.join(' ')).toContain('С неё и стоит начать'), WAIT)
  })

  it('предложение «Открыть?» — кнопка, а не переход: ученик ни о чём не просил', async () => {
    // Даже если модель сказала «открываю» — увести с экрана без согласия нельзя.
    fetchMock.mockImplementationOnce(async () => streamResponse(['Открываю домашку.\n', '[[ASST_ACTION open homework now]]']))
    render(<Harness />)
    fireEvent.click(launcher())
    const btn = await screen.findByRole('button', { name: /Открыть: Домашн/ }, WAIT)
    expect(navigations).toEqual([])
    fireEvent.click(btn)
    expect(navigations).toEqual(['homework'])
  })

  it('закрыл и открыл на том же экране — не повторяется', async () => {
    render(<Harness />)
    fireEvent.click(launcher())
    await screen.findByText(GREETING, {}, WAIT)
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }))
    fireEvent.click(launcher())
    expect(screen.getByText(GREETING)).toBeTruthy()
    await act(async () => {})
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('экран поменялся — новая реплика, с прошлой в истории', async () => {
    const { rerender } = render(<Harness />)
    fireEvent.click(launcher())
    await screen.findByText(GREETING, {}, WAIT)
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }))
    fetchMock.mockImplementationOnce(async () => streamResponse(['Вы в Словаре: 14 слов ждут повторения.']))
    rerender(<Harness screenId="vocab" text="Словарь. К повторению: 14 слов" />)
    fireEvent.click(launcher())
    await screen.findByText('Вы в Словаре: 14 слов ждут повторения.', {}, WAIT)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const { messages } = sentBody(fetchMock.mock.calls[1])
    expect(messages.map((m) => m.role)).toStrictEqual(['user', 'assistant', 'user'])
    expect(messages[0].content).toBe(OPENING_MARK)
    // Её «Открыть?» с меткой — чтобы «да» дальше знало, что предлагалось.
    expect(messages[1].content).toBe(`${GREETING}\n[[OPEN homework]]`)
    expect(messages[2].content).toBe(OPENING_MARK)
  })

  it('не вышло (лимит) — молча обычное приветствие, без плашки ошибки', async () => {
    fetchMock.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ error: 'rate_limited', retryAfterSec: 60 }), { status: 429 }),
    )
    render(<Harness />)
    fireEvent.click(launcher())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), WAIT)
    await act(async () => {})
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText(/Я Луна/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Дай план на неделю' })).toBeTruthy()
    // И на каждом следующем открытии лимит не дёргается заново.
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }))
    fireEvent.click(launcher())
    await act(async () => {})
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('звук выключен — реплика только текстом', async () => {
    localStorage.setItem('jts_assistant_voice_muted', '1')
    render(<Harness />)
    fireEvent.click(launcher())
    await screen.findByText(GREETING, {}, WAIT)
    expect(sentBody(fetchMock.mock.calls[0]).voice).toBe(false)
    expect(queue.said).toEqual([])
  })

  it('кнопка «Спросить помощника» с готовым вопросом — сразу вопрос, без первой реплики', async () => {
    fetchMock.mockImplementationOnce(async () => streamResponse(['Опечатка в слове.']))
    render(<Harness />)
    act(() => {
      window.dispatchEvent(new CustomEvent('jts:assistant-open', { detail: { prompt: 'Почему неверно?' } }))
    })
    await screen.findByText('Опечатка в слове.', {}, WAIT)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sentBody(fetchMock.mock.calls[0]).messages).toStrictEqual([{ role: 'user', content: 'Почему неверно?' }])
  })

  it('вопрос, заданный раньше, чем Луна договорила, обрывает реплику и уходит без неё', async () => {
    // Первая реплика «висит», пока её не оборвут.
    fetchMock.mockImplementationOnce(
      (url, init) =>
        new Promise((resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
        }),
    )
    fetchMock.mockImplementationOnce(async () => streamResponse(['План такой.']))
    render(<Harness />)
    fireEvent.click(launcher())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), WAIT)
    const box = screen.getByRole('textbox')
    fireEvent.change(box, { target: { value: 'дай план' } })
    // Кнопка не заперта первой репликой.
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))
    await screen.findByText('План такой.', {}, WAIT)
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
    expect(sentBody(fetchMock.mock.calls[1]).messages).toStrictEqual([{ role: 'user', content: 'дай план' }])
  })

  it('вопрос перебил реплику и сам не удался — в разговоре нет ни её куска, ни пометки', async () => {
    // Реплика успела написать полфразы и «висит».
    fetchMock.mockImplementationOnce((url, init) => {
      const enc = new TextEncoder()
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(enc.encode('Айгерім, вы на Главной'))
              init.signal.addEventListener('abort', () => c.error(Object.assign(new Error('aborted'), { name: 'AbortError' })))
            },
          }),
          { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } },
        ),
      )
    })
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ error: 'model_failed' }), { status: 502 }))
    render(<Harness />)
    fireEvent.click(launcher())
    // Полфразы ещё не прозвучали — на экране не они, а «Сейчас скажу…» (текст
    // идёт вслед за голосом).
    await screen.findByText('Сейчас скажу…', {}, WAIT)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'дай план' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))
    await screen.findByRole('alert', {}, WAIT)
    expect(screen.queryByText(/Айгерім, вы на/)).toBeNull()
    // Повтор уходит без оборванной реплики в истории.
    fetchMock.mockImplementationOnce(async () => streamResponse(['План такой.']))
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    await screen.findByText('План такой.', {}, WAIT)
    expect(sentBody(fetchMock.mock.calls[2]).messages).toStrictEqual([{ role: 'user', content: 'дай план' }])
  })

  it('ученик спросил — подсказки-вопросы уходят', async () => {
    render(<Harness />)
    fireEvent.click(launcher())
    await screen.findByText(GREETING, {}, WAIT)
    fetchMock.mockImplementationOnce(async () => streamResponse(['План такой.']))
    fireEvent.click(screen.getByRole('button', { name: 'Дай план на неделю' }))
    await screen.findByText('План такой.', {}, WAIT)
    expect(screen.queryByRole('button', { name: 'Почему мой ответ неверный?' })).toBeNull()
  })

  it('без greetOnOpen окно молчит до вопроса — как раньше', async () => {
    render(<Harness greetOnOpen={false} />)
    fireEvent.click(launcher())
    await act(async () => {})
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(/Я Луна/)).toBeTruthy()
  })
})
