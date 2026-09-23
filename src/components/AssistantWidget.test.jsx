// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import AssistantWidget from './AssistantWidget.jsx'
import AskAssistantButton from './AskAssistantButton.jsx'

// Ответ сервера кусками — как настоящий стрим.
function streamResponse(chunks, { status = 200, headers = {} } = {}) {
  const enc = new TextEncoder()
  const body = new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch))
      c.close()
    },
  })
  return new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...headers } })
}

const renderApp = ({ enabled = true, token = 'tok' } = {}) =>
  render(
    <I18nProvider>
      {/* Экран урока с проверенным заданием — то, что помощник должен «увидеть». */}
      <div className="scr-in">
        <h2>Turn the statement into a question:</h2>
        <p>Clare is reading.</p>
        <input className="is-wrong" defaultValue="Is Cleare reading?" aria-label="answer" />
        <p>Правильный ответ: is clare reading.</p>
        <AskAssistantButton />
      </div>
      <AssistantWidget token={token} screen="lesson-workspace" enabled={enabled} />
    </I18nProvider>,
  )

// Ответ идёт через стрим и несколько перерисовок. В полном прогоне (сотни
// файлов параллельно) секунды по умолчанию у findBy/waitFor не всегда хватает —
// тот же флак уже ронял CI на LiveLessonPage. Запас не замедляет зелёный тест:
// ожидание кончается, как только элемент появился.
const WAIT = { timeout: 5000 }

