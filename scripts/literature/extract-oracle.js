// Оракул «Literature World»: что показывает и считает САМ прототип — главная
// книги, все главы и переулки, каждая пьеса (обзор, читалка, персонажи; у
// «Ромео и Джульетты» — темы, язык, сцена и практика), каждый текст прозы
// (задания «конец предложения» и «мораль»), каждое произведение трёх видов
// (Experience, Explore, Practise со всеми заданиями: порядок строк, рифма,
// хлопки, семь возрастов, два голоса, загадка), пословица (собери её), каждое
// слово (шесть шагов, задания, блокнот, своё предложение), Words Lab, поиск,
// регистры, Everyday Shakespeare, все задания мастерской, реестр источников,
// подсказка к слову, окно «About», смена языка и уровня. Ответы — и верные,
// и неверные. Порт (src/practice/literature/engine.js) сверяется с этим файлом
// (engine.test.js): красный тест значит, что порт разъехался с исходником, —
// чинить порт.
//
// Прототип исполняется в jsdom как есть (копия из make-fixture.js), со своим
// генератором случайных чисел (зерно одно у прототипа и порта — задания
// перемешиваются одинаково). Экраны открываются его роутером (route()), но
// go() — синхронный, как у порта (см. collectPrototype). Движение выключено (prefers-reduced-motion), раскладки нет
// (прямоугольники нулевые) — кадрирование сцен и подгрузка картинок идут по
// тем же веткам, что у порта на нулевой ширине (телефонная ветка, max-width).
// Синтеза речи в jsdom нет — кнопки «послушать» у слова нет ни там, ни там
// (порт монтируется без cfg.speak).
//
// Разметка сравнивается отпечатком (sha1) нормализованного html. Нормализация
// (norm) убирает только то, что законно различается у прототипа и порта:
// адреса сцен и маскотов (data-URI / blob ↔ ссылка бакета), имена атрибутов
// inline-обработчиков (onclick ↔ data-lw-onclick) и темы эпохи (data-theme ↔
// data-lw-theme).
//
// Запуск: node scripts/literature/extract-oracle.js
// Тот же сбор зовёт engine.test.js — функцией collect(env).

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const DIR = path.join(__dirname, '..', '..', 'src', 'practice', 'literature', '__fixtures__')

