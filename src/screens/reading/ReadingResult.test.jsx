// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { mergeReadingState } from '../../lib/readingState.js'

// Слова и мост в домашку к итогу отношения не имеют, а тянут сеть.
vi.mock('./ReadingKeywords.jsx', () => ({ default: () => null }))
vi.mock('../../practice/practiceHomework.js', () => ({ countUnitTowardsHomework: vi.fn() }))

const { markExercise, resetReadingMemory } = await import('../../practice/reading/readingProgress.js')
const { default: ReadingResult } = await import('./ReadingResult.jsx')

const TOKEN_KEY = 'jts_access_token'
const jwt = (sub) => `h.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.s`

const TEXT = {
  id: 'b1-adv-jungle',
  level: 'B1',
  genre: 'adventure',
  title: 'Eleven Days in the Jungle',
  words: [],
  exercises: [{ type: 'tf', items: [{ s: 'a', a: true }, { s: 'b', a: false }] }],
}

// Сервер в памяти с семантикой настоящего роута; hold держит ответы.
function fakeServer() {
  const s = { state: { texts: {} }, down: false, hold: null }
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    if (s.hold) await s.hold
    if (s.down) throw new TypeError('Failed to fetch')
    if (opts.method === 'POST') {
      s.state = mergeReadingState(s.state, JSON.parse(opts.body).state)
      return { ok: true, json: async () => ({ configured: true, ok: true, state: s.state }) }
    }
    return { ok: true, json: async () => ({ configured: true, state: { reading: s.state } }) }
  })
  return s
}

function mount(onReview = () => {}) {
  return render(
    <I18nProvider>
      <ReadingResult text={TEXT} texts={[TEXT]} progressTick={0} token="t" onOpen={() => {}} onLibrary={() => {}} onReview={onReview} />
    </I18nProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(TOKEN_KEY, jwt('7'))
  resetReadingMemory()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// Решение владельца 05.10.2026: итог — числа сервера, а не страницы.
describe('ReadingResult — итог с сервера', () => {
  it('сначала «Сохраняем…», потом процент из ответа сервера', async () => {
    const server = fakeServer()
    let release
    server.hold = new Promise((res) => {
      release = res
    })
    markExercise(TEXT.id, 0, 2, 2)
    const utils = mount()
    expect(utils.getByText(/Сохраняем результат/)).toBeTruthy()
    expect(utils.queryByText('100%')).toBeNull()

    server.hold = null
    release()
    expect(await utils.findByText('100%')).toBeTruthy()
    expect(utils.queryByText(/Сохраняем результат/)).toBeNull()
    expect(server.state.texts[TEXT.id]).toEqual({ ex: { 0: { score: 2, total: 2 } }, done: true })
  })

  it('сервер не ответил — итог из памяти, плашка и «Повторить»', async () => {
    const server = fakeServer()
    server.down = true
    markExercise(TEXT.id, 0, 2, 2)
    const utils = mount()

    expect(await utils.findByText(/Не удалось сохранить результат/)).toBeTruthy()
    expect(utils.getByText('100%')).toBeTruthy()

    server.down = false
    fireEvent.click(utils.getByRole('button', { name: 'Повторить' }))
    await waitFor(() => expect(utils.queryByText(/Не удалось сохранить результат/)).toBeNull())
    expect(utils.getByText('100%')).toBeTruthy()
    expect(server.state.texts[TEXT.id].ex[0]).toEqual({ score: 2, total: 2 })
  })
})

describe('ReadingResult — «Что повторить»', () => {
  it('«Открыть» сообщает, какое задание открыть', async () => {
    fakeServer()
    markExercise(TEXT.id, 0, 1, 2)
    const onReview = vi.fn()
    const utils = mount(onReview)
    fireEvent.click(await utils.findByRole('button', { name: 'Открыть' }))
    expect(onReview).toHaveBeenCalledWith(0)
  })
})
