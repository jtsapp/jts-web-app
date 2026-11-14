// Оракул «Parts of Speech World»: что показывает и считает САМ прототип —
// разметка карты мира, доски квестов, литературы, всех 16 юнитов и 14 дел,
// перевод под английским текстом (kk / ru / обратно), прохождение каждого из 55
// упражнений (classify, tag, gap, fix, order, write) и каждой из 62 стадий игры
// на всех десяти движках (hunt, sort, forge, fault, deduce, dialogue, rebuild,
// map, link, slots): проверка ответа, нормализация набранного (регистр, точка
// в конце, «умный» апостроф, лишние пробелы), перемешивание вариантов и плиток
// (у прототипа оно детерминированное — свой генератор с зерном от задания),
// возврат ошибочного задания в конец стадии, итог и сохранённый прогресс.
// Порт (src/practice/partsofspeech/engine.js) сверяется с этим файлом
// (engine.test.js): красный тест значит, что порт разъехался с исходником, —
// чинить порт.
//
// Прототип исполняется в jsdom как есть (копия из make-fixture.js). Экраны
// открываются его роутером (location.hash → hashchange). Движение выключено
// (prefers-reduced-motion): искры, конфетти и перелёты карточек — не предмет
// сверки, а «фонарик» охоты за словами в jsdom не включается (pointer:fine).
//
// Чего в jsdom нет: scrollTo / scrollBy / scrollIntoView (заглушки),
// AudioContext (звук молчит — движок это переживает), раскладки (все
// прямоугольники нулевые: дуга «местоимение → слово» и булавка на плане
// сверяются как есть — у порта они такие же).
//
// Разметка сравнивается отпечатком (sha1) нормализованного html: целиком она
// весила бы больше мегабайта. Нормализация (norm) убирает только то, что
// законно различается у прототипа и порта: адрес картинки (data-URI ↔ ссылка
// бакета), логотип в подвале (у порта своей шапки и логотипа нет) и гарнитуру
// в подписях svg (у порта — шрифт сайта).
//
// Запуск: node scripts/partsofspeech/extract-oracle.js
// Тот же сбор зовёт engine.test.js — функцией collect(env).

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const DIR = path.join(__dirname, '..', '..', 'src', 'practice', 'partsofspeech', '__fixtures__')

/** Разметка без того, что законно различается у прототипа и порта (см. шапку). */
function norm(html) {
  return String(html)
    .replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g, 'IMG')
    .replace(/\/__partsofspeech-media\/[a-z_]+\.webp/g, 'IMG')
    .replace(/<svg class="logo"[^>]*>[\s\S]*?<\/svg>/g, '')
    .replace(/font-family="[^"]*"/g, 'font-family')
}
const sha = (s) => crypto.createHash('sha1').update(norm(s)).digest('hex').slice(0, 12)
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))

