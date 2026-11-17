// Движок «Literature World» для сайта — из inline-скрипта прототипа считанными
// заменами (REPLACEMENTS: каждая обязана найтись ровно столько раз, сколько
// записано, иначе сборка падает — прототип поменялся, и правку надо
// пересмотреть, а не наложить вслепую). Пишет src/practice/literature/engine.js —
// руками его не правят: следующая версия прототипа переносится повторным
// прогоном этого скрипта.
//
// Скрипт прототипа (≈3940 строк) — одно приложение на глобалах страницы: сам
// роутер на location.hash, данные из <script type="application/json">,
// разметка шаблонными строками с inline-обработчиками (onclick="go('…')") и
// слушатели на document. Порт кладёт его целиком внутрь функции
// mountLiterature(root, cfg) — тогда верхние объявления прототипа (go, render,
// S, LANG, SUP, NOTE…) становятся переменными одного монтажа, — а связь со
// страницей меняет заменами. Что и почему — в шапке, которую скрипт пишет в
// engine.js (HEADER ниже), и в комментариях к заменам.
//
// Запуск: node scripts/literature/build-engine.js [--html "<путь к прототипу>"]
// (без --html — копия из __fixtures__: движок в ней тот же байт в байт).

const fs = require('node:fs')
const path = require('node:path')
const P = require('./proto.js')

const ROOT_DIR = path.join(__dirname, '..', '..')
const FIXTURE = path.join(ROOT_DIR, 'src', 'practice', 'literature', '__fixtures__', 'prototype-mini.html')
const OUT = path.join(ROOT_DIR, 'src', 'practice', 'literature', 'engine.js')

