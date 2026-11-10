// @vitest-environment jsdom
//
// Порт Punctuation World сверяется с оракулом самого прототипа
// (scripts/punctuation/extract-oracle.js): те же разбор банка, сборка
// приключений, главная, острова, уроки и приключения целиком проходятся тем же
// ходом (collect) в том же окружении (свои часы, сид, «меньше движения»), и
// результат обязан совпасть. Красный тест здесь значит, что порт разъехался с
// исходником — чинить порт.
//
// PUNCTUATION_HTML=<путь к полному прототипу> — та же сверка на всех 20
// страницах (полный прототип в репозиторий не кладём; бандл собирается из него
// здесь же, как у бэкенда: картинки — ссылками по содержимому).
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import oracleLib from '../../../scripts/punctuation/extract-oracle.js'
import fixtureLib from '../../../scripts/punctuation/make-fixture.js'
import { mountPunctuation } from './engine.js'

const { collect, mulberry32, virtualClock, setupWindow, extractOracle, POLICIES, SEED } = oracleLib
const DIR = path.join(__dirname, '__fixtures__')
const bundle = JSON.parse(fs.readFileSync(path.join(DIR, 'bundle.json'), 'utf8'))
const oracle = JSON.parse(fs.readFileSync(path.join(DIR, 'oracle.json'), 'utf8'))
const source = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8')

const saved = {}
beforeEach(() => {
  for (const k of ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'scrollTo']) saved[k] = window[k]
  saved.random = Math.random
  // в jsdom нет matchMedia, а движок спрашивает «меньше движения» (как у браузера по умолчанию — нет)
  window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })
  // прокрутки у jsdom нет — он только ругается в консоль
  window.scrollTo = () => {}
})

let api = null
let host = null
afterEach(() => {
  api?.destroy()
  api = null
  host?.remove()
  host = null
  for (const [k, v] of Object.entries(saved)) if (k !== 'random') window[k] = v
  Math.random = saved.random
  delete window.performance.now
  vi.restoreAllMocks()
})

/** Окружение оракула (часы, сид, «меньше движения»); rng меняет seed(). */
function oracleWindow() {
  const box = { rng: mulberry32(SEED) }
  const clock = virtualClock()
  setupWindow(window, { clock, random: () => box.rng() })
  return { clock, box }
}

function mount(b, extra = {}) {
  host = document.createElement('div')
  document.body.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<div class="punct"><div id="app"></div></div>'
  const store = { progress: null, prefs: null, runs: null }
  const answers = []
  const cfg = {
    bundle: b,
    progress: () => store.progress,
    onProgress: (s) => (store.progress = JSON.parse(JSON.stringify(s))),
    prefs: () => store.prefs,
    onPrefs: (s) => (store.prefs = JSON.parse(JSON.stringify(s))),
    runs: () => store.runs,
    onRuns: (s) => (store.runs = JSON.parse(JSON.stringify(s))),
    onAnswer: (ok) => answers.push(ok),
    speak: (text, o) => o.onEnd?.(),
    ...extra,
  }
  const root = shadow.querySelector('.punct')
  api = mountPunctuation(root, cfg)
  return { root, store, answers }
}

/** Пройти порт тем же ходом, что прототип в оракуле. */
async function collectPort(b) {
  const { clock, box } = oracleWindow()
  const { root } = mount(b)
  const out = await collect({
    $: (s) => root.querySelector(s),
    all: (s) => root.querySelectorAll(s),
    app: () => root.querySelector('#app'),
    root: () => root,
    trState: () => root.dataset.tr,
    hash: () => api.snapshot().hash,
    CSS: window.CSS,
    open: (h) => api.go(h),
    seed: (s) => {
      box.rng = mulberry32(s)
    },
    wait: (ms) => clock.advance(Math.max(1, ms)),
    state: () => api.debug(),
    fns: () => api.debug(),
    data: () => api.debug(),
  })
  return { seed: SEED, ...out }
}

function expectSame(got, want) {
  expect(got.pure).toEqual(want.pure)
  expect(got.runs).toEqual(want.runs)
  for (const k of Object.keys(want.home)) expect(got.home[k], `главная: ${k}`).toBe(want.home[k])
  for (const id of Object.keys(want.lesson)) want.lesson[id].forEach((html, i) => expect(got.lesson[id][i], `урок ${id}, снимок ${i}`).toBe(html))
  for (const id of Object.keys(want.games)) {
    for (const name of Object.keys(want.games[id])) {
      const g = got.games[id][name]
      const w = want.games[id][name]
      w.log.forEach((step, i) => expect(g.log[i], `страница ${id} ${name}, шаг ${i}`).toEqual(step))
      expect(g, `страница ${id} ${name}`).toEqual(w)
    }
  }
}

