// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// 👍/👎 под ответом Луны и журнал ответов (ТЗ 8.5, lib/assistant/ratingClient.js): что окно пишет и когда.
vi.mock('../lib/assistant/voiceQueue.js', () => ({
  createVoiceQueue: () => ({ say: () => {}, end: () => {}, stop: () => {} }),
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
    { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-assistant-model': 'claude-haiku-5-5' } },
  )
}

const WAIT = { timeout: 5000 }
const renderWidget = () =>
  render(
    <I18nProvider>
      <div className="scr-in">
        <p>Главная</p>
      </div>
      <AssistantWidget token="tok" screen="home" enabled />
    </I18nProvider>,
  )
const ask = (text) => {
  if (!screen.queryByRole('dialog')) fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } })
  fireEvent.submit(screen.getByRole('textbox').closest('form'))
}

describe('оценка ответов Луны', () => {
  let fetchMock
  let replies
  const ratings = () => fetchMock.mock.calls.filter(([u]) => u === '/api/assistant/rating').map(([, o]) => JSON.parse(o.body))
  beforeEach(() => {
    globalThis.__jtsRating = true
    localStorage.setItem('lang', 'ru')
    replies = []
    fetchMock = vi.fn(async (url) =>
      url === '/api/assistant/rating' ? new Response('{"saved":true}', { status: 200 }) : streamResponse(replies.shift() || ['Хорошо.']),
    )
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    delete globalThis.__jtsRating
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('дописанный ответ — строка журнала; 👎 с причиной и комментарием, затем 👍 — в ту же строку', async () => {
    replies.push(['Домашка — в «Уроках». Открыть?\n', '[[ASST_ACTION open lessons offer]]'])
    renderWidget()
    // Приветствие окна — строка без модели: оценивать нечего.
    fireEvent.click(screen.getByRole('button', { name: 'Помощник' }))
    expect(screen.queryByRole('button', { name: 'Полезный ответ' })).toBeNull()
    ask('где домашка')
    const up = await screen.findByRole('button', { name: 'Полезный ответ' }, WAIT)
    await waitFor(() => expect(ratings()).toHaveLength(1), WAIT)
    const [log] = ratings()
    expect(log).toMatchObject({ seq: 1, turn: 1, question: 'где домашка', answer: 'Домашка — в «Уроках». Открыть?\n', channel: 'text', model: 'claude-haiku-5-5', screen: 'home', lang: 'ru', rating: null, actions: ['open:lessons'], clicked: null })
    expect(log.firstMs).toBeGreaterThanOrEqual(0)
    expect(log.id).toMatch(/^r/)
    expect(log.chat).toMatch(/^c/)

    fireEvent.click(screen.getByRole('button', { name: 'Бесполезный ответ' }))
    await waitFor(() => expect(ratings()).toHaveLength(2), WAIT)
    expect(ratings()[1]).toMatchObject({ id: log.id, seq: 2, rating: 'down', reasons: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Неверно' }))
    fireEvent.click(screen.getByRole('button', { name: 'Не тот язык' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Свой комментарий (необязательно)' }), { target: { value: 'урока нет' } })
    fireEvent.click(screen.getByRole('button', { name: 'Готово' }))
    await waitFor(() => expect(ratings()).toHaveLength(3), WAIT)
    expect(ratings()[2]).toMatchObject({ seq: 3, rating: 'down', reasons: ['wrong', 'lang'], comment: 'урока нет' })
    expect(screen.getByText('Спасибо — команда посмотрит этот ответ.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Готово' })).toBeNull()

    fireEvent.click(up)
    await waitFor(() => expect(ratings()).toHaveLength(4), WAIT)
    expect(ratings()[3]).toMatchObject({ seq: 4, rating: 'up', reasons: [], comment: '' })
    expect(up.getAttribute('aria-pressed')).toBe('true')
    // Та же оценка ещё раз — ничего нового не шлём.
    fireEvent.click(up)
    expect(ratings()).toHaveLength(4)
  })

  it('кнопка под ответом — нажатие в строке этого ответа; «Новый чат» — новый разговор', async () => {
    replies.push(['Говорение — в Практике. Открыть?\n', '[[ASST_ACTION open practice-speaking offer]]'], ['Хорошо.'])
    renderWidget()
    ask('где говорение')
    fireEvent.click(await screen.findByRole('button', { name: /Открыть: Практика → Говорение/ }, WAIT))
    await waitFor(() => expect(ratings()).toHaveLength(2), WAIT)
    const [log, click] = ratings()
    expect(click).toMatchObject({ id: log.id, seq: 2, clicked: 'open:practice-speaking' })

    fireEvent.click(screen.getByRole('button', { name: 'Новый чат' }))
    ask('спасибо')
    await waitFor(() => expect(ratings()).toHaveLength(3), WAIT)
    const next = ratings()[2]
    expect(next.chat).not.toBe(log.chat)
    expect(next.turn).toBe(1)
    expect(next.id).not.toBe(log.id)
  })
})
