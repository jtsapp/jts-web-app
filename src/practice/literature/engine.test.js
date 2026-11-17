// @vitest-environment jsdom
//
// Порт Literature World сверяется с оракулом самого прототипа
// (scripts/literature/extract-oracle.js): те же экраны, пьесы, тексты,
// произведения, слова, задания и мастерская проходятся тем же ходом (collect)
// с тем же зерном случайных чисел, и результат обязан совпасть. Красный тест
// здесь значит, что порт разъехался с исходником, — чинить порт (замены
// scripts/literature/build-engine.js), а не оракул.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import oracleLib from '../../../scripts/literature/extract-oracle.js'
import proto from '../../../scripts/literature/proto.js'
import bundleLib from '../../../scripts/literature/make-bundle.js'
import builder from '../../../scripts/literature/build-engine.js'
import { ENGINE_SHA, mountLiterature, normalizeLiteratureLang } from './engine.js'

const { collect, stubs, seeded, tick } = oracleLib
const DIR = path.join(__dirname, '__fixtures__')
const bundle = JSON.parse(fs.readFileSync(path.join(DIR, 'bundle.json'), 'utf8'))
const oracle = JSON.parse(fs.readFileSync(path.join(DIR, 'oracle.json'), 'utf8'))
const html = proto.readHtml(path.join(DIR, 'prototype-mini.html'))
const source = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8').replace(/\r\n/g, '\n')

const RANDOM = Math.random
let api = null
let host = null
afterEach(() => {
  api?.destroy()
  api = null
  host?.remove()
  host = null
  Math.random = RANDOM
})

function mount(extra = {}) {
  stubs(window)
  Math.random = seeded()
  host = document.createElement('div')
  document.body.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<div class="lw"></div>'
  const root = shadow.querySelector('.lw')
  // хранилище — как localStorage прототипа: что записано, то и читается
  const box = { state: null, drafts: null, lang: [], answers: [], said: [], scroll: [] }
  api = mountLiterature(root, {
    bundle,
    progress: () => (box.state ? JSON.parse(JSON.stringify(box.state)) : null),
    onProgress: (s) => {
      box.state = JSON.parse(JSON.stringify(s))
    },
    drafts: () => box.drafts,
    onDrafts: (d) => {
      box.drafts = JSON.parse(JSON.stringify(d))
    },
    onLang: (l) => box.lang.push(l),
    onAnswer: (kind, ok) => box.answers.push([kind, ok]),
    scrollTo: (y) => box.scroll.push(y),
    ...extra,
  })
  return { root, shadow, box }
}

const $ = (root, s) => root.querySelector(s)
const $$ = (root, s) => [...root.querySelectorAll(s)]

