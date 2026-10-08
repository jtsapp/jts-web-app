// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Словарь в Сказках (ревью 08.10.2026):
//  - баг 57: vwFetch клал в кэш слово, если пришло хоть что-то, — определение
//    без переводов (MyMemory не ответил за 3,5 с) застревало навсегда, и слово
//    больше не переводилось;
//  - баг 56: «Добавлено в словарь» показывалось до сохранения в «Мой словарь»,
//    и сбой бэкенда ученик не видел.
//
// Движок (2,7 МБ, всё внутри фабрики) читается как файл: нужные функции
// вырезаются и запускаются с подставными зависимостями. Кэш проверяется и в
// HTML-источнике — иначе следующая перегенерация модулей тихо сотрёт фикс.

const here = dirname(fileURLToPath(import.meta.url))
const engine = readFileSync(join(here, 'engine.js'), 'utf8')
const source = readFileSync(join(here, '../../../public/practice/fairytales.html'), 'utf8')
const BOTH = [
  ['модуль', engine],
  ['исходник HTML', source],
]

/** Исходник функции по заголовку: скобки считаем (строк со скобками в них нет). */
function fnSource(text, head) {
  let at = text.indexOf(head)
  if (at < 0) throw new Error('нет функции ' + head)
  if (text.slice(at - 6, at) === 'async ') at -= 6
  let depth = 0
  for (let i = text.indexOf('{', at); i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth === 0) return text.slice(at, i + 1)
  }
  throw new Error('не закрыта ' + head)
}

/** Функция движка с подставленными зависимостями. */
function build(text, head, deps) {
  const names = Object.keys(deps)
  const name = head.match(/function (\w+)/)[1]
  return new Function(...names, `${fnSource(text, head)}\nreturn ${name}`)(...names.map((n) => deps[n]))
}

// null — сбой (сеть, таймаут, отказ), '' — ответ пришёл, но перевода нет.
function makeFetch(text, { def, kk, ru }) {
  const store = {}
  const vwFetch = build(text, 'function vwFetch(', {
    vwLoadCache: () => store,
    vwSaveCache: (c) => Object.assign(store, c),
    vwDictApi: async () => def,
    vwMyMemory: async (w, tl) => (tl === 'kk' ? kk : ru),
  })
  return { vwFetch, store }
}

describe('Сказки: кэш перевода слова (баг 57)', () => {
  for (const [name, text] of BOTH) {
    it(`${name}: сбой переводчика не кэшируется — следующий тап спросит снова`, async () => {
      const { vwFetch, store } = makeFetch(text, { def: 'a spirit of a dead person', kk: null, ru: null })
      const e = await vwFetch('ghost')
      expect(e).toMatchObject({ def: 'a spirit of a dead person', kk: '', ru: '' })
      expect(store.ghost).toBeUndefined()
    })

    it(`${name}: ответ «перевода нет» кэшируется — иначе каждый тап ждал бы сеть`, async () => {
      const { vwFetch, store } = makeFetch(text, { def: 'a rare word', kk: '', ru: 'редкое' })
      await vwFetch('xyzzy')
      expect(store.xyzzy).toMatchObject({ kk: '', ru: 'редкое' })
    })

    it(`${name}: полный перевод кэшируется, как раньше`, async () => {
      const { vwFetch, store } = makeFetch(text, { def: 'a spirit', kk: 'елес', ru: 'призрак' })
      await vwFetch('ghost')
      expect(store.ghost).toMatchObject({ kk: 'елес', ru: 'призрак' })
    })

    it(`${name}: MyMemory — сбой (null) отличается от пустого ответа ('')`, async () => {
      const reply = (body, ok = true) => async () => ({ ok, json: async () => body })
      const mm = (fetcher) => build(text, 'function vwMyMemory(', { vwFetchTimeout: fetcher })
      expect(await mm(reply({ responseData: { translatedText: 'призрак' } }))('ghost', 'ru')).toBe('призрак')
      expect(await mm(reply({ responseData: { translatedText: '' } }))('ghost', 'ru')).toBe('')
      expect(await mm(reply({}, false))('ghost', 'ru')).toBeNull()
      expect(await mm(reply({ responseData: { translatedText: 'MYMEMORY WARNING: quota' } }))('ghost', 'ru')).toBeNull()
      expect(await mm(async () => { throw new Error('timeout') })('ghost', 'ru')).toBeNull()
    })

    it(`${name}: словарь определений — «слова нет» (404) не сбой, обрыв сети — сбой`, async () => {
      const da = (fetcher) => build(text, 'function vwDictApi(', { vwFetchTimeout: fetcher })
      expect(await da(async () => ({ ok: false, status: 404 }))('xyzzy')).toBe('')
      expect(await da(async () => { throw new Error('timeout') })('ghost')).toBeNull()
    })

    it(`${name}: записи старого кэша (v1) выбрасываются — среди них застрявшие без перевода`, () => {
      const key = text.match(/const VW_CACHE_KEY = "([^"]+)"/)[1]
      expect(key).not.toBe('jts.fairytale.vocabcache.v1')
      localStorage.setItem('jts.fairytale.vocabcache.v1', JSON.stringify({ ghost: { w: 'ghost', def: 'a spirit', kk: '', ru: '' } }))
      const vwLoadCache = build(text, 'function vwLoadCache(', { VW_CACHE_KEY: key })
      expect(vwLoadCache()).toEqual({})
      expect(localStorage.getItem('jts.fairytale.vocabcache.v1')).toBeNull()
    })
  }
})

