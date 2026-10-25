// @vitest-environment jsdom
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountCartoons } from './engine.js'
import { CARTOONS_MARKUP } from './markup.js'
import { countWords, isHintText, pickPath } from './chat.js'

const DIR = path.join(__dirname, '__fixtures__')
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
const INDEX = read('index.json')
const MISSIONS = read('missions.json')
const oracle = read('oracle.json')
const source = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8')

let host
let api
let state
let done
let shadow

function mount(index, { reduced = true } = {}) {
  state = { missions: {} }
  done = []
  window.matchMedia = (q) => ({ matches: reduced && q.includes('reduce'), addEventListener() {}, removeEventListener() {} })
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
  host = document.createElement('div')
  document.body.append(host)
  shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `<div class="ctw">${CARTOONS_MARKUP}</div>`
  api = mountCartoons(shadow.querySelector('.ctw'), {
    index,
    loadMission: (id) => Promise.resolve(MISSIONS[id] || null),
    lang: 'ru',
    draftKey: 'test_cartoons_drafts',
    progress: {
      read: () => JSON.parse(JSON.stringify(state)),
      update: (fn) => { const next = JSON.parse(JSON.stringify(state)); fn(next); state = next },
    },
    onMissionDone: (id) => done.push(id),
  })
}

const $ = (sel) => shadow.querySelector(sel)
const $$ = (sel) => [...shadow.querySelectorAll(sel)]
const flush = () => new Promise((r) => setTimeout(r, 0))

function shelves() {
  return $$('#ct-grid .ct-shelf').map((s) => ({
    level: s.getAttribute('data-shelf'),
    ids: [...s.querySelectorAll('a.ct-card__link')].map((a) => decodeURIComponent(a.getAttribute('href').slice('#watch/'.length))),
  }))
}
function chips() {
  const text = (sel) => $$(sel).map((b) => b.textContent.replace(/\s+/g, ' ').trim())
  return { audience: text('#ct-aud-chips button'), levels: text('#ct-level-chips button') }
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  api?.destroy()
  host?.remove()
  vi.restoreAllMocks()
})

describe('Cartoon World: порт = прототип', () => {
  for (const c of oracle.library) {
    it(`библиотека, фильтры ${JSON.stringify(c.filters)}`, () => {
      // оракул снят без нерабочих видео — прототип в jsdom обложки не проверял
      mount({ ...INDEX, unavailable: [] })
      api.filter(c.filters)
      expect(shelves()).toEqual(c.shelves)
      expect(chips()).toEqual(c.chips)
      expect(!$('#ct-empty').hidden).toBe(c.empty)
    })
  }

  it(`pickPath: ${oracle.pickPath.length} ответов ученика`, () => {
    for (const c of oracle.pickPath) {
      expect(pickPath(MISSIONS[c.mission].chat.turns[c.turn], c.text), `${c.mission}#${c.turn}: ${c.text}`).toEqual({ i: c.i, word: c.word })
    }
  })
})

