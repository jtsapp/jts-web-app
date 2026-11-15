// @vitest-environment jsdom
//
// Порт Parts of Speech World сверяется с оракулом самого прототипа
// (scripts/partsofspeech/extract-oracle.js): те же экраны, перевод, все 55
// упражнений и все 62 стадии игры проходятся тем же ходом (collect), и
// результат обязан совпасть. Красный тест здесь значит, что порт разъехался с
// исходником, — чинить порт.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import oracleLib from '../../../scripts/partsofspeech/extract-oracle.js'
import fixtureLib from '../../../scripts/partsofspeech/make-fixture.js'
import { mountPartsOfSpeech } from './engine.js'

const { collect, stubs } = oracleLib
const DIR = path.join(__dirname, '__fixtures__')
const bundle = JSON.parse(fs.readFileSync(path.join(DIR, 'bundle.json'), 'utf8'))
const oracle = JSON.parse(fs.readFileSync(path.join(DIR, 'oracle.json'), 'utf8'))
const html = fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8')
const source = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8')

let api = null
let host = null
afterEach(() => {
  api?.destroy()
  api = null
  host?.remove()
  host = null
})

function mount(extra = {}) {
  stubs(window)
  host = document.createElement('div')
  document.body.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<div class="posw"></div>'
  const root = shadow.querySelector('.posw')
  // хранилище — как localStorage прототипа: что записано, то и читается
  const box = { state: null, lang: [], prefs: [], drafts: [], answers: [], info: [] }
  api = mountPartsOfSpeech(root, {
    bundle,
    progress: () => (box.state ? JSON.parse(JSON.stringify(box.state)) : null),
    onProgress: (s, info) => {
      box.state = JSON.parse(JSON.stringify(s))
      if (info) box.info.push(info)
    },
    onAnswer: (ok) => box.answers.push(ok),
    onLang: (l) => box.lang.push(l),
    onPrefs: (p) => box.prefs.push(p),
    onDrafts: (d) => box.drafts.push(d),
    ...extra,
  })
  return { root, shadow, box }
}

const $ = (root, s) => root.querySelector(s)
const $$ = (root, s) => [...root.querySelectorAll(s)]
const byId = (root, id) => root.querySelector('[id="' + id + '"]')

describe('порт против оракула прототипа', () => {
  it('фикстура — тот же движок, что перенесён (хэш спеки), и те же данные, что в бандле', () => {
    expect(fixtureLib.engineSha(html)).toEqual({ sha: fixtureLib.ENGINE_SHA, count: 2 })
    const { release, uploadedAt, IMG, ...data } = bundle
    expect(release).toBe(1)
    expect(uploadedAt).toBeTruthy()
    expect(Object.keys(IMG).sort()).toEqual([...fixtureLib.IMAGES].sort())
    expect(fixtureLib.runData(html)).toEqual(data)
    expect(fixtureLib.counts(data)).toEqual({ regions: 9, units: 16, acts: 55, actItems: 269, cases: 14, stages: 62, stageItems: 328, scenes: 14 })
  })

  it('экраны, перевод, все упражнения и все стадии игры — как у прототипа', async () => {
    const { root, box } = mount()
    const out = await collect({
      data: bundle,
      go: async (h) => api.go(h),
      q: (s) => $(root, s),
      qa: (s) => $$(root, s),
      id: (id) => byId(root, id),
      // классы страницы прототип ставил на <body>; у порта к ним добавлен свой корневой
      cls: () => root.className.replace(/^posw\s*/, '').trim(),
      stage: () => api.stage(),
      progress: () => ({ acts: {}, cases: {}, clues: {}, seen: {}, ...(box.state || {}) }),
    })
    // по частям: в сообщении об ошибке видно, какой экран или какое задание разошлось
    expect(out.screens).toEqual(oracle.screens)
    expect(out.lang).toEqual(oracle.lang)
    for (const id of Object.keys(oracle.units)) expect(out.units[id], id).toEqual(oracle.units[id])
    expect(out.acts.map((a) => a.id)).toEqual(oracle.acts.map((a) => a.id))
    for (const [i, a] of oracle.acts.entries()) expect(out.acts[i], a.id).toEqual(a)
    for (const id of Object.keys(oracle.cases)) expect(out.cases[id], id).toEqual(oracle.cases[id])
    expect(out.stages.map((s) => s.id)).toEqual(oracle.stages.map((s) => s.id))
    for (const [i, s] of oracle.stages.entries()) expect(out.stages[i], s.id).toEqual(s)
    expect(out.extras).toEqual(oracle.extras)
    // прототип шёл по тем же заданиям: упражнения — каждая проверка, стадии — первая попытка задания
    const actChecks = oracle.acts.reduce((n, a) => n + (a.type === 'write' ? 0 : a.items.length), 0)
    expect(actChecks).toBe(269)
    expect(box.answers).toHaveLength(269 + 328)
    // «Replay this quest» называет сброшенное дело
    expect(box.info).toEqual([{ reset: bundle.CASES[0].id }])
  }, 120_000)
})