/** Разметка без того, что законно различается у прототипа и порта (см. шапку). */
function norm(html) {
  return String(html)
    .replace(/data:(?:image|video)\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, 'MEDIA')
    .replace(/blob:[^'")\s]+/g, 'MEDIA')
    .replace(/\/__literature-media\/[A-Za-z0-9_.-]+/g, 'MEDIA')
    .replace(/data-lw-on(click|input|change|submit|error)=/g, 'on$1=')
    .replace(/data-lw-theme=/g, 'data-theme=')
    // код inline-обработчиков у порта ищет по корню раздела (замены build-engine.js), у прототипа — по документу
    .replace(/\$id\(/g, 'document.getElementById(')
    .replace(/\$\('\.srch'\)/g, "document.querySelector('.srch')")
    .replace(/\bLW_SQ\b/g, 'window._sq')
}
const sha = (s) => crypto.createHash('sha1').update(norm(s)).digest('hex').slice(0, 12)
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))

/** Генератор случайных чисел с зерном (mulberry32) — один у прототипа и порта. */
function seeded(seed = 20261117) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// код inline-обработчика у прототипа — onclick, у порта — data-lw-onclick
const handler = (el, type = 'click') => (el && (el.getAttribute('on' + type) || el.getAttribute('data-lw-on' + type))) || ''
const idsOf = (els, re) => [...new Set(els.map((b) => (handler(b).match(re) || [])[1]).filter(Boolean))]

function fire(el, type, init = {}) {
  const W = el.ownerDocument.defaultView
  el.dispatchEvent(new W.Event(type, { bubbles: true, cancelable: true, ...init }))
}
function type(el, value) {
  el.value = value
  fire(el, 'input')
}

// ---------------------------------------------------------------- задания

/** Вопросы с вариантами (mcRun / ask мастерской): задание i — вариант (i + n) % вариантов; след каждого. */
async function playChoices(env, box, n, limit = 12) {
  const out = []
  for (let i = 0; i < limit; i++) {
    const opts = [...box.querySelectorAll('.opts button')]
    if (!opts.length) break
    const pick = opts[(i + n) % opts.length]
    pick.click()
    await tick()
    out.push([opts.map((o) => o.dataset.o).join('|'), opts.indexOf(pick), sha(box.innerHTML)])
    const next = box.querySelector('.fb .nx') || [...box.querySelectorAll('.fb button')].find((b) => /Next/.test(b.textContent))
    if (!next) break
    next.click()
    await tick()
  }
  out.push(sha(box.innerHTML))
  return out
}

/** Задание «по порядку»: сначала как лежит (обычно неверно), «Start again», потом по data-ключу (верно, если ключ — номер). */
function playOrder(box, sel, key) {
  const trace = []
  const tiles = () => [...box.querySelectorAll(sel)].filter((b) => !b.disabled)
  for (let g = 0; g < 40 && tiles().length; g++) tiles()[0].click()
  trace.push(sha(box.innerHTML))
  const reset = box.querySelector('#rs')
  if (reset) {
    reset.click()
    const sorted = tiles().sort((a, b) => +a.dataset[key] - +b.dataset[key])
    for (const b of sorted) {
      const live = tiles().find((x) => x.dataset[key] === b.dataset[key])
      if (live) live.click()
    }
    trace.push(sha(box.innerHTML))
  }
  return trace
}

/** Варианты по очереди, пока не выйдет верный (рифма, конец предложения). */
function playUntilOk(box, sel) {
  const trace = []
  for (let g = 0; g < 8; g++) {
    const b = [...box.querySelectorAll(sel)].find((x) => !x.disabled && !x.classList.contains('no') && !x.classList.contains('ok'))
    if (!b) break
    b.click()
    trace.push(sha(box.innerHTML))
    if (box.querySelector(sel + '.ok')) break
  }
  return trace
}

/** Задания вкладки Practise произведения. */
async function playActs(env, it) {
  const out = {}
  const tabs = env.qa('.acts button')
  for (const tab of tabs.map((b) => b.dataset.act)) {
    const b = env.qa('.acts button').find((x) => x.dataset.act === tab)
    b.click()
    await tick()
    const box = env.q('#actBody')
    const trace = [sha(box.innerHTML)]
    if (tab === 'order') trace.push(...playOrder(box, '.choices button', 'i'))
    else if (tab === 'seq') trace.push(...playOrder(box, '.opts button', 'w'))
    else if (tab === 'missing') {
      trace.push(...playUntilOk(box, '.opts button'))
      const again = box.querySelector('#again')
      if (again) {
        again.click()
        trace.push(sha(box.innerHTML))
      }
    } else if (tab === 'clap') {
      box.querySelector('#cl').click()
      box.querySelector('#cl').click()
      env.key('Space')
      trace.push(sha(box.innerHTML))
      box.querySelector('#nx').click()
      trace.push(sha(box.innerHTML))
    } else if (tab === 'stressT') {
      const w = [...box.querySelectorAll('.stress button')]
      w[0].click()
      w[3].click()
      trace.push(sha(box.innerHTML))
    } else if (tab === 'dialogue') {
      box.querySelector('#vB').click()
      trace.push(sha(box.innerHTML))
    } else if (tab === 'ladder') {
      const lad = [...box.querySelectorAll('.ladder button')]
      lad[lad.length - 1].click()
      trace.push(sha(box.innerHTML))
    } else if (tab === 'riddle') {
      box.querySelector('#rg').value = 'zzzz'
      box.querySelector('#rb').click()
      trace.push(sha(box.innerHTML))
      box.querySelector('#rg').value = String(it.answer || '').replace(/^(A|An|The)\s+/i, '')
      box.querySelector('#rb').click()
      trace.push(sha(box.innerHTML))
    }
    out[tab] = trace
  }
  return out
}

// ---------------------------------------------------------------- сбор

/**
 * @param env  { data: бандл, go(hash) → Promise, q(sel), qa(sel), app(), theme(), lang(), key(code),
 *             notebook(): { id: ts }, drafts(): { id: текст }, modal(): окно «About» или null }
 */
async function collect(env) {
  const { x } = env.data
  const out = { screens: {}, plays: {}, texts: {}, items: {}, words: {}, extras: {} }
  const shot = () => ({ app: sha(env.app().innerHTML), theme: env.theme(), nav: sha(env.q('#nav').innerHTML), lvl: sha(env.q('#lvlSel').innerHTML) })
  const go = async (h) => {
    await env.go(h)
    return shot()
  }

  // главная, главы, переулки, неизвестный адрес
  for (const h of ['home', 'shakespeare', 'drama', 'poetry', 'prose', 'prose/gothic', 'words', 'periods', 'rhymes', 'proverbs', 'voices', 'workshop', 'everyday', 'sources', 'nope']) out.screens[h] = await go(h)

  // язык интерфейса и подсказок: на главной и в Explore стиха; уровень — выбором в шапке
  await env.go('home')
  for (const k of [1, 2, 0]) {
    env.qa('#lang button')[k].click()
    await tick()
    out.extras['lang:' + k] = { ...shot(), lang: env.lang(), langs: sha(env.q('#lang').innerHTML) }
  }
  const lvl = env.q('#lvlSel')
  lvl.value = 'B1'
  fire(lvl, 'change')
  await tick()
  out.extras.levelHome = shot()
  await env.go('poetry')
  out.extras.levelPoetry = shot()
  lvl.value = ''
  fire(env.q('#lvlSel'), 'change')
  await tick()
  out.extras.levelOff = shot()
  // уровень плашкой на главной (inline-код: LEVEL=…;render();setTimeout(lwScroll…))
  await env.go('home')
  const plate = env.qa('.lw-plates button')[2]
  if (plate) {
    plate.click()
    await tick(80)
    out.extras.levelPlate = shot()
    env.qa('.lw-plates button')[2].click()
    await tick(80)
  }

  // фильтры комнат — чипы с inline-кодом S.f.…=…;render()
  await env.go('poetry')
  for (const chip of env.qa('.filters .chip').slice(0, 3).map((c) => handler(c))) {
    const c = env.qa('.filters .chip').find((b) => handler(b) === chip)
    c.click()
    await tick()
    out.extras['poetryChip:' + chip] = shot()
  }

  // пьесы: обзор, читалка (сцена и репетиция), персонажи; у Ромео и Джульетты — все вкладки и практика
  const plays = Object.keys({ ...env.data.sh, ...env.data.ot }).concat('riders')
  for (const id of plays) {
    const rec = { overview: await go(`play/${id}`), read: await go(`play/${id}/read`), characters: await go(`play/${id}/characters`) }
    const rh = env.q('.rtools select')
    if (rh && rh.options.length > 1) {
      rh.value = rh.options[1].value
      fire(rh, 'change')
      await tick()
      rec.rehearse = shot()
      const mine = env.q('.sp.mine .lines')
      if (mine) {
        mine.click()
        rec.rehearseShow = sha(env.app().innerHTML)
      }
    }
    if (id === 'romeo' || id === 'hamlet') {
      for (const t of ['themes', 'language', 'stage']) rec[t] = await go(`play/${id}/${t}`)
      rec.scene = await go(`play/${id}/read/1.1`)
      const sel = env.q('.snav-sel')
      sel.value = sel.options[3].value
      fire(sel, 'change')
      await tick()
      rec.sceneSelect = shot()
      env.qa('.rtools button')[1].click()
      await tick()
      rec.textSize = shot()
      rec.practise = await go(`play/${id}/practiseT`)
      const box = env.q('#pactBody')
      const who = []
      for (let i = 0; i < 3; i++) {
        const opts = [...box.querySelectorAll('.opts button')]
        opts[i % opts.length].click()
        who.push(sha(box.innerHTML))
        box.querySelector('#nxq').click()
      }
      rec.whoSays = who
      const plot = env.qa('[data-pact]').find((b) => b.dataset.pact === 'plot')
      if (plot) {
        plot.click()
        rec.plot = playOrder(env.q('#pactBody'), '.choices button', 'i')
      }
      // цитата темы ведёт в сцену (goQuote: переход и подсветка реплики)
      await env.go(`play/${id}/themes`)
      const qt = env.q('.qt')
      if (qt) {
        qt.click()
        await tick(150)
        rec.quote = { ...shot(), flash: env.qa('.sp.flash').map((e) => e.id).join(',') }
      }
    }
    out.plays[id] = rec
  }

  // проза: каждый текст; задания «конец» и «мораль»
  for (const t of x.prose.concat(env.data.world.prose)) {
    const rec = { page: await go(`text/${t.id}`) }
    const ending = env.qa('[data-xact]').find((b) => b.dataset.xact === 'ending')
    if (ending) {
      ending.click()
      const box = env.q('#xBody')
      rec.ending = playUntilOk(box, '.choices button')
      box.querySelector('#nx2').click()
      rec.ending.push(sha(box.innerHTML))
    }
    const moral = env.qa('[data-xact]').find((b) => b.dataset.xact === 'moral')
    if (moral) {
      moral.click()
      const box = env.q('#xBody')
      const trace = []
      for (let f = 0; f < 4; f++) {
        const fable = [...box.querySelectorAll('[data-f]')].find((b) => !b.disabled)
        if (!fable) break
        fable.click()
        for (const m of [...env.q('#xBody').querySelectorAll('[data-m]')].filter((b) => !b.disabled)) {
          m.click()
          trace.push(sha(env.q('#xBody').innerHTML))
          if (!env.q('#xBody').querySelector('[data-f].on')) break
        }
      }
      rec.moral = trace
      await tick(700)
    }
    const retell = env.qa('[data-xact]').find((b) => b.dataset.xact === 'retell')
    if (retell) {
      retell.click()
      rec.retell = sha(env.q('#xBody').innerHTML)
    }
    out.texts[t.id] = rec
  }

  // произведения: всё, что лежит в комнатах (стихи, Шекспир, стишки, скороговорки, лимерики, загадки, пословицы)
  const items = []
  for (const room of ['poetry', 'shakespeare', 'rhymes', 'proverbs']) {
    await env.go(room)
    for (const id of idsOf(env.qa('#app button'), /^go\('item','([^']+)'\)$/)) if (!items.includes(id)) items.push(id)
  }
  let n = 0
  for (const id of items) {
    const rec = { experience: await go(`item/${id}`) }
    if (env.q('.stage-tabs')) {
      rec.explore = await go(`item/${id}/explore`)
      const dev = env.q('.dev')
      if (dev) {
        dev.click()
        rec.device = env.q('#devDef').textContent
      }
      const seg = env.qa('.seg button')[1]
      if (seg) {
        seg.click()
        await tick()
        rec.sup = sha(env.app().innerHTML)
        env.qa('.seg button')[0].click()
        await tick()
      }
      const src = env.q('.src-line button')
      if (src) {
        src.click()
        rec.srcMore = env.q('.src-more').hidden
      }
      rec.practise = await go(`item/${id}/practise`)
      rec.acts = await playActs(env, x.riddles.find((r) => r.id === id) || {})
    } else {
      // пословица: смысл открывается нажатием; собрать — сначала как лежит, потом по порядку
      const rv = env.q('.reveal-btn')
      if (rv) {
        rv.click()
        rec.reveal = rv.className
      }
      const pool = () => env.qa('#po button').filter((b) => !b.disabled)
      for (const b of pool()) b.click()
      rec.rebuildMixed = [sha(env.q('#pb').innerHTML), env.q('#pf').textContent]
      env.qa('.pv-grid .btn.ghost').find((b) => /render\(\)/.test(handler(b))).click()
      await tick()
      for (const b of pool().sort((a, c) => +a.dataset.k - +c.dataset.k)) b.click()
      rec.rebuildRight = [sha(env.q('#pb').innerHTML), env.q('#pf').textContent]
    }
    // подсказка к слову (gloss): окно у слова
    const w = env.q('#app .w[data-g]')
    if (w) {
      await env.go(`item/${id}`)
      const ww = env.q('#app .w[data-g]')
      if (ww) {
        ww.click()
        const pop = env.q('#pop')
        rec.pop = [pop.hidden, sha(pop.innerHTML), pop.style.left, pop.style.top]
        env.app().click()
        rec.popClosed = env.q('#pop').hidden
      }
    }
    // строка стиха подсвечивается нажатием
    const ln = env.q('#poem .ln')
    if (ln) {
      ln.click()
      rec.line = ln.className
    }
    out.items[id] = rec
    n++
  }

  // слова: шесть шагов, задания, блокнот, своё предложение
  n = 0
  for (const w of x.words) {
    const rec = { page: await go(`word/${w.id}`) }
    rec.tasks = await playChoices(env, env.q('#wprac'), n++)
    if (n % 3 === 1) {
      env.q('.whead .btn').click()
      await tick()
      rec.saved = { app: sha(env.app().innerHTML), notebook: Object.keys(env.notebook()).sort() }
    }
    if (n % 5 === 2) {
      const ta = env.q('#wprod')
      ta.value = n % 2 ? `I like ${w.word} very much.` : 'Nothing here.'
      const check = env.qa('.wstep button').find((b) => /checkProd/.test(handler(b)))
      if (check) {
        check.click()
        rec.produce = [env.q('#wpf').textContent, env.drafts()[w.id] || null]
      }
    }
    out.words[w.id] = rec
  }
  // снять одно слово из блокнота: та же кнопка
  const first = x.words[0]
  await env.go(`word/${first.id}`)
  env.q('.whead .btn').click()
  await tick()
  out.extras.unsave = Object.keys(env.notebook()).sort()

  // список слов: фильтры, поиск по словам, «Show all», Words Lab, «Find a word»
  await env.go('words')
  await tick()
  out.extras.wordsLab = await playChoices(env, env.q('#wlab'), 1, 8)
  const chips = env.qa('.wfil .chip').map((c) => handler(c))
  for (const code of chips.slice(1, 4)) {
    const c = env.qa('.wfil .chip').find((b) => handler(b) === code)
    if (!c) continue
    c.click()
    await tick()
    out.extras['wordsChip:' + code] = shot()
  }
  await env.go('home')
  await env.go('words')
  await tick()
  type(env.q('#wq'), 'love')
  out.extras.wordsSearch = [env.q('#wqn').textContent, sha(env.app().innerHTML)]
  const more = env.q('.wmore')
  if (more) {
    type(env.q('#wq'), '')
    env.q('.wmore').click()
    out.extras.wordsMore = sha(env.app().innerHTML)
  }
  // «Search» формы — inline onsubmit c this.q.value: в jsdom у формы нет именованных полей, поэтому сам поиск
  // открывается адресом (форму проверяет e2e в настоящем браузере)
  out.extras.find = await go('find/heart')
  const hit = env.q('.hit')
  if (hit) {
    hit.click()
    await tick(150)
    out.extras.findHit = shot()
  }

  // Everyday Shakespeare, регистры — практика с вариантами; цитата фразы — в сцену
  await env.go('everyday')
  await tick()
  out.extras.everyday = await playChoices(env, env.q('#evx'), 2, 8)
  env.qa('.filters .chip')[1].click()
  await tick()
  out.extras.everydayPlay = shot()
  await env.go('voices')
  await tick()
  out.extras.voices = await playChoices(env, env.q('#regx'), 3, 7)
  const gr = env.qa('.filters .chip')[2]
  if (gr) {
    gr.click()
    await tick()
    out.extras.voicesGrose = shot()
  }

  // мастерская: каждое задание, по три вопроса
  const ws = []
  await env.go('workshop')
  for (const id of idsOf(env.qa('.ws-nav button'), /^go\('workshop','([^']+)'\)$/)) ws.push(id)
  out.extras.workshop = {}
  n = 0
  for (const k of ws) {
    await env.go(`workshop/${k}`)
    await tick()
    const rec = { open: shot() }
    const box = env.q('#wsb')
    if (box && k === 'rebuild') rec.tiles = playOrder(box, '.wordtiles button', 'x')
    else if (box && k !== 'words' && k !== 'ending' && k !== 'listen') {
      const trace = []
      for (let i = 0; i < 3; i++) {
        const b = env.q('#wsb')
        const opts = [...b.querySelectorAll('.opts button')]
        if (!opts.length) break
        opts[(i + n) % opts.length].click()
        trace.push([opts.map((o) => o.dataset.o).join('|'), sha(b.innerHTML)])
        const again = [...b.querySelectorAll('.fb button')].find((x) => /Another|Next/.test(x.textContent))
        if (!again) break
        again.click()
        await tick()
      }
      rec.tasks = trace
    }
    rec.after = { view: env.app() ? sha(env.app().innerHTML) : null, theme: env.theme() }
    out.extras.workshop[k] = rec
    n++
  }

  // реестр источников: фильтр (inline oninput с таймером 250 мс)
  await env.go('sources')
  type(env.q('.srch'), 'keats')
  await tick(320)
  out.extras.sourcesFilter = shot()

  // окно «About» — открыть и закрыть
  await env.go('home')
  env.q('#aboutBtn').click()
  out.extras.about = sha(env.modal().innerHTML)
  env.modal().querySelector('.btn.ghost').click()
  out.extras.aboutClosed = env.modal() === null

  // запись себя: микрофона в jsdom нет — сообщение, а не тишина
  await env.go('item/po-tiger/practise')
  env.q('#recBtn').click()
  await tick(20)
  out.extras.rec = sha(env.q('#rec').innerHTML)
  // видео: постер → встроенный плеер YouTube
  await env.go('item/sh-to-be')
  const vid = env.q('.vid .poster')
  if (vid) {
    vid.click()
    out.extras.video = sha(env.q('.vid').innerHTML)
  }
  // бургер шапки
  env.q('.burger').click()
  out.extras.burger = env.q('#nav').className
  out.extras.notebook = Object.keys(env.notebook()).sort()
  return out
}

// ---------------------------------------------------------------- прототип в jsdom

function stubs(window, random) {
  window.scrollTo = () => {}
  window.scrollBy = () => {}
  window.Element.prototype.scrollIntoView = () => {}
  // движение выключено; «телефон или планшет» (max-width) — как у порта на нулевой ширине раздела
  window.matchMedia = (q) => ({ matches: /prefers-reduced-motion|max-width/.test(q), media: q, addEventListener() {}, removeEventListener() {} })
  window.HTMLMediaElement.prototype.load = () => {}
  window.HTMLMediaElement.prototype.play = () => Promise.resolve()
  window.HTMLMediaElement.prototype.pause = () => {}
  if (random) window.Math.random = random
}

async function collectPrototype() {
  const { JSDOM, VirtualConsole } = require('jsdom')
  const { bundleOf } = require('./make-bundle.js')
  const P = require('./proto.js')
  const html = fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8')
  const errors = []
  const vc = new VirtualConsole()
  vc.on('jsdomError', (e) => errors.push(e.message))
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc, beforeParse: (w) => stubs(w, seeded()) })
  const { window } = dom
  const { document } = window
  if (errors.length) throw new Error('прототип упал при загрузке: ' + errors.join(' | '))
  // go() прототипа — синхронный, как у порта (роутер без hashchange; посреди отрисовки — после неё). С hashchange
  // отрисовка шла бы отложенно, и таймер «Words Lab» (setTimeout(wordsLab, 0) из отрисовки) то успевал до снимка
  // экрана, то нет — смотря как долго рисовалась страница. Адрес меняется без события, тем же кодированием.
  window.eval(`(function () {
    var depth = 0, render0 = render;
    window.render = function () { depth++; try { return render0.apply(this, arguments) } finally { depth-- } };
    window.__go = function (h) {
      var before = location.hash;
      history.replaceState(null, '', '#' + String(h || '').replace(/^#/, ''));
      if (location.hash === before) return;
      if (depth) setTimeout(route, 0); else route();
    };
    window.go = function (view, id, tab, arg) { window.__go([view, id, tab, arg].filter(function (x) { return x != null && x !== '' }).join('/')) };
  })()`)
  const load = (k, d) => {
    try {
      return JSON.parse(window.localStorage.getItem('jtsLit.' + k)) || d
    } catch {
      return d
    }
  }
  const env = {
    data: bundleOf(P.readHtml(path.join(DIR, 'prototype-mini.html'))),
    go: async (h) => {
      window.__go(h)
      await tick(2)
      await tick(2)
    },
    q: (s) => document.querySelector(s),
    qa: (s) => [...document.querySelectorAll(s)],
    app: () => document.getElementById('app'),
    theme: () => document.body.dataset.theme || '',
    lang: () => document.documentElement.lang,
    key: (code) => document.dispatchEvent(new window.KeyboardEvent('keydown', { code, bubbles: true, cancelable: true })),
    notebook: () => load('notebook', {}),
    drafts: () => {
      const out = {}
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k.startsWith('jtsLit.prod.')) out[k.slice('jtsLit.prod.'.length)] = load(k.slice('jtsLit.'.length), '')
      }
      return out
    },
    modal: () => document.querySelector('.modal'),
  }
  const out = await collect(env)
  if (errors.length) throw new Error('прототип упал: ' + errors.join(' | '))
  dom.window.close()
  return out
}

module.exports = { collect, norm, stubs, seeded, tick }

if (require.main === module) {
  const t0 = Date.now()
  collectPrototype()
    .then((out) => {
      const file = path.join(DIR, 'oracle.json')
      fs.writeFileSync(file, JSON.stringify(out))
      console.log(
        `oracle.json ${Math.round(fs.statSync(file).size / 1024)} КБ за ${Math.round((Date.now() - t0) / 1000)} с: экранов ${Object.keys(out.screens).length}, ` +
          `пьес ${Object.keys(out.plays).length}, текстов ${Object.keys(out.texts).length}, произведений ${Object.keys(out.items).length}, слов ${Object.keys(out.words).length}, ` +
          `заданий мастерской ${Object.keys(out.extras.workshop).length}`,
      )
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
