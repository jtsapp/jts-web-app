// @vitest-environment jsdom
//
// Порт Tenses World сверяется с оракулом самого прототипа
// (scripts/tenses/extract-oracle.js): те же экраны, Formula Lab, сравнение
// ответа и все 26 наборов практики проходятся тем же ходом (collect), и
// результат обязан совпасть. Красный тест здесь значит, что порт разъехался с
// исходником, — чинить порт.
//
// TENSES_ORACLE_FULL=1 — оракул снимается с копии прототипа заново и
// сверяется целиком, со всеми карточками заданий (в файле — образцы и
// отпечатки): так видно, в каком месте разошлось.
// TENSES_HTML=<путь к полному прототипу> — та же сверка с полным файлом (его
// в репозиторий не кладём; бандл собирается из него здесь же).
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import oracleLib from '../../../scripts/tenses/extract-oracle.js'
import fixtureLib from '../../../scripts/tenses/make-fixture.js'
import { mountTenses } from './engine.js'

const { collect, answerItem, mulberry32, extractOracle, SEED } = oracleLib
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
  vi.restoreAllMocks()
})

function mount(b, extra = {}) {
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = function () {}
  host = document.createElement('div')
  document.body.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<div class="tws"><div id="tw-root"></div></div>'
  let state = null
  const cfg = {
    bundle: b,
    progress: () => (state ? JSON.parse(JSON.stringify(state)) : null),
    onProgress: (s) => {
      state = JSON.parse(JSON.stringify(s))
    },
    speak: (text, o) => o.onEnd?.(),
    ...extra,
  }
  api = mountTenses(shadow.querySelector('.tws'), cfg)
  return { root: shadow.querySelector('.tws'), shadow, state: () => state || {} }
}

/** Пройти порт тем же ходом, что прототип в оракуле. */
function collectPort(b, opts) {
  let rng = mulberry32(SEED)
  vi.spyOn(Math, 'random').mockImplementation(() => rng())
  const { root, state } = mount(b)
  const out = collect(
    {
      TW: api.TW,
      root: () => root.querySelector('#tw-root'),
      $: (s) => root.querySelector(s),
      $$: (s) => [...root.querySelectorAll(s)],
      // У прототипа экран открывался replaceState + route: тот же адрес — перерисовать заново.
      open: (h) => (api.snapshot().hash === h ? api.TW.route() : api.go(h)),
      hash: () => api.snapshot().hash,
      seed: (s) => {
        rng = mulberry32(s)
      },
      state,
    },
    opts,
  )
  return { seed: SEED, ...out }
}

function expectSame(got, want) {
  for (const k of ['meta', 'timelines', 'lab', 'same', 'hub', 'hubRu', 'hubKz', 'labClicks', 'tenseKz', 'path']) expect(got[k], k).toEqual(want[k])
  for (const id of Object.keys(want.tense)) expect(got.tense[id], `страница ${id}`).toEqual(want.tense[id])
  for (const id of Object.keys(want.sets)) {
    const g = got.sets[id]
    const w = want.sets[id]
    expect(g.head, `${id}: шапка`).toBe(w.head)
    w.log.forEach((x, i) => expect(g.log[i], `${id}: задание ${i} (${bundle.TW.PRACTICE.SETS[id]?.items[i]?.t})`).toEqual(x))
    expect(g, id).toEqual(w)
  }
  expect(got).toEqual(want)
}