function makeAdd(bridge) {
  const dict = []
  const toasts = []
  const btn = { disabled: false }
  const deps = {
    vwCurrent: { w: 'ghost', def: 'a spirit', kk: 'елес', ru: 'призрак' },
    vwLoadDict: () => dict.slice(),
    vwSaveDict: (d) => dict.splice(0, dict.length, ...d),
    vwReflectSaved: () => {},
    vwRefreshBadge: () => {},
    toast: (title) => toasts.push(title),
    vwT: (en, ru) => ru,
    vwStamp: () => 0,
    window: { __jtsFairytaleSaveVocab: bridge },
    document: { getElementById: () => ({ querySelector: () => btn }) },
  }
  return { add: build(engine, 'function vwAddCurrent(', deps), dict, toasts, btn }
}

describe('Сказки: «В словарь» (баг 56)', () => {
  it('сбой «Моего словаря» виден, слово не числится сохранённым — можно нажать ещё раз', async () => {
    const { add, dict, toasts } = makeAdd(async () => false)
    await add()
    expect(toasts).toEqual(['Не сохранилось'])
    expect(dict).toHaveLength(0)
  })

  it('сохранено — «Добавлено в словарь»', async () => {
    const { add, dict, toasts } = makeAdd(async () => true)
    await add()
    expect(toasts).toEqual(['Добавлено в словарь'])
    expect(dict).toHaveLength(1)
  })

  it('гостю «Моего словаря» нет — слово остаётся в словаре сказки', async () => {
    const { add, dict, toasts } = makeAdd(async () => 'guest')
    await add()
    expect(toasts).toEqual(['Добавлено в словарь'])
    expect(dict).toHaveLength(1)
  })

  it('пока «Мой словарь» отвечает, кнопка неактивна — второй клик не даёт «Уже сохранено» поверх сбоя', async () => {
    let release
    const { add, btn } = makeAdd(() => new Promise((r) => (release = r)))
    const pending = add()
    expect(btn.disabled).toBe(true)
    release(false)
    await pending
    expect(btn.disabled).toBe(false)
  })
})

describe('Сказки: мост сохранения в «Мой словарь»', () => {
  const session = { token: null }
  const saveStudentVocab = vi.fn()
  beforeEach(() => {
    vi.doMock('./engine.js', () => ({ createTaleWorld: vi.fn() }))
    vi.doMock('./markup.js', () => ({ MARKUP: '' }))
    vi.doMock('./styles.js', () => ({ CSS_BASE: '', CSS_SHELL: '' }))
    vi.doMock('../../api.js', () => ({ saveStudentVocab: (...a) => saveStudentVocab(...a) }))
    vi.doMock('../../lib/session.js', () => ({ loadToken: () => session.token }))
    session.token = null
    saveStudentVocab.mockReset()
  })
  afterEach(() => {
    vi.resetModules()
    delete window.__jtsFairytaleSaveVocab
  })

  it('гость — «guest», а не «сбой»: без входа сохранять в «Мой словарь» некуда', async () => {
    const { ensureFairytaleVocabBridge } = await import('./taleWorld.js')
    ensureFairytaleVocabBridge()
    expect(await window.__jtsFairytaleSaveVocab({ w: 'ghost', ru: 'призрак' })).toBe('guest')
    expect(saveStudentVocab).not.toHaveBeenCalled()
  })

  it('вошедший: удача — true, сбой — false', async () => {
    session.token = 'USER'
    const { ensureFairytaleVocabBridge } = await import('./taleWorld.js')
    ensureFairytaleVocabBridge()
    saveStudentVocab.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'))
    expect(await window.__jtsFairytaleSaveVocab({ w: 'ghost', ru: 'призрак' })).toBe(true)
    expect(await window.__jtsFairytaleSaveVocab({ w: 'ghost', ru: 'призрак' })).toBe(false)
  })
})
