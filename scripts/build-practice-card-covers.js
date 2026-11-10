#!/usr/bin/env node
// Обложки карточек «Практики», которые показывают содержимое раздела, а не значок (02.11.2026, решение владельца:
// «на каждой карточке показывать содержимое, как в книжках, комиксах и сказках»).
//
// Обложка — веер из трёх мини-карточек поверх фона карточки (тинт и два круга рисует CSS, поэтому картинка
// прозрачная и работает в обеих темах). Раздел с картинками показывает их, текстовый — настоящие строки своих данных:
// читаем их из файлов раздела, а не пишем руками, поэтому пропавшая строка останавливает сборку.
//
// Обложка ОДНА на все языки интерфейса, поэтому в ней только английский (язык упражнения): русский перевод слова
// на обложке увидел бы и ученик с казахским интерфейсом. Сторож — проверка кириллицы в build().
//
// Рисует настоящий браузер: текст и тени иначе не повторить. Итог — 480×296 с альфой, как у экспортов макета.
//
// Материалов Prepositions World, Pronunciation World, Tenses World и Cartoon World в репозитории нет (раздел живёт на
// бэкенде), поэтому выбранные картинки лежат в data/practice-cards/: prep-* и pron-* — из прототипов методиста,
// tenses-* — постеры видеоуроков прототипа (обрезаны до номера, названия и мини-карты времён), cartoon-* — превью
// видео каталога с i.ytimg.com, saw/tree — рисунки из src/screens/arcade/ArcadeScene.jsx.
//
//   node scripts/build-practice-card-covers.js              все обложки
//   node scripts/build-practice-card-covers.js verbs words  только эти

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const sharp = require('sharp')
const { chromium } = require('@playwright/test')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'public/practice/cards')
const url = (p) => pathToFileURL(path.join(ROOT, p)).href
const json = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const text = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

// Цвета вкладок — те же, что переменные --pk-* в styles.css: акцент, тинт, текст чипа, текст на акценте.
const TAB = {
  listening: ['#2F6BF0', '#E8EFFF', '#1D47B8', '#FFFFFF'],
  reading: ['#F2742E', '#FFEBDD', '#B8480F', '#FFFFFF'],
  writing: ['#D6409F', '#FFE6F4', '#9E1F72', '#FFFFFF'],
  speaking: ['#1FA56C', '#E0F5EB', '#127048', '#FFFFFF'],
  grammar: ['#E5A512', '#FFF3CC', '#7A5400', '#3A2800'],
}

function must(value, what) {
  if (value === undefined || value === null || value === '') throw new Error(`нет данных: ${what}`)
  return value
}

// Эмодзи — файлом из набора «Грамматики · игр»: иначе обложка зависела бы от шрифта машины, где её собрали.
function emoji(char) {
  const code = [...char].map((c) => c.codePointAt(0).toString(16)).join('-')
  const file = `public/practice/grammar-games/emoji/${code}.webp`
  if (!fs.existsSync(path.join(ROOT, file))) throw new Error(`нет файла эмодзи ${char} (${code})`)
  return `<img class="em" src="${url(file)}" alt="">`
}

// Литерал JS-объекта из html прототипа: режем по скобкам с учётом строк, без исполнения.
function objectAfter(source, marker) {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`нет литерала: ${marker}`)
  const start = source.indexOf('{', at)
  let depth = 0
  let quote = null
  for (let i = start; i < source.length; i++) {
    const c = source[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = null
    } else if (c === '"') quote = c
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return source.slice(start, i + 1)
  }
  throw new Error(`не закрыт объект: ${marker}`)
}

const photo = (src, extra = '') => `<div class="f"><img class="ph" src="${src}" alt="">${extra}</div>`
const data = (name) => url(`data/practice-cards/${name}`)

// Веер: левая и правая карточки позади, средняя поверх.
const fan = (left, front, right) =>
  `<div class="l">${left}</div><div class="r">${right}</div><div class="m">${front}</div>`

// ---------- Разделы с картинками ----------

const lcImg = (scene) => url(`public/practice/listenchoose/img/${scene}-0-512.webp`)
const wordsImg = (scene) => url(`public/practice/words/scenes/${scene}/cover.webp`)
const numImg = (name) => url(`public/practice/numbers/img/${name}.webp`)
const huntImg = (name) => url(`public/practice/wordhunt/img/${name}.webp`)
const wbImg = (level) => url(`public/practice/workbooks/covers/${level}.webp`)

