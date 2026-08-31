// @vitest-environment jsdom
//
// Регрессия демо-лимитов: право на раздел спрашивалось один раз при
// монтировании (usePracticeEntitlement в useEffect), а «Ещё раз» на экране
// результата зовёт тот же startSession. Демо-аккаунт с лимитом заданий жал
// «Ещё раз» сколько угодно: лимит фактически мерил только первую сессию.
// Проверяем ровно это — ВТОРОЙ старт после исчерпания лимита, и порядок
// «прогресс в БД → потом вопрос о праве».

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

// LearningLayout тянет Sidebar (getBalance) и NotificationBell
// (getUnreadNotificationCount) — без заглушки эти сетевые вызовы валят экран
// (см. тот же приём в IeltsPage.test.jsx).
vi.mock('../api.js', () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
}))

import ListeningPage from './ListeningPage.jsx'

// Одно задание на сессию: очередь пустеет с первого верного ответа, и экран
// результата с кнопкой «Ещё раз» — это второй старт сессии.
const CONTENT = [
  {
    id: 'a1_001',
    type: 'listen_choice',
    audio: 'clip.mp3',
    explanation: 'Li живёт в Шанхае.',
    prompt: 'Where is Li now?',
    options: ['In Shanghai', 'In Beijing'],
    answer: 'In Shanghai',
  },
]

// Мини-модель сервера: completed растёт от отметок, ДОШЕДШИХ до
// /api/practice/state, — ровно как настоящий /api/practice/entitlement, который
// считает его по practice-стейту в БД. Поэтому тест заодно ловит порядок: если
// свежую проверку задать раньше, чем долетит отметка, лимит не сработает.
function mockServer({ limit, completed = 0, entitlementFails = false }) {
  const calls = []
  const base = completed
  const server = { completed }
  const fn = vi.fn(async (url, init = {}) => {
    const method = init.method || 'GET'
    const path = String(url).split('?')[0]
    calls.push(`${method} ${path}`)
    if (path.startsWith('/practice/listening/content/')) {
      return { ok: true, json: async () => CONTENT }
    }
    if (path === '/api/practice/state' && method === 'POST') {
      server.completed = base + JSON.parse(init.body).state.done.length
      return { ok: true, json: async () => ({ configured: true, ok: true }) }
    }
    if (path === '/api/practice/entitlement') {
      if (entitlementFails) throw new Error('network down')
      return {
        ok: true,
        json: async () => ({
          configured: true,
          allowed: limit == null || server.completed < limit,
          limit,
          completed: server.completed,
          source: 'DEMO',
          sourceName: null,
        }),
      }
    }
    return { ok: true, json: async () => ({ ok: true }) }
  })
  fn.calls = calls
  return fn
}

function renderPage() {
  render(
    <I18nProvider>
      <ListeningPage userLevel="a1" userName="Тест" token="TOK" isDemoAccount onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>,
  )
}

// Отказ демо-ученику (source: 'DEMO') с этого экрана — плашка про подписку
// (DemoSubscriptionModal), а не прежняя заглушка «Лимит достигнут»: она
// осталась за абонементом и подпиской. Тесты ниже про повторную проверку
// права, поэтому сверяют сам факт отказа — по его нынешнему заголовку.
const REFUSED = /Данная функция доступна по подписке/

// Проходит единственное задание сессии до экрана результата.
async function playSession() {
  fireEvent.click(await screen.findByText('Начать тренировку'))
  fireEvent.click(await screen.findByText('In Shanghai'))
  fireEvent.click(screen.getByText('Проверить'))
  fireEvent.click(await screen.findByText('Продолжить'))
  return screen.findByText('Попробовать ещё раз')
}

beforeEach(() => {
  localStorage.setItem('jts_access_token', 'TOK')
})

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('ListeningPage: лимит меряется на КАЖДОМ старте сессии', () => {
  it('«Ещё раз» после исчерпания лимита упирается в экран лимита', async () => {
    // Первый старт: 7 из 8 — пускаем. К «Ещё раз» задание засчитано, 8 из 8.
    const fetchMock = mockServer({ limit: 8, completed: 7 })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    fireEvent.click(await playSession())

    expect(await screen.findByText(REFUSED)).toBeTruthy()
    expect(screen.queryByText('In Shanghai')).toBeNull() // вторая сессия не началась
  })

  it('отметку о прохождении сервер получает РАНЬШЕ, чем вопрос о праве', async () => {
    const fetchMock = mockServer({ limit: 8, completed: 7 })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    fireEvent.click(await playSession())
    await screen.findByText(REFUSED)

    const push = fetchMock.calls.indexOf('POST /api/practice/state')
    const entitlementCalls = fetchMock.calls
      .map((c, i) => (c === 'GET /api/practice/entitlement' ? i : -1))
      .filter((i) => i >= 0)
    expect(push).toBeGreaterThan(-1) // отметка ушла на сервер
    expect(entitlementCalls.length).toBeGreaterThanOrEqual(2) // право спросили заново
    expect(push).toBeLessThan(entitlementCalls[entitlementCalls.length - 1])
  })

  it('сбой запроса о праве пускает в сессию (fail-open)', async () => {
    const fetchMock = mockServer({ limit: 8, completed: 0, entitlementFails: true })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    fireEvent.click(await screen.findByText('Начать тренировку'))

    expect(await screen.findByText('In Shanghai')).toBeTruthy()
    expect(screen.queryByText(REFUSED)).toBeNull()
  })

  it('ученику без лимита лишних запросов о праве не шлём', async () => {
    const fetchMock = mockServer({ limit: null })
    vi.stubGlobal('fetch', fetchMock)
    renderPage()

    fireEvent.click(await playSession())
    await waitFor(() => expect(screen.getByText('In Shanghai')).toBeTruthy()) // вторая сессия пошла

    const asked = fetchMock.calls.filter((c) => c === 'GET /api/practice/entitlement').length
    expect(asked).toBe(1) // только запрос при монтировании
  })
})
