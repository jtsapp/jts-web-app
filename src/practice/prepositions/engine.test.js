// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPrepositions } from './engine.js'

const DIR = path.join(__dirname, '__fixtures__')
const bundle = JSON.parse(fs.readFileSync(path.join(DIR, 'bundle.json'), 'utf8'))
const oracle = JSON.parse(fs.readFileSync(path.join(DIR, 'oracle.json'), 'utf8'))
const source = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8')

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const or = (v) => (v === undefined ? null : v)
const shape = (q) => ({
  id: or(q._id), type: q.type, stem: or(q.stem), text: or(q.text), lines: or(q.lines), opts: or(q.opts),
  ans: or(q.ans), gaps: q.gaps ? q.gaps.map((g) => ({ opts: g.opts, ans: g.ans })) : null,
  lesson: or(q.lesson), cat: or(q.cat),
})

const allDone = () => ({ done: Object.fromEntries(bundle.course.cats.flatMap((c) => c.lessons.map((l) => [l.id, 1]))), score: {} })

let rng
let api
let host
beforeEach(() => {
  rng = mulberry32(oracle.seed)
  vi.spyOn(Math, 'random').mockImplementation(() => rng())
  window.scrollTo = () => {}
  host = document.createElement('div')
  document.body.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = '<div class="pw"><div id="app"></div></div>'
  let state = allDone()
  api = mountPrepositions(shadow.querySelector('.pw'), {
    bundle,
    lang: 'ru',
    progress: { read: () => JSON.parse(JSON.stringify(state)), write: (s) => { state = s } },
    speak: () => {},
    playUrl: () => {},
    stopAudio: () => {},
  })
})
afterEach(() => {
  api?.destroy()
  host?.remove()
  vi.restoreAllMocks()
})

describe('Prepositions World: порт = прототип', () => {
  for (const [hash, expected] of Object.entries(oracle.sessions)) {
    it(`набор ${hash}`, () => {
      rng = mulberry32(oracle.seed)
      api.go(hash)
      const got = api.snapshot().session.qs.map(shape)
      // Отступление порта (спека, баг 4): у общих вопросов категории урока нет —
      // прототип приписывал их последнему уроку и советовал повторить не тот урок.
      const want = expected.map((q) => (q.id && q.id.includes('/int/') ? { ...q, lesson: null } : q))
      expect(got).toEqual(want)
    })
  }
})

describe('Prepositions World: связь с приложением', () => {
  it('главная курса рисуется в корне, картинки — ссылками бандла', () => {
    const root = host.shadowRoot.querySelector('.pw')
    expect(root.querySelector('.hero')).not.toBeNull()
    expect(root.innerHTML).toContain('/__prep-media/')
    expect(root.innerHTML).not.toContain('href="#a-')
  })

  it('ссылки #/… ведут роутер движка, адрес страницы не меняется', () => {
    const before = window.location.href
    const link = host.shadowRoot.querySelector('a[href^="#/learn/"]')
    link.click()
    expect(api.snapshot().hash).toBe(link.getAttribute('href'))
    expect(window.location.href).toBe(before)
    expect(host.shadowRoot.querySelector('.lesson')).not.toBeNull()
  })

  it('исходник не трогает document, location и чужие ключи хранилища', () => {
    expect(source).not.toMatch(/\bdocument\./)
    expect(source).not.toMatch(/\blocation\./)
    expect(source).not.toMatch(/href="#a-/)
    expect(source).not.toMatch(/speechSynthesis/)
    for (const m of source.matchAll(/localStorage\.(?:get|set)Item\(([^,)]+)/g)) expect(m[1].trim()).toBe('LKEY')
  })

  it('destroy снимает разметку и не роняет отложенные шаги', () => {
    api.destroy()
    expect(host.shadowRoot.querySelector('.pw').innerHTML).toBe('')
    api = null
  })
})