describe('порт против оракула прототипа', () => {
  it('фикстура — тот же движок, что перенесён (хэш спеки), а бандл — её данные', () => {
    expect(proto.engineSha(html)).toEqual({ sha: proto.ENGINE_SHA, count: 1 })
    expect(ENGINE_SHA).toBe(proto.ENGINE_SHA)
    expect(bundleLib.bundleOf(html)).toEqual(bundle)
    expect(Object.keys(bundle).sort()).toEqual(['imgmeta', 'mascots', 'ot', 'prose', 'release', 'scenes', 'sh', 'uploadedAt', 'world', 'x'])
    expect(Object.keys(bundle.scenes).sort()).toEqual([...proto.SCENES, 'entrance_video'].sort())
    expect(Object.keys(bundle.mascots).sort()).toEqual([...proto.MASCOTS].sort())
  })

  it('главы, пьесы, тексты, произведения, слова, задания и мастерская — как у прототипа', async () => {
    const { root, box } = mount()
    const out = await collect({
      data: bundle,
      go: async (h) => {
        api.go(h)
        await tick(2)
        await tick(2)
      },
      q: (s) => $(root, s),
      qa: (s) => $$(root, s),
      app: () => $(root, '#app'),
      theme: () => root.dataset.lwTheme || '',
      lang: () => root.lang,
      key: (code) => document.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true })),
      notebook: () => (box.state && box.state.notebook) || {},
      drafts: () => box.drafts || {},
      modal: () => $(root, '.modal'),
    })
    // по частям: в сообщении об ошибке видно, какой экран или какое задание разошлось
    for (const k of Object.keys(oracle.screens)) expect(out.screens[k], k).toEqual(oracle.screens[k])
    for (const k of Object.keys(oracle.plays)) expect(out.plays[k], k).toEqual(oracle.plays[k])
    for (const k of Object.keys(oracle.texts)) expect(out.texts[k], k).toEqual(oracle.texts[k])
    expect(Object.keys(out.items)).toEqual(Object.keys(oracle.items))
    for (const k of Object.keys(oracle.items)) expect(out.items[k], k).toEqual(oracle.items[k])
    for (const k of Object.keys(oracle.words)) expect(out.words[k], k).toEqual(oracle.words[k])
    for (const k of Object.keys(oracle.extras.workshop)) expect(out.extras.workshop[k], k).toEqual(oracle.extras.workshop[k])
    expect(out).toEqual(oracle)
    // ответы практики ушли в onAnswer: и слова, и чтение, и верные, и неверные
    const kinds = new Set(box.answers.map(([k, ok]) => k + ':' + ok))
    expect([...kinds].sort()).toEqual(['reading:false', 'reading:true', 'vocab:false', 'vocab:true'])
  }, 300_000)
})

