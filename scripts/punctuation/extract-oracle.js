// Оракул «Punctuation World»: что показывает и считает САМ прототип — разбор
// строк банка (parseB, текст, «пробел» gval и проверка ответа пробела),
// семьи знаков (famOf), счёт поставленных знаков (countMarks), сборка
// приключения страницы (buildRun) при зафиксированном Math.random, разметка
// главной, островов и уроков, и приключение целиком: каждое задание всех семи
// стадий (что на сцене, что в шапке), ошибки и «Swept back!», финал со
// звёздами. Порт (src/practice/punctuation/engine.js) сверяется с этим файлом
// (engine.test.js): красный тест значит, что порт разъехался с исходником.
//
// Прототип исполняется в jsdom как есть (урезанная копия из make-fixture.js).
// Случайность — mulberry32 с одним сидом, сбрасываемым перед каждой сборкой и
// каждым приключением. Время — свои часы (virtualClock): одни и те же у
// прототипа и порта, поэтому порядок таймеров совпадает, а приключение
// проходится за доли секунды. «Меньше движения» (prefers-reduced-motion)
// включено: прототип сам сжимает паузы до 120 мс и не рисует конфетти, искры
// и полёт знака, — у jsdom нет ни анимаций, ни canvas. Element.animate —
// заглушка, которая сразу «доиграла».
//
// Внутреннее состояние прототипа (G, W, PR, чистые функции) — объявления
// верхнего уровня скрипта; их видно из window.eval того же окна.
//
// Запуск: node scripts/punctuation/extract-oracle.js
// Тот же сбор над полным прототипом зовёт engine.test.js (переменная
// PUNCTUATION_HTML) — функцией extractOracle(html).

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { JSDOM, VirtualConsole } = require('jsdom')

const DIR = path.join(__dirname, '..', '..', 'src', 'practice', 'punctuation', '__fixtures__')
const SEED = 42

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const realImmediate = globalThis.setImmediate
const tick = () => new Promise((r) => realImmediate(r))

/**
 * Свои часы: setTimeout/clearTimeout/requestAnimationFrame/performance.now. advance(ms) срабатывает таймеры по
 * порядку времени (и постановки), после каждого — все микрозадачи (обещания движка).
 */
function virtualClock() {
  let now = 0
  let seq = 0
  const q = new Map()
  const add = (fn, ms, args) => {
    const id = ++seq
    q.set(id, { at: now + Math.max(0, +ms || 0), id, fn, args })
    return id
  }
  return {
    setTimeout: (fn, ms, ...args) => add(fn, ms, args),
    clearTimeout: (id) => q.delete(id),
    requestAnimationFrame: (fn) => add(() => fn(now), 16, []),
    cancelAnimationFrame: (id) => q.delete(id),
    now: () => now,
    async advance(ms) {
      const end = now + Math.max(0, ms)
      await tick()
      for (;;) {
        let next = null
        for (const t of q.values()) if (t.at <= end && (!next || t.at < next.at || (t.at === next.at && t.id < next.id))) next = t
        if (!next) break
        q.delete(next.id)
        now = next.at
        next.fn(...next.args)
        await tick()
      }
      now = end
      await tick()
    },
  }
}

/** Окружение jsdom, одинаковое у прототипа и порта: часы, случайность, «меньше движения», заглушки без layout. */
function setupWindow(window, { clock, random }) {
  window.Math.random = random
  window.setTimeout = clock.setTimeout
  window.clearTimeout = clock.clearTimeout
  window.requestAnimationFrame = clock.requestAnimationFrame
  window.cancelAnimationFrame = clock.cancelAnimationFrame
  try {
    Object.defineProperty(window.performance, 'now', { configurable: true, value: clock.now })
  } catch {
    /* jsdom без performance — once() прототипа тогда упадёт сам */
  }
  window.matchMedia = (q) => ({ matches: /prefers-reduced-motion:\s*reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {} })
  window.Element.prototype.animate = function () {
    return { finished: Promise.resolve(), cancel() {} }
  }
  window.Element.prototype.scrollIntoView = function () {}
  window.scrollTo = () => {}
  if (!window.CSS) window.CSS = {}
  if (!window.CSS.escape) window.CSS.escape = (s) => String(s).replace(/["\\]/g, '\\$&')
}

const imgKey = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 24)

/**
 * Разметка без того, что у порта другое нарочно: картинки — data: у прототипа и ссылки у порта сводятся к
 * имени по содержимому (как у бэкенда); логотип шапки, строка «progress is saved in this browser» с «Reset
 * progress» и srcset главной (у прототипа data:, у порта — ссылки) — см. шапку engine.js.
 */
function norm(html) {
  return String(html)
    .replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, (m) => `IMG(${imgKey(m)})`)
    .replace(/\/__punct-media\/([0-9a-f]{24})\.webp/g, 'IMG($1)')
    .replace(/<svg class="logo" [\s\S]*?<\/svg><span class="brand-sep" aria-hidden="true"><\/span>/g, '')
    .replace(
      '<span>Just To Study · Punctuation World · progress is saved in this browser</span><span style="display:flex;gap:16px;flex-wrap:wrap"><button class="linkbtn" data-act="reset">Reset progress</button></span>',
      '<span>Just To Study · Punctuation World</span>',
    )
    .replace(/ srcset="[^"]*" sizes="100vw"/g, '')
}

