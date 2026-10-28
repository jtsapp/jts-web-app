// Оракул «Pronunciation World»: что показывает и считает САМ прототип —
// сборка тем (topicsList), id записей для каждого текста на экране (audioId),
// разметка главной, всех экранов объяснения и вступлений раундов, проверка
// «Check yourself», порядок эха в раундах Echo Gates и итог раунда (звезда при
// ≥ 85 % с первого раза). Порт (src/practice/pronunciation/engine.js)
// сверяется с этим файлом (engine.test.js): красный тест значит, что порт
// разъехался с исходником.
//
// Прототип исполняется в jsdom как есть (урезанная копия из make-fixture.js).
// Случайность — mulberry32 с одним сидом, сбрасываемым перед каждым раундом:
// порядок эха — P.shuffle прототипа. Раунд проходится по-настоящему — кликами
// по воротам, с ускорением P._fast самого прототипа; экраны открываются его
// роутером (history.replaceState + P.route, без hashchange: иначе route()
// сработал бы дважды).
//
// Canvas в jsdom нет — заглушка с measureText (ширина = 9 px на символ):
// движок меряет текст для схемы интонации и рисует частицы. fetch тоже нет, а
// прототип прогревает записи раунда прямо в start(): без заглушки ReferenceError
// обрывал старт до запуска цикла игры.
//
// Запуск: node scripts/pronunciation/extract-oracle.js
// Тот же сбор над полным прототипом зовёт engine.test.js (переменная
// PRONUNCIATION_HTML) — функцией extractOracle(html).

const fs = require('node:fs')
const path = require('node:path')
const { JSDOM, VirtualConsole } = require('jsdom')

const DIR = path.join(__dirname, '..', '..', 'src', 'practice', 'pronunciation', '__fixtures__')
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