describe('связь с приложением', () => {
  it('разметку страницы ставит движок: шапка и подвал без логотипа, «облачко» внутри раздела, #app — не <main>', () => {
    const { root } = mount()
    expect($(root, 'header.top .brand span').textContent).toBe('Literature World')
    expect($$(root, 'img[alt="just to study"]')).toHaveLength(0)
    expect($(root, 'clipPath#bubble')).not.toBeNull()
    expect($(root, 'main')).toBeNull()
    expect($(root, 'div#app .lw-home')).not.toBeNull()
    expect($(root, 'footer #aboutBtn')).not.toBeNull()
    expect($(root, '#pop').hidden).toBe(true)
    // сцены и маскоты — ссылки бандла
    expect($(root, '.lw-entry .scene').getAttribute('style')).toContain(bundle.scenes.entrance)
    expect($(root, '.lw-role img').getAttribute('src')).toBe(bundle.scenes.c_dexter)
  })

  it('адрес страницы, <html>, <body> и data-theme хоста не трогает; тема мира — data-lw-theme на корне', () => {
    const { root } = mount()
    const before = location.href
    const theHost = root.getRootNode().host
    theHost.setAttribute('data-theme', 'dark')
    $(root, '#nav button').click()
    expect(api.snapshot().view).toBe('shakespeare')
    expect(location.href).toBe(before)
    expect(root.dataset.lwTheme).toBe('renaissance')
    expect(theHost.getAttribute('data-theme')).toBe('dark')
    expect(document.body.dataset.theme).toBeUndefined()
    $$(root, '#lang button')[1].click()
    expect(root.lang).toBe('kk')
    expect(document.documentElement.lang).not.toBe('kk')
    // ссылка «по странице» (Practise these words) гасит переход сама — экран не меняется
    api.go('words')
    $(root, 'a[href="#wlabp"]').click()
    expect(api.snapshot().view).toBe('words')
  })

  it('язык: cfg.lang на входе, cfg.onLang после смены (и интерфейса, и подсказок)', () => {
    const { root, box } = mount({ lang: { lang: 'ru', sup: 'ru' } })
    expect(root.lang).toBe('ru')
    expect($$(root, '#nav button').map((b) => b.textContent)).toContain('Поэзия')
    expect($(root, '#lang button.on').textContent).toBe('РУС')
    $$(root, '#lang button')[1].click()
    expect(box.lang.at(-1)).toEqual({ lang: 'kz', sup: 'kz' })
    expect($$(root, '#nav button').map((b) => b.textContent)).toContain('Поэзия')
    expect(root.lang).toBe('kk')
    // язык подсказок меняется сам по себе (кнопки «Русский / Қазақша» у слов)
    api.go('word/' + bundle.x.words[0].id)
    $$(root, '.seg button').find((b) => b.textContent === 'Русский').click()
    expect(box.lang.at(-1)).toEqual({ lang: 'kz', sup: 'ru' })
    expect(normalizeLiteratureLang({ lang: 'kz' })).toEqual({ lang: 'kz', sup: 'kz' })
    expect(normalizeLiteratureLang(null)).toEqual({ lang: 'en', sup: 'ru' })
  })

  it('блокнот — cfg.progress / cfg.onProgress; снимок сервера, пришедший позже, подхватывается refresh() и сменой экрана', () => {
    const [w1, w2] = bundle.x.words
    const { root, box } = mount()
    api.go('word/' + w1.id)
    $(root, '.whead .btn').click()
    expect(Object.keys(box.state.notebook)).toEqual([w1.id])
    expect($(root, '.whead .btn').textContent).toContain('In my notebook')
    // снимок сервера: на другом устройстве сохранено второе слово
    box.state = { notebook: { ...box.state.notebook, [w2.id]: 1 } }
    api.go('words')
    expect($$(root, '.panel.nb .wchips button').map((b) => b.textContent).sort()).toEqual([w1.word, w2.word].sort())
    box.state = { notebook: {} }
    api.refresh()
    expect($(root, '.panel.nb')).toBeNull()
  })

  it('своё предложение «Produce» — cfg.drafts / cfg.onDrafts, в блокнот не идёт', () => {
    const w = bundle.x.words[1]
    const { root, box } = mount({ drafts: () => ({ [w.id]: 'My old sentence.' }) })
    api.go('word/' + w.id)
    const ta = $(root, '#wprod')
    expect(ta.value).toBe('My old sentence.')
    ta.value = `A ${w.word} here.`
    $$(root, '.wstep button').find((b) => /checkProd/.test(b.getAttribute('data-lw-onclick'))).click()
    expect(box.drafts).toEqual({ [w.id]: `A ${w.word} here.` })
    expect($(root, '#wpf').textContent).toMatch(/Saved/)
    expect(box.state).toBeNull()
  })

  it('ответы: вопрос с вариантами слова — vocab, порядок строк — reading, считается первая проверка', () => {
    const { root, box } = mount()
    api.go('word/' + bundle.x.words[0].id)
    const opts = $$(root, '#wprac .opts button')
    opts[0].click()
    opts[1].click()
    expect(box.answers).toHaveLength(1)
    expect(box.answers[0][0]).toBe('vocab')
    api.go('item/po-tiger/practise')
    const order = () => $$(root, '#actBody .choices button').filter((b) => !b.disabled)
    while (order().length) order().sort((a, b) => a.dataset.i - b.dataset.i)[0].click()
    expect(box.answers.at(-1)).toEqual(['reading', true])
    $(root, '#actBody #rs').click()
    while (order().length) order()[0].click()
    // повтор того же задания после «Start again» — уже не первая проверка
    expect(box.answers).toHaveLength(2)
  })

  it('голос: «Hear» у слова — cfg.speak(слово); смена экрана — cfg.speak(null)', () => {
    const said = []
    const { root } = mount({ speak: (t) => said.push(t) })
    const w = bundle.x.words[0]
    api.go('word/' + w.id)
    $$(root, '.wstep button').find((b) => /say\(/.test(b.getAttribute('data-lw-onclick') || '')).click()
    expect(said.at(-1)).toBe(w.word.split(' / ')[0].split(' (')[0])
    api.go('words')
    expect(said.at(-1)).toBeNull()
  })

  it('прокрутка: новый экран — cfg.scrollTo(0), а не window.scrollTo', () => {
    let page = 0
    window.scrollTo = () => page++
    const { box } = mount()
    api.go('poetry')
    expect(box.scroll.at(-1)).toBe(0)
    expect(page).toBe(0)
  })

  it('«назад» из раздела — только с cfg.onExit и только на главной книги', () => {
    let exits = 0
    const { root } = mount({ onExit: () => exits++ })
    const btn = $(root, '#lwExit')
    expect(btn.hidden).toBe(false)
    btn.click()
    expect(exits).toBe(1)
    api.go('poetry')
    expect(btn.hidden).toBe(true)
    api.destroy()
    api = null
    host.remove()
    expect($(mount().root, '#lwExit').hidden).toBe(true)
  })

  it('пробел «хлопка» не крадёт пробел у поля ввода', () => {
    const { root } = mount()
    api.go('rhymes')
    const id = ($$(root, '#app .card')[0].getAttribute('data-lw-onclick').match(/go\('item','([^']+)'\)/) || [])[1]
    api.go(`item/${id}/practise`)
    $$(root, '.acts button').find((b) => b.dataset.act === 'clap').click()
    const taps = () => $$(root, '.taps i.on').length
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true }))
    expect(taps()).toBe(1)
    const input = document.createElement('input')
    document.body.append(input)
    const e = new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true })
    input.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(false)
    expect(taps()).toBe(1)
    input.remove()
  })

  it('destroy снимает слушателей и таймеры: после него раздел не реагирует и ничего не пишет', async () => {
    const said = []
    const { root, box } = mount({ speak: (t) => said.push(t) })
    api.go('words')
    api.destroy()
    expect(said.at(-1)).toBeNull()
    $(root, '#nav button').click()
    api.go('poetry')
    expect(api.snapshot().view).toBe('words')
    await tick(30)
    expect(box.state).toBeNull()
    expect(box.answers).toEqual([])
  })
})

