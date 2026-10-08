// @vitest-environment jsdom
//
// «Изучено» и «хуже запомненные» «Словаря» до 06.10.2026 жили только в
// localStorage одним блобом на всех учеников браузера и на сервер не уходили:
// при забитом кэшем каталогов хранилище счётчик не рос, на другом устройстве
// его не было. Теперь это модули vocabLearned / vocabMisses общего хранилища.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const pushModule = vi.fn()
vi.mock('../../practice/practiceSync.js', () => ({ pushModule: (...a) => pushModule(...a) }))

const { recordVocabLearned, forgetVocabLearned, learnedCount, learnedKeys } = await import('./vocabLearned.js')
const { recordVocabMisses, topVocabMisses, clearVocabMiss } = await import('./vocabMisses.js')
const { adoptHydratedState, ownerOf } = await import('../../practice/progressStore.js')

const TOKEN_KEY = 'jts_access_token'
const jwt = (sub) => `h.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.s`
const LEGACY_LEARNED = 'jts.vocab.learned.v1'
const LEGACY_MISSES = 'jts.vocab.misses.v1'

function fillStorage() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('full', 'QuotaExceededError')
  })
}

beforeEach(() => {
  localStorage.clear()
  pushModule.mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe('«Словарь» при забитом localStorage', () => {
  it('«изучено» растёт и снимается', () => {
    fillStorage()
    recordVocabLearned(null, 'A0', ['like', 'listen'])
    expect(learnedCount(null, 'A0')).toBe(2)
    forgetVocabLearned(null, 'A0', ['like'])
    expect([...learnedKeys(null, 'A0')]).toEqual(['listen'])
  })

  it('ошибки копятся и снимаются верным ответом', () => {
    fillStorage()
    recordVocabMisses(null, [{ word: 'Coffee', ru: 'кофе' }])
    recordVocabMisses(null, [{ word: 'Coffee' }, { word: 'Tea' }])
    expect(topVocabMisses(null, 3).map((w) => [w.key, w.misses])).toEqual([['coffee', 2], ['tea', 1]])
    clearVocabMiss(null, 'coffee')
    expect(topVocabMisses(null, 3).map((w) => w.key)).toEqual(['tea'])
  })
})

describe('«Словарь» на сервере', () => {
  it('вошедший: отметка уходит на сервер модулем vocabLearned', () => {
    localStorage.setItem(TOKEN_KEY, jwt('7'))
    // До ответа сервера раздел не отправляется: сервер хранит его заменой, и
    // ранняя запись стёрла бы серверное (ревью 08.10.2026, #78).
    recordVocabLearned(jwt('7'), 'A0', ['like'])
    expect(pushModule).not.toHaveBeenCalled()
    adoptHydratedState({}, ownerOf(jwt('7')))
    expect(pushModule).toHaveBeenLastCalledWith('vocabLearned', { scopes: { A0: ['like'] } }, expect.any(Function))
  })

  it('ответ сервера попадает в счётчик', () => {
    localStorage.setItem(TOKEN_KEY, jwt('7'))
    adoptHydratedState({ vocabLearned: { scopes: { A1: ['go', 'be'] } }, vocabMisses: { words: { go: { word: 'go', misses: 3, at: 1 } } } }, ownerOf(jwt('7')))
    expect(learnedCount(jwt('7'), 'A1')).toBe(2)
    expect(topVocabMisses(jwt('7'), 1)[0]).toMatchObject({ key: 'go', misses: 3 })
  })
})

// Независимое ревью PR: список «изучено» уровня заменялся целиком — новое
// слово на новом устройстве стирало изученное на другом.
describe('«Словарь» — новое устройство до ответа сервера', () => {
  it('изученное на другом устройстве не стирается новым словом', () => {
    localStorage.setItem(TOKEN_KEY, jwt('7'))
    recordVocabLearned(jwt('7'), 'A0', ['like'])
    adoptHydratedState({ vocabLearned: { scopes: { A0: ['go', 'run'] } } }, ownerOf(jwt('7')))
    expect([...learnedKeys(jwt('7'), 'A0')].sort()).toEqual(['go', 'like', 'run'])
  })
})

describe('перенос старого блоба', () => {
  it('гость: запись anon переносится сразу, чужие остаются', () => {
    localStorage.setItem(LEGACY_LEARNED, JSON.stringify({ anon: { A0: ['like'] }, 42: { A0: ['other'] } }))
    expect(learnedCount(null, 'A0')).toBe(1)
    expect(JSON.parse(localStorage.getItem(LEGACY_LEARNED))).toEqual({ 42: { A0: ['other'] } })
    expect(JSON.parse(localStorage.getItem('jts_vocab_learned'))).toEqual({ scopes: { A0: ['like'] } })
  })

  it('вошедший до ответа сервера: видно объединение, но перенос ждёт', () => {
    const token = jwt('7')
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(LEGACY_LEARNED, JSON.stringify({ 7: { A0: ['like'] } }))
    expect(learnedCount(token, 'A0')).toBe(1)
    expect(pushModule).not.toHaveBeenCalled()
    expect(localStorage.getItem(LEGACY_LEARNED)).not.toBeNull()
  })

  it('вошедший после ответа сервера: объединение, отправка, запись uid удалена', () => {
    const token = jwt('7')
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(LEGACY_LEARNED, JSON.stringify({ 7: { A0: ['like'] } }))
    adoptHydratedState({ vocabLearned: { scopes: { A0: ['go'] } } }, ownerOf(token))
    expect([...learnedKeys(token, 'A0')].sort()).toEqual(['go', 'like'])
    expect(pushModule).toHaveBeenLastCalledWith('vocabLearned', { scopes: { A0: ['go', 'like'] } }, expect.any(Function))
    expect(localStorage.getItem(LEGACY_LEARNED)).toBeNull()
  })

  it('ошибки: старая запись сливается с серверной по большему числу промахов', () => {
    const token = jwt('7')
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(LEGACY_MISSES, JSON.stringify({ 7: { tea: { word: 'tea', misses: 5, at: 2 }, go: { word: 'go', misses: 1, at: 1 } } }))
    adoptHydratedState({ vocabMisses: { words: { go: { word: 'go', misses: 4, at: 3 } } } }, ownerOf(token))
    expect(topVocabMisses(token, 3).map((w) => [w.key, w.misses])).toEqual([['tea', 5], ['go', 4]])
    expect(localStorage.getItem(LEGACY_MISSES)).toBeNull()
  })
})