// Значения, на которых сверяются famOf и countMarks: все знаки банка и всё, что движок умеет назвать.
const GLYPHS = ['', ' ', '.', ',', '?', '!', ':', ';', '“', '”', '‘', '’', '’s', 's’', 's', '-', '–', '—', '/', '…', '(', ')', '[', ']', '?”', ',”', '.”', '”?', '”.', '”,', '?,”', '’.', '.’', 'abc', 'Its', null]

function pureOf(F, CUE) {
  const out = { parse: [], text: [], gaps: [], fam: {}, count: {} }
  for (const it of F.ITEMS) {
    out.parse.push(F.parseB(it.s).map((p) => (p.g ? { a: p.a, k: p.k, acc: p.acc, t: p.c ? p.c.t : null } : { t: p.t })))
    out.text.push(F.joinTxt(F.freshParts(it)))
    for (const p of F.freshParts(it).filter((x) => x.g)) {
      const vals = [...new Set([p.a, ...p.acc, ...(CUE[p.k] ? CUE[p.k].alt : []), ''])]
      out.gaps.push({ item: it.id, k: p.k, wrongs: F.wrongs(p), check: vals.map((v) => [v, F.gval(p, v), p.acc.includes(v)]) })
    }
  }
  const glyphs = [...new Set([...GLYPHS, ...out.gaps.flatMap((g) => g.check.map((c) => c[0]))])]
  for (const g of glyphs) out.fam[String(g)] = F.famOf(g)
  for (const g of glyphs) {
    const into = {}
    F.countMarks(g, into)
    out.count[String(g)] = into
  }
  return out
}

/**
 * Приключение страницы N: каждое ожидание ввода — по политике (верно / неверно), запись того, что на сцене.
 * policy({ si, ci, kind, n, swept }) → true, если ответить неверно.
 */
async function playGame(env, N, policy) {
  const { $, wait } = env
  env.seed(SEED + N)
  env.open(`#/play/${N}`)
  const log = []
  let n = 0
  let swept = 0
  for (let guard = 0; guard < 4000; guard++) {
    if ($('.scard.win')) break
    const { G, W } = env.state()
    const w = W.wait
    if (!w) {
      await wait(20)
      continue
    }
    if (w.kind === 'ok') {
      const box = $('.oops') || $('#ov .scard')
      const txt = box ? box.textContent.replace(/\s+/g, ' ').trim() : ''
      if (/Swept back!/.test(txt)) swept++
      log.push({ ok: txt, si: G.si, tide: G.tide })
      $('[data-a3="ok"]').click()
      await wait(0)
      continue
    }
    const at = { si: G.si, ci: G.ci, tide: G.tide, stage: norm(W.el.stage.innerHTML), hud: norm(W.el.hud.innerHTML) }
    const wrong = policy({ si: G.si, ci: G.ci, kind: w.kind, n: n++, swept })
    if (w.kind === 'pick') {
      const opts = [...env.all('.obj[data-v],.raft[data-v]')].map((b) => b.dataset.v)
      const raft = !!$('.rafts')
      const right = (v) => (raft ? v === 'f' : W.ans.includes(v))
      const v = opts.find((x) => right(x) !== wrong) ?? opts[0]
      log.push({ ...at, kind: raft ? 'raft' : 'one', opts, ans: raft ? ['f'] : W.ans.slice(), pick: v })
      $(`[data-a3="pick"][data-v="${env.CSS.escape(v)}"]`).click()
      await wait(0)
      continue
    }
    if (w.kind === 'send') {
      const S = W.stitch
      const set = []
      let bad = wrong
      for (const g of S.gaps) {
        let want = g.a
        if (bad) {
          const x = S.opts.find((o) => !g.acc.includes(o))
          if (x != null) {
            want = x
            bad = false
          }
        }
        if (g.v !== want) {
          $(`.gap[data-k="${g.id}"]`).click()
          await wait(0)
          $(`.picker [data-v="${env.CSS.escape(want)}"]`).click()
          await wait(0)
        }
        set.push(g.v)
      }
      log.push({ ...at, kind: 'stitch', opts: S.opts.slice(), acc: S.gaps.map((g) => g.acc), set, repair: S.repair })
      $('[data-a3="send"]').click()
      await wait(0)
      continue
    }
    throw new Error(`непонятное ожидание ${w.kind}`)
  }
  const win = $('.scard.win')
  if (!win) throw new Error(`приключение страницы ${N} не закончилось`)
  const { G, PR } = env.state()
  return {
    log,
    swept,
    win: norm(win.outerHTML),
    res: G.res.slice(),
    marks: { ...G.marks },
    p: { ...PR.p },
    run: PR.run ? JSON.parse(JSON.stringify(PR.run)) : null,
  }
}