// Как ученик мог бы набрать верный ответ: как есть, заглавными, с точкой, с «умным» апострофом, с лишними пробелами.
const TYPED = [(a) => a, (a) => a.toUpperCase(), (a) => a + '.', (a) => a.replace(/'/g, '’'), (a) => '  ' + a.replace(/ /g, '  ') + ' ']
const isRegex = (x) => x.length > 2 && x[0] === '/' && x[x.length - 1] === '/'
const plainAnswer = (list) => list.find((x) => !isRegex(String(x)))

function type(el, value) {
  el.value = value
  el.dispatchEvent(new el.ownerDocument.defaultView.Event('input', { bubbles: true }))
}

// ---------------------------------------------------------------- упражнения юнита

/** Пройти упражнение: чётные задания — верно, нечётные — с ошибкой. Возвращает след проверки. */
function playAct(env, a, n) {
  const box = env.id(a.id)
  const body = box.querySelector('.act-b')
  const out = { id: a.id, type: a.type, head: sha(box.querySelector('.act-h').innerHTML), items: [] }
  if (a.type === 'write') {
    const ta = body.querySelector('textarea')
    type(ta, 'The quick brown fox jumps over the lazy dog.')
    body.querySelector('[data-role="m"]').click()
    out.items.push([body.querySelector('[data-n]').textContent, body.querySelector('.fb').className, sha(body.innerHTML)])
    return out
  }
  a.items.forEach((it, i) => {
    const right = i % 2 === 0
    const check = () => body.querySelector('[data-role="check"]').click()
    let shown = ''
    if (a.type === 'classify') {
      const opts = [...body.querySelectorAll('.opt')]
      shown = opts.map((o) => o.dataset.v).join('|')
      ;(right ? opts.find((o) => o.dataset.v === it.a) : opts.find((o) => o.dataset.v !== it.a)).click()
      check()
    } else if (a.type === 'tag') {
      const toks = [...body.querySelectorAll('button.tok')]
      shown = toks.map((t) => t.textContent + ':' + t.dataset.t).join('|')
      if (right) toks.filter((t) => t.dataset.t === '1').forEach((t) => t.click())
      else toks[0].click()
      check()
    } else if (a.type === 'gap') {
      const answer = plainAnswer(it.a)
      type(body.querySelector('.txt'), right && answer != null ? TYPED[(n + i) % TYPED.length](String(answer)) : 'zzz')
      check()
    } else if (a.type === 'fix') {
      const f = body.querySelector('.txt')
      shown = f.value
      const answer = plainAnswer(it.a)
      if (right && answer != null) type(f, TYPED[(n + i) % TYPED.length](String(answer)))
      check()
    } else if (a.type === 'order') {
      const pool = [...body.querySelectorAll('[data-z="pool"] .tile')]
      shown = pool.map((t) => t.dataset.k).join(',')
      // «верно» — плитки в порядке данных, «с ошибкой» — в перемешанном порядке пула, последняя остаётся
      const order = right ? pool.slice().sort((x, y) => x.dataset.k - y.dataset.k) : pool.slice(0, -1)
      order.forEach((t) => t.click())
      check()
    }
    const fb = body.querySelector('.fb')
    out.items.push([shown, fb.className, sha(body.innerHTML)])
    body.querySelector('[data-role="next"]').click()
  })
  out.done = body.querySelector('.done-card .big').textContent
  return out
}

// ---------------------------------------------------------------- стадии игры

const DRIVERS = {
  hunt(box, it, right) {
    const words = [...box.querySelectorAll('.g-w')]
    if (!right) words.find((w) => w.dataset.t === '0').click()
    words.filter((w) => w.dataset.t === '1').forEach((w) => w.click())
    return words.map((w) => w.dataset.w + ':' + w.dataset.t).join('|')
  },
  sort(box, it, right) {
    const bins = [...box.querySelectorAll('.g-bin')]
    ;(right ? bins.find((b) => b.dataset.b === it.a) : bins.find((b) => b.dataset.b !== it.a)).click()
    return bins.map((b) => b.dataset.b).join('|')
  },
  forge(box, it, right, n) {
    type(box.querySelector('input'), right ? TYPED[n % TYPED.length](String(it.a[0])) : 'zzz')
    box.querySelector('.g-forge .btn').click()
    return ''
  },
  fault(box, it, right) {
    const words = [...box.querySelectorAll('.g-w')]
    if (!right) words.find((w) => w.dataset.f === '0').click()
    words.find((w) => w.dataset.f === '1').click()
    const opts = [...box.querySelectorAll('.g-repair .opt')]
    const shown = opts.map((o) => o.textContent).join('|')
    ;(right ? opts.find((o) => o.textContent === it.fix[0]) : opts.find((o) => o.textContent !== it.fix[0])).click()
    return shown
  },
  deduce(box, it, right) {
    const q1 = [...box.querySelectorAll('[data-q="1"] .opt')]
    if (!right) q1.find((o) => o.textContent !== it.a).click()
    q1.find((o) => o.textContent === it.a).click()
    const q2 = [...box.querySelectorAll('[data-q="2"] .opt')]
    q2.find((o) => o.dataset.n === '0').click()
    return q2.map((o) => o.dataset.n).join(',')
  },
  dialogue(box, it, right) {
    const opts = [...box.querySelectorAll('.g-say .opt')]
    if (!right) opts.find((o) => !it.options[+o.dataset.n].ok).click()
    opts.find((o) => it.options[+o.dataset.n].ok).click()
    return opts.map((o) => o.dataset.n).join(',')
  },
  rebuild(box, it, right) {
    const tiles = [...box.querySelectorAll('.g-pool .tile')]
    const shown = tiles.map((t) => t.dataset.k).join(',')
    const own = tiles.filter((t) => /^\d+$/.test(t.dataset.k)).sort((x, y) => x.dataset.k - y.dataset.k)
    ;(right ? own : own.slice().reverse()).forEach((t) => t.click())
    box.querySelector('[data-a="check"]').click()
    return shown
  },
  map(box, it, right) {
    const spots = [...box.querySelectorAll('.g-spot')]
    const hit = right ? spots.find((g) => g.dataset.id === it.a) : spots.find((g) => g.dataset.id !== it.a)
    hit.dispatchEvent(new box.ownerDocument.defaultView.MouseEvent('click', { bubbles: true }))
    return spots.map((g) => g.dataset.id).join('|')
  },
  link(box, it, right) {
    const cands = [...box.querySelectorAll('.g-cand')]
    ;(right ? cands.find((b) => +b.dataset.n === it.a) : cands.find((b) => +b.dataset.n !== it.a)).click()
    return String(cands.length)
  },
  slots(box, it, right, n, s) {
    const labels = s.labels.map((l) => l[0])
    ;[...box.querySelectorAll('.g-ph')].forEach((b, k) => {
      // «с ошибкой» — у каждой части первая метка
      const clicks = right ? labels.indexOf(it.a[k]) + 1 : 1
      for (let c = 0; c < clicks; c++) b.click()
    })
    box.querySelector('[data-a="check"]').click()
    return labels.join('|')
  },
}

/**
 * Пройти открытую стадию: каждое третье задание первого круга — с ошибкой (оно вернётся в конец стадии), повторы —
 * верно. Возвращает след: что показано, отклик, разметка после ответа, итог стадии.
 */
async function playStage(env, n) {
  const how = env.q('.g-how-go')
  const out = { how: how ? sha(env.q('.g-how').innerHTML) : null, steps: [] }
  if (how) how.click()
  out.head = sha(env.q('.g-stage-h').innerHTML)
  for (let guard = 0; guard < 80; guard++) {
    const cur = env.stage()
    if (!cur || cur.pos >= cur.queue.length || !env.q('.g-play .g-item')) break
    const it = cur.queue[cur.pos]
    const right = it._again || cur.pos % 3 !== 1
    const play = env.q('.g-play')
    const before = sha(play.innerHTML)
    const shown = DRIVERS[cur.s.type](env.q('.g-play .g-item'), it, right, n + cur.pos, cur.s)
    // ответ собеседника в диалоге приходит таймером (без движения — нулевым)
    if (cur.s.type === 'dialogue') await tick(5)
    out.steps.push([it._n, right ? 1 : 0, shown, before, env.q('.g-fb').className, sha(play.innerHTML)])
    env.q('.g-bar .btn').click()
  }
  const done = env.q('.g-done')
  const closed = env.q('.g-closed')
  out.end = done ? ['done', sha(done.innerHTML), env.q('.g-done .g-sum').textContent] : closed ? ['closed', sha(closed.innerHTML), (env.q('.g-closed .g-sum') || {}).textContent || ''] : ['?']
  return out
}

// ---------------------------------------------------------------- сбор

/**
 * @param env  { data: бандл, go(hash) → Promise, q(sel), qa(sel), id(id), cls(): классы страницы, stage(): состояние
 *             стадии игры, progress(): { acts, cases, clues, seen } }
 */
async function collect(env) {
  const { UNITS, CASES } = env.data
  const view = () => env.id('view').innerHTML
  const out = { screens: {}, lang: {}, units: {}, acts: [], cases: {}, stages: [], extras: {} }

  // экраны как есть: карта, квесты, литература, досье
  for (const h of ['#map', '#bureau', '#refs', '#bureau-design']) {
    await env.go(h)
    out.screens[h] = { cls: env.cls(), view: sha(view()), side: sha(env.id('side').innerHTML) }
  }
  // неизвестный адрес уводит на карту
  await env.go('#nope')
  out.screens['#nope'] = { cls: env.cls(), view: sha(view()) }

  // перевод под английским текстом: kk → ru → повторное нажатие прячет
  await env.go('#u02')
  for (const l of ['kk', 'ru', 'ru', 'en']) {
    env.q('.langs [data-lang="' + l + '"]').click()
    out.lang[l + ':' + Object.keys(out.lang).length] = { view: sha(view()), side: sha(env.id('side').innerHTML), pressed: env.qa('.langs button').map((b) => b.getAttribute('aria-pressed')).join(',') }
  }

  // юниты: урок, режим практики, остров с точками, подписи слов
  let n = 0
  for (const u of UNITS) {
    await env.go('#' + u.id)
    const rec = { cls: env.cls(), view: sha(view()), side: sha(env.id('side').innerHTML) }
    const pts = env.qa('.isle-pt')
    if (pts.length) {
      pts[pts.length - 1].click()
      env.q('.isle-all').click()
      rec.isle = [pts.length, sha(env.q('.isle-x').outerHTML)]
    }
    const key = env.q('.lg-k')
    if (key) {
      key.click()
      rec.legend = sha(env.q('.legend').outerHTML)
    }
    if ((u.acts || []).length) {
      env.q('.mode-b.mode-p').click()
      rec.practice = env.cls()
      const steps = env.qa('.step')
      for (const [k, a] of u.acts.entries()) {
        steps[k].click()
        const trace = playAct(env, a, n++)
        if (a.type !== 'write') {
          trace.step = env.qa('.step')[k].textContent
          // «Next activity» ведёт к следующему упражнению; у последнего — к квесту острова или пропадает
          const nb = env.id(a.id).querySelector('[data-role="nextact"]')
          trace.next = nb ? nb.textContent : null
        }
        out.acts.push(trace)
      }
      rec.after = sha(view())
    }
    out.units[u.id] = rec
  }
  // адрес «юнит-practice» открывает практику, «юнит-sN» — секцию
  await env.go('#' + UNITS[1].id + '-practice')
  out.extras.practiceHash = { cls: env.cls(), view: sha(view()) }
  await env.go('#' + UNITS[1].id + '-s1')
  out.extras.sectionHash = { cls: env.cls(), view: sha(view()) }
  out.extras.progressAfterUnits = JSON.parse(JSON.stringify(env.progress()))
  await env.go('#map')
  out.extras.mapAfterUnits = sha(view())

  // дела: все стадии по порядку, подсказки на картинке, итог дела
  for (const c of CASES) {
    await env.go('#case-' + c.id)
    const rec = { cls: env.cls(), open: sha(view()), clues: [] }
    for (let k = 0; k < c.stages.length; k++) {
      // стадия открывается сама (первая) или кнопкой «Continue» после предыдущей
      const trace = await playStage(env, n++)
      trace.id = c.id + ':' + k
      out.stages.push(trace)
      if (k === 0) {
        for (const b of env.qa('.g-clue')) {
          b.click()
          rec.clues.push(sha(env.q('.g-scene').innerHTML))
        }
      }
      const next = env.q('.g-done .g-bar .btn')
      if (next) next.click()
    }
    rec.steps = sha(env.q('.g-steps').innerHTML)
    rec.closed = sha(view())
    out.cases[c.id] = rec
  }
  out.extras.progressAfterCases = JSON.parse(JSON.stringify(env.progress()))
  await env.go('#bureau')
  out.extras.bureauAfterCases = sha(view())
  // юнит после своего квеста: плашка «Quest complete · replay»
  await env.go('#' + CASES[0].unit)
  out.extras.unitAfterQuest = sha(view())

  // «Replay this quest» сбрасывает дело
  await env.go('#case-' + CASES[0].id)
  env.id('gReplay').click()
  out.extras.replay = { view: sha(view()), state: JSON.parse(JSON.stringify(env.progress().cases[CASES[0].id] || null)) }
  // звук — переключатель на доске квестов
  await env.go('#bureau')
  env.id('gSnd').click()
  out.extras.sound = [env.id('gSnd').textContent, env.id('gSnd').getAttribute('aria-pressed')]
  return out
}

// ---------------------------------------------------------------- прототип в jsdom

function stubs(window) {
  window.scrollTo = () => {}
  window.scrollBy = () => {}
  window.Element.prototype.scrollIntoView = () => {}
  // движение выключено; «фонарик» (pointer:fine) в jsdom не включается
  window.matchMedia = (q) => ({ matches: /prefers-reduced-motion/.test(q), media: q, addEventListener() {}, removeEventListener() {} })
}

async function collectPrototype() {
  const { JSDOM, VirtualConsole } = require('jsdom')
  const { runData } = require('./make-fixture.js')
  const html = fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8')
  const errors = []
  const vc = new VirtualConsole()
  vc.on('jsdomError', (e) => errors.push(e.message))
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc, beforeParse: stubs })
  const { window } = dom
  const { document } = window
  if (errors.length) throw new Error('прототип упал при загрузке: ' + errors.join(' | '))
  const load = (k, d) => {
    const v = window.localStorage.getItem(k)
    return v ? JSON.parse(v) : d
  }
  const env = {
    data: runData(html),
    go: async (h) => {
      window.location.hash = h
      // hashchange jsdom шлёт отложенно; неизвестный адрес ещё и перенаправляется
      await tick(5)
      await tick(5)
    },
    q: (s) => document.querySelector(s),
    qa: (s) => [...document.querySelectorAll(s)],
    id: (id) => document.getElementById(id),
    cls: () => document.body.className.trim(),
    stage: () => window.GAME._state(),
    progress: () => ({ acts: load('pos:progress', {}), cases: load('pos:g:prog', {}), clues: load('pos:g:clues', {}), seen: load('pos:g:seen', {}) }),
  }
  const out = await collect(env)
  if (errors.length) throw new Error('прототип упал: ' + errors.join(' | '))
  dom.window.close()
  return out
}

module.exports = { collect, norm, stubs }

if (require.main === module) {
  collectPrototype()
    .then((out) => {
      const file = path.join(DIR, 'oracle.json')
      fs.writeFileSync(file, JSON.stringify(out))
      const steps = out.stages.reduce((n, s) => n + s.steps.length, 0)
      console.log(`oracle.json ${Math.round(fs.statSync(file).size / 1024)} КБ: юнитов ${Object.keys(out.units).length}, упражнений ${out.acts.length}, дел ${Object.keys(out.cases).length}, стадий ${out.stages.length} (${steps} ходов)`)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
