// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCores } from './cores.js'
import { mountWordHunt } from './engine.js'

const DIR = path.join(__dirname, '__fixtures__')
const bundle = JSON.parse(fs.readFileSync(path.join(DIR, 'bundle.json'), 'utf8'))
const oracle = JSON.parse(fs.readFileSync(path.join(DIR, 'oracle.json'), 'utf8'))
const source = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8')
const DIFFS = ['easy', 'medium', 'hard']

// Тот же снимок, что снимает scripts/wordhunt/extract-oracle.js с прототипа.
const plain = (x) => JSON.parse(JSON.stringify(x))
const itemShape = (it) => ({ key: it.key, ids: it.ids, en: it.en, ans: it.ans, enumr: it.enumr, fit: it.fit, why: it.why, ru: it.ru, kk: it.kk, clue: it.clue, form: it.form, card: it.card })
const entShape = (e) => ({
  key: e.it.key, r: e.r == null ? null : e.r, c: e.c == null ? null : e.c, dir: e.dir || null, len: e.len || null, num: e.num,
  why: e.why || null, kind: e.kind, hint: e.hint, amb: !!e.amb, refs: e.refs, pol: e.pol || null,
})

function portPlanets() {
  const { XWCore: C, WSCore, LXClue } = createCores({ clueq: bundle.clueq, pics: bundle.pics })
  const db = bundle.db
  const areas = db.levels.map((l) => l.id).concat(bundle.fields.map((f) => f.id)).filter((lv) => db[lv])
  const out = []
  for (const lv of areas) {
    for (const u of db[lv].units) {
      for (const n of u.lessons) {
        if (!db[lv].lessons[String(n)]) continue
        C.parts(C.lessonItems(db, lv, n)).forEach((items, ix) => {
          const pid = lv + ':' + n + ':' + ix + ':' + C.hash(items.map((x) => x.key).join(',')).toString(36)
          const pl = { pid, items: items.map(itemShape), xw: [], ws: {}, wsClue: {}, tr: {} }
          for (let tier = 0; tier < 3; tier++) {
            const P = C.build(items, pid + ':' + tier + ':oracle', 'pol' + tier, LXClue.xwChooser(tier))
            pl.xw.push({ h: P.h, w: P.w, err: P.err || '', entries: P.entries.map(entShape), strips: P.strips.map(entShape) })
          }
          for (const d of DIFFS) {
            const B = WSCore.build(items, d, pid + ':' + d + ':oracle')
            pl.ws[d] = B && {
              n: B.n, grid: B.grid.join(''), words: B.words.map((w) => ({ key: w.it.key, cells: w.cells, dir: w.dir })),
              aside: B.aside.map((x) => x.key), skipped: B.skipped.map((x) => x.key), pick: WSCore.pick(items, d).map((x) => x.key),
            }
          }
          for (const it of items) {
            pl.wsClue[it.key] = LXClue.wsClue(it)
            pl.tr[it.key] = { ru: LXClue.trText(it, 'ru'), kk: LXClue.trText(it, 'kk'), band: LXClue.bandOf(it), give: LXClue.trGivesAway(it) }
          }
          out.push(plain(pl))
        })
      }
    }
  }
  return { planets: out, tiers: plain(LXClue.BANDS.map((b) => ({ band: b, kinds: LXClue.tierKinds(b), sup: [0, 1, 2].map((i) => LXClue.tierSup(b, i)) }))) }
}

