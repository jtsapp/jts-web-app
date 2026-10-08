// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import AssistantWidget from './AssistantWidget.jsx'
import { resetErrorLog } from '../lib/assistant/errorLog.js'

// Медленный раннер: отложенные (пассивные) эффекты React доезжают не сразу после коммита, а позже.
// Здесь они откладываются нарочно — с того момента, как тест поднимет `slow.on`. Эффект с обновлением
// «последнего разговора» (stateRef) обязан от этого не зависеть — иначе «Повторить», нажатая в этом
// окне, берёт разговор из прошлого рендера.
const slow = vi.hoisted(() => ({ on: false }))
vi.mock('react', async (importOriginal) => {
  const React = await importOriginal()
  return {
    ...React,
    // Подмена хука — не компонент: правила хуков к ней не относятся.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/rules-of-hooks
    useEffect: (effect, deps) =>
      React.useEffect(() => {
        if (!slow.on) return effect()
        let cleanup
        const timer = setTimeout(() => { cleanup = effect() }, 300)
        return () => {
          clearTimeout(timer)
          if (typeof cleanup === 'function') cleanup()
        }
      }, deps),
  }
})

const WAIT = { timeout: 5000 }

function streamResponse(chunks) {
  const enc = new TextEncoder()
  const body = new ReadableStream({
    start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch))
      c.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } })
}

describe('помощник по сайту — повтор после ошибки при медленных эффектах', () => {
  let fetchMock
  beforeEach(() => {
    localStorage.setItem('lang', 'ru')
    resetErrorLog()
    fetchMock = vi.fn(async () => streamResponse(['Опечатка: ', '«Cleare» → «Clare».']))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    slow.on = false
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  // Падало на медленном раннере GitLab (06.10, коммит 4049a1d4): «expected [...] to have a length of 1 but
  // got 3» — «Повторить» читала разговор прошлого рендера [вопрос, пустой ответ] и добавляла вопрос к нему.
  it('«Повторить» сразу после ошибки шлёт один вопрос, а не недописанный разговор прошлого рендера', async () => {
    fetchMock.mockImplementationOnce(async () => {
      // Рендер «вопрос + пустой ответ» успевает отработать эффекты как обычно; дальше — «медленный раннер»:
      // эффекты рендера с ошибкой откладываются, и в окне до них «Повторить» видит разговор прошлого рендера.
      await new Promise((resolve) => setTimeout(resolve, 40))
      slow.on = true
      return new Response(JSON.stringify({ error: 'rate_limited', retryAfterSec: 150 }), { status: 429 })
    })
    render(
      <I18nProvider>
        <AssistantWidget token="tok" screen="lesson-workspace" enabled />
      </I18nProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Помощник' }, WAIT))
    fireEvent.click(await screen.findByRole('button', { name: 'Почему мой ответ неверный?' }, WAIT))
    await screen.findByRole('alert', {}, WAIT)

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    await screen.findByText('Опечатка: «Cleare» → «Clare».', {}, WAIT)

    const body = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(body.messages).toHaveLength(1)
  })
})