describe('Cartoon World: связь с приложением', () => {
  it('нерабочие видео с бэкенда в библиотеке не показываются', () => {
    mount(INDEX)
    const dead = INDEX.unavailable[0].id
    expect(shelves().flatMap((s) => s.ids)).not.toContain(dead)
    expect(shelves().flatMap((s) => s.ids).length).toBeGreaterThan(5)
  })

  it('карточка ведёт роутер движка, адрес страницы не меняется; миссия догружается', async () => {
    mount(INDEX)
    const before = window.location.href
    const link = $('a.ct-card__link')
    link.click()
    expect(api.snapshot().hash).toBe(link.getAttribute('href'))
    expect(window.location.href).toBe(before)
    expect($('#ct-player-view').hidden).toBe(false)
    await flush()
    expect($('#ct-ms-open')).not.toBeNull()
  })

  it('миссия до конца: 10 ответов, «пройдено» — один раз, ходы в прогрессе', async () => {
    mount(INDEX)
    $('a.ct-card__link').click()
    await flush()
    $('#ct-ms-open').click()
    const id = api.snapshot().ep
    const turns = MISSIONS[id].chat.turns.length
    for (let i = 0; i < turns; i++) {
      $('#ct-ms-text').value = 'I really think this is a good idea for all of us today, my friend.'
      $('#ct-ms-send').click()
    }
    expect($('#ct-ms-done')).not.toBeNull()
    expect(state.missions[id].done).toBe(true)
    expect(state.missions[id].turns).toHaveLength(turns)
    expect(done).toEqual([id])
    // перезагрузка: миссия собирается из прогресса уже пройденной, второй отметки нет
    api.destroy()
    host.remove()
    const saved = state
    mount(INDEX)
    state = saved
    $(`a.ct-card__link[href="#watch/${encodeURIComponent(id)}"]`).click()
    await flush()
    expect($('#ct-ms-done')).not.toBeNull()
    expect(done).toEqual([])
  })

  it('короткий ответ отклоняется, а подсказка дословно — принимается', async () => {
    mount(INDEX)
    // минимум слов движка (MIN_WORDS прототипа) и уровень каждого видео — по правилу id прототипа
    const MIN = { A0: 3, A1: 4, A2: 6, B1: 8, B2: 12, C1: 16 }
    const level = {}
    INDEX.library.entries.forEach((e) => { level[e.id] = e.level })
    INDEX.data.episodes.forEach((e) => { level[e.id] = e.level })
    INDEX.catalog.rows.forEach((r) => { level['cat-' + r[1]] = r[0] })
    INDEX.extra.rows.forEach((r) => { level['ext-' + r.yt] = r.level })
    // видео на полке, у первого хода которого подсказка короче минимума своего уровня
    let hint = null
    const ep = Object.keys(MISSIONS).find((k) => {
      if (!$(`a.ct-card__link[href="#watch/${encodeURIComponent(k)}"]`)) return false
      hint = (MISSIONS[k].chat.turns[0].hints || []).find((h) => countWords(h) < MIN[level[k]])
      return !!hint
    })
    expect(ep, 'в фикстуре нужна миссия с короткой подсказкой').toBeTruthy()
    $(`a.ct-card__link[href="#watch/${encodeURIComponent(ep)}"]`).click()
    await flush()
    $('#ct-ms-open').click()
    $('#ct-ms-text').value = 'Yes.'
    $('#ct-ms-send').click()
    expect(state.missions[ep]?.turns?.length || 0).toBe(0)
    expect($('#ct-ms-note').textContent).not.toBe('')
    $('#ct-ms-text').value = hint
    $('#ct-ms-send').click()
    expect(state.missions[ep].turns).toHaveLength(1)
  })

  it('isHintText: регистр и знаки не важны, чужой текст — нет', () => {
    const turn = { hints: ['Bye, Itsy!', 'See you soon...'] }
    expect(isHintText(turn, 'bye itsy')).toBe(true)
    expect(isHintText(turn, 'See you soon')).toBe(true)
    expect(isHintText(turn, 'bye')).toBe(false)
    expect(isHintText({}, 'bye itsy')).toBe(false)
  })

  it('черновик ответа живёт на устройстве, а не в прогрессе', async () => {
    mount(INDEX)
    $('a.ct-card__link').click()
    await flush()
    $('#ct-ms-open').click()
    const id = api.snapshot().ep
    const ta = $('#ct-ms-text')
    ta.value = 'draft text here'
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    api.destroy()
    expect(JSON.parse(localStorage.getItem('test_cartoons_drafts'))[id]).toBe('draft text here')
    expect(state.missions[id]?.draft).toBeUndefined()
    api = null
  })

  it('исходник не трогает адрес, заголовок вкладки и чужие ключи хранилища', () => {
    expect(source).not.toMatch(/location\.hash/)
    expect(source).not.toMatch(/document\.(title|documentElement|querySelector|getElementById)/)
    expect(source).not.toMatch(/window\.(CARTOON|MISSION)/)
    for (const m of source.matchAll(/localStorage\.(?:get|set)Item\(([^,)]+)/g)) expect(m[1].trim()).toBe('cfg.draftKey')
    expect(source).toContain('youtube-nocookie.com')
  })
})
