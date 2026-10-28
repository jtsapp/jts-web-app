// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { NAVIGATE_EVENT } from '../lib/assistant/assistantBus.js'

// Действия Луны: открыть раздел. Сам переход делает App; здесь проверяется, что
// окно просит и когда. Очередь озвучки подменена — звук тут не проверить, а что
// сказано — можно.
const queue = vi.hoisted(() => ({ said: [], stopped: 0 }))
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
vi.mock('../lib/speech.js', () => ({ unlockSpeech: () => {}, stopTts: () => {}, playUrl: () => true }))

const { default: AssistantWidget } = await import('./AssistantWidget.jsx')

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

const WAIT = { timeout: 5000 }
const renderWidget = (screenId = 'home') =>
  render(
    <I18nProvider>
      <div className="scr-in">
        <p>Главная</p>
      </div>
      <AssistantWidget token="tok" screen={screenId} enabled />
    </I18nProvider>,
  )
const ask = (text) => {
  fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } })
  fireEvent.submit(screen.getByRole('textbox').closest('form'))
}

describe('Луна открывает разделы', () => {
  let fetchMock
  let navigations
  const onNavigate = (e) => navigations.push(e.detail.target)
  beforeEach(() => {
    localStorage.setItem('lang', 'ru')
    queue.said.length = 0
    queue.stopped = 0
    navigations = []
    window.addEventListener(NAVIGATE_EVENT, onNavigate)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    window.removeEventListener(NAVIGATE_EVENT, onNavigate)
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('предложение — кнопка под ответом; переход только по нажатию', async () => {
    fetchMock.mockResolvedValueOnce(
      streamResponse(['Говорение — в Практике, вкладка «Говорение». Открыть?\n', '[[ASST_ACTION open practice-speaking offer]]']),
    )
    renderWidget()
    ask('где потренировать говорение')
    const btn = await screen.findByRole('button', { name: /Открыть: Практика → Говорение/ }, WAIT)
    expect(screen.queryByText(/ASST_ACTION/)).toBeNull()
    expect(navigations).toEqual([])
    fireEvent.click(btn)
    expect(navigations).toEqual(['practice-speaking'])
  })

  it('«да» — модель видит, что предлагала, и раздел открывается сам', async () => {
    fetchMock
      .mockResolvedValueOnce(streamResponse(['Это в Словаре. Открыть?\n[[ASST_ACTION open vocab offer]]']))
      .mockResolvedValueOnce(streamResponse(['Открываю Словарь.\n[[ASST_ACTION open vocab now]]']))
    renderWidget()
    ask('где слова')
    await screen.findByRole('button', { name: /Открыть: Словарь/ }, WAIT)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'да' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form'))
    await waitFor(() => expect(navigations).toEqual(['vocab']), WAIT)
    const sent = JSON.parse(fetchMock.mock.calls[1][1].body).messages
    expect(sent[1]).toEqual({ role: 'assistant', content: 'Это в Словаре. Открыть?\n[[OPEN vocab]]' })
  })

  it('ответ из одной метки получает подпись, а не пустой пузырь', async () => {
    fetchMock.mockResolvedValueOnce(streamResponse(['[[ASST_ACTION open lessons now]]']))
    renderWidget()
    ask('открой уроки')
    expect(await screen.findByText('Открываю: Уроки.', {}, WAIT)).toBeTruthy()
    expect(navigations).toEqual(['lessons'])
  })

  it('уже на этом экране — открывать нечего', async () => {
    fetchMock.mockResolvedValueOnce(streamResponse(['Вы уже здесь.\n[[ASST_ACTION open home now]]']))
    renderWidget('home')
    ask('открой главную')
    await screen.findByText(/Вы уже здесь/, {}, WAIT)
    await waitFor(() => expect(screen.getByRole('button', { name: /Открыть: Главная/ })).toBeTruthy(), WAIT)
    expect(navigations).toEqual([])
  })

  // Тур «от Луны» убран 28.10.2026: хвост тура (прежний сервер) — не действие.
  it('хвост тура — ни кнопки, ни перехода, ни тура', async () => {
    fetchMock.mockResolvedValueOnce(streamResponse(['Начинаю тур по Практике.\n[[ASST_ACTION tour practice now]]']))
    renderWidget('home')
    ask('проведи тур по практике')
    await screen.findByText(/Начинаю тур по Практике/, {}, WAIT)
    expect(screen.queryByText(/ASST_ACTION/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Тур:|Открыть: Практика/ })).toBeNull()
    expect(navigations).toEqual([])
  })
})

// Нажатия (21.10.2026): номер кнопки — из снимка вопроса, жмёт окно (clicker.js).
describe('Луна нажимает кнопку', () => {
  let fetchMock
  beforeEach(() => {
    localStorage.setItem('lang', 'ru')
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })
  const renderWithButton = (onClick) =>
    render(
      <I18nProvider>
        <div className="scr-in">
          <p>Урок</p>
          <button type="button" onClick={onClick}>Далее</button>
        </div>
        <AssistantWidget token="tok" screen="kingdom-interior" enabled />
      </I18nProvider>,
    )

  it('CLICK_NOW — нажимает сразу, номер был в снимке запроса', async () => {
    const onClick = vi.fn()
    fetchMock.mockResolvedValueOnce(streamResponse(['Нажимаю «Далее».', '[[ASST_ACTION click 1 now «Далее»]]']))
    renderWithButton(onClick)
    ask('перейди к следующему шагу')
    await waitFor(() => expect(onClick).toHaveBeenCalledOnce(), WAIT)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.screen.text).toContain('[кнопка #1 «Далее»]')
  })

  it('«дальше» — быстрая команда: нажатие на месте, без модели, и в модель эта пара не уходит', async () => {
    const onClick = vi.fn()
    renderWithButton(onClick)
    ask('дальше')
    expect(onClick).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText('Нажимаю «Далее».')).toBeTruthy()
    fetchMock.mockResolvedValueOnce(streamResponse(['Хорошо.']))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'спасибо' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce(), WAIT)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages).toEqual([{ role: 'user', content: 'спасибо' }])
  })

  it('CLICK — кнопка «Нажать» под ответом, нажатие только по ней', async () => {
    const onClick = vi.fn()
    fetchMock.mockResolvedValueOnce(streamResponse(['Можно перейти дальше. Нажать?', '[[ASST_ACTION click 1 offer «Далее»]]']))
    renderWithButton(onClick)
    ask('что дальше?')
    const btn = await screen.findByRole('button', { name: 'Нажать: «Далее»' }, WAIT)
    expect(onClick).not.toHaveBeenCalled()
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledOnce()
    // В истории следующего вопроса — её метка: на «да» модель знает, что предлагала.
    fetchMock.mockResolvedValueOnce(streamResponse(['Хорошо.']))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'спасибо' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), WAIT)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).messages[1].content).toBe('Можно перейти дальше. Нажать?\n[[CLICK 1]]')
  })

  it('кнопки уже нет — говорит об этом', async () => {
    fetchMock.mockResolvedValueOnce(streamResponse(['Нажимаю.', '[[ASST_ACTION click 1 now «Начать урок»]]']))
    renderWithButton(() => {})
    ask('нажми начать урок')
    expect(await screen.findByText(/Кнопки «Начать урок» на экране уже нет/, {}, WAIT)).toBeTruthy()
  })
})