describe('Punctuation World: порт = прототип', () => {
  it('разбор банка, сборка приключений, главная, уроки и приключения целиком совпадают с оракулом', async () => {
    expectSame(await collectPort(bundle), oracle)
  }, 60000)
})

// Полный прототип: бандл собирается здесь же (данные — объявлениями, картинки — ссылками), оракул — с него.
describe.runIf(process.env.PUNCTUATION_HTML)('Punctuation World: весь курс', () => {
  it('все 20 страниц совпадают с прототипом', async () => {
    const html = fs.readFileSync(process.env.PUNCTUATION_HTML, 'utf8')
    const full = fixtureLib.bundleOf(fixtureLib.dataOf(html))
    const want = await extractOracle(html)
    expectSame(await collectPort(full), want)
  }, 900000)
})

describe('Punctuation World: связь с приложением', () => {
  it('главная — острова, картинки — ссылками бандла, логотипа нет, srcset у мира — как у внешних картинок', () => {
    const { root } = mount(bundle)
    expect(root.querySelector('.hero h1').textContent).toBe('Punctuation World')
    expect(root.querySelectorAll('.isle-tab')).toHaveLength(5)
    expect(root.innerHTML).toContain('/__punct-media/')
    expect(root.innerHTML).not.toContain('data:image')
    expect(root.querySelector('.logo')).toBeNull()
    expect(root.querySelector('.hero-art').getAttribute('srcset')).toBe(`${bundle.ART.worldM} 1280w, ${bundle.ART.world} 2400w`)
    expect(root.style.getPropertyValue('--sprite')).toBe(`url("${bundle.ART.marks}")`)
  })

  it('кнопки data-go и ссылки #/… ведут роутер раздела, #s-… — прокрутка внутри тени; адрес страницы не меняется', () => {
    const { root } = mount(bundle)
    const before = window.location.href
    root.querySelector('[data-act="isle"][data-k="A2"]').click()
    expect(api.snapshot().hash).toBe('#/islands/A2')
    root.querySelector('.topic[data-go="#/lesson/7"]').click()
    expect(api.snapshot().hash).toBe('#/lesson/7')
    expect(root.querySelector('.l-head h1').textContent).toBe(bundle.LESSONS.TOPICS[1].title)
    const scrolled = vi.fn()
    root.querySelector('#s-why').scrollIntoView = scrolled
    root.querySelector('.stepnav a[href="#s-why"]').click()
    expect(scrolled).toHaveBeenCalled()
    expect(api.snapshot().hash).toBe('#/lesson/7')
    expect(window.location.href).toBe(before)
  })

  it('«назад» на главной раздела зовёт onExit; без onExit кнопки нет', () => {
    const onExit = vi.fn()
    const { root } = mount(bundle, { onExit })
    root.querySelector('#pu-exit').click()
    expect(onExit).toHaveBeenCalled()
    api.go('#/lesson/1')
    expect(root.querySelector('#pu-exit')).toBeNull()
    api.destroy()
    host.remove()
    const second = mount(bundle)
    expect(second.root.querySelector('#pu-exit')).toBeNull()
  })

  it('перевод — на корне раздела и в настройках устройства, а не на <html>', () => {
    const { root, store } = mount(bundle)
    api.go('#/lesson/1')
    root.querySelector('[data-act="tr"][data-k="kk"]').click()
    expect(root.dataset.tr).toBe('kk')
    expect(document.documentElement.dataset.tr).toBeUndefined()
    expect(store.prefs).toEqual({ tr: 'kk', mute: false, luna: false })
    expect(store.progress).not.toHaveProperty('tr')
    root.querySelector('[data-act="tr"][data-k="kk"]').click()
    expect(root.dataset.tr).toBe('')
  })

  it('Луна читает голосом cfg.speak (текст очищен, как в прототипе); та же кнопка — стоп; без звука — молчит', () => {
    const calls = []
    const stopSpeech = vi.fn()
    const { root } = mount(bundle, { speak: (t, o) => calls.push([t, o]), stopSpeech })
    api.go('#/lesson/7')
    const btn = root.querySelector('.hear[data-act="say"]')
    btn.click()
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).not.toMatch(/[“”‘]/)
    expect(btn.classList.contains('on')).toBe(true)
    btn.click()
    expect(calls).toHaveLength(1)
    expect(btn.classList.contains('on')).toBe(false)
    btn.click()
    calls[1][1].onEnd()
    expect(btn.classList.contains('on')).toBe(false)
    root.querySelector('[data-act="mute"]').click()
    btn.click()
    expect(calls).toHaveLength(2)
    expect(stopSpeech).toHaveBeenCalled()
  })

  it('прогресс: прочитанное и звёзды — в onProgress, недоигранное приключение — в onRuns; перечитывается на экране', async () => {
    const { clock, box } = oracleWindow()
    box.rng = mulberry32(7)
    const { root, store, answers } = mount(bundle)
    api.go('#/lesson/1')
    expect(store.progress.read).toEqual({ 1: 1 })
    // снимок сервера пришёл: звезда страницы 7 с другого устройства
    store.progress = { ...store.progress, p: { 7: 3 } }
    api.go('#/')
    expect(root.querySelector('.top .pill b').textContent).toBe('3')
    // приключение: стадия сохраняется на устройство, итог — звёзды
    api.go('#/play/1')
    await clock.advance(50)
    expect(store.runs[1]).toMatchObject({ s: 0, res: [] })
    expect(store.progress).not.toHaveProperty('run')
    // каждое задание — в навык: пройти до конца, отвечая верно
    for (let guard = 0; guard < 4000 && !root.querySelector('.scard.win'); guard++) {
      const { W } = api.debug()
      const w = W.wait
      if (!w) await clock.advance(20)
      else if (w.kind === 'ok') root.querySelector('[data-a3="ok"]').click()
      else if (w.kind === 'pick') {
        const raft = !!root.querySelector('.rafts')
        const opt = [...root.querySelectorAll('.obj[data-v],.raft[data-v]')].find((b) => (raft ? b.dataset.v === 'f' : W.ans.includes(b.dataset.v)))
        opt.click()
      } else if (w.kind === 'send') {
        for (const g of W.stitch.gaps) {
          if (g.v === g.a) continue
          root.querySelector(`.gap[data-k="${g.id}"]`).click()
          root.querySelector(`.picker [data-v="${CSS.escape(g.a)}"]`).click()
        }
        root.querySelector('[data-a3="send"]').click()
      }
      await clock.advance(1)
    }
    expect(root.querySelector('.scard.win .big-stars i.on')).not.toBeNull()
    expect(store.progress.p).toEqual({ 1: 3, 7: 3 })
    expect(store.runs).toEqual({})
    expect(answers.length).toBe(api.debug().G.res.length)
    expect(answers.every(Boolean)).toBe(true)
  }, 30000)

  it('исходник не трогает адрес, <html>, document-слушатели и чужие хранилища', () => {
    expect(source).not.toMatch(/\blocation\.(hash|href|assign|replace)/)
    expect(source).not.toMatch(/history\.(push|replace)State/)
    expect(source).not.toMatch(/document\.documentElement/)
    expect(source).not.toMatch(/document\.(add|remove)EventListener/)
    expect(source).not.toMatch(/document\.body/)
    expect(source).not.toMatch(/document\.getElementById/)
    expect(source).not.toMatch(/localStorage|sessionStorage/)
    expect(source).not.toMatch(/speechSynthesis\.|SpeechSynthesisUtterance/)
    expect(source).not.toMatch(/\bconfirm\(/)
    expect(source).not.toMatch(/addEventListener\("hashchange"/)
    expect(POLICIES).toBeTruthy()
  })

  it('destroy снимает разметку, глушит голос и снимает атрибуты с корня', () => {
    const stopSpeech = vi.fn()
    const { root } = mount(bundle, { stopSpeech })
    api.go('#/lesson/1')
    root.querySelector('[data-act="tr"][data-k="ru"]').click()
    api.destroy()
    expect(root.innerHTML).toBe('')
    expect(root.dataset.tr).toBeUndefined()
    expect(root.style.getPropertyValue('--sprite')).toBe('')
    expect(stopSpeech).toHaveBeenCalled()
    api.go('#/lesson/7')
    expect(root.innerHTML).toBe('')
    api = null
  })
})