describe('Word Hunt: ядра порта = ядра прототипа (оракул)', () => {
  const port = portPlanets()

  it('те же планеты в том же порядке', () => {
    expect(port.planets.map((p) => p.pid)).toEqual(oracle.planets.map((p) => p.pid))
  })

  it('шаги кроссворда по полосам CEFR', () => {
    expect(port.tiers).toEqual(oracle.tiers)
  })

  for (const want of oracle.planets) {
    it(`планета ${want.pid}: задания, три сетки, три доски, подсказки`, () => {
      const got = port.planets.find((p) => p.pid === want.pid)
      expect(got.items).toEqual(want.items)
      expect(got.xw).toEqual(want.xw)
      expect(got.ws).toEqual(want.ws)
      expect(got.wsClue).toEqual(want.wsClue)
      expect(got.tr).toEqual(want.tr)
    })
  }

  it('в фикстуре есть и сетки, и полоски вне сетки, и доски всех сложностей', () => {
    expect(oracle.planets.some((p) => p.xw[0].entries.length >= 3)).toBe(true)
    expect(oracle.planets.some((p) => p.xw[0].strips.length > 0)).toBe(true)
    for (const d of DIFFS) expect(oracle.planets.every((p) => p.ws[d])).toBe(true)
  })
})

/* ------------------------------------------------------------- движок --- */

function fakeCtx() {
  return new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => ((t[k] = v), true) })
}

let host, api, state, wip, said, words
function mount(opts = {}) {
  host = document.createElement('div')
  document.body.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<div class="wh"></div>'
  api = mountWordHunt(shadow.querySelector('.wh'), {
    bundle: opts.bundle || bundle,
    lang: opts.lang || 'ru',
    progress: { read: () => JSON.parse(JSON.stringify(state)), write: (s) => { state = JSON.parse(JSON.stringify(s)) } },
    wip: { read: () => JSON.parse(JSON.stringify(wip)), write: (w) => { wip = JSON.parse(JSON.stringify(w)) } },
    say: (o) => { said.push(o); o.done() },
    stopAudio: opts.stopAudio || (() => {}),
    onWord: (ok) => words.push(ok),
  })
  return shadow
}
const $ = (sel) => host.shadowRoot.querySelector(sel)
const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true }))

beforeEach(() => {
  vi.useFakeTimers()
  state = {}
  wip = {}
  said = []
  words = []
  window.scrollTo = () => {}
  Element.prototype.animate = function () { return { onfinish: null, cancel() {} } }
  HTMLCanvasElement.prototype.getContext = () => fakeCtx()
})
afterEach(() => {
  api?.destroy()
  api = null
  host?.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function openFirstLesson() {
  click($('[data-a="gal"][data-lv="A0"]'))
  expect(api.snapshot().view).toBe('galaxy')
  click($('#journey .node'))
  expect($('#scrim .sheet')).not.toBeNull()
}

function solveCrossword(wait = true) {
  for (let guard = 0; guard < 400; guard++) {
    const G = api.snapshot().xw
    if (!G || G.over) break
    const e = G.ents[G.cur.e]
    const o = e.cells[G.cur.i]
    const k = $('#xwKey')
    k.value = ' ' + o.sol
    k.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }))
  }
  if (wait) vi.advanceTimersByTime(1500)
}

