// @vitest-environment jsdom
// Что помощник по сайту узнаёт про задание «Аудирования» из снимка экрана. Эталон (data-assistant-expected на плашке
// разбора) — только после неверного ответа: до проверки помощник даёт лишь подсказку, после верного показывать нечего.
// Задание после первой ошибки возвращается в конце очереди, но ответ разбор уже показал ученику сам.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import { snapshotScreen } from '../lib/assistant/screenSnapshot.js'
import { expectedAnswer } from '../practice/listening/engine.js'

vi.mock('../api.js', () => ({
  markPracticeUnitDone: vi.fn(async () => ({ counted: 0, alreadyDone: 0 })),
  getUnreadNotificationCount: vi.fn(async () => 0),
  getBalance: vi.fn(async () => ({ coins: 0, streak: 0, streakActiveToday: false })),
  getDemoAccess: vi.fn(async () => ({ isDemo: false, expiresAt: null })),
  getSatMeCached: vi.fn(async () => null),
  getIeltsMe: vi.fn(async () => ({ ieltsAccount: false })),
}))

import ListeningPage from './ListeningPage.jsx'

const CHOICE = {
  id: 'a1_001',
  type: 'listen_choice',
  audio: 'clip.mp3',
  explanation: 'Li живёт в Шанхае.',
  prompt: 'Where is Li now?',
  options: ['In Shanghai', 'In Beijing'],
  answer: 'In Shanghai',
}
const ASSEMBLE = {
  id: 'a1_007',
  type: 'listen_assemble',
  audio: 'clip.mp3',
  explanation: 'Сначала отрицание, потом национальность.',
  text: "No, he isn't Brazilian. He's Spanish.",
  tokens: ['No', 'he', "isn't", 'Brazilian'],
  distractors: ['is'],
}
const TYPE = {
  id: 'a1_003',
  type: 'listen_type',
  audio: 'clip.mp3',
  explanation: 'В беглой речи слова сливаются.',
  answer: "I'm from the UK",
}

// Сервер без лимита: контент — одно задание, право — всегда есть.
function serveOnly(task) {
  return vi.fn(async (url) => {
    const path = String(url).split('?')[0]
    if (path.startsWith('/practice/listening/content/')) return { ok: true, json: async () => [task] }
    if (path === '/api/practice/entitlement') {
      return { ok: true, json: async () => ({ configured: true, allowed: true, limit: null, completed: 0 }) }
    }
    return { ok: true, json: async () => ({ ok: true }) }
  })
}

async function start(task) {
  vi.stubGlobal('fetch', serveOnly(task))
  const view = render(
    <I18nProvider>
      <ListeningPage userLevel="a1" userName="Тест" token="TOK" onNav={() => {}} onProfile={() => {}} />
    </I18nProvider>,
  )
  fireEvent.click(await screen.findByText('Начать тренировку'))
  await screen.findByText('Проверить')
  return view.container
}

const MARK = 'верный ответ по заданию'
const expected = (text) => `[${MARK}: «${text}»]`
const tile = (container, word) => [...container.querySelectorAll('.lt-asm__bank .lt-tile')].find((b) => b.textContent === word)

beforeEach(() => {
  localStorage.setItem('jts_access_token', 'TOK')
  // Плеер клипа зовёт load/pause; в jsdom их нет, и каждый тест сыпал бы «Not implemented» в лог.
  vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('выбор ответа', () => {
  it('до проверки эталона нет, даже с выбранным вариантом', async () => {
    const container = await start(CHOICE)
    fireEvent.click(screen.getByText('In Beijing'))
    expect(snapshotScreen(container)).not.toContain(MARK)
  })

  it('неверно — в снимке верный вариант', async () => {
    const container = await start(CHOICE)
    fireEvent.click(screen.getByText('In Beijing'))
    fireEvent.click(screen.getByText('Проверить'))
    const snap = snapshotScreen(container)
    expect(snap).toContain('[кнопка «In Beijing» неактивна (отмечено как неверное)]')
    expect(snap).toContain(expected('In Shanghai'))
  })

  it('верно — эталона нет', async () => {
    const container = await start(CHOICE)
    fireEvent.click(screen.getByText('In Shanghai'))
    fireEvent.click(screen.getByText('Проверить'))
    expect(snapshotScreen(container)).not.toContain(MARK)
  })
})

describe('собери фразу', () => {
  it('неверно — эталон плитками в верном порядке, без хвоста из text', async () => {
    const container = await start(ASSEMBLE)
    for (const w of ['No', "isn't", 'he', 'Brazilian']) fireEvent.click(tile(container, w))
    fireEvent.click(screen.getByText('Проверить'))
    expect(snapshotScreen(container)).toContain(expected("No he isn't Brazilian"))
  })

  it('верно — эталона нет', async () => {
    const container = await start(ASSEMBLE)
    for (const w of ['No', 'he', "isn't", 'Brazilian']) fireEvent.click(tile(container, w))
    fireEvent.click(screen.getByText('Проверить'))
    expect(snapshotScreen(container)).not.toContain(MARK)
  })
})

describe('диктант', () => {
  it('неверно — в поле ввод ученика, в эталоне ключ', async () => {
    const container = await start(TYPE)
    fireEvent.change(container.querySelector('.lt-input'), { target: { value: 'I from UK' } })
    fireEvent.click(screen.getByText('Проверить'))
    const snap = snapshotScreen(container)
    expect(snap).toContain('ученик ввёл «I from UK» (отмечено как неверное)')
    expect(snap).toContain(expected("I'm from the UK"))
  })

  it('до проверки эталона нет', async () => {
    const container = await start(TYPE)
    fireEvent.change(container.querySelector('.lt-input'), { target: { value: 'I from UK' } })
    expect(snapshotScreen(container)).not.toContain(MARK)
  })
})

describe('expectedAnswer', () => {
  it('выбор и диктант — answer; «собери фразу» — плитки, без них — text', () => {
    expect(expectedAnswer(CHOICE)).toBe('In Shanghai')
    expect(expectedAnswer(TYPE)).toBe("I'm from the UK")
    expect(expectedAnswer(ASSEMBLE)).toBe("No he isn't Brazilian")
    expect(expectedAnswer({ ...ASSEMBLE, tokens: [] })).toBe("No, he isn't Brazilian. He's Spanish.")
  })

  it('пустые данные — пустая строка, а не «undefined»', () => {
    expect(expectedAnswer(null)).toBe('')
    expect(expectedAnswer({ type: 'listen_choice' })).toBe('')
  })
})