// [что заменено и почему, что найти, на что заменить, сколько раз должно найтись]
const REPLACEMENTS = [
  // ---------- данные: блоки прототипа → бандл бэкенда (копия на монтаж: движок их меняет) ----------
  ['картинки Wikimedia', "JSON.parse(document.getElementById('d-imgmeta').textContent)", "lwData('imgmeta')", 1],
  ['расширение (стихи, слова, сленг…)', "JSON.parse(document.getElementById('d-x').textContent)", "lwData('x')", 1],
  ['пьесы, проза, мир', "LIB[k] = JSON.parse(document.getElementById('d-' + k).textContent);", 'LIB[k] = lwData(k);', 1],
  ['сцены и видео входа', "JSON.parse(document.getElementById('d-scenes').textContent)", "lwData('scenes')", 1],
  // в бандле сцены — ссылки бакета, а не data-URI: blob из них делать незачем
  ['сцены — ссылками', 'o[k] = lwBlob(d[k])', 'o[k] = lwMedia(d[k])', 1],
  ['маскоты', "JSON.parse(document.getElementById('d-mascots').textContent)", "lwData('mascots')", 1],

  // ---------- глобалы страницы ----------
  ['журнал картинок — без глобала', 'const LW_LOG = window.LW_IMG_LOG = [];', 'const LW_LOG = [];', 1],
  ['отчёт о картинках — без глобала', 'window.lwImageReport = () =>', 'const lwImageReport = () =>', 1],
  ['режим отладки картинок (класс на <html>) не переносим', "if (/[?&#]imgdebug/.test(location.href)) document.documentElement.classList.add('imgdebug');", '/* imgdebug: класс на <html> приложения порт не ставит */', 1],
  // слушатели document — на корень раздела (load / error картинок не всплывают, а ловушка захвата на корне их видит)
  ['слушатели документа → корень раздела', 'document.addEventListener(', 'lwOnRoot(', 5],
  ['изменение размера — через AbortController', "window.addEventListener('resize', frameSoon);", "on(window, 'resize', frameSoon);", 1],
  ['наблюдатель разметки — с отпиской (1/2)', 'new MutationObserver(ms => {', '(LW_MO = new MutationObserver(ms => {', 1],
  ['наблюдатель разметки — с отпиской (2/2)', '}).observe(document.getElementById(\'app\') || document.body, { childList: true, subtree: true });', '})).observe($id(\'app\') || ROOT, { childList: true, subtree: true });', 1],
  ['поиск по документу → по корню', 'const $ = (s, r = document) => r.querySelector(s);', 'const $ = (s, r = ROOT) => r.querySelector(s);', 1],
  ['поиск по документу → по корню ($$)', 'const $$ = (s, r = document) => [...r.querySelectorAll(s)];', 'const $$ = (s, r = ROOT) => [...r.querySelectorAll(s)];', 1],
  ['getElementById → по корню (в коде и в обработчиках разметки)', 'document.getElementById(', '$id(', 10],
  ['querySelector в обработчике поиска', "document.querySelector('.srch')", "$('.srch')", 1],
  ['таймер поиска — переменная, а не window._sq', 'window._sq', 'LW_SQ', 2],
  ['окно «About» — внутри раздела', 'document.body.append(m);', 'ROOT.append(m);', 1],
  ['ширина окна — без <html> приложения', 'document.documentElement.clientWidth', 'innerWidth', 1],
  // раскладка сцен: CSS переведён с ширины окна на ширину раздела (@container) — и мерка у кадрирования та же
  ['телефон / планшет — по ширине раздела', "matchMedia('(max-width:1100px)').matches", 'lwNarrow(1100)', 1],

  // ---------- роутер: адрес раздела — переменная, адрес страницы не трогаем ----------
  ['go() — без location.hash', "location.hash = [view, id, tab, arg].filter(x => x != null && x !== '').join('/');", "lwGo([view, id, tab, arg].filter(x => x != null && x !== '').join('/'));", 1],
  ['hashchange не слушаем', "window.addEventListener('hashchange', route);", '/* смену адреса не слушаем: роутер зовёт lwGo */', 1],
  ['route() читает HASH; блокнот — свежий с каждым экраном', "function route() {\n  const [v, id, tab, arg] = (location.hash.slice(1) || 'home')", "function route() {\n  NOTE = store.get('notebook', {});\n  const [v, id, tab, arg] = (HASH.slice(1) || 'home')", 1],
  ['прокрутка к верху — к верху раздела', 'S.f = {}; window.scrollTo(0, 0); }', 'S.f = {}; lwScrollTo(0); }', 1],
  ['прокрутка к читалке — от верха раздела', 'if (r) window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 70); }', 'if (r) lwScrollTo(r.getBoundingClientRect().top - ROOT.getBoundingClientRect().top - 70); }', 1],

  // ---------- тема, язык, отрисовка ----------
  // data-theme на хосте — тема приложения (watchAppTheme); тема мира прототипа живёт на корне раздела своим атрибутом
  ['тема мира — на корне раздела', 'document.body.dataset.theme = themeFor();', 'ROOT.dataset.lwTheme = themeFor();', 1],
  ['тема эпохи в карточке «Периодов»', 'data-theme="${th}"', 'data-lw-theme="${th}"', 1],
  ['go() внутри отрисовки — после неё; язык — в настройки устройства', '  after(); afterX(); checkBgs();\n}', '  LW_IN_RENDER++; try { after(); afterX(); checkBgs(); } finally { LW_IN_RENDER--; } lwLangSync();\n}', 1],
  ['язык — на корень раздела, а не на <html>', "document.documentElement.lang = l === 'kz' ? 'kk' : l;", "ROOT.lang = l === 'kz' ? 'kk' : l;", 1],
  ['стартовый язык и язык подсказок — из настроек устройства', "let LANG = 'en', SUP = 'ru', LEVEL = '';", 'let LANG = LW_LANG0.lang, SUP = LW_LANG0.sup, LEVEL = \'\';', 1],

  // ---------- звук, клавиши, микрофон ----------
  ['пробел «хлопка» — без document.onkeydown', 'document.onkeydown = ', 'LW_KEY = ', 3],
  ['смена экрана глушит и голос', 'function stopAll() { AUDIOS.forEach(a => a.pause());', 'function stopAll() { lwHush(); AUDIOS.forEach(a => a.pause());', 1],
  ['синтез речи → Soniox (cfg.speak)', "function say(text) { try { const u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = .85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { } }", 'function say(text) { lwSpeak(text); }', 1],
  // голос у нас — Soniox (запасной — устройства), а не синтез устройства: подпись под кнопками не должна обещать иное
  ['подпись голоса «послушать»', 'These two buttons use your device’s synthetic voice, not a human recording.', 'These two buttons use a synthetic voice, not a human recording.', 2],
  ['кнопка «послушать» — если экран дал голос', "const hasTTS = () => typeof speechSynthesis !== 'undefined';", 'const hasTTS = () => !!speak;', 1],
  ['микрофон после ухода с раздела — сразу отпустить', 'const st = await navigator.mediaDevices.getUserMedia({ audio: true }); const ch = [];', 'const st = await navigator.mediaDevices.getUserMedia({ audio: true }); if (dead) { st.getTracks().forEach(x => x.stop()); return; } LW_STREAMS.add(st); const ch = [];', 1],
  ['запись себя — ссылка отпускается в destroy', 'a.src = URL.createObjectURL(new Blob(ch, { type: REC.mimeType }));', 'a.src = lwObjectUrl(new Blob(ch, { type: REC.mimeType }));', 1],
  // destroy() останавливает запись, а onstop приходит позже, когда ссылки уже отпущены: новую не создаём
  ['запись себя — после ухода с раздела ссылку не создаём', 'REC.onstop = () => { st.getTracks().forEach(x => x.stop());', 'REC.onstop = () => { st.getTracks().forEach(x => x.stop()); if (dead) return;', 1],
  ['выгрузка метаданных («About») — ссылка отпускается в destroy', "a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));", "a.href = lwObjectUrl(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));", 1],

  // ---------- подсказка-слово: окно внутри раздела ----------
  // ---------- синтаксис: Safari до 16.4 не разбирает lookbehind, и модуль движка не загрузился бы вовсе ----------
  // (src/lib/safariSyntax.test.js). Тот же разрез: пробелы после .!? и закрывающих кавычек и скобок — метка, по ней split.
  ['разбивка на предложения — без lookbehind', "String(p).split(/(?<=[.!?][’”\"')\\]]*)\\s+/)", "String(p).replace(/([.!?][’”\"')\\]]*)\\s+/g, '$1\\u0000').split('\\u0000')", 1],
  ['подсказка к слову — от корня раздела, а не от страницы', "pop.style.left = Math.max(8, Math.min(scrollX + r.left, scrollX + innerWidth - 316)) + 'px'; pop.style.top = (scrollY + r.bottom + 8) + 'px';", "const R0 = ROOT.getBoundingClientRect(); pop.style.left = Math.max(8, Math.min(r.left - R0.left, R0.width - 316)) + 'px'; pop.style.top = (r.bottom - R0.top + 8) + 'px';", 1],

  // ---------- хранилище: блокнот — синк аккаунта, своё предложение — устройство ----------
  ['localStorage jtsLit.* → cfg', "const store = { get(k, d) { try { return JSON.parse(localStorage.getItem('jtsLit.' + k)) || d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('jtsLit.' + k, JSON.stringify(v)); } catch (e) { } } };", 'const store = lwStore;', 1],

  // ---------- ответы практики → cfg.onAnswer(kind, ok): первая проверка задания ----------
  ['вопросы с вариантами (слова, Words Lab, регистры, мастерская)', "box.dataset.lock = '1'; const ok = b.dataset.o === q.ans;", "box.dataset.lock = '1'; const ok = b.dataset.o === q.ans; lwAnswer(lwKind(box), ok);", 3],
  ['порядок строк', 'const done = built.length === s.length, ok = done && built.every((x, i) => s[x] === s[i]);', "const done = built.length === s.length, ok = done && built.every((x, i) => s[x] === s[i]); if (done) lwOnce(s, 0, 'reading', ok);", 1],
  ['пропущенная рифма', "$$('.opts button', box).forEach(b => b.onclick = () => { const ok = b.dataset.w === ans;", "$$('.opts button', box).forEach(b => b.onclick = () => { const ok = b.dataset.w === ans; lwOnce(opts, 0, 'reading', ok);", 1],
  ['семь возрастов', "const done = built.length === right.length;\n      box.innerHTML = `<p class=\"hint\">Jaques", "const done = built.length === right.length; if (done) lwOnce(sh, 0, 'reading', built.every((l, i) => l === right[i]));\n      box.innerHTML = `<p class=\"hint\">Jaques", 1],
  ['сцены по порядку (Ромео и Джульетта)', "const draw = () => { const done = built.length === right.length;\n      box.innerHTML = `<p class=\"hint\">Five scenes", "const draw = () => { const done = built.length === right.length; if (done) lwOnce(right, 0, 'reading', built.every((x, i) => x === right[i]));\n      box.innerHTML = `<p class=\"hint\">Five scenes", 1],
  ['собери пословицу', "if (built.length === words.length) $('#pf').textContent = ok ? t('wellDone') : t('tryAgain');", "if (built.length === words.length) { lwOnce(built, 0, 'reading', ok); $('#pf').textContent = ok ? t('wellDone') : t('tryAgain'); }", 1],
  ['кто это говорит (пьеса)', 'n++; const ok = b.dataset.o === who;', "n++; const ok = b.dataset.o === who; lwAnswer('reading', ok);", 1],
  ['настоящий конец предложения', 'const ok = opts[+b.dataset.q] === tail;', "const ok = opts[+b.dataset.q] === tail; lwOnce(opts, 0, 'reading', ok);", 1],
  ['мораль басни', 'if (!sel) return; const m = morals[+b.dataset.m]; if (LIB.prose[sel].moral === m) {', "if (!sel) return; const m = morals[+b.dataset.m]; lwOnce(done, sel, 'reading', LIB.prose[sel].moral === m); if (LIB.prose[sel].moral === m) {", 1],
  ['загадка', 'const ok = g && ans.split(/[\\s,.-]+/).some(w => w.length > 2 && g.includes(w));', "const ok = g && ans.split(/[\\s,.-]+/).some(w => w.length > 2 && g.includes(w)); if (g) lwOnce(box, 0, 'reading', !!ok);", 1],
  ['собери строку (мастерская)', "if (built.length === words.length) $('.fb', box).appendChild(again()); };", "if (built.length === words.length) { lwOnce(words, 0, 'reading', built.every((x, i) => words[x] === words[i])); $('.fb', box).appendChild(again()); } };", 1],
]

