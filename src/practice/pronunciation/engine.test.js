// @vitest-environment jsdom
//
// Порт Pronunciation World сверяется с оракулом самого прототипа
// (scripts/pronunciation/extract-oracle.js): те же экраны, проверка и раунды
// Echo Gates проходятся тем же ходом (collect), и результат обязан совпасть.
// Красный тест здесь значит, что порт разъехался с исходником — чинить порт.
//
// Время — поддельное: прототип в оракуле играл раунды в реальном времени с
// P._fast, порт проходит то же за доли секунды. Звука нет: запись «не
// загрузилась», голос «сказал» мгновенно — как прототип без звука в jsdom.
//
// PRONUNCIATION_HTML=<путь к полному прототипу> — та же сверка на всех 44 темах
// (полный прототип в репозиторий не кладём; бандл собирается из него здесь же).
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import oracleLib from '../../../scripts/pronunciation/extract-oracle.js'
import { mountPronunciation } from './engine.js'

const { collect, mulberry32, fakeCanvas, extractOracle, SEED } = oracleLib
const DIR = path.join(__dirname, '__fixtures__')
const bundle = JSON.parse(fs.readFileSync(path.join(DIR, 'bundle.json'), 'utf8'))
const oracle = JSON.parse(fs.readFileSync(path.join(DIR, 'oracle.json'), 'utf8'))
const source = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8')