/** Картинки у прототипа — data:/blob:, у порта — ссылки бандла: сравниваем разметку без них. */
function norm(html) {
  return String(html)
    .replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, 'ASSET')
    .replace(/blob:[^'")\s]+/g, 'ASSET')
    .replace(/\/__pron-media\/[^'")\s]+/g, 'ASSET')
}

function fakeCanvas(window) {
  const ctx = new Proxy(
    { measureText: (s) => ({ width: String(s).length * 9 }), font: '' },
    { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => ((o[k] = v), true) },
  )
  window.HTMLCanvasElement.prototype.getContext = () => ctx
  window.fetch = () => Promise.reject(new Error('нет сети'))
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Тексты всех кнопок звука на экране — с акцентом, как их играет движок. */
function sayTexts(root) {
  const out = []
  for (const b of root.querySelectorAll('[data-say],[data-anchor]')) out.push([b.dataset.say ?? b.dataset.anchor, b.dataset.acc || ''])
  for (const b of root.querySelectorAll('[data-pair]')) for (const s of b.dataset.pair.split('|')) out.push([s, ''])
  return out
}

/**
 * Общий для оракула и теста порта ход: экраны, проверка, раунды. env — то, что
 * различается у прототипа и порта: открыть адрес, корень разметки, P, сид, пауза.
 */
async function collect(env) {
  const { P, open, $ } = env
  const topics = P.topicsList()
  const audio = {}
  const note = (root) => {
    for (const [text, acc] of sayTexts(root)) audio[`${acc}|${text}`] = P.audioId(P.cue(text), acc || undefined)
  }
  const out = { topics, home: {}, learn: {}, check: {}, game: {}, audio }

  for (const L of P.levels) {
    open(`#/level/${L.id}`)
    out.home[L.id] = norm($('#main').innerHTML)
  }

  for (const T of topics) {
    const screens = []
    let i = 0
    for (;;) {
      open(`#/learn/${T.id}/${i}`)
      screens.push(norm($('#main').innerHTML))
      note($('#main'))
      if ($('#ck')) out.check[T.id] = await runCheck(env, T)
      if (!$('#lnext')) break
      i++
    }
    out.learn[T.id] = { screens, learned: !!P.state.learned[T.id] }

    out.game[T.id] = []
    // сразу в игру, без окна «Как играть»; save — порт перечитывает прогресс перед каждым экраном
    P.state.tutorial = true
    P.save()
    for (let r = 0; r < T.game.rounds.length; r++) out.game[T.id].push(await playRound(env, T, r, 0, note))
    // Тот же раунд 0 заново, с двумя ошибками на первых эхо: 10/12 < 85 % — без звезды, но лучший результат прежний.
    out.game[T.id].push(await playRound(env, T, 0, 2, note))
    P.state.rounds[T.id] = [{}, {}, {}]
    P.save()
    out.game[T.id].push(await playRound(env, T, 0, 2, note))
  }
  return out
}

async function runCheck(env, T) {
  const { $, wait } = env
  const Q = T.learn.check
  const log = []
  for (let i = 0; i < Q.length; i++) {
    const q = Q[i]
    // первый вопрос — сначала мимо, остальные — сразу верно
    if (i === 0) {
      const k = q.answer === 0 ? 1 : 0
      $(`#ck .opt[data-k="${k}"]`).click()
      log.push(norm($('#ck .ck-fb').innerHTML))
    }
    $(`#ck .opt[data-k="${q.answer}"]`).click()
    log.push(norm($('#ck .ck-fb').innerHTML))
    $('#cknext').click()
    await wait(0)
  }
  log.push(norm($('#ck').innerHTML))
  return log
}

async function playRound(env, T, r, wrongFirst, note) {
  const { P, open, $, seed, wait } = env
  open(`#/play/${T.id}/${r}`)
  const intro = norm($('.g-intro').innerHTML)
  note($('.g-intro'))
  seed(SEED)
  $('#g-go').click()
  const G0 = P._game()
  const queue = G0.queue.map((x) => x._i)
  // тексты эха на экране не стоят — берём из самих заданий
  for (const it of G0.R.items) if (it.say) env.audioOf(it.say, it.accent)
  const wronged = new Set()
  let left = wrongFirst
  for (let guard = 0; guard < 4000 && !$('.g-card.result'); guard++) {
    const G = P._game()
    const echo = G && !G.ended ? G.live.find((x) => x.sel) : null
    if (!echo) {
      await wait(20)
      continue
    }
    const n = G.R.gates.length
    let gi = echo.item.gate
    if (left > 0 && !wronged.has(echo.item._i)) {
      wronged.add(echo.item._i)
      left--
      gi = (gi + 1) % n
    }
    $(`.gate-hit[data-g="${gi}"]`).click()
    await wait(20)
  }
  if (!$('.g-card.result')) throw new Error(`раунд ${T.id}/${r} не закончился`)
  const res = {
    round: r,
    wrongFirst,
    intro,
    queue,
    fall: G0.fall,
    num: $('.res-num').textContent,
    star: !!$('.res-star.on'),
    rounds: JSON.parse(JSON.stringify(P.state.rounds[T.id])),
    stars: P.stars(T.id),
    topicDone: P.topicDone(T.id),
    mix: [...$('.game').querySelectorAll('.res-mix .chip')].map((c) => c.textContent),
  }
  return res
}

/** Оракул для html прототипа (урезанного или полного). */
async function extractOracle(html) {
  const vc = new VirtualConsole() // jsdom ругается на scrollTo/confirm — молчим
  let rng = mulberry32(SEED)
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.Math.random = () => rng()
      fakeCanvas(window)
    },
  })
  const w = dom.window
  const P = w.PRON
  if (!P || !P.route) throw new Error('прототип не поднялся: нет PRON.route')
  P._fast = true
  const audio = {}
  try {
    const out = await collect({
      P,
      $: (s) => w.document.querySelector(s),
      open: (h) => {
        w.history.replaceState(null, '', h)
        P.route()
      },
      seed: (s) => {
        rng = mulberry32(s)
      },
      wait: sleep,
      audioOf: (text, acc) => {
        audio[`${acc || ''}|${text}`] = P.audioId(P.cue(text), acc || undefined)
      },
    })
    Object.assign(out.audio, audio)
    return { seed: SEED, ...out }
  } finally {
    w.close()
  }
}

module.exports = { extractOracle, collect, norm, mulberry32, fakeCanvas, SEED }

if (require.main === module) {
  const html = fs.readFileSync(path.join(DIR, 'prototype-mini.html'), 'utf8')
  extractOracle(html).then((o) => {
    fs.writeFileSync(path.join(DIR, 'oracle.json'), JSON.stringify(o, null, 1))
    const rounds = Object.values(o.game).flat()
    console.log(`тем ${o.topics.length}, экранов ${Object.values(o.learn).reduce((a, l) => a + l.screens.length, 0)}, раундов ${rounds.length}, текстов со звуком ${Object.keys(o.audio).length}`)
    for (const [id, g] of Object.entries(o.game)) console.log(id, g.map((x) => `${x.round}${x.wrongFirst ? 'w' : ''}:${x.num.trim()}${x.star ? '★' : ''}`).join('  '))
  }).catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
