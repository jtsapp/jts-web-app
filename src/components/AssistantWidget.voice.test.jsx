// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// Голос в окне помощника. Запись (useVoiceQuestion) и очередь озвучки
// (voiceQueue) подменены: здесь проверяется, что окно делает с ними — когда
// включает озвучку, что шлёт в чат, когда замолкает. Сами они под своими
// тестами и e2e.
const voice = vi.hoisted(() => ({ props: null, state: 'idle', error: null, toggle: null, cancel: null }))
vi.mock('../lib/assistant/useVoiceQuestion.js', () => ({
  useVoiceQuestion: (props) => {
    voice.props = props
    return {
      supported: true,
      state: voice.state,
      elapsed: 3,
      error: voice.error,
      retryAfterSec: null,
      toggle: voice.toggle,
      cancel: voice.cancel,
      clearError: () => {},
    }
  },
}))
// autoStart — фраза «звучит» сразу, как сказана (onPhrase); без него звук
// начинается по команде теста (queue.opts.onPhrase).
const queue = vi.hoisted(() => ({ said: [], ended: false, stopped: 0, opts: null, autoStart: true }))
vi.mock('../lib/assistant/voiceQueue.js', () => ({
  createVoiceQueue: (opts) => {
    queue.opts = opts
    let n = 0
    return {
      say: (t) => {
        queue.said.push(t)
        if (queue.autoStart) opts.onPhrase?.(n++)
      },
      end: () => {
        queue.ended = true
      },
      stop: () => {
        queue.stopped++
      },
    }
  },
}))
const speech = vi.hoisted(() => ({ unlockSpeech: null }))
vi.mock('../lib/speech.js', () => ({
  unlockSpeech: (...a) => speech.unlockSpeech(...a),
  stopTts: () => {},
  playUrl: () => true,
}))

const { default: AssistantWidget } = await import('./AssistantWidget.jsx')
const { NAVIGATE_EVENT } = await import('../lib/assistant/assistantBus.js')

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
const ANSWER = ['Домашка лежит в разделе «Домашняя работа». ', 'Откройте её в меню слева.']
const renderWidget = (props = {}) =>
  render(
    <I18nProvider>
      <div className="scr-in">
        <p>Домашняя работа</p>
      </div>
      <AssistantWidget token="tok" screen="homework" enabled {...props} />
    </I18nProvider>,
  )
const openPanel = () => fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
const askByVoice = async (text = 'где моя домашка') => {
  await act(async () => {
    voice.props.onText(text)
  })
}