// Кнопка «плей» — у превью мультика и у записей.
const playBtn = '<i class="play"></i>'

function listenchoose() {
  return fan(photo(lcImg('bakery')), photo(lcImg('bike')), photo(lcImg('bus')))
}

function words() {
  return fan(photo(wordsImg('beach')), photo(wordsImg('arctic')), photo(wordsImg('bakery')))
}

function numbers() {
  const dexter = `<img class="hero" style="height:92%" src="${numImg('dex')}" alt="">`
  return fan(photo(numImg('bg2')), photo(numImg('bg1'), dexter), photo(numImg('bg3')))
}

function wordhunt() {
  return fan(
    photo(huntImg('z-A1')),
    `<div class="f"><img class="ph" style="object-position:88% 50%" src="${huntImg('hero')}" alt=""></div>`,
    photo(huntImg('z-B2')),
  )
}

function workbooks() {
  return fan(photo(wbImg('a1')), photo(wbImg('b1')), photo(wbImg('a2')))
}

function cartoons() {
  const covers = [data('cartoon-bing.webp'), data('cartoon-peppa.webp'), data('cartoon-duggee.webp')]
  return fan(photo(covers[0]), photo(covers[1], playBtn), photo(covers[2]))
}

// Предлоги — сцена игры: Декстер над бревном, сундук под водой, шар в небе, и сам предлог плашкой.
function prepositions() {
  const pill = (w) => `<b class="pill">${w}</b>`
  return fan(
    photo(data('prep-bg_under.webp'), `<img class="obj" style="width:42%;left:30%;bottom:6%" src="${data('prep-u_chest.webp')}" alt="">${pill('under')}`),
    photo(
      data('prep-bg_forest.webp'),
      `<img class="obj" style="width:66%;left:17%;bottom:2%" src="${data('prep-f_log.webp')}" alt=""><img class="obj" style="width:36%;left:32%;top:3%" src="${data('prep-dexter_jump.webp')}" alt="">${pill('over')}`,
    ),
    photo(data('prep-bg_sky.webp'), `<img class="obj" style="width:36%;left:50%;top:10%" src="${data('prep-m_balloon.webp')}" alt="">${pill('above')}`),
  )
}

function pronunciation() {
  // Пара «на слух» из курса: сам курс лежит на бэкенде, в репозитории читать её неоткуда, поэтому строки записаны здесь.
  const pair = `<div class="f tx ch"><i class="lbl">Which do you hear?</i><span class="opts"><b class="on">ship</b><b>sheep</b></span></div>`
  const hero = `<img class="hero" style="height:88%;left:64%" src="${data('pron-aizere.webp')}" alt="">`
  return fan(pair, photo(data('pron-w-hero.webp'), hero), photo(data('pron-w-a1.webp')))
}

// Времена — постеры видеоуроков: прошедшее, настоящее и будущее, у среднего — кнопка «плей».
function tenses() {
  const poster = (id) => data(`tenses-${id}.webp`)
  // «плей» — справа, на пустом поле постера: по центру он закрывал номер времени
  const play = '<i class="play" style="left:80%;top:34%"></i>'
  return fan(photo(poster('past-continuous')), photo(poster('present-simple'), play), photo(poster('future-perfect')))
}

// ---------- Текстовые разделы: настоящие строки своих данных ----------

function reading() {
  const texts = ['b1', 'b2'].flatMap((l) => json(`public/practice/reading/${l}.json`).texts)
  const byId = (id) => must(texts.find((x) => x.id === id), `reading ${id}`)
  const card = (t, grad, front) =>
    `<div class="f tx rd"><div class="rd__top" style="background:${grad}">${emoji(t.cover.emoji)}</div><div class="rd__body"><b>${t.title}</b>${front ? `<i>${t.level} · ${t.genre}</i>` : ''}</div></div>`
  return fan(
    card(byId('b1-nat-aral'), 'linear-gradient(135deg,#c6e6ff,#7fc1f2)'),
    card(byId('b1-adv-jungle'), 'linear-gradient(135deg,#cdeccf,#7fcf95)', true),
    card(byId('b2-cul-eagles'), 'linear-gradient(135deg,#ffd9b8,#ffb37a)'),
  )
}