describe('Word Hunt: движок в тени', () => {
  it('главная: обложка, пять миров A0–B2, станции — только с областью в бандле', () => {
    mount()
    expect($('.hero')).not.toBeNull()
    expect([...host.shadowRoot.querySelectorAll('.lvl')].map((b) => b.dataset.lv)).toEqual(['A0', 'A1', 'A2', 'B1', 'B2'])
    expect([...host.shadowRoot.querySelectorAll('.fld')].map((b) => b.dataset.lv)).toEqual(['F:business'])
    expect($('.top .lang')).toBeNull()
    expect($('#sky').closest('.sky-clip')).not.toBeNull()
  })

  it('кроссворд: решённая сетка — итог, слова собраны, прогресс записан, wip убран', () => {
    mount()
    openFirstLesson()
    click($('[data-a="playXw"]'))
    expect(api.snapshot().view).toBe('xw')
    const n = api.snapshot().xw.ents.length
    solveCrossword()
    expect(api.snapshot().view).toBe('result')
    expect(Object.keys(state.stars)).toHaveLength(n)
    expect(Object.values(state.pl)[0].x).toEqual([1, 0, 0])
    expect(state.games).toBe(1)
    expect(state.last).toMatch(/^A0:1:0:/)
    expect(state.wip).toBeUndefined()
    expect(wip).toEqual({})
    expect(words).toEqual(Array(n).fill(true))
    // решённое слово звучит (в тесте слова решаются в одном тике — очередь прототипа оставляет последнее)
    expect(said.length).toBeGreaterThan(0)
    expect(said.every((s) => s.text && typeof s.done === 'function')).toBe(true)
    expect($('#v-result .res')).not.toBeNull()
  })

  // Починка прототипа: решённое слово ставило курсор на ВТОРУЮ клетку следующего, первая буква пропускалась.
  it('кроссворд: после решённого слова курсор — на первой пустой клетке следующего', () => {
    mount()
    openFirstLesson()
    click($('[data-a="playXw"]'))
    const start = api.snapshot().xw.cur.e
    for (let guard = 0; guard < 40 && api.snapshot().xw.cur.e === start; guard++) {
      const G = api.snapshot().xw
      const k = $('#xwKey')
      k.value = ' ' + G.ents[G.cur.e].cells[G.cur.i].sol
      k.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }))
    }
    const G = api.snapshot().xw
    const e = G.ents[G.cur.e]
    expect(G.ents[start].solved).toBe(true)
    expect(G.cur.i).toBe(e.cells.findIndex((c) => !c.val && !c.lock))
  })

  it('кроссворд: недорешённая сетка переживает уход с экрана (wip — на устройстве)', () => {
    mount()
    openFirstLesson()
    click($('[data-a="playXw"]'))
    const G = api.snapshot().xw
    const o = G.ents[G.cur.e].cells[G.cur.i]
    const k = $('#xwKey')
    k.value = ' ' + o.sol
    k.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }))
    api.destroy()
    expect(Object.keys(wip)).toHaveLength(1)
    expect(Object.values(wip)[0].v.replace(/\./g, '')).toBe(o.sol)
    host.remove()
    mount()
    openFirstLesson()
    click($('[data-a="playXw"]'))
    expect(api.snapshot().xw.cells.filter((c) => c.val).map((c) => c.val)).toEqual([o.sol])
  })

  it('кроссворд: показанное слово уходит в кометы, а не в собранные', () => {
    mount()
    openFirstLesson()
    click($('[data-a="playXw"]'))
    const first = api.snapshot().xw.ents[api.snapshot().xw.cur.e].it.key
    click($('[data-x="word"]'))
    solveCrossword()
    expect(state.comets[first]).toBeGreaterThan(0)
    expect(state.stars[first]).toBeUndefined()
    expect(words.filter((ok) => !ok)).toHaveLength(1)
  })

  // Починка прототипа: итог показывается через 1,1 с после последнего слова, и уход в эту паузу его терял.
  it('кроссворд: ушли с экрана в паузе до итога — итог всё равно записан', () => {
    mount()
    openFirstLesson()
    click($('[data-a="playXw"]'))
    const n = api.snapshot().xw.ents.length
    solveCrossword(false)
    expect(api.snapshot().view).toBe('xw')
    api.destroy()
    api = null
    expect(Object.keys(state.stars)).toHaveLength(n)
    expect(Object.values(state.pl)[0].x).toEqual([1, 0, 0])
    expect(wip).toEqual({})
  })

  it('кроссворд: «назад» движка в паузе до итога — итог записан, отложенный показ не падает', () => {
    mount()
    openFirstLesson()
    click($('[data-a="playXw"]'))
    solveCrossword(false)
    click($('#backBtn'))
    expect(api.snapshot().view).toBe('galaxy')
    expect(() => vi.advanceTimersByTime(3000)).not.toThrow()
    expect(api.snapshot().view).toBe('galaxy')
    expect(state.games).toBe(1)
  })

  it('поиск слов клавиатурой: Enter на первой букве, Enter на последней — слово найдено', () => {
    mount()
    openFirstLesson()
    click($('[data-a="tab"][data-m="ws"]'))
    click($('[data-a="playWs"]'))
    expect(api.snapshot().view).toBe('ws')
    const board = $('#wsBoard')
    for (let guard = 0; guard < 40; guard++) {
      const G = api.snapshot().ws
      if (!G || G.over) break
      const w = G.B.words.find((x) => !G.found[x.it.key])
      const n = G.B.n
      const go = (to) => {
        const g = api.snapshot().ws
        let r = Math.floor(g.kb / n), c = g.kb % n
        const tr = Math.floor(to / n), tc = to % n
        while (r < tr) { key(board, 'ArrowDown'); r++ }
        while (r > tr) { key(board, 'ArrowUp'); r-- }
        while (c < tc) { key(board, 'ArrowRight'); c++ }
        while (c > tc) { key(board, 'ArrowLeft'); c-- }
      }
      go(w.cells[0])
      key(board, 'Enter')
      go(w.cells[w.cells.length - 1])
      key(board, 'Enter')
      expect(api.snapshot().ws.found[w.it.key]).toBeTruthy()
    }
    vi.advanceTimersByTime(1500)
    expect(api.snapshot().view).toBe('result')
    const pl = Object.values(state.pl)[0]
    expect(pl.h.easy).toEqual({})
    expect(state.cleanHunt).toBe(1)
  })

  it('язык — из приложения: kk рисует главную по-казахски, setLang перерисовывает без пересоздания', () => {
    mount({ lang: 'kk' })
    expect($('.hero .cta').textContent).toContain('Саяхатты бастау')
    expect(host.shadowRoot.querySelector('.wh').getAttribute('lang')).toBe('kk')
    api.setLang('ru')
    expect($('.hero .cta').textContent).toContain('Начать путешествие')
  })

  it('reload: прогресс, пришедший позже, виден на главной', () => {
    mount()
    expect($('.hero .cta').textContent).toContain('Начать путешествие')
    state = { stars: { 'A0|a1_like': 1 }, pl: {}, comets: {}, ach: {}, days: {}, gals: {}, games: 1, cleared: 0, pure: 0, last: 'nope' }
    api.reload()
    expect($('#topStars').textContent).toBe('1')
  })

  // Поля заливки идут в разметку: Shadow DOM скрипты не изолирует, а прототип приходит из админки.
  it('id уровня из заливки экранируется, а не становится разметкой', () => {
    const evil = 'A0<img src=x onerror=alert(1)>'
    const b = JSON.parse(JSON.stringify(bundle))
    b.db.levels[0].id = evil
    b.db[evil] = b.db.A0
    mount({ bundle: b })
    const card = host.shadowRoot.querySelector('.lvl')
    expect(card.querySelector('img')).toBeNull()
    expect(card.querySelector('.code').textContent).toBe(evil)
  })

  it('ссылки и кнопки не трогают адрес страницы', () => {
    const before = window.location.href
    mount()
    openFirstLesson()
    click($('[data-a="close"]'))
    expect($('#scrim')).toBeNull()
    expect(window.location.href).toBe(before)
  })

  it('destroy снимает разметку, глушит звук и слушатели документа', () => {
    const stopAudio = vi.fn()
    mount({ stopAudio })
    openFirstLesson()
    click($('[data-a="playXw"]'))
    api.destroy()
    expect(host.shadowRoot.querySelector('.wh').innerHTML).toBe('')
    expect(stopAudio).toHaveBeenCalled()
    // буквы с клавиатуры документа больше никуда не идут
    expect(() => key(document.body, 'a')).not.toThrow()
    api = null
  })

  it('исходник не трогает document, хранилище и голос браузера напрямую', () => {
    expect(source).not.toMatch(/\bdocument\./)
    expect(source).not.toMatch(/localStorage|sessionStorage/)
    expect(source).not.toMatch(/speechSynthesis|new Audio\(/)
    expect(source).not.toMatch(/(?<![.\w])addEventListener\(/)
  })
})