describe('связь с приложением', () => {
  it('разметку страницы ставит движок: шапка без логотипа, карта мира, знак-облачко для эмблем', () => {
    const { root } = mount()
    expect($(root, '.top .brand-name').textContent).toBe('Parts of Speech World')
    expect($(root, '.top .logo')).toBeNull()
    expect($(root, 'symbol#jts-bubble')).not.toBeNull()
    expect($(root, '.w-hero h1').textContent).toBe('Parts of Speech World')
    expect($$(root, '.w-stop')).toHaveLength(9)
    expect(root.className).toBe('posw full page-home')
    expect(root.getAttribute('lang')).toBe('en')
    // картинки — ссылки бандла
    expect($(root, '.w-hero-img').getAttribute('src')).toBe(bundle.IMG.hero)
  })

  it('ссылки раздела не трогают адрес страницы и <html>; лицо проводника — на хосте тени', () => {
    const { root } = mount()
    const before = location.href
    $(root, '.w-stop-u a[href="#u02"]').click()
    expect(api.snapshot().hash).toBe('#u02')
    expect($(root, 'h1.topic .term-en').textContent).toBe(bundle.UNITS[1].title.en)
    expect(location.href).toBe(before)
    expect(document.documentElement.getAttribute('lang')).not.toBe('en-posw')
    expect(document.documentElement.style.getPropertyValue('--guide-face')).toBe('')
    expect(host.style.getPropertyValue('--guide-face')).toContain(bundle.IMG.f_dexter)
    expect(document.body.className).toBe('')
    // вкладка «Quests» шапки
    $(root, '.tabs a[data-tab="play"]').click()
    expect(api.snapshot().hash).toBe('#bureau')
    expect($(root, '.tabs a[data-tab="play"]').getAttribute('aria-current')).toBe('page')
  })

  it('язык перевода — cfg.lang на входе и cfg.onLang на выходе; интерфейс остаётся английским', () => {
    const { root, box } = mount({ lang: 'ru' })
    expect($(root, '.langs [data-lang="ru"]').getAttribute('aria-pressed')).toBe('true')
    expect($(root, '.w-hero .lede .trl[lang="ru"]').textContent).toContain('У каждого слова своя работа')
    $(root, '.langs [data-lang="kk"]').click()
    expect($(root, '.w-hero .lede .trl[lang="kk"]')).not.toBeNull()
    expect($(root, '.w-hero .lede .trl[lang="ru"]')).toBeNull()
    $(root, '.langs [data-lang="en"]').click()
    expect($(root, '.w-hero .lede .trl')).toBeNull()
    expect(box.lang).toEqual(['kk', 'en'])
    expect(root.getAttribute('lang')).toBe('en')
  })

  it('прогресс: упражнение пишет счёт, ответ уходит в onAnswer; перечитывается на смене экрана', () => {
    const { root, box } = mount()
    api.go('#u01-practice')
    const a = bundle.UNITS[0].acts[0]
    const body = byId(root, a.id).querySelector('.act-b')
    for (const it of a.items) {
      $$(body, '.opt').find((o) => o.dataset.v === it.a).click()
      $(body, '[data-role="check"]').click()
      $(body, '[data-role="next"]').click()
    }
    expect(box.state.acts[a.id]).toEqual({ score: a.items.length, total: a.items.length })
    expect(box.answers).toEqual(a.items.map(() => true))
    // снимок сервера пришёл, пока ученик был в уроке: следующий экран уже с ним
    box.state.acts[bundle.UNITS[1].acts[0].id] = { score: 1, total: 4 }
    api.go('#u02-practice')
    expect($(root, '.step.done .step-s').textContent).toBe('1 / 4')
  })

  it('дело, все стадии которого решены по частям на двух устройствах, открывается закрытым', () => {
    const c = bundle.CASES[0]
    const state = { acts: {}, cases: { [c.id]: { done: c.stages.map((_, k) => k), first: {}, complete: false } }, clues: {}, seen: {} }
    const { root } = mount({ progress: () => JSON.parse(JSON.stringify(state)) })
    api.go('#case-' + c.id)
    expect($(root, '.g-closed h2').textContent).toBe(c.title)
    api.go('#bureau')
    expect($(root, '.g-case.closed .g-case-t b').textContent).toBe(c.title)
  })

  // У дела c14 в прототипе сцена задана без рисунка (window.SCENES.c14={clues:[…]}) — бэкенд отдаёт её без svg.
  it('сцена без svg (c14) и дело вовсе без сцены открываются: подсказки — по картинке острова', () => {
    expect(bundle.SCENES.c14.svg).toBeUndefined()
    expect(bundle.SCENES.c14.clues).toHaveLength(3)
    expect(Object.values(bundle.SCENES).filter((s) => typeof s.svg === 'string')).toHaveLength(13)
    const { root } = mount()
    api.go('#case-c14')
    const c14 = bundle.CASES.find((c) => c.id === 'c14')
    expect($(root, '.g-banner h1').textContent).toBe(c14.title)
    expect($$(root, '.g-scene .g-clue')).toHaveLength(3)
    expect($(root, '.g-scene-img').getAttribute('src')).toBe(bundle.IMG.r_clockworks)
    $(root, '.g-clue').click()
    expect($(root, '.g-clue-n').textContent).toBe('✦ Clues 1/3')
    api.destroy()
    host.remove()
    // сцены у дела нет совсем (методист ещё не нарисовал) — дело играется без подсказок
    const { c14: _, ...SCENES } = bundle.SCENES
    const bare = mount({ bundle: { ...bundle, SCENES } }).root
    api.go('#case-c14')
    expect($$(bare, '.g-scene .g-clue')).toHaveLength(0)
    expect($(bare, '.g-clue-n').textContent).toBe('')
    expect($(bare, '.g-stage-h h2').textContent).toBe(c14.stages[0].title)
  })

  it('звук и подписи слов — cfg.prefs / cfg.onPrefs, черновик письма — cfg.drafts / cfg.onDrafts; в прогресс не идут', () => {
    const write = bundle.UNITS.flatMap((u) => (u.acts || []).map((a) => ({ u, a }))).find((x) => x.a.type === 'write')
    const { root, box } = mount({ prefs: () => ({ sound: false, labels: true }), drafts: () => ({ [write.a.id]: 'My draft' }) })
    api.go('#bureau')
    expect($(root, '#gSnd').getAttribute('aria-pressed')).toBe('false')
    $(root, '#gSnd').click()
    expect(box.prefs.at(-1)).toEqual({ sound: true, labels: true })
    api.go('#u01')
    expect($(root, '#lblSw').checked).toBe(true)
    expect(root.classList.contains('show-labels')).toBe(true)
    $(root, '#lblSw').click()
    expect(box.prefs.at(-1)).toEqual({ sound: true, labels: false })
    api.go('#' + write.u.id + '-practice')
    const ta = byId(root, write.a.id).querySelector('textarea')
    expect(ta.value).toBe('My draft')
    // отрисовка сама по себе черновик не пишет
    expect(box.drafts).toEqual([])
    ta.value = 'My draft, longer'
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    expect(box.drafts.at(-1)).toEqual({ [write.a.id]: 'My draft, longer' })
    ta.value = ''
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    expect(box.drafts.at(-1)).toEqual({})
    expect(box.state).toBeNull()
  })

  it('«назад» из раздела — только с cfg.onExit и только на карте мира', () => {
    let exits = 0
    const { root } = mount({ onExit: () => exits++ })
    const btn = byId(root, 'exitBtn')
    expect(btn.hidden).toBe(false)
    btn.click()
    expect(exits).toBe(1)
    api.go('#u01')
    expect(btn.hidden).toBe(true)
    api.destroy()
    api = null
    host.remove()
    expect(byId(mount().root, 'exitBtn').hidden).toBe(true)
  })

  it('destroy снимает слушателей и таймеры: после него раздел не реагирует и ничего не пишет', async () => {
    const { root, box } = mount()
    api.go('#case-' + bundle.CASES[0].id)
    const saved = JSON.stringify(box.state)
    api.destroy()
    $(root, '.tabs a[data-tab="learn"]').click()
    api.go('#map')
    expect(api.snapshot().hash).toBe('#case-' + bundle.CASES[0].id)
    await new Promise((r) => setTimeout(r, 20))
    expect(JSON.stringify(box.state)).toBe(saved)
  })
})

// Сторож переноса: движок живёт в тени чужой страницы и не должен трогать её адрес, <html> и хранилище.
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
    expect(code).not.toMatch(/document\.(getElementById|querySelector|querySelectorAll)\b/)
  })

  it('нет хранилища браузера, синтеза речи и глобалов прототипа', () => {
    expect(code).not.toMatch(/localStorage|sessionStorage/)
    expect(code).not.toMatch(/speechSynthesis/)
    expect(code).not.toMatch(/window\.(IMG|WORLD|CASES|REFS|HOWTO|SCENES|GAME|GAME_DOSSIER|TL_MISS|__\w+)\b/)
  })

  it('гарнитур прототипа нет — раздел на шрифте сайта', () => {
    expect(code).not.toMatch(/font-family="(?!inherit")/)
  })
})