describe('помощник по сайту', () => {
  let fetchMock
  beforeEach(() => {
    localStorage.setItem('lang', 'ru')
    fetchMock = vi.fn(async () => streamResponse(['Опечатка: ', '«Cleare» → «Clare».']))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('открывается кнопкой и показывает приветствие с подсказками', () => {
    renderApp()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    expect(screen.getByRole('dialog', { name: 'Помощник JTS' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Почему мой ответ неверный?' })).toBeTruthy()
  })

  it('отправляет вопрос со снимком экрана и стримит ответ', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    fireEvent.change(screen.getByPlaceholderText('Спросите о сайте или задании…'), {
      target: { value: 'почему неверно?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))

    expect(await screen.findByText('Опечатка: «Cleare» → «Clare».', {}, WAIT)).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/assistant/chat')
    expect(init.headers.authorization).toBe('Bearer tok')
    const body = JSON.parse(init.body)
    expect(body.messages).toStrictEqual([{ role: 'user', content: 'почему неверно?' }])
    expect(body.lang).toBe('ru')
    expect(body.screen.id).toBe('lesson-workspace')
    expect(body.screen.text).toContain('Clare is reading.')
    expect(body.screen.text).toContain('ученик ввёл «Is Cleare reading?» (отмечено как неверное)')
    // Свой текст виджет в снимок не кладёт.
    expect(body.screen.text).not.toContain('Помощник JTS')
  })

  it('второй вопрос несёт историю разговора', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    fireEvent.click(screen.getByRole('button', { name: 'Почему мой ответ неверный?' }))
    await screen.findByText('Опечатка: «Cleare» → «Clare».', {}, WAIT)
    fireEvent.change(screen.getByPlaceholderText('Спросите о сайте или задании…'), { target: { value: 'а правило?' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Спросите о сайте или задании…'), { key: 'Enter' })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), WAIT)
    const body = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(body.messages.map((m) => m.role)).toStrictEqual(['user', 'assistant', 'user'])
    expect(body.messages[1].content).toBe('Опечатка: «Cleare» → «Clare».')
  })

  // Два открытия в одном тике (двойной тап по кнопке под ошибкой): события
  // идут мимо React, перерисовки между ними нет, и защита по одному busy
  // пропустила бы оба вопроса.
  it('два открытия подряд — один вопрос, а не два', async () => {
    renderApp()
    act(() => {
      window.dispatchEvent(new CustomEvent('jts:assistant-open', { detail: { prompt: 'почему?' } }))
      window.dispatchEvent(new CustomEvent('jts:assistant-open', { detail: { prompt: 'почему?' } }))
    })
    await screen.findByText('Опечатка: «Cleare» → «Clare».', {}, WAIT)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('кнопка под ошибкой открывает окно и сразу задаёт вопрос', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Спросить помощника, почему' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await screen.findByText('Опечатка: «Cleare» → «Clare».', {}, WAIT)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.messages[0].content).toBe('Почему мой ответ засчитан как неверный?')
  })

  it('на запрещённом экране нет ни окна, ни кнопки под ошибкой', () => {
    renderApp({ enabled: false })
    expect(screen.queryByRole('button', { name: 'Помощник' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Спросить помощника, почему' })).toBeNull()
    act(() => {
      window.dispatchEvent(new CustomEvent('jts:assistant-open', { detail: { prompt: 'x' } }))
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('лимит — понятное сообщение, а неудачный вопрос не остаётся в истории', async () => {
    fetchMock.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ error: 'rate_limited', retryAfterSec: 150 }), { status: 429 }),
    )
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    fireEvent.click(screen.getByRole('button', { name: 'Почему мой ответ неверный?' }))
    expect(await screen.findByRole('alert', {}, WAIT)).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('через 3 мин')

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    await screen.findByText('Опечатка: «Cleare» → «Clare».', {}, WAIT)
    const body = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(body.messages).toHaveLength(1)
  })

  it('отказ «не по теме» виден ученику, но в следующий запрос не идёт', async () => {
    const REFUSAL = 'Я помогаю только с английским и с сайтом JTS.'
    fetchMock.mockImplementationOnce(async () => streamResponse([REFUSAL], { headers: { 'x-assistant-offtopic': '1' } }))
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    const box = screen.getByPlaceholderText('Спросите о сайте или задании…')
    fireEvent.change(box, { target: { value: 'напиши сочинение по истории' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await screen.findByText(REFUSAL, {}, WAIT)

    fireEvent.change(box, { target: { value: 'почему неверно?' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), WAIT)
    const body = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(body.messages).toStrictEqual([{ role: 'user', content: 'почему неверно?' }])
    // На экране разговор целиком.
    expect(screen.getByText('напиши сочинение по истории')).toBeTruthy()
  })

  it('пауза после вопросов не по теме — своё сообщение и без «Повторить»', async () => {
    fetchMock.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ error: 'offtopic_cooldown', retryAfterSec: 1700 }), { status: 429 }),
    )
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    fireEvent.click(screen.getByRole('button', { name: 'Почему мой ответ неверный?' }))
    const alert = await screen.findByRole('alert', {}, WAIT)
    expect(alert.textContent).toContain('через 29 мин')
    expect(alert.textContent).toContain('не по теме')
    expect(screen.queryByRole('button', { name: 'Повторить' })).toBeNull()
  })

  it('разметка ответа: **жирный** и списки, без HTML', async () => {
    fetchMock.mockImplementationOnce(async () =>
      streamResponse(['**Порядок слов**\n- сначала is\n- потом <img src=x onerror=alert(1)>']),
    )
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    fireEvent.click(screen.getByRole('button', { name: 'Объясни правило этого задания' }))
    const bold = await screen.findByText('Порядок слов', {}, WAIT)
    expect(bold.tagName).toBe('B')
    const items = screen.getByRole('dialog').querySelectorAll('li')
    expect(items).toHaveLength(2)
    expect(items[1].textContent).toBe('потом <img src=x onerror=alert(1)>')
    expect(screen.getByRole('dialog').querySelector('img[src="x"]')).toBeNull()
  })

  it('смена ученика стирает разговор', async () => {
    const { rerender } = renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    fireEvent.click(screen.getByRole('button', { name: 'Почему мой ответ неверный?' }))
    await screen.findByText('Опечатка: «Cleare» → «Clare».', {}, WAIT)
    rerender(
      <I18nProvider>
        <div className="scr-in" />
        <AssistantWidget token="other" screen="home" />
      </I18nProvider>,
    )
    await waitFor(() => expect(screen.queryByText('Опечатка: «Cleare» → «Clare».')).toBeNull(), WAIT)
  })
})
