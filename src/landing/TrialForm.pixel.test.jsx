// @vitest-environment jsdom
// Конверсия Lead в рекламном кабинете: ровно одна на настоящую заявку, до перехода в приложение.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import TrialForm from './TrialForm.jsx'
import { pickContent } from './content.js'

const f = pickContent('ru').trial.form
const icons = { person: '/p.svg', phone: '/ph.svg', arrow: '/a.svg' }

function fill(container) {
  fireEvent.change(container.querySelector('input[name="name"]'), { target: { value: 'Асель' } })
  const phone = container.querySelector('input[name="phone"]')
  fireEvent.focus(phone)
  fireEvent.change(phone, { target: { value: '+7 (747) 163-41-18' } })
}

function send(container) {
  fireEvent.submit(container.querySelector('form'))
}

let assign
let order

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  order = []
  assign = vi.fn(() => order.push('assign'))
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign, search: '' },
  })
  window.fbq = vi.fn(() => order.push('fbq'))
})

afterEach(() => {
  cleanup()
  delete window.fbq
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const answer = (body, status = 200) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: status < 400, status, json: async () => body })

describe('TrialForm — событие Lead', () => {
  it('настоящая заявка: Lead уходит один раз и раньше перехода в приложение', async () => {
    answer({ ok: true, redirect: 'https://ai-tutor.justtostudy.kz/?screen=register' })
    const { container } = render(<TrialForm f={f} lang="ru" privacyUrl="#" mascot="/m.webp" icons={icons} />)
    fill(container)
    send(container)

    await waitFor(() => expect(window.fbq).toHaveBeenCalledTimes(1))
    expect(window.fbq).toHaveBeenCalledWith('track', 'Lead', { content_name: 'trial_form' }, expect.objectContaining({ eventID: expect.any(String) }))
    expect(assign).not.toHaveBeenCalled() // переход ждёт, пока событие уйдёт

    await vi.advanceTimersByTimeAsync(300)
    expect(assign).toHaveBeenCalledWith('https://ai-tutor.justtostudy.kz/?screen=register')
    expect(order).toEqual(['fbq', 'assign'])
  })

  it('ловушка для ботов (ok без адреса перехода): Lead не уходит', async () => {
    answer({ ok: true })
    const { container } = render(<TrialForm f={f} lang="ru" privacyUrl="#" mascot="/m.webp" icons={icons} />)
    fill(container)
    send(container)

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(400)
    expect(window.fbq).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })

  it('ошибка отправки и лимит запросов: Lead не уходит', async () => {
    for (const status of [500, 429]) {
      cleanup()
      window.fbq.mockClear()
      answer({ ok: false }, status)
      const { container } = render(<TrialForm f={f} lang="ru" privacyUrl="#" mascot="/m.webp" icons={icons} />)
      fill(container)
      send(container)
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
      await vi.advanceTimersByTimeAsync(400)
      expect(window.fbq).not.toHaveBeenCalled()
    }
  })

  it('невалидная форма: заявки нет, Lead не уходит', async () => {
    const spy = answer({ ok: true, redirect: 'x' })
    const { container } = render(<TrialForm f={f} lang="ru" privacyUrl="#" mascot="/m.webp" icons={icons} />)
    send(container)
    await vi.advanceTimersByTimeAsync(400)
    expect(spy).not.toHaveBeenCalled()
    expect(window.fbq).not.toHaveBeenCalled()
  })

  it('без пикселя на странице (dev, чужой домен) переход в приложение сразу, без задержки', async () => {
    delete window.fbq
    answer({ ok: true, redirect: 'https://ai-tutor.justtostudy.kz/' })
    const { container } = render(<TrialForm f={f} lang="ru" privacyUrl="#" mascot="/m.webp" icons={icons} />)
    fill(container)
    send(container)

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://ai-tutor.justtostudy.kz/'))
  })
})
