// Оракул «Tenses World»: что показывает и считает САМ прототип — сравнение
// ответа (TW.sameAnswer на всех принятых ответах банка и их «соседях»),
// Formula Lab (TW.buildSentence / contract на всех 12 × 6 × 6 × 3 сочетаниях
// и разметка лаборатории по кликам), схемы времени (TW.timelineSVG), разметка
// хаба, пути практики и всех 12 страниц времени, смена языка на месте, и
// прохождение каждого из 26 наборов: перемешанные варианты, проверка ответа
// каждого типа (choice / gap / rewrite / order / error / meaning / timeline /
// name / text), итог набора, «работа над ошибками» и сохранённый прогресс.
// Порт (src/practice/tenses/engine.js) сверяется с этим файлом (engine.test.js):
// красный тест значит, что порт разъехался с исходником, — чинить порт.
//
// Прототип исполняется в jsdom как есть (копия из make-fixture.js). Случайность —
// mulberry32 с одним сидом, сбрасываемым перед каждым набором: порядок вариантов
// и плиток — shuffle прототипа, похвала «Correct / Exactly / Well done» — тоже
// Math.random. Экраны открываются его роутером (history.replaceState + TW.route,
// без hashchange: иначе route() сработал бы дважды).
//
// Чего в jsdom нет: speechSynthesis (без него прототип не рисует кнопку «Listen»
// — заглушка молчит), URL.createObjectURL (видео прототип собирает из base64 в
// Blob), scrollIntoView и scrollTo. Разметка сравнивается нормализованной
// (norm): номер data-tr — порядковый номер строки в реестре перевода, он
// зависит от числа отрисовок; схема времени — своим именем (сами схемы
// сверяются отдельно); видео — без адреса: у прототипа это blob из base64, у
// порта — ссылка бакета; логотипа шапки у порта нет.
//
// Запуск: node scripts/tenses/extract-oracle.js
// Тот же сбор зовёт engine.test.js — функцией collect(env).

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { JSDOM, VirtualConsole } = require('jsdom')

const DIR = path.join(__dirname, '..', '..', 'src', 'practice', 'tenses', '__fixtures__')
const SEED = 7

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Разметка без того, что законно различается у прототипа и порта (см. шапку). */
function norm(html) {
  return String(html)
    .replace(/ data-tr="\d+"/g, ' data-tr')
    // логотип шапки прототипа: у порта своей шапки нет — она у приложения
    .replace(/<a class="logo" href="#\/">[\s\S]*?<\/a>/g, '')
    .replace(/<svg class="tl" viewBox="0 0 340 120" role="img" aria-label="Timeline: ([^"]*)">([\s\S]*?)<\/svg>/g, (m, name, body) => `<svg:${name}${body.includes('class="tl-t') ? ':labels' : ''}>`)
    // значки (play, listen, карта…) — постоянные строки движка: сверяем их отпечатком, чтобы оракул не раздувался
    .replace(/<svg(?:\s[^>]*)?>[\s\S]*?<\/svg>/g, (m) => `<svg#${crypto.createHash('sha1').update(m).digest('hex').slice(0, 8)}>`)
    .replace(/ src="blob:[^"]*"/g, '')
    .replace(/<source src="[^"]*" type="video\/mp4">/g, '')
    .replace(/ poster="[^"]*"/g, ' poster="MEDIA"')
}

