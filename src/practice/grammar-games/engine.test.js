// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountGrammarGames } from './engine.js'

const DIR = path.join(__dirname, '__fixtures__')
const bundle = JSON.parse(fs.readFileSync(path.join(DIR, 'bundle.json'), 'utf8'))
const oracle = JSON.parse(fs.readFileSync(path.join(DIR, 'oracle.json'), 'utf8'))
// Код без комментариев: шапка файла как раз объясняет, что localStorage и HOOK прототипа убраны.
const source = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Та же форма, что в scripts/grammar-games/extract-oracle.js.
const opts = (list) => list.map((o) => [o.x, !!o.ok])
const SHAPES = {
  pick: (R) => R.items.map((x) => ({ s: x.s, opts: opts(x.opts) })),
  trans: (R) => R.items.map((x) => ({ from: x.from, opts: opts(x.opts) })),
  match: (R) => R.cards.map((c) => [c.t, c.side, c.p]),
  sort: (R) => R.items.map((x) => [x.w, x.c]),
  build: (R) => ({ items: R.items.map((x) => x.s), pool: R.pool.map((p) => [p.w, !!p.extra]) }),
  fix: (R) => R.items.map((x) => x.s),
  place: (R) => R.items.map((x) => x.s),
  type: (R) => R.items.map((x) => x.s),
  listen: (R) => R.items.map((x) => ({ right: x.right, opts: opts(x.opts) })),
  race: (R) => R.items.map((x) => [x.s, x.truth]),
  boss: (R) => R.items.map((x) => ({ kind: x.kind, say: x.say, opts: opts(x.opts) })),
}

let rng
let api
let host
let root
let cfg
beforeEach(() => {
  rng = mulberry32(oracle.seed)
  vi.spyOn(Math, 'random').mockImplementation(() => rng())
  host = document.createElement('div')
  document.body.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<div class="gg"></div>'
  root = shadow.querySelector('.gg')
  cfg = {
    index: bundle.index,
    progress: {},
    loadTopic: vi.fn(async (id) => JSON.parse(JSON.stringify(bundle.topics[id]))),
    loadGloss: vi.fn(async () => bundle.gloss),
    onResult: vi.fn(async () => ({ best: 3, coins: 2 })),
    onAnswer: vi.fn(),
    speak: vi.fn(),
    stopVoice: vi.fn(),
    addWord: vi.fn(async () => 'dict'),
    asset: { img: (n) => `/img/${n}.webp`, emoji: (c) => `/emoji/${c}.webp`, emojiList: [] },
    lang: 'ru',
    level: 'L3',
    sound: true,
    scrollTop: vi.fn(),
  }
})
afterEach(() => {
  api?.destroy()
  api = null
  host?.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
  delete globalThis.AudioContext
})

const mount = (over = {}) => {
  api = mountGrammarGames(root, { ...cfg, ...over })
  return api
}
const $ = (sel) => root.querySelector(sel)
const $$ = (sel) => [...root.querySelectorAll(sel)]

describe('«Грамматика · игры»: порт = прототип', () => {
  for (const [id, games] of Object.entries(oracle.sets)) {
    it(`наборы игр темы ${id}`, async () => {
      mount()
      await api.go('topic', id)
      for (const [g, want] of Object.entries(games)) {
        rng = mulberry32(oracle.seed)
        await api.go('game', g)
        expect(SHAPES[g](api.snapshot().R), `${id} · ${g}`).toEqual(want)
        if (g === 'race') expect(api.snapshot().R.speed).toBe(oracle.raceSpeed[id])
      }
    })
  }
})