function verbs() {
  const all = json('public/practice/verbs/verbs.json').verbs
  const find = (v) => must(all.find((x) => x.v1 === v), `глагол ${v}`)
  const dots = '<span class="beat"><i></i><i class="on"></i><i></i><i></i></span>'
  const go = find('go')
  const front = `<div class="f tx vb"><div class="vb__h"><i>V1</i><i>V2</i><i>V3</i></div><div class="vb__r"><b>${go.v1}</b><b class="on">${go.v2}</b><b>${go.v3}</b></div>${dots}</div>`
  const side = (label, form) => `<div class="f tx vs"><i>${label}</i><b>${form}</b></div>`
  return fan(side('V1', find('be').v1), front, side('V3', find('do').v3))
}

function writing() {
  const seeds = json('public/practice/writing/a2.json').seeds
  const byTitle = (t) => must(seeds.find((s) => s.title === t), `письмо: ${t}`)
  const card = (s, front) =>
    `<div class="f tx wr"><i class="tag">${s.reg}</i><b>${s.title}</b><span class="ln"></span><span class="ln"></span>${front ? '<span class="ln"></span><span class="ln"></span>' : ''}<span class="ln s"></span></div>`
  return fan(card(byTitle('My dream job')), card(byTitle('An informal letter'), true), card(byTitle('A journey')))
}

function grammar() {
  const units = json('public/practice/grammar/index.json').a2.units
  const a2 = json('public/practice/grammar/a2.json').units
  const sorting = must(a2['1'].activities.find((a) => a.type === 'categorize'), 'grammar categorize')
  const item = must(sorting.items.find((i) => i.t.startsWith('Lucy')), 'grammar item')
  const plain = (s) => s.replace(/<[^>]+>/g, '')
  const side = (u) => `<div class="f tx lt"><b>${plain(must(u.exA, 'пример юнита'))}</b></div>`
  const chips = sorting.buckets.map((b, i) => `<b class="${i === item.b ? 'on' : ''}">${b}</b>`).join('')
  const front = `<div class="f tx ex"><i class="lbl">${plain(units[0].title)}</i><b class="ex__q">${item.t}</b><span class="opts">${chips}</span></div>`
  return fan(side(units[2]), front, side(units[3]))
}

function topics() {
  const { levels } = json('src/practice/grammar-games/__fixtures__/bundle.json').index
  const byId = (id) => must(levels.find((l) => l.id === id), `уровень ${id}`)
  const side = (l, sticker) =>
    `<div class="f tx lv" style="background:${l.bg}"><i>${l.range}</i><b>${must(l.stk.find((s) => s === sticker), sticker)}</b></div>`
  const l1 = byId('L1')
  const front = `<div class="f tx lv" style="background:${l1.bg}"><i>${l1.range}</i><b>${l1.name}</b><span>${l1.stk
    .slice(0, 2)
    .map((s) => `<em>${s}</em>`)
    .join('')}</span></div>`
  return fan(side(byId('L2'), 'Did you go?'), front, side(byId('L4'), 'It must be…'))
}