// Ответы, которые ученик мог бы набрать: эталон и его «соседи» — регистр, знаки, кавычки, сокращения туда и обратно.
const CONTRACT = [[/\bdo not\b/g, "don't"], [/\bdoes not\b/g, "doesn't"], [/\bdid not\b/g, "didn't"], [/\bis not\b/g, "isn't"], [/\bare not\b/g, "aren't"], [/\bwas not\b/g, "wasn't"], [/\bwere not\b/g, "weren't"], [/\bhave not\b/g, "haven't"], [/\bhas not\b/g, "hasn't"], [/\bhad not\b/g, "hadn't"], [/\bwill not\b/g, "won't"], [/\bI am\b/g, "I'm"], [/\b(he|she|it) is\b/gi, "$1's"], [/\b(we|you|they) are\b/gi, "$1're"], [/\b(I|we|you|they) have\b/g, "$1've"], [/\b(he|she|it) has\b/gi, "$1's"], [/\b(I|we|you|they|he|she|it) had\b/gi, "$1'd"], [/\b(I|we|you|they|he|she|it) will\b/gi, "$1'll"]]
function neighbours(a) {
  const out = [a, a.toUpperCase(), a + '.', '  ' + a + '!  ', a.replace(/'/g, '’'), a.replace(/'/g, '')]
  let c = a
  for (const [re, to] of CONTRACT) c = c.replace(re, to)
  out.push(c)
  out.push(a.replace(/n't\b/g, ' not').replace(/'m\b/g, ' am').replace(/'re\b/g, ' are').replace(/'ve\b/g, ' have').replace(/'ll\b/g, ' will'))
  out.push(a.split(' ').slice(0, -1).join(' '))
  return [...new Set(out)]
}
const EXTRA = [
  ["She's been working", ['she has been working']], ["He's gone", ['he has gone', 'he is gone']], ["I'd left", ['I had left']], ["I'd like", ['I would like']],
  ['doesnt work', ["doesn't work"]], ['wont come', ["won't come"]], ['cannot swim', ["can't swim"]], ['aint', ['is not']],
  ['“Did you go?”', ['did you go']], ['did you go ?', ['Did you go?']], ['has been', ['had been']], ['', ['x']],
]

/** Задания банка по порядку наборов пути. */
function allItems(P) {
  const out = []
  for (const st of P.STAGES) for (const id of st.sets) for (const it of P.SETS[id].items) out.push({ set: id, it })
  return out
}

function answerCases(TW) {
  const P = TW.PRACTICE
  const typed = []
  for (const { it } of allItems(P)) {
    if (it.t === 'gap' || it.t === 'rewrite') typed.push(it.a)
    if (it.t === 'text') for (const p of it.parts) if (typeof p === 'object') typed.push(p.a)
  }
  const out = []
  typed.forEach((answers, i) => {
    const other = typed[(i + 7) % typed.length]
    for (const a of answers) for (const s of neighbours(a)) out.push([s, answers, TW.sameAnswer(s, answers)])
    out.push([other[0], answers, TW.sameAnswer(other[0], answers)])
  })
  for (const [s, answers] of EXTRA) out.push([s, answers, TW.sameAnswer(s, answers)])
  return out
}

function labTable(TW) {
  const out = {}
  for (const id of TW.ORDER) {
    out[id] = {}
    for (const s of TW.SUBJECTS) {
      out[id][s.id] = {}
      for (const v of TW.VERBS) {
        out[id][s.id][v.id] = ['aff', 'neg', 'q'].map((f) => {
          const parts = TW.buildSentence(id, s, v, f)
          const c = TW.contract(parts, f)
          return [TW.partsToText(parts), c ? TW.partsToText(c) : null, parts.map((p) => p.k).join('')]
        })
      }
    }
  }
  return out
}

// ---------------------------------------------------------------- прохождение набора

function fire(el, type) {
  el.dispatchEvent(new el.ownerDocument.defaultView.Event(type, { bubbles: true }))
}
function typeInto(input, value) {
  input.value = value
  fire(input, 'input')
}
const optText = (b) => (b.querySelector('.tln') || b.querySelector('span')).textContent

/** Ответить на открытое задание: верно или нет. Возвращает, что было на экране до ответа. */
function answerItem(env, it, right) {
  const { $, $$, TW } = env
  const tname = (id) => TW.meta(id).name
  const card = $('#pr-card')
  const before = { instr: $('#pr-card .pr-instr').textContent, opts: $$('#pr-card .pr-opt').map(optText), tiles: $$('#pr-card .pr-bank .pr-tile').map((b) => b.textContent) }
  const pick = (scope, correct) => {
    const btns = [...scope.querySelectorAll('.pr-opt')]
    const good = btns.find((b) => optText(b) === correct)
    if (!good) throw new Error(`нет верного варианта «${correct}»`)
    ;(right ? good : btns.find((b) => b !== good)).click()
  }
  switch (it.t) {
    case 'choice':
    case 'meaning':
      pick(card, it.o[0])
      break
    case 'name':
    case 'timeline':
      pick(card, tname(it.o[0]))
      break
    case 'gap':
    case 'rewrite': {
      typeInto($('#pr-card .pr-input'), right ? it.a[0] : 'xyzzy')
      $('#pr-card [data-a=check]').click()
      break
    }
    case 'order': {
      const words = it.a.replace(/[.?!]$/, '').split(' ')
      const seq = right ? words : words.slice().reverse()
      for (const w of seq) {
        const tile = $$('#pr-card .pr-bank .pr-tile:not(.used)').find((b) => b.textContent === w)
        tile.click()
      }
      $('#pr-card [data-a=check]').click()
      break
    }
    case 'error': {
      const toks = $$('#pr-card .pr-tok')
      const err = toks.find((b) => b.textContent === it.err)
      ;(right ? err : toks.find((b) => b !== err)).click()
      pick($('#pr-card .pr-err2'), it.o[0])
      break
    }
    case 'text': {
      const gaps = it.parts.filter((p) => typeof p === 'object')
      $$('#pr-card .pr-text input').forEach((x, i) => typeInto(x, right || i > 0 ? gaps[i].a[0] : 'xyzzy'))
      $('#pr-card [data-a=check]').click()
      break
    }
    default:
      throw new Error(`тип ${it.t}`)
  }
  return before
}

const digest = (html) => crypto.createHash('sha1').update(html).digest('hex').slice(0, 16)

// Целиком оракул хранит не каждую карточку (241 задание, ~2 КБ каждое), а образцы: все задания первого набора и
// первое верное и первое неверное каждого типа; у остальных — отпечаток разметки. TENSES_ORACLE_FULL=1 у
// engine.test.js снимает оракул с копии прототипа заново и сверяет всё целиком — так ищется, где разошлось.
function runSet(env, id, keep) {
  const { $, open, TW } = env
  const items = TW.PRACTICE.SETS[id].items
  env.seed(SEED)
  open(`#/practice/${id}`)
  const log = []
  const head = norm($('.pr-top').innerHTML)
  items.forEach((it, i) => {
    const right = i % 3 !== 2
    const before = answerItem(env, it, right)
    const card = norm($('#pr-card').innerHTML)
    log.push({ ...before, right, count: $('.pr-count').textContent, sha: digest(card), ...(keep(id, it, right) ? { card } : {}) })
    $('#pr-card [data-a=next]').click()
  })
  const result = norm($('#pr-card').innerHTML)
  const progress = JSON.parse(JSON.stringify(env.state().practice || {}))[id] || null
  let retry = null
  const rb = $('#pr-card [data-a=retry]')
  if (rb) {
    rb.click()
    const missed = items.filter((_, i) => i % 3 === 2)
    const rlog = missed.map((it) => {
      const before = answerItem(env, it, true)
      const card = norm($('#pr-card').innerHTML)
      $('#pr-card [data-a=next]').click()
      return { ...before, sha: digest(card) }
    })
    retry = { head: norm($('.pr-top').innerHTML), log: rlog, result: norm($('#pr-card').innerHTML), progress: (env.state().practice || {})[id] || null }
  }
  return { head, log, result, progress, retry }
}

// Страницы времени целиком — две (настоящее и самое длинное прошедшее), у остальных — отпечаток.
const FULL_TENSES = ['present-simple', 'past-perfect-continuous']

/**
 * Общий для оракула и теста порта ход. env — то, что различается у прототипа и порта: TW, открыть адрес, корень
 * разметки, сид, прогресс.
 */
function collect(env, { full = false } = {}) {
  const { TW, open, $ } = env
  const root = () => norm(env.root().innerHTML)
  const out = {}
  out.meta = TW.ORDER.map((id) => {
    const m = TW.meta(id)
    return [m.id, m.group, m.aspect, m.name, m.num]
  })
  out.timelines = TW.ORDER.map((id) => [TW.timelineSVG(id).replace(/ data-tr="\d+"/g, ''), TW.timelineSVG(id, { labels: false })])
  out.lab = labTable(TW)
  out.same = answerCases(TW)

  open('#/')
  out.hub = root()
  // язык: строки на месте, без перерисовки
  $('[data-lang="ru"]').click()
  out.hubRu = root()
  $('[data-lang="kz"]').click()
  out.hubKz = root()
  $('[data-lang="en"]').click()

  out.tense = {}
  for (const id of TW.ORDER) {
    open(`#/t/${id}`)
    const html = root()
    const page = { sha: digest(html), ...(full || FULL_TENSES.includes(id) ? { html } : {}) }
    // формулы: вкладки «−» и «?»
    $('.forms-tabs [data-form="negative"]').click()
    page.neg = norm($('#formula-slot').innerHTML)
    $('.forms-tabs [data-form="question"]').click()
    page.q = norm($('#formula-slot').innerHTML)
    out.tense[id] = page
  }
  // Formula Lab по кликам: кто, действие, форма — и машина времени ведёт в лабораторию другого времени.
  open('#/t/past-perfect/lab')
  const lab = []
  for (const sel of ['[data-k="subj"][data-v="I"]', '[data-k="verb"][data-v="write"]', '[data-k="form"][data-v="neg"]', '[data-k="form"][data-v="q"]', '[data-k="subj"][data-v="they"]']) {
    $(`#lab-box ${sel}`).click()
    lab.push(norm($('#lab-box').innerHTML))
  }
  // Машина времени у прототипа меняет location.hash, и hashchange придёт уже после сбора: сверяем только адрес.
  $('#lab-box [data-go="future-perfect"]').click()
  out.labClicks = { log: lab, after: env.hash() }

  // язык на странице времени — переводы примеров появляются и прячутся
  open('#/t/present-simple')
  $('[data-lang="kz"]').click()
  out.tenseKz = root()
  $('[data-lang="en"]').click()

  open('#/practice')
  out.path = root()
  out.sets = {}
  const seen = new Set()
  const keep = (set, it, right) => {
    const k = `${it.t}:${right}`
    if (full || set === TW.PRACTICE.STAGES[0].sets[0] || !seen.has(k)) return seen.add(k), true
    return false
  }
  for (const st of TW.PRACTICE.STAGES) for (const id of st.sets) out.sets[id] = runSet(env, id, keep)
  open('#/practice')
  out.pathAfter = root()
  open('#/')
  out.hubAfter = root()
  open('#/t/present-simple/practice')
  out.lessonBlock = norm($('#practice').innerHTML)
  out.progress = JSON.parse(JSON.stringify(env.state()))
  return out
}

/** Оракул для html прототипа (копии или полного файла). */
function extractOracle(html, opts = {}) {
  const vc = new VirtualConsole() // jsdom ругается на HTMLMediaElement.load и scrollTo — молчим
  let rng = mulberry32(SEED)
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.Math.random = () => rng()
      window.speechSynthesis = { speaking: false, speak() {}, cancel() {}, getVoices: () => [] }
      window.SpeechSynthesisUtterance = function (text) {
        this.text = text
      }
      window.URL.createObjectURL = () => 'blob:fixture'
      window.scrollTo = () => {}
      window.Element.prototype.scrollIntoView = function () {}
    },
  })
  const w = dom.window
  const TW = w.TW
  if (!TW || !TW.route) throw new Error('прототип не поднялся: нет TW.route')
  try {
    return {
      seed: SEED,
      ...collect({
        TW,
        root: () => w.document.getElementById('tw-root'),
        $: (s) => w.document.querySelector(s),
        $$: (s) => [...w.document.querySelectorAll(s)],
        open: (h) => {
          w.history.replaceState(null, '', h)
          TW.route()
        },
        hash: () => w.location.hash,
        seed: (s) => {
          rng = mulberry32(s)
        },
        state: () => JSON.parse(w.localStorage.getItem('jts-tenses-world') || '{}'),
      }, opts),
    }
  } finally {
    w.close()
  }
}

module.exports = { extractOracle, collect, answerItem, norm, digest, mulberry32, SEED }

if (require.main === module) {
  const html = fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8')
  const o = extractOracle(html)
  fs.writeFileSync(path.join(DIR, 'oracle.json'), JSON.stringify(o, null, 1))
  const sets = Object.values(o.sets)
  const right = sets.reduce((n, s) => n + s.log.filter((x) => x.right).length, 0)
  console.log(
    `oracle.json ${Math.round(fs.statSync(path.join(DIR, 'oracle.json')).size / 1024)} КБ: наборов ${sets.length}, заданий ${sets.reduce((n, s) => n + s.log.length, 0)} (верно ${right}), ` +
      `сравнений ответа ${o.same.length}, Formula Lab ${Object.keys(o.lab).length * 6 * 6 * 3}`,
  )
  for (const [id, s] of Object.entries(o.sets)) console.log(id, s.progress && `${s.progress.best}/${s.progress.total}`, s.retry ? `retry ${s.retry.log.length}` : '')
}