describe('«Грамматика · игры»: связь с приложением', () => {
  it('хаб открывается на уровне профиля; тема без шапки — «скоро»', () => {
    mount()
    expect($('.lvcard.on .big').textContent).toBe('A2 → B1')
    const l3 = bundle.index.program.filter((p) => p.lv === 'L3')
    expect($$('.tgrid > *')).toHaveLength(l3.length)
    expect($$('.tgrid .tcard.soon')).toHaveLength(l3.length - 1)
    expect($('.hero img').getAttribute('src')).toBe('/img/cheer.webp')
  })

  it('тема грузится по требованию, правило: карточка, окно слова, «В словарь»', async () => {
    mount()
    $$('.lvcard')[0].click()
    $('.tcard:not(.soon)').click()
    expect($('.gg-wait')).not.toBeNull()
    await vi.waitFor(() => expect($('.thead h1')).not.toBeNull())
    expect(cfg.loadTopic).toHaveBeenCalledWith('L1-01')

    $('.c3d').click()
    expect($('.ov .modal h3').textContent).toContain('1.')
    $('.ov .icon-btn.x').click()
    expect($('.ov')).toBeNull()

    const word = $('.gt td .w')
    word.click()
    expect($('#pop').style.display).toBe('block')
    await vi.waitFor(() => expect($('#pop .tr b')).not.toBeNull())
    expect(cfg.loadGloss).toHaveBeenCalledTimes(1)
    const dict = [...root.querySelectorAll('#pop .acts button')].find((b) => b.dataset.act === 'addWord')
    dict.click()
    await vi.waitFor(() => expect(dict.disabled).toBe(true))
    await vi.waitFor(() => expect(dict.textContent).toContain('В словаре'))
    const tr = bundle.gloss[word.dataset.k]
    expect(cfg.addWord).toHaveBeenCalledWith({ en: expect.any(String), ru: tr[0], kk: tr[1] })
    // 🔊 слово — голос приложения, а не синтез браузера
    root.querySelector('#pop .acts button[data-act="say"]').click()
    expect(cfg.speak).toHaveBeenCalledWith(word.textContent)
  })

  it('доигранная «Выбери форму»: сдача, ответы в рейтинг, звёзды на плитке, монеты тостом', async () => {
    vi.useFakeTimers()
    mount()
    await api.go('topic', 'L1-01')
    await api.go('game', 'pick')
    const n = api.snapshot().R.items.length
    for (let i = 0; i < n; i++) {
      const { R } = api.snapshot()
      root.querySelector(`#o${R.items[R.i].opts.findIndex((o) => o.ok)}`).click()
      vi.advanceTimersByTime(1100)
    }
    expect(api.snapshot().view).toBe('result')
    expect(cfg.onResult).toHaveBeenCalledWith('L1-01', 'pick', 3)
    expect(cfg.onAnswer).toHaveBeenCalledTimes(n)
    expect(cfg.onAnswer.mock.calls.every(([ok]) => ok === true)).toBe(true)
    await vi.advanceTimersByTimeAsync(0)
    expect($('.toast').textContent).toBe('Монеты: +2')
    await api.go('topic', 'L1-01', 'quest')
    expect($$('.gcard.g-pick.done .stars .y')).toHaveLength(3)
  })

  it('смена языка перерисовывает экран без пересоздания', async () => {
    mount()
    await api.go('topic', 'L1-01')
    api.setLang('en')
    expect($('.tabs button').textContent).toContain('Rule')
    api.setLang('kk')
    expect($('.tabs button').textContent).toContain('Ереже')
  })

  // Темы правят в админке: разметка из данных — текст, а не HTML (прототип вставлял иконки и названия как есть).
  it('иконка, картинка задания и уровень из данных не становятся разметкой', async () => {
    const evil = '<img src=x onerror="window.__gg_xss=1">'
    const index = JSON.parse(JSON.stringify(bundle.index))
    index.levels[0] = { ...index.levels[0], name: evil, range: evil, bg: 'red;background-image:url(//x)', stk: undefined }
    index.topics[0] = { ...index.topics[0], icon: evil, color: 'red;x:1' }
    const body = JSON.parse(JSON.stringify(bundle.topics['L1-01']))
    body.icon = evil
    body.gap = body.gap.map((g) => ({ ...g, pic: evil }))
    vi.useFakeTimers()
    mount({ index, level: 'L1', loadTopic: async () => body })
    expect($('.lvcard .big').textContent).toBe(evil)
    expect($('.lvcard').getAttribute('style')).toContain('linear-gradient(110.8deg')
    expect($('.tcard:not(.soon) .ic').textContent).toBe(evil)
    await api.go('topic', 'L1-01')
    expect($('.thead .ic').textContent).toBe(evil)
    await api.go('game', 'pick')
    expect($('.pic').textContent).toBe(evil)
    expect(root.querySelector('img[onerror]')).toBeNull()
    expect(window.__gg_xss).toBeUndefined()
  })

  it('Escape с фокусом на странице закрывает окно карточки, клик вне раздела — окно слова', async () => {
    mount()
    await api.go('topic', 'L1-01')
    $('.c3d').click()
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect($('.ov')).toBeNull()
    $('.gt td .w').click()
    expect($('#pop').style.display).toBe('block')
    document.body.click()
    expect($('#pop').style.display).toBe('none')
  })

  it('исходник не трогает document, location, хранилище, синтез браузера и крючки прототипа', () => {
    expect(source).not.toMatch(/\bdocument\./)
    expect(source).not.toMatch(/\blocation\./)
    expect(source).not.toMatch(/localStorage|sessionStorage/)
    expect(source).not.toMatch(/speechSynthesis/)
    expect(source).not.toMatch(/\bHOOK\b/)
    expect(source).not.toMatch(/on(click|keydown)="/)
  })

  it('destroy снимает разметку, голос, звук и таймеры', async () => {
    vi.useFakeTimers()
    const closed = vi.fn(async () => {})
    globalThis.AudioContext = class {
      constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {} }
      createOscillator() { return { type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} } }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} } }
      createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect() {} } }
      close() { return closed() }
    }
    mount()
    await api.go('topic', 'L1-01')
    await api.go('game', 'pick')
    const { R } = api.snapshot()
    root.querySelector(`#o${R.items[0].opts.findIndex((o) => o.ok)}`).click()
    api.destroy()
    expect(root.innerHTML).toBe('')
    expect(cfg.stopVoice).toHaveBeenCalled()
    expect(closed).toHaveBeenCalled()
    // отложенный переход к следующему вопросу не срабатывает и ничего не рисует
    vi.advanceTimersByTime(5000)
    expect(root.innerHTML).toBe('')
    api = null
  })
})