function speedReading() {
  const source = text('data/jts-student-cabinet.html')
  const textOf = (id) => {
    const at = source.search(new RegExp(`id:\\s*'${id}'`))
    if (at < 0) throw new Error(`скорочтение: ${id}`)
    const piece = source.slice(at, at + 1200)
    return { title: must(piece.match(/en:'([^']+)'/), id)[1], body: must(piece.match(/x:"([^"]+)"/), id)[1] }
  }
  const flight = textOf('flight')
  const head = flight.body.split(' ').slice(0, 9)
  const front = `<div class="f tx sr"><i class="lbl">${flight.title}</i><p>${head.slice(0, 2).join(' ')} <mark>${head.slice(2, 5).join(' ')}</mark> <span>${head.slice(5, 8).join(' ')}</span></p><i class="spd">×1.5</i></div>`
  const side = (id) => {
    const t = textOf(id)
    return `<div class="f tx sr"><i class="lbl">${t.title}</i><p><span>${t.body.split(' ').slice(0, 7).join(' ')}</span></p></div>`
  }
  return fan(side('weather'), front, side('hotel'))
}

function justListen() {
  const syl = JSON.parse(objectAfter(text('data/jtslisten.html'), 'SYL='))
  const wordsOf = syl.A0[0].lessons[0].w.map((w) => w[0])
  const pick = (w) => must(wordsOf.find((x) => x === w), `just listen ${w}`)
  // Набранная часть слова — буквы, остальное пустые клетки: так выглядит задание «пиши по буквам».
  const boxes = (word, typed) =>
    `<span class="boxes">${[...word].map((c, i) => `<b class="${i < typed ? 'on' : ''}">${i < typed ? c : ''}</b>`).join('')}</span>`
  const front = `<div class="f tx jl"><span class="pl">${playBtn}<i class="wave"></i></span>${boxes(pick('listen'), 3)}</div>`
  const side = (word, typed) => `<div class="f tx jl">${boxes(pick(word).slice(0, 3), typed)}</div>`
  return fan(side('ask', 3), front, side('repeat', 2))
}

function listening() {
  const tasks = json('public/practice/listening/content/a1.json')
  const task = must(tasks.find((t) => t.id === 'a1_001'), 'listening a1_001')
  const other = tasks.filter((t) => t.type === 'listen_choice')
  const opts = task.options.slice(0, 2).map((o) => `<b class="${o === task.answer ? 'on' : ''}">${o}</b>`).join('')
  const side = (t) => `<div class="f tx lt"><b>${t.prompt}</b></div>`
  const front = `<div class="f tx ls"><span class="pl">${playBtn}<i class="wave"></i></span><b>${task.prompt}</b><span class="opts">${opts}</span></div>`
  return fan(side(other[1]), front, side(other[2]))
}

function speakspin() {
  const { topics: all } = json('src/practice/speakspin/topics.json')
  const side = (t) => `<div class="f tx lt"><b>${t.prompt}</b></div>`
  const front = `<div class="f tx sp"><i class="spd">1:00</i><b>${all[0].prompt}</b><span class="mic"></span></div>`
  return fan(side(all[1]), front, side(all[2]))
}

function speak() {
  const source = text('src/practice/arcade/topics.js')
  const list = [...source.matchAll(/'(Describe [^']+)'/g)].map((m) => m[1])
  const side = (t) => `<div class="f tx lt"><b>${must(list.find((x) => x === t), t)}</b></div>`
  const scene = `<div class="f ar"><img class="ar__tree" src="${data('tree.svg')}" alt=""><img class="ar__saw" src="${data('saw.svg')}" alt=""><i class="spd">12 s</i></div>`
  return fan(side('Describe your home.'), scene, side('Describe a hobby you enjoy.'))
}

const COVERS = {
  listenchoose: ['listening', listenchoose],
  justListen: ['listening', justListen],
  cartoons: ['listening', cartoons],
  reading: ['reading', reading],
  grammar: ['writing', grammar],
  prepositions: ['writing', prepositions],
  writing: ['writing', writing],
  verbs: ['writing', verbs],
  workbooks: ['writing', workbooks],
  pronunciation: ['speaking', pronunciation],
  speakspin: ['speaking', speakspin],
  topics: ['grammar', topics],
  tenses: ['grammar', tenses],
  speedReading: ['grammar', speedReading],
  listening: ['grammar', listening],
  words: ['grammar', words],
  numbers: ['grammar', numbers],
  wordhunt: ['grammar', wordhunt],
  speak: ['grammar', speak],
}

const STYLE = `
*{box-sizing:border-box;margin:0}
html,body{width:240px;height:148px;background:transparent;overflow:hidden;font-family:Manrope,sans-serif;color:#181818}
.l,.r,.m{position:absolute}
.l{left:2px;top:42px;width:104px;height:76px;transform:rotate(-7deg)}
.r{right:2px;top:16px;width:104px;height:76px;transform:rotate(6deg)}
.m{left:54px;top:32px;width:132px;height:102px;z-index:2}
.f{position:relative;width:100%;height:100%;overflow:hidden;background:#fff;border-radius:9px;box-shadow:0 8px 20px rgba(26,13,77,.18)}
.m .f{border-radius:12px;box-shadow:0 12px 26px rgba(26,13,77,.28)}
.ph{display:block;width:100%;height:100%;object-fit:cover}
.hero{position:absolute;left:50%;bottom:-2px;transform:translateX(-50%)}
.obj{position:absolute}
.em{display:block;width:30px;height:30px}
.l .em,.r .em{width:22px;height:22px}
i{font-style:normal}
b{font-weight:800}
.play{position:absolute;left:50%;top:50%;width:30px;height:30px;transform:translate(-50%,-50%);border-radius:50%;background:rgba(255,255,255,.94);box-shadow:0 4px 10px rgba(26,13,77,.25)}
.play::after{content:'';position:absolute;left:11px;top:8px;border-style:solid;border-width:7px 0 7px 11px;border-color:transparent transparent transparent var(--acc)}
.pill{position:absolute;left:6px;top:6px;padding:2px 8px;border-radius:99px;background:#fff;font-size:11px;line-height:15px;color:var(--ink);box-shadow:0 2px 6px rgba(26,13,77,.2)}
.l .pill,.r .pill{padding:1px 6px;font-size:9px;line-height:13px}
.tx{display:flex;flex-direction:column;justify-content:center;gap:5px;padding:10px}
/* Средняя карточка закрывает половину задних: текст живёт в видимой части, иначе слова обрезаны посередине */
.l .tx,.r .tx{gap:3px;padding-top:8px;padding-bottom:8px}
.l .tx{padding-left:7px;padding-right:54px}
.r .tx{padding-left:55px;padding-right:5px}
.tx b{font-size:12px;line-height:15px}
.l .tx b,.r .tx b{font-size:8.5px;line-height:11px}
.lbl{font-size:9px;line-height:12px;font-weight:800;color:var(--ink)}
.l .lbl,.r .lbl{font-size:8px;line-height:10px}
.tag{align-self:flex-start;padding:2px 6px;border-radius:99px;background:var(--tint);font-size:8px;line-height:10px;font-weight:800;color:var(--ink)}
.spd{position:absolute;right:7px;top:7px;padding:2px 6px;border-radius:99px;background:var(--tint);font-size:9px;line-height:12px;font-weight:800;color:var(--ink)}
.opts{display:flex;gap:4px}
.opts b{padding:2px 7px;border-radius:7px;border:1px solid #ececf1;font-size:10px;line-height:14px;white-space:nowrap}
.opts b.on{border-color:var(--acc);background:var(--acc);color:var(--on)}
.l .opts,.r .opts{flex-direction:column;align-items:flex-start;gap:2px}
.l .opts b,.r .opts b{padding:1px 5px;font-size:8.5px;line-height:11px}
.pl{position:relative;display:flex;align-items:center;gap:6px;height:22px}
.pl .play{position:static;flex:none;display:block;width:22px;height:22px;transform:none;background:var(--acc);box-shadow:none}
.pl .play::after{position:relative;display:block;left:8px;top:6px;width:0;border-width:5px 0 5px 8px;border-color:transparent transparent transparent var(--on)}
.wave{flex:1;height:14px;background:repeating-linear-gradient(90deg,var(--acc) 0 2px,transparent 2px 5px);-webkit-mask:linear-gradient(90deg,#000 45%,rgba(0,0,0,.25) 45%);mask:linear-gradient(90deg,#000 45%,rgba(0,0,0,.25) 45%)}
/* Чтение: шапка с эмодзи, как у карточки библиотеки */
.rd{padding:0!important;gap:0!important;justify-content:flex-start}
.rd__top{flex:none;height:42%;display:grid;place-items:center}
.l .rd__top{justify-items:start;padding-left:9px}
.r .rd__top{justify-items:end;padding-right:13px}
.rd__body{display:flex;flex-direction:column;gap:2px;padding:6px 8px}
.l .rd__body{padding:4px 54px 0 7px}
.r .rd__body{padding:4px 5px 0 55px}
.rd__body b{font-size:11px;line-height:13px}
.l .rd__body b,.r .rd__body b{font-size:8.5px;line-height:10.5px}
.rd__body i{font-size:8px;line-height:10px;font-weight:700;color:#7a7a86}
/* Глаголы: три формы и доля бита */
.vb{align-items:stretch;gap:3px;text-align:center}
.vb__h,.vb__r{display:grid;grid-template-columns:repeat(3,1fr)}
.vb__h i{font-size:8px;line-height:10px;font-weight:800;color:#b5b5c0}
.vb__r b{font-size:14px;line-height:20px}
.vb__r b.on{color:var(--ink)}
.vs{gap:1px!important}
.vs i{font-size:8px;line-height:10px;font-weight:800;color:#b5b5c0}
.tx.vs b{font-size:12px;line-height:16px}
.beat{display:flex;justify-content:center;gap:6px;margin-top:5px}
.beat i{width:7px;height:7px;border-radius:50%;background:#ececf1}
.beat i.on{background:var(--ink)}
/* Письмо: жанр, заголовок и строки листа */
.wr{justify-content:flex-start}
.ln{display:block;flex:none;height:3px;border-radius:3px;background:#ececf1}
.ln.s{width:60%}
/* Грамматика */
.ex{gap:6px}
.ex__q{font-size:14px!important;line-height:18px!important}
/* Темы по уровням — цветные плашки хаба */
.lv{color:#fff;justify-content:space-between}
.lv i{font-size:9px;line-height:12px;font-weight:800;opacity:.85}
.l .lv i,.r .lv i{font-size:8px;line-height:10px}
.lv b{font-size:13px;line-height:16px}
.lv span{display:flex;flex-wrap:wrap;gap:3px}
.lv em{padding:2px 6px;border-radius:99px;background:rgba(255,255,255,.22);font-size:9px;line-height:12px;font-style:normal;font-weight:800;white-space:nowrap}
/* Скорочтение: текст с идущей подсветкой */
.sr{justify-content:flex-start;gap:4px}
.sr p{font-size:11px;line-height:15px;font-weight:700}
.l .sr p,.r .sr p{font-size:8.5px;line-height:11.5px}
.sr span{color:#b5b5c0}
.sr mark{padding:0 2px;border-radius:3px;background:var(--tint);color:var(--ink)}
.sr .spd{top:auto;bottom:7px}
/* Правый верхний угол обложки занимает бейдж «Новое» */
.r .sr{padding-top:22px}
/* Диктовка: клетки слова */
.jl{gap:9px}
.boxes{display:flex;gap:3px}
.tx .boxes b{display:grid;place-items:center;width:17px;height:24px;border-radius:5px;background:#f2f2f6;font-size:13px;line-height:1}
.tx .boxes b.on{background:var(--tint);color:var(--ink)}
.l .tx .boxes b,.r .tx .boxes b{width:12px;height:18px;font-size:9px;line-height:1}
.ls{gap:6px;padding:9px}
.ls b{font-size:11px;line-height:14px}
.ls .opts b{padding:2px 5px;font-size:9px;line-height:13px}
.lt{justify-content:center}
.sp{padding-top:22px}
.mic{display:block;flex:none;width:20px;height:20px;border-radius:50%;background:var(--acc);box-shadow:inset 0 0 0 5px var(--acc),inset 0 0 0 7px rgba(255,255,255,.9)}
.ch{gap:6px}
/* Speak or Die: дерево и пила из самой игры */
.ar{background:linear-gradient(180deg,#3b2a7d,#1c1140)}
.ar__tree{position:absolute;right:6px;bottom:-4px;height:100%}
.ar__saw{position:absolute;left:8px;bottom:12px;width:60px}
.ar .spd{left:7px;right:auto;background:rgba(255,255,255,.92)}
`

async function launch() {
  // Браузер нужной версии может быть не скачан (см. e2e) — тогда берём установленный Chrome.
  return chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
}

async function build(page, id, tab, draw, htmlFile) {
  const [acc, tint, ink, on] = TAB[tab]
  const html = `<!doctype html><html lang="en"><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap" rel="stylesheet">
<style>:root{--acc:${acc};--tint:${tint};--ink:${ink};--on:${on}}${STYLE}</style><body>${draw()}</body></html>`
  fs.writeFileSync(htmlFile, html)
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'networkidle' })
  // Без Manrope обложка молча собралась бы системным шрифтом, а битая картинка — пустым прямоугольником.
  const check = await page.evaluate(async () => {
    const faces = await document.fonts.load('800 12px Manrope')
    await document.fonts.ready
    return {
      font: faces.length > 0,
      broken: [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src),
      text: document.body.innerText,
    }
  })
  if (!check.font) throw new Error(`${id}: не загрузился Manrope`)
  if (check.broken.length) throw new Error(`${id}: не загрузились ${check.broken.join(', ')}`)
  if (/[Ѐ-ӿ]/.test(check.text)) throw new Error(`${id}: кириллица на обложке: ${check.text}`)
  const png = await page.screenshot({ omitBackground: true })
  const file = path.join(OUT, `${id}.webp`)
  await sharp(png).webp({ quality: 88, alphaQuality: 100, smartSubsample: true }).toFile(file)
  console.log(`${id}.webp  ${(fs.statSync(file).size / 1024).toFixed(0)} КБ`)
}

async function main() {
  const asked = process.argv.slice(2)
  for (const id of asked) if (!COVERS[id]) throw new Error(`нет такой обложки: ${id}`)
  const ids = asked.length ? asked : Object.keys(COVERS)
  const browser = await launch()
  const page = await browser.newPage({ viewport: { width: 240, height: 148 }, deviceScaleFactor: 2 })
  const htmlFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jts-covers-')), 'cover.html')
  try {
    for (const id of ids) await build(page, id, COVERS[id][0], COVERS[id][1], htmlFile)
  } finally {
    await browser.close()
    fs.rmSync(path.dirname(htmlFile), { recursive: true, force: true })
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