describe('Tenses World: порт = прототип', () => {
  it('экраны, Formula Lab, сравнение ответа и все наборы практики совпадают с оракулом', () => {
    expectSame(collectPort(bundle), oracle)
  }, 60000)

  it.runIf(process.env.TENSES_ORACLE_FULL)('целиком, со всеми карточками заданий', () => {
    const want = extractOracle(fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8'), { full: true })
    expectSame(collectPort(bundle, { full: true }), want)
  }, 120000)
})

// Полный прототип: бандл собирается здесь же (данные — исполнением блоков, как у бэкенда), оракул — с него.
describe.runIf(process.env.TENSES_HTML)('Tenses World: полный прототип', () => {
  it('совпадает с портом, и движок файла — тот, что перенесён', () => {
    const html = fs.readFileSync(process.env.TENSES_HTML, 'utf8')
    expect(fixtureLib.engineSha(html).sha).toBe(fixtureLib.ENGINE_SHA)
    const data = fixtureLib.runData(html)
    const VIDEOS = Object.fromEntries(Object.keys(data.TW.VIDEOS).map((id) => [id, { src: `/v/${id}.mp4`, embedded: false, poster: `/v/${id}.jpg` }]))
    const want = extractOracle(html)
    expectSame(collectPort({ release: 1, TW: { ...data.TW, VIDEOS }, TENSES_DATA: data.TENSES_DATA }), want)
  }, 300000)
})

describe('Tenses World: связь с приложением', () => {
  it('фикстура: движок байт в байт с прототипом 10.11.2026', () => {
    const html = fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8')
    expect(fixtureLib.engineSha(html)).toEqual({ sha: fixtureLib.ENGINE_SHA, count: 5 })
    // CRLF той же копии — тот же хэш (бэкенд приводит переводы строк к \n)
    expect(fixtureLib.engineSha(html.replace(/\n/g, '\r\n')).sha).toBe(fixtureLib.ENGINE_SHA)
  })

  it('хаб — карта времён, логотипа нет, язык — на корне раздела', () => {
    const { root } = mount(bundle)
    expect(root.querySelectorAll('.map .tile')).toHaveLength(12)
    expect(root.querySelector('.logo')).toBeNull()
    expect(root.getAttribute('lang')).toBe('en')
    expect(document.documentElement.getAttribute('lang')).not.toBe('kk')
  })

  it('язык: стартовый из cfg.lang, смена — на корне и в onLang, <html> не трогается', () => {
    const onLang = vi.fn()
    const before = document.documentElement.getAttribute('lang')
    const { root } = mount(bundle, { lang: 'kk', onLang })
    expect(root.getAttribute('lang')).toBe('kk')
    expect(root.querySelector('.langs [data-lang="kz"]').classList.contains('on')).toBe(true)
    root.querySelector('.langs [data-lang="ru"]').click()
    expect(onLang).toHaveBeenLastCalledWith('ru')
    expect(root.getAttribute('lang')).toBe('ru')
    expect(root.querySelector('.hub-hero h1').textContent).toContain('Мир английских')
    expect(document.documentElement.getAttribute('lang')).toBe(before)
  })

  it('ссылки #/… ведут роутер движка, адрес страницы не меняется', () => {
    const { root } = mount(bundle)
    const before = window.location.href
    root.querySelector('a.tile[href="#/t/past-simple"]').click()
    expect(api.snapshot().hash).toBe('#/t/past-simple')
    expect(window.location.href).toBe(before)
    expect(root.querySelector('.lesson-head h1').textContent).toBe('Past Simple')
    // машина времени Formula Lab — тоже роутером движка
    root.querySelector('#lab-box [data-go="future-simple"]').click()
    expect(api.snapshot().hash).toBe('#/t/future-simple/lab')
    expect(window.location.href).toBe(before)
  })

  it('видео — ссылкой бакета и постером; без записи — заглушка «видео нет», без VIDEOS — «скоро»', () => {
    const b = JSON.parse(JSON.stringify(bundle))
    b.TW.VIDEOS['past-simple'].src = null
    delete b.TW.VIDEOS['future-simple']
    const { root } = mount(b)
    api.go('#/t/present-simple')
    const v = root.querySelector('.cinema video')
    expect(v.getAttribute('poster')).toBe(bundle.TW.VIDEOS['present-simple'].poster)
    expect(v.querySelector('source').getAttribute('src')).toBe(bundle.TW.VIDEOS['present-simple'].src)
    api.go('#/t/past-simple')
    expect(root.querySelector('.cinema video')).toBeNull()
    expect(root.querySelector('.cinema-screen .pending-in h3').textContent).toBe('The video could not be loaded.')
    api.go('#/t/future-simple')
    expect(root.querySelector('.cinema.pending h3').textContent).toBe('The video lesson is coming soon')
  })

  it('«назад» на хабе — cfg.onExit; без него кнопки нет', () => {
    const onExit = vi.fn()
    const { root } = mount(bundle, { onExit })
    root.querySelector('[data-act="exit"]').click()
    expect(onExit).toHaveBeenCalled()
    api.go('#/t/present-simple')
    expect(root.querySelector('[data-act="exit"]')).toBeNull()
    api.destroy()
    api = null
    host.remove()
    const second = mount(bundle)
    expect(second.root.querySelector('[data-act="exit"]')).toBeNull()
  })

  it('ответы — в onAnswer, кроме «работы над ошибками»; итог — в прогресс', () => {
    const answers = []
    const { root, state } = mount(bundle, { onAnswer: (ok) => answers.push(ok) })
    api.go('#/practice/c-ps-pc')
    const items = bundle.TW.PRACTICE.SETS['c-ps-pc'].items
    const env = { TW: api.TW, $: (s) => root.querySelector(s), $$: (s) => [...root.querySelectorAll(s)] }
    for (const it of items) {
      answerItem(env, it, false)
      root.querySelector('#pr-card [data-a=next]').click()
    }
    expect(answers).toEqual(items.map(() => false))
    expect(state().practice['c-ps-pc']).toMatchObject({ done: true, best: 0 })
    root.querySelector('#pr-card [data-a=retry]').click()
    answerItem(env, items[0], true)
    expect(answers).toHaveLength(items.length)
  })

  it('«Listen» — через cfg.speak, повторное нажатие гасит; смена экрана глушит звук', () => {
    const speak = vi.fn()
    const stopSpeech = vi.fn()
    const { root } = mount(bundle, { speak, stopSpeech })
    api.go('#/practice/recognise')
    root.querySelector('#pr-card .pr-opt').click()
    const btn = root.querySelector('#pr-card [data-a=listen]')
    btn.click()
    expect(speak).toHaveBeenCalledWith(expect.stringMatching(/\w/), expect.objectContaining({ onEnd: expect.any(Function) }))
    expect(btn.classList.contains('on')).toBe(true)
    btn.click()
    expect(btn.classList.contains('on')).toBe(false)
    expect(speak).toHaveBeenCalledTimes(1)
    // своя фраза звучит — смена экрана её глушит
    btn.click()
    stopSpeech.mockClear()
    api.go('#/')
    expect(stopSpeech).toHaveBeenCalled()
    // раздел молчит — чужой звук на общем <audio> (голос Луны) смена экрана не трогает
    stopSpeech.mockClear()
    api.go('#/practice')
    expect(stopSpeech).not.toHaveBeenCalled()
  })

  it('прогресс читается при каждой отрисовке: снимок сервера виден на следующем экране', () => {
    let state = null
    const { root } = mount(bundle, { progress: () => state })
    expect(root.querySelector('a.tile.visited')).toBeNull()
    state = { visited: { 'past-simple': 1 }, practice: { 'past-simple': { done: true, best: 9, total: 11 } }, last: 'past-simple' }
    api.go('#/practice')
    api.go('#/')
    expect(root.querySelector('a.tile.visited').getAttribute('href')).toBe('#/t/past-simple')
    expect(root.querySelector('.hero-actions a.btn').textContent).toContain('Past Simple')
  })

  it('исходник не трогает адрес, <html>, document-слушатели и хранилища', () => {
    expect(source).not.toMatch(/\blocation\.(hash|href|assign|replace)/)
    expect(source).not.toMatch(/history\.(push|replace)State/)
    expect(source).not.toMatch(/document\.documentElement/)
    expect(source).not.toMatch(/document\.(add|remove)EventListener/)
    expect(source).not.toMatch(/document\.(body|getElementById|querySelector)/)
    expect(source).not.toMatch(/window\.(TW|TENSES_DATA)\b/)
    expect(source).not.toMatch(/localStorage|sessionStorage/)
    expect(source).not.toMatch(/speechSynthesis\.|SpeechSynthesisUtterance/)
    expect(source).not.toMatch(/addEventListener\("hashchange"/)
  })

  it('destroy снимает разметку, атрибут языка, слушатели и глушит звук', () => {
    const stopSpeech = vi.fn()
    const { root } = mount(bundle, { speak: vi.fn(), stopSpeech })
    api.go('#/practice/recognise')
    root.querySelector('#pr-card .pr-opt').click()
    root.querySelector('#pr-card [data-a=listen]').click()
    api.destroy()
    expect(root.innerHTML).toBe('')
    expect(root.hasAttribute('lang')).toBe(false)
    expect(stopSpeech).toHaveBeenCalled()
    // клавиши 1–4 прототипа после destroy разметку не трогают
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    expect(root.innerHTML).toBe('')
    api = null
  })
})