let api = null
let host = null
afterEach(() => {
  api?.destroy()
  api = null
  host?.remove()
  host = null
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function mount(b, extra = {}) {
  host = document.createElement('div')
  document.body.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<div class="pron"><div id="app"></div></div>'
  let state = null
  const cfg = {
    bundle: b,
    progress: () => (state ? JSON.parse(JSON.stringify(state)) : null),
    onProgress: (s) => {
      state = JSON.parse(JSON.stringify(s))
    },
    playUrl: (url, o) => o.onFail?.('error'),
    speak: (text, o) => o.onEnd?.(),
    fast: true,
    ...extra,
  }
  api = mountPronunciation(shadow.querySelector('.pron'), cfg)
  return { root: shadow.querySelector('.pron'), state: () => state }
}

/** Пройти порт тем же ходом, что прототип в оракуле. */
async function collectPort(b) {
  let rng = mulberry32(SEED)
  vi.spyOn(Math, 'random').mockImplementation(() => rng())
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  fakeCanvas(window)
  const { root } = mount(b)
  const P = api.P
  const audio = {}
  const out = await collect({
    P,
    $: (s) => root.querySelector(s),
    // У прототипа экран открывался replaceState + route: тот же адрес — перерисовать заново.
    open: (h) => (api.snapshot().hash === h ? P.route() : api.go(h)),
    seed: (s) => {
      rng = mulberry32(s)
    },
    wait: (ms) => vi.advanceTimersByTimeAsync(Math.max(1, ms)),
    audioOf: (text, acc) => {
      audio[`${acc || ''}|${text}`] = P.audioId(P.cue(text), acc || undefined)
    },
  })
  Object.assign(out.audio, audio)
  return { seed: SEED, ...out }
}

function expectSame(got, want) {
  expect(got.topics).toEqual(want.topics)
  expect(got.audio).toEqual(want.audio)
  expect(got.home).toEqual(want.home)
  for (const id of Object.keys(want.learn)) {
    want.learn[id].screens.forEach((html, i) => expect(got.learn[id].screens[i], `${id} экран ${i}`).toBe(html))
    expect(got.learn[id]).toEqual(want.learn[id])
  }
  expect(got.check).toEqual(want.check)
  for (const id of Object.keys(want.game)) {
    want.game[id].forEach((r, i) => expect(got.game[id][i], `${id} раунд ${i}`).toEqual(r))
  }
}

describe('Pronunciation World: порт = прототип', () => {
  it('экраны, проверка, id записей и раунды Echo Gates совпадают с оракулом', async () => {
    expectSame(await collectPort(bundle), oracle)
  }, 60000)
})

// Полный прототип: бандл собирается здесь же (данные — исполнением чанков, медиа — ссылки), оракул — с него.
describe.runIf(process.env.PRONUNCIATION_HTML)('Pronunciation World: весь курс', () => {
  it('все 44 темы совпадают с прототипом', async () => {
    const html = fs.readFileSync(process.env.PRONUNCIATION_HTML, 'utf8')
    const script = html.replace(/\r\n?/g, '\n').match(/<script>([\s\S]*?)<\/script>/)[1]
    const box = { window: {} }
    box.window.window = box.window
    vm.createContext(box.window)
    const isData = (c) => c.startsWith('window.PRON') || /PRON\.add(Level|Topics)\(/.test(c) || /^PRON\.(sounds|soundLex|featureText|soundTips) =/m.test(c)
    for (const c of script.split('\n;\n').filter(isData)) vm.runInContext(c, box.window)
    const D = box.window.PRON
    const media = (m, ext) => Object.fromEntries(Object.keys(m).map((k) => [k, `/__pron-media/${encodeURIComponent(k)}.${ext}`]))
    const full = { release: 1, levels: D.levels, topics: D.v2, sounds: D.sounds, soundLex: D.soundLex, featureText: D.featureText, soundTips: D.soundTips, assets: media(D.ASSETS, 'webp'), gameAudio: media(D.gameAudio, 'mp3') }
    const want = await extractOracle(html)
    expectSame(await collectPort(JSON.parse(JSON.stringify(full))), want)
  }, 900000)
})

describe('Pronunciation World: связь с приложением', () => {
  it('главная — карта уровней, картинки — ссылками бандла, логотипа нет', () => {
    const { root } = mount(bundle)
    expect(root.querySelector('.world .w-hero')).not.toBeNull()
    expect(root.innerHTML).toContain('/__pron-media/')
    expect(root.querySelector('.logo')).toBeNull()
    expect(root.dataset.tr).toBe('en')
  })

  it('ссылки #/… ведут роутер движка, адрес страницы не меняется', () => {
    const { root } = mount(bundle)
    const before = window.location.href
    const link = root.querySelector('a[href^="#/learn/"]')
    link.click()
    expect(api.snapshot().hash).toBe(link.getAttribute('href'))
    expect(window.location.href).toBe(before)
    expect(root.querySelector('.learnv')).not.toBeNull()
  })

  it('«назад» на главной раздела зовёт onExit', () => {
    const onExit = vi.fn()
    const { root } = mount(bundle, { onExit })
    root.querySelector('#pr-exit').click()
    expect(onExit).toHaveBeenCalled()
  })

  it('перевод — на корне раздела и во вкладке, а не на <html>', () => {
    const { root } = mount(bundle)
    root.querySelector('[data-trbtn="kk"]').click()
    expect(root.dataset.tr).toBe('kk')
    expect(document.documentElement.dataset.tr).toBeUndefined()
    expect(sessionStorage.getItem('jts-pron-tr')).toBe('kk')
    root.querySelector('[data-trbtn="kk"]').click()
    expect(root.dataset.tr).toBe('en')
  })

  it('запись звучит через playUrl, без записи — голосом speak (с акцентом и темпом)', () => {
    const playUrl = vi.fn((url, o) => o.onStart?.())
    const speak = vi.fn()
    mount(bundle, { playUrl, speak })
    const P = api.P
    P.play('a black board')
    expect(playUrl.mock.calls[0][0]).toBe(bundle.gameAudio[P.audioId('a black board')])
    P.play('no such clip here', { accent: 'GA', slow: true })
    expect(speak).toHaveBeenCalledWith('no such clip here', expect.objectContaining({ accent: 'GA', slow: true }))
  })

  it('запись не загрузилась — тот же текст голосом', () => {
    const speak = vi.fn((t, o) => o.onEnd())
    mount(bundle, { playUrl: (u, o) => o.onFail('error'), speak })
    return api.P.play('a black board').then(() => expect(speak).toHaveBeenCalledWith('a black board', expect.anything()))
  })

  it('прогресс: экран перечитывает его, итог урока уходит в onProgress без tr', () => {
    const { root, state } = mount(bundle)
    const T = bundle.levels[0].modules[0]
    api.go(`#/learn/${T.id}/99`)
    expect(root.querySelector('.l-end')).not.toBeNull()
    expect(state().learned[T.id]).toBe(true)
    expect(state()).not.toHaveProperty('tr')
  })

  it('исходник не трогает адрес, <html>, document-слушатели и чужие хранилища', () => {
    expect(source).not.toMatch(/\blocation\.(hash|href|assign|replace)/)
    expect(source).not.toMatch(/history\.(push|replace)State/)
    expect(source).not.toMatch(/document\.documentElement/)
    expect(source).not.toMatch(/document\.(add|remove)EventListener/)
    expect(source).not.toMatch(/document\.body/)
    expect(source).not.toMatch(/window\.PRON/)
    expect(source).not.toMatch(/localStorage\./)
    expect(source).not.toMatch(/speechSynthesis\./)
    expect(source).not.toMatch(/new Audio\(/)
    expect(source).not.toMatch(/\bconfirm\(/)
    for (const m of source.matchAll(/sessionStorage\.(?:get|set)Item\(([^,)]+)/g)) expect(m[1].trim()).toBe('TRK')
  })

  it('destroy снимает разметку, глушит звук и отпускает контекст', () => {
    const stopSpeech = vi.fn()
    const { root } = mount(bundle, { stopSpeech })
    api.destroy()
    expect(root.innerHTML).toBe('')
    expect(root.dataset.tr).toBeUndefined()
    expect(stopSpeech).toHaveBeenCalled()
    api = null
  })
})
