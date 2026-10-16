// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { NAVIGATE_EVENT } from '../lib/assistant/assistantBus.js'
import { cancelTourRequest, emitTourEnd, emitTourStep, tourRequestPending } from '../lib/tourBus.js'

// Действия Луны: открыть раздел и провести тур. Сам переход делает App, тур —
// экран; здесь проверяется, что окно просит и когда, и что читает вслух.
// Очередь озвучки подменена — звук тут не проверить, а что сказано — можно.
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
// Голос тура — свой модуль (предзагрузка следующего шага); здесь — что и когда сказано.
const tour = vi.hoisted(() => ({ said: [], prefetched: [], stopped: 0, disposed: 0 }))
vi.mock('../lib/assistant/tourVoice.js', async (importOriginal) => {
  const real = await importOriginal()
  return {
    ...real,
    createTourVoice: () => ({
      say: (phrases) => tour.said.push(phrases.join(' ')),
      prefetch: (phrases) => tour.prefetched.push(...(phrases || [])),
      stop: () => {
        tour.stopped++
      },
      dispose: () => {
        tour.disposed++
      },
    }),
  }
})

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

describe('Луна открывает разделы и водит по ним', () => {
  let fetchMock
  let navigations
  const onNavigate = (e) => navigations.push(e.detail.target)
  beforeEach(() => {
    localStorage.setItem('lang', 'ru')
    queue.said.length = 0
    queue.stopped = 0
    tour.said.length = 0
    tour.prefetched.length = 0
    tour.stopped = 0
    tour.disposed = 0
    navigations = []
    window.addEventListener(NAVIGATE_EVENT, onNavigate)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    window.removeEventListener(NAVIGATE_EVENT, onNavigate)
    cancelTourRequest()
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

  it('тур: окно уступает экран, экран просят открыть тур, шаги Луна читает вслух', async () => {
    fetchMock.mockResolvedValueOnce(streamResponse(['Начинаю тур по главной.\n[[ASST_ACTION tour home now]]']))
    renderWidget('home')
    ask('как тут всё устроено')
    await waitFor(() => expect(tourRequestPending()).toBe(true), WAIT)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(navigations).toEqual([])

    const step0 = { index: 0, total: 3, title: 'Ваш уровень', text: 'Здесь текущий уровень и цель.', next: { title: 'Расписание', text: 'Ближайшие занятия.' } }
    act(() => emitTourStep(step0))
    expect(tour.said).toEqual(['Ваш уровень. Здесь текущий уровень и цель.'])
    // Следующий шаг синтезируется заранее — по «Далее» Луна заговорит сразу.
    expect(tour.prefetched).toEqual(expect.arrayContaining(['Расписание.', 'Ближайшие занятия.']))
    // Тот же шаг ещё раз (перерисовка) — не повторяем.
    act(() => emitTourStep(step0))
    expect(tour.said).toHaveLength(1)

    act(() => emitTourEnd())
    expect(tour.disposed).toBeGreaterThan(0)
    act(() => emitTourStep({ index: 1, total: 3, title: 'Расписание', text: 'Ближайшие занятия.' }))
    expect(tour.said).toHaveLength(1)
  })

  it('тур в другом разделе: сначала переход, заявка — когда экран доехал', async () => {
    fetchMock.mockResolvedValueOnce(streamResponse(['Провести тур по Практике?\n[[ASST_ACTION tour practice offer]]']))
    const view = renderWidget('home')
    ask('покажи практику')
    fireEvent.click(await screen.findByRole('button', { name: /Тур: Практика/ }, WAIT))
    expect(navigations).toEqual(['practice'])
    expect(tourRequestPending()).toBe(false)
    view.rerender(
      <I18nProvider>
        <div className="scr-in" />
        <AssistantWidget token="tok" screen="practice" enabled />
      </I18nProvider>,
    )
    expect(tourRequestPending()).toBe(true)
  })

  it('без звука тур идёт молча', async () => {
    localStorage.setItem('jts_assistant_voice_muted', '1')
    fetchMock.mockResolvedValueOnce(streamResponse(['Начинаю.\n[[ASST_ACTION tour home now]]']))
    renderWidget('home')
    ask('проведи тур')
    await waitFor(() => expect(tourRequestPending()).toBe(true), WAIT)
    act(() => emitTourStep({ index: 0, total: 2, title: 'Ваш уровень', text: 'Текст.' }))
    expect(tour.said).toEqual([])
    expect(tour.prefetched).toEqual([])
  })
})