// inline-обработчики разметки: в тени onclick="go('…')" ищет глобальную go, а go — переменная монтажа. Атрибут
// переименовывается, и один делегированный обработчик на корне исполняет его код в области движка (LW_INLINE).
const INLINE = { click: 168, input: 2, change: 2, submit: 1, error: 1 }
const INLINE_RE = /(?<![-\w])on(click|input|change|submit|error)=(["'])/g

// Чего после замен в движке быть не должно (сторож — и в engine.test.js).
const FORBIDDEN = [
  /\blocation\.(hash|replace|href|assign)\b/,
  /hashchange/,
  /document\.(body|documentElement|title|getElementById|querySelector|querySelectorAll|onkeydown|addEventListener)\b/,
  /window\.(addEventListener|scrollTo|_sq|LW_IMG_LOG|lwImageReport)\b/,
  /localStorage|speechSynthesis|SpeechSynthesisUtterance/,
  /getElementById\('d-/,
  /(?<![-\w])on(click|input|change|submit|error)=["']/,
  /data-theme=/,
]

const HEADER = `'use client'

// Literature World — движок раздела литературы, перенесённый из прототипа
// методиста (single-file html «The Literature World») сборкой
// scripts/literature/build-engine.js: тело — весь inline-скрипт прототипа в
// том же порядке, правки — считанными заменами. СГЕНЕРИРОВАН — руками не
// править: правка поведения идёт в прототип и в замены сборщика, иначе
// следующая заливка прототипа предупредит «движок отличается» уже ложно, а
// повторная сборка сотрёт ручную правку.
//
// Экран LiteraturePage монтирует его в Shadow DOM: классы прототипа (.top,
// .btn, .card, .wrap, .panel) совпадают с глобальными классами сайта.
// Отличия от прототипа — только связь с приложением (спека
// 2026-11-17-literature-world-design.md, «Сайт»):
// - данные — cfg.bundle с бэкенда (/mobile/literature), а не блоки
//   <script type="application/json" id="d-…">; копия своя у каждого монтажа
//   (движок дописывает в данные стихи, полки, «Riders to the Sea»); сцены,
//   маскоты и видео входа — ссылки бакета как есть (без lwBlob);
// - разметку страницы прототипа (шапка, #app, подвал, #pop, clipPath «облачко»)
//   ставит движок сам (SHELL): без логотипа в шапке и подвале; «назад» из
//   раздела — кнопка шапки, только с cfg.onExit и только на главной книги;
//   <main> — <div id="app">: главный ориентир страницы уже есть у приложения;
// - inline-обработчики разметки (onclick, oninput, onchange, onsubmit,
//   onerror — 174 места) переименованы в data-lw-on…: в тени такой код ищет
//   глобальные go, render, S, SUP, а это переменные монтажа. Один
//   делегированный обработчик на корне исполняет код атрибута прямым eval в
//   области движка (this — элемент, event — событие), по пути события от цели
//   к корню, с остановкой на stopPropagation и с false → preventDefault;
//   onerror картинки — ловушкой захвата после lwImgError (тот гасит событие,
//   как гасил у прототипа на document). Элемент, которому движок сам назначил
//   on…-свойство, атрибут не исполняет: у прототипа свойство его заменяло;
// - роутер — переменная HASH вместо location.hash: go() → lwGo, клики по
//   <a href="#…"> в тени перехватываются, адрес страницы не меняется; go(),
//   позванный посреди отрисовки (мастерская уводит в «Слова» и к тексту),
//   выполняется после неё — как hashchange у прототипа;
// - тема мира (themeFor: nursery, press, writers, archive, gothic…) — атрибут
//   data-lw-theme на корне раздела, а не data-theme на <body>: data-theme на
//   хосте — тема приложения (watchAppTheme); язык (setLang) — lang на корне, а
//   не на <html>;
// - поиск по документу → по корню раздела ($, $$, $id); слушатели document
//   (error, load, click, loadedmetadata, animationend) — на корне, window
//   (resize) — через AbortController; наблюдатели разметки и видимости
//   отпускаются в destroy(); окно «About» и подсказка к слову (#pop) — внутри
//   раздела, подсказка ставится от корня раздела, а не от страницы;
// - прокрутка (window.scrollTo) → cfg.scrollTo(y): y — от верха раздела;
//   ширина окна для кадрирования сцен — innerWidth, а «телефон или планшет»
//   (max-width:1100px) — по ширине раздела, как и CSS (@container);
// - imgdebug, window.lwImageReport, window.LW_IMG_LOG — без глобалов;
//   sessionStorage lwNoLocal и путь LW_LOCAL_DIR — как есть: у imgmeta нет
//   своих копий картинок (m[5]), и путь не включается;
// - хранилище jtsLit.* — не localStorage: блокнот (notebook) —
//   cfg.progress() / cfg.onProgress({ notebook }) (синк с аккаунтом),
//   перечитывается на каждом экране; своё предложение «Produce» (prod.<id>) —
//   cfg.drafts() / cfg.onDrafts (устройство);
// - язык интерфейса и подсказок — cfg.lang { lang: en|kz|ru, sup: ru|kz } на
//   входе, cfg.onLang({ lang, sup }) после отрисовки, где он поменялся;
// - say() (speechSynthesis en-GB) → cfg.speak(text) (Soniox британским
//   голосом, запасной — голос устройства); cfg.speak(null) — замолчать: смена
//   экрана (stopAll) и destroy глушат и его; подпись под кнопками больше не
//   обещает «голос вашего устройства»;
// - записи Commons, YouTube, картинки Wikimedia — как есть; запись себя —
//   только память вкладки: дорожки микрофона останавливаются после записи и в
//   destroy, микрофон, разрешённый уже после ухода, отпускается сразу;
// - пробел «хлопка» (document.onkeydown) — слушатель окна на время задания;
//   пробел, набранный в поле ввода, остаётся пробелом;
// - ответ практики → cfg.onAnswer(kind, ok), kind — 'vocab' (шесть шагов
//   слова, Words Lab, блокнот в мастерской) или 'reading' (порядок строк,
//   рифма, пословица, конец предложения, мораль, загадка, кто говорит,
//   регистры, задания мастерской); считается первая проверка задания;
// - разбивка на предложения (sentSplit) — без lookbehind в регулярке: Safari
//   до 16.4 его не разбирает, и модуль не загрузился бы вовсе; разрез тот же;
// - таймеры — через обёртки, слушатели — через AbortController: destroy()
//   снимает всё, и после него раздел ничего не делает и не пишет.
`

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

const countOf = (text, find) => (typeof find === 'string' ? text.split(find).length - 1 : (text.match(find) || []).length)

/** Тело движка: inline-скрипт прототипа с заменами. Бросает, если замена нашлась не своё число раз. */
function transform(source) {
  let code = source
  for (const [why, find, repl, count] of REPLACEMENTS) {
    const n = countOf(code, find)
    if (n !== count) throw new Error(`замена «${why}»: нашлась ${n} раз, ждали ${count}`)
    code = code.split(find).join(repl)
  }
  const inline = {}
  code = code.replace(INLINE_RE, (m, type, q) => {
    inline[type] = (inline[type] || 0) + 1
    return `data-lw-on${type}=${q}`
  })
  for (const [type, count] of Object.entries(INLINE)) {
    if ((inline[type] || 0) !== count) throw new Error(`inline-обработчиков on${type}: ${inline[type] || 0}, ждали ${count}`)
  }
  for (const bad of FORBIDDEN) if (bad.test(code)) throw new Error(`после замен осталось ${bad}: ${code.match(bad)[0]}`)
  return code
}

/** engine.js целиком. */
function buildEngine(html) {
  const blocks = P.engineBlocks(html)
  if (blocks.length !== 1) throw new Error(`блоков движка ${blocks.length}, ждали 1`)
  const { sha } = P.engineSha(html)
  const body = transform(blocks[0])
  return `${HEADER}
// sha256 движка прототипа, из которого собран этот файл (literature.engine-sha бэкенда)
export const ENGINE_SHA = '${sha}'
${PRELUDE}
/* ===================== скрипт прототипа (с заменами build-engine.js) ===================== */
${body}
/* ===================== конец скрипта прототипа ===================== */
${EPILOGUE}
`
}

// Разметка <body> прототипа без логотипов и скриптов; inline-обработчики — сразу data-lw-on… (код тот же).
// Логотип прототипа был кнопкой «на главную книги»; уже 1330 px его подпись прячется правилом прототипа, и без логотипа
// кнопка сжималась в 0×0 — других переходов на главную у движка нет. Поэтому у кнопки свой значок-книга.
const SHELL = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <clipPath id="bubble" clipPathUnits="objectBoundingBox"><path d="M.5,.02 C.77,.02 .98,.23 .98,.5 C.98,.77 .77,.98 .5,.98 L.075,.98 C.035,.98 .02,.94 .045,.91 L.135,.81 C.065,.725 .02,.62 .02,.5 C.02,.23 .23,.02 .5,.02 Z"/></clipPath>
</defs></svg>
<header class="top"><div class="top-in">
  <button class="lw-exit" type="button" id="lwExit" aria-label="Back" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></button>
  <button class="brand" data-lw-onclick="go('home')" aria-label="Literature World home"><svg class="lw-home" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.2c3-1.4 6-1.4 9 .6 3-2 6-2 9-.6v12.4c-3-1.4-6-1.4-9 .6-3-2-6-2-9-.6zM12 6.8v12.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg><i></i><span>Literature World</span></button>
  <nav class="nav" id="nav"></nav>
  <div class="tools"><select class="sel" id="lvlSel" aria-label="Level"></select><div class="lang" id="lang"></div></div>
  <button class="burger" aria-label="Menu" data-lw-onclick="$id('nav').classList.toggle('open')">☰</button>
</div></header>
<div id="app"></div>
<footer><div class="wrap"><span id="footText"></span><button data-lw-onclick="aboutModal()" id="aboutBtn">About these texts</button></div></footer>
<div id="pop" class="pop" hidden></div>`

const PRELUDE = `
// Разметка <body> прототипа без логотипов (см. шапку).
const SHELL = ${JSON.stringify(SHELL)}

const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const copy = (x) => JSON.parse(JSON.stringify(x))
const LANGS = ['en', 'kz', 'ru']

/** Язык интерфейса (en | kz | ru — коды прототипа) и подсказок (ru | kz). */
export function normalizeLiteratureLang(raw) {
  const r = isObj(raw) ? raw : {}
  const lang = LANGS.includes(r.lang) ? r.lang : 'en'
  const sup = r.sup === 'kz' || r.sup === 'ru' ? r.sup : lang === 'kz' ? 'kz' : 'ru'
  return { lang, sup }
}

/**
 * @param {HTMLElement} root  корень раздела (в Shadow DOM) — <div class="lw">; разметку страницы движок ставит сам
 * @param {{ bundle: object, progress?: () => object, onProgress?: (state: { notebook: object }) => void,
 *   drafts?: () => object, onDrafts?: (drafts: object) => void, lang?: { lang: string, sup: string },
 *   onLang?: (lang: { lang: string, sup: string }) => void, onAnswer?: (kind: 'vocab'|'reading', ok: boolean) => void,
 *   speak?: (text: string|null) => void, scrollTo?: (y: number) => void, onExit?: () => void }} cfg
 */
export function mountLiterature(root, cfg) {
const { bundle, progress = () => null, onProgress = () => {}, drafts: readDrafts = () => null, onDrafts = () => {}, onLang = () => {}, onAnswer = () => {}, speak = null, scrollTo: scrollToCfg = null, onExit = null } = cfg
const ROOT = root
const HOST = (ROOT.getRootNode && ROOT.getRootNode().host) || ROOT
const LW_LANG0 = normalizeLiteratureLang(cfg.lang)
ROOT.innerHTML = SHELL
ROOT.lang = LW_LANG0.lang === 'kz' ? 'kk' : LW_LANG0.lang
let dead = false
const abort = new AbortController()
const on = (target, type, fn, opts) => target.addEventListener(type, fn, typeof opts === 'boolean' ? { capture: opts, signal: abort.signal } : { ...(opts || {}), signal: abort.signal })
// Слушатель «документа» прототипа — на корне раздела. Обработчик элемента, позвавший stopPropagation, у прототипа
// не пускал событие до document: слушатель всплытия на корне такое событие пропускает.
const lwOnRoot = (type, fn, capture) => on(ROOT, type, capture ? fn : (e) => { if (!e.cancelBubble) fn(e) }, !!capture)
const TIMERS = new Set()
const TICKS = new Set()
const setTimeout = (fn, ms) => { const id = globalThis.setTimeout(() => { TIMERS.delete(id); if (!dead) fn() }, ms); TIMERS.add(id); return id }
const clearTimeout = (id) => { TIMERS.delete(id); globalThis.clearTimeout(id) }
const setInterval = (fn, ms) => { const id = globalThis.setInterval(() => { if (!dead) fn() }, ms); TICKS.add(id); return id }
const clearInterval = (id) => { TICKS.delete(id); globalThis.clearInterval(id) }
// id в тени: поиск по документу её не видит
const $id = (id) => ROOT.querySelector('[id="' + String(id).replace(/["\\\\]/g, '') + '"]')
const lwNarrow = (px) => (HOST.clientWidth || ROOT.clientWidth || 0) <= px

// ---------- данные бандла ----------
const lwData = (k) => (bundle && bundle[k] != null ? copy(bundle[k]) : {})
const lwMedia = (u) => String(u || '')

// ---------- роутер: адрес раздела — переменная ----------
let HASH = ''
let LW_IN_RENDER = 0
// location.hash кодирует в адресе пробел, кавычку, < > и обратную кавычку (route() их раскодирует) — как и здесь
const lwHashOf = (h) => '#' + String(h || '').replace(/^#/, '').replace(/[ "<>\\x60]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
function lwGo(h) {
  const next = lwHashOf(h)
  if (dead || next === HASH) return
  HASH = next
  // посреди отрисовки (мастерская уводит из afterX) — после неё, как hashchange у прототипа
  if (LW_IN_RENDER) setTimeout(route, 0)
  else route()
}
if (onExit) {
  on(ROOT.querySelector('#lwExit'), 'click', () => onExit())
}
function lwExitButton() {
  const b = ROOT.querySelector('#lwExit')
  if (b) b.hidden = !(onExit && S.view === 'home')
}

// ---------- inline-обработчики разметки (onclick= → data-lw-onclick=) ----------
// Код атрибута исполняется прямым eval в области движка: так он видит go, render, S, SUP — как inline-код прототипа
// видел его глобалы. Функция на код — одна (кэш), this — элемент, event — событие.
const LW_FN = new Map()
function lwInline(type, e) {
  const attr = 'data-lw-on' + type
  const path = e.composedPath ? e.composedPath() : [e.target]
  for (const el of path) {
    if (e.cancelBubble) return
    if (el && el.nodeType === 1 && el.hasAttribute(attr) && !el['on' + type]) {
      const code = el.getAttribute(attr)
      let fn = LW_FN.get(code)
      if (!fn) {
        // прямой eval (не new Function): только так код видит переменные движка; минификатор, видя прямой eval, оставляет
        // имена этой области как есть
        fn = eval('(function (event) {\\n' + code + '\\n})')
        LW_FN.set(code, fn)
      }
      let r
      try {
        r = fn.call(el, e)
      } catch (err) {
        console.error('[Literature World]', err)
      }
      if (r === false) e.preventDefault()
    }
    if (el === ROOT) return
  }
}
for (const type of ['click', 'input', 'change', 'submit']) on(ROOT, type, (e) => { if (!dead) lwInline(type, e) })
// Ссылка <a href="#…"> в тени — экран раздела (у прототипа — адрес страницы). Позже inline-обработчиков: «Practise these
// words» сам гасит переход (event.preventDefault) и прокручивает к заданиям.
lwOnRoot('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href^="#"]')
  if (!a || e.defaultPrevented || !ROOT.contains(a)) return
  e.preventDefault()
  lwGo(a.getAttribute('href'))
})

// ---------- звук, клавиши, микрофон ----------
let LW_KEY = null
let LW_SQ = null
let LW_MO = null
const LW_STREAMS = new Set()
const LW_URLS = new Set()
const lwObjectUrl = (blob) => { const u = URL.createObjectURL(blob); LW_URLS.add(u); return u }
on(window, 'keydown', (e) => {
  if (!LW_KEY) return
  const t = (e.composedPath && e.composedPath()[0]) || e.target
  // пробел, набранный в поле ввода (ответ «Think about it», чат Луны), — пробел, а не хлопок
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return
  LW_KEY(e)
})
function lwSpeak(text) { try { if (speak) speak(String(text || '')) } catch (e) { /* голос — не повод ронять раздел */ } }
function lwHush() { try { if (speak) speak(null) } catch (e) { /* то же */ } }
const lwScrollTo = (y) => { try { if (scrollToCfg) scrollToCfg(Math.max(0, Math.round(y))) } catch (e) { /* то же */ } }

// ---------- ответы практики ----------
function lwAnswer(kind, ok) { try { onAnswer(kind === 'vocab' ? 'vocab' : 'reading', !!ok) } catch (e) { /* навык — не повод ронять практику */ } }
// Первая проверка задания: key — объект самого задания (его массив, коробка), sub — часть задания (басня).
const LW_SAID = new WeakMap()
function lwOnce(key, sub, kind, ok) {
  let s = LW_SAID.get(key)
  if (!s) LW_SAID.set(key, (s = new Set()))
  if (s.has(sub)) return
  s.add(sub)
  lwAnswer(kind, ok)
}
// Вопросы с вариантами: шаги слова, Words Lab и блокнот мастерской — слова; остальное — чтение.
const lwKind = (box) => (box && (box.id === 'wprac' || box.id === 'wlab' || (box.id === 'wsb' && S.id === 'nb')) ? 'vocab' : 'reading')

// ---------- хранилище jtsLit.* ----------
const DRAFTS = isObj(readDrafts()) ? copy(readDrafts()) : {}
const lwStore = {
  get(k, d) {
    try {
      if (k === 'notebook') { const s = progress(); return s && isObj(s.notebook) ? copy(s.notebook) : d }
      if (String(k).startsWith('prod.')) return DRAFTS[String(k).slice(5)] || d
    } catch (e) { /* хранилище — не повод ронять раздел */ }
    return d
  },
  set(k, v) {
    try {
      if (k === 'notebook') onProgress({ notebook: copy(v || {}) })
      else if (String(k).startsWith('prod.')) {
        const id = String(k).slice(5)
        if (v) DRAFTS[id] = String(v)
        else delete DRAFTS[id]
        onDrafts(copy(DRAFTS))
      }
    } catch (e) { /* то же */ }
  },
}
let LW_LANG_SAVED = LW_LANG0.lang + '|' + LW_LANG0.sup
function lwLangSync() {
  const now = LANG + '|' + SUP
  lwExitButton()
  if (now === LW_LANG_SAVED) return
  LW_LANG_SAVED = now
  try { onLang({ lang: LANG, sup: SUP }) } catch (e) { /* то же */ }
}
`

const EPILOGUE = `
// onerror картинок — после lwImgError: тот гасит событие у картинок Wikimedia (свой обработчик заменяет «спрятать»),
// и тогда атрибут не исполняется, как и у прототипа.
on(ROOT, 'error', (e) => { if (!dead) lwInline('error', e) }, true)

// Подсказка к слову (#pop) закрывается кликом мимо. У прототипа слушатель стоял на документе, у нас «документ» — корень
// раздела, и клик по сайдбару или шапке приложения до него не доходит: ловим нажатие на документе вне хоста.
on(document, 'pointerdown', (e) => {
  if (dead || (e.composedPath && e.composedPath().includes(HOST))) return
  const p = $('#pop'); if (p) p.hidden = true
  $$('.w.on').forEach((x) => x.classList.remove('on'))
})

function destroy() {
  if (dead) return
  try { stopAll() } catch (e) { /* уже разобран */ }
  dead = true
  abort.abort()
  for (const id of TIMERS) globalThis.clearTimeout(id)
  for (const id of TICKS) globalThis.clearInterval(id)
  TIMERS.clear()
  TICKS.clear()
  LW_KEY = null
  if (LW_MO) LW_MO.disconnect()
  if (lwIO) lwIO.disconnect()
  for (const st of LW_STREAMS) st.getTracks().forEach((x) => x.stop())
  LW_STREAMS.clear()
  for (const u of LW_URLS) URL.revokeObjectURL(u)
  LW_URLS.clear()
}

return {
  destroy,
  /** Открыть экран раздела: '#item/po-tiger', 'play/romeo/read/1.0' — как go() прототипа. */
  go: (h) => lwGo(h),
  /** Где раздел сейчас. */
  snapshot: () => ({ hash: HASH, view: S.view, id: S.id, tab: S.tab, arg: S.arg || null, lang: LANG, sup: SUP, level: LEVEL, notebook: copy(NOTE) }),
  /** Блокнот перечитать (снимок сервера пришёл позже) и, если он на экране, перерисовать. */
  refresh: () => {
    if (dead) return
    NOTE = store.get('notebook', {})
    if (['words', 'word', 'workshop'].includes(S.view)) render()
  },
}
}
`

function main() {
  const html = P.readHtml(arg('--html') || FIXTURE)
  const out = buildEngine(html)
  fs.writeFileSync(OUT, out)
  console.log(`engine.js: ${Math.round(out.length / 1024)} КБ`)
}

module.exports = { REPLACEMENTS, INLINE, FORBIDDEN, transform, buildEngine, countOf }

if (require.main === module) main()