// Политики: почти всё верно (ошибка в первом камне, первом плоте и первом мосте) и «смыло»: всё неверно на
// второй стадии, пока Murmur не унесёт Декстера, потом верно; плюс ошибка в последнем послании.
const POLICIES = {
  mostly: ({ si, ci, kind }) => (si === 0 && ci === 0) || (si === 2 && ci === 0 && kind === 'pick') || (si === 4 && ci === 0),
  swept: ({ si, ci, swept }) => (si === 1 && swept === 0) || (si === 6 && ci === 2),
}

/** Общий для оракула и теста порта ход. env — то, что различается у прототипа и порта. */
async function collect(env) {
  const F = env.fns()
  const { TOPICS } = env.data()
  const out = { pure: pureOf(F, env.data().CUE), runs: {}, home: {}, lesson: {}, games: {} }

  for (const t of TOPICS) {
    out.runs[t.id] = []
    for (let s = 1; s <= 4; s++) {
      env.seed(SEED * 100 + s)
      out.runs[t.id].push(F.buildRun(t.id))
    }
  }

  env.open('#/')
  out.home.start = norm(env.app().innerHTML)
  env.open('#/islands')
  out.home.islands = norm(env.app().innerHTML)
  for (const tab of env.all('[data-act="isle"]')) {
    tab.click()
    out.home[`isle-${tab.dataset.k}`] = norm(env.$('#isle-panel').innerHTML)
  }
  out.home.hash = env.hash()

  for (const t of TOPICS) {
    env.open(`#/lesson/${t.id}`)
    const shots = [norm(env.app().innerHTML)]
    const fix = env.$('[data-act="fix"]')
    if (fix) {
      fix.click()
      shots.push(norm(fix.closest('.fix').outerHTML))
    }
    const note = env.all('[data-act="note"]')[1] || env.$('[data-act="note"]')
    if (note) {
      note.click()
      shots.push(norm(env.$('.doc').innerHTML))
    }
    const tr = env.$('[data-act="tr"][data-k="ru"]')
    tr.click()
    shots.push(env.root().dataset ? env.trState() : null)
    tr.click()
    out.lesson[t.id] = shots
  }
  // главная после уроков: «Continue · Play»
  env.open('#/')
  out.home.afterLearn = norm(env.app().innerHTML)

  for (const t of TOPICS) {
    out.games[t.id] = {}
    for (const [name, policy] of Object.entries(POLICIES)) out.games[t.id][name] = await playGame(env, t.id, policy)
  }
  env.open('#/')
  out.home.afterPlay = norm(env.app().innerHTML)
  return out
}

/** Оракул для html прототипа (урезанного или полного). */
async function extractOracle(html) {
  const vc = new VirtualConsole()
  const errors = []
  vc.on('jsdomError', (e) => {
    // jsdom не умеет canvas и навигацию — это не ошибки прототипа
    if (!/Not implemented/.test(e.message)) errors.push(e.message)
  })
  vc.on('error', (...a) => errors.push(a.join(' ')))
  let rng = mulberry32(SEED)
  const clock = virtualClock()
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      setupWindow(window, { clock, random: () => rng() })
    },
  })
  const w = dom.window
  if (typeof w.route !== 'function') throw new Error('прототип не поднялся: нет route()')
  const ev = (code) => w.eval(code)
  try {
    const out = await collect({
      $: (s) => w.document.querySelector(s),
      all: (s) => w.document.querySelectorAll(s),
      app: () => w.document.getElementById('app'),
      root: () => w.document.documentElement,
      trState: () => w.document.documentElement.dataset.tr,
      hash: () => w.location.hash,
      CSS: w.CSS,
      open: (h) => {
        w.history.replaceState(null, '', h)
        w.route()
      },
      seed: (s) => {
        rng = mulberry32(s)
      },
      wait: (ms) => clock.advance(Math.max(1, ms)),
      state: () => ev('({G, W, PR})'),
      fns: () => ev('({parseB, buildRun, famOf, countMarks, gval, joinTxt, wrongs, freshParts, ITEMS})'),
      data: () => ev('({TOPICS, CUE})'),
    })
    if (errors.length) throw new Error('прототип ругался: ' + errors.join('; '))
    return { seed: SEED, ...out }
  } finally {
    w.close()
  }
}

module.exports = { extractOracle, collect, norm, mulberry32, virtualClock, setupWindow, POLICIES, SEED }

if (require.main === module) {
  const html = fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8')
  extractOracle(html)
    .then((o) => {
      fs.writeFileSync(path.join(DIR, 'oracle.json'), JSON.stringify(o, null, 1))
      for (const [id, g] of Object.entries(o.games)) {
        for (const [name, r] of Object.entries(g)) {
          console.log(`страница ${id} ${name}: заданий ${r.log.filter((x) => !('ok' in x)).length}, смыло ${r.swept}, res ${r.res.join('')}, звёзды ${JSON.stringify(r.p)}`)
        }
      }
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