// Сторож переноса: движок живёт в тени чужой страницы и не должен трогать её адрес, <html>, <body> и хранилище.
describe('движок не трогает страницу приложения', () => {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('нет адреса страницы и hashchange', () => {
    expect(code).not.toMatch(/\blocation\.(hash|replace|href|assign)/)
    expect(code).not.toMatch(/hashchange/)
    expect(code).not.toMatch(/history\.(pushState|replaceState)/)
  })

  it('нет <html>, <body>, document.title и поиска по документу', () => {
    expect(code).not.toMatch(/document\.documentElement/)
    expect(code).not.toMatch(/document\.body/)
    expect(code).not.toMatch(/document\.title/)
    expect(code).not.toMatch(/document\.(getElementById|querySelector|querySelectorAll|onkeydown|addEventListener)\b/)
  })

  it('нет localStorage, синтеза речи, inline-обработчиков и глобалов прототипа', () => {
    expect(code).not.toMatch(/localStorage|speechSynthesis\.|SpeechSynthesisUtterance/)
    expect(code).not.toMatch(/(?<![-\w])on(click|input|change|submit|error)=["']/)
    expect(code).not.toMatch(/window\.(LW_IMG_LOG|lwImageReport|_sq|scrollTo|addEventListener)\b/)
    expect(code).not.toMatch(/getElementById\('d-/)
  })
})

describe('сборка движка из прототипа', () => {
  it('engine.js — ровно то, что собирает build-engine.js из фикстуры (руками его не правят)', () => {
    expect(builder.buildEngine(html)).toBe(source)
  })

  it('каждая замена находит ровно своё число мест, иначе сборка падает', () => {
    const body = proto.engineBlocks(html)[0]
    // замены идут по очереди: каждая считается по тексту после предыдущих
    let code = body
    for (const [why, find, repl, count] of builder.REPLACEMENTS) {
      expect(builder.countOf(code, find), why).toBe(count)
      code = code.split(find).join(repl)
    }
    expect(() => builder.transform(body)).not.toThrow()
    // прототип поменялся — замена не нашлась, и сборка останавливается, а не кладёт правку вслепую
    const [, find] = builder.REPLACEMENTS.find(([why]) => why === 'go() — без location.hash')
    expect(() => builder.transform(body.replace(find, 'location.hash = view;'))).toThrow(/go\(\) — без location\.hash/)
    expect(() => builder.transform(body + '\n<b onclick="x()"></b>')).toThrow(/onclick/)
  })
})
