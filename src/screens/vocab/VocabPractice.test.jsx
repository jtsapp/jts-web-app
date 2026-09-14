// @vitest-environment jsdom
//
// Практика «Словаря» — «actual» модуля vocabulary_sr недельной сводки. Живьём
// без входа её не открыть (загрузчики экрана выходят по !token), поэтому врезку
// счётчика держит этот тест: пока экран смонтирован — время идёт, ушёл —
// пачка улетает с keepalive.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import VocabPractice from './VocabPractice.jsx'

const CARDS = [
  { en: 'apple', ru: 'яблоко' },
  { en: 'bread', ru: 'хлеб' },
  { en: 'water', ru: 'вода' },
]

describe('VocabPractice: счётчик времени', () => {
  let fetchMock

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-09-11T08:00:00Z') })
    fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  const activityCalls = () => fetchMock.mock.calls.filter(([url]) => url === '/api/profile/activity')

  function mount(token) {
    return render(
      <I18nProvider>
        <VocabPractice cards={CARDS} lang="ru" title="Урок 1" token={token} scopeId={null} onExit={() => {}} />
      </I18nProvider>,
    )
  }

  it('пока идёт практика — считает, при уходе досылает пачку vocabulary_sr', () => {
    const { unmount } = mount('TOK')
    window.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(30_000)
    expect(activityCalls()).toHaveLength(0) // до минуты пачка копится
    unmount()

    expect(activityCalls()).toHaveLength(1)
    const [, init] = activityCalls()[0]
    expect(init.keepalive).toBe(true)
    expect(init.headers.Authorization).toBe('Bearer TOK')
    expect(JSON.parse(init.body)).toEqual({ module: 'vocabulary_sr', seconds: 30 })
  })

  it('без токена ничего не шлёт', () => {
    const { unmount } = mount(null)
    vi.advanceTimersByTime(30_000)
    unmount()
    expect(activityCalls()).toHaveLength(0)
  })
})