describe('голос в помощнике', () => {
  let fetchMock
  beforeEach(() => {
    localStorage.setItem('lang', 'ru')
    Object.assign(queue, { said: [], ended: false, stopped: 0, opts: null, autoStart: true })
    Object.assign(voice, { props: null, state: 'idle', error: null, toggle: vi.fn(), cancel: vi.fn() })
    speech.unlockSpeech = vi.fn()
    fetchMock = vi.fn(async () => streamResponse(ANSWER))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  // Живой прогон 15.10.2026: раздел открывался раньше, чем Луна заговорила.
  // Переход — когда она договорила «открываю».
  it('«открываю» голосом: раздел открывается, когда Луна договорила', async () => {
    const navigations = []
    const onNavigate = (e) => navigations.push(e.detail.target)
    window.addEventListener(NAVIGATE_EVENT, onNavigate)
    fetchMock.mockImplementationOnce(async () => streamResponse(['Открываю Словарь.\n', '[[ASST_ACTION open vocab now]]']))
    renderWidget()
    openPanel()
    await askByVoice('открой словарь')
    await waitFor(() => expect(queue.ended).toBe(true), WAIT)
    // Луна ещё говорит — перехода нет.
    await screen.findByText(/Открываю Словарь/, {}, WAIT)
    expect(navigations).toEqual([])

    act(() => queue.opts.onFinish({ played: 1, failed: 0 }))
    await waitFor(() => expect(navigations).toEqual(['vocab']), WAIT)
    window.removeEventListener(NAVIGATE_EVENT, onNavigate)
  })

  it('окно — Луна; микрофон разрешает звук в том же нажатии и включает запись', () => {
    renderWidget()
    openPanel()
    expect(screen.getByRole('dialog', { name: 'Луна' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Спросить голосом' }))
    expect(speech.unlockSpeech).toHaveBeenCalled()
    expect(voice.toggle).toHaveBeenCalled()
  })

  it('распознанный вопрос уходит с voice: true, а ответ звучит по фразам', async () => {
    renderWidget()
    openPanel()
    await askByVoice()
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.voice).toBe(true)
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'где моя домашка' })
    await waitFor(() => expect(queue.ended).toBe(true), WAIT)
    expect(queue.said).toEqual(['Домашка лежит в разделе «Домашняя работа».', 'Откройте её в меню слева.'])
    expect(queue.opts).toMatchObject({ token: 'tok', lang: 'ru' })
    expect(screen.getByRole('img', { name: 'Вопрос голосом' })).toBeTruthy()
  })

  it('набранный текстом вопрос — без voice и без озвучки', async () => {
    renderWidget()
    openPanel()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'где домашка' } })
    fireEvent.submit(input.closest('form'))
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).voice).toBe(false)
    expect(queue.opts).toBeNull()
  })

  it('«звук выкл» — ответ на голос приходит без озвучки, выбор запоминается', async () => {
    renderWidget()
    openPanel()
    await askByVoice()
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    fireEvent.click(screen.getByRole('button', { name: 'Выключить озвучку ответов' }))
    expect(localStorage.getItem('jts_assistant_voice_muted')).toBe('1')
    expect(screen.getByRole('button', { name: 'Включить озвучку ответов' })).toBeTruthy()
    queue.opts = null
    await askByVoice('а где словарь')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), WAIT)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).voice).toBe(true)
    expect(queue.opts).toBeNull()
  })

  it('выключенная раньше озвучка помнится после перезагрузки', async () => {
    localStorage.setItem('jts_assistant_voice_muted', '1')
    renderWidget()
    openPanel()
    await askByVoice()
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    expect(queue.opts).toBeNull()
  })

  it('печать останавливает озвучку, закрытие — и озвучку, и запись', async () => {
    renderWidget()
    openPanel()
    await askByVoice()
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'а' } })
    expect(queue.stopped).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }))
    expect(voice.cancel).toHaveBeenCalled()
  })

  it('во время записи вместо поля — «Слушаю» с таймером', () => {
    voice.state = 'recording'
    renderWidget()
    openPanel()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('Слушаю… 0:03')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Закончить вопрос' })).toBeTruthy()
  })

  it('«Повторить» после сбоя голосового вопроса — снова голосом', async () => {
    fetchMock.mockResolvedValueOnce(new Response('x', { status: 502 }))
    renderWidget()
    openPanel()
    await askByVoice()
    const retry = await screen.findByRole('button', { name: 'Повторить' }, WAIT)
    expect(queue.stopped).toBe(1)
    queue.opts = null
    fireEvent.click(retry)
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).voice).toBe(true)
    expect(queue.opts).not.toBeNull()
    expect(speech.unlockSpeech).toHaveBeenCalled()
  })

  it('пока идёт запись, подсказки неактивны — голосовой вопрос не потеряется', () => {
    voice.state = 'starting'
    renderWidget()
    openPanel()
    expect(screen.getByRole('button', { name: 'Дай план на неделю' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Спросить голосом' }).disabled).toBe(true)
  })

  it('«Спросить помощника» из урока отменяет недоговорённую запись', async () => {
    voice.state = 'recording'
    renderWidget()
    await act(async () => {
      window.dispatchEvent(new CustomEvent('jts:assistant-open', { detail: { prompt: 'Почему неверно?' } }))
    })
    expect(voice.cancel).toHaveBeenCalled()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), WAIT)
  })

  it('виджет снят (выход из аккаунта) — поздний распознанный вопрос не уходит', async () => {
    const view = renderWidget()
    openPanel()
    const onText = voice.props.onText
    view.unmount()
    await act(async () => onText('где домашка'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ошибка микрофона показывается текстом', () => {
    voice.error = 'not_heard'
    renderWidget()
    openPanel()
    expect(screen.getByRole('alert').textContent).toContain('Не расслышала')
  })

  it('ни одна фраза не зазвучала — тихая пометка под ответом', async () => {
    renderWidget()
    openPanel()
    await askByVoice()
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    await act(async () => queue.opts.onFinish({ played: 0, failed: 2 }))
    expect(screen.getByText('Не удалось озвучить ответ')).toBeTruthy()
  })

  // Живой прогон 15.10.2026: текст ответа стоял на экране за секунды до голоса.
  describe('текст вслед за голосом', () => {
    beforeEach(() => {
      queue.autoStart = false
    })

    it('пока голос готовится — «Сейчас скажу…», фраза появляется, когда зазвучала', async () => {
      renderWidget()
      openPanel()
      await askByVoice()
      await waitFor(() => expect(queue.ended).toBe(true), WAIT)
      expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Сейчас скажу…')
      expect(screen.queryByText(/Домашка лежит/)).toBeNull()

      act(() => queue.opts.onPhrase(0))
      expect(screen.getByText('Домашка лежит в разделе «Домашняя работа».')).toBeTruthy()
      expect(screen.queryByText(/Откройте её в меню слева/)).toBeNull()
      expect(screen.queryByRole('status')).toBeNull()

      act(() => queue.opts.onPhrase(1))
      expect(screen.getByText(/Откройте её в меню слева/)).toBeTruthy()
    })

    it('пока модель не ответила — «Думаю…»', async () => {
      fetchMock.mockImplementationOnce(() => new Promise(() => {}))
      renderWidget()
      openPanel()
      await askByVoice()
      expect((await screen.findByRole('status')).textContent).toBe('Думаю…')
    })

    it('голос оборвали (ученик начал печатать) — весь текст сразу', async () => {
      renderWidget()
      openPanel()
      await askByVoice()
      await waitFor(() => expect(queue.ended).toBe(true), WAIT)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'а' } })
      expect(screen.getByText(/Откройте её в меню слева/)).toBeTruthy()
    })

    it('чужой звук оборвал Луну — весь текст сразу', async () => {
      renderWidget()
      openPanel()
      await askByVoice()
      await waitFor(() => expect(queue.ended).toBe(true), WAIT)
      act(() => queue.opts.onInterrupt())
      expect(screen.getByText(/Откройте её в меню слева/)).toBeTruthy()
    })

    it('«открываю» — переход, когда Луна договорила, а не когда пришёл текст', async () => {
      const navigations = []
      const onNav = (e) => navigations.push(e.detail.target)
      window.addEventListener(NAVIGATE_EVENT, onNav)
      try {
        fetchMock.mockImplementationOnce(async () =>
          streamResponse(['Открываю Словарь, там слова по уровням.\n', '[[ASST_ACTION open vocab now]]']),
        )
        renderWidget()
        openPanel()
        await askByVoice('открой словарь')
        await waitFor(() => expect(queue.ended).toBe(true), WAIT)
        act(() => queue.opts.onPhrase(0))
        expect(navigations).toEqual([])
        // Кнопка под ответом — когда он сказан целиком.
        expect(screen.getByRole('button', { name: /Открыть: Словарь/ })).toBeTruthy()
        act(() => queue.opts.onFinish({ played: 1, failed: 0 }))
        expect(navigations).toEqual(['vocab'])
      } finally {
        window.removeEventListener(NAVIGATE_EVENT, onNav)
      }
    })

    it('закрыл окно, пока Луна говорит «открываю», — переход всё равно; «Новый чат» — отмена', async () => {
      const navigations = []
      const onNav = (e) => navigations.push(e.detail.target)
      window.addEventListener(NAVIGATE_EVENT, onNav)
      try {
        fetchMock.mockImplementation(async () =>
          streamResponse(['Открываю Словарь, там слова по уровням.\n', '[[ASST_ACTION open vocab now]]']),
        )
        renderWidget()
        openPanel()
        await askByVoice('открой словарь')
        await waitFor(() => expect(queue.ended).toBe(true), WAIT)
        fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }))
        expect(navigations).toEqual(['vocab'])

        openPanel()
        queue.ended = false
        await askByVoice('открой словарь')
        await waitFor(() => expect(queue.ended).toBe(true), WAIT)
        fireEvent.click(screen.getByRole('button', { name: 'Новый чат' }))
        expect(navigations).toEqual(['vocab'])
      } finally {
        window.removeEventListener(NAVIGATE_EVENT, onNav)
      }
    })
  })

  it('экран без помощника (экзамен) — замолчать и бросить запись', async () => {
    const view = renderWidget()
    openPanel()
    await askByVoice()
    await screen.findByText(/Откройте её в меню слева/, {}, WAIT)
    view.rerender(
      <I18nProvider>
        <AssistantWidget token="tok" screen="test" enabled={false} />
      </I18nProvider>,
    )
    expect(queue.stopped).toBeGreaterThan(0)
    expect(voice.cancel).toHaveBeenCalled()
  })
})
