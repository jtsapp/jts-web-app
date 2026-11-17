'use client'

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

// sha256 движка прототипа, из которого собран этот файл (literature.engine-sha бэкенда)
export const ENGINE_SHA = '3ca72307b6eeec30f34f97c9683846cbeceb931d05e5ea95351bc03dc9bcfd8b'

// Разметка <body> прототипа без логотипов (см. шапку).
const SHELL = "<svg width=\"0\" height=\"0\" style=\"position:absolute\" aria-hidden=\"true\"><defs>\n  <clipPath id=\"bubble\" clipPathUnits=\"objectBoundingBox\"><path d=\"M.5,.02 C.77,.02 .98,.23 .98,.5 C.98,.77 .77,.98 .5,.98 L.075,.98 C.035,.98 .02,.94 .045,.91 L.135,.81 C.065,.725 .02,.62 .02,.5 C.02,.23 .23,.02 .5,.02 Z\"/></clipPath>\n</defs></svg>\n<header class=\"top\"><div class=\"top-in\">\n  <button class=\"lw-exit\" type=\"button\" id=\"lwExit\" aria-label=\"Back\" hidden><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M15 5l-7 7 7 7\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/></svg></button>\n  <button class=\"brand\" data-lw-onclick=\"go('home')\" aria-label=\"Literature World home\"><svg class=\"lw-home\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M3 6.2c3-1.4 6-1.4 9 .6 3-2 6-2 9-.6v12.4c-3-1.4-6-1.4-9 .6-3-2-6-2-9-.6zM12 6.8v12.4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/></svg><i></i><span>Literature World</span></button>\n  <nav class=\"nav\" id=\"nav\"></nav>\n  <div class=\"tools\"><select class=\"sel\" id=\"lvlSel\" aria-label=\"Level\"></select><div class=\"lang\" id=\"lang\"></div></div>\n  <button class=\"burger\" aria-label=\"Menu\" data-lw-onclick=\"$id('nav').classList.toggle('open')\">☰</button>\n</div></header>\n<div id=\"app\"></div>\n<footer><div class=\"wrap\"><span id=\"footText\"></span><button data-lw-onclick=\"aboutModal()\" id=\"aboutBtn\">About these texts</button></div></footer>\n<div id=\"pop\" class=\"pop\" hidden></div>"

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
const $id = (id) => ROOT.querySelector('[id="' + String(id).replace(/["\\]/g, '') + '"]')
const lwNarrow = (px) => (HOST.clientWidth || ROOT.clientWidth || 0) <= px

// ---------- данные бандла ----------
const lwData = (k) => (bundle && bundle[k] != null ? copy(bundle[k]) : {})
const lwMedia = (u) => String(u || '')

// ---------- роутер: адрес раздела — переменная ----------
let HASH = ''
let LW_IN_RENDER = 0
// location.hash кодирует в адресе пробел, кавычку, < > и обратную кавычку (route() их раскодирует) — как и здесь
const lwHashOf = (h) => '#' + String(h || '').replace(/^#/, '').replace(/[ "<>\x60]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
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
        fn = eval('(function (event) {\n' + code + '\n})')
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

/* ===================== скрипт прототипа (с заменами build-engine.js) ===================== */

/* ============================================================
   LITERATURE IN ENGLISH — CONTENT DATA (part 1)
   Every literary text below is copied verbatim from the source
   edition named in SOURCES. Platform-written material (glosses,
   notes, prompts) is kept in separate fields and labelled in UI.
   ============================================================ */

/* Commons audio: original Ogg + Wikimedia's MP3 transcode (for Safari/iOS). All verified playing 2026-11-10. */
const CA = (ogg, reader, lic, note) => ({ reader, lic, note: note || '', ogg, mp3: ogg.replace('/wikipedia/commons/', '/wikipedia/commons/transcoded/') + '/' + ogg.split('/').pop() + '.mp3', page: 'https://commons.wikimedia.org/wiki/File:' + decodeURIComponent(ogg.split('/').pop()) });
const IMGM = lwData('imgmeta');

/* ===== Image delivery (Literature World) =====
   Wikimedia now serves only standard thumbnail widths to other sites (20, 40, 60, 120, 250, 330, 500,
   960, 1280, 1920, 3840 px). Special:FilePath?width=… went through two redirects to thumb.wikimedia.org and
   was rounded UP (2000 → 3840 px). We now request the exact file directly from upload.wikimedia.org at the
   smallest standard width that is sharp for the box it is shown in, never larger than the original. */
const LW_STEPS = [250, 330, 500, 960, 1280, 1920];
const LW_FILE = Object.create(null);            // url → file name (for retries and logs)
const LW_LOADED = new Set();                    // urls already decoded in this session
const LW_LOG = [];          // every retry and failure, for developers
const lwDpr = () => Math.min(window.devicePixelRatio || 1, 2);
const lwStep = t => LW_STEPS.find(s => s >= t * 0.88) || 1920;
function lwLegacy(file, w) { return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29') + '?width=' + lwStep(w || 1000); }
const LW_LOCAL_DIR = 'lw-img/';
let LW_LOCAL_OK = 0, LW_LOCAL_BAD = 0; try { if (sessionStorage.getItem('lwNoLocal') === '1') LW_LOCAL_BAD = 99; } catch (e) { }
const LW_PX = Object.create(null);              // url → width it was chosen for
const lwUseLocal = () => LW_LOCAL_BAD < 3 || LW_LOCAL_OK > 0;
function lwWiki(file, px) { const m = IMGM[file]; if (!m) return lwLegacy(file, px); const s = lwStep(px); return s >= m[1] * 0.92 ? m[3] : m[0] + s + 'px-' + m[4]; }
function lwUrl(file, px) {
  const m = IMGM[file]; let u;
  if (m && m[5] && lwUseLocal() && m[6][m[6].length - 1] >= Math.min(px, m[1]) * 0.66) { const L = m[6]; const s = L.find(x => x >= px * 0.88) || L[L.length - 1]; u = LW_LOCAL_DIR + m[5] + '-' + s + '.webp'; }
  else u = lwWiki(file, px);
  LW_FILE[u] = file; LW_PX[u] = px; return u;
}
/* `w` is the width the template was designed for; we scale it for this screen */
const IMG = (file, w) => { w = w || 1000; const vw = (window.innerWidth || 1440) * lwDpr(); return lwUrl(file, w >= 1200 ? Math.min(w, vw) : Math.min(w * lwDpr(), vw)); };
function lwChain(url) {
  const file = LW_FILE[url]; if (!file) return [];
  const m = IMGM[file], out = [];
  if (url.startsWith(LW_LOCAL_DIR)) { LW_LOCAL_BAD++; if (!LW_LOCAL_OK && LW_LOCAL_BAD >= 3) { try { sessionStorage.setItem('lwNoLocal', '1'); } catch (e) { } } out.push(lwWiki(file, LW_PX[url] || 960)); url = out[0]; }
  if (m) { const cur = LW_STEPS.find(s => url.includes('/' + s + 'px-')); LW_STEPS.filter(s => s < (cur || 99999) && s >= 500 && s < m[1]).reverse().forEach(s => out.push(m[0] + s + 'px-' + m[4])); if (m[1] <= 2600 && url !== m[3]) out.push(m[3]); }
  if (m && m[5] && !url.startsWith(LW_LOCAL_DIR)) out.push(LW_LOCAL_DIR + m[5] + '-' + m[6][m[6].length - 1] + '.webp');   /* our own copy, even if a little smaller */
  out.push(lwLegacy(file, 960));
  out.forEach(u => LW_FILE[u] = file); return [...new Set(out)];
}
function lwNote(kind, url, el) { const e = { kind, file: LW_FILE[url] || '', url, view: (S && S.view) + '/' + ((S && S.id) || ''), t: Math.round(performance.now()) }; LW_LOG.push(e); (kind === 'failed' ? console.error : console.warn)(`[Literature World] image ${kind}: ${e.file || url}`, url); if (el && kind === 'failed') el.setAttribute('data-img-failed', e.file || url); }
const lwImageReport = () => { console.table(LW_LOG); return LW_LOG; };
const LW_FAIL_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#EDE5D6"/><rect x="170" y="118" width="60" height="44" rx="4" fill="none" stroke="#A8957A" stroke-width="3"/><circle cx="186" cy="132" r="5" fill="#A8957A"/><path d="M172 160l18-16 12 10 10-8 16 14" fill="none" stroke="#A8957A" stroke-width="3"/></svg>');

/* ---- <img>: retry, then a visible, labelled placeholder (never a silent removal) ---- */
function lwImgError(e) {
  const el = e.target; if (!el || el.tagName !== 'IMG') return;
  const raw = el.getAttribute('src') || ''; const src = raw.startsWith(LW_LOCAL_DIR) ? raw : (el.currentSrc || el.src || ''); if (!/wikimedia\.org/.test(src) && !raw.startsWith(LW_LOCAL_DIR)) return;
  e.stopPropagation();                                   // our handler replaces the old “hide it” handlers
  if (!el._lwChain) el._lwChain = lwChain(src);
  const next = el._lwChain.shift();
  if (next) { lwNote('retry', src, el); el.removeAttribute('srcset'); el.src = next; return; }
  lwNote('failed', src, el);
  const ac = el.closest('.author-card,.author-chip'); if (ac) { ac.classList.add('noimg'); el.style.display = 'none'; return; }
  el.classList.add('lw-img-failed'); el.title = (el.alt ? el.alt + ' — ' : '') + 'picture could not be loaded'; el.src = LW_FAIL_SVG;
}
lwOnRoot('error', lwImgError, true);
lwOnRoot('load', e => { const el = e.target; if (el && el.tagName === 'IMG') { el.classList.remove('lw-wait'); const u = el.getAttribute('src') || ''; if (u.startsWith(LW_LOCAL_DIR)) LW_LOCAL_OK++; LW_LOADED.add(el.src); } }, true);

/* ---- backgrounds: load what is on screen now, the rest when it comes near ---- */
const lwIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { lwIO.unobserve(en.target); lwLoadBg(en.target, false); } }), { rootMargin: '700px 0px' }) : null;
function lwBgUrlFor(el) {
  const file = el.dataset.bgf; const m = file && IMGM[file]; if (!m) return el.dataset.bg;
  const r = el.getBoundingClientRect(); if (!r.width) return el.dataset.bg;
  const zoom = parseFloat(el.style.backgroundSize) > 100 ? parseFloat(el.style.backgroundSize) / 100 : 1;
  const need = Math.max(r.width, r.height * m[1] / m[2]) * zoom * lwDpr();      // background-size: cover
  return lwUrl(file, Math.min(need, (window.innerWidth || 1440) * lwDpr()));
}
function lwLoadBg(el, high) {
  if (el.dataset.bgDone) return;
  const url = el.dataset.bgu || (el.dataset.bgu = lwBgUrlFor(el));
  const set = u => { el.style.backgroundImage = `url("${u}")`; el.dataset.bgDone = 1; el.classList.add('lw-bg-in'); };
  if (LW_LOADED.has(url)) return set(url);
  const im = new Image(); im.decoding = 'async'; if (high) im.fetchPriority = 'high';
  im.onload = () => { if (url.startsWith(LW_LOCAL_DIR)) LW_LOCAL_OK++; LW_LOADED.add(url); set(url); };
  im.onerror = () => {
    if (!el._lwChain) el._lwChain = lwChain(url);
    const next = el._lwChain.shift();
    if (next) { lwNote('retry', url, el); el.dataset.bgu = next; lwLoadBg(el, high); }
    else { lwNote('failed', url, el); el.classList.add('lw-bg-failed'); el.style.backgroundImage = `url("${LW_FAIL_SVG}")`; el.dataset.bgDone = 1; }
  };
  im.src = url;
}
/* Called right after new HTML is inserted, before the browser has styled it, so no picture is fetched twice */
function prepImages(root) {
  if (!root || !root.querySelectorAll) return;
  const bgs = [];
  const cand = [...root.querySelectorAll('[style*="background-image"]')]; if (root.matches && root.matches('[style*="background-image"]')) cand.push(root);
  cand.forEach(el => {
    if (el.dataset.bgDone || el.classList.contains('lw-bg')) return;
    const m = (el.getAttribute('style') || '').match(/background-image:\s*url\(['"]?((?:https?:|lw-img\/)[^'")]+)/); if (!m || !(/wikimedia\.org/.test(m[1]) || m[1].startsWith(LW_LOCAL_DIR))) return;
    el.dataset.bg = m[1]; el.dataset.bgf = LW_FILE[m[1]] || ''; el.style.backgroundImage = ''; el.classList.add('lw-bg'); bgs.push(el);
  });
  const vh = window.innerHeight || 900;
  let firstBig = true;
  bgs.forEach(el => {
    if (el.matches('.art:not(.on)')) { setTimeout(() => lwLoadBg(el, false), 1800); return; }   // later slides of a slideshow
    const r = el.getBoundingClientRect(); const visible = r.width > 0 && r.bottom > -100 && r.top < vh * 1.15;
    if (visible) { lwLoadBg(el, firstBig && r.width * r.height > 120000); if (r.width * r.height > 120000) firstBig = false; }
    else if (lwIO) lwIO.observe(el); else lwLoadBg(el, false);
  });
  const imgs = [...root.querySelectorAll('img')]; if (root.tagName === 'IMG') imgs.push(root);
  imgs.forEach(im => {
    const src = im.getAttribute('src') || ''; if (!/wikimedia\.org/.test(src) && !src.startsWith(LW_LOCAL_DIR)) return;
    im.decoding = 'async';
    if (!im.complete) im.classList.add('lw-wait');
    const r = im.getBoundingClientRect(); const visible = r.bottom > -100 && r.top < vh * 1.15 && r.width > 0;
    if (visible) { im.loading = 'eager'; if (r.width * r.height > 90000) im.fetchPriority = 'high'; }
    else if (!im.getAttribute('loading')) im.loading = 'lazy';
  });
}
function checkBgs() { }   /* replaced by prepImages(); kept so older calls keep working */
/* other parts of the app also insert HTML (acts, galleries, practice): prepare their pictures too */
(LW_MO = new MutationObserver(ms => { const roots = new Set(); ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) roots.add(n); })); roots.forEach(n => { if (n.isConnected && !(n.parentNode && roots.has(n.parentNode))) prepImages(n); }); })).observe($id('app') || ROOT, { childList: true, subtree: true });
/* imgdebug: класс на <html> приложения порт не ставит */

const COMMONS = file => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file.replace(/ /g, '_'));

const SOURCES = {
  halliwell: {
    key: 'pg32415', work: 'The Nursery Rhymes of England', editor: 'J. O. Halliwell-Phillipps (compiler); illustrated by William Bell Scott',
    note: 'Collection first published 1842. The digitised edition is Project Gutenberg eBook #32415 (produced from Internet Archive scans). Rhymes are numbered in Roman numerals in this edition.',
    org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/32415', type: 'Digitised historical edition (public domain)'
  },
  peterpiper: {
    key: 'pg25027', work: "Peter Piper's Practical Principles of Plain and Perfect Pronunciation", editor: 'Anonymous',
    note: 'The digitised copy is the Philadelphia edition of 1836 (Willard Johnson, No. 141, South Street). The book is often dated to a London edition of 1813; that date is not confirmed by this copy.',
    org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/25027', type: 'Digitised historical edition (public domain)'
  },
  lear: {
    key: 'pg982', work: 'The Book of Nonsense', editor: 'Edward Lear',
    note: 'Limericks are numbered as in Project Gutenberg eBook #982. A Book of Nonsense was first published in 1846.',
    org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/982', type: 'Digitised edition (public domain)'
  },
  preston: {
    key: 'pg39281', work: 'A Dictionary of English Proverbs and Proverbial Phrases, with a copious index of principal words', editor: 'Thomas Preston (compiler, per Project Gutenberg catalogue); London: Whittaker & Co.',
    note: 'Entries are numbered in the original. Year of publication not printed in the digitised title page; the preface refers to "the late Earl Russell" (d. 1878), so it is after 1878.',
    org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/39281', type: 'Digitised historical reference (public domain)'
  },
  stevenson: {
    key: 'pg19722', work: "A Child's Garden of Verses", editor: 'Robert Louis Stevenson; illustrated by Myrtle Sheldon',
    note: 'First published 1885. Text from Project Gutenberg eBook #19722.',
    org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/19722', type: 'Digitised edition (public domain)'
  },
  obev: {
    key: 'pg66619', work: 'The Oxford Book of English Verse, 1250–1900', editor: 'Arthur Quiller-Couch (ed.), Oxford: Clarendon Press, 1900',
    note: 'Poems are numbered as in the anthology. Spelling and punctuation follow this edition, which sometimes differs from the poet’s first printing.',
    org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/66619', type: 'Digitised scholarly anthology (public domain)'
  },
  dickinson: {
    key: 'pg12242', work: 'Poems by Emily Dickinson, Three Series, Complete', editor: 'Mabel Loomis Todd and T. W. Higginson (editors of the 1890s series)',
    note: 'These are the 1890s edited texts, with titles added by the editors (e.g. "HOPE."). Dickinson’s manuscripts differ in punctuation (she used dashes); modern scholarly editions (Johnson 1955, Franklin 1998) are still in copyright.',
    org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/12242', type: 'Digitised edition (public domain)'
  },
  shakespeare: {
    key: 'pg100', work: 'The Complete Works of William Shakespeare', editor: 'Project Gutenberg eBook #100 (public-domain text)',
    note: 'Act/scene references follow this text. Wording should be cross-checked against the Folger Shakespeare (verification only — Folger texts are CC BY-NC and may not be copied by a paid platform).',
    org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/100', type: 'Digitised edition (public domain)'
  },
  librivox: {
    work: 'LibriVox volunteer recordings', org: 'LibriVox', url: 'https://librivox.org/pages/public-domain/',
    note: 'LibriVox states that all its recordings are public domain in the USA, "but not necessarily in other countries". Readers are volunteers; a reader may use a slightly different edition of the text.'
  }
};

const AUTHORS = {
  traditional: { name: 'Traditional', dates: 'oral tradition', origin: 'England (as collected)', img: null,
    bio: 'Nursery rhymes were passed on orally for generations before collectors such as James Orchard Halliwell printed them. "Traditional" means no individual author is known.' },
  halliwell: { name: 'James Orchard Halliwell-Phillipps', dates: '1820–1889', origin: 'England', img: 'Halliwell-Phillipps, James Orchard.jpg', imgCredit: 'Ernest Edwards, 1863 — public domain',
    bio: 'Collector and Shakespeare scholar. His Nursery Rhymes of England (1842) was one of the first large printed collections of traditional English rhymes.' },
  lear: { name: 'Edward Lear', dates: '1812–1888', origin: 'England', img: 'Edward Lear 1866.jpg', imgCredit: 'Photograph, 1866 — public domain',
    bio: 'Artist and writer. His Book of Nonsense (1846) made the limerick famous; he drew the pictures for his own verses.' },
  stevenson: { name: 'Robert Louis Stevenson', dates: '1850–1894', origin: 'Scotland', img: 'Sargent - Robert Louis Stevenson, 1887, 1931.472.jpg', imgCredit: 'John Singer Sargent, Robert Louis Stevenson, 1887, Taft Museum of Art — public domain',
    bio: 'Scottish novelist and poet, author of Treasure Island. A Child’s Garden of Verses (1885) looks at the world through a child’s eyes.' },
  dickinson: { name: 'Emily Dickinson', dates: '1830–1886', origin: 'USA (Amherst, Massachusetts)', img: 'Black-white photograph of Emily Dickinson2.png', imgCredit: 'Daguerreotype, c. 1847, Amherst College Archives — public domain',
    bio: 'American poet. Very few of her poems were printed in her lifetime; editors published selections from 1890 onwards.' },
  wordsworth: { name: 'William Wordsworth', dates: '1770–1850', origin: 'England (Lake District)', img: 'William Wordsworth by Henry William Pickersgill.jpg', imgCredit: 'Henry William Pickersgill, William Wordsworth — public domain',
    bio: 'A leading poet of English Romanticism. He wanted poetry to use "the real language of men" and found deep feeling in nature.' },
  blake: { name: 'William Blake', dates: '1757–1827', origin: 'England (London)', img: 'William Blake by Thomas Phillips.jpg', imgCredit: 'Thomas Phillips, 1807 — public domain',
    bio: 'Poet, painter and engraver. He printed and coloured his own books by hand, including Songs of Innocence and of Experience.' },
  burns: { name: 'Robert Burns', dates: '1759–1796', origin: 'Scotland (Ayrshire)', img: 'Alexander Nasmyth - Robert Burns, 1759 - 1796. Poet - Google Art Project.jpg', imgCredit: 'Alexander Nasmyth, Robert Burns, 1787, Scottish National Portrait Gallery — public domain',
    bio: 'Scotland’s national poet. He wrote in Scots as well as English and collected and reworked traditional Scottish songs.' },
  byron: { name: 'George Gordon Byron, Lord Byron', dates: '1788–1824', origin: 'England', img: 'George Gordon Byron, 6th Baron Byron by Richard Westall (2).jpg', imgCredit: 'Richard Westall, Lord Byron, 1813, National Portrait Gallery — public domain',
    bio: 'Romantic poet, famous across Europe in his lifetime. "She walks in Beauty" appeared in Hebrew Melodies (1815).' },
  keats: { name: 'John Keats', dates: '1795–1821', origin: 'England (London)', img: 'John Keats by William Hilton circa 1822 02.jpg', imgCredit: 'William Hilton, c. 1822 — public domain',
    bio: 'Romantic poet who died aged 25. His odes are known for rich sensory imagery.' },
  herrick: { name: 'Robert Herrick', dates: '1591–1674', origin: 'England', img: 'Robert Herrick (poet) (cropped).jpg', imgCredit: 'Engraving reproduced 1904 — public domain',
    bio: 'Clergyman and poet, influenced by Ben Jonson. His poems were collected in Hesperides (1648).' },
  rossetti: { name: 'Christina Rossetti', dates: '1830–1894', origin: 'England (London)', img: 'Christina Rossetti 2.jpg', imgCredit: 'Christina Rossetti, portrait — public domain',
    bio: 'Victorian poet. "Remember" and "Up-Hill" were published in Goblin Market and Other Poems (1862).' },
  donne: { name: 'John Donne', dates: '1572–1631', origin: 'England (London)', img: 'John Donne by Isaac Oliver.jpg', imgCredit: 'After Isaac Oliver, 1616 — public domain',
    bio: 'Poet and preacher, Dean of St Paul’s. Known for argumentative, surprising imagery (later called "Metaphysical" poetry).' },
  tennyson: { name: 'Alfred, Lord Tennyson', dates: '1809–1892', origin: 'England', img: 'Alfred Tennyson, 1st Baron Tennyson by George Frederic Watts.jpg', imgCredit: 'George Frederic Watts, Alfred Tennyson — public domain',
    bio: 'Poet Laureate for over forty years. Famous for the music of his lines and for short, intense poems as well as long ones.' },
  shelley: { name: 'Percy Bysshe Shelley', dates: '1792–1822', origin: 'England', img: 'Percy Bysshe Shelley by Alfred Clint.jpg', imgCredit: 'Alfred Clint, after Amelia Curran, Percy Bysshe Shelley — public domain',
    bio: 'Romantic poet and radical thinker. He drowned in Italy, aged 29.' },
  yeats: { name: 'W. B. Yeats', dates: '1865–1939', origin: 'Ireland', img: 'Portrait of William Butler Yeats P5656.jpg', imgCredit: 'Portrait of W. B. Yeats — public domain',
    bio: 'Irish poet and playwright, Nobel Prize in Literature 1923. A leading voice of modern poetry in English — and an Irish, not a British, writer.' },
  mccrae: { name: 'John McCrae', dates: '1872–1918', origin: 'Canada', img: 'Lieut.-Col. John McCrae, M.D..jpg', imgCredit: 'Lieut.-Col. John McCrae, M.D. — public domain',
    bio: 'Canadian doctor and soldier who served in the First World War. He died of pneumonia in France in January 1918.' },
  teasdale: { name: 'Sara Teasdale', dates: '1884–1933', origin: 'USA', img: 'Sara Teasdale. Photograph by unknown, 1907 Missouri History Museum Photograph and Print Collection. Portraits n38637.jpg', imgCredit: 'Photograph, 1907, Missouri History Museum — public domain',
    bio: 'American lyric poet, known for short musical poems. She won one of the first Pulitzer Prizes for poetry (1918).' },
  shakespeare: { name: 'William Shakespeare', dates: '1564–1616', origin: 'England (Stratford-upon-Avon)', img: 'William Shakespeare by John Taylor, edited.jpg', imgCredit: 'The "Chandos" portrait, attributed to John Taylor — public domain',
    bio: 'Playwright, poet and actor. Most of his plays were collected after his death in the First Folio (1623); his Sonnets were printed in 1609.' }
};

/* ---------------- 1. RHYMES & CHANTS (Halliwell) ---------------- */
const RHYMES = [
  { id: 'r-bah-bah', title: 'Bah, bah, black sheep', ref: 'No. DLXXXV', level: 'A0', themes: ['animals', 'counting'],
    text: `Bah, bah, black sheep,
  Have you any wool?
Yes, marry, have I,
  Three bags full:
One for my master,
  And one for my dame,
But none for the little boy
  Who cries in the lane.`,
    gloss: { marry: { en: 'an old exclamation, like "indeed!" (from "by Mary")', ru: 'старинное восклицание: «право же!»', kz: 'көне одағай: «әрине!»' },
             dame: { en: 'the lady of the house', ru: 'хозяйка дома', kz: 'үй иесі (әйел)' } },
    note: 'This is the spelling Halliwell printed ("Bah, bah"). Today the rhyme is usually spelled "Baa, baa", and the last lines vary between versions.',
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/5/5b/Bahbahblacksheep.ogg', 'Melody only (instrumental)', 'CC0', 'The first four bars of the traditional tune. Clap along, then sing or say the words yourself.')],
    beats: [2, 2, 2, 2, 2, 2, 3, 2] },
  { id: 'r-jack-jill', title: 'Jack and Jill', ref: 'No. CCCCLXXXV', level: 'A0', themes: ['people', 'water'],
    text: `Jack and Jill went up the hill,
  To fetch a pail of water;
Jack fell down, and broke his crown,
  And Jill came tumbling after.`,
    gloss: { pail: { en: 'a bucket', ru: 'ведро', kz: 'шелек' }, crown: { en: 'here: the top of the head', ru: 'здесь: макушка', kz: 'мұнда: төбе' } },
    image: { file: 'Jack & Jill (Greenaway).jpg', credit: 'Advertising card based on Kate Greenaway’s “Jack and Jill” from her Mother Goose (1881) — public domain', small: true },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/d/d4/Jack_and_Jill_%281890%29.ogg', 'Edison’s Talking Doll, 1890', 'Public domain', 'A historic recording made in 1890 for Thomas Edison’s talking doll — one of the oldest recordings of an English nursery rhyme. The sound is very old and the wording may differ from Halliwell’s text.')],
    beats: [4, 3, 4, 3] },
  { id: 'r-pat-a-cake', title: 'Pat-a-cake', ref: 'No. XLI', level: 'A0', themes: ['food', 'games'],
    text: `Pat-a-cake, pat-a-cake, baker's man!
So I will, master, as fast as I can:
Pat it, and prick it, and mark it with T,
Put in the oven for Tommy and me.`,
    gloss: { prick: { en: 'to make small holes in', ru: 'наколоть', kz: 'тесіп шығу' } },
    beats: [4, 4, 4, 4], clap: true },
  { id: 'r-rain', title: 'Rain, rain, go away', ref: 'No. DCXIX', level: 'A0', themes: ['weather'],
    text: `Rain, rain, go away,
Come again another day;
Little Arthur wants to play.`,
    gloss: {}, note: 'In this rhyme the child’s name is often changed to the name of the child who is singing. Halliwell printed "Little Arthur".',
    beats: [3, 3, 3] },
  { id: 'r-hot-cross', title: 'Hot-cross Buns!', ref: 'No. CLX', level: 'A0', themes: ['food', 'street cries'],
    text: `    Hot-cross Buns!
    Hot-cross Buns!
One a penny, two a penny
    Hot-cross Buns!

    Hot-cross Buns!
    Hot-cross Buns!
If ye have no daughters,
    Give them to your sons.`,
    gloss: { ye: { en: 'old form of "you"', ru: 'устар. «вы»', kz: 'көне: «сіз/сендер»' }, penny: { en: 'a small British coin', ru: 'пенни (мелкая монета)', kz: 'пенни (ұсақ ақша)' } },
    note: 'This began as a street cry — the call of a seller selling buns in the street.',
    beats: [3, 3, 4, 3, 3, 3, 3, 3] },
  { id: 'r-little-boy-blue', title: 'Little boy blue', ref: 'No. DLXXXIX', level: 'A1', themes: ['farm', 'sleep'],
    text: `Little boy blue, come blow up your horn,
The sheep's in the meadow, the cow's in the corn;
Where's the little boy that looks after the sheep?
He's under the hay-cock fast asleep.
Will you wake him? No, not I;
For if I do, he'll be sure to cry.`,
    gloss: { meadow: { en: 'a field of grass', ru: 'луг', kz: 'шабындық' }, 'hay-cock': { en: 'a small pile of dried grass in a field', ru: 'копна сена', kz: 'шөп маясы' } },
    beats: [4, 4, 4, 4, 4, 4] },
  { id: 'r-jack-be-nimble', title: 'Jack be nimble', ref: 'No. CCC', level: 'A1', themes: ['games', 'movement'],
    text: `Jack be nimble,
  And Jack be quick:
And Jack jump over
  The candle-stick.`,
    gloss: { nimble: { en: 'quick and light in movement', ru: 'проворный', kz: 'епті, шапшаң' } }, beats: [2, 2, 2, 2] },
  { id: 'r-to-market', title: 'To market, to market', ref: 'No. CCCCXXXIII', level: 'A1', themes: ['food', 'animals', 'movement'],
    text: `To market, to market, to buy a fat pig,
  Home again, home again, dancing a jig;
Ride to the market to buy a fat hog,
  Home again, home again, jiggety-jog.`,
    gloss: { jig: { en: 'a lively folk dance', ru: 'джига (весёлый танец)', kz: 'жиг (көңілді би)' }, hog: { en: 'a pig', ru: 'боров, свинья', kz: 'шошқа' } }, beats: [4, 4, 4, 4] },
  { id: 'r-ride-cock-horse', title: 'Ride a cock-horse to Banbury-cross', ref: 'No. CCXCVIII', level: 'A1', themes: ['places', 'movement'],
    text: `Ride a cock-horse to Banbury-cross,
To buy little Johnny a galloping-horse;
It trots behind, and it ambles before,
And Johnny shall ride till he can ride no more.`,
    gloss: { 'cock-horse': { en: 'a toy horse, or a child’s knee used as a horse', ru: 'игрушечная лошадка', kz: 'ойыншық ат' }, ambles: { en: 'walks slowly and easily', ru: 'идёт иноходью, не спеша', kz: 'аяңдайды' } },
    note: 'Banbury is a real market town in Oxfordshire, England. A statue at Banbury Cross today celebrates the rhyme.', beats: [4, 4, 4, 4] },
  { id: 'r-tom-tom', title: "Tom, Tom, the piper's son", ref: 'No. LX', level: 'A2', themes: ['people', 'story'],
    text: `Tom, Tom, the piper's son,
Stole a pig, and away he run!
The pig was eat, and Tom was beat,
And Tom went roaring down the street.`,
    gloss: { piper: { en: 'a person who plays a pipe (musical instrument)', ru: 'дудочник', kz: 'сыбызғышы' } },
    note: 'Look at the verb forms: "away he run", "the pig was eat", "Tom was beat". These are older or dialect forms kept for the rhyme. Modern standard English: ran, eaten, beaten.', beats: [4, 4, 4, 4] },
  { id: 'r-old-king-cole', title: 'Old King Cole', ref: 'No. I', level: 'A2', themes: ['kings', 'music'],
    text: `Old King Cole
Was a merry old soul,
And a merry old soul was he;
He called for his pipe,
And he called for his bowl,
And he called for his fiddlers three.
Every fiddler, he had a fiddle,
And a very fine fiddle had he;
Twee tweedle dee, tweedle dee, went the fiddlers.
Oh, there's none so rare,
As can compare
With King Cole and his fiddlers three!`,
    gloss: { merry: { en: 'happy and cheerful', ru: 'весёлый', kz: 'көңілді' }, fiddler: { en: 'a violin player', ru: 'скрипач', kz: 'скрипкашы' } },
    note: 'Halliwell placed this rhyme first in his "Historical" class and connected it with a legendary British king. He called the legend "of doubtful antiquity" — so treat the history as a story, not a fact.', beats: [2, 2, 3, 2, 2, 3, 3, 3, 4, 2, 2, 3] },
  { id: 'r-bo-peep', title: 'Little Bo-peep', ref: 'No. CXLIII', level: 'A2', themes: ['animals', 'story'],
    text: `Little Bo-peep has lost her sheep,
  And can't tell where to find them;
Leave them alone, and they'll come home,
  And bring their tails behind them.

Little Bo-peep fell fast asleep,
  And dreamt she heard them bleating;
But when she awoke, she found it a joke,
  For they still were all fleeting.

Then up she took her little crook,
  Determin'd for to find them;
She found them indeed, but it made her heart bleed,
  For they'd left all their tails behind 'em.`,
    gloss: { bleating: { en: 'the sound sheep make', ru: 'блеяние', kz: 'маңырау' }, fleeting: { en: 'here: running away, gone', ru: 'здесь: убегающие, исчезнувшие', kz: 'мұнда: қашып кеткен' }, crook: { en: 'a shepherd’s stick with a hooked end', ru: 'пастуший посох', kz: 'шопан таяғы' } }, beats: [4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3] },
  { id: 'r-simple-simon', title: 'Simple Simon', ref: 'No. XLVI', level: 'A2', themes: ['food', 'dialogue', 'story'],
    text: `Simple Simon met a pieman
  Going to the fair;
Says Simple Simon to the pieman,
  "Let me taste your ware."

Says the pieman to Simple Simon,
  "Show me first your penny."
Says Simple Simon to the pieman,
  "Indeed I have not any."

Simple Simon went a fishing
  For to catch a whale:
All the water he had got
  Was in his mother's pail.`,
    gloss: { pieman: { en: 'a man who sells pies', ru: 'продавец пирогов', kz: 'бәліш сатушы' }, ware: { en: 'things for sale', ru: 'товар', kz: 'тауар' } },
    note: 'A dialogue rhyme: notice the inverted reporting verb "Says Simple Simon…", a pattern from storytelling.', beats: [4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3] },
  { id: 'r-sing-sixpence', title: 'Sing a song of sixpence', ref: 'No. CXXXVIII', level: 'A2', themes: ['food', 'kings', 'birds', 'story'],
    text: `Sing a song of sixpence,
  A bag full of rye;
Four and twenty blackbirds
  Baked in a pie;

When the pie was open'd,
  The birds began to sing;
Was not that a dainty dish,
  To set before the king?

The king was in his counting-house
  Counting out his money;
The queen was in the parlour
  Eating bread and honey;

The maid was in the garden
  Hanging out the clothes,
There came a little blackbird,
  And snapt off her nose.

Jenny was so mad,
  She didn't know what to do;
She put her finger in her ear,
  And crackt it right in two.`,
    gloss: { sixpence: { en: 'an old British coin worth six pennies', ru: 'шестипенсовик', kz: 'алты пенстік тиын' }, rye: { en: 'a grain, like wheat', ru: 'рожь', kz: 'қара бидай' }, dainty: { en: 'delicate and fine', ru: 'изысканный', kz: 'нәзік, сәнді' }, parlour: { en: 'a sitting room', ru: 'гостиная', kz: 'қонақ бөлме' } },
    note: 'Halliwell notes that the first line is quoted in a play by Beaumont and Fletcher, and mentions a 1589 recipe for a pie with live birds inside. "Four and twenty" is an older way to say twenty-four.',
    image: { file: 'Randolph Caldecott collection-page 0189.jpg', credit: 'Randolph Caldecott, cover of “Sing a Song for Sixpence”, from The Complete Collection of Pictures & Songs (1887), Library of Congress — public domain', crop: true }, beats: [3, 2, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] },
  { id: 'r-hark-hark', title: 'Hark, hark, the dogs do bark', ref: 'No. DCXXI', level: 'A2', themes: ['animals', 'town'],
    text: `    Hark, hark,
    The dogs do bark,
Beggars are coming to town;
    Some in jags,
    Some in rags,
And some in velvet gowns.`,
    gloss: { hark: { en: 'listen! (old word)', ru: 'чу! слушай! (устар.)', kz: 'тыңда! (көне)' }, jags: { en: 'torn pieces of cloth', ru: 'лохмотья', kz: 'жыртық киім' }, velvet: { en: 'a soft, expensive cloth', ru: 'бархат', kz: 'барқыт' } },
    note: 'Notice "the dogs do bark": an old use of "do" for rhythm, not for emphasis.', beats: [2, 2, 3, 2, 2, 3] },
  { id: 'r-hickory', title: 'Hickory, Dickory, Dock (counting-out rhyme)', ref: 'No. CCCXXIV', level: 'A1', themes: ['counting', 'games', 'animals'],
    text: `Hickory (1), Dickory (2), Dock (3),
The mouse ran up the clock (4),
The clock struck one (5),
The mouse was gone (6);
O (7), U (8), T (9), spells OUT!`,
    gloss: { struck: { en: 'past of "strike": the clock made the sound for one o’clock', ru: 'пробили (часы)', kz: 'соқты (сағат)' } },
    note: 'Halliwell printed the counting numbers inside the rhyme. His note says children stand in a circle and are counted one by one; the child on the last number is "out" for a game such as Hide or Seek.', beats: [3, 3, 2, 2, 4] }
];
RHYMES.forEach(r => { r.strand = 'rhymes'; r.author = 'traditional'; r.form = 'Nursery rhyme'; r.era = 'traditional'; r.origin = 'Traditional (England, as collected)'; r.src = 'halliwell'; r.rights = 'A'; r.rightsNote = 'Traditional text; the 1842 collection is in the public domain.'; });

/* ---------------- 2. SAY IT RIGHT: tongue twisters & limericks ---------------- */

const TWISTERS = [
  { id: 't-peter-piper', letter: 'P', sound: '/p/', title: 'Peter Piper', level: 'A2',
    text: `Peter Piper picked a peck of pickled Peppers:
Did Peter Piper pick a peck of pickled Peppers?
If Peter Piper picked a peck of pickled Peppers,
Where's the peck of pickled Peppers Peter Piper picked?`,
    gloss: { peck: { en: 'an old measure of dry goods (about 9 litres)', ru: 'старая мера сыпучих тел (~9 л)', kz: 'көне өлшем (~9 л)' }, pickled: { en: 'kept in vinegar or salt water', ru: 'маринованный', kz: 'маринадталған' } },
    focus: 'Aspirated /p/ at the start of stressed syllables: a small puff of air on Pe-, pi-, pe-, pe-.',
    pattern: 'Every entry in the 1836 book follows the same four-line pattern: statement → question → condition (If…) → Where-question. A free grammar drill!' },
  { id: 't-billy-button', letter: 'B', sound: '/b/', title: 'Billy Button', level: 'A2',
    text: `Billy Button bought a butter'd Biscuit:
Did Billy Button buy a butter'd Biscuit?
If Billy Button bought a butter'd Biscuit,
Where's the butter'd Biscuit Billy Button bought?`,
    gloss: {}, focus: 'Voiced /b/ (no puff of air) and the past form bought /bɔːt/ vs. buy /baɪ/.' },
  { id: 't-davy-dolldrum', letter: 'D', sound: '/d/', title: 'Davy Dolldrum', level: 'A2',
    text: `Davy Dolldrum dream'd he drove a Dragon:
Did Davy Dolldrum dream he drove a dragon?
If Davy Dolldrum dream'd he drove a dragon
Where's the dragon Davy Dolldrum dream'd he drove?`,
    gloss: {}, focus: 'The /dr/ cluster in dream, drove, dragon — tongue tip behind the teeth, then curl for /r/.' },
  { id: 't-francis-fribble', letter: 'F', sound: '/f/', title: 'Francis Fribble', level: 'B1',
    text: `Francis Fribble figured on a Frenchman's Filly:
Did Francis Fribble figure on a Frenchman's Filly?
If Francis Fribble figured on a Frenchman's Filly,
Where's the Frenchman's Filly Francis Fribble figured on?`,
    gloss: { filly: { en: 'a young female horse', ru: 'кобылка', kz: 'құнажын бие' }, 'figured': { en: 'here: showed off, made a fine show (old sense)', ru: 'здесь: красовался (устар.)', kz: 'мұнда: сән-салтанатпен көрінді (көне)' } },
    focus: 'Lip–teeth /f/ and the /fr/ cluster.' },
  { id: 't-gaffer-gilpin', letter: 'G', sound: '/g/', title: 'Gaffer Gilpin', level: 'A2',
    text: `Gaffer Gilpin got a Goose and Gander:
Did Gaffer Gilpin get a Goose and Gander?
If Gaffer Gilpin got a Goose and Gander,
Where's the Goose and Gander Gaffer Gilpin got?`,
    gloss: { gaffer: { en: 'an old word for an old man', ru: 'старик (устар.)', kz: 'қария (көне)' }, gander: { en: 'a male goose', ru: 'гусак', kz: 'еркек қаз' } },
    focus: 'Hard /g/ in every stressed syllable; get → got (irregular past).' },
  { id: 't-kimbo-kemble', letter: 'K', sound: '/k/', title: 'Kimbo Kemble', level: 'A2',
    text: `Kimbo Kemble kicked his Kinsman's Kettle:
Did Kimbo Kemble kick his Kinsman's Kettle?
If Kimbo Kemble kick'd his Kinsman's Kettle,
Where's the Kinsman's Kettle Kimbo Kemble kick'd?`,
    gloss: { kinsman: { en: 'a male relative', ru: 'родственник', kz: 'туыс' } },
    focus: 'The -ed ending after /k/ sounds like /t/: kicked = /kɪkt/. The book itself spells it two ways: "kicked" and "kick\'d".' },
  { id: 't-lanky-lawrence', letter: 'L', sound: '/l/', title: 'Lanky Lawrence', level: 'A2',
    text: `Lanky Lawrence lost his Lass and Lobster:
Did Lanky Lawrence lose his Lass and Lobster?
If Lanky Lawrence lost his Lass and Lobster,
Where are the Lass and Lobster Lanky Lawrence lost?`,
    gloss: { lanky: { en: 'tall and thin', ru: 'долговязый', kz: 'ұзын әрі арық' }, lass: { en: 'a girl (northern / Scottish English)', ru: 'девушка (сев. англ.)', kz: 'бойжеткен (солт. ағылш.)' } },
    focus: 'Clear /l/ at the start of words; lose /luːz/ → lost /lɒst/.' },
  { id: 't-rory-rumpus', letter: 'R', sound: '/r/', title: 'Rory Rumpus', level: 'B1',
    text: `Rory Rumpus rode a raw-bon'd Race-horse:
Did Rory Rumpus ride a raw-bon'd Race-horse?
If Rory Rumpus rode a raw-bon'd Race-horse,
Where's the raw-bon'd Race-horse Rory Rumpus rode?`,
    gloss: { "raw-bon'd": { en: 'very thin, so the bones show', ru: 'костлявый', kz: 'сүйегі шыққан, арық' } },
    focus: 'English /r/: the tongue does not touch the roof of the mouth (no trill). Practise ride → rode.' },
  { id: 't-walter-waddle', letter: 'W', sound: '/w/', title: 'Walter Waddle', level: 'A2',
    text: `Walter Waddle won a Walking Wager:
Did Walter Waddle win a Walking Wager?
If Walter Waddle won a Walking Wager,
Where's the Walking Wager Walter Waddle won?`,
    gloss: { wager: { en: 'a bet', ru: 'пари', kz: 'бәс' }, waddle: { en: 'to walk like a duck', ru: 'ходить вперевалку', kz: 'қаздаңдап жүру' } },
    focus: 'Rounded lips for /w/ — not /v/. Compare with the next twister.' },
  { id: 't-villiam-veedon', letter: 'V', sound: '/v/ ~ /w/', title: 'Villiam Veedon', level: 'B2',
    text: `Villiam Veedon vip'd his Vig and Vaistcoat:
Did Villiam Veedon vipe his Vig and Vaistcoat?
If Villiam Veedon vip'd his Vig and Vaistcoat,
Where are the Vig and Vaistcoat Villiam Veedon vip'd?`,
    gloss: {}, focus: 'A joke from 1836: every W is written as V (William Weedon wiped his Wig and Waistcoat). It mocks a v/w confusion in some speech of the time. Say it as written, then "correct" it to W — a perfect /v/–/w/ contrast drill.',
    note: 'Platform note: the "corrected" version is our explanation of the joke, not part of the original text.' },
  { id: 't-peter-piper-halliwell', letter: 'P', sound: '/p/', title: 'Peter Piper (Halliwell’s version)', level: 'A2', src: 'halliwell', ref: 'No. CCXLIV',
    text: `Peter Piper picked a peck of pickled pepper;
A peck of pickled pepper Peter Piper picked;
If Peter Piper picked a peck of pickled pepper,
Where's the peck of pickled pepper Peter Piper picked?`,
    gloss: {}, focus: 'Compare the two printed versions: line 2 is a statement here, a question in the 1836 book. Traditional texts vary — both are authentic.',
    note: 'Halliwell adds: "Sometimes \'off a pewter plate\' is added at the end of each line."' },
  { id: 't-oxford-ox', letter: '1–12', sound: 'alliteration', title: 'One old Oxford ox (counting twister)', level: 'B2', src: 'halliwell', ref: 'No. CCCXXV',
    text: `One old Oxford ox opening oysters;
Two tee-totums totally tired of trying to trot to Tadbury;
Three tall tigers tippling tenpenny tea;
Four fat friars fanning fainting flies;
Five frippy Frenchmen foolishly fishing for flies;
Six sportsmen shooting snipes;
Seven Severn salmons swallowing shrimps;
Eight Englishmen eagerly examining Europe;
Nine nimble noblemen nibbling nonpareils;
Ten tinkers tinkling upon ten tin tinderboxes with ten tenpenny tacks;
Eleven elephants elegantly equipt;
Twelve typographical topographers typically translating types.`,
    gloss: { 'tee-totums': { en: 'small spinning tops', ru: 'волчки', kz: 'зырылдауық' }, tippling: { en: 'drinking', ru: 'попивающие', kz: 'ішіп отырған' }, friars: { en: 'members of a religious order', ru: 'монахи', kz: 'монахтар' }, nonpareils: { en: 'small sweets', ru: 'драже', kz: 'кәмпит түрі' }, snipes: { en: 'a kind of bird', ru: 'бекасы', kz: 'шалшықшы құстар' } },
    focus: 'Each line practises one initial sound; the number word starts the alliteration. Line 12 is a real challenge: typographical topographers typically translating types.' }
];
TWISTERS.forEach(t => { t.strand = 'say'; t.author = 'traditional'; t.form = 'Tongue twister'; t.era = 'traditional'; t.origin = t.src === 'halliwell' ? 'Traditional (England, as collected)' : 'Anonymous (printed in Philadelphia, 1836)'; t.src = t.src || 'peterpiper'; t.ref = t.ref || ('Letter ' + t.letter); t.rights = 'A'; t.rightsNote = 'Anonymous 19th-century printed text; public domain.'; });

const LIM_AUDIO = {
  'l-beard': 'https://upload.wikimedia.org/wikipedia/commons/6/67/There_was_an_Old_Man_with_a_beard.ogg',
  'l-hill': 'https://upload.wikimedia.org/wikipedia/commons/3/3a/There_was_an_Old_Man_on_a_hill.ogg',
  'l-bonnet': 'https://upload.wikimedia.org/wikipedia/commons/f/f2/There_was_a_Young_Lady_whose_bonnet.ogg',
  'l-tree': 'https://upload.wikimedia.org/wikipedia/commons/e/e3/There_was_an_Old_Man_in_a_tree.ogg',
  'l-kilkenny': 'https://upload.wikimedia.org/wikipedia/commons/1/14/There_was_an_Old_Man_of_Kilkenny.ogg',
  'l-boat': 'https://upload.wikimedia.org/wikipedia/commons/a/ac/There_was_an_Old_Man_in_a_boat.ogg',
  'l-ischia': 'https://upload.wikimedia.org/wikipedia/commons/0/04/There_was_an_Old_Person_of_Ischia.ogg'
};
const LIMERICKS = [
  { id: 'l-beard', no: 1, title: 'There was an Old Man with a beard', level: 'A2',
    text: `There was an Old Man with a beard,
Who said, "It is just as I feared!--
Two Owls and a Hen,
Four Larks and a Wren,
Have all built their nests in my beard!"`,
    gloss: { wren: { en: 'a very small brown bird', ru: 'крапивник (птичка)', kz: 'шымшық тәрізді кішкентай құс' }, lark: { en: 'a singing bird', ru: 'жаворонок', kz: 'бозторғай' } } },
  { id: 'l-hill', no: 4, title: 'There was an Old Man on a hill', level: 'A2',
    text: `There was an Old Man on a hill,
Who seldom, if ever, stood still;
He ran up and down,
In his Grandmother's gown,
Which adorned that Old Man on a hill.`,
    gloss: { seldom: { en: 'rarely', ru: 'редко', kz: 'сирек' }, gown: { en: 'a long dress', ru: 'платье', kz: 'ұзын көйлек' }, adorned: { en: 'decorated', ru: 'украшал', kz: 'сәндеді' } } },
  { id: 'l-bonnet', no: 5, title: 'There was a Young Lady whose bonnet', level: 'B1',
    text: `There was a Young Lady whose bonnet,
Came untied when the birds sate upon it;
But she said, "I don't care!
All the birds in the air
Are welcome to sit on my bonnet!"`,
    gloss: { bonnet: { en: 'a hat tied under the chin', ru: 'капор', kz: 'капор (бас киім)' }, sate: { en: 'old past form of "sit" (= sat)', ru: 'устар. форма sat', kz: 'sat-тың көне түрі' } } },
  { id: 'l-tree', no: 10, title: 'There was an Old Man in a tree', level: 'B1',
    text: `There was an Old Man in a tree,
Who was horribly bored by a Bee;
When they said, "Does it buzz?"
He replied, "Yes, it does!
"It's a regular brute of a Bee!"`,
    gloss: { bored: { en: 'a pun: "made tired" and "drilled a hole into"', ru: 'игра слов: «надоел» и «просверлил»', kz: 'сөз ойыны: «жалықтырды» және «тесті»' }, brute: { en: 'a rough, unpleasant creature', ru: 'зверюга', kz: 'дөрекі мақұлық' } } },
  { id: 'l-kilkenny', no: 13, title: 'There was an Old Man of Kilkenny', level: 'A2',
    text: `There was an Old Man of Kilkenny,
Who never had more than a penny;
He spent all that money,
In onions and honey,
That wayward Old Man of Kilkenny.`,
    gloss: { wayward: { en: 'difficult to control; doing what he likes', ru: 'своенравный', kz: 'қыңыр' } }, note: 'Kilkenny is a town in Ireland.' },
  { id: 'l-boat', no: 15, title: 'There was an Old Man in a boat', level: 'A2',
    text: `There was an Old Man in a boat,
Who said, "I'm afloat! I'm afloat!"
When they said, "No! you ain't!"
He was ready to faint,
That unhappy Old Man in a boat.`,
    gloss: { afloat: { en: 'floating on water', ru: 'на плаву', kz: 'су бетінде' }, "ain't": { en: 'informal "are not / is not"', ru: 'разг. «не»', kz: 'ауызекі «емес»' } } },
  { id: 'l-ischia', no: 14, title: 'There was an Old Person of Ischia', level: 'B1',
    text: `There was an Old Person of Ischia,
Whose conduct grew friskier and friskier;
He danced hornpipes and jigs,
And ate thousands of figs,
That lively Old Person of Ischia.`,
    gloss: { conduct: { en: 'behaviour', ru: 'поведение', kz: 'мінез-құлық' }, friskier: { en: 'more playful and lively', ru: 'всё резвее', kz: 'ойнақылау' }, hornpipes: { en: 'a lively sailors’ dance', ru: 'хорнпайп (матросский танец)', kz: 'хорнпайп (теңізшілер биі)' } },
    note: 'Ischia is an Italian island. Lear rhymes it with "friskier" — part of the joke.' }
];
LIMERICKS.forEach(l => { l.strand = 'say'; l.author = 'lear'; l.form = 'Limerick'; l.era = 'victorian'; l.origin = 'England'; l.src = 'lear'; l.ref = 'No. ' + l.no; l.rights = 'A'; l.rightsNote = 'Author died 1888; public domain worldwide.'; l.audio = [CA(LIM_AUDIO[l.id], 'Neil Carmichael', 'CC BY-SA 4.0')]; l.scheme = 'AABBA'; });

/* ---------------- 3. WISE WORDS: proverbs (Preston) ---------------- */
// text = the entry exactly as printed (headword removed); meaning = platform-written learner explanation
const PROVERBS = [
  { no: 120, theme: 'Choices', text: 'A bird in the hand is worth two in the bush.', level: 'B1', meaning: { en: 'Something you already have is better than something better that you only might get.', ru: 'То, что уже есть, лучше того, что, может быть, получишь.', kz: 'Қолдағы бар нәрсе болуы мүмкін нәрседен артық.' }, use: 'You have a job offer now. A better one might come later. What would you say?' },
  { no: 123, theme: 'Friends & people', text: 'Birds of a feather flock together.', level: 'B1', meaning: { en: 'People with similar interests or character spend time together.', ru: 'Похожие люди держатся вместе.', kz: 'Мінезі ұқсас адамдар бірге жүреді.' }, use: 'Describe a group of friends you know with this proverb.' },
  { no: 642, theme: 'Friends & people', text: 'A friend in need is a friend indeed.', level: 'A2', meaning: { en: 'A real friend is the one who helps you when you have problems.', ru: 'Настоящий друг помогает в беде.', kz: 'Нағыз дос қиын кезде көмектеседі.' }, use: 'Tell a short story about someone who helped you.' },
  { no: 1684, theme: 'Friends & people', text: 'Two heads are better than one.', level: 'A2', meaning: { en: 'Two people thinking together solve problems better.', ru: 'Вдвоём думать лучше.', kz: 'Екі адам бірге ойласа, жақсырақ шешеді.' }, use: 'Ask a classmate for help using this proverb.' },
  { no: 1026, theme: 'Work', text: 'Many hands make light work.', level: 'A2', meaning: { en: 'When many people help, a job becomes easy.', ru: 'Когда помогают многие, работа лёгкая.', kz: 'Көп болып істесе, жұмыс жеңіл.' }, use: 'Invite friends to help you clean a room.' },
  { no: 1280, theme: 'Work', text: 'Practice makes perfect.', level: 'A1', meaning: { en: 'If you do something many times, you become very good at it.', ru: 'Если делать что-то много раз, станешь мастером.', kz: 'Көп жаттықсаң, шебер боласың.' }, use: 'Say it to a friend who is learning English.' },
  { no: 1369, theme: 'Time & patience', text: 'Rome was not built in a day.', level: 'A2', meaning: { en: 'Big things take time.', ru: 'Большие дела не делаются быстро.', kz: 'Үлкен іс бірден бітпейді.' }, use: 'What would you say to someone who is disappointed after one week of learning?' },
  { no: 920, theme: 'Time & patience', text: 'Better late than never.', level: 'A1', meaning: { en: 'It is better to do something late than not at all.', ru: 'Лучше сделать поздно, чем не сделать совсем.', kz: 'Ештеңе істемегеннен кеш істеген жақсы.' }, use: 'Your friend finally answered your message after a month.' },
  { no: 1622, theme: 'Time & patience', text: 'Time and tide tarry for no man.', level: 'B2', meaning: { en: 'Time does not wait for anyone; act now.', ru: 'Время никого не ждёт — действуй сейчас.', kz: 'Уақыт ешкімді күтпейді — қазір әрекет ет.' }, use: 'Notice the old verb "tarry" (= wait). The modern form of this proverb is usually "Time and tide wait for no man".' },
  { no: 762, theme: 'Time & patience', text: 'Make hay while the sun shines.', level: 'B1', meaning: { en: 'Use a good opportunity while you have it.', ru: 'Пользуйся удачным моментом.', kz: 'Сәтті сәтті пайдалан.' }, use: 'Farm life gave English many proverbs. Why would farmers need sun for hay?' },
  { no: 1548, theme: 'Time & patience', text: 'Strike while the iron is hot.', level: 'B1', meaning: { en: 'Act quickly when the moment is right.', ru: 'Действуй быстро, пока момент подходящий.', kz: 'Қолайлы сәт кетпей тұрғанда тез әрекет ет.' }, use: 'Which job does this image come from?' },
  { no: 465, theme: 'Time & patience', text: "'Tis the early bird catches the worm.", level: 'B1', meaning: { en: 'People who start early have an advantage.', ru: 'Кто начинает рано, получает преимущество.', kz: 'Ерте бастаған адам алға шығады.' }, use: "This is the older form ('Tis = it is). Today people usually say: The early bird catches the worm." },
  { no: 1532, theme: 'Time & patience', text: 'A stitch in time saves nine.', level: 'B2', meaning: { en: 'Fixing a small problem now prevents a bigger one later.', ru: 'Вовремя исправленная мелочь спасает от большой беды.', kz: 'Кішкене кемшілікті дер кезінде түзесең, үлкен қиындықтан құтыласың.' }, use: 'Stitch = one movement of a needle when sewing. Why "nine"? Discuss.' },
  { no: 989, theme: 'Caution', text: 'Look before you leap.', level: 'A2', meaning: { en: 'Think carefully before you act.', ru: 'Подумай, прежде чем действовать.', kz: 'Әрекет етпес бұрын ойлан.' }, use: 'Give advice to someone who wants to buy something very expensive today.' },
  { no: 237, theme: 'Caution', text: 'Count not your chickens before they are hatched.', level: 'B2', meaning: { en: 'Do not be sure of success before it happens.', ru: 'Не будь уверен в успехе, пока он не случился.', kz: 'Табыс келмей тұрып, оған сенімді болма.' }, use: 'Older word order: "Count not your…". Modern English: "Don\'t count your chickens…".' },
  { no: 172, theme: 'Caution', text: 'A burnt child dreads the fire.', level: 'B2', meaning: { en: 'After a bad experience, people are careful.', ru: 'После плохого опыта человек становится осторожным.', kz: 'Жаман тәжірибеден кейін адам сақ болады.' }, use: 'Dreads = is very afraid of.' },
  { no: 1530, theme: 'People & character', text: 'Still waters run deep.', level: 'B2', meaning: { en: 'Quiet people may have deep thoughts or feelings.', ru: 'Тихие люди могут иметь глубокие мысли и чувства.', kz: 'Үнсіз адамның ойы мен сезімі терең болуы мүмкін.' }, use: 'Describe a quiet person you admire.' },
  { no: 1367, theme: 'People & character', text: 'A rolling stone gathers no moss.', level: 'B2', meaning: { en: 'Someone who keeps moving does not collect possessions or ties (it can be good or bad).', ru: 'Кто постоянно в движении, не обрастает имуществом и связями.', kz: 'Бір орында тұрмаған адам мүлік те, байланыс та жинамайды.' }, use: 'Is this proverb positive or negative? Argue both sides.' },
  { no: 439, theme: 'People & character', text: 'Every dog has his day.', level: 'B1', meaning: { en: 'Everyone has a moment of success sometime.', ru: 'У каждого когда-нибудь бывает момент успеха.', kz: 'Әр адамның табысқа жететін сәті болады.' }, use: 'Encourage a friend who lost a game.' },
  { no: 271, theme: 'Hope', text: 'Every cloud hath a silver lining.', level: 'B1', meaning: { en: 'Something good can come from a bad situation.', ru: 'Из плохой ситуации может выйти что-то хорошее.', kz: 'Жаман жағдайдан да жақсы нәрсе шығуы мүмкін.' }, use: 'Notice "hath" — the old form of "has". Today: "Every cloud has a silver lining".' },
  { no: 1148, theme: 'Hope', text: 'No news is good news.', level: 'A2', meaning: { en: 'If you hear nothing, probably nothing bad has happened.', ru: 'Отсутствие новостей — хорошая новость.', kz: 'Ешқандай хабар болмаса, жаман ештеңе болмаған шығар.' }, use: 'Your parents are travelling and have not called. What do you say?' },
  { no: 1731, theme: 'Hope', text: "Where there's a will there's a way.", level: 'A2', meaning: { en: 'If you really want something, you will find a way to do it.', ru: 'Где есть желание, там есть и возможность.', kz: 'Ниет болса, жол табылады.' }, use: 'Talk about a goal you will reach.' },
  { no: 1136, theme: 'Work', text: 'Necessity is the mother of invention.', level: 'B2', meaning: { en: 'People create new things when they really need them.', ru: 'Люди изобретают новое, когда им это очень нужно.', kz: 'Адамдар қатты қажет болғанда жаңа нәрсе ойлап табады.' }, use: 'Give an example of an invention born from a need.' },
  { no: 1506, theme: 'Work', text: 'Too many cooks spoil the broth.', level: 'B1', meaning: { en: 'When too many people control one job, the result is bad.', ru: 'Когда работой руководят слишком многие, результат плохой.', kz: 'Бір істі тым көп адам басқарса, нәтиже нашар болады.' }, use: 'Compare with "Many hands make light work". Can both be true?' },
  { no: 1723, theme: 'Money', text: 'Waste not, want not.', level: 'B1', meaning: { en: 'If you do not waste things, you will not be in need.', ru: 'Не расточай — не будешь нуждаться.', kz: 'Ысырап етпесең, мұқтаж болмайсың.' }, use: 'Notice the very short, balanced form: two parallel halves.' },
  { no: 737, theme: 'Money', text: 'Half a loaf is better than no bread.', level: 'B1', meaning: { en: 'Having a little is better than having nothing.', ru: 'Немного лучше, чем ничего.', kz: 'Аз болса да, мүлдем жоқтан жақсы.' }, use: 'Use it about a small pay rise.' },
  { no: 25, theme: 'Hope', text: "All's well that ends well.", level: 'B1', meaning: { en: 'If the result is good, the problems on the way do not matter.', ru: 'Если итог хороший, трудности по пути не важны.', kz: 'Нәтиже жақсы болса, жолдағы қиындықтар маңызды емес.' }, use: 'This is also the title of a play by Shakespeare. Find it in the Shakespeare stage.' },
  { no: 1080, theme: 'Friends & people', text: 'Out of sight, out of mind.', level: 'A2', meaning: { en: 'We forget people or things we do not see.', ru: 'Мы забываем тех, кого не видим.', kz: 'Көрмеген адамды немесе затты ұмытамыз.' }, use: 'Is this true about friends who move away?' },
  { no: 793, theme: 'People & character', text: 'Honesty is the best policy; but he who acts on this principle is not an honest man.', level: 'C1', meaning: { en: 'The first half is the famous proverb. The second half is a sharp comment: if you are honest only because it pays, you are not really honest.', ru: 'Первая часть — известная пословица; вторая — едкое замечание: честный лишь из выгоды — не честен.', kz: 'Бірінші бөлігі — белгілі мақал; екіншісі — өткір ескерту: пайда үшін ғана адал болған адам шын адал емес.' }, use: 'Preston prints the proverb with this ironic addition. Do you agree with it?' },
  { no: 1547, theme: 'Money', text: 'Haste makes waste, and waste makes want, and want makes strife between the good man and his wife.', level: 'C1', meaning: { en: 'A chain: hurrying causes waste, waste causes poverty, poverty causes quarrels at home.', ru: 'Цепочка: спешка → расточительство → нужда → ссоры в семье.', kz: 'Тізбек: асығыстық → ысырап → мұқтаждық → отбасындағы ұрыс.' }, use: 'Most people know only the first three words. Notice how each clause starts with the last word of the one before.' }
];
// Russian/Kazakh lines in "meaning" are plain explanations written by the platform team (not proverb equivalents, not translations of the source).
PROVERBS.forEach(p => { p.id = 'p-' + p.no; p.strand = 'wise'; p.author = 'traditional'; p.form = 'Proverb'; p.era = 'traditional'; p.origin = 'Traditional (English)'; p.src = 'preston'; p.ref = 'Entry ' + p.no; p.title = p.text; p.rights = 'A'; p.rightsNote = 'Proverbs are traditional; the printed dictionary is in the public domain. Meanings are platform-written.'; });

/* ---------------- 4. POEMS ALOUD ---------------- */

const POEMS = [
  /* ---- Stevenson ---- */
  { id: 'po-bed-in-summer', title: 'Bed in Summer', author: 'stevenson', src: 'stevenson', ref: 'A Child’s Garden of Verses', year: '1885', level: 'A2', era: 'victorian', origin: 'Scotland', themes: ['childhood', 'seasons', 'time'],
    text: `In winter I get up at night,
And dress by yellow candle light.
In summer quite the other way,
I have to go to bed by day.

I have to go to bed and see
The birds still hopping on the tree,
Or hear the grown-up people's feet,
Still going past me in the street.

And does it not seem hard to you,
When all the sky is clear and blue,
And I should like so much to play,
To have to go to bed by day?`,
    scheme: 'AABB CCDD EEFF', gloss: { 'quite the other way': { en: 'exactly the opposite', ru: 'совсем наоборот', kz: 'мүлде керісінше' } },
    context: 'In Scotland, summer days are very long and winter days very short. The child’s complaint is real: in June the sun is still up at bedtime.',
    
    reflect: 'Was bedtime a problem for you as a child? Answer in two sentences, using "I had to…".' },
  { id: 'po-rain', title: 'Rain', author: 'stevenson', src: 'stevenson', ref: 'A Child’s Garden of Verses', year: '1885', level: 'A1', era: 'victorian', origin: 'Scotland', themes: ['weather', 'nature'],
    text: `The rain is raining all around.
  It falls on field and tree,
It rains on the umbrellas here,
  And on the ships at sea.`,
    scheme: 'ABCB', gloss: {}, context: 'A four-line poem built on one verb: rain is raining, it falls, it rains. Notice how the view moves from here to far away (the sea).',
    reflect: 'Write one sentence in the same pattern: "It ___ on the ___ here, / And on the ___ ___."' },
  { id: 'po-happy-thought', title: 'Happy Thought', author: 'stevenson', src: 'stevenson', ref: 'A Child’s Garden of Verses', year: '1885', level: 'A2', era: 'victorian', origin: 'Scotland', themes: ['happiness'],
    text: `The world is so full of a number of things,
I'm sure we should all be as happy as kings`,
    scheme: 'AA', gloss: { 'a number of': { en: 'many', ru: 'множество', kz: 'көптеген' } },
    context: 'A two-line poem (a couplet). The printed source has no full stop at the end — we keep it exactly as printed.',
    reflect: 'Name three "things" in the world that make you happy.' },
  { id: 'po-my-shadow', title: 'My Shadow', author: 'stevenson', src: 'stevenson', ref: 'A Child’s Garden of Verses', year: '1885', level: 'A2', era: 'victorian', origin: 'Scotland', themes: ['childhood', 'humour'],
    text: `I have a little shadow that goes in and out with me,
And what can be the use of him is more than I can see.
He is very, very like me, from the heels up to the head;
And I see him jump before me, when I jump into my bed.

The funniest thing about him is the way he likes to grow--
Not at all like proper children, which is always very slow;
For he sometimes shoots up taller, like an india-rubber ball,
And he sometimes gets so little that there's none of him at all.

He hasn't got a notion of how children ought to play,
And can only make a fool of me in every sort of way.
He stays so close beside me, he's a coward you can see;
I'd think shame to stick to nursie as that shadow sticks to me!

One morning, very early, before the sun was up,
I 'rose and found the shining dew on every buttercup;
But my lazy little shadow, like an arrant sleepy head,
Had stayed at home behind me and was fast asleep in bed.`,
    scheme: 'AABB CCDD EEFF GGHH', gloss: { notion: { en: 'idea', ru: 'понятие', kz: 'түсінік' }, nursie: { en: 'a child’s word for a nanny', ru: 'нянюшка', kz: 'күтуші апай' }, arrant: { en: 'complete, total', ru: 'отъявленный', kz: 'нағыз' }, 'india-rubber': { en: 'natural rubber', ru: 'каучук', kz: 'каучук' } },
    context: 'The child treats the shadow as a person ("him"): this is personification. The joke of the last stanza: in the early morning, before sunrise, there is no shadow.',
    
    devices: ['personification', 'simile'], reflect: 'Find the simile (like…) in stanza 2. What does it tell you about the shadow?' },
  { id: 'po-swing', title: 'The Swing', author: 'stevenson', src: 'stevenson', ref: 'A Child’s Garden of Verses', year: '1885', level: 'A2', era: 'victorian', origin: 'Scotland', themes: ['childhood', 'movement'],
    text: `How do you like to go up in a swing,
  Up in the air so blue?
Oh, I do think it the pleasantest thing
  Ever a child can do!

Up in the air and over the wall,
  Till I can see so wide,
Rivers and trees and cattle and all
  Over the countryside--

Till I look down on the garden green,
  Down on the roof so brown--
Up in the air I go flying again,
  Up in the air and down!`,
    scheme: 'ABAB CDCD EFEF', gloss: { cattle: { en: 'cows', ru: 'скот', kz: 'ірі қара мал' } },
    context: 'Listen for the rhythm: the long and short lines move up and down like the swing itself.', reflect: 'Read the poem aloud and move your hand up and down on the stressed syllables.' },
  { id: 'po-windy-nights', scheme: 'ABABCCDEDEFF', title: 'Windy Nights', author: 'stevenson', src: 'stevenson', ref: 'A Child’s Garden of Verses', year: '1885', level: 'B1', era: 'victorian', origin: 'Scotland', themes: ['night', 'weather', 'mystery'],
    text: `Whenever the moon and stars are set,
  Whenever the wind is high,
All night long in the dark and wet,
  A man goes riding by.
Late in the night when the fires are out,
Why does he gallop and gallop about?
Whenever the trees are crying aloud,
  And ships are tossed at sea,
By, on the highway, low and loud,
  By at the gallop goes he.
By at the gallop he goes, and then
By he comes back at the gallop again.`,
    gloss: { gallop: { en: 'to ride a horse very fast', ru: 'скакать галопом', kz: 'шауып бару' }, tossed: { en: 'thrown up and down', ru: 'бросаемы (волнами)', kz: 'толқынмен лақтырылған' } },
    context: 'The rhythm of the poem imitates a galloping horse (da-da-DUM da-da-DUM). Is the rider real, or is it the sound of the wind?',
    devices: ['repetition', 'personification', 'rhythm echoing sense (galloping)'], reflect: 'Who is the rider? Give your interpretation in two sentences.' },
  { id: 'po-where-go-boats', title: 'Where Go the Boats?', author: 'stevenson', src: 'stevenson', ref: 'A Child’s Garden of Verses', year: '1885', level: 'A2', era: 'victorian', origin: 'Scotland', themes: ['nature', 'childhood', 'journeys'],
    text: `Dark brown is the river,
    Golden is the sand.
It flows along for ever,
    With trees on either hand.

Green leaves a-floating,
    Castles of the foam,
Boats of mine a-boating--
    Where will all come home?

On goes the river
    And out past the mill,
Away down the valley,
    Away down the hill.

Away down the river,
    A hundred miles or more,
Other little children
    Shall bring my boats ashore.`,
    scheme: 'ABAB CDCD EFGF HIJI', gloss: { foam: { en: 'small white bubbles on water', ru: 'пена', kz: 'көбік' }, ashore: { en: 'onto the land', ru: 'на берег', kz: 'жағаға' }, 'a-floating': { en: 'old form: floating', ru: 'плывущие (устар. форма)', kz: 'жүзіп жүрген (көне)' } },
    context: 'Notice the inverted word order in line 1: "Dark brown is the river" instead of "The river is dark brown". Poets move words to put the important word first.',
    devices: ['inversion', 'imagery'], reflect: 'Rewrite line 1 and line 2 in normal word order. Which version sounds more like a poem? Why?' },
  { id: 'po-railway', title: 'From a Railway Carriage', author: 'stevenson', src: 'stevenson', ref: 'A Child’s Garden of Verses', year: '1885', level: 'B1', era: 'victorian', origin: 'Scotland', themes: ['journeys', 'speed', 'modern life'],
    text: `Faster than fairies, faster than witches,
Bridges and houses, hedges and ditches;
And charging along like troops in a battle,
All through the meadows the horses and cattle:
All of the sights of the hill and the plain
Fly as thick as driving rain;
And ever again in the wink of an eye,
Painted stations whistle by.

Here is a child who clambers and scrambles,
All by himself and gathering brambles;
Here is a tramp who stands and gazes;
And there is the green for stringing the daisies!
Here is a cart run away in the road
Lumping along with man and load;
And here is a mill and there is a river,
Each a glimpse and gone forever!`,
    scheme: 'AABBCCDD EEFFGGHH', gloss: { ditches: { en: 'long narrow holes beside a road or field', ru: 'канавы', kz: 'арықтар' }, clambers: { en: 'climbs with difficulty', ru: 'карабкается', kz: 'өрмелейді' }, brambles: { en: 'blackberry bushes', ru: 'ежевика (кусты)', kz: 'бүлдірген бұталары' }, glimpse: { en: 'a very quick look', ru: 'мимолётный взгляд', kz: 'көз қиығы' } },
    context: 'Railways were still a thrilling new technology in the 19th century. Read it quickly: the rhythm sounds like wheels on the rails.', devices: ['simile', 'rhythm', 'alliteration'],
    reflect: 'Write two lines about what you see from a car, bus or train window, in the same "Here is… / there is…" pattern.' },

  /* ---- Dickinson ---- */
  { id: 'po-hope', title: 'Hope', author: 'dickinson', src: 'dickinson', ref: 'No. VI, "HOPE." (title added by the editors; first printed in Poems, Second Series, 1891)', year: 'first printed 1891', level: 'B1', era: 'american19', origin: 'USA', themes: ['hope', 'nature', 'feelings'],
    text: `Hope is the thing with feathers
That perches in the soul,
And sings the tune without the words,
And never stops at all,

And sweetest in the gale is heard;
And sore must be the storm
That could abash the little bird
That kept so many warm.

I 've heard it in the chillest land,
And on the strangest sea;
Yet, never, in extremity,
It asked a crumb of me.`,
    scheme: 'ABCB DEDE FGHG (approx.)', gloss: { perches: { en: 'sits (like a bird on a branch)', ru: 'сидит на насесте', kz: 'қонып отырады' }, gale: { en: 'a very strong wind', ru: 'шторм', kz: 'дауыл' }, abash: { en: 'to make ashamed or silent', ru: 'смутить, заставить замолчать', kz: 'ұялту, үнсіз қалдыру' }, extremity: { en: 'the most difficult situation', ru: 'крайняя нужда', kz: 'ең қиын жағдай' }, crumb: { en: 'a very small piece of bread', ru: 'крошка', kz: 'үгінді' } },
    context: 'An extended metaphor: hope = a small bird living inside us. Dickinson did not title the poem; "Hope" was added by her 1890s editors. The space in "I \'ve" is in the printed source.',
    image: { file: 'Black-white photograph of Emily Dickinson2.png', credit: 'Emily Dickinson, daguerreotype, c. 1847, Amherst College Archives & Special Collections — public domain' }, doc: { file: 'Hope is the thing with feathers, 1891.jpg', credit: 'The poem as first printed, Poems, Second Series (1891)' },
    devices: ['extended metaphor'], reflect: 'If hope is a bird, what is fear? Write one line: "Fear is the thing with…".' },
  { id: 'po-a-word', title: 'A Word', author: 'dickinson', src: 'dickinson', ref: 'Poems, Third Series (1896), No. VI ("A WORD.")', year: 'first printed 1896', level: 'A2', era: 'american19', origin: 'USA', themes: ['language', 'words'],
    text: `A word is dead
When it is said,
  Some say.
I say it just
Begins to live
  That day.`,
    gloss: {}, context: 'Six very short lines — and a perfect poem for language learners. The poem argues with a common opinion ("Some say… I say…").',
    reflect: 'Which English word "began to live" for you when you first used it?' },
  { id: 'po-moor', title: 'I never saw a moor', author: 'dickinson', src: 'dickinson', ref: 'Poems, First Series (1890), No. XVII (untitled)', year: 'first printed 1890', level: 'B1', era: 'american19', origin: 'USA', themes: ['faith', 'imagination'],
    text: `I never saw a moor,
I never saw the sea;
Yet know I how the heather looks,
And what a wave must be.

I never spoke with God,
Nor visited in heaven;
Yet certain am I of the spot
As if the chart were given.`,
    gloss: { moor: { en: 'wild open land with low plants', ru: 'вересковая пустошь', kz: 'шымды дала' }, heather: { en: 'a small purple-flowered plant of the moors', ru: 'вереск', kz: 'шығыршық (күлгін гүлді бұта)' }, chart: { en: 'a map', ru: 'карта', kz: 'карта' } },
    context: 'Notice the inversions "Yet know I…" and "Yet certain am I…" — older, poetic word order for "Yet I know…", "Yet I am certain…".', devices: ['inversion', 'parallelism'],
    reflect: 'Write two lines: "I never saw ___, / Yet know I ___."' },
  { id: 'po-chariot', title: 'The Chariot ("Because I could not stop for Death")', author: 'dickinson', src: 'dickinson', ref: 'Poems, First Series (1890), No. XXVII ("THE CHARIOT.")', year: 'first printed 1890', level: 'C1', era: 'american19', origin: 'USA', themes: ['death', 'time', 'journeys'],
    text: `Because I could not stop for Death,
He kindly stopped for me;
The carriage held but just ourselves
And Immortality.

We slowly drove, he knew no haste,
And I had put away
My labor, and my leisure too,
For his civility.

We passed the school where children played,
Their lessons scarcely done;
We passed the fields of gazing grain,
We passed the setting sun.

We paused before a house that seemed
A swelling of the ground;
The roof was scarcely visible,
The cornice but a mound.

Since then 't is centuries; but each
Feels shorter than the day
I first surmised the horses' heads
Were toward eternity.`,
    gloss: { civility: { en: 'politeness', ru: 'учтивость', kz: 'сыпайылық' }, cornice: { en: 'decorative edge at the top of a building', ru: 'карниз', kz: 'карниз' }, surmised: { en: 'guessed', ru: 'догадалась', kz: 'болжады' } },
    context: 'Death is personified as a polite gentleman driving a carriage. The three "We passed…" lines move through childhood, maturity (grain) and the end of life (setting sun). The "house" is a grave. This 1890s text was titled "The Chariot" by its editors.',
    devices: ['personification', 'symbol', 'anaphora'], reflect: 'Why is Death "kind" in this poem? Do you agree with the speaker’s calm?' },

  /* ---- Oxford Book of English Verse poems ---- */
  { id: 'po-daffodils', title: 'Daffodils ("I wander’d lonely as a cloud")', author: 'wordsworth', src: 'obev', ref: 'OBEV No. 530', year: 'written 1804; published 1807 (revised 1815)', level: 'B1', era: 'romantic', origin: 'England', themes: ['nature', 'memory', 'happiness'],
    text: `I wander’d lonely as a cloud
  That floats on high o’er vales and hills,
When all at once I saw a crowd,
  A host, of golden daffodils;
Beside the lake, beneath the trees,
Fluttering and dancing in the breeze.

Continuous as the stars that shine
  And twinkle on the Milky Way,
They stretch’d in never-ending line
  Along the margin of a bay:
Ten thousand saw I at a glance,
Tossing their heads in sprightly dance.

The waves beside them danced, but they
  Out-did the sparkling waves in glee:
A poet could not but be gay,
  In such a jocund company:
I gazed--and gazed--but little thought
What wealth the show to me had brought:

For oft, when on my couch I lie
  In vacant or in pensive mood,
They flash upon that inward eye
  Which is the bliss of solitude;
And then my heart with pleasure fills,
And dances with the daffodils.`,
    scheme: 'ABABCC ×4', gloss: { "o’er": { en: 'over', ru: 'над', kz: 'үстінде' }, vales: { en: 'valleys', ru: 'долины', kz: 'аңғарлар' }, host: { en: 'a very large number', ru: 'множество', kz: 'көп топ' }, sprightly: { en: 'lively', ru: 'живой, бодрый', kz: 'сергек' }, glee: { en: 'joy', ru: 'ликование', kz: 'шаттық' }, gay: { en: 'here: happy, cheerful (19th-century meaning)', ru: 'здесь: весёлый (значение XIX в.)', kz: 'мұнда: көңілді (XIX ғ. мағынасы)' }, jocund: { en: 'cheerful', ru: 'весёлый', kz: 'көңілді' }, pensive: { en: 'thoughtful', ru: 'задумчивый', kz: 'ойлы' }, solitude: { en: 'being alone (peacefully)', ru: 'уединение', kz: 'жалғыздық (тыныш)' } },
    context: 'Wordsworth and his sister Dorothy saw a long belt of daffodils beside Ullswater, a lake in England’s Lake District, in April 1802; Dorothy described it in her journal. The final stanza is about memory: the "inward eye" is the imagination.',
    image: { file: 'John Glover - Ullswater, early morning - Google Art Project.jpg', credit: 'John Glover, Ullswater, Early Morning (c. 1824), Art Gallery of New South Wales — public domain' },
    devices: ['simile', 'personification', 'hyperbole'], reflect: 'Describe a place you remember "with your inward eye". Use two sense words (see, hear, smell…).',
    contextVerify: 'Dates & Ullswater/Dorothy journal: standard reference facts — confirm against the Wordsworth Trust before publishing.' },
  { id: 'po-westminster', title: 'Upon Westminster Bridge', author: 'wordsworth', src: 'obev', ref: 'OBEV No. 520', year: 'dated 3 September 1802', level: 'C1', era: 'romantic', origin: 'England', themes: ['city', 'morning', 'beauty'],
    text: `Earth has not anything to show more fair:
  Dull would he be of soul who could pass by
  A sight so touching in its majesty:
This City now doth like a garment wear
The beauty of the morning; silent, bare,
  Ships, towers, domes, theatres, and temples lie
  Open unto the fields, and to the sky;
All bright and glittering in the smokeless air.
Never did sun more beautifully steep
  In his first splendour valley, rock, or hill;
Ne’er saw I, never felt, a calm so deep!
  The river glideth at his own sweet will:
Dear God! the very houses seem asleep;
  And all that mighty heart is lying still!`,
    scheme: 'ABBAABBA CDCDCD (Petrarchan sonnet)', gloss: { fair: { en: 'beautiful', ru: 'прекрасный', kz: 'әсем' }, doth: { en: 'old form of "does"', ru: 'устар. «does»', kz: 'көне: does' }, steep: { en: 'here: to soak, fill completely', ru: 'здесь: пропитать', kz: 'мұнда: сіңдіру' }, glideth: { en: 'old form of "glides"', ru: 'устар. «скользит»', kz: 'көне: сырғиды' } },
    context: 'A sonnet about London seen at dawn from Westminster Bridge, before the city wakes. The poet who loved nature finds the city as beautiful as a valley. The "mighty heart" is London itself.',
    image: { file: "Canaletto - Westminster Bridge, with the Lord Mayor's Procession on the Thames - Google Art Project.jpg", credit: 'Canaletto, Westminster Bridge, with the Lord Mayor’s Procession on the Thames (1747), Yale Center for British Art — public domain' },
    devices: ['personification', 'simile', 'sonnet form'], reflect: 'Describe your own city early in the morning, before everyone wakes up.' },
  { id: 'po-rainbow', scheme: 'ABCCABCDD', title: 'The Rainbow ("My heart leaps up")', author: 'wordsworth', src: 'obev', ref: 'OBEV No. 532', year: '1802', level: 'B1', era: 'romantic', origin: 'England', themes: ['nature', 'childhood', 'time'],
    text: `My heart leaps up when I behold
A rainbow in the sky:
So was it when my life began;
So is it now I am a man;
So be it when I shall grow old,
        Or let me die!
The Child is father of the Man;
And I could wish my days to be
Bound each to each by natural piety.`,
    gloss: { behold: { en: 'see (old, poetic)', ru: 'узреть', kz: 'көру (көне)' }, piety: { en: 'deep respect, devotion', ru: 'благоговение', kz: 'құрмет, ықылас' } },
    image: { file: 'Constable Salisbury meadows.jpg', credit: 'John Constable, Salisbury Cathedral from the Meadows (1831), Tate — public domain' },
    context: 'Three ages in three lines: began / now / old. "The Child is father of the Man" is a paradox: the person we are as children shapes the adult we become.',
    devices: ['paradox', 'parallelism'], reflect: 'What made you happy as a child that still makes you happy now?' },
  { id: 'po-tiger', title: 'The Tiger', author: 'blake', src: 'obev', ref: 'OBEV No. 489', year: 'Songs of Experience, 1794', level: 'B2', era: 'romantic', origin: 'England', themes: ['nature', 'creation', 'questions'],
    text: `Tiger, tiger, burning bright
In the forests of the night,
What immortal hand or eye
Could frame thy fearful symmetry?


In what distant deeps or skies
Burnt the fire of thine eyes?
On what wings dare he aspire?
What the hand dare seize the fire?

And what shoulder and what art
Could twist the sinews of thy heart?
And, when thy heart began to beat,
What dread hand and what dread feet?

What the hammer? What the chain?
In what furnace was thy brain?
What the anvil? What dread grasp
Dare its deadly terrors clasp?

When the stars threw down their spears,
And watered heaven with their tears,
Did He smile His work to see?
Did He who made the lamb make thee?

Tiger, tiger, burning bright
In the forests of the night,
What immortal hand or eye
Dare frame thy fearful symmetry?`,
    scheme: 'AABB ×6', gloss: { thy: { en: 'your (old)', ru: 'твой (устар.)', kz: 'сенің (көне)' }, thine: { en: 'your (old, before a vowel)', ru: 'твой (устар.)', kz: 'сенің (көне)' }, symmetry: { en: 'balance of form', ru: 'симметрия', kz: 'симметрия' }, sinews: { en: 'tendons, strong body tissue', ru: 'сухожилия', kz: 'сіңірлер' }, anvil: { en: 'a heavy iron block used by a blacksmith', ru: 'наковальня', kz: 'төс (ұстаның)' } },
    context: 'Blake engraved and coloured this poem himself; on his plate the title is spelled "The Tyger". The Oxford Book of 1900 modernised the spelling to "Tiger". The poem is almost entirely questions. Notice that the last stanza repeats the first — except one word: "Could" becomes "Dare".',
    image: { file: 'Songs of Innocence and of Experience copy R object 44 The Tyger.jpg', credit: 'William Blake’s own relief-etched and hand-coloured plate of “The Tyger”, Songs of Innocence and of Experience, copy R — public domain', plate: true },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/7/79/TygerTyger.ogg', 'Neil Carmichael', 'CC BY-SA 4.0')],
    devices: ['rhetorical question', 'alliteration', 'metaphor (blacksmith)', 'repetition with variation'], reflect: 'Find the one word that changes between the first and last stanza. Why does it matter?' },
  { id: 'po-red-rose', title: 'A Red, Red Rose', author: 'burns', src: 'obev', ref: 'OBEV No. 503', year: '1794', level: 'B2', era: 'romantic', origin: 'Scotland', themes: ['love', 'time'], variety: 'Scots',
    text: `O my Luve’s like a red, red rose
That’s newly sprung in June:
O my Luve’s like the melodie
That’s sweetly play’d in tune!

As fair art thou, my bonnie lass,
So deep in luve am I:
And I will luve thee still, my dear,
Till a’ the seas gang dry:

Till a’ the seas gang dry, my dear,
And the rocks melt wi’ the sun;
I will luve thee still, my dear,
While the sands o’ life shall run.

And fare thee weel, my only Luve,
And fare thee weel a while!
And I will come again, my Luve,
Tho’ it were ten thousand mile.`,
    scheme: 'ABCB ×4', gloss: { luve: { en: 'Scots spelling of "love"', ru: 'шотл. «любовь»', kz: 'шотл. «махаббат»' }, bonnie: { en: 'Scots: pretty', ru: 'шотл. «красивая»', kz: 'шотл. «сүйкімді»' }, lass: { en: 'girl', ru: 'девушка', kz: 'қыз' }, "a’": { en: 'Scots: all', ru: 'шотл. «все»', kz: 'шотл. «бәрі»' }, gang: { en: 'Scots: go', ru: 'шотл. «идти»', kz: 'шотл. «бару»' }, weel: { en: 'Scots: well', ru: 'шотл. «хорошо»', kz: 'шотл. «жақсы»' } },
    context: 'Language-variety note: this poem is in Scots-flavoured English. Spellings like "luve", "a’", "gang", "weel" are Scots, not mistakes — do not copy them into modern standard English. Burns built the song from older traditional material.',
    image: { file: 'Alexander Nasmyth - Robert Burns, 1759 - 1796. Poet - Google Art Project.jpg', credit: 'Alexander Nasmyth, Robert Burns (1787), Scottish National Portrait Gallery — public domain' },
    devices: ['simile', 'hyperbole', 'repetition'], reflect: 'Find the two similes in stanza 1. Write your own: "My ___ is like a ___".', contextVerify: 'Date 1794 and "older traditional material": confirm with the Burns Encyclopedia / National Library of Scotland.' },
  { id: 'po-she-walks', title: 'She walks in Beauty', author: 'byron', src: 'obev', ref: 'OBEV No. 600', year: 'Hebrew Melodies, 1815', level: 'B2', era: 'romantic', origin: 'England', themes: ['beauty', 'night', 'light'],
    text: `She walks in beauty, like the night
  Of cloudless climes and starry skies;
And all that’s best of dark and bright
  Meet in her aspect and her eyes:
Thus mellow’d to that tender light
  Which heaven to gaudy day denies.

One shade the more, one ray the less,
  Had half impair’d the nameless grace
Which waves in every raven tress,
  Or softly lightens o’er her face;
Where thoughts serenely sweet express
  How pure, how dear their dwelling-place.

And on that cheek, and o’er that brow,
  So soft, so calm, yet eloquent,
The smiles that win, the tints that glow,
  But tell of days in goodness spent,
A mind at peace with all below,
  A heart whose love is innocent!`,
    scheme: 'ABABAB ×3', gloss: { climes: { en: 'climates, regions', ru: 'края, климаты', kz: 'өлкелер' }, aspect: { en: 'appearance, face', ru: 'облик', kz: 'кейіп' }, gaudy: { en: 'too bright', ru: 'кричаще-яркий', kz: 'тым ашық-жарқын' }, impair: { en: 'damage', ru: 'испортить', kz: 'бүлдіру' }, tress: { en: 'a long lock of hair', ru: 'локон', kz: 'бұрым' }, raven: { en: 'shiny black (like a raven bird)', ru: 'иссиня-чёрный', kz: 'қарғадай қара' } },
    context: 'Contrast is the key: dark and bright, shade and ray. The beauty described is balanced — and in the last stanza it becomes moral beauty (goodness, peace, innocence).',
    image: { file: 'George Gordon Byron, 6th Baron Byron by Richard Westall (2).jpg', credit: 'Richard Westall, Lord Byron (1813), National Portrait Gallery, London — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/a/af/Byron_-_She_walks_in_beauty.ogg', 'Ijon', 'CC0'), CA('https://upload.wikimedia.org/wikipedia/commons/c/cb/She_walks_in_beauty.ogg', 'Celestianpower', 'Public domain')],
    devices: ['simile', 'antithesis'], reflect: 'List the light words and the dark words in stanza 1.' },
  { id: 'po-virgins', title: 'To the Virgins, to make much of Time', author: 'herrick', src: 'obev', ref: 'OBEV No. 248', year: 'Hesperides, 1648', level: 'B2', era: 'seventeenth', origin: 'England', themes: ['time', 'youth', 'love'],
    text: `Gather ye rosebuds while ye may,
  Old Time is still a-flying:
And this same flower that smiles to-day
  To-morrow will be dying.

The glorious lamp of heaven, the sun,
  The higher he’s a-getting,
The sooner will his race be run,
  And nearer he’s to setting.


That age is best which is the first,
  When youth and blood are warmer;
But being spent, the worse, and worst
  Times still succeed the former.

Then be not coy, but use your time,
  And while ye may, go marry:
For having lost but once your prime,
  You may for ever tarry.`,
    scheme: 'ABAB ×4', gloss: { ye: { en: 'you (plural, old)', ru: 'вы (устар.)', kz: 'сендер (көне)' }, coy: { en: 'shy, holding back', ru: 'застенчивый, жеманный', kz: 'ұялшақ' }, prime: { en: 'the best period of life', ru: 'расцвет', kz: 'кемел шақ' }, tarry: { en: 'wait, delay', ru: 'медлить', kz: 'кешігу' } },
    context: 'A famous example of the "carpe diem" (seize the day) theme. "The glorious lamp of heaven" is a metaphor (a kenning-like phrase) for the sun. The first line is one of the most quoted lines in English poetry.',
    image: { file: 'Waterhouse-gather ye rosebuds-1909.jpg', credit: 'J. W. Waterhouse, Gather Ye Rosebuds While Ye May (1909) — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/2/29/To_the_Virgins%2C_To_Make_Much_of_Time.ogg', 'Dhruv Patole', 'CC0')],
    devices: ['metaphor', 'personification', 'carpe diem'], reflect: 'Is this advice still good today? Agree or disagree in three sentences.' },
  { id: 'po-uphill', title: 'Uphill', author: 'rossetti', src: 'obev', ref: 'OBEV No. 783', year: 'Goblin Market and Other Poems, 1862 (as "Up-Hill")', level: 'B1', era: 'victorian', origin: 'England', themes: ['life', 'journeys', 'dialogue'],
    text: `Does the road wind uphill all the way?
  Yes, to the very end.
Will the day’s journey take the whole long day?
  From morn to night, my friend.

But is there for the night a resting-place?
  A roof for when the slow, dark hours begin.
May not the darkness hide it from my face?
  You cannot miss that inn.

Shall I meet other wayfarers at night?
  Those who have gone before.
Then must I knock, or call when just in sight?
  They will not keep you waiting at that door.

Shall I find comfort, travel-sore and weak?
  Of labour you shall find the sum.
Will there be beds for me and all who seek?
  Yea, beds for all who come.`,
    scheme: 'ABAB ×4', gloss: { morn: { en: 'morning', ru: 'утро', kz: 'таң' }, inn: { en: 'a small hotel', ru: 'постоялый двор', kz: 'қонақ үй' }, wayfarers: { en: 'travellers on foot', ru: 'путники', kz: 'жолаушылар' }, 'travel-sore': { en: 'tired and in pain from travelling', ru: 'измученный дорогой', kz: 'жолдан шаршаған' }, yea: { en: 'yes (old)', ru: 'да (устар.)', kz: 'иә (көне)' } },
    context: 'A dialogue poem: every odd line is a question, every even line is an answer. The journey is an allegory of life, and the inn suggests death and rest. Read it with a partner — one asks, one answers.',
    image: { file: 'Goblin Market and Other Poems - Rossetti (1862) - frontispiece.png', credit: 'Dante Gabriel Rossetti, frontispiece to Goblin Market and Other Poems (1862), the book in which “Up-Hill” first appeared — public domain', plate: true },
    devices: ['allegory', 'dialogue', 'question and answer'], dialogue: true, reflect: 'Who is asking and who is answering? Give two possible answers.' },
  { id: 'po-remember', title: 'Remember', author: 'rossetti', src: 'obev', ref: 'OBEV No. 787', year: 'Goblin Market and Other Poems, 1862', level: 'C1', era: 'victorian', origin: 'England', themes: ['love', 'death', 'memory'],
    text: `Remember me when I am gone away,
  Gone far away into the silent land;
  When you can no more hold me by the hand,
Nor I half turn to go, yet turning stay.
Remember me when no more day by day
  You tell me of our future that you plann’d:
  Only remember me; you understand
It will be late to counsel then or pray.
Yet if you should forget me for a while
  And afterwards remember, do not grieve:
  For if the darkness and corruption leave
  A vestige of the thoughts that once I had,
Better by far you should forget and smile
  Than that you should remember and be sad.`,
    scheme: 'ABBAABBA CDDECE (Petrarchan sonnet)', gloss: { counsel: { en: 'to give advice', ru: 'советовать', kz: 'кеңес беру' }, grieve: { en: 'to feel deep sadness', ru: 'горевать', kz: 'қайғыру' }, vestige: { en: 'a small trace', ru: 'след', kz: 'із' } },
    image: { file: 'Goblin Market and Other Poems - Rossetti (1862) - title page.png', credit: 'Title page of Goblin Market and Other Poems (1862), designed by D. G. Rossetti — public domain' },
    context: 'A sonnet with a "turn" (volta) at line 9: "Yet…". The first eight lines ask to be remembered; the last six say it is better to forget and smile than to remember and be sad.',
    devices: ['sonnet', 'volta', 'euphemism ("the silent land")'], reflect: 'Find the word where the poem turns. How does the speaker’s request change?' },
  { id: 'po-to-autumn', scheme: 'ABABCDEDCCE / ABABCDECDDE / ABABCDECDDE', title: 'To Autumn', author: 'keats', src: 'obev', ref: 'OBEV No. 627', year: 'written September 1819', level: 'C1', era: 'romantic', origin: 'England', themes: ['seasons', 'nature', 'time'],
    text: `Season of mists and mellow fruitfulness!
  Close bosom-friend of the maturing sun;
Conspiring with him how to load and bless
  With fruit the vines that round the thatch-eaves run;
To bend with apples the moss’d cottage-trees,
  And fill all fruit with ripeness to the core;
    To swell the gourd, and plump the hazel shells
  With a sweet kernel; to set budding more,
And still more, later flowers for the bees,
Until they think warm days will never cease,
  For Summer has o’er-brimm’d their clammy cells.

Who hath not seen thee oft amid thy store?
  Sometimes whoever seeks abroad may find
Thee sitting careless on a granary floor,
  Thy hair soft-lifted by the winnowing wind,
Or on a half-reap’d furrow sound asleep,
  Drowsed with the fume of poppies, while thy hook
    Spares the next swath and all its twinèd flowers;
And sometimes like a gleaner thou dost keep
  Steady thy laden head across a brook;
  Or by a cider-press, with patient look,
    Thou watchest the last oozings hours by hours.

Where are the songs of Spring? Ay, where are they?
  Think not of them, thou hast thy music too,--
While barrèd clouds bloom the soft-dying day,
  And touch the stubble-plains with rosy hue;
Then in a wailful choir the small gnats mourn
  Among the river sallows, borne aloft
    Or sinking as the light wind lives or dies;
And full-grown lambs loud bleat from hilly bourn;
  Hedge-crickets sing; and now with treble soft
  The redbreast whistles from a garden-croft;
    And gathering swallows twitter in the skies.`,
    gloss: { mellow: { en: 'soft, ripe, gentle', ru: 'мягкий, спелый', kz: 'жұмсақ, піскен' }, 'thatch-eaves': { en: 'edges of a straw roof', ru: 'края соломенной крыши', kz: 'қамыс шатыр жиегі' }, gourd: { en: 'a pumpkin-like fruit', ru: 'тыква', kz: 'асқабақ' }, kernel: { en: 'the soft part inside a nut', ru: 'ядро ореха', kz: 'жаңғақ дәні' }, granary: { en: 'a building for storing grain', ru: 'амбар', kz: 'астық қойма' }, winnowing: { en: 'separating grain from chaff by wind', ru: 'веющий (зерно)', kz: 'астық сапыратын' }, gleaner: { en: 'a person collecting grain left after harvest', ru: 'собиратель колосьев', kz: 'масақ терушi' }, sallows: { en: 'willow trees', ru: 'ивы', kz: 'талдар' }, bourn: { en: 'here: a stream or boundary area', ru: 'здесь: ручей, граница', kz: 'мұнда: бұлақ, шекара' } },
    context: 'Three stanzas, three moments of autumn: ripeness (morning), harvest (midday), the end of the day and of the year (evening). Autumn is personified as a harvest worker in stanza 2. Stanza 3 is full of sounds — gnats, lambs, crickets, robin, swallows.',
    image: { file: 'A Day with Keats, Neatby plate - Autumn.png', credit: 'W. J. Neatby, illustration for “To Autumn”, A Day with Keats (1899) — public domain' },
    devices: ['personification', 'imagery (all five senses)', 'apostrophe'], reflect: 'Stanza 3 lists sounds. Write three lines listing sounds of autumn where you live.' },
  { id: 'po-death', title: 'Death ("Death, be not proud")', author: 'donne', src: 'obev', ref: 'OBEV No. 202', year: 'Holy Sonnets; printed 1633', level: 'C2', era: 'renaissance', origin: 'England', themes: ['death', 'faith', 'argument'],
    text: `Death, be not proud, though some have callèd thee
Mighty and dreadful, for thou art not so:
For those whom thou think’st thou dost overthrow
Die not, poor Death; nor yet canst thou kill me.
From Rest and Sleep, which but thy picture be,
Much pleasure, then from thee much more must flow;
And soonest our best men with thee do go--
Rest of their bones and souls’ delivery!
Thou’rt slave to fate, chance, kings, and desperate men,
And dost with poison, war, and sickness dwell;
And poppy or charms can make us sleep as well
And better than thy stroke. Why swell’st thou then?
  One short sleep past, we wake eternally,
  And Death shall be no more: Death, thou shalt die!`,
    scheme: 'ABBAABBA CDDCEE', gloss: { 'callèd': { en: 'called (the accent shows it is said in two syllables: call-ed)', ru: 'названа (читается в 2 слога)', kz: 'аталды (2 буынмен оқылады)' }, overthrow: { en: 'defeat', ru: 'низвергать', kz: 'құлату' }, "swell’st": { en: 'are you proud / swell up (old form)', ru: 'кичишься (устар.)', kz: 'кеуде керу (көне)' } },
    context: 'Apostrophe: the speaker talks directly to Death and argues with it like a lawyer. The ending is a paradox: "Death, thou shalt die!" The accent in "callèd" is a reading instruction — pronounce the -ed as a separate syllable.',
    image: { file: 'John Donne by Isaac Oliver.jpg', credit: 'After Isaac Oliver, 1616 — public domain' },
    devices: ['apostrophe', 'paradox', 'personification'], reflect: 'List the three arguments the speaker uses against Death.' }
];
/* ---- New poems with verified human recordings (added in v2) ---- */
Object.assign(SOURCES, {
  blake1901: { key: 'pg1934', work: 'Songs of Innocence and of Experience', editor: 'William Blake; London: R. Brimley Johnson, 1901', note: 'Songs of Innocence first appeared in 1789, Songs of Experience in 1794; this is a 1901 printed edition.', org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/1934', type: 'Digitised edition (public domain)' },
  learNonsense: { key: 'pg13650', work: 'Nonsense Books', editor: 'Edward Lear', note: '“The Owl and the Pussy-Cat” is the first of the Nonsense Songs (first published 1871).', org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/13650', type: 'Digitised edition (public domain)' },
  tennyson: { key: 'pg8601', work: 'The Early Poems of Alfred Lord Tennyson', editor: 'Edited by John Churton Collins (1900)', note: 'The editor notes that “The Eagle” was first published in 1851.', org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/8601', type: 'Digitised edition (public domain)' },
  shelley: { key: 'pg4800', work: 'The Complete Poetical Works of Percy Bysshe Shelley', editor: 'Edited by Thomas Hutchinson (Oxford, 1914)', note: 'Editor’s note: “Published by Hunt in ‘The Examiner’, January, 1818.” Editorial line numbers are not shown.', org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/4800', type: 'Digitised edition (public domain)' },
  burnsPG: { key: 'pg1279', work: 'Poems and Songs of Robert Burns', editor: 'Robert Burns', note: 'Placed under the year 1795 in this edition; to be sung to the tune “For a’ that”.', org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/1279', type: 'Digitised edition (public domain)' },
  mccraePG: { key: 'pg353', work: 'In Flanders Fields, and Other Poems', editor: 'John McCrae; with an essay by Sir Andrew Macphail (1919)', note: 'The poem as printed in the 1919 book.', org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/353', type: 'Digitised edition (public domain)' },
  teasdalePG: { key: 'pg591', work: 'Flame and Shadow', editor: 'Sara Teasdale (1920)', note: 'Printed with the subtitle “(War Time)”.', org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/591', type: 'Digitised edition (public domain)' },
  yeatsPG: { key: 'pg72987', work: 'Michael Robartes and the Dancer', editor: 'W. B. Yeats; Dublin: The Cuala Press, 1920', note: 'First edition of the collection.', org: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/72987', type: 'Digitised first edition (public domain)' }
});

POEMS.push(
  { id: 'po-blossom', title: 'The Blossom', author: 'blake', src: 'blake1901', ref: 'Songs of Innocence', year: 'Songs of Innocence, 1789', level: 'A1', era: 'romantic', origin: 'England', themes: ['nature', 'birds', 'feelings'],
    text: `Merry, merry sparrow!
Under leaves so green
    A happy blossom
Sees you, swift as arrow,
Seek your cradle narrow,
    Near my bosom.

Pretty, pretty robin!
Under leaves so green
    A happy blossom
Hears you sobbing, sobbing,
Pretty, pretty robin,
    Near my bosom.`,
    gloss: { blossom: { en: 'a flower on a tree', ru: 'цветок (на дереве)', kz: 'гүл (ағашта)' }, cradle: { en: 'a baby’s bed; here, a nest', ru: 'колыбель; здесь — гнездо', kz: 'бесік; мұнда — ұя' }, bosom: { en: 'chest, heart', ru: 'грудь, сердце', kz: 'кеуде, жүрек' } },
    context: 'Two stanzas, two birds, two feelings: the sparrow is quick and happy, the robin is sad. The flower speaks and watches both. Blake printed this poem on a plate decorated with flame-like plants and small winged figures.',
    image: { file: 'Songs of Innocence and of Experience- The Blossom- Merry Merry Sparrow MET DT5427.jpg', credit: 'William Blake, “The Blossom”, Songs of Innocence and of Experience, Metropolitan Museum of Art — CC0', plate: true },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/7/7a/The_Blossom.ogg', 'Neil Carmichael', 'CC BY-SA 4.0')],
    devices: ['repetition', 'contrast'], reflect: 'Which bird is happy and which is sad? Which words tell you?' },
  { id: 'po-laughing-song', title: 'Laughing Song', author: 'blake', src: 'blake1901', ref: 'Songs of Innocence', year: 'Songs of Innocence, 1789', level: 'A2', era: 'romantic', origin: 'England', themes: ['happiness', 'nature', 'sound'],
    text: `When the green woods laugh with the voice of joy,
And the dimpling stream runs laughing by;
When the air does laugh with our merry wit,
And the green hill laughs with the noise of it;

When the meadows laugh with lively green,
And the grasshopper laughs in the merry scene;
When Mary and Susan and Emily
With their sweet round mouths sing ‘Ha ha he!’

When the painted birds laugh in the shade,
Where our table with cherries and nuts is spread:
Come live, and be merry, and join with me,
To sing the sweet chorus of ‘Ha ha he!’`,
    scheme: 'AABB CCDD EEFF', gloss: { dimpling: { en: 'making small ripples', ru: 'покрытый рябью', kz: 'ирелеңдеген' }, wit: { en: 'clever fun', ru: 'остроумие', kz: 'тапқырлық' }, meadows: { en: 'grass fields', ru: 'луга', kz: 'шабындықтар' }, chorus: { en: 'part of a song everyone sings together', ru: 'припев', kz: 'қайырма' } },
    context: 'Everything laughs: woods, stream, air, hill, meadows, grasshopper, birds. Giving human actions to nature is called personification. Count how many times you hear “laugh”.',
    image: { file: 'William Blake - Songs of Innocence, Plate 28, "Laughing Song" (Bentley 15) - Google Art Project.jpg', credit: 'William Blake, “Laughing Song”, Songs of Innocence, plate 28 — public domain', plate: true },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/2/26/Laughing_Song.ogg', 'Neil Carmichael', 'CC BY-SA 4.0')],
    devices: ['personification', 'repetition', 'onomatopoeia'], reflect: 'Write one line of your own: “When the ___ laughs with ___”.' },
  { id: 'po-echoing-green', scheme: 'AABBCCDDEE ×3', title: 'The Echoing Green', author: 'blake', src: 'blake1901', ref: 'Songs of Innocence', year: 'Songs of Innocence, 1789', level: 'A2', era: 'romantic', origin: 'England', themes: ['childhood', 'time', 'village life'],
    text: `The sun does arise,
And make happy the skies;
The merry bells ring
To welcome the Spring;
The skylark and thrush,
The birds of the bush,
Sing louder around
To the bells’ cheerful sound;
While our sports shall be seen
On the echoing green.

Old John, with white hair,
Does laugh away care,
Sitting under the oak,
Among the old folk.
They laugh at our play,
And soon they all say,
‘Such, such were the joys
When we all—girls and boys—
In our youth-time were seen
On the echoing green.’

Till the little ones, weary,
No more can be merry:
The sun does descend,
And our sports have an end.
Round the laps of their mothers
Many sisters and brothers,
Like birds in their nest,
Are ready for rest,
And sport no more seen
On the darkening green.`,
    gloss: { green: { en: 'a village field where people meet and play', ru: 'деревенский луг', kz: 'ауыл алаңы' }, echoing: { en: 'full of sounds that come back', ru: 'звенящий эхом', kz: 'жаңғырған' }, sports: { en: 'games', ru: 'игры', kz: 'ойындар' }, folk: { en: 'people', ru: 'люди', kz: 'адамдар' }, descend: { en: 'go down', ru: 'опускаться', kz: 'төмен түсу' } },
    context: 'One day from morning to evening — and one life from childhood to old age. In the last line the “echoing green” becomes the “darkening green”.',
    image: { file: 'Songs of Innocence and of Experience, copy AA, 1826 (The Fitzwilliam Museum) object 6 (The Echoing Green).jpg', credit: 'William Blake, “The Echoing Green”, copy AA (printed 1826), Fitzwilliam Museum — public domain', plate: true },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/f/f6/The_Echoing_Green.ogg', 'Neil Carmichael', 'CC BY-SA 4.0')],
    devices: ['rhyming couplets', 'contrast', 'refrain'], reflect: 'Compare the first and last lines of the poem. What has changed?' },
  { id: 'po-owl-pussycat', title: 'The Owl and the Pussy-Cat', author: 'lear', src: 'learNonsense', ref: 'Nonsense Songs', year: 'first published 1871', level: 'B1', era: 'victorian', origin: 'England', themes: ['humour', 'love', 'journeys'], form: 'Nonsense poem',
    text: `The Owl and the Pussy-Cat went to sea
  In a beautiful pea-green boat:
They took some honey, and plenty of money
  Wrapped up in a five-pound note.
The Owl looked up to the stars above,
  And sang to a small guitar,
"O lovely Pussy, O Pussy, my love,
    What a beautiful Pussy you are,
      You are,
      You are!
  What a beautiful Pussy you are!"

Pussy said to the Owl, "You elegant fowl,
  How charmingly sweet you sing!
Oh! let us be married; too long we have tarried:
  But what shall we do for a ring?"
They sailed away, for a year and a day,
  To the land where the bong-tree grows;
And there in a wood a Piggy-wig stood,
  With a ring at the end of his nose,
      His nose,
      His nose,
  With a ring at the end of his nose.

"Dear Pig, are you willing to sell for one shilling
  Your ring?" Said the Piggy, "I will."
So they took it away, and were married next day
  By the Turkey who lives on the hill.
They dined on mince and slices of quince,
  Which they ate with a runcible spoon;
And hand in hand, on the edge of the sand,
  They danced by the light of the moon,
      The moon,
      The moon,
They danced by the light of the moon.`,
    gloss: { fowl: { en: 'a bird', ru: 'птица', kz: 'құс' }, tarried: { en: 'waited, delayed', ru: 'медлили', kz: 'кешіктік' }, shilling: { en: 'an old British coin', ru: 'шиллинг', kz: 'шиллинг' }, mince: { en: 'finely chopped meat', ru: 'фарш', kz: 'тартылған ет' }, quince: { en: 'a hard yellow fruit', ru: 'айва', kz: 'бехи' }, runcible: { en: 'a nonsense word invented by Lear — it has no real meaning', ru: 'выдуманное Лиром слово без значения', kz: 'Лир ойлап тапқан мағынасыз сөз' }, 'bong-tree': { en: 'an imaginary tree', ru: 'выдуманное дерево', kz: 'ойдан шығарылған ағаш' } },
    context: 'A love story in nonsense: an owl and a cat sail away, buy a ring from a pig and marry. Listen for the internal rhymes inside long lines: honey / money, fowl / Owl, married / tarried, mince / quince, hand / sand.',
    image: { file: 'Edward Lear The Owl and the Pussy Cat 1.jpg', credit: 'Edward Lear’s own drawing for the poem (1871) — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/9/95/The_Owl_and_the_Pussycat.ogg', 'Neil Carmichael', 'CC BY-SA 4.0')],
    devices: ['internal rhyme', 'refrain', 'invented words'], reflect: 'Lear invented “runcible”. Invent a word and describe what it means.' },
  { id: 'po-eagle', title: 'The Eagle', author: 'tennyson', src: 'tennyson', ref: '“The Eagle (fragment)”', year: 'first published 1851', level: 'B1', era: 'victorian', origin: 'England', themes: ['nature', 'animals', 'power'],
    text: `He clasps the crag with hooked hands;
Close to the sun in lonely lands,
Ring’d with the azure world, he stands.
The wrinkled sea beneath him crawls;
He watches from his mountain walls,
And like a thunderbolt he falls.`,
    scheme: 'AAA BBB', gloss: { clasps: { en: 'holds tightly', ru: 'сжимает', kz: 'қысып ұстайды' }, crag: { en: 'a steep rough rock', ru: 'утёс', kz: 'жартас' }, azure: { en: 'bright blue', ru: 'лазурный', kz: 'көкшіл' }, thunderbolt: { en: 'a flash of lightning', ru: 'удар молнии', kz: 'найзағай' } },
    context: 'Six lines, two pictures: the eagle still, high on the rock — then the sudden fall. Hear the hard /k/ sounds in line 1 (clasps, crag, hooked). The eagle has “hands”: personification. The source edition’s editor praises the line “The wrinkled sea beneath him crawls” as one of Tennyson’s most vivid.',
    image: { file: 'Alfred Tennyson, 1st Baron Tennyson by George Frederic Watts.jpg', credit: 'George Frederic Watts, Alfred Tennyson — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/8/8c/The_Eagle.ogg', 'Neil Carmichael', 'CC BY-SA 4.0')],
    devices: ['alliteration', 'personification', 'simile', 'triplet rhyme'], reflect: 'Which single word makes the sea look small? Why?' },
  { id: 'po-untrodden', title: 'She dwelt among the untrodden ways', author: 'wordsworth', src: 'obev', ref: 'OBEV No. 516 (“Lucy”, ii)', year: '1800', level: 'B1', era: 'romantic', origin: 'England', themes: ['love', 'loss', 'nature'],
    text: `She dwelt among the untrodden ways
  Beside the springs of Dove,
A Maid whom there were none to praise
  And very few to love:

A violet by a mossy stone
  Half hidden from the eye!
Fair as a star, when only one
  Is shining in the sky.


She lived unknown, and few could know
  When Lucy ceased to be;
But she is in her grave, and oh,
  The difference to me!`,
    scheme: 'ABAB CDCD EFEF', gloss: { dwelt: { en: 'lived (past of “dwell”)', ru: 'жила', kz: 'тұрды' }, untrodden: { en: 'where few people walk', ru: 'нехоженый', kz: 'ешкім баспаған' }, maid: { en: 'a young woman', ru: 'девушка', kz: 'бойжеткен' }, 'ceased to be': { en: 'died', ru: 'перестала жить', kz: 'дүниеден өтті' } },
    context: 'One of Wordsworth’s “Lucy” poems. Nobody knows if Lucy was a real person. Two small images — a violet half hidden, a single star — show someone unnoticed by the world but precious to the poet. Listen to how the last line changes everything.',
    image: { file: 'Wordsworth on Helvellyn by Benjamin Robert Haydon.jpg', credit: 'Benjamin Robert Haydon, Wordsworth on Helvellyn (1842), National Portrait Gallery — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/2/20/Wordsworth-untroddenways.ogg', 'Sphoenixee', 'CC BY 3.0')],
    devices: ['metaphor', 'simile', 'understatement'], reflect: 'The last line is very simple. Why might simple words be the most powerful here?' },
  { id: 'po-ozymandias', scheme: 'ABABACDC EDEFEF (an unusual sonnet pattern)', title: 'Ozymandias', author: 'shelley', src: 'shelley', ref: '“OZYMANDIAS.”', year: 'published January 1818', level: 'B2', era: 'romantic', origin: 'England', themes: ['power', 'time', 'history'],
    text: `I met a traveller from an antique land
Who said: Two vast and trunkless legs of stone
Stand in the desert...Near them, on the sand,
Half sunk, a shattered visage lies, whose frown,
And wrinkled lip, and sneer of cold command,
Tell that its sculptor well those passions read
Which yet survive, stamped on these lifeless things,
The hand that mocked them, and the heart that fed:
And on the pedestal these words appear:
‘My name is Ozymandias, king of kings:
Look on my works, ye Mighty, and despair!’
Nothing beside remains. Round the decay
Of that colossal wreck, boundless and bare
The lone and level sands stretch far away.`,
    form: 'Sonnet', gloss: { antique: { en: 'very old, ancient', ru: 'древний', kz: 'ежелгі' }, trunkless: { en: 'without a body', ru: 'без туловища', kz: 'денесіз' }, visage: { en: 'face', ru: 'лицо', kz: 'бет-әлпет' }, sneer: { en: 'a proud, unkind smile', ru: 'презрительная усмешка', kz: 'мысқыл' }, pedestal: { en: 'the base of a statue', ru: 'пьедестал', kz: 'тұғыр' }, despair: { en: 'lose all hope', ru: 'отчаиваться', kz: 'түңілу' } },
    context: 'A sonnet about a broken statue in the desert. The king once ordered the mighty to “despair” at his works — now nothing is left but sand. “Ozymandias” is a Greek name for the Egyptian pharaoh Ramesses II. Hear the alliteration in the last line: boundless and bare, lone and level.',
    image: { file: 'The Younger Memnon Egyptian Red Granite Colossal Statue of Ramesses II, Thebes, 19th Dynasty, c. 1270 BC (35727854553).jpg', credit: 'The “Younger Memnon”, colossal bust of Ramesses II from Thebes, British Museum. Photo: Gary Todd — CC0' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/2/21/Percy_Shellys_Ozymandias.ogg', 'Neil Carmichael', 'CC BY-SA 4.0')],
    devices: ['irony', 'alliteration', 'sonnet', 'framed story'], reflect: 'What is the irony of the words on the pedestal?' },
  { id: 'po-belle-dame', title: 'La Belle Dame sans Merci', author: 'keats', src: 'obev', ref: 'OBEV No. 633', year: 'written 1819', level: 'B2', era: 'romantic', origin: 'England', themes: ['love', 'mystery', 'ballad'], form: 'Ballad',
    text: `‘O what can ail thee, knight-at-arms,
  Alone and palely loitering?
The sedge is wither’d from the lake,
      And no birds sing.

‘O what can ail thee, knight-at-arms,
  So haggard and so woe-begone?
The squirrel’s granary is full,
      And the harvest’s done.

‘I see a lily on thy brow
  With anguish moist and fever dew;
And on thy cheek a fading rose
      Fast withereth too.’

‘I met a lady in the meads,
  Full beautiful--a faery’s child,
Her hair was long, her foot was light,
      And her eyes were wild.

‘I made a garland for her head,
  And bracelets too, and fragrant zone;
She look’d at me as she did love,
      And made sweet moan.

‘I set her on my pacing steed
  And nothing else saw all day long,
For sideways would she lean, and sing
      A faery’s song.

‘She found me roots of relish sweet,
  And honey wild and manna dew,
And sure in language strange she said,
      “I love thee true!”

‘She took me to her elfin grot,
  And there she wept and sigh’d full sore;
And there I shut her wild, wild eyes
      With kisses four.

‘And there she lullèd me asleep,
  And there I dream’d--Ah! woe betide!
The latest dream I ever dream’d
      On the cold hill’s side.

‘I saw pale kings and princes too,
  Pale warriors, death-pale were they all;
Who cried--“La belle Dame sans Merci
      Hath thee in thrall!”

‘I saw their starved lips in the gloam
  With horrid warning gapèd wide,
And I awoke and found me here
      On the cold hill’s side.

‘And this is why I sojourn here
  Alone and palely loitering,
Though the sedge is wither’d from the lake,
      And no birds sing.’`,
    gloss: { ail: { en: 'trouble, make ill', ru: 'беспокоить, мучить', kz: 'мазалау' }, loitering: { en: 'waiting around with no purpose', ru: 'бродящий без цели', kz: 'мақсатсыз жүрген' }, sedge: { en: 'grass-like plant by water', ru: 'осока', kz: 'қияқ' }, haggard: { en: 'tired and ill-looking', ru: 'измождённый', kz: 'жүдеу' }, meads: { en: 'meadows', ru: 'луга', kz: 'шалғындар' }, steed: { en: 'a horse', ru: 'конь', kz: 'тұлпар' }, grot: { en: 'a cave', ru: 'грот', kz: 'үңгір' }, thrall: { en: 'power, slavery', ru: 'плен, власть', kz: 'тұтқын, билік' }, sojourn: { en: 'stay for a time', ru: 'пребывать', kz: 'уақытша тұру' } },
    context: 'A ballad with two voices: a stranger asks the knight what is wrong (stanzas 1–3); the knight tells his story (4–12). The title is French: “the beautiful lady without mercy”. Notice the short fourth line of every stanza — it makes each verse stop like a held breath.',
    image: { file: 'John William Waterhouse - La Belle Dame sans Merci (1893).jpg', credit: 'J. W. Waterhouse, La Belle Dame sans Merci (1893), Hessisches Landesmuseum Darmstadt — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/a/ac/La_Belle_Dame_Sans_Merci_-_John_Keats.ogg', 'Ijon', 'CC0')],
    devices: ['ballad form', 'dialogue', 'circular structure'], dialogue: true, reflect: 'Who is the lady? Give your interpretation.' },
  { id: 'po-chapman', title: 'On first looking into Chapman’s Homer', author: 'keats', src: 'obev', ref: 'OBEV No. 634', year: 'written 1816', level: 'C1', era: 'romantic', origin: 'England', themes: ['reading', 'discovery', 'wonder'], form: 'Sonnet',
    text: `Much have I travell’d in the realms of gold,
  And many goodly states and kingdoms seen;
  Round many western islands have I been
Which bards in fealty to Apollo hold.
Oft of one wide expanse had I been told
  That deep-brow’d Homer ruled as his demesne:
  Yet did I never breathe its pure serene
Till I heard Chapman speak out loud and bold:
Then felt I like some watcher of the skies
  When a new planet swims into his ken;
Or like stout Cortez, when with eagle eyes
  He stared at the Pacific--and all his men
Look’d at each other with a wild surmise--
  Silent, upon a peak in Darien.`,
    scheme: 'ABBAABBA CDCDCD (Petrarchan sonnet)', gloss: { realms: { en: 'kingdoms', ru: 'царства', kz: 'патшалықтар' }, bards: { en: 'poets', ru: 'барды, поэты', kz: 'ақындар' }, fealty: { en: 'loyalty', ru: 'верность', kz: 'адалдық' }, demesne: { en: 'land that someone owns', ru: 'владения', kz: 'иелік' }, ken: { en: 'range of sight or knowledge', ru: 'поле зрения', kz: 'көз жетер жер' }, surmise: { en: 'guess', ru: 'догадка', kz: 'болжам' } },
    context: 'A poem about the excitement of reading. Keats compares discovering a great translation of Homer to an astronomer finding a new planet or an explorer seeing a new ocean. Famous historical slip: it was Balboa, not Cortez, who first saw the Pacific from Darien — Keats’s line is kept exactly as he wrote it.',
    image: { file: 'John Keats by William Hilton circa 1822 02.jpg', credit: 'William Hilton, John Keats (c. 1822), National Portrait Gallery — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/b/be/On-First-Looking-Into-Chapman%E2%80%99s-Homer-LibriVox-Vorbis.ogg', 'Leonard Wilson (LibriVox)', 'CC0')],
    devices: ['extended metaphor', 'simile', 'sonnet'], reflect: 'Describe a book, film or song that felt like “a new planet” to you.' },
  { id: 'po-faith', title: 'Faith is a fine invention', author: 'dickinson', src: 'dickinson', ref: 'Poems, Second Series (1891), No. XXX (untitled)', year: 'first printed 1891', level: 'B2', era: 'american19', origin: 'USA', themes: ['faith', 'science', 'humour'],
    text: `Faith is a fine invention
For gentlemen who see;
But microscopes are prudent
In an emergency!`,
    gloss: { invention: { en: 'something created by people', ru: 'изобретение', kz: 'өнертабыс' }, prudent: { en: 'wise and careful', ru: 'благоразумный', kz: 'байыпты' } },
    context: 'Four lines, one sharp joke: faith is fine for people who already “see”, but in a crisis Dickinson prefers a scientific instrument. Is she serious or ironic? Readers disagree.',
    image: { file: 'Black-white photograph of Emily Dickinson2.png', credit: 'Emily Dickinson, daguerreotype, c. 1847, Amherst College Archives & Special Collections — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/3/3a/Faith_is_a_fine_invention.ogg', 'Neil Carmichael', 'CC BY-SA 4.0')],
    devices: ['irony', 'contrast'], reflect: 'Agree or disagree with the poem in two sentences.' },
  { id: 'po-fly', title: 'I heard a fly buzz when I died', author: 'dickinson', src: 'dickinson', ref: 'Poems, Third Series (1896), No. XLVI (“DYING.”)', year: 'first printed 1896', level: 'C1', era: 'american19', origin: 'USA', themes: ['death', 'perception'],
    text: `I heard a fly buzz when I died;
  The stillness round my form
Was like the stillness in the air
  Between the heaves of storm.

The eyes beside had wrung them dry,
  And breaths were gathering sure
For that last onset, when the king
  Be witnessed in his power.

I willed my keepsakes, signed away
  What portion of me I
Could make assignable, -- and then
  There interposed a fly,

With blue, uncertain, stumbling buzz,
  Between the light and me;
And then the windows failed, and then
  I could not see to see.`,
    gloss: { heaves: { en: 'strong movements up and down', ru: 'порывы', kz: 'толқындар' }, onset: { en: 'beginning, attack', ru: 'начало, натиск', kz: 'басталуы' }, keepsakes: { en: 'small objects kept to remember someone', ru: 'памятные вещи', kz: 'естелік заттар' }, interposed: { en: 'came between', ru: 'вклинилась', kz: 'араға кірді' } },
    context: 'The speaker describes the moment of her own death. Everyone waits for something grand — but a small, noisy fly comes between her and the light. The 1890s editors titled it “DYING.”; Dickinson gave it no title.',
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/2/29/I_heard_a_Fly_buzz_when_I_died.ogg', 'Neil Carmichael', 'CC BY-SA 4.0')],
    devices: ['irony', 'onomatopoeia', 'synaesthesia (“blue … buzz”)'], reflect: 'Why might the poet choose a fly — not an angel — for this moment?' },
  { id: 'po-flanders', title: 'In Flanders Fields', author: 'mccrae', src: 'mccraePG', ref: 'In Flanders Fields, and Other Poems (1919)', year: 'written 1915', level: 'B1', era: 'modern', origin: 'Canada', themes: ['war', 'memory', 'nature'], form: 'Rondeau',
    text: `In Flanders fields the poppies blow
Between the crosses, row on row,
 That mark our place; and in the sky
 The larks, still bravely singing, fly
Scarce heard amid the guns below.

We are the Dead.  Short days ago
We lived, felt dawn, saw sunset glow,
 Loved and were loved, and now we lie,
            In Flanders fields.

Take up our quarrel with the foe:
To you from failing hands we throw
 The torch; be yours to hold it high.
 If ye break faith with us who die
We shall not sleep, though poppies grow
            In Flanders fields.`,
    gloss: { poppies: { en: 'red wild flowers', ru: 'маки', kz: 'көкнәр гүлдері' }, blow: { en: 'here: bloom, grow', ru: 'здесь: цветут', kz: 'мұнда: гүлдейді' }, larks: { en: 'small singing birds', ru: 'жаворонки', kz: 'бозторғайлар' }, scarce: { en: 'hardly', ru: 'едва', kz: 'әрең' }, foe: { en: 'enemy', ru: 'враг', kz: 'жау' } },
    context: 'Written in 1915 by a Canadian army doctor during the First World War. The dead soldiers speak. This poem made the red poppy a symbol of remembrance in Britain, Canada and other countries. An example of literature in English from outside Britain.',
    image: { file: 'Lieut.-Col. John McCrae, M.D..jpg', credit: 'Lieut.-Col. John McCrae — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/b/b9/In_Flanders_Fields.ogg', 'Neil Carmichael', 'CC BY-SA 4.0')],
    devices: ['refrain', 'personification (the dead speak)', 'symbol'], reflect: 'Who is “you” in the third stanza? What do the dead ask for?' },
  { id: 'po-soft-rains', title: 'There Will Come Soft Rains', author: 'teasdale', src: 'teasdalePG', ref: 'Flame and Shadow (1920), “(War Time)”', year: 'first published 1918 (Harper’s Monthly); collected 1920', level: 'B1', era: 'modern', origin: 'USA', themes: ['nature', 'war', 'time'],
    text: `There will come soft rains and the smell of the ground,
And swallows circling with their shimmering sound;

And frogs in the pools singing at night,
And wild plum-trees in tremulous white;

Robins will wear their feathery fire
Whistling their whims on a low fence-wire;

And not one will know of the war, not one
Will care at last when it is done.

Not one would mind, neither bird nor tree
If mankind perished utterly;

And Spring herself, when she woke at dawn,
Would scarcely know that we were gone.`,
    scheme: 'AA BB CC DD EE FF', gloss: { shimmering: { en: 'shining softly', ru: 'мерцающий', kz: 'жылтыраған' }, tremulous: { en: 'trembling', ru: 'трепещущий', kz: 'дірілдеген' }, whims: { en: 'sudden playful wishes', ru: 'прихоти', kz: 'еркелік' }, perished: { en: 'died', ru: 'погибли', kz: 'қырылды' }, utterly: { en: 'completely', ru: 'полностью', kz: 'мүлдем' } },
    context: 'Six couplets. The first four describe a gentle spring; then the poem turns: nature would not even notice if humans disappeared. Notice the will / would future forms — a grammar lesson inside a poem.',
    image: { file: 'Sara Teasdale. Photograph by unknown, 1907 Missouri History Museum Photograph and Print Collection. Portraits n38637.jpg', credit: 'Sara Teasdale, 1907, Missouri History Museum — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/4/41/There_will_come_soft_rain.ogg', 'Neil Carmichael', 'CC BY-SA 4.0')],
    devices: ['couplets', 'personification (Spring herself)', 'imagery'], reflect: 'Is the poem hopeful or sad? Find one line for each answer.' },
  { id: 'po-mans-a-man', title: 'A Man’s A Man For A’ That', author: 'burns', src: 'burnsPG', ref: 'Poems and Songs, 1795', year: '1795', level: 'C1', era: 'romantic', origin: 'Scotland', themes: ['equality', 'dignity', 'society'], variety: 'Scots',
    text: `Is there for honest Poverty
That hings his head, an’ a’ that;
The coward slave—we pass him by,
We dare be poor for a’ that!
For a’ that, an’ a’ that.
Our toils obscure an’ a’ that,
The rank is but the guinea’s stamp,
The Man’s the gowd for a’ that.

What though on hamely fare we dine,
Wear hoddin grey, an’ a that;
Gie fools their silks, and knaves their wine;
A Man’s a Man for a’ that:
For a’ that, and a’ that,
Their tinsel show, an’ a’ that;
The honest man, tho’ e’er sae poor,
Is king o’ men for a’ that.

Ye see yon birkie, ca’d a lord,
Wha struts, an’ stares, an’ a’ that;
Tho’ hundreds worship at his word,
He’s but a coof for a’ that:
For a’ that, an’ a’ that,
His ribband, star, an’ a’ that:
The man o’ independent mind
He looks an’ laughs at a’ that.

A prince can mak a belted knight,
A marquis, duke, an’ a’ that;
But an honest man’s abon his might,
Gude faith, he maunna fa’ that!
For a’ that, an’ a’ that,
Their dignities an’ a’ that;
The pith o’ sense, an’ pride o’ worth,
Are higher rank than a’ that.

Then let us pray that come it may,
(As come it will for a’ that,)
That Sense and Worth, o’er a’ the earth,
Shall bear the gree, an’ a’ that.
For a’ that, an’ a’ that,
It’s coming yet for a’ that,
That Man to Man, the world o’er,
Shall brothers be for a’ that.`,
    gloss: { hings: { en: 'Scots: hangs', ru: 'шотл. «вешает»', kz: 'шотл. «салбыратады»' }, "a’": { en: 'Scots: all', ru: 'шотл. «всё»', kz: 'шотл. «бәрі»' }, guinea: { en: 'an old gold coin', ru: 'гинея (золотая монета)', kz: 'гинея (алтын тиын)' }, gowd: { en: 'Scots: gold', ru: 'шотл. «золото»', kz: 'шотл. «алтын»' }, hamely: { en: 'Scots: homely, simple', ru: 'шотл. «простой»', kz: 'шотл. «қарапайым»' }, 'hoddin grey': { en: 'cheap rough grey cloth', ru: 'грубое серое сукно', kz: 'дөрекі сұр мата' }, birkie: { en: 'Scots: a proud young man', ru: 'шотл. «хвастун»', kz: 'шотл. «мақтаншақ»' }, coof: { en: 'Scots: a fool', ru: 'шотл. «дурак»', kz: 'шотл. «ақымақ»' }, abon: { en: 'Scots: above', ru: 'шотл. «выше»', kz: 'шотл. «жоғары»' }, gree: { en: 'Scots: first place, the prize', ru: 'шотл. «первенство»', kz: 'шотл. «бірінші орын»' } },
    context: 'A song about human dignity: a person’s worth is not their rank or money. “The rank is but the guinea’s stamp, / The Man’s the gowd” — a title is only the picture stamped on a coin; the person is the gold. Language-variety note: this is Scots. The source prints “an’ a that” once without an apostrophe; we keep it exactly.',
    image: { file: 'Alexander Nasmyth - Robert Burns, 1759 - 1796. Poet - Google Art Project.jpg', credit: 'Alexander Nasmyth, Robert Burns (1787), Scottish National Portrait Gallery — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/a/ad/HonestPoverty1.ogg', 'Derek Ross (spoken, not sung)', 'CC0')],
    devices: ['refrain', 'metaphor', 'Scots dialect'], reflect: 'Explain the coin metaphor in your own words.' },
  { id: 'po-second-coming', title: 'The Second Coming', author: 'yeats', src: 'yeatsPG', ref: 'Michael Robartes and the Dancer (1920)', year: 'published 1920', level: 'C2', era: 'modern', origin: 'Ireland', themes: ['history', 'crisis', 'prophecy'],
    text: `Turning and turning in the widening gyre
The falcon cannot hear the falconer;
Things fall apart; the centre cannot hold;
Mere anarchy is loosed upon the world,
The blood-dimmed tide is loosed, and everywhere
The ceremony of innocence is drowned;
The best lack all conviction, while the worst
Are full of passionate intensity.

Surely some revelation is at hand;
Surely the Second Coming is at hand.
The Second Coming! Hardly are those words out
When a vast image out of Spiritus Mundi
Troubles my sight: a waste of desert sand;
A shape with lion body and the head of a man,
A gaze blank and pitiless as the sun,
Is moving its slow thighs, while all about it
Wind shadows of the indignant desert birds.
The darkness drops again but now I know
That twenty centuries of stony sleep
Were vexed to nightmare by a rocking cradle,
And what rough beast, its hour come round at last,
Slouches towards Bethlehem to be born?`,
    gloss: { gyre: { en: 'a spiral, a circling movement', ru: 'спираль, круговорот', kz: 'иірім, спираль' }, anarchy: { en: 'complete disorder', ru: 'анархия', kz: 'бейберекетсіздік' }, conviction: { en: 'strong belief', ru: 'убеждённость', kz: 'сенім' }, 'Spiritus Mundi': { en: 'Latin: “the spirit of the world” — Yeats’s idea of a shared store of images', ru: 'лат. «дух мира»', kz: 'лат. «әлем рухы»' }, slouches: { en: 'moves heavily and lazily', ru: 'тащится, сутулясь', kz: 'еңкейіп жылжиды' } },
    context: 'Written just after the First World War, during a time of revolution and violence. Many of its phrases became part of everyday English: “Things fall apart; the centre cannot hold” — Chinua Achebe took “Things Fall Apart” as the title of his famous 1958 novel. Yeats was Irish: this is Irish literature in English.',
    image: { file: 'Portrait of William Butler Yeats P5656.jpg', credit: 'Portrait of W. B. Yeats — public domain' },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/a/a4/Yeats-the-second-coming.ogg', 'palewire', 'CC BY-SA 4.0')],
    devices: ['symbol', 'imagery', 'allusion'], reflect: 'Which line from this poem could describe the world today? Why?' }
);

POEMS.forEach(p => { p.strand = 'poems'; p.form = p.form || (/sonnet/i.test(p.scheme || '') ? 'Sonnet' : 'Lyric poem'); p.rights = 'A'; p.rightsNote = 'Author died ' + ({ stevenson: 1894, dickinson: 1886, wordsworth: 1850, blake: 1827, burns: 1796, byron: 1824, herrick: 1674, rossetti: 1894, keats: 1821, donne: 1631, lear: 1888, tennyson: 1892, shelley: 1822, mccrae: 1918, teasdale: 1933, yeats: 1939 })[p.author] + '; published before 1930 — public domain.'; });

/* ---------------- 5. SHAKESPEARE'S STAGE ---------------- */
const YT = (id, channel, title, purpose) => ({ id, channel, title, purpose, url: 'https://www.youtube.com/watch?v=' + id });

const SHAKESPEARE = [
  { id: 'sh-sonnet-18', kind: 'sonnet', title: 'Sonnet 18 ("Shall I compare thee to a Summer’s day?")', play: 'Sonnets (1609)', ref: 'OBEV No. 145', src: 'obev', speaker: 'The poet', level: 'B2', themes: ['love', 'time', 'poetry'],
    text: `Shall I compare thee to a Summer’s day?
Thou art more lovely and more temperate:
Rough winds do shake the darling buds of May,
And Summer’s lease hath all too short a date:
Sometime too hot the eye of heaven shines,
And often is his gold complexion dimm’d;
And every fair from fair sometime declines,
By chance or nature’s changing course untrimm’d:
But thy eternal Summer shall not fade
Nor lose possession of that fair thou owest;
Nor shall Death brag thou wanderest in his shade,
When in eternal lines to time thou growest:
  So long as men can breathe, or eyes can see,
  So long lives this, and this gives life to thee.`,
    scheme: 'ABAB CDCD EFEF GG (Shakespearean sonnet)', gloss: { thee: { en: 'you (object, old)', ru: 'тебя (устар.)', kz: 'сені (көне)' }, thou: { en: 'you (subject, old)', ru: 'ты (устар.)', kz: 'сен (көне)' }, temperate: { en: 'mild, not extreme', ru: 'умеренный', kz: 'қоңыржай' }, lease: { en: 'a rental period — summer is only "rented"', ru: 'аренда, срок', kz: 'жалға алу мерзімі' }, 'eye of heaven': { en: 'the sun (metaphor)', ru: 'солнце (метафора)', kz: 'күн (метафора)' }, 'untrimm’d': { en: 'stripped of beauty', ru: 'лишённый убранства', kz: 'сәнінен айырылған' }, owest: { en: 'own (old form)', ru: 'владеешь (устар.)', kz: 'иеленесің (көне)' } },
    context: 'The 1609 Quarto printed 154 sonnets. The final couplet makes a claim: this poem itself ("this") will keep the beloved alive as long as people read it — and you are reading it four centuries later.',
    image: { file: 'Sonnets1609titlepage.jpg', credit: 'Title page of SHAKE-SPEARES SONNETS, the 1609 Quarto — public domain', plate: true },
    audio: [CA('https://upload.wikimedia.org/wikipedia/commons/a/ad/Sonnet18.ogg', 'Wrad', 'Public domain')],
    devices: ['metaphor', 'personification', 'iambic pentameter', 'couplet'],
    meter: 'Shall I | com-PARE | thee TO | a SUM | mer’s DAY? — five iambs (da-DUM ×5): iambic pentameter. Line 1 starts gently; mark the stresses as you listen.',
    reflect: 'What does the poet say is better than a summer’s day, and why?' },
  { id: 'sh-seven-ages', kind: 'speech', title: 'All the world’s a stage', play: 'As You Like It', ref: 'Act II, Scene VII', src: 'shakespeare', speaker: 'Jaques', level: 'B2', themes: ['life', 'ages', 'theatre'],
    text: `All the world’s a stage,
And all the men and women merely players;
They have their exits and their entrances,
And one man in his time plays many parts,
His acts being seven ages. At first the infant,
Mewling and puking in the nurse’s arms;
Then the whining schoolboy, with his satchel
And shining morning face, creeping like snail
Unwillingly to school. And then the lover,
Sighing like furnace, with a woeful ballad
Made to his mistress’ eyebrow. Then a soldier,
Full of strange oaths and bearded like the pard,
Jealous in honour, sudden and quick in quarrel,
Seeking the bubble reputation
Even in the cannon’s mouth. And then the justice,
In fair round belly with good capon lined,
With eyes severe and beard of formal cut,
Full of wise saws and modern instances;
And so he plays his part. The sixth age shifts
Into the lean and slippered pantaloon,
With spectacles on nose and pouch on side,
His youthful hose, well saved, a world too wide
For his shrunk shank, and his big manly voice,
Turning again toward childish treble, pipes
And whistles in his sound. Last scene of all,
That ends this strange eventful history,
Is second childishness and mere oblivion,
Sans teeth, sans eyes, sans taste, sans everything.`,
    gloss: { mewling: { en: 'crying weakly', ru: 'хныкающий', kz: 'шыңсып жылаған' }, satchel: { en: 'a school bag', ru: 'ранец', kz: 'мектеп сөмкесі' }, pard: { en: 'leopard', ru: 'леопард', kz: 'барыс' }, capon: { en: 'a fattened chicken', ru: 'каплун', kz: 'семіз әтеш' }, saws: { en: 'wise sayings', ru: 'поговорки', kz: 'нақыл сөздер' }, pantaloon: { en: 'a foolish old man (from Italian comedy)', ru: 'Панталоне — глупый старик', kz: 'ақымақ шал (итальян комедиясынан)' }, hose: { en: 'stockings, tights', ru: 'чулки', kz: 'шұлық' }, shank: { en: 'leg', ru: 'голень', kz: 'балтыр' }, treble: { en: 'high voice', ru: 'дискант', kz: 'жіңішке дауыс' }, sans: { en: 'without (from French)', ru: 'без (франц.)', kz: 'жоқ, -сыз (франц.)' } },
    context: 'Jaques, a gloomy observer, compares life to a play in seven acts. The Globe Theatre, where Shakespeare’s company played, was a working "stage" for this image.',
    image: { file: 'The Globe Theatre from the Long Antwerp View of London.jpg', credit: 'The Globe, from C. J. Visscher’s view of London, 1616 — public domain' },
    video: YT('NbIOZZy54EM', "Shakespeare's Globe", 'All the world’s a stage | As You Like It | Act 2 Scene 7', 'Watch the speech performed at the reconstructed Globe — notice how the actor makes each "age" a different voice.'),
    devices: ['extended metaphor', 'simile', 'list'], sequence: ['infant', 'schoolboy', 'lover', 'soldier', 'justice', 'pantaloon', 'second childishness'],
    reflect: 'Which "age" are you in now? Describe it in Jaques’s style: one image + one simile.' },
  { id: 'sh-to-be', kind: 'speech', title: 'To be, or not to be', play: 'Hamlet', ref: 'Act III, Scene I (opening lines of the soliloquy)', src: 'shakespeare', speaker: 'Hamlet', level: 'C1', extract: true, themes: ['life', 'death', 'decision'],
    text: `To be, or not to be, that is the question:
Whether ’tis nobler in the mind to suffer
The slings and arrows of outrageous fortune,
Or to take arms against a sea of troubles,
And by opposing end them? To die—to sleep,
No more; and by a sleep to say we end
The heart-ache, and the thousand natural shocks
That flesh is heir to: ’tis a consummation
Devoutly to be wish’d. To die, to sleep.`,
    extractNote: 'Extract: the first 9 lines of a 33-line soliloquy. The text is not shortened inside the lines shown.',
    gloss: { slings: { en: 'weapons for throwing stones', ru: 'пращи', kz: 'салақтар (тас атқыш)' }, outrageous: { en: 'cruel, violent', ru: 'жестокий', kz: 'қатыгез' }, 'heir to': { en: 'must receive, inherit', ru: 'наследует', kz: 'мұрагер' }, consummation: { en: 'an ending, a completion', ru: 'завершение', kz: 'аяқталу' }, devoutly: { en: 'sincerely, deeply', ru: 'горячо, истово', kz: 'шын ниетпен' } },
    context: 'A soliloquy: Hamlet speaks his thoughts alone on stage. He weighs suffering against ending life. Teacher note: the speech is about death — introduce it with care and context.',
    image: { file: 'Hamlet et Horatio au cimetière - Eugène Delacroix - Musée du Louvre Peintures RF 1942.jpg', credit: 'Eugène Delacroix, Hamlet and Horatio in the Graveyard (1839), Musée du Louvre — public domain' },
    video: YT('6gZtW-U6qG4', 'Royal Shakespeare Company', 'Shakespeare Live! | To be, or not to be', 'A comic sketch in which famous actors argue about which word in "To be, or not to be" should be stressed. A perfect lesson on how stress changes meaning.'),
    videos: [YT('--tWffBTyqM', 'Royal Shakespeare Company', 'Hamlet | Act 3 Scene 1', 'A full RSC stage performance of the scene.'), YT('muLAzfQDS3M', 'Guardian Podcasts', 'Adrian Lester as Hamlet: "To be or not to be" | Shakespeare Solos', 'A close-up, conversational reading — good for shadowing.')],
    devices: ['soliloquy', 'metaphor ("a sea of troubles")', 'antithesis'], stressTask: true,
    reflect: 'Watch the RSC sketch. Say the first line four ways, stressing a different word each time. How does the meaning change?' },
  { id: 'sh-tomorrow', kind: 'speech', title: 'Tomorrow, and tomorrow, and tomorrow', play: 'Macbeth', ref: 'Act V, Scene V', src: 'shakespeare', speaker: 'Macbeth', level: 'C1', themes: ['time', 'death', 'meaning of life'],
    text: `She should have died hereafter.
There would have been a time for such a word.
Tomorrow, and tomorrow, and tomorrow,
Creeps in this petty pace from day to day,
To the last syllable of recorded time;
And all our yesterdays have lighted fools
The way to dusty death. Out, out, brief candle!
Life’s but a walking shadow; a poor player,
That struts and frets his hour upon the stage,
And then is heard no more: it is a tale
Told by an idiot, full of sound and fury,
Signifying nothing.`,
    gloss: { hereafter: { en: 'later, at another time', ru: 'позже', kz: 'кейінірек' }, petty: { en: 'small, unimportant', ru: 'мелкий', kz: 'ұсақ' }, struts: { en: 'walks proudly', ru: 'расхаживает важно', kz: 'кердеңдейді' }, frets: { en: 'worries', ru: 'терзается', kz: 'уайымдайды' } },
    context: 'Macbeth has just heard that the Queen (Lady Macbeth) is dead. Notice the theatre metaphor again ("a poor player… upon the stage") — compare it with Jaques’s "All the world’s a stage".',
    image: { file: 'Ellen Terry as Lady Macbeth.jpg', credit: 'J. S. Sargent, Ellen Terry as Lady Macbeth, 1889 — public domain' },
    video: YT('lP5WBs8_Y6Q', 'The Gaiety School of Acting – The National Theatre School of Ireland', 'Macbeth Act 5 Scene 5: "Tomorrow, Tomorrow.."', 'A drama-school performance — listen to how the repetition of "tomorrow" slows down.'),
    devices: ['metaphor', 'repetition', 'alliteration ("dusty death")'], reflect: 'Compare this speech with "All the world’s a stage". Which view of life is darker? Why?' },
  { id: 'sh-whats-in-a-name', kind: 'speech', title: 'What’s in a name?', play: 'Romeo and Juliet', ref: 'Act II, Scene II', src: 'shakespeare', speaker: 'Juliet', level: 'B2', extract: true, themes: ['love', 'identity', 'names'],
    text: `What’s Montague? It is nor hand nor foot,
Nor arm, nor face, nor any other part
Belonging to a man. O be some other name.
What’s in a name? That which we call a rose
By any other name would smell as sweet;
So Romeo would, were he not Romeo call’d,
Retain that dear perfection which he owes
Without that title. Romeo, doff thy name,
And for thy name, which is no part of thee,
Take all myself.`,
    extractNote: 'Extract from Juliet’s speech in the balcony scene; lines are complete.',
    gloss: { doff: { en: 'take off (like a hat)', ru: 'снять, сбросить', kz: 'шешу, тастау' }, owes: { en: 'here: owns, has (old sense)', ru: 'здесь: владеет', kz: 'мұнда: иеленеді' } },
    context: 'Juliet is a Capulet; Romeo is a Montague — their families are enemies. Common error: "Wherefore art thou Romeo?" earlier in this scene means "Why are you Romeo?", not "Where are you?"',
    image: { file: 'Frank Bernard Dicksee - Romeo and Juliet, 1884.jpg', credit: 'Frank Dicksee, Romeo and Juliet — the balcony scene (1884) — public domain' },
    video: YT('NzijWfz6lGQ', "Shakespeare's Globe", '"What’s in a name?" | Act II scene 2 | Romeo and Juliet (2025)', 'Juliet’s lines performed at the Globe.'),
    videos: [YT('MBFnSd4tC9U', 'BBC Bitesize for Teachers', 'Act 2 Scene 2: The balcony scene | Shakespeare Unlocked', 'The whole balcony scene with clear staging — helpful for context.')],
    devices: ['rhetorical question', 'metaphor (rose)'], reflect: 'Does a name change what someone is? Give an example from your own life or language.' },
  { id: 'sh-quality-mercy', kind: 'speech', title: 'The quality of mercy', play: 'The Merchant of Venice', ref: 'Act IV, Scene I', src: 'shakespeare', speaker: 'Portia', level: 'C1', extract: true, themes: ['justice', 'mercy'],
    text: `The quality of mercy is not strain’d,
It droppeth as the gentle rain from heaven
Upon the place beneath. It is twice blest,
It blesseth him that gives and him that takes.
’Tis mightiest in the mightiest; it becomes
The throned monarch better than his crown.`,
    extractNote: 'Extract: the first 6 lines of Portia’s speech.',
    gloss: { "strain’d": { en: 'forced', ru: 'вынужденный', kz: 'мәжбүрлі' }, droppeth: { en: 'drops (old form)', ru: 'нисходит (устар.)', kz: 'тамады (көне)' }, becomes: { en: 'here: suits, looks good on', ru: 'здесь: подобает', kz: 'мұнда: жарасады' } },
    image: { file: 'Edward Alcock - Portia and Shylock, from Shakespeare\'s "The Merchant of Venice", IV, i - Google Art Project.jpg', credit: 'Edward Alcock, Portia and Shylock, from The Merchant of Venice — public domain' },
    context: 'In a court scene Portia, disguised as a lawyer, asks Shylock to show mercy. Notice the old verb endings -eth (droppeth, blesseth) = modern -s.',
    devices: ['simile', 'paradox'], reflect: 'Change "droppeth" and "blesseth" into modern English. What else would you change?' },
  { id: 'sh-revels', kind: 'speech', title: 'Our revels now are ended', play: 'The Tempest', ref: 'Act IV, Scene I', src: 'shakespeare', speaker: 'Prospero', level: 'C1', extract: true, themes: ['dreams', 'theatre', 'life'],
    text: `Our revels now are ended. These our actors,
As I foretold you, were all spirits and
Are melted into air, into thin air:
And, like the baseless fabric of this vision,
The cloud-capp’d towers, the gorgeous palaces,
The solemn temples, the great globe itself,
Yea, all which it inherit, shall dissolve,
And, like this insubstantial pageant faded,
Leave not a rack behind. We are such stuff
As dreams are made on, and our little life
Is rounded with a sleep.`,
    extractNote: 'Extract from Prospero’s speech; lines are complete.',
    gloss: { revels: { en: 'entertainments, celebrations', ru: 'празднества', kz: 'той-думан' }, baseless: { en: 'without foundation', ru: 'беспочвенный', kz: 'негізсіз' }, pageant: { en: 'a show, a spectacle', ru: 'зрелище', kz: 'көрініс' }, rack: { en: 'a wisp of cloud', ru: 'клочок облака', kz: 'бұлт үзігі' } },
    context: '"The great globe itself" means the whole world — and also, perhaps, the Globe Theatre. "Into thin air" became an everyday English idiom from this speech.',
    image: { file: 'William Hogarth 017.jpg', credit: 'William Hogarth, a scene from The Tempest (c. 1735) — public domain' },
    devices: ['metaphor', 'pun ("globe")'], idiom: 'into thin air', reflect: 'Use "into thin air" in a sentence about something you lost.' },
  { id: 'sh-winter-song', kind: 'song', title: 'When icicles hang by the wall (Winter)', play: "Love's Labour's Lost", ref: 'OBEV No. 126 — song at the end of the play', src: 'obev', speaker: 'Song (Winter)', level: 'B2', themes: ['seasons', 'country life', 'sound'],
    text: `When icicles hang by the wall,
  And Dick the shepherd blows his nail,
And Tom bears logs into the hall,
  And milk comes frozen home in pail,
When blood is nipp’d, and ways be foul,
Then nightly sings the staring owl,
            To-whit!
To-who!--a merry note.
While greasy Joan doth keel the pot.

When all aloud the wind doth blow,
  And coughing drowns the parson’s saw,
And birds sit brooding in the snow,
  And Marian’s nose looks red and raw,
When roasted crabs hiss in the bowl,
Then nightly sings the staring owl,
            To-whit!
To-who!--a merry note,
While greasy Joan doth keel the pot.`,
    gloss: { 'blows his nail': { en: 'blows on his fingers to warm them', ru: 'дует на пальцы, чтобы согреть', kz: 'саусағын үрлеп жылытады' }, "nipp’d": { en: 'bitten by cold', ru: 'прихвачен морозом', kz: 'аяз қарыған' }, keel: { en: 'to skim, stir (OBEV note: "keel] skim")', ru: 'снимать пену', kz: 'көбігін алу' }, saw: { en: 'a wise saying (here, the priest’s sermon)', ru: 'поучение', kz: 'өсиет сөз' }, crabs: { en: 'crab apples (small sour apples)', ru: 'дикие яблоки', kz: 'жабайы алма' } },
    image: { file: 'Shakespeare Droeshout 1623 From the First Folio Edition.jpg', credit: 'Martin Droeshout’s engraving of Shakespeare, First Folio (1623) — public domain' },
    context: 'A song full of everyday winter details from an English village: real names, real chores, real sounds. "To-whit! To-who!" imitates the owl — onomatopoeia.',
    devices: ['onomatopoeia', 'refrain', 'imagery'], reflect: 'Make a list of winter sounds and sights where you live. Could they be a song?' },
  { id: 'sh-greenwood', kind: 'song', title: 'Under the Greenwood Tree', play: 'As You Like It', ref: 'OBEV No. 135 (Act II, Scene V)', src: 'obev', speaker: 'Amiens; Jaques replies', level: 'B2', themes: ['nature', 'freedom', 'parody'],
    text: `Amiens sings:

Under the greenwood tree,
  Who loves to lie with me,
And turn his merry note
Unto the sweet bird’s throat,
Come hither, come hither, come hither:
    Here shall he see
    No enemy
But winter and rough weather.

  Who doth ambition shun,
  And loves to live i’ the sun,
  Seeking the food he eats,
  And pleased with what he gets,
Come hither, come hither, come hither:
    Here shall he see
    No enemy
But winter and rough weather.

Jaques replies:

  If it do come to pass
  That any man turn ass,
  Leaving his wealth and ease
  A stubborn will to please,
Ducdamè, ducdamè, ducdamè:
    Here shall he see
    Gross fools as he,
An if he will come to me.`,
    gloss: { greenwood: { en: 'a forest in summer', ru: 'зелёный лес', kz: 'жасыл орман' }, hither: { en: 'here, to this place (old)', ru: 'сюда (устар.)', kz: 'бері (көне)' }, shun: { en: 'avoid', ru: 'избегать', kz: 'аулақ болу' }, 'An if': { en: 'if (old)', ru: 'если (устар.)', kz: 'егер (көне)' } },
    image: { file: "Daniel Maclise (1806-1870) - Phoebe and Silvius in the Forest of Arden, from Shakespeare's 'As You Like It' - P320-76 - The New Art Gallery Walsall.jpg", credit: 'Daniel Maclise, Phoebe and Silvius in the Forest of Arden, from As You Like It — public domain' },
    context: 'A song and its parody. Amiens praises simple life in the forest; Jaques mocks it with the same pattern. "Ducdamè" is a nonsense word — scholars still debate it. Speaker labels are printed in the source (italic in OBEV).',
    devices: ['refrain', 'parody'], reflect: 'Write your own parody stanza: keep the pattern, change the message.' },
  /* ---------- famous lines (short, verified in context) ---------- */
  { id: 'fl-winter-discontent', kind: 'line', title: 'Now is the winter of our discontent', play: 'Richard III', ref: 'Act I, Scene I (opening lines)', src: 'shakespeare', speaker: 'Richard, Duke of Gloucester', level: 'C1', extract: true,
    text: `Now is the winter of our discontent
Made glorious summer by this son of York;
And all the clouds that loured upon our house
In the deep bosom of the ocean buried.`,
    gloss: { discontent: { en: 'unhappiness', ru: 'недовольство', kz: 'наразылық' }, loured: { en: 'looked dark and threatening', ru: 'нависали мрачно', kz: 'түнеріп тұрды' } },
    context: 'Often quoted wrongly as if it meant "this is a bad time". The full sentence says the opposite: the winter HAS BEEN made "glorious summer". A pun: "son/sun of York" (the king’s emblem was a sun).',
    misquote: 'Quoted alone, line 1 sounds sad; read with line 2 it is triumphant.' },
  { id: 'fl-music-food', kind: 'line', title: 'If music be the food of love, play on', play: 'Twelfth Night', ref: 'Act I, Scene I (opening lines)', src: 'shakespeare', speaker: 'Orsino (the Duke)', level: 'B2', extract: true,
    text: `If music be the food of love, play on,
Give me excess of it; that, surfeiting,
The appetite may sicken and so die.`,
    gloss: { surfeiting: { en: 'having too much', ru: 'пресыщаясь', kz: 'тойып-жеріп' } },
    context: 'The first line of the play. Orsino wants so much music that his hunger for love will "die" from too much food. "If music be" uses the old subjunctive (modern: "If music is").',
    image: { file: 'Johann Heinrich Ramberg - Olivia, Maria and Malvolio from "Twelfth Night," Act III, Scene iv - Google Art Project.jpg', credit: 'Johann Heinrich Ramberg, Olivia, Maria and Malvolio from Twelfth Night (1789) — public domain' } },
  { id: 'fl-greatness', kind: 'line', title: 'Some are born great…', play: 'Twelfth Night', ref: 'Act II, Scene V', src: 'shakespeare', speaker: 'Malvolio, reading a letter', level: 'B2', extract: true,
    text: `be not afraid of greatness. Some are born great, some achieve
greatness, and some have greatness thrust upon ’em.`,
    gloss: { achieve: { en: 'reach by effort', ru: 'достигать', kz: 'қол жеткізу' }, thrust: { en: 'pushed suddenly', ru: 'навязано', kz: 'тықпаланған' } },
    context: 'Attribution note: Malvolio reads this aloud from a fake love letter written by Maria to trick him. Shakespeare wrote it, but inside the play it is a joke, not wisdom. Prose, not verse; italic in the source because it is a letter.' },
  { id: 'fl-glisters', kind: 'line', title: 'All that glisters is not gold', play: 'The Merchant of Venice', ref: 'Act II, Scene VII', src: 'shakespeare', speaker: 'Prince of Morocco, reading a scroll', level: 'B1', extract: true,
    text: `All that glisters is not gold,
Often have you heard that told.`,
    gloss: { glisters: { en: 'shines, sparkles (old)', ru: 'блестит (устар.)', kz: 'жылтырайды (көне)' } },
    context: 'Misquote alert: people usually say "All that glitters is not gold". Shakespeare’s text has "glisters". The second line shows that it was already a proverb in his time ("Often have you heard that told").',
    misquote: '"glitters" (popular) vs. "glisters" (Shakespeare’s text)' },
  { id: 'fl-brevity', kind: 'line', title: 'Brevity is the soul of wit', play: 'Hamlet', ref: 'Act II, Scene II', src: 'shakespeare', speaker: 'Polonius', level: 'B2', extract: true,
    text: `Therefore, since brevity is the soul of wit,
And tediousness the limbs and outward flourishes,
I will be brief.`,
    gloss: { brevity: { en: 'being short', ru: 'краткость', kz: 'қысқалық' }, wit: { en: 'here: intelligence', ru: 'здесь: ум', kz: 'мұнда: ақыл' }, tediousness: { en: 'being long and boring', ru: 'занудство', kz: 'іш пыстырарлық' } },
    context: 'The irony: Polonius says this in the middle of a very long, wordy speech. Today "Brevity is the soul of wit" is used seriously.' },
  { id: 'fl-borrower', kind: 'line', title: 'Neither a borrower nor a lender be', play: 'Hamlet', ref: 'Act I, Scene III', src: 'shakespeare', speaker: 'Polonius, advising his son Laertes', level: 'B2', extract: true,
    text: `Neither a borrower nor a lender be:
For loan oft loses both itself and friend;
And borrowing dulls the edge of husbandry.
This above all: to thine own self be true;
And it must follow, as the night the day,
Thou canst not then be false to any man.`,
    gloss: { oft: { en: 'often', ru: 'часто', kz: 'жиі' }, husbandry: { en: 'careful use of money', ru: 'бережливость', kz: 'үнемшілдік' } },
    context: 'Father’s advice before a journey. "To thine own self be true" is now a common motto. Notice the inversion: "Neither a borrower nor a lender be" = "Be neither a borrower nor a lender".' },
  { id: 'fl-course-true-love', kind: 'line', title: 'The course of true love never did run smooth', play: "A Midsummer Night's Dream", ref: 'Act I, Scene I', src: 'shakespeare', speaker: 'Lysander', level: 'B1', extract: true,
    text: `Ay me! For aught that I could ever read,
Could ever hear by tale or history,
The course of true love never did run smooth.`,
    gloss: { aught: { en: 'anything', ru: 'что-либо', kz: 'бірдеңе' }, course: { en: 'the path, the way something goes', ru: 'течение', kz: 'ағыс, жол' } },
    image: { file: "Midsummer Night's Dream Henry Fuseli.jpg", credit: 'Henry Fuseli, Titania and Bottom, from A Midsummer Night’s Dream — public domain' },
    context: 'Lysander comforts Hermia: in every story they have read, true love has problems. The image is a river ("course", "run smooth").' },
  { id: 'fl-valour', kind: 'line', title: 'The better part of valour is discretion', play: 'Henry IV, Part 1', ref: 'Act V, Scene IV', src: 'shakespeare', speaker: 'Falstaff', level: 'C1', extract: true,
    text: `The better part of valour is
discretion, in the which better part I have saved my life.`,
    gloss: { valour: { en: 'courage', ru: 'доблесть', kz: 'ерлік' }, discretion: { en: 'careful judgement', ru: 'благоразумие', kz: 'байыптылық' } },
    context: 'Comic context: Falstaff says this after pretending to be dead on the battlefield to escape fighting. The line break follows the prose of the printed source.' },
  { id: 'fl-love-all', kind: 'line', title: 'Love all, trust a few', play: "All's Well That Ends Well", ref: 'Act I, Scene I', src: 'shakespeare', speaker: 'The Countess, advising her son Bertram', level: 'B1', extract: true,
    text: `Love all, trust a few,
Do wrong to none.`,
    gloss: {},
    context: 'A mother’s blessing to her son as he leaves home. In the source the words begin in the middle of a verse line ("…Share with thy birthright! Love all, trust a few, / Do wrong to none."). Compare with the proverb "All’s well that ends well" in Wise Words — it is the title of this play.' }
];
SHAKESPEARE.forEach(s => { s.strand = 'shakespeare'; s.author = 'shakespeare'; s.era = 'renaissance'; s.origin = 'England'; s.form = { sonnet: 'Sonnet', speech: 'Dramatic speech', song: 'Song from a play', line: 'Famous line' }[s.kind]; s.rights = 'A'; s.rightsNote = 'Shakespeare (d. 1616); text from a public-domain edition (not Folger).'; });

/* ---------------- ERAS & TOOLKIT (platform-written explanations) ---------------- */
const ERAS = [
  { id: 'traditional', name: 'Oral & traditional', dates: 'before print → 19th-century collections', color: '#8a6d3b', desc: 'Rhymes, proverbs and tongue twisters passed from mouth to mouth. Collectors such as Halliwell (1842) printed them, which is why we can quote them exactly today.', voices: ['traditional', 'halliwell'] },
  { id: 'renaissance', name: 'Renaissance (Elizabethan & Jacobean)', dates: 'c. 1550–1625', color: '#7a2e2e', desc: 'The age of the public theatres in London. Shakespeare’s English uses thou/thee, -eth verb endings and iambic pentameter. Donne’s Holy Sonnets argue with God and Death.', voices: ['shakespeare', 'donne'] },
  { id: 'seventeenth', name: '17th-century lyric', dates: 'c. 1625–1660', color: '#4f5d2f', desc: 'Short, musical poems on love and time. Herrick’s "carpe diem" (seize the day) poems are typical.', voices: ['herrick'] },
  { id: 'romantic', name: 'Romantic', dates: 'c. 1785–1832', color: '#2f5d62', desc: 'Nature, feeling, imagination and the individual voice. Poets moved towards "the real language of men" — good news for learners.', voices: ['blake', 'burns', 'wordsworth', 'byron', 'shelley', 'keats'] },
  { id: 'victorian', name: 'Victorian', dates: '1837–1901', color: '#4b3f72', desc: 'Strong rhythms, nonsense verse, poems for children, and religious and moral questions.', voices: ['tennyson', 'lear', 'rossetti', 'stevenson'] },
  { id: 'modern', name: 'Early 20th century', dates: 'c. 1900–1930', color: '#3d5a80', desc: 'War, crisis and new voices from across the English-speaking world: Ireland, Canada and the USA.', voices: ['yeats', 'mccrae', 'teasdale'] },
  { id: 'american19', name: '19th-century American', dates: 'c. 1830–1900', color: '#6b4226', desc: 'English-language poetry from the USA. Dickinson’s short, compressed poems broke many rules of her time.', voices: ['dickinson'] }
];

const DEVICES = [
  { term: 'Rhyme', def: 'Words that end with the same sound: cloud / crowd, day / May.', try: 'po-daffodils' },
  { term: 'Rhythm & stress', def: 'The beat of a line, made by stressed and unstressed syllables. English poetry is built on stress.', try: 'r-pat-a-cake' },
  { term: 'Iambic pentameter', def: 'A line of five "da-DUM" units (iambs). The main line of Shakespeare’s verse.', try: 'sh-sonnet-18' },
  { term: 'Alliteration', def: 'Several words close together starting with the same sound: Peter Piper picked a peck…', try: 't-peter-piper' },
  { term: 'Simile', def: 'A comparison with "like" or "as": lonely as a cloud.', try: 'po-daffodils' },
  { term: 'Metaphor', def: 'Saying one thing IS another: Hope is the thing with feathers.', try: 'po-hope' },
  { term: 'Personification', def: 'Giving human qualities to a thing or idea: Death "kindly stopped for me".', try: 'po-chariot' },
  { term: 'Onomatopoeia', def: 'A word that imitates a sound: To-whit! To-who!', try: 'sh-winter-song' },
  { term: 'Refrain', def: 'A line or phrase repeated at the end of stanzas.', try: 'sh-greenwood' },
  { term: 'Inversion', def: 'Unusual word order for emphasis or rhyme: Dark brown is the river.', try: 'po-where-go-boats' },
  { term: 'Apostrophe', def: 'Speaking directly to someone absent or to an idea: "Death, be not proud".', try: 'po-death' },
  { term: 'Paradox', def: 'A statement that seems impossible but holds a truth: The Child is father of the Man.', try: 'po-rainbow' },
  { term: 'Limerick', def: 'A five-line comic poem rhyming AABBA, with a bouncing rhythm.', try: 'l-beard' },
  { term: 'Sonnet', def: 'A 14-line poem. Shakespearean: ABAB CDCD EFEF GG. Petrarchan: 8 lines + 6 lines with a turn.', try: 'po-remember' },
  { term: 'Soliloquy', def: 'A speech in a play where a character speaks their thoughts alone.', try: 'sh-to-be' },
  { term: 'Archaism', def: 'An old word or form kept in a text: thou, thee, doth, -eth, ’tis.', try: 'sh-quality-mercy' }
];

const ALL_ITEMS = [].concat(RHYMES, TWISTERS, LIMERICKS, PROVERBS, POEMS, SHAKESPEARE);

/* ============================================================
   ENGLISH LITERATURE · Just To Study — v2 interface
   Discover → Experience → Explore → Practise
   ============================================================ */

/* ============================================================
   EXPANSION (Nov 2026) — data merge. Every literary text in d-x was
   extracted programmatically, word for word, from the named Project
   Gutenberg edition. Glosses, notes, meanings and prompts are
   platform-written and labelled as such in the interface.
   ============================================================ */
const X = lwData('x');
Object.assign(SOURCES, X.sources);
const AIMG = {
  marlowe: ['Marlowe-Portrait-1585.jpg', 'Portrait at Corpus Christi College, Cambridge, 1585, believed to show Marlowe — public domain'],
  jonson: ['Benjamin Jonson by Abraham van Blyenberch.jpg', 'Abraham van Blyenberch, Ben Jonson, c. 1617 — public domain'],
  milton: ['John Milton - Project Gutenberg eText 13619.jpg', 'Engraved portrait of John Milton (from Project Gutenberg eText 13619) — public domain'],
  coleridge: ['Samuel Taylor Coleridge by Washington Allston.jpg', 'Washington Allston, Samuel Taylor Coleridge, 1814 — public domain'],
  poe: ['Edgar Allan Poe, circa 1849, restored, squared off.jpg', 'Daguerreotype of Edgar Allan Poe, 1849 — public domain'],
  whitman: ['Walt Whitman, steel engraving, July 1854.jpg', 'Walt Whitman, steel engraving, 1854 — public domain'],
  browning: ['Robert Browning by Michele Gordigiani 1858.jpg', 'Michele Gordigiani, Robert Browning, 1858 — public domain'],
  ebb: ['Elizabeth Barrett Browning by Michele Gordigiani 1858.jpg', 'Michele Gordigiani, Elizabeth Barrett Browning, 1858 — public domain'],
  emilybronte: ['Emily Brontë by Patrick Branwell Brontë restored.jpg', 'Branwell Brontë, Emily Brontë, c. 1833 — public domain'],
  hopkins: ['Gerard Manley Hopkins.jpg', 'Gerard Manley Hopkins, photograph — public domain'],
  kipling: ['Rudyard Kipling (portrait).jpg', 'Rudyard Kipling — public domain'],
  hardy: ['Thomas Hardy by William Strang 1893.jpg', 'William Strang, Thomas Hardy, 1893 — public domain'],
  housman: ['Alfred Edward Housman.jpg', 'A. E. Housman — public domain'],
  brooke: ['Rupert Brooke Q 71073.jpg', 'Rupert Brooke, 1913, Imperial War Museum Q 71073 — public domain'],
  carroll: ['LewisCarrollSelfPhoto.jpg', 'Lewis Carroll (Charles Dodgson), self-portrait photograph, c. 1856 — public domain'],
  arnold: ['Matthew Arnold - Project Gutenberg eText 16745.jpg', 'Matthew Arnold (from Project Gutenberg eText 16745) — public domain'],
  herbert: ['George Herbert.jpg', 'George Herbert, engraved portrait — public domain'],
};
Object.entries(X.authors).forEach(([k, a]) => { const im = AIMG[k]; AUTHORS[k] = Object.assign({ img: im ? im[0] : null, imgCredit: im ? im[1] : '' }, a); });
const DIED = { marlowe: 1593, raleigh: 1618, jonson: 1637, donne: 1631, herbert: 1633, milton: 1674, lovelace: 1657, gray: 1771, burns: 1796, wordsworth: 1850, coleridge: 1834, shelley: 1822, keats: 1821, byron: 1824, poe: 1849, whitman: 1892, tennyson: 1892, browning: 1889, ebb: 1861, emilybronte: 1848, arnold: 1888, hopkins: 1889, henley: 1903, yeats: 1939, blake: 1827, carroll: 1898, housman: 1936, kipling: 1936, hardy: 1928, brooke: 1915 };
ERAS.splice(ERAS.findIndex(e => e.id === 'romantic'), 0, { id: 'eighteenth', name: '18th century', dates: 'c. 1700–1785', color: '#1F4D55', desc: 'The age of reason and of the “graveyard” poets. Thomas Gray’s Elegy gave English several of its best-known phrases.', voices: ['gray'] });
const _addVoice = (era, a) => { const e = ERAS.find(x => x.id === era); if (e && !e.voices.includes(a)) e.voices.push(a); };
const PIMG = { 'po-shalott': ['John William Waterhouse - The Lady of Shalott - Google Art Project.jpg', 'John William Waterhouse, The Lady of Shalott (1888), Tate — public domain'], 'po-jabberwocky': ['Jabberwocky.jpg', 'John Tenniel, the Jabberwock, from Through the Looking-Glass (1871) — public domain'], 'po-o-captain': ['Abraham Lincoln O-77 matte collodion print.jpg', 'Abraham Lincoln, photograph, 1863 — public domain'] };
X.poems.forEach(p => {
  if (PIMG[p.id]) p.image = { file: PIMG[p.id][0], credit: PIMG[p.id][1] };
  Object.assign(p, { strand: 'poems', rights: 'A', rightsNote: p.author === 'traditional' ? 'Traditional ballad; the printed edition is in the public domain.' : 'Author died ' + DIED[p.author] + '; this edition is in the public domain.' });
  POEMS.push(p); if (p.author !== 'traditional') _addVoice(p.era, p.author);
});
X.shakespeare.forEach(s => { Object.assign(s, { strand: 'shakespeare', author: 'shakespeare', era: 'renaissance', origin: 'England', form: { sonnet: 'Sonnet', speech: 'Dramatic speech', song: 'Song from a play', line: 'Famous line' }[s.kind], rights: 'A', rightsNote: 'Shakespeare (d. 1616); text from a public-domain edition (not Folger).' }); SHAKESPEARE.push(s); });
X.proverbs.forEach(p => PROVERBS.push(Object.assign(p, { strand: 'wise', author: 'traditional', form: 'Proverb', era: 'traditional', origin: 'Traditional (English)', src: 'preston', ref: 'Entry ' + p.no, title: p.text, rights: 'A', rightsNote: 'Proverbs are traditional; the printed dictionary is in the public domain. Meanings are platform-written.' })));
X.twisters.forEach(t => TWISTERS.push(Object.assign(t, { strand: 'say', author: 'traditional', form: 'Tongue twister', era: 'traditional', origin: 'Anonymous (printed in Philadelphia, 1836)', src: 'peterpiper', ref: 'Letter ' + t.letter, rights: 'A', rightsNote: 'Anonymous 19th-century printed text; public domain.' })));
X.limericks.forEach(l => LIMERICKS.push(Object.assign(l, { strand: 'say', author: 'lear', form: 'Limerick', era: 'victorian', origin: 'England', src: 'lear', ref: 'No. ' + l.no, scheme: 'AABBA', rights: 'A', rightsNote: 'Author died 1888; public domain worldwide.' })));
/* Human recordings from Wikimedia Commons — each file confirmed on Commons (licence read from the file page) and its MP3 transcode fetched successfully on 13 Nov 2026. */
const XAUD = {"po-raven": [["https://upload.wikimedia.org/wikipedia/commons/b/b5/LibriVox_-_The_Raven_-_Chris_Goringe.ogg", "Chris Goringe (LibriVox)", "Public domain", ""], ["https://upload.wikimedia.org/wikipedia/commons/0/0d/Edgar_Allan_Poe_-_The_Raven.ogg", "Fergus Ross Ferrier", "CC BY-SA 3.0", "Recorded in Edinburgh, 2014 — a Scottish voice."]], "po-annabel-lee": [["https://upload.wikimedia.org/wikipedia/commons/0/05/Annabel_Lee.ogg", "PopularOutcast (Wikisource reader)", "CC BY-SA 3.0", ""]], "po-shalott": [["https://upload.wikimedia.org/wikipedia/commons/1/1e/The_Lady_of_Shalott.ogg", "Schnitzella", "Public domain", ""]], "po-jabberwocky": [["https://upload.wikimedia.org/wikipedia/commons/0/0c/Jabberwocky-UK.ogg", "Vanderdecken (British English)", "CC0", ""], ["https://upload.wikimedia.org/wikipedia/commons/b/b4/Jabberwocky.ogg", "Dvortygirl (American English)", "Public domain", "Compare how the two readers pronounce the invented words."]], "po-invictus": [["https://upload.wikimedia.org/wikipedia/commons/4/49/Invictus.ogg", "Neil Carmichael", "CC BY-SA 4.0", ""]], "po-innisfree": [["https://upload.wikimedia.org/wikipedia/commons/8/8d/Lake_Isle_of_Innisfree.ogg", "Neil Carmichael", "CC BY-SA 4.0", ""]], "po-when-you-are-old": [["https://upload.wikimedia.org/wikipedia/commons/e/ed/William_Butler_Yeats_-_When_You_Are_Old.wav", "Mladen Gavrić", "CC BY-SA 4.0", ""]], "po-if": [["https://upload.wikimedia.org/wikipedia/commons/1/1f/If_kipling_apc.ogg", "Annie Coleman (LibriVox)", "Public domain", ""], ["https://upload.wikimedia.org/wikipedia/commons/b/b6/If_kipling_ce.ogg", "Catharine Eastman (LibriVox)", "Public domain", ""]], "po-sick-rose": [["https://upload.wikimedia.org/wikipedia/commons/9/97/Songs_of_innocence_and_experience_the_sick_rose_blake.ogg", "Chip (LibriVox)", "Public domain", ""]], "po-o-captain": [["https://upload.wikimedia.org/wikipedia/commons/f/f8/LibriVox_-_O_Captain%21_My_Captain%21_-_Annie_Coleman.ogg", "Annie Coleman (LibriVox)", "Public domain", ""]], "l-2": [["https://upload.wikimedia.org/wikipedia/commons/9/97/There_was_a_Young_Lady_of_Ryde.ogg", "Neil Carmichael", "CC BY-SA 4.0", ""]], "l-3": [["https://upload.wikimedia.org/wikipedia/commons/9/97/There_was_an_Old_Man_with_a_nose.ogg", "Neil Carmichael", "CC BY-SA 4.0", ""]], "l-12": [["https://upload.wikimedia.org/wikipedia/commons/e/e3/There_was_a_Young_Lady_whose_chin.ogg", "Neil Carmichael", "CC BY-SA 4.0", ""]], "l-16": [["https://upload.wikimedia.org/wikipedia/commons/f/f2/There_was_a_Young_Lady_of_Portugal.ogg", "Neil Carmichael", "CC BY-SA 4.0", ""]], "l-23": [["https://upload.wikimedia.org/wikipedia/commons/a/af/There_was_an_Old_Man_of_the_Isles.ogg", "Neil Carmichael", "CC BY-SA 4.0", ""]], "l-106": [["https://upload.wikimedia.org/wikipedia/commons/f/fa/There_was_an_Old_Person_of_Burton.ogg", "Neil Carmichael", "CC BY-SA 4.0", ""]], "l-111": [["https://upload.wikimedia.org/wikipedia/commons/8/8e/There_was_an_Old_Man_on_whose_nose.ogg", "Neil Carmichael", "CC BY-SA 4.0", ""]]};
Object.entries(XAUD).forEach(([id, L]) => { const it = [].concat(POEMS, LIMERICKS).find(x => x.id === id); if (it) it.audio = L.map(a => CA(a[0], a[1], a[2], a[3])); });
const RIDDLES = X.riddles.map(r => Object.assign(r, { strand: 'say', author: 'traditional', form: 'Riddle', era: 'traditional', origin: 'Traditional (England, as collected)', src: 'halliwell', rights: 'A', rightsNote: 'Traditional; Halliwell’s 1842 collection is in the public domain.', context: 'A traditional riddle from the “Riddles” class of Halliwell’s Nursery Rhymes of England. The 1842 book prints the answer in brackets above each riddle — we hide it until you have guessed (see Practise).' }));
// sort new Peter Piper letters into alphabetical order with the existing ones
TWISTERS.sort((a, b) => (a.src === 'halliwell') - (b.src === 'halliwell') || (a.letter || '').localeCompare(b.letter || ''));

const UI = {
  en: { poetry: 'Poetry', shakespeare: 'Shakespeare', rhymes: 'Rhymes & Sound', proverbs: 'Proverbs', allLevels: 'All levels', experience: 'Experience', explore: 'Explore', practise: 'Practise',
    listen: 'Listen', readBy: 'read by', story: 'The story behind it', words: 'Words', closer: 'Look closer', say: 'Say it aloud', think: 'Think about it', source: 'Text', more: 'more', less: 'less',
    record: 'Record', stop: 'Stop', recHint: 'Your recording stays on this device.', reset: 'Start again', wellDone: 'Exactly as the author wrote it.', tryAgain: 'Not quite — try again.', check: 'Check',
    watch: 'Watch it performed', openYT: 'Open on YouTube', back: 'Back', next: 'Next', prev: 'Previous', meaning: 'What it means', rebuild: 'Rebuild the proverb', useIt: 'Use it in real life', reveal: 'Tap to reveal',
    tapWord: 'Tap a dotted word for help', learnerNote: 'Learner note', support: 'Help in', enter: 'Enter', startPoem: 'Start with a poem', chooseLevel: 'Choose your level', rooms: 'Six ways in', voices: 'Voices across the centuries', featured: 'A voice to begin with',
    noRec: 'This recording could not load right now.', items: 'texts', about: 'About these texts', order: 'Order the lines', missing: 'Missing rhyme', scheme: 'Rhyme map', clap: 'Clap the beat', ladder: 'Speed ladder', stressT: 'Which word?', seq: 'Seven ages', dialogue: 'Two voices', halves: 'Match the halves' },
  kz: { poetry: 'Поэзия', shakespeare: 'Шекспир', rhymes: 'Тақпақ пен дыбыс', proverbs: 'Мақал-мәтелдер', allLevels: 'Барлық деңгей', experience: 'Тыңда және оқы', explore: 'Зертте', practise: 'Жаттық',
    listen: 'Тыңда', readBy: 'оқыған', story: 'Шығарманың тарихы', words: 'Сөздер', closer: 'Жақынырақ қара', say: 'Дауыстап айт', think: 'Ойлан', source: 'Мәтін', more: 'толығырақ', less: 'жасыру',
    record: 'Жазу', stop: 'Тоқтату', recHint: 'Жазбаң тек осы құрылғыда сақталады.', reset: 'Қайта бастау', wellDone: 'Автор жазғандай дәл.', tryAgain: 'Әлі емес — қайта көр.', check: 'Тексеру',
    watch: 'Қойылымды көр', openYT: 'YouTube-та ашу', back: 'Артқа', next: 'Келесі', prev: 'Алдыңғы', meaning: 'Мағынасы', rebuild: 'Мақалды құрастыр', useIt: 'Өмірде қолдан', reveal: 'Көру үшін бас',
    tapWord: 'Көмек үшін нүктелі сөзді бас', learnerNote: 'Оқушыға түсініктеме', support: 'Көмек тілі', enter: 'Кіру', startPoem: 'Өлеңнен баста', chooseLevel: 'Деңгейіңді таңда', rooms: 'Алты есік', voices: 'Ғасырлар дауысы', featured: 'Бастау үшін бір дауыс',
    noRec: 'Жазба қазір жүктелмеді.', items: 'мәтін', about: 'Мәтіндер туралы', order: 'Жолдарды реттеу', missing: 'Жетіспейтін ұйқас', scheme: 'Ұйқас картасы', clap: 'Ырғақты соқ', ladder: 'Жылдамдық', stressT: 'Қай сөз?', seq: 'Жеті кезең', dialogue: 'Екі дауыс', halves: 'Бөліктерді сәйкестендір' },
  ru: { poetry: 'Поэзия', shakespeare: 'Шекспир', rhymes: 'Стишки и звуки', proverbs: 'Пословицы', allLevels: 'Все уровни', experience: 'Слушать и читать', explore: 'Исследовать', practise: 'Практика',
    listen: 'Слушать', readBy: 'читает', story: 'История произведения', words: 'Слова', closer: 'Присмотрись', say: 'Скажи вслух', think: 'Подумай', source: 'Текст', more: 'подробнее', less: 'скрыть',
    record: 'Запись', stop: 'Стоп', recHint: 'Запись остаётся только на этом устройстве.', reset: 'Сначала', wellDone: 'Точно как у автора.', tryAgain: 'Не совсем — попробуйте ещё.', check: 'Проверить',
    watch: 'Смотреть постановку', openYT: 'Открыть на YouTube', back: 'Назад', next: 'Дальше', prev: 'Назад', meaning: 'Смысл', rebuild: 'Собери пословицу', useIt: 'Используй в жизни', reveal: 'Нажмите, чтобы открыть',
    tapWord: 'Нажмите на подчёркнутое слово', learnerNote: 'Пояснение для ученика', support: 'Подсказки на', enter: 'Войти', startPoem: 'Начать со стихотворения', chooseLevel: 'Выберите уровень', rooms: 'Шесть входов', voices: 'Голоса веков', featured: 'Голос для начала',
    noRec: 'Запись сейчас не загрузилась.', items: 'текстов', about: 'Об этих текстах', order: 'Порядок строк', missing: 'Пропущенная рифма', scheme: 'Карта рифм', clap: 'Прохлопай ритм', ladder: 'Скорость', stressT: 'Какое слово?', seq: 'Семь возрастов', dialogue: 'Два голоса', halves: 'Соедини половинки' }
};
let LANG = LW_LANG0.lang, SUP = LW_LANG0.sup, LEVEL = '';
const t = k => (UI[LANG] && UI[LANG][k]) || UI.en[k] || k;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = ROOT) => r.querySelector(s);
const $$ = (s, r = ROOT) => [...r.querySelectorAll(s)];
const ALL = [].concat(RHYMES, TWISTERS, LIMERICKS, RIDDLES, PROVERBS, POEMS, SHAKESPEARE);
const BY = Object.fromEntries(ALL.map(i => [i.id, i]));
const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LV_NOTE = { A0: 'sound & rhythm', A1: 'first rhymes', A2: 'short poems', B1: 'lyrics & lines', B2: 'sonnets & speeches', C1: 'close reading', C2: 'complex poems' };
const ERA_ORDER = ['traditional', 'renaissance', 'seventeenth', 'eighteenth', 'romantic', 'american19', 'victorian', 'modern'];
const ROOM_OF = { poems: 'poetry', shakespeare: 'shakespeare', rhymes: 'rhymes', say: 'rhymes', wise: 'proverbs' };
const ICON = { play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>', pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>' };
const DEVDEF = Object.fromEntries(DEVICES.map(d => [d.term.toLowerCase(), d.def]));
const DEVX = { 'personification': 'Giving human qualities to a thing or an idea.', 'simile': 'A comparison with “like” or “as”.', 'metaphor': 'Saying one thing IS another.', 'extended metaphor': 'One metaphor developed through the whole poem.', 'repetition': 'Repeating a word or line for effect.', 'alliteration': 'Several words close together starting with the same sound.', 'imagery': 'Words that create pictures, sounds or feelings in the mind.', 'inversion': 'Unusual word order, used for emphasis or rhyme.', 'irony': 'A gap between what is said and what is meant or what happens.', 'refrain': 'A line repeated through a poem or song.', 'onomatopoeia': 'A word that imitates a sound.', 'paradox': 'A statement that seems impossible but contains a truth.', 'apostrophe': 'Speaking directly to someone absent or to an idea.', 'sonnet': 'A 14-line poem with a fixed rhyme pattern.', 'soliloquy': 'A speech in which a character speaks their thoughts alone.', 'symbol': 'Something that stands for a bigger idea.', 'contrast': 'Putting opposites side by side.', 'allegory': 'A story with a second, hidden meaning.', 'dialogue': 'Two or more voices speaking.', 'hyperbole': 'Deliberate exaggeration.', 'antithesis': 'Opposite ideas in balanced phrases.', 'couplet': 'Two rhyming lines together.', 'internal rhyme': 'A rhyme inside a line, not only at the end.', 'parallelism': 'Repeating the same grammatical pattern.', 'understatement': 'Saying less than you mean, for effect.', 'allusion': 'A short reference to another text, person or event.', 'ballad form': 'A song-like story in short stanzas.', 'rhetorical question': 'A question asked for effect, not to get an answer.', 'anaphora': 'Repeating the same word or phrase at the start of several lines or clauses.', 'dramatic monologue': 'A poem spoken by one character to a silent listener; the speaker reveals more than he or she intends.', 'dialect': 'A regional or social variety of a language, with its own words, spellings and grammar.', 'scots dialect': 'Scots: the language of Lowland Scotland, closely related to English, with its own words and spellings.', 'enjambment': 'A sentence that runs on from one line into the next without a pause at the line end.', 'volta': 'The “turn” in a sonnet, where the argument or mood changes.', 'euphemism': 'A gentle or indirect expression for something painful or unpleasant.', 'carpe diem': 'Latin for “seize the day”: the theme that life is short, so enjoy the present.', 'framed story': 'A story told inside another story, by a second narrator.', 'circular structure': 'The poem ends where it began, returning to its opening words or scene.', 'synaesthesia': 'Describing one sense in terms of another (a colour that “buzzes”).', 'portmanteau': 'A new word made by blending two words (slithy = lithe + slimy).', 'pun': 'A play on a word that has two meanings.', 'parody': 'An imitation that copies a style or pattern in order to mock it.', 'list': 'A catalogue of items or stages, built up one after another.', 'rhythm': 'The pattern of stressed and unstressed syllables; here it imitates the movement described.', 'rhythm echoing sense': 'The beat of the lines imitates what is described — here, a horse galloping.', 'question and answer': 'A structure in which each question is followed by an answer.', 'invented words': 'Words the poet made up; their sound and grammar suggest what they mean.', 'triplet rhyme': 'Three lines in a row that share one rhyme.', 'rhyming couplets': 'Pairs of lines that rhyme: AA BB CC.', 'couplets': 'Pairs of lines that rhyme: AA BB CC.', 'repetition with variation': 'A line or pattern comes back with a small change that shifts the meaning.', 'iambic pentameter': 'A line of five “da-DUM” units (iambs).', 'sonnet form': 'A 14-line poem with a fixed rhyme pattern.' };
const defOf = d => { const k = d.toLowerCase().replace(/\s*\(.*\)$/, ''); return DEVX[k] || DEVDEF[k] || Object.entries(DEVX).find(([x]) => k.includes(x))?.[1] || ''; };
const img = (f, w) => f ? IMG(f, w || 1400) : '';
const aut = it => AUTHORS[it.author] || AUTHORS.traditional;
const firstLine = it => (it.text || '').split('\n').map(l => l.trim()).find(l => l && !/sings:|replies:/.test(l)) || '';
const roomItems = r => ({ poetry: POEMS, shakespeare: SHAKESPEARE, rhymes: RHYMES.concat(TWISTERS, LIMERICKS, RIDDLES), proverbs: PROVERBS })[r] || [];
const byLevel = list => LEVEL ? list.filter(i => i.level === LEVEL) : list;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const tone = s => ['v', 'c', 'o'][[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 3];

/* ---------------- routing ---------------- */
let S = { view: 'home', id: null, tab: 'experience', f: {} };
function go(view, id, tab, arg) { lwGo([view, id, tab, arg].filter(x => x != null && x !== '').join('/')); }
/* смену адреса не слушаем: роутер зовёт lwGo */
function route() {
  NOTE = store.get('notebook', {});
  const [v, id, tab, arg] = (HASH.slice(1) || 'home').split('/').map(decodeURIComponent);
  const sameItem = S.view === 'item' && v === 'item' && S.id === id;
  const sameRead = S.view === 'play' && v === 'play' && S.id === id && S.tab === 'read' && tab === 'read';
  if (!(S.view === 'play' && S.id === id)) REH = '';
  S.view = v || 'home'; S.id = id || null; S.tab = tab || (v === 'play' ? 'overview' : 'experience'); S.arg = arg || null;
  if (!sameItem && !sameRead) { S.f = {}; lwScrollTo(0); }
  render();
  if (sameRead) { const r = $('.reader'); if (r) lwScrollTo(r.getBoundingClientRect().top - ROOT.getBoundingClientRect().top - 70); }
}
function render() {
  stopAll(); $('#pop').hidden = true; $('#nav').classList.remove('open');
  renderTop();
  const app = $('#app'); let html;
  if (S.view === 'item' && BY[S.id]) html = BY[S.id].strand === 'wise' ? proverbPage(BY[S.id]) : itemPage(BY[S.id]);
  else if (S.view === 'shakespeare') html = shakespeareWorld();
  else if (S.view === 'play') html = playPage(S.id, S.tab, S.arg);
  else if (S.view === 'drama') html = dramaPage();
  else if (S.view === 'prose') html = prosePage();
  else if (S.view === 'text') html = textPage(S.id);
  else if (S.view === 'periods') html = periodsPage();
  else if (['poetry', 'rhymes', 'proverbs'].includes(S.view)) html = roomPage(S.view);
  else if (S.view === 'words') html = wordsPage();
  else if (S.view === 'word') html = wordPage(S.id);
  else if (S.view === 'find') html = findPage(S.id);
  else if (S.view === 'everyday') html = everydayPage();
  else if (S.view === 'voices') html = voicesPage();
  else if (S.view === 'workshop') html = workshopPage();
  else if (S.view === 'sources') html = sourcesPage();
  else html = homePage();
  ROOT.dataset.lwTheme = themeFor();
  app.innerHTML = html; prepImages(app); app.firstElementChild && app.firstElementChild.classList.add('fade');
  LW_IN_RENDER++; try { after(); afterX(); checkBgs(); } finally { LW_IN_RENDER--; } lwLangSync();
}
function renderTop() {
  let cur = S.view === 'item' && BY[S.id] ? ROOM_OF[BY[S.id].strand] : S.view;
  if (S.view === 'play') cur = W.plays[S.id] ? 'shakespeare' : 'drama';
  if (S.view === 'text') cur = LIB.prose[S.id] && LIB.prose[S.id].verse ? 'poetry' : 'prose';
  if (cur === 'proverbs') cur = 'rhymes';
  if (cur === 'word' || cur === 'find') cur = 'words';
  if (cur === 'everyday') cur = 'shakespeare';
  $('#nav').innerHTML = [['shakespeare', 'shakespeare'], ['drama', 'drama'], ['poetry', 'poetry'], ['prose', 'navProse'], ['periods', 'periods'], ['rhymes', 'navRhymes'], ['voices', 'voices'], ['words', 'words'], ['workshop', 'workshop']].map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-lw-onclick="go('${k}')">${t(l)}</button>`).join('');
  $('#lvlSel').innerHTML = `<option value="">${t('allLevels')}</option>` + LEVELS.map(l => `<option ${LEVEL === l ? 'selected' : ''}>${l}</option>`).join('');
  $('#lvlSel').onchange = e => { LEVEL = e.target.value; if (S.view === 'item') go(ROOM_OF[BY[S.id].strand]); else if (S.view === 'text') go(LIB.prose[S.id].verse ? 'poetry' : 'prose'); else render(); };
  $('#lang').innerHTML = [['en', 'EN'], ['kz', 'ҚАЗ'], ['ru', 'РУС']].map(([k, l]) => `<button class="${LANG === k ? 'on' : ''}" data-lw-onclick="setLang('${k}')">${l}</button>`).join('');
  $('#aboutBtn').textContent = t('about');
  $('#footText').innerHTML = 'Every text comes from a named public-domain edition. <button data-lw-onclick="go(\'sources\')" style="text-decoration:underline">Sources</button>';
}
function setLang(l) { LANG = l; if (l !== 'en') SUP = l; ROOT.lang = l === 'kz' ? 'kk' : l; render(); }

/* ---------------- HOME / ENTRANCE ---------------- */
const SHOW = [
  { file: 'Waterhouse-gather ye rosebuds-1909.jpg', pos: '50% 40%', title: 'Gather Ye Rosebuds', who: 'J. W. Waterhouse, 1909', id: 'po-virgins', quote: 'Gather ye rosebuds while ye may' },
  { file: 'John Glover - Ullswater, early morning - Google Art Project.jpg', pos: '45% 50%', title: 'Ullswater, Early Morning', who: 'John Glover, c. 1824', id: 'po-daffodils', quote: 'I wander’d lonely as a cloud' },
  { file: 'Frank Bernard Dicksee - Romeo and Juliet, 1884.jpg', pos: '50% 30%', title: 'Romeo and Juliet', who: 'Frank Dicksee, 1884', id: 'sh-whats-in-a-name', quote: 'What’s in a name?' },
  { file: 'John William Waterhouse - La Belle Dame sans Merci (1893).jpg', pos: '50% 35%', title: 'La Belle Dame sans Merci', who: 'J. W. Waterhouse, 1893', id: 'po-belle-dame', quote: 'And no birds sing.' },
  { file: 'William Blake - Songs of Innocence, Plate 28, "Laughing Song" (Bentley 15) - Google Art Project.jpg', pos: '50% 20%', title: 'Laughing Song', who: 'William Blake, 1789', id: 'po-laughing-song', quote: 'Ha ha he!' }
];
let SHOW_I = 0, SHOW_T = null;
function homePage() {
  const n = r => byLevel(roomItems(r)).length;
  const feat = BY['po-tiger'];
  return `<section class="hero"><div class="wrap hero-grid">
    <div>
      <div class="kicker">just to study · English Literature</div>
      <h1 class="display" style="margin-top:18px">Step into the <em>world</em> of English literature.</h1>
      <p class="lede">Plays, poems, stories and sayings — complete and in the authors’ own words, read aloud by real voices, set beside the paintings and pages they belong to.</p>
      <div class="hero-ctas"><button class="btn" data-lw-onclick="go('poetry')">${t('startPoem')} →</button><button class="btn ghost" data-lw-onclick="$id('levels').scrollIntoView({behavior:'smooth'})">${t('chooseLevel')}</button></div>
    </div>
    <div class="gallery-frame">
      <div class="clip bubble-clip">${SHOW.map((s, i) => `<div class="art ${i ? '' : 'on'}" style="background-image:url('${img(s.file, 1200)}');background-position:${s.pos}"></div>`).join('')}</div>
      <div class="quote-chip" id="qchip">“${esc(SHOW[0].quote)}”</div>
      <div class="art-cap" id="acap"><b>${esc(SHOW[0].title)}</b>${esc(SHOW[0].who)}<br><button data-lw-onclick="go('item','${SHOW[0].id}')">${t('enter')} the poem →</button></div>
      <div class="dots">${SHOW.map((s, i) => `<button class="${i ? '' : 'on'}" aria-label="${esc(s.title)}" data-lw-onclick="showArt(${i},true)"></button>`).join('')}</div>
    </div></div></section>
  <section class="section" style="padding-top:60px"><div class="wrap">
    <div class="sec-head"><h2 class="h2">${t('rooms')}</h2><span class="meta">${LEVEL ? 'Showing level ' + LEVEL : (ALL.length + W.prose.length + W.poemsX.length + Object.keys(PLAYS).length) + ' authentic texts, including ' + Object.keys(PLAYS).length + ' complete plays'}</span></div>
    <div class="rooms">
      <button class="room" data-lw-onclick="go('shakespeare')"><div class="bg" style="background-image:url('${img('The Globe Theatre from the Long Antwerp View of London.jpg', 1600)}');background-position:50% 30%"></div><div class="in"><div class="count">${Object.keys(W.plays).length} complete plays · life & theatre</div><h3 class="h2">Shakespeare’s World</h3><p>His life, the Globe, and twenty complete plays — with a full guide to Romeo and Juliet, performances and rehearsal mode.</p></div></button>
      <button class="room" data-lw-onclick="go('drama')"><div class="bg" style="background-image:url('${img('Frank Bernard Dicksee - Romeo and Juliet, 1884.jpg', 1200)}');background-position:50% 25%"></div><div class="in"><div class="count">${Object.keys(W.drama).length} more complete plays</div><h3 class="h2">${t('drama')}</h3><p>From the medieval Everyman to Wilde, Shaw and Ibsen — seven centuries of theatre, scene by scene.</p></div></button>
      <button class="room" data-lw-onclick="go('poetry')"><div class="bg" style="background-image:url('${img('John Glover - Ullswater, early morning - Google Art Project.jpg', 1600)}')"></div><div class="in"><div class="count">${n('poetry') + W.poemsX.length} poems · A1–C2</div><h3 class="h2">${t('poetry')}</h3><p>From Beowulf and Chaucer to Yeats — complete poems with human recordings, paintings and the stories behind them.</p></div></button>
      <button class="room" data-lw-onclick="go('prose')"><div class="bg" style="background-image:url('${img('Waterhouse-gather ye rosebuds-1909.jpg', 1200)}');background-position:50% 30%"></div><div class="in"><div class="count">${W.prose.length} stories, chapters, essays & letters</div><h3 class="h2">${t('prose')}</h3><p>Dickens, Austen, Brontë, Conan Doyle, Joyce, Woolf — complete stories and the first chapters of great novels.</p></div></button>
      <button class="room" data-lw-onclick="go('periods')"><div class="bg" style="background-image:url('${img('Canaletto - Westminster Bridge, with the Lord Mayor\'s Procession on the Thames - Google Art Project.jpg', 1600)}')"></div><div class="in"><div class="count">${W.periods.length} periods · Old English to today</div><h3 class="h2">${t('periods')}</h3><p>A journey through English literature, from the 7th century to the present — and how the periods connect.</p></div></button>
      <button class="room proverbs" data-lw-onclick="go('rhymes')"><div class="bubbles"><span>Peter Piper picked a peck…</span><span>Every cloud hath a silver lining.</span><span>Jack and Jill went up the hill</span><span>Many hands make light work.</span><span>There was an Old Man with a beard</span><span>Better late than never.</span></div><div class="in"><div class="count">${n('rhymes')} rhymes · ${n('proverbs')} proverbs</div><h3 class="h2">${t('rhymesay')}</h3><p>Nursery rhymes from 1842, tongue twisters, Lear’s limericks and traditional proverbs — rhythm you can feel.</p></div></button>
    </div></div></section>
  <section class="section" style="padding-top:0"><div class="wrap"><div class="featured">
    <div class="plate"><img src="${img(feat.image.file, 900)}" alt="${esc(feat.image.credit)}" loading="lazy"></div>
    <div><div class="kicker">${t('featured')}</div><h2 class="h2" style="margin:10px 0 6px">${esc(feat.title)}</h2><div class="meta" style="font-size:15px">William Blake · Songs of Experience, 1794</div>
      <p class="lede" style="margin:18px 0 0;font-family:var(--lit);font-size:24px;font-style:italic">“Tiger, tiger, burning bright / In the forests of the night”</p>
      ${voiceBlock(feat, 'feat')}
      <button class="btn sm" style="margin-top:10px" data-lw-onclick="go('item','po-tiger')">${t('enter')} the poem →</button></div>
  </div></div></section>
  <section class="section" style="padding-top:0"><div class="wrap">
    <div class="sec-head"><h2 class="h2">${t('voices')}</h2><span class="meta">Tap to explore the periods</span></div>
    <div class="timeline">${ERA_ORDER.map(id => { const e = ERAS.find(x => x.id === id); if (!e) return ''; return `<button class="era-btn" data-lw-onclick="go('periods')"><div class="dot" style="border-color:${e.color}"></div><b>${esc(e.name)}</b><small>${esc(e.dates)}</small><div class="faces">${e.voices.map(v => AUTHORS[v] && AUTHORS[v].img ? `<img src="${img(AUTHORS[v].img, 120)}" alt="${esc(AUTHORS[v].name)}" title="${esc(AUTHORS[v].name)}" loading="lazy">` : '').join('')}</div></button>`; }).join('')}</div>
  </div></section>
  <section class="section" id="levels" style="padding-top:0"><div class="wrap">
    <div class="sec-head"><h2 class="h2">${t('chooseLevel')}</h2><span class="meta">Texts are never simplified — each is placed where its language makes sense.</span></div>
    <div class="levels">${LEVELS.map(l => `<button class="${LEVEL === l ? 'on' : ''}" data-lw-onclick="LEVEL='${LEVEL === l ? '' : l}';render()"><b>${l}</b><span>${LV_NOTE[l]} · ${ALL.filter(i => i.level === l).length}</span></button>`).join('')}</div>
  </div></section>`;
}
function showArt(i, manual) {
  const arts = $$('.gallery-frame .art'); if (!arts.length) return;
  SHOW_I = i; arts.forEach((a, k) => a.classList.toggle('on', k === i)); $$('.dots button').forEach((d, k) => d.classList.toggle('on', k === i));
  const s = SHOW[i]; $('#acap').innerHTML = `<b>${esc(s.title)}</b>${esc(s.who)}<br><button data-lw-onclick="go('item','${s.id}')">${t('enter')} the poem →</button>`; $('#qchip').textContent = '“' + s.quote + '”';
  if (manual) { clearInterval(SHOW_T); SHOW_T = setInterval(() => showArt((SHOW_I + 1) % SHOW.length), 7000); }
}

/* ---------------- ROOMS (lists) ---------------- */
function roomPage(r) {
  const all = roomItems(r); let items = byLevel(all); const f = S.f;
  if (f.era) items = items.filter(i => i.era === f.era);
  if (f.theme) items = items.filter(i => (i.themes || [i.theme]).includes(f.theme));
  if (f.kind) items = items.filter(i => i.kind === f.kind);
  const chip = (k, v, label) => `<button class="chip ${(f[k] || '') === (v || '') ? 'on' : ''}" data-lw-onclick="S.f.${k}=${v ? `'${v}'` : 'null'};render()">${esc(label)}</button>`;
  const heads = {
    poetry: ['Poetry', 'Complete poems. Listen, read, then practise.'],
    shakespeare: ['Shakespeare', 'Sonnets, speeches, songs and famous lines.'],
    rhymes: ['Rhymes', 'Nursery rhymes, tongue twisters and nonsense verse.'],
    proverbs: ['Proverbs', PROVERBS.length + ' proverbs and sayings, each with its source.']
  };
  let filters = '', body = '';
  if (r === 'poetry') {
    const eras = ERA_ORDER.filter(e => all.some(i => i.era === e));
    filters = `<div class="filters">${chip('era', null, 'All periods')}${eras.map(e => chip('era', e, ERAS.find(x => x.id === e).name)).join('')}</div>`;
    body = `<div class="grid">${items.map(card).join('')}</div>` + (f.era ? '' : poetryMore());
  } else if (r === 'shakespeare') {
    filters = `<div class="filters">${chip('kind', null, 'All')}${chip('kind', 'speech', 'Speeches')}${chip('kind', 'sonnet', 'Sonnets')}${chip('kind', 'song', 'Songs')}${chip('kind', 'line', 'Famous lines')}</div>`;
    body = `<div class="grid">${items.map(card).join('')}</div>`;
  } else if (r === 'rhymes') {
    filters = `<div class="filters"><button class="chip on">Rhymes</button><button class="chip" data-lw-onclick="go('proverbs')">Proverbs →</button></div>`;
    const rh = items.filter(i => i.strand === 'rhymes'), tw = items.filter(i => i.form === 'Tongue twister'), li = items.filter(i => i.form === 'Limerick');
    body = (rh.length ? `<div class="section-label"><h2 class="h3">Nursery rhymes</h2><span class="meta">from The Nursery Rhymes of England, collected by J. O. Halliwell (1842)</span></div><div class="grid">${rh.map(card).join('')}</div>` : '') +
      (tw.length ? `<div class="section-label"><h2 class="h3">Tongue twisters</h2><span class="meta">one sound per twister — from Peter Piper’s Practical Principles (Philadelphia, 1836) and Halliwell</span></div><div class="keys">${tw.map(i => `<button class="key" data-lw-onclick="go('item','${i.id}')"><div class="g">${esc(i.letter)}</div><small>${esc(i.title)} · ${i.level}</small></button>`).join('')}</div>` : '') +
      (li.length ? `<div class="section-label"><h2 class="h3">Limericks</h2><span class="meta">Edward Lear, A Book of Nonsense — human recordings where they exist</span></div><div class="grid">${li.map(card).join('')}</div>` : '') +
      (items.some(i => i.form === 'Riddle') ? `<div class="section-label"><h2 class="h3">Riddles</h2><span class="meta">from the “Riddles” class of Halliwell’s Nursery Rhymes of England (1842) — guess before you look</span></div><div class="grid">${items.filter(i => i.form === 'Riddle').map(card).join('')}</div>` : '') +
      (!rh.length && !tw.length && !li.length ? empty() : '');
  } else if (r === 'proverbs') {
    filters = `<div class="filters"><button class="chip" data-lw-onclick="go('rhymes')">← Rhymes</button></div>`;
    const themes = [...new Set(all.map(p => p.theme))];
    filters += `<div class="filters">${chip('theme', null, 'All')}${themes.map(x => chip('theme', x, x)).join('')}</div>`;
    body = sayingsWall() + `<div class="section-label"><h2 class="h3">Traditional proverbs</h2><span class="meta">Preston, A Dictionary of English Proverbs</span></div><div class="wall">${items.map((p, n) => `<button class="saying ${n % 6 === 1 ? 'v' : n % 6 === 4 ? 'c' : ''} ${n % 5 === 0 ? 'big' : ''}" data-lw-onclick="go('item','${p.id}')"><q>${esc(p.text)}</q><div class="f"><span>${esc(p.theme)}</span><span>${p.level}</span></div></button>`).join('')}</div>`;
  }
  if ((r === 'poetry' || r === 'shakespeare' || r === 'proverbs') && !items.length) body = empty();
  return `<div><div class="wrap page-head"><div class="kicker">${LEVEL ? 'Level ' + LEVEL : t('allLevels')}</div><h1 class="display" style="font-size:clamp(44px,5.4vw,76px);margin-top:10px">${heads[r][0]}</h1><p class="lede">${heads[r][1]}</p>${filters}</div><div class="wrap">${body}</div></div>`;
}
const empty = () => `<p class="lede" style="padding:30px 0 90px">Nothing at this level here yet. <button class="btn sm ghost" data-lw-onclick="LEVEL='';S.f={};render()">Show all levels</button></p>`;
function card(it) {
  const h = it.image; const plate = h && (h.plate || h.small);
  const ph = h ? `<div class="ph ${plate ? 'plate' : ''}" style="background-image:url('${img(h.file, 800)}')${h.crop ? ';background-size:170%;background-position:46% 46%' : ''}"></div>`
    : `<div class="ph"><div class="typo ${tone(it.id)}"><span>${it.form === 'Limerick' ? esc(firstLine(it)) : esc(firstLine(it).replace(/[,;:]$/, '') + '…')}</span></div></div>`;
  return `<button class="card" data-lw-onclick="go('item','${it.id}')">${ph}<div class="tx"><span class="kicker" style="font-size:11px">${esc(it.form)}${it.play ? ' · ' + esc(it.play) : ''}</span><h3 class="h3">${esc(it.title)}</h3>${h ? `<div class="first">${esc(firstLine(it))}</div>` : ''}<div class="row"><span class="who">${esc(aut(it).name)}</span><span style="flex:1"></span>${it.audio ? '<span class="pill v">♪</span>' : ''}${it.video ? '<span class="pill c">▶</span>' : ''}<span class="pill lv">${it.level}</span></div></div></button>`;
}

/* ---------------- ITEM: shared pieces ---------------- */
function glossify(html, gloss) {
  if (!gloss) return html;
  Object.keys(gloss).sort((a, b) => b.length - a.length).forEach(k => {
    if (html.includes('data-g="' + esc(k) + '"')) return;
    const re = new RegExp('(^|[^A-Za-z’\'-])(' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![A-Za-z])', 'i');
    html = html.replace(re, (m, pre, w) => `${pre}<button class="w" data-g="${esc(k)}">${w}</button>`);
  });
  return html;
}
function poemHTML(it) {
  const lines = it.text.split('\n'); const ind = lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length); const min = Math.min(...ind);
  let n = 0, out = ''; const long = lines.filter(l => l.trim()).length > 8; const prose = it.kind === 'line' && /prose|Prose/.test(it.context || '');
  lines.forEach(raw => {
    if (!raw.trim()) { out += '<span class="gap"></span>'; return; }
    if (/^(Amiens sings|Jaques replies):$/.test(raw.trim())) { out += `<span class="speaker">${esc(raw.trim())}</span>`; return; }
    if (isHeadLine(raw)) { out += `<span class="speaker">${esc(plain(raw.trim()))}</span>`; return; }
    const lvl = Math.min(3, Math.round((raw.match(/^ */)[0].length - min) / 3)); n++;
    let body = glossify(esc(raw.trim()).replace(/_([^_]+)_/g, '<em>$1</em>'), it.gloss);
    out += `<span class="ln ${lvl ? 'i' + lvl : ''}" data-n="${n}">${long && (n === 1 || n % 5 === 0) ? `<span class="no">${n}</span>` : ''}${body}</span>`;
  });
  return `<div class="poem ${prose ? 'prose' : ''}" id="poem">${out}</div>`;
}
function srcLine(it) {
  const s = SOURCES[it.src];
  return `<div class="src-line"><span>${t('source')}: <i>${esc(s.work)}</i>${it.ref ? ', ' + esc(it.ref) : ''}</span>·<span>Public domain</span>·<button data-lw-onclick="this.parentNode.nextElementSibling.hidden=!this.parentNode.nextElementSibling.hidden">${t('more')}</button></div>
    <div class="src-more" hidden>${esc(s.editor || '')}. ${esc(s.note || '')} Digitised by ${esc(s.org)} — <a href="${s.url}" target="_blank" rel="noopener">${s.url.replace('https://www.', '')}</a>. The text above is copied exactly from this edition and was checked against it word by word; nothing has been modernised or simplified.${it.rightsNote ? ' ' + esc(it.rightsNote) : ''}</div>`;
}
function voiceBlock(it, key) {
  if (!it.audio || !it.audio.length) return '';
  const a = it.audio[0];
  return `<div class="voice" data-voice="${key}" data-item="${it.id}"><div class="row">
      <button class="play bubble-clip" aria-label="${t('listen')}">${ICON.play}</button>
      <div class="mid"><div class="lab">${t('listen')} <span class="who">· ${esc(a.reader)}</span></div><div class="bar"><i></i></div></div>
      <span class="t">0:00</span><button class="sp" title="Speed">1×</button></div>
    ${it.audio.length > 1 ? `<div class="readers">${it.audio.map((x, i) => `<button data-r="${i}" class="${i ? '' : 'on'}">${esc(x.reader)}</button>`).join('')}</div>` : ''}
    ${a.note ? `<div class="note">${esc(a.note)}</div>` : ''}
    <div class="credit">Recording: ${esc(a.reader)} · ${esc(a.lic)} · <a href="${a.page}" target="_blank" rel="noopener">Wikimedia Commons</a></div></div>`;
}
let AUDIOS = [];
function initVoices() {
  $$('[data-voice]').forEach(box => {
    const it = BY[box.dataset.item]; let cur = 0; const au = new Audio(); au.preload = 'metadata'; AUDIOS.push(au);
    const load = i => { cur = i; const a = it.audio[i]; au.innerHTML = ''; au.removeAttribute('src');
      const s1 = document.createElement('source'); s1.src = a.mp3; s1.type = 'audio/mpeg'; const s2 = document.createElement('source'); s2.src = a.ogg; s2.type = 'audio/ogg'; s2.onerror = fail; au.append(s1, s2); au.load();
      $('.who', box).textContent = '· ' + a.reader; const cr = $('.credit', box); if (cr) cr.innerHTML = `Recording: ${esc(a.reader)} · ${esc(a.lic)} · <a href="${a.page}" target="_blank" rel="noopener">Wikimedia Commons</a>`;
      const nt = $('.note', box); if (nt) nt.textContent = a.note || ''; $$('.readers button', box).forEach(b => b.classList.toggle('on', +b.dataset.r === i)); };
    const fail = () => { box.innerHTML = `<div class="meta" style="padding:6px 4px">${t('noRec')}</div>`; };
    load(0);
    const pb = $('.play', box);
    pb.onclick = () => { if (au.paused) { AUDIOS.forEach(x => x !== au && x.pause()); au.play().catch(() => {}); } else au.pause(); };
    au.onplay = () => { pb.innerHTML = ICON.pause; box.classList.add('playing'); };
    au.onpause = au.onended = () => { pb.innerHTML = ICON.play; box.classList.remove('playing'); };
    au.ontimeupdate = () => { $('.bar i', box).style.width = (au.duration ? au.currentTime / au.duration * 100 : 0) + '%'; $('.t', box).textContent = fmt(au.currentTime) + ' / ' + (isFinite(au.duration) ? fmt(au.duration) : '–'); };
    au.onloadedmetadata = () => { $('.t', box).textContent = '0:00 / ' + fmt(au.duration); };
    $('.bar', box).onclick = e => { if (!au.duration) return; const r = e.currentTarget.getBoundingClientRect(); au.currentTime = (e.clientX - r.left) / r.width * au.duration; };
    const sp = $('.sp', box); sp.onclick = () => { au.playbackRate = au.playbackRate === 1 ? .75 : 1; sp.textContent = au.playbackRate + '×'; };
    $$('.readers button', box).forEach(b => b.onclick = () => { const was = !au.paused; load(+b.dataset.r); if (was) au.play().catch(() => {}); });
  });
}
const fmt = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '–';
function stopAll() { lwHush(); AUDIOS.forEach(a => a.pause()); AUDIOS = []; stopRec(); clearInterval(TIMER); TIMER = null; clearInterval(SHOW_T); LW_KEY = null; }
function videoBlock(v) {
  return `<div><div class="vid" data-v="${v.id}"><button class="poster" style="background-image:url('https://i.ytimg.com/vi/${v.id}/hqdefault.jpg')" data-lw-onclick="playVideo(this.parentNode)"><span><i class="bubble-clip">${ICON.play.replace('<svg', '<svg width="18" height="18"')}</i>${esc(v.channel)}</span></button></div>
    <div class="vmeta"><b>${esc(v.title)}</b><br>${esc(v.purpose)} · <a href="${v.url}" target="_blank" rel="noopener">${t('openYT')} ↗</a></div></div>`;
}
function playVideo(box) {
  if (!/^https?:$/.test(location.protocol)) { window.open('https://www.youtube.com/watch?v=' + box.dataset.v, '_blank', 'noopener'); return; }
  box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${box.dataset.v}?autoplay=1&rel=0&modestbranding=1" title="Video" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}

/* ---------------- ITEM PAGE ---------------- */
function itemPage(it) {
  const A = aut(it); const room = ROOM_OF[it.strand];
  const tabs = ['experience', 'explore', 'practise'];
  const list = roomItems(room); const idx = list.indexOf(it); const prev = list[idx - 1], next = list[idx + 1];
  let body = S.tab === 'explore' ? explorePane(it) : S.tab === 'practise' ? practisePane(it) : experiencePane(it);
  return `<div><div class="wrap"><div class="crumbs"><button data-lw-onclick="go('${room}')">← ${t(room)}</button><span>/</span><span>${esc(it.title)}</span></div></div>
    <div class="stage-tabs">${tabs.map((k, i) => `<button class="${S.tab === k ? 'on' : ''}" data-lw-onclick="go('item','${it.id}','${k}')"><span>${i + 1}</span>${t(k)}</button>`).join('')}</div>
    <div class="wrap">${body}
      <div class="next-row">${prev ? `<button data-lw-onclick="go('item','${prev.id}')"><small>← ${t('prev')}</small><b>${esc(prev.title)}</b></button>` : '<span></span>'}${next ? `<button data-lw-onclick="go('item','${next.id}')"><small>${t('next')} →</small><b>${esc(next.title)}</b></button>` : ''}</div></div></div>`;
}
function sideArt(it) {
  const h = it.image, A = aut(it);
  let art;
  if (h) art = `<figure style="margin:0"><div class="art-wrap ${h.plate ? 'plate' : h.small ? 'small' : ''}"><img src="${img(h.file, 1400)}" alt="${esc(h.credit)}" ${h.crop ? 'style="object-fit:cover;object-position:46% 47%;aspect-ratio:1/1.05;transform:scale(1.7)"' : ''}></div><figcaption class="caption">${esc(h.credit)} · <a href="${COMMONS(h.file)}" target="_blank" rel="noopener">Wikimedia Commons</a></figcaption></figure>`;
  else art = `<div class="typo-art ${tone(it.id)}"><div class="b bubble-clip"><span>${esc((it.letter && it.letter.length < 3 ? it.letter : firstLine(it).replace(/^[‘'"“]/, '')[0]) || '“')}</span></div></div>`;
  const chip = it.author !== 'traditional' ? `<button class="author-chip" data-lw-onclick="go('item','${it.id}','explore')">${A.img ? `<img src="${img(A.img, 200)}" alt="">` : ''}<span><b>${esc(A.name)}</b><small>${esc(A.dates)} · ${esc(A.origin)}</small></span></button>`
    : `<div class="author-chip"><span><b>Traditional</b><small>${esc(it.origin)}</small></span></div>`;
  return art + chip;
}
function experiencePane(it) {
  const vids = it.video ? `<div class="watch"><h2 class="h3" style="margin-bottom:14px">${t('watch')}</h2>${videoBlock(it.video)}${it.videos ? `<div class="vids">${it.videos.map(videoBlock).join('')}</div>` : ''}</div>` : '';
  return `<div class="exp"><aside class="exp-side">${sideArt(it)}</aside>
    <article><div class="title-block"><div class="kicker">${esc(it.form)}${it.play ? ' · ' + esc(it.play) : ''}${it.ref && it.strand === 'shakespeare' && it.play ? ' · ' + esc(it.ref) : ''}</div>
      <h1 class="display" style="margin-top:12px">${esc(it.title)}</h1>
      <div class="by">${esc(aut(it).name)}${it.year ? ', ' + esc(it.year) : ''}${it.speaker && it.strand === 'shakespeare' ? ' — spoken by ' + esc(it.speaker) : ''}</div>
      <div class="pills"><span class="pill lv">${it.level}</span><span class="pill">${esc(it.origin)}</span>${it.variety ? `<span class="pill o">${esc(it.variety)}</span>` : ''}${it.extract ? '<span class="pill o">extract</span>' : ''}</div></div>
      ${voiceBlock(it, 'main')}
      ${poemHTML(it)}
      ${it.extract ? `<div class="extract">${esc(it.extractNote || 'Extract — the lines shown are complete and unaltered.')}</div>` : ''}
      ${Object.keys(it.gloss || {}).length ? `<div class="meta" style="margin-top:16px">${t('tapWord')}</div>` : ''}
      ${srcLine(it)}${vids}
    </article></div>`;
}
function explorePane(it) {
  const A = aut(it); const g = Object.entries(it.gloss || {});
  const notes = [];
  if (it.note) notes.push(['', it.note]);
  if (it.focus) notes.push(['Sound focus', it.focus]);
  if (it.pattern) notes.push(['Pattern', it.pattern]);
  if (it.meter) notes.push(['Rhythm', it.meter]);
  if (it.misquote) notes.push(['Often misquoted', it.misquote]);
  if (it.idiom) notes.push(['Now an everyday phrase', '“' + it.idiom + '”']);
  if (it.variety) notes.push(['Language variety', it.variety + ' spellings are kept exactly as printed; they are not modern standard English.']);
  const era = ERAS.find(e => e.id === it.era);
  const L = schemeLetters(it);
  return `<div class="explore"><div>
      <div class="panel"><span class="learner">${t('learnerNote')}</span><h2 class="h3">${t('story')}</h2>
        <p class="story">${esc(it.context || (it.strand === 'rhymes' ? 'Nursery rhymes were passed from parents to children for generations before collectors such as James Orchard Halliwell printed them. Say this one aloud: the rhythm is the meaning.' : it.form === 'Limerick' ? 'A limerick has five lines: lines 1, 2 and 5 rhyme; lines 3 and 4 are short and rhyme together. Lear often ends where he began.' : it.form === 'Tongue twister' ? 'Each twister practises one sound. The 1836 book was written to teach “plain and perfect pronunciation” to children.' : ''))}</p>
        ${era ? `<div class="pills" style="display:flex;gap:6px;margin-top:6px"><span class="pill v">${esc(era.name)}</span><span class="pill">${esc(era.dates)}</span></div>` : ''}
        ${it.author !== 'traditional' ? `<div class="author-card">${A.img ? `<img src="${img(A.img, 300)}" alt="${esc(A.name)}" loading="lazy">` : '<div></div>'}<div><b class="h3" style="font-size:22px">${esc(A.name)}</b><div class="meta">${esc(A.dates)} · ${esc(A.origin)}</div><p style="margin:8px 0 0">${esc(A.bio)}</p></div></div>` : ''}
        ${it.doc ? `<figure style="margin:20px 0 0"><img src="${img(it.doc.file, 700)}" alt="${esc(it.doc.credit)}" style="max-width:240px;border-radius:8px;box-shadow:var(--shadow)" loading="lazy"><figcaption class="caption">${esc(it.doc.credit)}</figcaption></figure>` : ''}
      </div>
      ${(it.devices || notes.length) ? `<div class="panel"><span class="learner">${t('learnerNote')}</span><h2 class="h3">${t('closer')}</h2>
        ${it.devices ? `<div class="devices">${it.devices.map((d, i) => `<button class="dev" data-d="${i}">${esc(d)}</button>`).join('')}</div><div class="dev-def" id="devDef">Tap a tool to see what it does.</div>` : ''}
        ${notes.map(([l, n]) => `<div class="callout ${/misquoted/.test(l) ? '' : 'c'}">${l ? `<b>${esc(l)}</b>` : ''}${esc(n)}</div>`).join('')}
      </div>` : ''}
    </div><div>
      ${g.length ? `<div class="panel"><span class="learner">${t('learnerNote')}</span><h2 class="h3">${t('words')}</h2>
        <div class="seg"><button class="${SUP === 'ru' ? 'on' : ''}" data-lw-onclick="SUP='ru';render()">Русский</button><button class="${SUP === 'kz' ? 'on' : ''}" data-lw-onclick="SUP='kz';render()">Қазақша</button></div>
        <div class="words">${g.map(([w, x]) => `<div><b>${esc(w)}</b><span>${esc(x.en)}<small>${esc(x[SUP] || '')}</small></span></div>`).join('')}</div></div>` : ''}
      ${glossSrcPanel(it)}${wordChips('item', it.id)}${sayingsFor(it.id)}
      ${it.scheme ? `<div class="panel"><span class="learner">${t('learnerNote')}</span><h2 class="h3">${t('scheme')}</h2><p class="hint">${L ? 'Lines with the same letter rhyme' + (L.some(x => x && x.includes('.')) ? ' within a stanza; the letters start again in each stanza' : '') + '. ' : ''}Pattern: <b>${esc(it.scheme)}</b></p>${L ? rhymeMap(it, L) : ''}</div>` : ''}
    </div></div>`;
}
function rhymeMap(it, L) {
  const COL = ['#E9DDFE', '#CFF3FF', '#FFE2CC', '#D7F5DF', '#FFF6B8', '#F7D9EE', '#E0E7FF', '#FDE2E2'];
  const uniq = [...new Set(L.filter(Boolean).map(x => x[0]))]; const lines = schemeLines(it);
  return `<div class="rhyme-map">${lines.map((l, i) => L[i] ? `<div><em style="background:${COL[uniq.indexOf(L[i][0]) % COL.length]}">${L[i][0]}</em><span>${esc(plain(l))}</span></div>` : `<div class="rm-head"><em aria-hidden="true"></em><span><b>${esc(plain(l))}</b></span></div>`).join('')}</div>`;
}
const isHeadLine = l => /^(_?THE EPITAPH\._?|[IVX]+\.\s+_[^_]+_|Part\s+[IVX]+|PART\s+[IVX]+)$/.test(String(l).trim());
function schemeLines(it) { return it.text.split('\n').filter(l => l.trim() && !/sings:|replies:/.test(l)).map(l => l.trim()); }
const lastWord = l => { const m = plain(l).match(/(\p{L}(?:[\p{L}’'-]*\p{L})?)[^\p{L}]*$/u); return m ? m[1] : ''; };
const rhymeKey = w => { const x = String(w || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, ''); const m = x.match(/[aeiouy]+[^aeiouy]*$/); return m ? m[0] : x; };
function schemeLetters(it) {
  const sc = it.scheme; if (!sc || /approx|varied|irregular|unrhymed|blank verse|\+|…/i.test(sc)) return null;
  const lead = sc.replace(/\(.*?\)/g, '').trim().match(/^([A-Z]+(?:[ \/]+[A-Z]+)*)(?:\s*×\s*(\d+))?\s*(?:,.*)?$/);
  if (!lead) return null;
  const lines = schemeLines(it); const st = []; let cur = [];
  it.text.split('\n').forEach(l => { if (!l.trim()) { if (cur.length) st.push(cur); cur = []; return; } if (/sings:|replies:/.test(l)) return; cur.push(l.trim()); }); if (cur.length) st.push(cur);
  const body = st.map(x => x.filter(l => !isHeadLine(l))).filter(x => x.length);
  const out = []; const emit = (letters, r) => letters.split('').forEach(c => out.push(r ? c + '.' + r : c));
  if (lead[2]) { const base = lead[1].replace(/[ \/]/g, ''); if (body.length !== +lead[2] || body.some(x => x.length !== base.length)) return null; body.forEach((x, r) => emit(base, r)); }
  else if (/\//.test(lead[1])) { const g = lead[1].split('/').map(x => x.replace(/ /g, '')); if (g.length !== body.length || g.some((x, i) => x.length !== body[i].length)) return null; g.forEach((x, r) => emit(x, r)); }
  else { const flat = lead[1].replace(/ /g, ''); const total = body.reduce((a, x) => a + x.length, 0);
    if (flat.length === total) emit(flat, 0);
    else if (body.every(x => x.length % flat.length === 0)) { let r = 0; body.forEach(x => { for (let q = 0; q < x.length / flat.length; q++) emit(flat, r++); }); }
    else return null; }
  let i = 0; const L = lines.map(l => isHeadLine(l) ? null : out[i++]);
  return i === out.length ? L : null;
}
function rhymePairs(it) {
  const L = schemeLetters(it); if (!L) return [];
  const lines = schemeLines(it), ends = lines.map(lastWord), pairs = [];
  const weak = /^(you|it|me|thee|her|him|them|us|the|a|an|i|o|is|in|on)$/i;
  L.forEach((x, i) => { if (!x) return; const j = L.indexOf(x); if (j < i && ends[i] && ends[j] && ends[i].toLowerCase() !== ends[j].toLowerCase() && (!(weak.test(ends[i]) || weak.test(ends[j])) || (ends[i].length <= 4 && ends[j].length <= 4))) pairs.push([j, i]); });
  return pairs;
}
/* ---------------- PRACTISE ---------------- */
function stanzas(it) { return it.text.split(/\n\s*\n/).map(s => s.split('\n').filter(l => l.trim() && !/sings:|replies:/.test(l)).map(l => l.trim())).filter(s => s.length); }
function orderLines(it) { const st = stanzas(it).map(s => s.filter(l => !isHeadLine(l))); const f = st.find(s => s.length >= 3 && s.length <= 8); if (f) return f; const big = st.find(s => s.length > 8); if (!big) return null; const start = Math.floor(Math.random() * (big.length - 3)); return big.slice(start, start + 4); }
function activitiesFor(it) {
  const a = [];
  if (it.sequence) a.push('seq');
  if (it.stressTask) a.push('stressT');
  if (orderLines(it)) a.push('order');
  if (rhymePairs(it).length) a.push('missing');
  if (it.beats || it.form === 'Limerick' || it.form === 'Nursery rhyme') a.push('clap');
  if (it.form === 'Tongue twister') a.push('ladder');
  if (it.dialogue) a.push('dialogue');
  if (it.form === 'Riddle') return ['riddle'];
  return a;
}
function practisePane(it) {
  const acts = activitiesFor(it);
  const sayPrompt = it.form === 'Tongue twister' ? 'Say it slowly, then at your best speed. Record both.' : it.strand === 'shakespeare' ? 'Speak the lines like an actor: slow down and breathe at the punctuation.' : 'Read the text aloud. If there is a recording, listen first, then record yourself and compare.';
  return `<div class="practise"><div class="panel">${acts.length ? `<div class="acts">${acts.map((k, i) => `<button data-act="${k}" class="${i ? '' : 'on'}">${t(k)}</button>`).join('')}</div><div id="actBody"></div>` : `<h2 class="h3">${t('say')}</h2><p class="hint">This text is best practised aloud.</p>`}</div>
    <div><div class="panel"><h2 class="h3">${t('say')}</h2><p class="hint">${esc(sayPrompt)}</p>${voiceBlock(it, 'prac')}
      <div class="rec" id="rec"><span class="recdot"></span><button class="btn sm" id="recBtn" data-lw-onclick="toggleRec()">● ${t('record')}</button><audio id="recOut" controls hidden></audio></div><p class="meta" style="margin:10px 0 0">${t('recHint')}</p></div>
      ${it.reflect ? `<div class="panel"><span class="learner">${t('learnerNote')}</span><h2 class="h3">${t('think')}</h2><p style="font-family:var(--lit);font-size:20px;margin:6px 0 14px">${esc(it.reflect)}</p><textarea aria-label="Your answer"></textarea></div>` : ''}
    </div></div>`;
}
let TIMER = null;
function openAct(it, k) {
  $$('.acts button').forEach(b => b.classList.toggle('on', b.dataset.act === k)); const box = $('#actBody'); clearInterval(TIMER); TIMER = null; LW_KEY = null;
  if (k === 'riddle') { riddleAct(it, box); return; }
  if (k === 'order') {
    const s = orderLines(it); const mix = shuffle(s.map((l, i) => [l, i])); let built = [];
    const draw = () => {
      const done = built.length === s.length, ok = done && built.every((x, i) => s[x] === s[i]); if (done) lwOnce(s, 0, 'reading', ok);
      box.innerHTML = `<p class="hint">These lines come from the text, but the order is mixed. Tap them in the order the author wrote them.</p>
        <div class="built">${built.map((x, i) => `<div class="${s[x] === s[i] ? 'ok' : 'no'}">${esc(plain(s[x]))}</div>`).join('') || '<span class="meta">…</span>'}</div>
        <div class="choices">${mix.map(([l, i]) => `<button data-i="${i}" ${built.includes(i) ? 'disabled' : ''}>${esc(plain(l))}</button>`).join('')}</div>
        <div class="fb">${done ? (ok ? t('wellDone') : t('tryAgain')) : ''}</div><button class="btn sm ghost" id="rs">${t('reset')}</button>`;
      $$('.choices button', box).forEach(b => b.onclick = () => { built.push(+b.dataset.i); draw(); }); $('#rs').onclick = () => { built = []; draw(); };
    }; draw();
  }
  if (k === 'missing') {
    const lines = schemeLines(it).map(plain); const ends = lines.map(lastWord); const L = schemeLetters(it); const pairs = rhymePairs(it);
    const ask = () => {
      const [j, i] = pairs[Math.floor(Math.random() * pairs.length)]; const ans = ends[i]; const key = rhymeKey(ans), keyJ = rhymeKey(ends[j]);
      const pool = [...new Set(ends.filter((e, q) => e && L[q] !== L[i] && e.toLowerCase() !== ans.toLowerCase() && rhymeKey(e) !== key && rhymeKey(e) !== keyJ && e.slice(-2).toLowerCase() !== ans.slice(-2).toLowerCase()))];
      if (pool.length < 3) shuffle([...new Set(POEMS.flatMap(x => schemeLines(x).map(lastWord)))]).filter(e => e && e.length > 2 && !pool.includes(e) && e.toLowerCase() !== ans.toLowerCase() && rhymeKey(e) !== key && rhymeKey(e) !== keyJ && e.slice(-2).toLowerCase() !== ans.slice(-2).toLowerCase()).slice(0, 3 - pool.length).forEach(e => pool.push(e));
      const opts = shuffle([ans, ...shuffle(pool).slice(0, 3)]);
      const cut = lines[i].lastIndexOf(ans);
      box.innerHTML = `<p class="hint">Line ${i + 1} rhymes with line ${j + 1}. Which word did the author use? Only one choice rhymes here.</p>
        <div class="line-card">${esc(lines[j])}<br>${esc(lines[i].slice(0, cut))}<span class="blank">?</span>${esc(lines[i].slice(cut + ans.length))}</div>
        <div class="opts">${opts.map(w => `<button data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div><div class="fb"></div><button class="btn sm ghost" id="again">Another</button>`;
      $$('.opts button', box).forEach(b => b.onclick = () => { const ok = b.dataset.w === ans; lwOnce(opts, 0, 'reading', ok); b.classList.add(ok ? 'ok' : 'no'); $('.fb', box).textContent = ok ? t('wellDone') : t('tryAgain'); if (ok) { $('.blank', box).textContent = ans; $$('.opts button', box).forEach(x => x.disabled = x !== b); } });
      $('#again').onclick = ask;
    };
    pairs.length ? ask() : box.innerHTML = '<p class="hint">No suitable rhyme pair here.</p>';
  }
  if (k === 'clap') {
    const lines = it.text.split('\n').filter(l => l.trim()).map(l => l.trim()); let li = 0, taps = 0;
    const draw = () => {
      box.innerHTML = `<p class="hint">Say the line aloud and tap the button on every strong beat.${it.beats ? ' The suggested number of beats is a teaching guide, not part of the original.' : ''}</p>
        <div class="line-card">${esc(plain(lines[li]))}</div><div class="taps">${Array(Math.max((it.beats && it.beats[li]) || taps || 4, taps)).fill(0).map((_, q) => `<i class="${q < taps ? 'on' : ''}"></i>`).join('')}</div>
        <div style="display:flex;gap:12px;align-items:center;margin-top:16px"><button class="btn clap bubble-clip" id="cl" aria-label="Clap">👏</button><button class="btn sm ghost" id="nx">Next line →</button></div>
        <div class="fb">${taps ? 'Your claps: ' + taps + (it.beats ? ' · suggested: ' + it.beats[li] : '') : ''}</div>`;
      $('#cl').onclick = () => { taps++; draw(); }; $('#nx').onclick = () => { li = (li + 1) % lines.length; taps = 0; draw(); };
    }; draw();
    LW_KEY = e => { if (e.code === 'Space' && $('#cl')) { e.preventDefault(); $('#cl').click(); } };
  }
  if (k === 'ladder') {
    const goals = [['Slow', 'every sound clear', 14], ['Steady', 'natural rhythm', 9], ['Fast', 'no mistakes', 6]]; let g = 0, t0 = 0;
    box.innerHTML = `<p class="hint">Say the whole tongue twister. Start slowly; accuracy first, speed second. Target times are a platform suggestion.</p>
      <div class="ladder">${goals.map(([n, d, s], i) => `<button data-g="${i}" class="${i ? '' : 'on'}"><b>${n}</b>${d}<br><small>~${s} s</small></button>`).join('')}</div>
      <div class="timer" id="tm">0.0 s</div><button class="btn" id="tb">Start</button><div class="fb" id="tf"></div>`;
    $$('.ladder button', box).forEach(b => b.onclick = () => { g = +b.dataset.g; $$('.ladder button', box).forEach(x => x.classList.toggle('on', x === b)); });
    $('#tb').onclick = () => {
      if (TIMER) { clearInterval(TIMER); TIMER = null; const s = (performance.now() - t0) / 1000; $('#tb').textContent = 'Start'; $('#tf').textContent = s <= goals[g][2] ? `${s.toFixed(1)} s — on target for “${goals[g][0]}”. Was every sound clear?` : `${s.toFixed(1)} s — keep going; clear sounds matter most.`; return; }
      t0 = performance.now(); $('#tb').textContent = 'Stop'; TIMER = setInterval(() => { const el = $('#tm'); if (el) el.textContent = ((performance.now() - t0) / 1000).toFixed(1) + ' s'; }, 100);
    };
  }
  if (k === 'stressT') {
    const words = ['To', 'be,', 'or', 'not', 'to', 'be,', 'that', 'is', 'the', 'question:'];
    box.innerHTML = `<p class="hint">In the RSC sketch (in “Experience”) famous actors argue about which word to stress. Tap a word to stress it, then say the line. There is no single right answer — listen to how the meaning moves.</p>
      <div class="stress">${words.map((w, i) => `<button data-i="${i}">${w}</button>`).join('')}</div><div class="fb" id="sf"></div>`;
    $$('.stress button', box).forEach(b => b.onclick = () => { b.classList.toggle('on'); const on = $$('.stress button.on', box).map(x => x.textContent.replace(/[,:]/, '')); $('#sf').textContent = on.length ? 'Now say it with the stress on: ' + on.join(' + ').toUpperCase() : ''; });
  }
  if (k === 'seq') {
    const right = it.sequence; const sh = shuffle(right); let built = [];
    const draw = () => {
      const done = built.length === right.length; if (done) lwOnce(sh, 0, 'reading', built.every((l, i) => l === right[i]));
      box.innerHTML = `<p class="hint">Jaques describes seven “ages” of a life. Put them in his order.</p>
        <div class="built">${built.map((l, i) => `<div class="${l === right[i] ? 'ok' : 'no'}">${i + 1}. ${esc(l)}</div>`).join('') || '<span class="meta">…</span>'}</div>
        <div class="opts">${sh.map(w => `<button data-w="${esc(w)}" ${built.includes(w) ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>
        <div class="fb">${done ? (built.every((l, i) => l === right[i]) ? t('wellDone') : t('tryAgain')) : ''}</div><button class="btn sm ghost" id="rs">${t('reset')}</button>`;
      $$('.opts button', box).forEach(b => b.onclick = () => { built.push(b.dataset.w); draw(); }); $('#rs').onclick = () => { built = []; draw(); };
    }; draw();
  }
  if (k === 'dialogue') {
    const st = stanzas(it); const isBelle = it.id === 'po-belle-dame';
    box.innerHTML = `<p class="hint">${isBelle ? 'Stanzas 1–3 are the stranger’s questions; stanzas 4–12 are the knight’s answer.' : 'Odd lines ask, even lines answer.'} Choose a voice and read only your part — with a partner, or record both.</p>
      <div class="opts" style="margin-bottom:14px"><button id="vA">${isBelle ? 'The stranger' : 'The traveller (asks)'}</button><button id="vB">${isBelle ? 'The knight' : 'The guide (answers)'}</button></div>
      <div class="line-card" id="dl" style="font-size:18px"></div>`;
    const show = first => { const lines = isBelle ? st.flatMap((s, i) => s.map(l => [l, i < 3])) : st.flatMap(s => s.map((l, i) => [l, i % 2 === 0])); $('#dl').innerHTML = lines.map(([l, a]) => `<div style="opacity:${a === first ? 1 : .35};font-weight:${a === first ? 500 : 400}">${esc(l)}</div>`).join(''); };
    $('#vA').onclick = () => show(true); $('#vB').onclick = () => show(false); show(true);
  }
}

/* ---------------- RECORDER ---------------- */
let REC = null;
async function toggleRec() {
  if (REC && REC.state === 'recording') { stopRec(); return; }
  try {
    const st = await navigator.mediaDevices.getUserMedia({ audio: true }); if (dead) { st.getTracks().forEach(x => x.stop()); return; } LW_STREAMS.add(st); const ch = [];
    REC = new MediaRecorder(st); REC.ondataavailable = e => ch.push(e.data);
    REC.onstop = () => { st.getTracks().forEach(x => x.stop()); if (dead) return; const a = $('#recOut'); if (a) { a.src = lwObjectUrl(new Blob(ch, { type: REC.mimeType })); a.hidden = false; } const b = $('#recBtn'); if (b) b.textContent = '● ' + t('record'); $('#rec') && $('#rec').classList.remove('recording'); };
    REC.start(); $('#rec').classList.add('recording'); $('#recBtn').textContent = '■ ' + t('stop');
  } catch (e) { const r = $('#rec'); if (r && !r.querySelector('.err')) r.insertAdjacentHTML('beforeend', '<span class="meta err">Microphone not available or permission refused.</span>'); }
}
function stopRec() { if (REC && REC.state === 'recording') REC.stop(); }

/* ---------------- PROVERB PAGE ---------------- */
function proverbPage(p) {
  const words = p.text.split(' '); const list = PROVERBS; const i = list.indexOf(p); const prev = list[i - 1], next = list[i + 1];
  return `<div><div class="wrap"><div class="crumbs"><button data-lw-onclick="go('proverbs')">← ${t('proverbs')}</button><span>/</span><span>${esc(p.theme)}</span></div>
    <div class="pv-hero"><div class="pv-bubble"><div class="kicker" style="color:#e9ddff;margin-bottom:18px">Proverb · ${p.level}</div><q>${esc(p.text)}</q></div>
      <div class="src-line" style="border:0;justify-content:center"><span>${t('source')}: <i>A Dictionary of English Proverbs and Proverbial Phrases</i>, entry ${p.no}</span>·<span>Public domain</span>·<a href="${SOURCES.preston.url}" target="_blank" rel="noopener" style="color:var(--muted)">Project Gutenberg</a></div></div>
    <div class="pv-grid"><div>
      <div class="panel"><span class="learner">${t('learnerNote')}</span><h2 class="h3">${t('meaning')}</h2><p class="hint">Think first — what could it mean? Then tap.</p>
        <button class="reveal-btn shut" data-lw-onclick="this.classList.remove('shut')">${esc(p.meaning.en)}</button>
        <button class="reveal-btn shut" style="margin-top:10px" data-lw-onclick="this.classList.remove('shut')">${esc(p.meaning[SUP] || p.meaning.ru)}</button></div>
      <div class="panel"><span class="learner">${t('learnerNote')}</span><h2 class="h3">${t('useIt')}</h2><p style="font-family:var(--lit);font-size:20px">${esc(p.use)}</p>
        <div class="rec" id="rec"><span class="recdot"></span><button class="btn sm" id="recBtn" data-lw-onclick="toggleRec()">● ${t('record')}</button><audio id="recOut" controls hidden></audio></div><p class="meta">${t('recHint')}</p></div>
    </div><div class="panel"><h2 class="h3">${t('rebuild')}</h2><p class="hint">The original words, shuffled. Tap them in order.</p>
      <div class="built" id="pb"></div><div class="opts" id="po">${shuffle(words.map((w, k) => [w, k])).map(([w, k]) => `<button data-k="${k}">${esc(w)}</button>`).join('')}</div><div class="fb" id="pf"></div><button class="btn sm ghost" data-lw-onclick="render()">${t('reset')}</button></div></div>
    <div class="next-row">${prev ? `<button data-lw-onclick="go('item','${prev.id}')"><small>← ${t('prev')}</small><b>${esc(prev.text)}</b></button>` : '<span></span>'}${next ? `<button data-lw-onclick="go('item','${next.id}')"><small>${t('next')} →</small><b>${esc(next.text)}</b></button>` : ''}</div></div></div>`;
}

/* ---------------- ABOUT (discreet transparency) ---------------- */
function aboutModal() {
  const m = document.createElement('div'); m.className = 'modal'; m.onclick = e => { if (e.target === m) m.remove(); };
  const srcs = Object.values(SOURCES).filter(s => s.key);
  m.innerHTML = `<div class="box"><div class="kicker">Transparency</div><h2 class="h2" style="margin:8px 0 14px">${t('about')}</h2>
    <p>Every poem, rhyme, proverb, tongue twister and line on these pages is copied from a named public-domain edition and was checked against that edition character by character. Older spellings and punctuation are kept. Explanations, glosses, Kazakh and Russian help, and activities are written by the Just To Study team and are marked “${t('learnerNote')}”.</p>
    <p><b>Recordings</b> are human readings hosted on Wikimedia Commons (licence named under each player). <b>Videos</b> are embedded from official channels (Royal Shakespeare Company, Shakespeare’s Globe, BBC Bitesize, Guardian Culture, the Gaiety School of Acting). <b>Images</b> are public-domain or openly licensed works from museums and libraries via Wikimedia Commons, credited under each image.</p>
    <p><b>Complete plays, stories and longer texts</b> come from Project Gutenberg editions, named on every page with their eBook number: Shakespeare from <i>The Complete Works</i> (eBook 100); other plays, stories, essays and letters from the editions listed under each text. Translations (Aesop, Ibsen, Beowulf) are always marked, with the translator named. Facts about authors, dates and periods are quoted or summarised from the Folger Shakespeare Library, the Shakespeare Birthplace Trust, the Royal Shakespeare Company, Encyclopaedia Britannica and the British Library, with a link beside each one. Scene guides, act summaries, themes and word notes are written by the Just To Study team and marked “${t('learnerNote')}”.</p>
    <p><b>Copyright.</b> Texts are reproduced only when they are in the public domain (published before 1931 and the author died before 1956). Later works, such as Beckett’s <i>Waiting for Godot</i>, are described and linked but not quoted.</p>
    <h3 class="h3" style="margin:20px 0 8px">Source editions</h3><ul style="padding-left:18px;margin:0">${srcs.map(s => `<li style="margin-bottom:6px"><i>${esc(s.work)}</i> — ${esc(s.editor || '')}. <a href="${s.url}" target="_blank" rel="noopener">${s.url.replace('https://www.', '')}</a></li>`).join('')}</ul>
    <div style="display:flex;gap:10px;margin-top:22px"><button class="btn sm" data-lw-onclick="exportJSON()">Download metadata (JSON)</button><button class="btn sm ghost" data-lw-onclick="this.closest('.modal').remove()">Close</button></div></div>`;
  ROOT.append(m);
}
function exportJSON() {
  const data = { generated: '2026-11-10', sources: SOURCES, plays: Object.fromEntries(Object.keys(PLAYS).map(k => [k, { title: PMETA[k].title, author: W.plays[k] ? 'William Shakespeare' : PMETA[k].author, edition: W.plays[k] ? 'The Complete Works of William Shakespeare (Project Gutenberg eBook 100)' : PMETA[k].edition, url: 'https://www.gutenberg.org/ebooks/' + (W.plays[k] ? 100 : PMETA[k].pg), facts: PMETA[k].facts || [PMETA[k].date].filter(Boolean), translated: PMETA[k].translated || null, rights: 'Public domain', verification: 'complete text extracted from the named edition; letter-count check against source' }])), texts: W.prose.concat(W.poemsX).map(x => ({ id: x.id, title: x.title, author: x.author, edition: x.edition, url: 'https://www.gutenberg.org/ebooks/' + LIB.prose[x.id].pg, complete: !!x.complete, translated: !!x.translated, facts: x.facts, factSource: x.fsrc, rights: 'Public domain' })), notInLibrary: [W.godot], items: ALL.map(i => ({ id: i.id, title: i.title, author: aut(i).name, dates: aut(i).dates, form: i.form, level: i.level, era: i.era, origin: i.origin, sourceWork: SOURCES[i.src].work, sourceRef: i.ref, sourceUrl: SOURCES[i.src].url, rights: i.rightsNote, audio: (i.audio || []).map(a => ({ reader: a.reader, licence: a.lic, ogg: a.ogg, mp3: a.mp3, page: a.page })), video: [i.video].concat(i.videos || []).filter(Boolean), image: i.image ? { file: i.image.file, credit: i.image.credit, page: COMMONS(i.image.file) } : null, verification: 'text matched to source edition', text: i.text })) };
  const a = document.createElement('a'); a.href = lwObjectUrl(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'english-literature-metadata.json'; a.click();
}

/* ---------------- after render ---------------- */
function after() {
  initVoices();
  if (S.view === 'play') { const f = $('[data-pact]'); if (f) { $$('[data-pact]').forEach(b => b.onclick = () => openPlayAct(S.id, b.dataset.pact)); openPlayAct(S.id, f.dataset.pact); } }
  if (S.view === 'text') { const f = $('[data-xact].on') || $('[data-xact]'); if (f) { $$('[data-xact]').forEach(b => b.onclick = () => openXAct(S.id, b.dataset.xact)); openXAct(S.id, f.dataset.xact); } }
  if ($$('.lw-stage .art').length) { clearInterval(SHOW_T); SHOW_I = 0; SHOW_T = setInterval(() => showArt((SHOW_I + 1) % SHOW2.length), 7000); }
  const it = S.view === 'item' ? BY[S.id] : null;
  if (it) {
    $$('#poem .ln').forEach(ln => ln.addEventListener('click', e => { if (!e.target.closest('.w')) ln.classList.toggle('hl'); }));
    $$('.dev').forEach(b => b.onclick = () => { $$('.dev').forEach(x => x.classList.toggle('on', x === b)); $('#devDef').textContent = defOf(it.devices[+b.dataset.d]) || '—'; });
    const first = $('.acts button'); if (first) { $$('.acts button').forEach(b => b.onclick = () => openAct(it, b.dataset.act)); openAct(it, first.dataset.act); }
    if (it.strand === 'wise') {
      const words = it.text.split(' '); const built = [];
      $$('#po button').forEach(b => b.onclick = () => { built.push(+b.dataset.k); b.disabled = true; const ok = built.every((x, q) => words[x] === words[q]); $('#pb').innerHTML = `<div class="${ok ? 'ok' : 'no'}">${built.map(x => esc(words[x])).join(' ')}</div>`; if (built.length === words.length) { lwOnce(built, 0, 'reading', ok); $('#pf').textContent = ok ? t('wellDone') : t('tryAgain'); } });
    }
  }
}
lwOnRoot('click', e => {
  const b = e.target.closest('.w'); const pop = $('#pop');
  $$('.w.on').forEach(x => x !== b && x.classList.remove('on'));
  if (!b) { if (!e.target.closest('#pop')) pop.hidden = true; return; }
  const it = BY[S.id]; const g = it && it.gloss && it.gloss[b.dataset.g]; if (!g) return;
  b.classList.add('on');
  pop.innerHTML = `<span class="l">${t('learnerNote')}</span><b>${esc(b.dataset.g)}</b>${esc(g.en)}<div class="tr">${esc(g[SUP] || g.ru)}</div>`;
  const r = b.getBoundingClientRect(); pop.hidden = false;
  const R0 = ROOT.getBoundingClientRect(); pop.style.left = Math.max(8, Math.min(r.left - R0.left, R0.width - 316)) + 'px'; pop.style.top = (r.bottom - R0.top + 8) + 'px';
});

/* ============================================================
   v3 — Literature World: Shakespeare World, full plays, Drama,
   Prose & Stories, Periods. Data: LIB (parsed public-domain texts)
   ============================================================ */
const LIB = {};
['sh', 'ot', 'prose', 'world'].forEach(k => { LIB[k] = lwData(k); });
const W = LIB.world;
const PLAYS = Object.assign({}, LIB.sh, LIB.ot);           // full texts by id
const PMETA = Object.assign({}, W.plays, W.drama);          // metadata by id
const TEXTS = Object.fromEntries(W.prose.concat(W.poemsX).map(x => [x.id, x]));
const SHELF = Object.fromEntries(W.shelves.map(s => [s[0], s]));
const PERIOD_NAME = Object.fromEntries(W.periods.map(p => [p.id, p.name]));

/* ---- EXPANSION: prose, drama, periods ---- */
X.shelves.forEach(s => { if (!SHELF[s[0]]) { const i = W.shelves.findIndex(x => x[0] === 'essay'); W.shelves.splice(i < 0 ? W.shelves.length : i, 0, s); SHELF[s[0]] = s; } });
X.prose.forEach(x => { W.prose.push(x); TEXTS[x.id] = x; LIB.prose[x.id] = X.proseBody[x.id]; });
LIB.ot.riders = X.riders.play; PLAYS.riders = X.riders.play;
W.drama.riders = Object.assign({ fsrc: X.riders.meta.fsrc }, X.riders.meta); PMETA.riders = W.drama.riders;
(function () {
  const add = (pid, ids) => { const p = W.periods.find(x => x.id === pid); if (p) ids.forEach(i => { if (!p.works.includes(i)) p.works.push(i); }); };
  add('victorian', ['dodger', 'wuthering1', 'humpty', 'threemen1', 'dorian-preface']);
  add('modern', ['eveline', 'd:riders', 'whale', 'willows1']);
})();

Object.assign(UI.en, { drama: 'Drama', prose: 'Prose & Stories', periods: 'Periods', rhymesay: 'Rhymes & Sayings', navProse: 'Prose', navRhymes: 'Rhymes & Sayings', overview: 'Overview', read: 'Read the play', characters: 'Characters', themes: 'Themes', language: 'Language', stage: 'On stage', practiseT: 'Practise', whatHappens: 'What happens', rehearse: 'Rehearse as', nobody: 'nobody (read all)', textSize: 'Text size', sceneOf: 'Scene', readFull: 'Read the full play', readText: 'Read', whoSays: 'Who says it?', plot: 'Follow the plot', ending: 'Which ending did the author write?', moralMatch: 'Match the fable to its moral', complete: 'complete', extract: 'extract', translated: 'translation', american: 'American', copyright: 'in copyright', minutes: 'min read' });
Object.assign(UI.kz, { drama: 'Драма', prose: 'Проза', periods: 'Кезеңдер', rhymesay: 'Тақпақ пен мақал', navProse: 'Проза', navRhymes: 'Тақпақтар', overview: 'Шолу', read: 'Пьесаны оқу', characters: 'Кейіпкерлер', themes: 'Тақырыптар', language: 'Тіл', stage: 'Сахнада', practiseT: 'Жаттығу', whatHappens: 'Не болады', rehearse: 'Рөлді ойна', nobody: 'ешкім (бәрін оқу)', textSize: 'Мәтін өлшемі', sceneOf: 'Көрініс', readFull: 'Толық пьесаны оқу', readText: 'Оқу', whoSays: 'Кім айтады?', plot: 'Сюжетті ретте', ending: 'Автор қай соңын жазды?', moralMatch: 'Мысалды түйінімен сәйкестендір', complete: 'толық', extract: 'үзінді', translated: 'аударма', american: 'америкалық', copyright: 'авторлық құқықта', minutes: 'мин оқу' });
Object.assign(UI.ru, { drama: 'Драма', prose: 'Проза', periods: 'Эпохи', rhymesay: 'Стишки и пословицы', navProse: 'Проза', navRhymes: 'Стишки', overview: 'Обзор', read: 'Читать пьесу', characters: 'Персонажи', themes: 'Темы', language: 'Язык', stage: 'На сцене', practiseT: 'Практика', whatHappens: 'Что происходит', rehearse: 'Репетировать роль', nobody: 'никого (читать всё)', textSize: 'Размер текста', sceneOf: 'Сцена', readFull: 'Читать всю пьесу', readText: 'Читать', whoSays: 'Кто это говорит?', plot: 'Восстанови сюжет', ending: 'Какое окончание у автора?', moralMatch: 'Соедини басню с моралью', complete: 'полностью', extract: 'отрывок', translated: 'перевод', american: 'американская', copyright: 'под авторским правом', minutes: 'мин чтения' });

const roman = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'][n] || n;
const srcLink = s => s && s[0] ? `<div class="src">Source: ${s[1] ? `<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>` : esc(s[0])}</div>` : '';
const pgUrl = n => `https://www.gutenberg.org/ebooks/${n}`;
const imgTag = (file, w, alt, cls) => file ? `<img ${cls ? `class="${cls}"` : ''} src="${IMG(file, w || 1200)}" alt="${esc(alt || '')}" loading="lazy" data-lw-onerror="this.closest('[data-fig]')?this.closest('[data-fig]').remove():this.remove()">` : '';
const bgStyle = file => file ? `style="background-image:url('${IMG(file, 1600)}')"` : '';
const sceneLabel = (P, ai, si) => { const a = P.acts[ai], s = a.sc[si]; if (!a.n && !s.n) return 'Text'; if (!a.n) return s.n; if (!s.n) return `Act ${a.n} — ${/^(The )?Prologue|Chorus/i.test(s.loc) ? s.loc : 'Prologue'}`; return `Act ${a.n}, ${/^Part/.test(s.n) ? s.n : 'Scene ' + s.n}`; };
const SHORT = { romeo: 'R&J', hamlet: 'Ham', macbeth: 'Mac', othello: 'Oth', dream: 'MND' };

/* ---------------- Shakespeare World ---------------- */
function shakespeareWorld() {
  const ids = Object.keys(W.plays); const feat = ['hamlet', 'macbeth', 'othello', 'dream'];
  const lines = ids.reduce((n, id) => n + PLAYS[id].acts.reduce((m, a) => m + a.sc.reduce((q, s) => q + s.b.filter(b => b.p).length, 0), 0), 0);
  const rj = W.plays.romeo;
  return `<div>
  <section class="world-hero"><div class="bg" ${bgStyle('The Globe Theatre from the Long Antwerp View of London.jpg')}></div><div class="credit">The Globe, from Wenceslaus Hollar’s Long View of London · Public domain</div>
    <div class="wrap"><div class="kicker">Shakespeare’s World</div>
      <h1 class="display" style="margin-top:16px">Shakespeare</h1>
      <p class="lede" style="margin-top:20px">William Shakespeare (1564–1616): his life, his London and twenty complete plays.</p>
      <div class="stats"><div><b>${ids.length}</b><span>complete plays</span></div><div><b>${lines.toLocaleString('en')}</b><span>speeches</span></div><div><b>${SHAKESPEARE.length}</b><span>famous passages</span></div></div>
      <div class="hero-ctas" style="margin-top:30px"><button class="btn" data-lw-onclick="go('play','romeo')">Read Romeo and Juliet →</button><button class="btn ghost" style="color:#fff;box-shadow:inset 0 0 0 1.5px #fff" data-lw-onclick="$id('works').scrollIntoView({behavior:'smooth'})">All the plays</button></div>
    </div></section>
  <section class="section"><div class="wrap">
    <button class="feature" data-lw-onclick="go('play','romeo')"><div class="ph" ${artBg(ART.romeo)}></div>
      <div class="tx"><div class="kicker">Featured play · Tragedy · ${rj.level}</div><h2 class="h2">Romeo and Juliet</h2>
        <q>Two households, both alike in dignity, / In fair Verona, where we lay our scene…</q>
        <p style="margin:0">${esc(W.rj.intro)}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="pill">Complete text</span><span class="pill">Scene-by-scene guide</span><span class="pill">Characters & themes</span><span class="pill c">▶ Globe & BBC performances</span></div>
        <span class="btn sm" style="align-self:flex-start;margin-top:auto">Enter the play →</span></div></button>
    <div class="pcards">${feat.map(id => pcard(id)).join('')}</div>
  </div></section>
  <section class="section" style="padding-top:0"><div class="wrap">
    <div class="sec-head"><h2 class="h2">His life</h2><span class="meta">Dates checked with the Folger Library and the Birthplace Trust.</span></div>
    <div class="life">${W.life.map(e => `<div class="ev"><b>${esc(e.y)}</b><div><p>${esc(e.t)}</p>${srcLink(e.src)}</div></div>`).join('')}</div>
    <div class="figrow">
      <figure data-fig>${imgTag('Shakespeare Droeshout 1623 From the First Folio Edition.jpg', 900, 'Droeshout engraving')}<figcaption>Martin Droeshout’s engraving from the title page of the First Folio, 1623.</figcaption></figure>
      <figure data-fig>${imgTag('Title page William Shakespeare\'s First Folio 1623.jpg', 900, 'First Folio title page')}<figcaption>The First Folio (1623): 36 plays, collected by his colleagues.</figcaption></figure>
      <figure data-fig>${imgTag('Swan-theatre-johannes-de-witt-ms-842-f132r-1596.jpg', 900, 'The Swan theatre')}<figcaption>The Swan, a London playhouse — the drawing after Johannes de Witt, 1596.</figcaption></figure>
    </div>
  </div></section>
  <section class="section" style="padding-top:0"><div class="wrap">
    <div class="sec-head"><h2 class="h2">The theatre</h2></div>
    <div class="theatre">${W.theatre.map(x => `<div class="panel"><h3 class="h3">${esc(x.h)}</h3><p>${esc(x.t)}</p>${srcLink(x.src)}</div>`).join('')}</div>
  </div></section>
  <section class="section" id="works" style="padding-top:0"><div class="wrap">
    <div class="sec-head"><h2 class="h2">The plays</h2><span class="meta">Every play is complete.</span></div>
    ${W.genreOrder.map(g => { const list = ids.filter(id => W.plays[id].genre === g); return `<div class="genre-row"><h3 class="h3">${g === 'Romance (late play)' ? 'Romances — the late plays' : g === 'History' ? 'Histories' : g === 'Comedy' ? 'Comedies' : 'Tragedies'} <small>${list.length} plays</small></h3>
      <div class="plist">${list.map(id => { const m = W.plays[id]; return `<button class="prow ${g.split(' ')[0]}" data-lw-onclick="go('play','${id}')"><span class="ini" ${artBg(ART[id], 300)}></span><span><b>${esc(m.title)}</b><small>${esc(m.date ? m.date.split(';')[0] : m.setting)}</small></span></button>`; }).join('')}</div></div>`; }).join('')}
  </div></section>
  <section class="section" style="padding-top:0"><div class="wrap">
    <button class="feature" style="margin-bottom:40px" data-lw-onclick="go('everyday')"><div class="ph" ${artBg(ART.tempest || ART.hamlet)}></div><div class="tx"><div class="kicker">Everyday English</div><h2 class="h2">Everyday Shakespeare</h2><p style="margin:0">${PHRASES.length} phrases we still use, each in its real line.</p><span class="btn sm" style="align-self:flex-start;margin-top:auto">Explore →</span></div></button>
    <div class="sec-head"><h2 class="h2">Famous passages</h2><span class="meta">With recordings and performances</span></div>
    <div class="grid">${SHAKESPEARE.map(card).join('')}</div>
  </div></section></div>`;
}
function pcard(id) {
  const m = PMETA[id];
  const a = ART[id]; const ph = a ? `<div class="ph" ${artBg(a, 900)}></div>` : `<div class="ph ty ${tone(id)}"><span>${esc(m.title)}</span></div>`;
  return `<button class="pcard" data-lw-onclick="go('play','${id}')">${ph}<div class="tx"><span class="kicker" style="font-size:11px">${esc(m.genre || m.form)}</span><h3 class="h3" style="font-size:22px">${esc(m.title)}</h3><small>${esc(m.setting || m.author)}</small></div></button>`;
}

/* ---------------- Play page ---------------- */
function playPage(id, tab, arg) {
  const P = PLAYS[id], m = PMETA[id]; if (!P || !m) return homePage();
  const isSh = !!W.plays[id]; const isRJ = id === 'romeo';
  const tabs = ['overview', 'read', 'characters'].concat(isRJ ? ['themes', 'language', 'stage'] : []).concat(['practiseT']);
  tab = tabs.includes(tab) ? tab : 'overview';
  const body = tab === 'read' ? readerPane(id, arg) : tab === 'characters' ? charPane(id) : tab === 'themes' ? themesPane() : tab === 'language' ? langPane() : tab === 'stage' ? stagePane() : tab === 'practiseT' ? playPractise(id) : overviewPane(id);
  const back = isSh ? 'shakespeare' : 'drama';
  const art = ART[id];
  return `<div><section class="play-head"><div class="bg" ${artBg(art, 2000)}></div>${art ? `<div class="credit">${esc(art.credit)} · ${art.lic}</div>` : ''}<div class="wrap">
    <div class="crumbs"><button data-lw-onclick="go('${back}')">← ${isSh ? 'Shakespeare’s World' : t('drama')}</button></div>
    <div class="kicker" style="margin-top:22px">${esc(m.genre || m.form)}${m.translated ? ' · translated from ' + esc(m.translated.lang) : ''}</div>
    <h1 class="display" style="margin-top:12px">${esc(m.title)}</h1>
    <div class="by">${isSh ? 'William Shakespeare' : esc(m.author) + (m.dates ? ' (' + esc(m.dates) + ')' : '')}</div>
    <div class="ptabs">${tabs.map(k => `<button class="${tab === k ? 'on' : ''}" data-lw-onclick="go('play','${id}','${k}')">${t(k)}</button>`).join('')}</div>
  </div></section><div class="wrap">${body}</div></div>`;
}
function overviewPane(id) {
  const P = PLAYS[id], m = PMETA[id], isSh = !!W.plays[id];
  const facts = [];
  if (m.date) facts.push(['Date', m.date, m.dsrc]);
  if (m.setting || P.setting) facts.push(['Setting', m.setting || P.setting, null]);
  if (m.sources) facts.push(['Shakespeare’s sources', m.sources, m.ssrc]);
  (m.facts || []).forEach(f => facts.push(['About the play', f, m.fsrc]));
  const edition = isSh ? `The complete text from <i>The Complete Works of William Shakespeare</i>, Project Gutenberg eBook 100 — <a href="${pgUrl(100)}" target="_blank" rel="noopener">gutenberg.org/ebooks/100</a>. Public domain. Spelling and punctuation exactly as in this edition.` : `${esc(m.edition)} — <a href="${pgUrl(m.pg)}" target="_blank" rel="noopener">gutenberg.org/ebooks/${m.pg}</a>. Public domain.`;
  const guide = id === 'romeo' ? rjGuide() : W.acts[id] ? `<div class="panel"><span class="learner">${t('learnerNote')}</span><h2 class="h3">The story, act by act</h2><div class="acts-guide">${W.acts[id].map((x, i) => `<div class="a"><b>${roman(i + 1)}</b><div><p>${esc(x)}</p><button class="btn sm ghost" data-lw-onclick="go('play','${id}','read','${firstSceneOfAct(P, i + 1)}')">Read Act ${roman(i + 1)} →</button></div></div>`).join('')}</div></div>` : '';
  const vids = playVideos(id);
  return `<div class="ov"><div>
      ${m.blurb ? `<p class="lede" style="font-family:var(--lit);font-size:26px;line-height:1.35;margin:0 0 6px">${esc(m.blurb)}</p>${srcLink(m.bsrc)}` : ''}
      ${m.note ? `<div class="happens" style="margin-top:20px"><span class="learner">${t('learnerNote')}</span><br>${esc(m.note)}</div>` : ''}
      <div style="margin:22px 0"><button class="btn" data-lw-onclick="go('play','${id}','read')">${t('readFull')} →</button></div>
      ${guide}${vids}${playExtras(id)}${wordChips('play', id)}
    </div><div class="facts">
      ${facts.map(([k, v, s]) => `<div class="fact"><b>${esc(k)}</b>${esc(v)}${srcLink(s)}</div>`).join('')}
      <div class="fact"><b>Structure</b>${P.acts.filter(a => a.n).length ? P.acts.filter(a => a.n).length + ' acts, ' : ''}${P.acts.reduce((n, a) => n + a.sc.length, 0)} ${P.acts.filter(a => a.n).length ? 'scenes and parts' : 'parts'}</div>
      ${m.translated ? `<div class="fact"><b>Translation</b>Originally written in ${esc(m.translated.lang)} (<i>${esc(m.translated.orig)}</i>). English translation by ${esc(m.translated.by)}. This is world literature in translation, not English literature.</div>` : ''}
      <div class="fact"><b>Text used</b>${edition}</div>
      ${ART[id] ? `<figure class="frame" data-fig style="margin:0">${imgTag(ART[id].file, 900, ART[id].credit)}<figcaption class="lbl" style="margin-top:10px">${credit(ART[id])}</figcaption></figure>` : ''}
      ${id === 'romeo' ? `<figure class="frame" data-fig style="margin:0">${imgTag('Madox Brown-Romeo & Juliet.JPG', 900, 'Ford Madox Brown, Romeo and Juliet')}<figcaption class="lbl" style="margin-top:10px">Ford Madox Brown, Romeo and Juliet · Public domain · <a href="${COMMONS('Madox Brown-Romeo & Juliet.JPG')}" target="_blank" rel="noopener">Wikimedia Commons</a></figcaption></figure>` : ''}
      ${id === 'macbeth' ? `<figure class="frame" data-fig style="margin:0">${imgTag('Ellen Terry as Lady Macbeth.jpg', 900, 'Sargent, Ellen Terry as Lady Macbeth')}<figcaption class="lbl" style="margin-top:10px">John Singer Sargent, Ellen Terry as Lady Macbeth · Public domain</figcaption></figure>` : ''}
      ${id === 'hamlet' ? `<figure class="frame" data-fig style="margin:0">${imgTag('Hamlet et Horatio au cimetière - Eugène Delacroix - Musée du Louvre Peintures RF 1942.jpg', 900, 'Delacroix, Hamlet and Horatio')}<figcaption class="lbl" style="margin-top:10px">Eugène Delacroix, Hamlet and Horatio in the Graveyard — Louvre · Public domain</figcaption></figure>` : ''}
    </div></div>`;
}
function firstSceneOfAct(P, actN) { const ai = P.acts.findIndex(a => a.n === roman(actN)); return ai < 0 ? '0.0' : ai + '.0'; }
function playVideos(id) {
  const play = { romeo: 'Romeo and Juliet', hamlet: 'Hamlet', macbeth: 'Macbeth', asyou: 'As You Like It' }[id]; if (!play) return '';
  const vs = SHAKESPEARE.filter(s => s.play === play).flatMap(s => [s.video].concat(s.videos || [])).filter(Boolean);
  if (!vs.length) return '';
  return `<div class="watch" style="margin-top:30px"><h2 class="h3" style="margin-bottom:14px">${t('watch')}</h2><div class="vids" style="grid-template-columns:repeat(2,1fr)">${vs.map(videoBlock).join('')}</div></div>`;
}
function rjGuide() {
  const P = PLAYS.romeo;
  return `<div class="panel"><span class="learner">${t('learnerNote')}</span><h2 class="h3">The story, scene by scene</h2><p class="hint">Twenty-four scenes, five days. Tap a scene to read it in full.</p>
    <div class="acts-guide">${P.acts.map((a, ai) => a.sc.map((s, si) => { const k = a.n + '|' + s.n; const note = W.rj.scenes[k]; if (!note) return ''; return `<div class="a"><b style="font-size:18px;font-family:var(--ui);font-weight:700">${a.n ? a.n + (s.n ? '.' + s.n : '') : 'Pro.'}</b><div><p>${esc(note)}</p>${s.loc ? `<small class="meta">${esc(s.loc)}</small><br>` : ''}<button class="btn sm ghost" data-lw-onclick="go('play','romeo','read','${ai}.${si}')">Read →</button></div></div>`; }).join('')).join('')}</div></div>`;
}

/* reader */
let REH = '', FS = 19;
function readerPane(id, arg) {
  const P = PLAYS[id]; let [ai, si] = (arg || '0.0').split('.').map(Number); if (!P.acts[ai]) ai = 0; if (!P.acts[ai].sc[si]) si = 0;
  const sc = P.acts[ai].sc[si]; const flat = []; P.acts.forEach((a, x) => a.sc.forEach((s, y) => flat.push([x, y])));
  const pos = flat.findIndex(([x, y]) => x === ai && y === si); const prev = flat[pos - 1], next = flat[pos + 1];
  const speakers = [...new Set(sc.b.filter(b => b.s).map(b => b.s))];
  const note = id === 'romeo' ? W.rj.scenes[P.acts[ai].n + '|' + sc.n] : null;
  const nav = P.acts.map((a, x) => `${a.n ? `<div class="act">Act ${a.n}</div>` : ''}${a.sc.map((s, y) => `<button class="${x === ai && y === si ? 'on' : ''}" data-lw-onclick="go('play','${id}','read','${x}.${y}')">${esc(sceneLabel(P, x, y).replace(/^Act [IVX]+, /, ''))}${s.loc ? `<small>${esc(s.loc)}</small>` : ''}</button>`).join('')}`).join('');
  const sel = `<select class="snav-sel" aria-label="Choose a scene" data-lw-onchange="go('play','${id}','read',this.value)">${flat.map(([x, y]) => `<option value="${x}.${y}" ${x === ai && y === si ? 'selected' : ''}>${esc(sceneLabel(P, x, y))}${P.acts[x].sc[y].loc ? ' — ' + esc(P.acts[x].sc[y].loc) : ''}</option>`).join('')}</select>`;
  return `<div class="reader"><nav class="snav">${nav}</nav><div class="script" style="--fs:${FS}px">${sel}
    <div class="scene-h"><h2>${esc(sceneLabel(P, ai, si))}</h2>${sc.loc ? `<span>${esc(sc.loc)}</span>` : ''}</div>
    ${note ? `<div class="happens"><span class="learner">${t('whatHappens')}</span><br>${esc(note)}</div>` : ''}
    <div class="rtools"><label>${t('rehearse')} <select data-lw-onchange="REH=this.value;render()"><option value="">${t('nobody')}</option>${speakers.map(s => `<option ${REH === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
      <span style="flex:1"></span><span class="meta">${t('textSize')}</span><button data-lw-onclick="FS=Math.max(15,FS-2);render()">A−</button><button data-lw-onclick="FS=Math.min(27,FS+2);render()">A+</button></div>
    ${REH ? `<p class="hint">Your lines are hidden. Say them aloud, then tap to check.</p>` : ''}
    <div id="script">${sc.b.map((b, bi) => blockHTML(b, bi)).join('')}</div>
    <div class="pager">${prev ? `<button class="btn sm ghost" data-lw-onclick="go('play','${id}','read','${prev.join('.')}')">← ${esc(sceneLabel(P, prev[0], prev[1]))}</button>` : '<span></span>'}${next ? `<button class="btn sm" data-lw-onclick="go('play','${id}','read','${next.join('.')}')">${esc(sceneLabel(P, next[0], next[1]))} →</button>` : ''}</div>
  </div></div>`;
}
const inl = s => esc(s).replace(/\[_(.+?)_\]/g, '<i class="isd">[$1]</i>').replace(/_([^_]+)_/g, '<em>$1</em>');
function blockHTML(b, bi) {
  if (b.d != null) return `<div class="sd">${inl(b.d.replace(/^\[_?|_?\]$/g, ''))}</div>`;
  const mine = REH && b.s === REH;
  const lines = b.p.map(p => p.pr ? `<p>${inl(p.pr)}</p>` : `<div style="margin-bottom:8px">${p.v.map(l => `<span class="vl ${/^\s{2,}/.test(l) ? 'ind' : ''}">${inl(l.trim())}</span>`).join('')}</div>`).join('');
  return `<div class="sp ${b.c ? 'c' : ''} ${mine ? 'mine' : ''}" id="b${bi}">${b.s ? `<span class="who">${esc(b.s)}</span>` : ''}<div class="lines" ${mine ? 'data-lw-onclick="this.parentNode.classList.toggle(\'show\')"' : ''}>${lines}</div></div>`;
}
function goQuote(id, q) { const P = PLAYS[id]; go('play', id, 'read', q.a + '.' + q.s); setTimeout(() => { const el = $id('b' + q.b); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2400); } }, 120); }

/* characters */
function charPane(id) {
  const P = PLAYS[id], m = PMETA[id]; const top = m.top || topSpeakers(P); const max = top[0] ? top[0][1] : 1;
  const houses = id === 'romeo' ? (() => {
    const H = W.rj.houses; const find = n => P.personae.find(x => x.toUpperCase().startsWith(n)) || n;
    const col = (cls, title, list) => `<div class="house ${cls}"><h3 class="h3">${title}</h3>${list.map(n => { const f = find(n); const [nm, ...rest] = f.split(','); return `<div><b>${esc(nm.replace(/\.$/, ''))}</b>${rest.length ? '<br>' + esc(rest.join(',').trim().replace(/\.$/, '')) : ''}</div>`; }).join('')}</div>`;
    return `<div class="panel"><h2 class="h3">Two houses — and the city between them</h2><p class="hint">Descriptions are Shakespeare’s own list of characters, as printed in this edition.</p><div class="houses">${col('m', 'House of Montague', H.montague)}${col('c', 'House of Capulet', H.capulet)}${col('v', 'Verona & the Church', H.verona)}</div></div>`;
  })() : '';
  return `<div style="padding:34px 0">${houses}
    <div class="ov" style="padding-top:20px"><div class="panel"><h2 class="h3">Who speaks most?</h2><p class="hint">Counted from the complete text: lines of verse, or about 60 characters of prose per line.</p>
      <div class="bars">${top.map(([n, c]) => `<div><span>${esc(n)}</span><i style="width:${Math.max(4, c / max * 100)}%"></i><span class="meta">${c}</span></div>`).join('')}</div></div>
    <div class="panel"><h2 class="h3">${P.personae.length ? 'The characters' : 'Characters'}</h2><p class="hint">As listed in the edition (dramatis personae).</p><div class="personae">${(P.personae.length ? P.personae : top.map(x => x[0])).map(x => `<div>${esc(x)}</div>`).join('')}</div></div></div></div>`;
}
function topSpeakers(P) { const c = {}; P.acts.forEach(a => a.sc.forEach(s => s.b.forEach(b => { if (b.s) c[b.s] = (c[b.s] || 0) + b.p.reduce((n, p) => n + (p.v ? p.v.length : Math.max(1, Math.round(p.pr.length / 60))), 0); }))); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8); }

/* R&J extras */
const quoteBtn = (id, q) => `<button class="qt" data-lw-onclick='goQuote("${id}",${JSON.stringify({ a: q.a, s: q.s, b: q.b })})'>“${esc(q.q)}”<small>${esc(q.who)} · ${esc(q.ref.replace(/^\|?/, ''))}${q.note ? ' · ' + esc(q.note) : ''} — read in context →</small></button>`;
function themesPane() {
  return `<div style="padding:34px 0"><span class="learner">${t('learnerNote')}</span><h2 class="h2">Themes</h2><p class="lede">Every quotation is taken from the complete text — tap it to see the line in its scene.</p>
    <div class="themes">${W.rj.themes.map(th => `<div class="panel"><h3 class="h3">${esc(th.k)}</h3><p style="margin:8px 0 0">${esc(th.t)}</p>${th.q.map(q => quoteBtn('romeo', q)).join('')}</div>`).join('')}</div>
    <h2 class="h2" style="margin-top:46px">Famous speeches</h2><div class="themes">${W.rj.speeches.map(q => `<div>${quoteBtn('romeo', q)}</div>`).join('')}</div></div>`;
}
function langPane() {
  return `<div style="padding:34px 0"><span class="learner">${t('learnerNote')}</span><h2 class="h2">Shakespeare’s language</h2>
    <h3 class="h3" style="margin-top:26px">Literary devices</h3><div class="themes">${W.rj.devices.map(d => `<div class="panel"><h3 class="h3" style="font-size:22px">${esc(d.k)}</h3><p style="margin:6px 0 0">${esc(d.t)}</p>${quoteBtn('romeo', d.q)}</div>`).join('')}</div>
    <h3 class="h3" style="margin-top:36px">Words you will meet</h3><div class="seg" style="margin-top:10px"><button class="${SUP === 'ru' ? 'on' : ''}" data-lw-onclick="SUP='ru';render()">Русский</button><button class="${SUP === 'kz' ? 'on' : ''}" data-lw-onclick="SUP='kz';render()">Қазақша</button></div>
    <div class="wordlist">${W.rj.words.map(w => `<div><b>${esc(w[0])}</b><small>${esc(w[1])} · ${esc(SUP === 'kz' ? w[2] : w[3])}</small>${w[4] ? `<em>“${esc(w[4])}”</em>` : ''}</div>`).join('')}</div></div>`;
}
function stagePane() {
  const R = W.rj;
  return `<div class="ov" style="padding-top:34px"><div>
      <h2 class="h2">Where the story came from</h2><div class="facts" style="margin-top:16px">${R.history.map(h => `<div class="fact">${esc(h.t)}${srcLink(h.src)}</div>`).join('')}</div>
      <h2 class="h2" style="margin-top:40px">On stage</h2><div class="tl">${R.stage.map(x => `<div><b>${esc(x.y)}</b><span>${esc(x.t)}</span></div>`).join('')}</div>${srcLink(R.stagesrc)}
    </div><div><h2 class="h2">Adaptations</h2><div class="tl">${R.adaptations.map(x => `<div><b>${esc(x.y)}</b><span>${esc(x.t)}</span></div>`).join('')}</div>${srcLink(R.stagesrc)}
      ${playVideos('romeo')}</div></div>`;
}

/* practise for plays */
function playPractise(id) {
  return `<div class="practise" style="padding:34px 0"><div class="panel"><div class="acts">${['whoSays'].concat(id === 'romeo' ? ['plot'] : []).map((k, i) => `<button data-pact="${k}" class="${i ? '' : 'on'}">${t(k)}</button>`).join('')}</div><div id="pactBody"></div></div>
    <div><div class="panel"><h2 class="h3">Perform a scene</h2><p class="hint">Open any scene, choose “${t('rehearse')}” and a character: your lines are hidden while the others stay visible. Say your part aloud, record it, then compare.</p>
      <button class="btn sm" data-lw-onclick="go('play','${id}','read','${id === 'romeo' ? '2.2' : '0.0'}')">${id === 'romeo' ? 'Rehearse the balcony scene' : 'Choose a scene'} →</button>
      <div class="rec" id="rec" style="margin-top:16px"><span class="recdot"></span><button class="btn sm" id="recBtn" data-lw-onclick="toggleRec()">● ${t('record')}</button><audio id="recOut" controls hidden></audio></div><p class="meta">${t('recHint')}</p></div></div></div>`;
}
function openPlayAct(id, k) {
  $$('[data-pact]').forEach(b => b.classList.toggle('on', b.dataset.pact === k)); const box = $('#pactBody'); const P = PLAYS[id];
  if (k === 'whoSays') {
    const top = (PMETA[id].top || topSpeakers(P)).slice(0, 6).map(x => x[0]);
    const pool = []; P.acts.forEach(a => a.sc.forEach(s => s.b.forEach(b => { if (b.s && top.includes(b.s) && !b.c) { const l = b.p[0] && (b.p[0].v ? b.p[0].v.join(' ') : b.p[0].pr); if (l && l.length > 40 && l.length < 220) pool.push([l, b.s]); } })));
    let score = 0, n = 0;
    const ask = () => {
      const [line, who] = pool[Math.floor(Math.random() * pool.length)]; const opts = shuffle([who, ...shuffle(top.filter(x => x !== who)).slice(0, 3)]);
      box.innerHTML = `<p class="hint">A real line from the play. Who speaks it? ${n ? `<b>${score}/${n}</b>` : ''}</p><div class="line-card" style="font-family:var(--lit);font-size:21px">“${inl(line)}”</div><div class="opts">${opts.map(o => `<button data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="fb"></div><button class="btn sm ghost" id="nxq">Another line</button>`;
      $$('.opts button', box).forEach(b => b.onclick = () => { if ($('.opts', box).dataset.done) return; $('.opts', box).dataset.done = 1; n++; const ok = b.dataset.o === who; lwAnswer('reading', ok); if (ok) score++; b.classList.add(ok ? 'ok' : 'no'); if (!ok) $$('.opts button', box).find(x => x.dataset.o === who).classList.add('ok'); $('.fb', box).textContent = ok ? 'Yes!' : 'It’s ' + who + '.'; });
      $('#nxq').onclick = ask;
    }; pool.length ? ask() : box.innerHTML = '<p class="hint">—</p>';
  }
  if (k === 'plot') {
    const all = []; P.acts.forEach(a => a.sc.forEach(s => { const x = W.rj.scenes[a.n + '|' + s.n]; if (x && a.n) all.push(x); }));
    const start = Math.floor(Math.random() * (all.length - 5)); const right = all.slice(start, start + 5); const mix = shuffle(right); let built = [];
    const draw = () => { const done = built.length === right.length; if (done) lwOnce(right, 0, 'reading', built.every((x, i) => x === right[i]));
      box.innerHTML = `<p class="hint">Five scenes that follow each other in the play. Put them in order.</p><div class="built">${built.map((x, i) => `<div class="${x === right[i] ? 'ok' : 'no'}">${i + 1}. ${esc(x)}</div>`).join('') || '<span class="meta">…</span>'}</div>
        <div class="choices">${mix.map((x, i) => `<button data-i="${i}" ${built.includes(x) ? 'disabled' : ''}>${esc(x)}</button>`).join('')}</div><div class="fb">${done ? (built.every((x, i) => x === right[i]) ? t('wellDone').replace('author', 'play') : t('tryAgain')) : ''}</div><button class="btn sm ghost" id="rs">${t('reset')}</button>`;
      $$('.choices button', box).forEach(b => b.onclick = () => { built.push(mix[+b.dataset.i]); draw(); }); $('#rs').onclick = () => { built = []; draw(); }; };
    draw();
  }
}

/* ---------------- Drama room ---------------- */
function dramaPage() {
  const order = ['everyman', 'faustus', 'wayworld', 'earnest', 'dollshouse', 'pygmalion', 'riders'];
  const G = W.godot;
  return `<div><div class="wrap page-head"><div class="kicker">Drama & theatre</div><h1 class="display" style="font-size:clamp(44px,5.4vw,76px);margin-top:10px">Drama</h1>
    <p class="lede">Seven centuries of plays, each one complete.</p>
    <div class="formline">${[['Middle Ages', 'Morality play', 'Everyman'], ['Elizabethan', 'Tragedy', 'Doctor Faustus'], ['Elizabethan & Jacobean', 'Shakespeare', '20 plays'], ['Restoration', 'Comedy of manners', 'The Way of the World'], ['Victorian', 'Comedy', 'Earnest'], ['Modern', 'Drama & comedy', 'A Doll’s House, Pygmalion, Riders to the Sea'], ['Post-war', 'Modern drama', 'Waiting for Godot']].map(x => `<div><small>${x[0]}</small><b>${x[1]}</b>${x[2]}</div>`).join('')}</div></div>
    <div class="wrap"><button class="feature" style="margin-top:30px" data-lw-onclick="go('shakespeare')"><div class="ph" ${artBg(ART.hamlet)}></div><div class="tx"><div class="kicker">Shakespeare’s World</div><h2 class="h2">Twenty complete plays</h2><p style="margin:0">Tragedies, comedies, histories and the late romances — with a full guide to Romeo and Juliet.</p><span class="btn sm" style="align-self:flex-start;margin-top:auto">Enter →</span></div></button>
    <div class="shelf"><div class="sh-h"><h2 class="h3">Complete plays</h2><p>Read the whole play, scene by scene; rehearse a role.</p></div>
      <div class="pcards" style="grid-template-columns:repeat(3,1fr)">${order.map(id => { const m = W.drama[id]; return `<button class="pcard" data-lw-onclick="go('play','${id}')"><div class="ph" ${artBg(ART[id], 900)}></div><div class="tx"><span class="kicker" style="font-size:11px">${esc(m.form)}</span><h3 class="h3" style="font-size:21px">${esc(m.title)}</h3><small style="font-family:var(--lit);font-size:16px;font-style:italic;color:var(--ink-2)">${esc(m.author)}</small><small>${esc(m.dates)} · ${esc(m.origin)}</small><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><span class="badge full">${t('complete')}</span>${m.translated ? `<span class="badge tr">${t('translated')}</span>` : ''}<span class="pill lv">${m.level}</span></div></div></button>`; }).join('')}</div></div>
    <div class="godot"><div class="gimg" ${artBg(ART.godot, 1200)}></div><div><div class="kicker" style="color:#c9a8ff">${esc(G.form)} · ${esc(G.dates)}</div><h2 class="h2" style="margin-top:10px">${esc(G.title)}</h2><p style="font-family:var(--lit);font-style:italic;font-size:21px">${esc(G.author)}</p><span class="badge cr">${t('copyright')}</span></div>
      <div>${G.facts.map(f => `<p>${esc(f)}</p>`).join('')}<p>${esc(G.copyright)}</p><div class="src" style="color:#bfb6cc">Source: <a style="color:#bfb6cc" href="${G.fsrc[1]}" target="_blank" rel="noopener">${esc(G.fsrc[0])}</a></div><div class="src" style="color:#9d93a8">Photograph: ${esc(ART.godot.credit)} · CC0</div></div></div>
    <div style="height:70px"></div></div></div>`;
}

/* ---------------- Prose & stories ---------------- */
function prosePage() {
  let items = W.prose; if (LEVEL) items = items.filter(x => x.level === LEVEL);
  const shelves = W.shelves.filter(s => items.some(x => x.shelf === s[0]));
  return `<div><div class="wrap page-head"><div class="kicker">${LEVEL ? 'Level ' + LEVEL : t('allLevels')}</div><h1 class="display" style="font-size:clamp(44px,5.4vw,76px);margin-top:10px">Stories</h1>
    <p class="lede">Short stories, fairy tales, essays and the first chapters of great novels — in the authors’ own words.</p>
    <div class="filters">${shelves.map(s => `<button class="chip" data-lw-onclick="$id('sh-${s[0]}').scrollIntoView({behavior:'smooth'})">${esc(s[1])}</button>`).join('')}</div></div>
    <div class="wrap">${shelves.map(s => `<div class="shelf" id="sh-${s[0]}"><div class="sh-h"><h2 class="h3">${esc(s[1])}</h2><p>${esc(s[2])}</p></div><div class="books">${items.filter(x => x.shelf === s[0]).map(book).join('')}</div></div>`).join('') || empty()}<div style="height:70px"></div></div></div>`;
}
function book(x) {
  const words = textWords(x); const min = Math.max(1, Math.round(words / 200));
  return `<button class="book ${tone(x.id)}" data-lw-onclick="go('text','${x.id}')"><span class="kicker" style="font-size:10.5px">${esc(PERIOD_NAME[x.period] || '')}</span><h4>${esc(x.title)}</h4><span class="au">${esc(x.author)}</span>
    <div class="bl">${x.complete ? `<span class="badge full">${t('complete')}</span>` : `<span class="badge ex">${t('extract')}</span>`}${x.translated ? `<span class="badge tr">${t('translated')}</span>` : ''}${x.american ? `<span class="badge us">${t('american')}</span>` : ''}<span class="meta">${min} ${t('minutes')}</span><span style="flex:1"></span><span class="pill lv">${x.level}</span></div></button>`;
}
function textWords(x) { const b = (LIB.prose[x.id] || {}).body || []; return b.reduce((n, p) => n + (typeof p === 'string' ? p.split(' ').length : Array.isArray(p) ? p.join(' ').split(' ').length : 0), 0); }
function textPageBase(id) {
  const x = TEXTS[id], R = LIB.prose[id]; if (!x || !R) return homePage();
  const isPoem = !!R.verse; const back = isPoem ? 'poetry' : 'prose';
  let body = '';
  if (isPoem) body = R.body.map(st => st.h ? `<h3>${esc(st.h)}</h3>` : st.g ? `<div class="gl">{${esc(st.g)}}</div>` : `<div class="stz">${st.map(l => `<span>${inl(l)}</span>`).join('')}</div>`).join('');
  else body = R.body.map(p => p.h ? `<h3>${esc(p.h)}</h3>` : Array.isArray(p) ? `<div class="vblock">${p.map(l => `<span>${inl(l)}</span>`).join('')}</div>` : `<p>${inl(p)}</p>`).join('') + (R.moral ? `<p class="moral">${inl(R.moral)}</p>` : '');
  const glosses = R.glossSrc ? `<div class="panel"><h3 class="h3" style="font-size:20px">Editor’s glosses</h3><p class="hint">Purves’s own notes in the margin of this edition.</p><div class="words">${Object.entries(R.glossSrc).map(([w, g]) => `<div><b>${esc(w)}</b><span>${esc(g)}</span></div>`).join('')}</div></div>` : '';
  const acts = proseActs(x, R);
  return `<div><div class="wrap"><div class="crumbs" style="padding-top:20px"><button data-lw-onclick="go('${back}')">← ${t(back)}</button><span>/</span><span>${esc(x.title)}</span></div>
    <div class="text-head"><div><div class="kicker">${esc(x.form || (SHELF[x.shelf] || [])[1] || '')} · ${esc(PERIOD_NAME[x.period] || '')}</div><h1 class="display" style="font-size:clamp(40px,5vw,70px);margin-top:12px">${esc(x.title)}</h1>
      <div class="by">${esc(x.author)}${x.dates ? ' (' + esc(x.dates) + ')' : ''}</div>
      <div class="pills" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px">${x.complete ? `<span class="badge full">${t('complete')}</span>` : `<span class="badge ex">${t('extract')}</span>`}${x.translated ? `<span class="badge tr">${t('translated')}</span>` : ''}${x.american ? `<span class="badge us">${t('american')}</span>` : ''}<span class="pill">${esc(x.origin)}</span><span class="pill lv">${x.level}</span></div></div>
      <figure data-fig>${x.img ? imgTag(x.img, 900, x.icap || x.title) : ''}</figure></div>
    <div class="reading"><div><div class="rtools"><span class="meta">${t('textSize')}</span><button data-lw-onclick="FS=Math.max(15,FS-2);render()">A−</button><button data-lw-onclick="FS=Math.min(27,FS+2);render()">A+</button></div>
      ${x.warn ? `<div class="warn" style="margin-bottom:18px">${esc(x.warn)}</div>` : ''}
      <article class="prose-body" style="--fs:${FS + 1}px">${body}</article>
      <div class="src-line"><span>${t('source')}: <i>${esc(x.edition)}</i></span>·<span>Public domain</span>·<a href="${pgUrl(R.pg)}" target="_blank" rel="noopener" style="color:var(--muted)">gutenberg.org/ebooks/${R.pg}</a></div>
      ${acts}</div>
    <aside class="side">${x.note ? `<div class="panel"><span class="learner">${t('learnerNote')}</span><p style="margin:0">${esc(x.note)}</p></div>` : ''}
      <div class="panel"><h3 class="h3" style="font-size:20px">About this text</h3>${(x.facts || []).map(f => `<p style="margin:8px 0 0;font-size:15px">${esc(f)}</p>`).join('')}${srcLink(x.fsrc)}</div>${glosses}${wordChips('text', id)}${sayingsFor(id)}</aside></div></div></div>`;
}
function proseActs(x, R) {
  const sents = [];
  (R.body || []).forEach(p => { if (typeof p !== 'string') return; sentSplit(p).filter(x => /[.!?][’”"')\]]*$/.test(x)).forEach(s => { s = s.trim(); const w = s.split(' ').length; if (w >= 9 && w <= 32 && /, /.test(s) && !/[“”"]/.test(s)) sents.push(s); }); });
  const fab = x.shelf === 'fable';
  if (!sents.length && !fab) return '';
  return `<div class="panel halves" style="margin-top:30px"><div class="acts">${sents.length ? `<button data-xact="ending" class="on">${t('ending')}</button>` : ''}${fab ? `<button data-xact="moral" class="${sents.length ? '' : 'on'}">${t('moralMatch')}</button>` : ''}<button data-xact="retell">${t('say')}</button></div><div id="xBody"></div></div>`;
}
function openXAct(id, k) {
  $$('[data-xact]').forEach(b => b.classList.toggle('on', b.dataset.xact === k)); const box = $('#xBody'); const R = LIB.prose[id];
  if (k === 'ending') {
    const sents = []; R.body.forEach(p => { if (typeof p !== 'string') return; sentSplit(p).filter(x => /[.!?][’”"')\]]*$/.test(x)).forEach(s => { s = s.trim(); const w = s.split(' ').length; if (w >= 9 && w <= 32 && /, /.test(s) && !/[“”"]/.test(s)) sents.push(s); }); });
    const ask = () => { const s = sents[Math.floor(Math.random() * sents.length)]; const cut = s.indexOf(', ', Math.floor(s.length * .3)); const i = cut > 0 ? cut + 2 : s.indexOf(', ') + 2; const head = s.slice(0, i), tail = s.slice(i);
      const others = shuffle(sents.filter(z => z !== s)).slice(0, 2).map(z => { const j = z.indexOf(', '); return z.slice(j + 2); });
      const opts = shuffle([tail, ...others]);
      box.innerHTML = `<p class="hint">Pick the author’s ending.</p><div class="line-card" style="font-family:var(--lit)">${inl(head)}<span class="blank">…</span></div><div class="choices">${opts.map((o, q) => `<button data-q="${q}">${inl(o)}</button>`).join('')}</div><div class="fb"></div><button class="btn sm ghost" id="nx2">Another</button>`;
      $$('.choices button', box).forEach(b => b.onclick = () => { const ok = opts[+b.dataset.q] === tail; lwOnce(opts, 0, 'reading', ok); b.classList.add(ok ? 'ok' : 'no'); $('.fb', box).textContent = ok ? t('wellDone') : t('tryAgain'); });
      $('#nx2').onclick = ask; };
    sents.length ? ask() : box.innerHTML = '';
  }
  if (k === 'moral') {
    const fables = W.prose.filter(f => f.shelf === 'fable' && LIB.prose[f.id].moral);
    const pick = shuffle(fables).slice(0, 4); const morals = shuffle(pick.map(f => LIB.prose[f.id].moral)); let sel = null; const done = {};
    const draw = () => { box.innerHTML = `<p class="hint">Tap a fable, then the moral printed with it in Townsend’s translation.</p><div class="pv-pairs" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="opts" style="flex-direction:column;align-items:stretch">${pick.map(f => `<button data-f="${f.id}" class="${done[f.id] ? 'ok' : sel === f.id ? 'on' : ''}" ${done[f.id] ? 'disabled' : ''}>${esc(f.title)}</button>`).join('')}</div><div class="opts" style="flex-direction:column;align-items:stretch">${morals.map((m, i) => `<button data-m="${i}" ${Object.values(done).includes(m) ? 'disabled class="ok"' : ''}>${esc(m)}</button>`).join('')}</div></div><div class="fb">${Object.keys(done).length === pick.length ? t('wellDone') : ''}</div>`;
      $$('[data-f]', box).forEach(b => b.onclick = () => { sel = b.dataset.f; draw(); });
      $$('[data-m]', box).forEach(b => b.onclick = () => { if (!sel) return; const m = morals[+b.dataset.m]; lwOnce(done, sel, 'reading', LIB.prose[sel].moral === m); if (LIB.prose[sel].moral === m) { done[sel] = m; sel = null; draw(); } else { b.classList.add('no'); setTimeout(() => b.classList.remove('no'), 600); } }); };
    draw();
  }
  if (k === 'retell') box.innerHTML = `<p class="hint">Read a paragraph aloud and record it; or retell the story in your own words in two minutes.</p><div class="rec" id="rec"><span class="recdot"></span><button class="btn sm" id="recBtn" data-lw-onclick="toggleRec()">● ${t('record')}</button><audio id="recOut" controls hidden></audio></div><p class="meta">${t('recHint')}</p><textarea aria-label="Your notes" placeholder="Notes…"></textarea>`;
}

/* ---------------- Periods ---------------- */
function resolveWork(w) {
  if (w === 's:world') return [`go('shakespeare')`, 'Shakespeare’s World', 'drama'];
  if (w.startsWith('d:')) { const id = w.slice(2); if (id === 'godot') return [`go('drama')`, W.godot.title, 'drama']; return [`go('play','${id}')`, W.drama[id].title, 'drama']; }
  if (w.startsWith('p:')) { const id = w.slice(2); return [`go('play','${id}')`, W.plays[id].title, 'play']; }
  const x = TEXTS[w]; return x ? [`go('text','${w}')`, x.title.split(' — ')[0], LIB.prose[w].verse ? 'poem' : 'prose'] : null;
}
function periodsPage() {
  return `<div><div class="wrap page-head"><div class="kicker">A journey through time</div><h1 class="display" style="font-size:clamp(44px,5.4vw,76px);margin-top:10px">Periods</h1>
    <p class="lede">From Old English to today, with texts to read. Definitions from Britannica and the British Library.</p></div>
    <div class="wrap"><div class="eras-v">${W.periods.map(p => { const ws = p.works.map(resolveWork).filter(Boolean); return `<div class="era-v"><div class="dot"></div><div class="card-e"><h2 class="h3">${esc(p.name)}<small>${esc(p.dates)}</small></h2><p>${esc(p.t)}</p>${srcLink(p.src)}
      ${ws.length ? `<div class="chips2">${ws.map(([on, title, kind]) => `<button data-lw-onclick="${on}">${esc(title)}<i>${kind}</i></button>`).join('')}</div>` : ''}</div></div>`; }).join('')}</div>
    <div class="panel" style="margin:10px 0 70px"><h3 class="h3">English literature — or literature in English?</h3><p style="margin:8px 0 0">Texts marked <span class="badge us">${t('american')}</span> are English-language literature from the United States. Texts marked <span class="badge tr">${t('translated')}</span> (Aesop, Ibsen, Beowulf in modern English) are translations, and the original language is always named.</p></div></div></div>`;
}

/* ---------------- Poetry additions ---------------- */
function poetryMore() {
  const items = W.poemsX.filter(x => !LEVEL || x.level === LEVEL); if (!items.length) return '';
  return `<div class="section-label"><h2 class="h3">Epic, narrative and free verse</h2><span class="meta">From Beowulf to Whitman — longer poems and openings, with editions named</span></div><div class="books">${items.map(x => `<button class="book ${tone(x.id)}" data-lw-onclick="go('text','${x.id}')"><span class="kicker" style="font-size:10.5px">${esc(x.form)}</span><h4>${esc(x.title)}</h4><span class="au">${esc(x.author)}</span><div class="bl">${x.complete ? `<span class="badge full">${t('complete')}</span>` : `<span class="badge ex">${t('extract')}</span>`}${x.translated ? `<span class="badge tr">${t('translated')}</span>` : ''}${x.american ? `<span class="badge us">${t('american')}</span>` : ''}<span style="flex:1"></span><span class="pill lv">${x.level}</span></div></button>`).join('')}</div>`;
}

/* ============================================================
   v4 — art direction: per-work artwork, museum entrance, themes
   Every file below was checked on Wikimedia Commons (exists,
   resolution, licence). Credits come from the file records.
   ============================================================ */
const A = (file, credit, lic, pos) => ({ file, credit, lic: lic || 'Public domain', pos: pos || '50% 30%' });
const ART = {
  /* Shakespeare plays */
  romeo: A('Frank Bernard Dicksee - Romeo and Juliet, 1884.jpg', 'Frank Dicksee, Romeo and Juliet, 1884', '', '50% 22%'),
  hamlet: A('John Everett Millais - Ophelia - Google Art Project.jpg', 'John Everett Millais, Ophelia, 1851–52', '', '50% 45%'),
  macbeth: A('Johann Heinrich Füssli 050.jpg', 'Henry Fuseli, Lady Macbeth Seizing the Daggers', '', '50% 35%'),
  othello: A('Frederick Richard Pickersgill - Othello and Desdemona.jpg', 'Frederick Richard Pickersgill, Othello and Desdemona', '', '50% 30%'),
  dream: A('Henry Fuseli - Titania and Bottom - Google Art Project.jpg', 'Henry Fuseli, Titania and Bottom', '', '50% 40%'),
  lear: A('Edwin Austin Abbey King Lear, Act I, Scene I The Metropolitan Museum of Art.jpg', 'Edwin Austin Abbey, King Lear, Act I, Scene I — The Metropolitan Museum of Art', '', '58% 40%'),
  caesar: A('Vincenzo Camuccini - La morte di Cesare.jpg', 'Vincenzo Camuccini, The Death of Julius Caesar', '', '50% 40%'),
  antony: A('Sir Lawrence Alma-Tadema - The Meeting of Antony and Cleopatra.jpg', 'Lawrence Alma-Tadema, The Meeting of Antony and Cleopatra', '', '60% 40%'),
  much: A('Thomas Francis Dicksee - Beatrice.jpg', 'Thomas Francis Dicksee, Beatrice', '', '50% 25%'),
  twelfth: A('William Hamilton - The revelation of Olivia\'s betrothal, from "Twelfth Night," Act V, Scene i - Google Art Project.jpg', 'William Hamilton, The Revelation of Olivia’s Betrothal (Twelfth Night, Act V, Scene i)', '', '50% 35%'),
  asyou: A("Daniel Maclise (1806-1870) - Phoebe and Silvius in the Forest of Arden, from Shakespeare's 'As You Like It' - P320-76 - The New Art Gallery Walsall.jpg", 'Daniel Maclise, Phoebe and Silvius in the Forest of Arden — The New Art Gallery Walsall', '', '50% 40%'),
  merchant: A('Herbert Stoppelaer - Shylock and Tubal from "The Merchant of Venice" - Google Art Project.jpg', 'Herbert Stoppelaer, Shylock and Tubal', '', '50% 35%'),
  r3: A('William Hogarth - David Garrick as Richard III - Google Art Project.jpg', 'William Hogarth, David Garrick as Richard III', '', '45% 35%'),
  r2: A("The Entry of Richard and Bolingbroke into London (from William Shakespeare's 'Richard II', Act V, Scene 2) James Northcote (1746–1831) Royal Albert Memorial Museum.jpg", 'James Northcote, The Entry of Richard and Bolingbroke into London — Royal Albert Memorial Museum', '', '50% 40%'),
  h4a: A('Thomas Wade (1828-1891) - Falstaff - PRSMG , P1963 - Harris Museum.jpg', 'Thomas Wade, Falstaff — Harris Museum', '', '50% 35%'),
  h4b: A('Fuseli Henry IV part 2 act II scene 4.jpg', 'Henry Fuseli, Henry IV Part 2, Act II, Scene 4', '', '50% 30%'),
  h5: A("Füssli - 'Henry V', Act II, Scene 2, Henry V Discovering the Conspirators (from the Boydell series), 1780s.jpg", 'Henry Fuseli, Henry V Discovering the Conspirators (Boydell series), 1780s', '', '50% 35%'),
  tempest: A('Waterhouse miranda the tempest.jpg', 'John William Waterhouse, Miranda — The Tempest', '', '50% 40%'),
  winter: A("Füssli - Mamillius Conjuring up Sprites and Goblins for His Mother, Hermione (William Shakespeare's 'The Winter's Tale'), 1785-1786.jpg", 'Henry Fuseli, Mamillius and Hermione (The Winter’s Tale), 1785–86', '', '50% 40%'),
  pericles: A('Marina singing before Pericles (Stothard, 1825).jpg', 'Thomas Stothard, Marina Singing before Pericles, 1825', 'CC BY-SA 4.0', '50% 35%'),
  /* other drama */
  everyman: A('Scène uit Den spyeghel der salicheyt van Elckerlijc (1909).jpg', 'A 1909 production of Elckerlijc, the Dutch play to which Everyman is closely related', '', '50% 40%'),
  faustus: A('Faustus-tragedy.gif', 'Title page of a later edition of Doctor Faustus, with a woodcut of a devil rising through a trapdoor', '', '50% 60%'),
  wayworld: A('William Congreve by Sir Godfrey Kneller, Bt.jpg', 'Sir Godfrey Kneller, William Congreve', '', '50% 25%'),
  earnest: A('The Importance of Being Earnest 1895 George Alexander and Rose Leclercq 1895.jpg', 'George Alexander and Rose Leclercq in the first production, 1895', 'CC0', '50% 25%'),
  dollshouse: A('Betty Hennings Nora 1.jpg', 'Betty Hennings as Nora', '', '50% 20%'),
  pygmalion: A('George Bernard Shaw by Coburn, 1908.jpg', 'Bernard Shaw, photographed by Coburn, 1908', '', '50% 25%'),
  godot: A("En attendant Godot, Festival d'Avignon, 1978 f22.jpg", 'En attendant Godot, Festival d’Avignon, 1978', 'CC0', '50% 50%'),
  /* prose */
  carol: A("Marley's Ghost - A Christmas Carol (1843), opposite 25 - BL.jpg", 'John Leech, Marley’s Ghost, 1843 — British Library', '', '50% 30%'),
  jekyll: A('Richard Mansfield - Dr. Jekyll and Mr. Hyde (play).jpg', 'Richard Mansfield in the stage version of Jekyll and Hyde — photograph by Henry Van der Weyde', '', '50% 30%'),
  timemachine: A('The Time Machine (H. G. Wells, William Heinemann, 1895) title page.jpg', 'Title page of the first edition, William Heinemann, 1895', '', '50% 30%'),
  'frank-letter1': A('Frontispiece to Frankenstein 1831.jpg', 'Frontispiece to the 1831 edition of Frankenstein', '', '50% 30%'),
  'frank-ch5': A('Frontispiece to Frankenstein 1831.jpg', 'Frontispiece to the 1831 edition of Frankenstein', '', '50% 30%'),
  'pp-ch1': A('Houghton Typ 805.94.8320 - Pride and Prejudice, 1894, Hugh Thomson - superior dancing.jpg', 'Hugh Thomson, illustration for the 1894 edition — Houghton Library', '', '50% 30%'),
  'je-ch1': A('Jane Eyre title page.jpg', 'Title page of the first edition of Jane Eyre', '', '50% 25%'),
  'ge-ch1': A('Charles Dickens by Frith 1859 (2).jpg', 'William Powell Frith, Charles Dickens, 1859', '', '50% 25%'),
  'alice-ch1': A('The White Rabbit (Tenniel) - The Nursery Alice (1890) - BL.jpg', 'John Tenniel, The White Rabbit (The Nursery Alice, 1890) — British Library', 'CC0', '50% 25%'),
  scandal: A('Sidney Paget - A Scandal in Bohemia 01.jpg', 'Sidney Paget, illustration for A Scandal in Bohemia', '', '50% 25%'),
  telltale: A('Harry Clarke The Tell-Tale Heart.jpg', 'Harry Clarke, The Tell-Tale Heart', '', '50% 30%'),
  araby: A('James Joyce by Alex Ehrenzweig, 1915 restored.jpg', 'James Joyce, photographed by Alex Ehrenzweig, 1915', '', '50% 20%'),
  gardenparty: A('Mansfield 1917.jpg', 'Katherine Mansfield, 1917 — photograph by Ottoline Morrell', '', '50% 25%'),
  kew: A('George Charles Beresford - Virginia Woolf in 1902 - Restoration.jpg', 'George Charles Beresford, Virginia Woolf, 1902', '', '50% 25%'),
  happyprince: A('Plate 1 of The Happy Prince and Other Tales (1888).png', 'Plate from the first edition of The Happy Prince and Other Tales, 1888', '', '50% 30%'),
  beanstalk: A('Walter Crane15.jpg', 'Walter Crane, Jack and the Beanstalk', '', '50% 30%'),
  threebears: A('The Three Bears - Project Gutenberg eText 17034.jpg', 'Arthur Rackham, “Somebody has been at my porridge” (1918)', '', '50% 30%'),
  'f-hare': A('Tortoise and hare rackham.jpg', 'Arthur Rackham, The Tortoise and the Hare', '', '50% 30%'),
  'f-crow': A('Fable-Esope-Rackham 05.jpg', 'Arthur Rackham, The Crow and the Pitcher', '', '50% 40%'),
  'f-town': A('Fable-Esope-Rackham 33.jpg', 'Arthur Rackham, The Town Mouse and the Country Mouse', '', '50% 40%'),
  'f-grapes': A('Aesops Fables-Rackham-039-1.jpg', 'Arthur Rackham, The Fox and the Grapes (1912)', '', '50% 50%'),
  'malory-sword': A('Arthur-Pyle How Arthur drew forth ye sword.JPG', 'Howard Pyle, How Arthur Drew Forth ye Sword', '', '50% 30%'),
  'bacon-studies': A('Somer Francis Bacon.jpg', 'Paul van Somer, Francis Bacon', '', '50% 25%'),
  'bacon-truth': A('Somer Francis Bacon.jpg', 'Paul van Somer, Francis Bacon', '', '50% 25%'),
  modest: A('Jonathan Swift by Charles Jervas detail.jpg', 'Charles Jervas, Jonathan Swift (detail)', '', '50% 25%'),
  'keats-letter': A('Portrait of John Keats drawn by Joseph Severn and etched by W. B. Scott.jpg', 'John Keats, drawn by Joseph Severn, etched by W. B. Scott', '', '50% 30%'),
  franklin: A('Joseph Siffrein Duplessis - Benjamin Franklin - Google Art Project.jpg', 'Joseph Siffred Duplessis, Benjamin Franklin', '', '50% 25%'),
  sidney: A('Sir Philip Sidney from NPG.jpg', 'Sir Philip Sidney — National Portrait Gallery', '', '50% 25%'),
  /* poems */
  'beowulf-1': A('Beowulf Cotton MS Vitellius A XV f. 132r (cropped).jpg', 'The first page of Beowulf, Cotton MS Vitellius A XV, f. 132r — British Library', '', '50% 20%'),
  'chaucer-prologue': A('Chaucer ellesmere.jpg', 'Chaucer on horseback, from the Ellesmere manuscript', '', '50% 30%'),
  'milton-pl1': A('John Martin Le Pandemonium Louvre.JPG', 'John Martin, Pandemonium — Louvre', '', '50% 50%'),
  'mariner-1': A('Rime of the Ancient Mariner-Albatross-Dore.jpg', 'Gustave Doré, illustration for The Rime of the Ancient Mariner', '', '50% 30%'),
  'whitman-astronomer': A('Walt Whitman, steel engraving, July 1854.jpg', 'Walt Whitman, steel engraving, July 1854', '', '50% 25%'),
};
const LINE_PLAY = { 'fl-winter-discontent': 'r3', 'fl-greatness': 'twelfth', 'fl-glisters': 'merchant', 'fl-valour': 'h4a', 'fl-brevity': 'hamlet', 'fl-borrower': 'hamlet' };
const PERIOD_ART = { oldenglish: 'beowulf-1', middle: 'chaucer-prologue', renaissance: 'sidney', jacobean: 'macbeth', restoration: 'wayworld', augustan: 'modest', romantic: 'mariner-1', victorian: 'carol', modern: 'kew', postmodern: 'godot' };
const PERIOD_THEME = { oldenglish: 'medieval', middle: 'medieval', renaissance: 'renaissance', jacobean: 'renaissance', restoration: 'augustan', augustan: 'augustan', seventeenth: 'renaissance', romantic: 'romantic', victorian: 'victorian', american19: 'american', modern: 'modern', postmodern: 'modern', traditional: 'brand' };
const JACKET = { medieval: '#6B4A2B', renaissance: '#7B2335', augustan: '#1F4D55', romantic: '#2E4B3C', victorian: '#24344F', american: '#3E4A57', modern: '#4D3160', brand: '#4A2F7A' };
const artOf = id => ART[id] || null;
const credit = a => a ? `${esc(a.credit)} · ${a.lic} · <a href="${COMMONS(a.file)}" target="_blank" rel="noopener">Wikimedia Commons</a>` : '';
const artBg = (a, w) => a ? `style="background-image:url('${IMG(a.file, w || 1600)}');background-position:${a.pos}"` : '';

/* theme per view */
function themeFor() {
  const v = S.view;
  if (v === 'home' || v === 'periods' || v === 'sources' || v === 'words' || v === 'word' || v === 'find' || v === 'workshop') return 'museum';
  if (v === 'everyday') return 'renaissance';
  if (v === 'voices') return 'victorian';
  if (v === 'shakespeare') return 'renaissance';
  if (v === 'play') return W.plays[S.id] ? 'renaissance' : 'theatre';
  if (v === 'drama') return 'theatre';
  if (v === 'rhymes' || v === 'proverbs') return 'brand';
  if (v === 'text') { const x = TEXTS[S.id]; return x ? (PERIOD_THEME[x.period] || 'museum') : 'museum'; }
  if (v === 'prose') return 'victorian';
  if (v === 'poetry') return 'romantic';
  if (v === 'item' && BY[S.id]) { const it = BY[S.id]; if (it.strand === 'shakespeare') return 'renaissance'; if (it.strand === 'wise' || it.strand === 'rhymes' || it.strand === 'say') return 'brand'; return PERIOD_THEME[it.era] || 'romantic'; }
  return 'museum';
}

/* ---------- the entrance ---------- */
const SHOW2 = [
  { a: ART.hamlet, title: 'Ophelia', go: ['play', 'hamlet'], work: 'Hamlet', quote: 'There’s rosemary, that’s for remembrance' },
  { a: ART.romeo, title: 'Romeo and Juliet', go: ['play', 'romeo'], work: 'Romeo and Juliet', quote: 'It is the east, and Juliet is the sun!' },
  { a: A('John Glover - Ullswater, early morning - Google Art Project.jpg', 'John Glover, Ullswater, Early Morning, c. 1824', '', '45% 50%'), title: 'Ullswater, Early Morning', go: ['item', 'po-daffodils'], work: 'Daffodils', quote: 'I wander’d lonely as a cloud' },
  { a: ART.dream, title: 'Titania and Bottom', go: ['play', 'dream'], work: 'A Midsummer Night’s Dream', quote: 'Lord, what fools these mortals be!' },
  { a: ART.carol, title: 'Marley’s Ghost', go: ['text', 'carol'], work: 'A Christmas Carol', quote: 'Marley was dead: to begin with.' },
  { a: A('John William Waterhouse - La Belle Dame sans Merci (1893).jpg', 'John William Waterhouse, La Belle Dame sans Merci, 1893', '', '50% 35%'), title: 'La Belle Dame sans Merci', go: ['item', 'po-belle-dame'], work: 'La Belle Dame sans Merci', quote: 'And no birds sing.' },
];
function homePage() {
  const nPlays = Object.keys(PLAYS).length, nPoems = POEMS.length + W.poemsX.length, nProse = W.prose.length;
  const s0 = SHOW2[0];
  const wall = [ART.lear, ART['beowulf-1'], ART.earnest, ART['alice-ch1'], ART.tempest, ART['mariner-1'], ART.scandal, ART.antony, ART['malory-sword']];
  const wallGo = [`go('play','lear')`, `go('text','beowulf-1')`, `go('play','earnest')`, `go('text','alice-ch1')`, `go('play','tempest')`, `go('text','mariner-1')`, `go('text','scandal')`, `go('play','antony')`, `go('text','malory-sword')`];
  const wallT = ['King Lear', 'Beowulf', 'The Importance of Being Earnest', 'Alice’s Adventures in Wonderland', 'The Tempest', 'The Rime of the Ancient Mariner', 'A Scandal in Bohemia', 'Antony and Cleopatra', 'Le Morte d’Arthur'];
  return `<div>
  <section class="lw-hero"><div class="wrap">
    <div>
      <div class="lw-over"><i></i>Just To Study · The Literature Collection</div>
      <h1 class="lw-title">English <em>Literature</em></h1>
      <p class="lw-intro">Thirteen centuries of poems, plays and stories — complete, in their authors’ own words — hung beside the paintings, manuscripts and first editions that belong to them.</p>
      <div class="lw-ctas"><button class="btn" data-lw-onclick="$id('galleries').scrollIntoView({behavior:'smooth'})">Enter the collection →</button><button class="btn ghost" data-lw-onclick="$id('levels').scrollIntoView({behavior:'smooth'})">${t('chooseLevel')}</button></div>
      <dl class="lw-facts"><div><dt>${nPlays}</dt><dd>complete plays</dd></div><div><dt>${nPoems}</dt><dd>poems</dd></div><div><dt>${nProse}</dt><dd>stories, chapters & essays</dd></div><div><dt>${W.periods.length}</dt><dd>periods</dd></div></dl>
    </div>
    <div class="lw-stage">
      <div class="frame">${SHOW2.map((s, i) => `<div class="art ${i ? '' : 'on'}" ${artBg(s.a, 1400)}></div>`).join('')}</div>
      <div class="lw-quote" id="lwq">${esc(s0.quote)}</div>
      <div class="lbl" id="lwl"><span><b>${esc(s0.title)}</b>${esc(s0.a.credit)}</span><button data-lw-onclick="go('${s0.go[0]}','${s0.go[1]}')">${esc(s0.work)} →</button></div>
      <div class="lw-dots">${SHOW2.map((s, i) => `<button class="${i ? '' : 'on'}" aria-label="${esc(s.title)}" data-lw-onclick="showArt(${i},true)"></button>`).join('')}</div>
    </div></div></section>

  <section class="section" id="galleries" style="padding-top:50px"><div class="wrap">
    <div class="lw-sh"><span class="no">I–VI</span><div class="rule"></div><p>Six galleries. Each has its own period, its own pictures — and complete texts to read.</p></div>
    <h2 class="h2" style="margin:-10px 0 28px">The Galleries</h2>
    <div class="galleries">
      <button class="gal g1" style="--g:var(--burgundy)" data-lw-onclick="go('shakespeare')"><div class="pic" ${artBg(ART.lear, 2000)}></div><div class="cap"><div class="lbl">Gallery I · ${Object.keys(W.plays).length} complete plays</div><h3>Shakespeare’s World</h3><p>His life and his London, the Globe, and twenty plays — with a full companion to Romeo and Juliet, performances and a rehearsal mode.</p><div class="lbl" style="margin-top:22px"><b>King Lear, Act I, Scene I</b>Edwin Austin Abbey · The Met</div></div></button>
      <button class="gal g2" style="--g:var(--oxblood)" data-lw-onclick="go('drama')"><div class="pic" ${artBg(ART.earnest, 1200)}></div><div class="cap"><div class="lbl">Gallery II · ${Object.keys(W.drama).length} more plays</div><h3>${t('drama')}</h3><p>From the medieval Everyman to Wilde, Shaw and Ibsen.</p></div></button>
      <button class="gal g3" style="--g:var(--forest)" data-lw-onclick="go('poetry')"><div class="pic" ${artBg(A('John Glover - Ullswater, early morning - Google Art Project.jpg', '', '', '45% 55%'), 1600)}></div><div class="cap"><div class="lbl">Gallery III · ${nPoems} poems · with human recordings</div><h3>${t('poetry')}</h3><p>From Beowulf and Chaucer to Keats, Dickinson and Yeats — each poem beside the painting or page it belongs to.</p></div></button>
      <button class="gal g4" style="--g:var(--navy)" data-lw-onclick="go('prose')"><div class="pic" ${artBg(ART.scandal, 900)}></div><div class="cap"><div class="lbl">Gallery IV · ${nProse} texts</div><h3>${t('prose')}</h3><p>Dickens, Austen, Brontë, Conan Doyle, Joyce, Woolf.</p></div></button>
      <button class="gal g5" style="--g:var(--umber)" data-lw-onclick="go('periods')"><div class="pic" ${artBg(ART['beowulf-1'], 900)}></div><div class="cap"><div class="lbl">Gallery V · Old English to today</div><h3>${t('periods')}</h3><p>A walk through thirteen centuries.</p></div></button>
      <button class="gal g6" style="--g:var(--violet)" data-lw-onclick="go('rhymes')"><div class="pic"><div class="bub"><span>Peter Piper picked a peck…</span><span>Jack and Jill went up the hill</span><span>Many hands make light work.</span><span>There was an Old Man with a beard</span></div></div><div class="cap"><div class="lbl">Gallery VI · ${n('rhymes')} rhymes · ${n('proverbs')} proverbs</div><h3>${t('rhymesay')}</h3><p>Where English begins: rhythm, sound and sayings.</p></div></button>
    </div></div></section>

  <section class="section" style="padding-top:20px"><div class="wrap">
    <div class="lw-sh"><span class="no">From the collection</span><div class="rule"></div><p>Paintings, manuscripts and first editions — each leads to the work it belongs to.</p></div>
    <div class="salon">${wall.map((a, i) => `<button class="w" data-lw-onclick="${wallGo[i]}"><div class="frame"><img src="${IMG(a.file, 800)}" alt="${esc(a.credit)}" loading="lazy"></div><div class="lbl"><b>${esc(wallT[i])}</b>${esc(a.credit)}</div></button>`).join('')}</div>
  </div></section>

  <section class="section" style="padding-top:20px"><div class="wrap"><div class="featured">
    <div class="plate"><img src="${img(BY['po-tiger'].image.file, 900)}" alt="${esc(BY['po-tiger'].image.credit)}" loading="lazy"></div>
    <div><div class="kicker">${t('featured')}</div><h2 class="h2" style="margin:10px 0 6px">${esc(BY['po-tiger'].title)}</h2><div class="meta" style="font-size:15px">William Blake · Songs of Experience, 1794</div>
      <p style="margin:18px 0 0;font-family:var(--display);font-size:30px;font-style:italic;line-height:1.2">“Tiger, tiger, burning bright / In the forests of the night”</p>
      ${voiceBlock(BY['po-tiger'], 'feat')}
      <button class="btn sm" style="margin-top:10px" data-lw-onclick="go('item','po-tiger')">${t('enter')} the poem →</button></div>
  </div></div></section>

  <section class="section" style="padding-top:20px"><div class="wrap">
    <div class="lw-sh"><span class="no">${t('voices')}</span><div class="rule"></div><p>Tap a period to walk through it.</p></div>
    <div class="strip">${W.periods.map(p => { const a = ART[PERIOD_ART[p.id]]; return `<button data-lw-onclick="go('periods')"><div class="ph" ${artBg(a, 600)}></div><b>${esc(p.name)}</b><small>${esc(p.dates)}</small></button>`; }).join('')}</div>
  </div></section>

  <section class="section" style="padding-top:20px"><div class="wrap">
    <div class="lw-sh"><span class="no">VII–IX</span><div class="rule"></div><p>Learn English from the literature itself.</p></div>
    <div class="learnx">
      <button data-lw-onclick="go('words')"><span class="kicker">Gallery VIII</span><h3>Words from literature</h3><p>${WORDS.length} words met in real poems, plays and stories — encounter, understand, hear, practise, use, and meet them again.</p><span class="btn sm">Open →</span></button>
      <button data-lw-onclick="go('everyday')"><span class="kicker">Shakespeare’s World</span><h3>You already speak Shakespeare</h3><p>${PHRASES.length} everyday phrases, each shown in the exact line of the play.</p><span class="btn sm">Open →</span></button>
      <button data-lw-onclick="go('voices')"><span class="kicker">Gallery VII</span><h3>Voices of English</h3><p>Literary, colloquial, slang, criminal cant, dialect, archaic — and an 1811 slang dictionary.</p><span class="btn sm">Open →</span></button>
      <button data-lw-onclick="go('workshop')"><span class="kicker">Gallery IX</span><h3>The Workshop</h3><p>Practice built from real lines: rhyme, voice, old forms, endings, proverbs, register.</p><span class="btn sm">Open →</span></button>
    </div></div></section>

  <section class="section" id="levels" style="padding-top:20px"><div class="wrap">
    <div class="lw-sh"><span class="no">${t('chooseLevel')}</span><div class="rule"></div><p>Texts are never simplified — each is placed where its language makes sense.</p></div>
    <div class="levels">${LEVELS.map(l => `<button class="${LEVEL === l ? 'on' : ''}" data-lw-onclick="LEVEL='${LEVEL === l ? '' : l}';render()"><b>${l}</b><span>${LV_NOTE[l]} · ${ALL.filter(i => i.level === l).length + W.prose.filter(i => i.level === l).length + W.poemsX.filter(i => i.level === l).length}</span></button>`).join('')}</div>
  </div></section></div>`;
  function n(r) { return byLevel(roomItems(r)).length; }
}
function showArt(i, manual) {
  const arts = $$('.lw-stage .art'); if (!arts.length) return;
  SHOW_I = i; arts.forEach((a, k) => a.classList.toggle('on', k === i)); $$('.lw-dots button').forEach((d, k) => d.classList.toggle('on', k === i));
  const s = SHOW2[i]; $('#lwl').innerHTML = `<span><b>${esc(s.title)}</b>${esc(s.a.credit)}</span><button data-lw-onclick="go('${s.go[0]}','${s.go[1]}')">${esc(s.work)} →</button>`; $('#lwq').textContent = s.quote;
  if (manual) { clearInterval(SHOW_T); SHOW_T = setInterval(() => showArt((SHOW_I + 1) % SHOW2.length), 7000); }
}
/* poem / speech cards: famous lines borrow their play's artwork */
function card(it) {
  let h = it.image; let style = '';
  if (!h && LINE_PLAY[it.id]) { const a = ART[LINE_PLAY[it.id]]; h = { file: a.file, credit: a.credit }; style = `;background-position:${a.pos}`; }
  const plate = h && (h.plate || h.small);
  const ph = h ? `<div class="ph ${plate ? 'plate' : ''}" style="background-image:url('${img(h.file, 800)}')${h.crop ? ';background-size:170%;background-position:46% 46%' : style}"></div>`
    : `<div class="ph"><div class="typo ${tone(it.id)}"><span>${it.form === 'Limerick' ? esc(firstLine(it)) : esc(firstLine(it).replace(/[,;:]$/, '') + '…')}</span></div></div>`;
  return `<button class="card" data-lw-onclick="go('item','${it.id}')">${ph}<div class="tx"><span class="kicker" style="font-size:11px">${esc(it.form)}${it.play ? ' · ' + esc(it.play) : ''}</span><h3 class="h3">${esc(it.title)}</h3>${h ? `<div class="first">${esc(firstLine(it))}</div>` : ''}<div class="row"><span class="who">${esc(aut(it).name)}</span><span style="flex:1"></span>${it.audio ? '<span class="pill v">♪</span>' : ''}${it.video ? '<span class="pill c">▶</span>' : ''}<span class="pill lv">${it.level}</span></div></div></button>`;
}

/* ---------- prose library: covers, lists ---------- */
const LIST_SHELVES = ['essay', 'letter', 'auto', 'criticism', 'legend'];
function cover(x) {
  const a = ART[x.id]; const th = PERIOD_THEME[x.period] || 'museum';
  return a ? `<div class="cover" ${artBg(a, 700)}></div>` : `<div class="cover ty" style="--jacket:${JACKET[th] || '#2E4B3C'}"><span class="a">${esc(x.author.split(' — ')[0])}</span><span class="t">${esc(x.title.split(' — ')[0])}</span><span class="o">❦</span></div>`;
}
function badges(x) { return `${x.complete ? `<span class="badge full">${t('complete')}</span>` : `<span class="badge ex">${t('extract')}</span>`}${x.translated ? `<span class="badge tr">${t('translated')}</span>` : ''}${x.american ? `<span class="badge us">${t('american')}</span>` : ''}`; }
function book(x) {
  const min = Math.max(1, Math.round(textWords(x) / 200));
  return `<button class="book" data-lw-onclick="go('text','${x.id}')">${cover(x)}<span class="kicker" style="font-size:10.5px">${esc(PERIOD_NAME[x.period] || '')}</span><h4>${esc(x.title)}</h4><span class="au">${esc(x.author)}</span><div class="bl">${badges(x)}<span class="meta">${min} ${t('minutes')}</span><span style="flex:1"></span><span class="pill lv">${x.level}</span></div></button>`;
}
function rowb(x) { const a = ART[x.id]; return `<button class="rowb" data-lw-onclick="go('text','${x.id}')"><span class="th" ${a ? artBg(a, 300) : ''}></span><span><span class="kicker" style="font-size:10.5px">${esc(PERIOD_NAME[x.period] || '')}</span><b>${esc(x.title)}</b><i>${esc(x.author)}</i><div class="bl" style="display:flex;gap:6px;margin-top:6px">${badges(x)}</div></span><span class="pill lv">${x.level}</span></button>`; }
function prosePage() {
  let items = W.prose; if (LEVEL) items = items.filter(x => x.level === LEVEL);
  const shelves = W.shelves.filter(s => items.some(x => x.shelf === s[0]));
  return `<div><div class="wrap page-head"><div class="lw-over"><i></i>Gallery IV</div><h1 class="display" style="font-size:clamp(54px,6.4vw,96px);margin-top:18px">Stories</h1>
    <p class="lede">Short stories, fairy tales, essays and the first chapters of great novels — in the authors’ own words.</p>
    <div class="filters">${shelves.map(s => `<button class="chip" data-lw-onclick="$id('sh-${s[0]}').scrollIntoView({behavior:'smooth'})">${esc(s[1])}</button>`).join('')}</div></div>
    <div class="wrap">${shelves.map(s => { const list = items.filter(x => x.shelf === s[0]); return `<div class="shelf" id="sh-${s[0]}"><div class="sh-h"><h2 class="h3">${esc(s[1])}</h2><p>${esc(s[2])}</p></div>${LIST_SHELVES.includes(s[0]) ? `<div class="rows">${list.map(rowb).join('')}</div>` : `<div class="books">${list.map(book).join('')}</div>`}</div>`; }).join('') || empty()}<div style="height:80px"></div></div></div>`;
}
function poetryMore() {
  const items = W.poemsX.filter(x => !LEVEL || x.level === LEVEL); if (!items.length) return '';
  return `<div class="section-label"><h2 class="h3">Epic, narrative and free verse</h2><span class="meta">From Beowulf to Whitman — longer poems and openings, with editions named</span></div><div class="books">${items.map(x => `<button class="book" data-lw-onclick="go('text','${x.id}')">${cover(x)}<span class="kicker" style="font-size:10.5px">${esc(x.form)}</span><h4>${esc(x.title)}</h4><span class="au">${esc(x.author)}</span><div class="bl">${badges(x)}<span style="flex:1"></span><span class="pill lv">${x.level}</span></div></button>`).join('')}</div>`;
}
/* text page with frontispiece */
function textPage(id) {
  const html = textPageBase(id); const x = TEXTS[id]; if (!x) return html; const a = ART[id];
  const start = html.indexOf('<div class="text-head">'), end = html.indexOf('<div class="reading">');
  if (start < 0 || end < 0) return html;
  const front = `<div class="front ${a ? '' : 'noimg'}">${a ? `<figure style="margin:0" data-fig><div class="frame">${imgTag(a.file, 1000, a.credit)}</div><figcaption class="lbl">${credit(a)}</figcaption></figure>` : ''}
    <div><div class="kicker">${esc(x.form || (SHELF[x.shelf] || [])[1] || '')} · ${esc(PERIOD_NAME[x.period] || '')}</div><h1 class="display" style="margin-top:14px">${esc(x.title)}</h1><div class="by">${esc(x.author)}${x.dates ? ' (' + esc(x.dates) + ')' : ''}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:18px">${badges(x)}<span class="pill">${esc(x.origin)}</span><span class="pill lv">${x.level}</span></div></div></div>`;
  return html.slice(0, start) + front + html.slice(end);
}
/* periods: alternating gallery */
function periodsPage() {
  return `<div><div class="wrap page-head"><div class="lw-over"><i></i>Gallery V</div><h1 class="display" style="font-size:clamp(54px,6.4vw,96px);margin-top:18px">Periods</h1>
    <p class="lede">From Old English to today, with texts to read. Definitions from Britannica and the British Library.</p></div>
    <div class="wrap"><div class="eras-v">${W.periods.map((p, i) => { const ws = p.works.map(resolveWork).filter(Boolean); const a = ART[PERIOD_ART[p.id]]; const th = PERIOD_THEME[p.id] || 'museum';
      return `<div class="era-v" data-lw-theme="${th}"><div class="eimg ${a ? '' : 'none'}">${a ? `<div class="frame"><img src="${IMG(a.file, 700)}" alt="${esc(a.credit)}" loading="lazy" style="object-position:${a.pos}"></div><div class="lbl" style="margin-top:8px">${esc(a.credit)}</div>` : `<div class="frame">${esc(p.name[0])}</div>`}</div>
      <div class="card-e"><span class="num">${roman(i + 1)}</span><h2 class="h3">${esc(p.name)}<small>${esc(p.dates)}</small></h2><p style="font-family:var(--lit);font-size:19px">${esc(p.t)}</p>${srcLink(p.src)}
      ${ws.length ? `<div class="chips2">${ws.map(([on, title, kind]) => `<button data-lw-onclick="${on}">${esc(title)}<i>${kind}</i></button>`).join('')}</div>` : ''}</div></div>`; }).join('')}</div>
    <div class="panel" style="margin:10px 0 80px"><h3 class="h3">English literature — or literature in English?</h3><p style="margin:8px 0 0">Texts marked <span class="badge us">${t('american')}</span> are English-language literature from the United States. Texts marked <span class="badge tr">${t('translated')}</span> (Aesop, Ibsen, Beowulf in modern English) are translations, and the original language is always named.</p></div></div></div>`;
}


/* ============================================================
   EXPANSION UI — Words from Literature · Workshop · Voices ·
   Everyday English from Shakespeare · Sources & rights register
   Literature is never generated here: every line shown is pulled
   from the texts in this file. Interface text, meanings, notes and
   tasks are platform-written and labelled “Learner note”.
   ============================================================ */
Object.assign(UI.en, { voices: 'Voices', words: 'Words', workshop: 'Practice', wordsT: 'New words from literature', everyday: 'Everyday English from Shakespeare', sources: 'Sources & rights', riddle: 'Guess the riddle', notebook: 'My notebook', find: 'Find in the collection' });
Object.assign(UI.ru, { voices: 'Регистры', words: 'Слова', workshop: 'Практика', wordsT: 'Новые слова из литературы', everyday: 'Шекспир в повседневном английском', sources: 'Источники и права', riddle: 'Отгадай загадку', notebook: 'Мой словарик', find: 'Поиск по коллекции' });
Object.assign(UI.kz, { voices: 'Тіл регистрі', words: 'Сөздер', workshop: 'Жаттығу', wordsT: 'Әдебиеттен жаңа сөздер', everyday: 'Шекспир күнделікті тілде', sources: 'Дереккөздер мен құқық', riddle: 'Жұмбақты шеш', notebook: 'Менің сөздігім', find: 'Жинақтан іздеу' });
Object.assign(DEVX, { 'dramatic monologue': 'One speaker talks to a silent listener and reveals more than he means to.', 'portmanteau': 'A new word made by packing two words into one (slithy = lithe + slimy).', 'dialect': 'The words and grammar of a region or community, written as spoken.', 'enjambment': 'A sentence that runs on from one line into the next without a pause.', 'anaphora': 'Repeating the same words at the start of several lines.', 'rhetorical question': 'A question asked for effect, not for an answer.', 'ode': 'A long, serious poem addressed to a person or thing.' });

Object.assign(ART, {
  humpty: A('Humpty Dumpty Tenniel.jpg', 'John Tenniel, Humpty Dumpty, from Through the Looking-Glass (1871)', '', '50% 30%'),
  wuthering1: A('Top Withens.jpg', 'Top Withens, a ruined farmhouse on the Yorkshire moors, often linked with Wuthering Heights', '', '50% 50%'),
  threemen1: A('Jerome K. Jerome.jpg', 'Jerome K. Jerome, photograph', '', '50% 25%'),
  willows1: A('Kenneth Grahame.jpg', 'Kenneth Grahame, photograph', '', '50% 25%'),
  eveline: A('James Joyce by Alex Ehrenzweig, 1915 restored.jpg', 'James Joyce, photographed by Alex Ehrenzweig, 1915', '', '50% 25%'),
  'dorian-preface': A('Oscar Wilde portrait by Napoleon Sarony - albumen.jpg', 'Oscar Wilde, photographed by Napoleon Sarony, 1882', '', '50% 20%'),
  dodger: A('Charles Dickens by Frith 1859 (2).jpg', 'William Powell Frith, Charles Dickens, 1859', '', '50% 25%'),
  whale: A('Rudyard Kipling (portrait).jpg', 'Rudyard Kipling, portrait', '', '50% 25%'),
  riders: A('John Millington Synge.jpg', 'J. M. Synge, portrait', '', '50% 25%')
});
const WORDS = X.words, WBY = Object.fromEntries(WORDS.map(w => [w.id, w]));
const GROSE = X.grose, GBY = Object.fromEntries(GROSE.map(g => [g.id, g]));
const PHRASES = X.phrases, SAYINGS = X.sayings;
const WTYPE = { literary: ['Literary words', 'Words from poems and novels that are still useful today.'], archaic: ['Old English forms', 'Recognise them in Shakespeare and old poems — you will not need to use them.'], idiom: ['Idioms born in literature', 'Everyday phrases that come from real lines.'], collocation: ['Collocations', 'Words that go together.'], phrasal: ['Phrasal verbs in context', 'Met in real stories.'], figurative: ['Figurative language', 'Metaphors that changed how we speak.'], slang: ['Historical slang & cant', 'Understand them — use them carefully, or not at all.'], dialect: ['Dialect', 'Scots, Irish English and London speech, as writers recorded them.'] };
const REG = { literary: 'Literary', standard: 'Standard', colloquial: 'Colloquial', slang: 'Slang', cant: 'Criminal cant', dialect: 'Dialect', archaic: 'Archaic' };
const store = lwStore;
let NOTE = store.get('notebook', {});
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ABBR = /\b(?:Mr|Mrs|Messrs|Dr|St|Capt|Col|Gen|Rev|Esq|viz|[A-HJ-Z])\.$/;
function sentSplit(p) { const out = []; let buf = ''; String(p).replace(/([.!?][’”"')\]]*)\s+/g, '$1\u0000').split('\u0000').forEach(part => { buf = buf ? buf + ' ' + part : part; if (!ABBR.test(buf.replace(/[’”"')\]]+$/, ''))) { out.push(buf); buf = ''; } }); if (buf) out.push(buf); return out; }
const plain = s => String(s || '').replace(/\[_(.+?)_\]/g, '[$1]').replace(/_([^_]+)_/g, '$1');

/* ---------- concordance over the whole collection ---------- */
let CORPUS = null;
function corpus() {
  if (CORPUS) return CORPUS; CORPUS = [];
  ALL.forEach(it => { if (!it.text) return; it.text.split('\n').forEach(l => { if (l.trim()) CORPUS.push({ t: l.trim(), title: it.title, by: aut(it).name, go: `go('item','${it.id}')`, key: 'i:' + it.id }); }); });
  W.prose.concat(W.poemsX).forEach(x => { const R = LIB.prose[x.id]; if (!R) return; R.body.forEach(p => { const s = typeof p === 'string' ? p : Array.isArray(p) ? p.join(' / ') : null; if (!s) return; (s.match(/[^.!?]+[.!?]+[’”']?|[^.!?]+$/g) || [s]).forEach(z => { z = z.trim(); if (z.length > 3) CORPUS.push({ t: z, title: x.title, by: x.author, go: `go('text','${x.id}')`, key: 't:' + x.id }); }); }); });
  Object.entries(PLAYS).forEach(([id, P]) => { const m = PMETA[id] || {}; P.acts.forEach((a, ai) => a.sc.forEach((s, si) => s.b.forEach((b, bi) => (b.p || []).forEach(p => (p.v || [p.pr]).forEach(l => { if (l && l.trim()) CORPUS.push({ t: l.trim(), title: m.title || P.title, by: (b.s || '') + (a.n ? ' · Act ' + a.n + (s.n ? ', Sc. ' + s.n : '') : ''), go: `goQuote('${id}',{a:${ai},s:${si},b:${bi}})`, key: 'p:' + id }); }))))); });
  return CORPUS;
}
function concord(q, limit, exclude) {
  if (!q || q.trim().length < 2) return { hits: [], works: 0 };
  const re = new RegExp('(^|[^A-Za-z])(' + reEsc(q.trim()).replace(/[’']/g, "[’']") + ')', 'i');
  const hits = []; const works = new Set();
  for (const c of corpus()) { if (exclude && c.key === exclude) continue; if (re.test(c.t)) { works.add(c.key); if (hits.length < (limit || 60) && !hits.some(h => h.key === c.key && hits.filter(x => x.key === c.key).length >= 2)) hits.push(c); } }
  return { hits, works: works.size, re };
}
function hitHTML(h, re) { const t = esc(plain(h.t)).replace(new RegExp(re.source, 'i'), (m, a, b) => `${a}<mark>${b}</mark>`); return `<button class="hit" data-lw-onclick="${h.go}"><span class="q">${t}</span><small>${esc(h.title)}${h.by ? ' — ' + esc(h.by) : ''}</small></button>`; }

/* ---------- anchors: find the authentic line for a word ---------- */
function anchorOf(w) {
  const a = w.anchor, n = a.needle.toLowerCase();
  if (a.kind === 'item') { const it = BY[a.id]; if (!it) return null; const l = it.text.split('\n').find(x => x.toLowerCase().includes(n)) || it.text.split('\n').find(x => plain(x).toLowerCase().includes(plain(n))); return l ? { line: l.trim(), title: it.title, by: aut(it).name, go: `go('item','${it.id}')`, it } : null; }
  if (a.kind === 'text') { const R = LIB.prose[a.id]; for (const p of R.body) { const s = typeof p === 'string' ? p : Array.isArray(p) ? p.join(' / ') : ''; const sent = (s.match(/[^.!?]+[.!?]+[’”']?|[^.!?]+$/g) || []).find(z => z.toLowerCase().includes(n)); if (sent) return { line: sent.trim(), title: TEXTS[a.id].title, by: TEXTS[a.id].author, go: `go('text','${a.id}')` }; } return null; }
  if (a.kind === 'play') { const P = PLAYS[a.id]; for (let ai = 0; ai < P.acts.length; ai++) for (let si = 0; si < P.acts[ai].sc.length; si++) { const bs = P.acts[ai].sc[si].b; for (let bi = 0; bi < bs.length; bi++) for (const p of (bs[bi].p || [])) for (const l of (p.v || [p.pr])) if (l && l.toLowerCase().includes(n)) { let line = l.trim(); if (line.length > 220) { line = (line.match(/[^.!?]+[.!?]+[’”']?/g) || [line]).find(z => z.toLowerCase().includes(n)).trim(); } return { line, title: (PMETA[a.id] || {}).title || P.title, by: bs[bi].s + (P.acts[ai].n ? ' · Act ' + P.acts[ai].n + ', Scene ' + P.acts[ai].sc[si].n : ''), go: `goQuote('${a.id}',{a:${ai},s:${si},b:${bi}})` }; } } return null; }
  if (a.kind === 'slang') { const g = GBY[a.id]; return g ? { line: g.entry, title: 'Grose, Dictionary of the Vulgar Tongue (1811)', by: 'entry ' + g.head, go: `go('voices')` } : null; }
  return null;
}
const hlOf = w => w.anchor.needle.split(' ').length <= 4 ? w.anchor.needle : w.search;
const markWord = (line, needle) => { const i = line.toLowerCase().indexOf(needle.toLowerCase()); const e = esc(plain(line)); if (i < 0) return e; const pl = plain(line); const j = pl.toLowerCase().indexOf(plain(needle).toLowerCase()); return j < 0 ? e : esc(pl.slice(0, j)) + '<mark>' + esc(pl.slice(j, j + plain(needle).length)) + '</mark>' + esc(pl.slice(j + plain(needle).length)); };
function say(text) { lwSpeak(text); }
const hasTTS = () => !!speak;

/* ---------- WORDS: list ---------- */
function wordsPage() {
  const f = S.f; let list = WORDS.filter(w => !LEVEL || w.level === LEVEL); if (f.wt) list = list.filter(w => w.type === f.wt);
  const types = Object.keys(WTYPE).filter(k => WORDS.some(w => w.type === k));
  const saved = WORDS.filter(w => NOTE[w.id]);
  return `<div><div class="wrap page-head"><div class="lw-over"><i></i>${t('wordsT')}</div><h1 class="display" style="font-size:clamp(50px,6vw,90px);margin-top:18px">Words</h1>
    <p class="lede">Every word comes from a real line. Meet it, understand it, use it.</p>
    <div class="path6">${['Encounter', 'Understand', 'Hear', 'Practise', 'Produce', 'Re-encounter'].map((s, i) => `<span><b>${i + 1}</b>${s}</span>`).join('')}</div>
    <div class="filters" style="margin-top:22px"><button class="chip ${f.wt ? '' : 'on'}" data-lw-onclick="S.f.wt=null;render()">All · ${WORDS.length}</button>${types.map(k => `<button class="chip ${f.wt === k ? 'on' : ''}" data-lw-onclick="S.f.wt='${k}';render()">${esc(WTYPE[k][0])}</button>`).join('')}</div></div>
    <div class="wrap">
      ${saved.length ? `<div class="panel nb"><h2 class="h3">${t('notebook')} <small class="meta">${saved.length} saved on this device</small></h2><div class="wchips">${saved.map(w => `<button data-lw-onclick="go('word','${w.id}')">${esc(w.word)}</button>`).join('')}</div></div>` : ''}
      ${types.filter(k => !f.wt || f.wt === k).map(k => { const L = list.filter(w => w.type === k); if (!L.length) return ''; return `<div class="section-label"><h2 class="h3">${esc(WTYPE[k][0])}</h2><span class="meta">${esc(WTYPE[k][1])}</span></div><div class="wgrid">${L.map(wcard).join('')}</div>`; }).join('') || empty()}
      ${findPanel()}
      <div style="height:70px"></div></div></div>`;
}
function wcard(w) { const a = anchorOf(w); return `<button class="wcard ${w.type}" data-lw-onclick="go('word','${w.id}')"><span class="kicker" style="font-size:10.5px">${esc(w.pos)}${NOTE[w.id] ? ' · ★' : ''}</span><b>${esc(w.word)}</b><span class="m">${esc(w.meaning.en)}</span>${a ? `<q>${markWord(a.line.length > 120 ? a.line.slice(0, 118) + '…' : a.line, hlOf(w))}</q><small>${esc(a.title.split(' (')[0])}</small>` : ''}<span class="pill lv">${w.level}</span></button>`; }
function findPanel(q) {
  return `<div class="panel find"><span class="learner">${t('find')}</span><h2 class="h3">Find a word</h2><p class="hint">Search every play, story and poem. Only real lines are shown.</p>
    <form data-lw-onsubmit="event.preventDefault();go('find',this.q.value.trim())"><input name="q" value="${esc(q || '')}" placeholder="e.g. heart, honour, gold, thou art" aria-label="Search the collection"><button class="btn sm">Search</button></form></div>`;
}
function findPage(q) {
  const r = concord(q, 80);
  return `<div><div class="wrap page-head"><div class="crumbs"><button data-lw-onclick="go('words')">← ${t('words')}</button></div><h1 class="display" style="font-size:clamp(40px,5vw,70px);margin-top:14px">“${esc(q || '')}”</h1>
    <p class="lede">${r.hits.length ? `Found in <b>${r.works}</b> works. ${r.hits.length >= 80 ? 'Showing the first 80 lines.' : ''} Tap a line to read it in its place.` : 'No lines found. Try a shorter form of the word (e.g. “love” instead of “loved”).'}</p></div>
    <div class="wrap">${findPanel(q)}<div class="hits">${r.hits.map(h => hitHTML(h, r.re)).join('')}</div><div style="height:70px"></div></div></div>`;
}

/* ---------- WORD: the six steps ---------- */
function wordPage(id) {
  const w = WBY[id]; if (!w) return wordsPage(); const a = anchorOf(w); const it = a && a.it;
  const rec = it && it.audio && it.audio.length;
  const re = concord(w.search, 14, w.anchor.kind === 'item' ? 'i:' + w.anchor.id : w.anchor.kind === 'text' ? 't:' + w.anchor.id : w.anchor.kind === 'play' ? 'p:' + w.anchor.id : null);
  const step = (n, h, body) => `<section class="wstep"><div class="n">${n}</div><div><h2 class="h3">${h}</h2>${body}</div></section>`;
  return `<div><div class="wrap"><div class="crumbs" style="padding-top:20px"><button data-lw-onclick="go('words')">← ${t('words')}</button><span>/</span><span>${esc(w.word)}</span></div>
    <div class="whead"><div><div class="kicker">${esc(WTYPE[w.type][0])} · ${esc(w.pos)}</div><h1 class="display" style="font-size:clamp(48px,6vw,92px);margin-top:12px">${esc(w.word)}</h1>${w.ipa ? `<div class="ipa">${esc(w.ipa)}</div>` : ''}<div class="pills" style="display:flex;gap:6px;margin-top:12px"><span class="pill lv">${w.level}</span><span class="pill">${esc(WTYPE[w.type][0])}</span></div></div>
      <button class="btn ${NOTE[w.id] ? 'ghost' : ''}" data-lw-onclick="NOTE[S.id]?delete NOTE[S.id]:NOTE[S.id]=Date.now();store.set('notebook',NOTE);render()">${NOTE[w.id] ? '★ In my notebook' : '☆ Save to my notebook'}</button></div>
    <div class="wsteps">
      ${step(1, 'Encounter — where the author used it', a ? `<blockquote class="enc">${markWord(a.line, hlOf(w))}</blockquote><div class="meta">${esc(a.title)} — ${esc(a.by)}</div><button class="btn sm ghost" style="margin-top:12px" data-lw-onclick="${a.go}">Read it in the text →</button>` : '<p class="hint">—</p>')}
      ${step(2, 'Understand', `<span class="learner">${t('learnerNote')}</span><p class="mean">${esc(w.meaning.en)}</p><div class="seg"><button class="${SUP === 'ru' ? 'on' : ''}" data-lw-onclick="SUP='ru';render()">Русский</button><button class="${SUP === 'kz' ? 'on' : ''}" data-lw-onclick="SUP='kz';render()">Қазақша</button></div><p class="tr">${esc(w.meaning[SUP] || w.meaning.ru)}</p>${w.note ? `<div class="callout c">${esc(w.note)}</div>` : ''}${w.fig ? `<div class="callout"><b>Literal or figurative?</b>${esc(w.fig)}</div>` : ''}`)}
      ${step(3, 'Hear', `${rec ? `<p class="hint">A human reading of the whole text — listen for the line.</p>${voiceBlock(it, 'w')}` : ''}${hasTTS() ? `<button class="btn sm ghost" data-lw-onclick="say(WBY[S.id].word.split(' / ')[0].split(' (')[0])">🔊 The word alone</button> <button class="btn sm ghost" data-lw-onclick="say(${esc(JSON.stringify(a ? plain(a.line) : ''))})">🔊 The line</button><p class="meta" style="margin-top:8px">These two buttons use a synthetic voice, not a human recording.${rec ? '' : ' No human recording of this text is available yet.'}</p>` : ''}`)}
      ${step(4, 'Practise', `<div id="wprac"></div>`)}
      ${step(5, 'Produce — use it yourself', `<p style="font-family:var(--lit);font-size:20px;margin:0 0 10px">${esc(w.produce)}</p><textarea id="wprod" aria-label="Your sentence" placeholder="Write here…">${esc(store.get('prod.' + w.id, ''))}</textarea><div style="display:flex;gap:10px;align-items:center;margin-top:10px"><button class="btn sm" data-lw-onclick="checkProd()">Check & save</button><span class="fb" id="wpf"></span></div>`)}
      ${step(6, 'Re-encounter — the word in other works', re.hits.length ? `<p class="hint">“${esc(w.search)}” appears in <b>${re.works}</b> other works in this collection. Real lines only:</p><div class="hits">${re.hits.map(h => hitHTML(h, re.re)).join('')}</div><button class="btn sm ghost" data-lw-onclick="go('find','${esc(w.search).replace(/'/g, "\\'")}')">See every line →</button>` : `<p class="hint">This word does not appear anywhere else in the collection — a rare find.</p>`)}
    </div><div style="height:70px"></div></div></div>`;
}
function checkProd() {
  const w = WBY[S.id], v = $('#wprod').value.trim(); store.set('prod.' + w.id, v);
  const stem = w.search.toLowerCase().replace(/’/g, "'").slice(0, Math.max(3, w.search.length - 2));
  const ok = v.toLowerCase().replace(/’/g, "'").includes(stem);
  $('#wpf').textContent = !v ? 'Write a sentence first.' : ok ? 'Saved. You used the word — now read it aloud.' : 'Saved — but the word itself is missing. Try to include it.';
}
function wordPractice(w) {
  const box = $('#wprac'); if (!box) return; const a = anchorOf(w);
  const same = shuffle(WORDS.filter(x => x.id !== w.id && x.type === w.type)).concat(shuffle(WORDS.filter(x => x.id !== w.id && x.type !== w.type)));
  const tasks = [];
  tasks.push({ p: `What does <b>${esc(w.word)}</b> mean in this line?<div class="line-card" style="font-family:var(--lit)">${a ? markWord(a.line, hlOf(w)) : ''}</div>`, opts: shuffle([w.meaning.en].concat(same.slice(0, 3).map(x => x.meaning.en))), ans: w.meaning.en });
  if (a) { const pl = plain(a.line), nd = plain(w.anchor.needle), j = pl.toLowerCase().indexOf(nd.toLowerCase());
    if (j >= 0) tasks.push({ p: `Complete the author’s line:<div class="line-card" style="font-family:var(--lit)">${esc(pl.slice(0, j))}<span class="blank">______</span>${esc(pl.slice(j + nd.length))}</div>`, opts: shuffle([pl.slice(j, j + nd.length)].concat(same.slice(3, 6).map(x => x.anchor.needle.split(' ').slice(0, nd.split(' ').length).join(' ')))), ans: pl.slice(j, j + nd.length) }); }
  if (w.fig) tasks.push({ p: `In this text, is <b>${esc(w.word)}</b> used literally or figuratively?`, opts: ['literally', 'figuratively'], ans: 'figuratively', ex: w.fig });
  if (w.type === 'archaic') tasks.push({ p: `Modern English for <b>${esc(w.word)}</b>:`, opts: shuffle([w.meaning.en].concat(WORDS.filter(x => x.type === 'archaic' && x.id !== w.id).slice(0, 3).map(x => x.meaning.en))), ans: w.meaning.en });
  if (['slang', 'dialect', 'archaic', 'literary'].includes(w.type)) tasks.push({ p: `Which register is <b>${esc(w.word)}</b>?`, opts: ['literary', 'archaic', 'slang', 'dialect'], ans: w.type, ex: WTYPE[w.type][1] });
  mcRun(box, tasks, 0);
}
function mcRun(box, tasks, i) {
  const q = tasks[i]; if (!q) { box.innerHTML = `<p class="fb">Done — ${tasks.length} tasks. <button class="btn sm ghost" data-lw-onclick="wordPractice(WBY[S.id])">Again</button></p>`; return; }
  box.innerHTML = `<p class="hint">Task ${i + 1} of ${tasks.length}</p><div class="qp">${q.p}</div><div class="opts">${q.opts.map(o => `<button data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="fb"></div>`;
  $$('.opts button', box).forEach(b => b.onclick = () => { if (box.dataset.lock === '1') return; box.dataset.lock = '1'; const ok = b.dataset.o === q.ans; lwAnswer(lwKind(box), ok); b.classList.add(ok ? 'ok' : 'no'); if (!ok) $$('.opts button', box).find(x => x.dataset.o === q.ans)?.classList.add('ok'); $('.fb', box).innerHTML = (ok ? 'Yes.' : 'Not quite.') + (q.ex ? ' ' + esc(q.ex) : '') + ` <button class="btn sm ghost">Next →</button>`; $('.fb button', box).onclick = () => { box.dataset.lock = ''; mcRun(box, tasks, i + 1); }; });
}

/* ---------- EVERYDAY ENGLISH FROM SHAKESPEARE ---------- */
function everydayPage() {
  const f = S.f; const plays = [...new Set(PHRASES.map(p => p.play))];
  let list = PHRASES.filter(p => (!LEVEL || p.level === LEVEL) && (!f.pl || p.play === f.pl));
  return `<div><section class="world-hero slim"><div class="bg" ${artBg(ART.hamlet, 2000)}></div><div class="wrap"><div class="kicker">Shakespeare’s World</div><h1 class="display" style="margin-top:14px;font-size:clamp(46px,6vw,88px)">Everyday <em>Shakespeare</em></h1>
      <p class="lede" style="margin-top:16px">${PHRASES.length} phrases we still use. Tap one to see its scene.</p></div></section>
    <div class="wrap"><div class="filters" style="margin-top:26px"><button class="chip ${f.pl ? '' : 'on'}" data-lw-onclick="S.f.pl=null;render()">All plays</button>${plays.map(p => `<button class="chip ${f.pl === p ? 'on' : ''}" data-lw-onclick="S.f.pl='${p}';render()">${esc(PMETA[p].title)}</button>`).join('')}</div>
      <div class="phr">${list.map(p => `<div class="pcard2"><div class="ph-top"><b>${esc(p.phrase)}</b><span class="pill lv">${p.level}</span></div><p class="m">${esc(p.meaning.en)} <span class="tr">· ${esc(p.meaning[SUP] || p.meaning.ru)}</span></p>
        <button class="qt" data-lw-onclick='goQuote("${p.play}",${JSON.stringify({ a: p.a, s: p.si, b: p.b })})'>“${esc(plain(p.line))}”<small>${esc(p.s)} · ${esc(PMETA[p.play].title)}, Act ${esc(p.act)}, Scene ${esc(p.sc)} — read in context →</small></button>
        ${p.note ? `<div class="meta" style="margin-top:8px">${esc(p.note)}</div>` : ''}</div>`).join('') || empty()}</div>
      <div class="panel" style="margin:30px 0"><span class="learner">${t('learnerNote')}</span><h2 class="h3">Practise</h2><div id="evx"></div></div>
      <p class="meta" style="margin-bottom:70px">Lines quoted from The Complete Works of William Shakespeare (Project Gutenberg eBook 100). Meanings are platform-written; historical notes on “wild-goose chase” and “salad days” follow <a href="https://www.merriam-webster.com/wordplay/top-10-phrases-from-shakespeare" target="_blank" rel="noopener">Merriam-Webster</a>. We say a phrase “appears” in these lines; we do not claim Shakespeare invented every one of them.</p></div></div>`;
}
function everydayPractice() {
  const box = $('#evx'); if (!box) return;
  const L = shuffle(PHRASES).slice(0, 8);
  mcRun(box, L.map(p => ({ p: `Which everyday phrase comes from this line?<div class="line-card" style="font-family:var(--lit)">${esc(plain(p.line))}</div><span class="meta">${esc(p.s)}, ${esc(PMETA[p.play].title)}</span>`, opts: shuffle([p.phrase].concat(shuffle(PHRASES.filter(x => x.id !== p.id)).slice(0, 3).map(x => x.phrase))), ans: p.phrase, ex: 'It means: ' + p.meaning.en + '.' })), 0, everydayPractice);
}

/* ---------- VOICES: registers, slang, cant, dialect ---------- */
const ELIZA = (() => { const P = PLAYS.pygmalion; try { const b = P.acts[0].sc[0].b[29]; return { line: b.p[0].pr.split('?')[0] + '?', go: `goQuote('pygmalion',{a:0,s:0,b:29})` }; } catch (e) { return null; } })();
function voicesPage() {
  const f = S.f;
  const ex = (txt, src, go) => `<button class="vx" data-lw-onclick="${go}"><q>${esc(plain(txt))}</q><small>${esc(src)} →</small></button>`;
  const firstLine = (id, re) => { const it = BY[id]; const l = it && it.text.split('\n').find(x => re.test(x)); return l ? l.trim() : ''; };
  const ladder = [
    ['literary', 'Literary', 'Chosen, often formal or old-fashioned words for effect. Fine in writing; rare in speech.', ex(firstLine('po-elegy', /madding/), 'Thomas Gray, Elegy (1751)', `go('item','po-elegy')`)],
    ['standard', 'Standard', 'Neutral English that is correct in almost every situation.', ex(firstLine('po-if', /keep your head/), 'Rudyard Kipling, If— (1910)', `go('item','po-if')`)],
    ['colloquial', 'Colloquial', 'Relaxed, spoken English: contractions, everyday phrases, a personal voice.', ex(firstLine('po-man-he-killed', /off-hand/i) || firstLine('po-man-he-killed', /Yes; quaint/), 'Thomas Hardy, The Man He Killed (1902)', `go('item','po-man-he-killed')`)],
    ['slang', 'Slang', 'Very informal words of a group or a time. It changes fast and can offend.', ex("you want grub, and you shall have it", 'Charles Dickens, Oliver Twist (the Artful Dodger)', `go('text','dodger')`)],
    ['cant', 'Criminal cant', 'Secret slang of thieves, recorded by Grose in 1811 — and by Dickens.', ex("a beak's a madgst'rate", 'Oliver Twist, Chapter VIII', `go('text','dodger')`)],
    ['dialect', 'Dialect', 'The English of a region: its own words, grammar and sounds. Not “wrong” — different.', ex(firstLine('po-to-a-mouse', /Wee, sleekit/), 'Robert Burns, To a Mouse (Scots)', `go('item','po-to-a-mouse')`) + ex('The young priest is after bringing them.', 'J. M. Synge, Riders to the Sea (Irish English)', `go('play','riders','read')`) + (ELIZA ? ex(ELIZA.line, 'Bernard Shaw, Pygmalion (London Cockney)', ELIZA.go) : '')],
    ['archaic', 'Archaic', 'Forms no longer used: thou, art, hath, ere. Recognise them; don’t use them.', ex(firstLine('sh-sonnet-18', /Thou art/), 'Shakespeare, Sonnet 18 (1609)', `go('item','sh-sonnet-18')`)]];
  let G = GROSE; if (f.gr) G = G.filter(g => g.reg === f.gr);
  return `<div><div class="wrap page-head"><div class="lw-over"><i></i>Gallery VII</div><h1 class="display" style="font-size:clamp(50px,6vw,92px);margin-top:18px">Voices</h1>
    <p class="lede">Literary, everyday, slang, dialect and old English — always from real texts.</p></div>
    <div class="wrap">
      <div class="ladder">${ladder.map(([k, n, d, e], i) => `<div class="rung r${i}"><div class="h"><span>${i + 1}</span><b>${n}</b></div><p>${esc(d)}</p><div class="vxs">${e}</div></div>`).join('')}</div>
      <div class="panel" style="margin-top:26px"><span class="learner">${t('learnerNote')}</span><h2 class="h3">Which register?</h2><div id="regx"></div></div>

      <div class="section-label" style="margin-top:44px"><h2 class="h3">A dictionary of 1811 slang</h2><span class="meta">Francis Grose, Dictionary of the Vulgar Tongue — entries quoted exactly</span></div>
      <p class="hint" style="max-width:760px">Grose recorded the speech of soldiers, students, sailors and thieves. Many of his words are still alive (“kick the bucket”, “chatterbox”, “quid”); some changed meaning (“quiz”, “prig”); some died. We show only entries that are not offensive — the full book contains many that are. <b>Use historical slang to understand texts, not to sound modern.</b></p>
      <div class="filters"><button class="chip ${f.gr ? '' : 'on'}" data-lw-onclick="S.f.gr=null;render()">All · ${GROSE.length}</button>${['colloquial', 'slang', 'cant', 'standard'].map(r => `<button class="chip ${f.gr === r ? 'on' : ''}" data-lw-onclick="S.f.gr='${r}';render()">${REG[r]}</button>`).join('')}</div>
      <div class="gro">${G.map(g => `<div class="gcard" id="${g.id}"><div class="gh"><b>${esc(g.head)}</b><span class="pill">${REG[g.reg]}</span></div><p class="entry">${esc(g.entry)}</p><div class="now"><span class="learner">Today</span> ${esc(g.note)}</div><div class="meta">${esc(g.meaning.en)} · ${esc(g.meaning[SUP] || g.meaning.ru)}</div>${g.link ? `<button class="btn sm ghost" style="margin-top:8px" data-lw-onclick="go('text','${g.link}')">Meet it in Oliver Twist →</button>` : ''}</div>`).join('')}</div>
      <div class="src-line" style="margin-top:14px"><span>${t('source')}: <i>1811 Dictionary of the Vulgar Tongue</i></span>·<span>Public domain</span>·<a href="https://www.gutenberg.org/ebooks/5402" target="_blank" rel="noopener" style="color:var(--muted)">gutenberg.org/ebooks/5402</a></div>

      <div class="section-label" style="margin-top:44px"><h2 class="h3">Read the voices</h2><span class="meta">complete texts and extracts where dialect and slang are the point</span></div>
      <div class="books">${['dodger'].map(id => book(TEXTS[id])).join('')}${['po-to-a-mouse', 'po-auld-lang-syne', 'po-man-he-killed', 'po-patrick-spens'].map(id => `<button class="book" data-lw-onclick="go('item','${id}')">${cover({ id, author: aut(BY[id]).name, title: BY[id].title, period: BY[id].era === 'traditional' ? 'middle' : BY[id].era })}<span class="kicker" style="font-size:10.5px">${esc(BY[id].form)}</span><h4>${esc(BY[id].title)}</h4><span class="au">${esc(aut(BY[id]).name)}</span><div class="bl"><span class="pill lv">${BY[id].level}</span></div></button>`).join('')}<button class="book" data-lw-onclick="go('play','riders')">${cover({ id: 'riders', author: 'J. M. Synge', title: 'Riders to the Sea', period: 'modern' })}<span class="kicker" style="font-size:10.5px">One-act play · Irish English</span><h4>Riders to the Sea</h4><span class="au">J. M. Synge</span><div class="bl"><span class="badge full">${t('complete')}</span><span class="pill lv">B2</span></div></button></div>

      <div class="panel decision" style="margin:40px 0 80px"><span class="learner">Curator’s decision</span><h2 class="h3">Why there is no modern slang here</h2><p>Contemporary slang (social-media and street English) changes every year, much of it is still under copyright in the songs, films and posts where it appears, and reliable dated sources for it are dictionaries, not literature. It belongs in a separate, regularly updated language section. In the Literature World we keep only slang that a <i>written, public-domain text</i> recorded — so that every word has a date, a place and a real context.</p></div>
    </div></div>`;
}
function voicesPractice() {
  const box = $('#regx'); if (!box) return;
  const ALLR = ['Literary', 'Standard', 'Slang', 'Criminal cant', 'Dialect', 'Archaic'];
  const Q = [
    { line: 'In Xanadu did Kubla Khan / A stately pleasure-dome decree', ans: 'Literary', src: 'Coleridge', not: ['Archaic'], ex: 'Poetic word order (“did … decree”) in a Romantic poem: literary language.' },
    { line: "'Hullo, my covey!  What's the row?'", ans: 'Slang', src: 'Dickens, Oliver Twist', not: ['Criminal cant'], ex: '“Covey” (fellow) and “row” (fuss) are street slang of the 1830s.' },
    { line: 'Wee, sleekit, cow\'rin, tim\'rous beastie', ans: 'Dialect', src: 'Burns', not: ['Archaic'], ex: 'Scots words and spellings: sleekit = sleek, cow’rin = cowering.' },
    { line: 'Thou art more lovely and more temperate', ans: 'Archaic', src: 'Shakespeare', not: ['Literary'], ex: '“Thou art” is the old form of “you are”.' },
    { line: 'The young priest is after bringing them.', ans: 'Dialect', src: 'Synge', not: ['Archaic'], ex: 'Irish English: “is after bringing” = has just brought.' },
    { line: 'Lost time is never found again', ans: 'Standard', src: 'Franklin', not: [], ex: 'Plain, neutral English that any reader understands today.' },
    { line: "I suppose you don't know what a beak is, my flash com-pan-i-on.", ans: 'Criminal cant', src: 'Dickens', not: ['Slang'], ex: '“Beak” (magistrate) and “flash” come from thieves’ cant.' }];
  mcRun(box, shuffle(Q).map(q => ({ p: `<div class="line-card" style="font-family:var(--lit)">${esc(q.line)}</div><span class="meta">${esc(q.src)}</span>`, opts: ALLR.filter(o => !q.not.includes(o)), ans: q.ans, ex: q.ex })), 0, voicesPractice);
}

/* ---------- WORKSHOP (practice hub) ---------- */
const WS = [
  { g: 'Poetry', c: 'romantic', items: [['rhyme', 'Find the rhyme', 'A real stanza with its rhyme word missing — choose the poet’s word.'], ['rebuild', 'Rebuild the line', 'The words of a real line, mixed up. Put them back.'], ['listen', 'Listen to a human voice', 'Poems in the collection with human recordings.']] },
  { g: 'Drama', c: 'theatre', items: [['who', 'Who says it?', 'A real line from one of ' + Object.keys(PLAYS).length + ' complete plays — choose the character.'], ['cue', 'Next line', 'Read the cue; choose the line that really follows.']] },
  { g: 'Shakespeare', c: 'renaissance', items: [['thou', 'Old forms → modern English', 'Real lines with thou, art, hath, doth — what is the modern form?'], ['phr', 'Everyday phrases', 'Which phrase that we still use comes from this line?']] },
  { g: 'Prose', c: 'victorian', items: [['ending', 'Which ending did the author write?', 'Real sentences from novels and stories.'], ['opening', 'Who wrote this opening?', 'First sentences of famous books.']] },
  { g: 'Proverbs & sayings', c: 'brand', items: [['halves', 'Complete the proverb', 'First half from Preston’s dictionary — choose the second.'], ['pmean', 'What does it mean?', 'Proverbs and lines that became sayings.']] },
  { g: 'Slang & register', c: 'brand', items: [['gro', 'Then and now', 'An 1811 slang entry — what does the word mean today?'], ['reg', 'Which register?', 'Literary, slang, dialect or archaic?']] },
  { g: 'Words', c: 'museum', items: [['words', 'New words from literature', 'The six-step path for ' + WORDS.length + ' words.'], ['nb', 'Review my notebook', 'Meaning check for the words you saved.']] }];
function workshopPage() {
  const k = S.id;
  return `<div><div class="wrap page-head"><div class="lw-over"><i></i>The Workshop</div><h1 class="display" style="font-size:clamp(50px,6vw,92px);margin-top:18px">Practice</h1>
    <p class="lede">Every question comes from a real line. Every answer leads back to the text.</p></div>
    <div class="wrap ws-grid"><nav class="ws-nav">${WS.map(s => `<div class="ws-g"><b>${s.g}</b>${s.items.map(([id, n]) => `<button class="${k === id ? 'on' : ''}" data-lw-onclick="go('workshop','${id}')">${esc(n)}</button>`).join('')}</div>`).join('')}</nav>
      <div class="panel ws-main">${k ? (() => { const it = WS.flatMap(s => s.items.map(x => x.concat(s.g))).find(x => x[0] === k); return it ? `<div class="kicker">${esc(it[3])}</div><h2 class="h2" style="margin:6px 0">${esc(it[1])}</h2><p class="hint">${esc(it[2])}</p><div id="wsb"></div>` : ''; })() : `<h2 class="h2">Choose an exercise</h2><p class="hint">Pick one to start.</p>`}</div></div><div style="height:70px"></div></div>`;
}
function workshopRun(k) {
  const box = $('#wsb'); if (!box) return; const next = () => workshopRun(k);
  const again = () => { const b = document.createElement('button'); b.className = 'btn sm ghost'; b.textContent = 'Another →'; b.onclick = next; return b; };
  const source = (txt, go) => `<button class="srcbtn" data-lw-onclick="${go}">${esc(txt)} →</button>`;
  const ask = (q) => { box.innerHTML = `<div class="qp">${q.p}</div><div class="opts">${q.opts.map(o => `<button data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="fb"></div>`;
    $$('.opts button', box).forEach(b => b.onclick = () => { if (box.dataset.lock === '1') return; box.dataset.lock = '1'; const ok = b.dataset.o === q.ans; lwAnswer(lwKind(box), ok); b.classList.add(ok ? 'ok' : 'no'); if (!ok) $$('.opts button', box).find(x => x.dataset.o === q.ans)?.classList.add('ok'); $('.fb', box).innerHTML = (ok ? 'Yes. ' : 'Not quite. ') + (q.ex ? esc(q.ex) + ' ' : '') + (q.src || ''); $('.fb', box).appendChild(again()); box.dataset.lock = '1'; }); box.dataset.lock = ''; };
  if (k === 'words') { go('words'); return; }
  if (k === 'listen') { const L = ALL.filter(i => i.audio && i.audio.length && i.strand !== 'wise'); box.innerHTML = `<div class="wgrid">${L.map(i => `<button class="wcard" data-lw-onclick="go('item','${i.id}','experience')"><span class="kicker" style="font-size:10.5px">${esc(i.form)} · ${esc(i.audio[0].reader)}</span><b style="font-size:21px">${esc(i.title)}</b><small>${esc(aut(i).name)}</small><span class="pill lv">${i.level}</span></button>`).join('')}</div>`; return; }
  if (k === 'rhyme') {
    const P = shuffle(POEMS.filter(p => (!LEVEL || p.level === LEVEL) && rhymePairs(p).length));
    for (const p of P) { const L = schemeLetters(p); const lines = schemeLines(p).map(plain); const ends = lines.map(lastWord);
      const pr = shuffle(rhymePairs(p).filter(([j, i]) => i - j <= 3 && ends[i].length > 1)); if (!pr.length) continue; const [j, i] = pr[0]; const word = ends[i];
      let a = i; while (a > 0 && i - a < 3 && L[a - 1]) a--; const shown = lines.slice(Math.min(a, j), i);
      const others = shuffle([...new Set(POEMS.flatMap(x => schemeLines(x).map(l => lastWord(plain(l)))).filter(w => w && w.length > 2 && rhymeKey(w) !== rhymeKey(word) && rhymeKey(w) !== rhymeKey(ends[j]) && w.slice(-2).toLowerCase() !== word.slice(-2).toLowerCase()))]).slice(0, 3);
      const last = lines[i];
      ask({ p: `<p class="hint">Choose the word the poet wrote. It rhymes with “${esc(ends[j])}”.</p><div class="line-card" style="font-family:var(--lit);font-size:19px;white-space:pre-line">${esc(shown.join('\n'))}\n${esc(last.slice(0, last.lastIndexOf(word)))}<span class="blank">______</span>${esc(last.slice(last.lastIndexOf(word) + word.length))}</div>`, opts: shuffle([word].concat(others)), ans: word, src: source(p.title + ' — ' + aut(p).name, `go('item','${p.id}')`) }); return; }
    box.innerHTML = `<p class="hint">No poem at this level has a rhyme task yet. Try another level, or clear the level filter.</p>`; return;
  }
  if (k === 'rebuild') {
    const P = shuffle(ALL.filter(i => (i.strand === 'poems' || i.strand === 'shakespeare') && (!LEVEL || i.level === LEVEL)));
    const p = P[0]; if (!p) { box.innerHTML = `<p class="hint">No poem or speech at this level yet. Try another level, or clear the level filter.</p>`; return; } const lines = p.text.split('\n').map(l => plain(l.trim())).filter(l => l.split(' ').length >= 5 && l.split(' ').length <= 9); const line = lines[Math.floor(Math.random() * lines.length)] || plain(firstLine(p)); const words = line.split(' '); const mix = shuffle(words.map((w, i) => i)); let built = [];
    const draw = () => { box.innerHTML = `<p class="hint">Tap the words in the order the poet wrote them.</p><div class="built">${built.map((x, i) => `<span class="${words[x] === words[i] ? 'ok' : 'no'}">${esc(words[x])}</span>`).join(' ') || '<span class="meta">…</span>'}</div><div class="choices wordtiles">${mix.map(x => `<button data-x="${x}" ${built.includes(x) ? 'disabled' : ''}>${esc(words[x])}</button>`).join('')}</div><div class="fb">${built.length === words.length ? (built.every((x, i) => words[x] === words[i]) ? 'Exactly as the author wrote it. ' : 'Not quite: “' + esc(line) + '” ') + source(p.title + ' — ' + aut(p).name, `go('item','${p.id}')`) : ''}</div>`;
      $$('.wordtiles button', box).forEach(b => b.onclick = () => { built.push(+b.dataset.x); draw(); }); if (built.length === words.length) { lwOnce(words, 0, 'reading', built.every((x, i) => words[x] === words[i])); $('.fb', box).appendChild(again()); } };
    draw(); return;
  }
  if (k === 'who' || k === 'cue') {
    const ids = Object.keys(PLAYS).filter(id => PLAYS[id].acts.length); const id = ids[Math.floor(Math.random() * ids.length)]; const P = PLAYS[id];
    const top = (PMETA[id].top || topSpeakers(P)).slice(0, 6).map(x => x[0]);
    const pool = []; P.acts.forEach((a, ai) => a.sc.forEach((s, si) => s.b.forEach((b, bi) => { if (b.s && !b.c) { const l = b.p && b.p[0] && (b.p[0].v ? b.p[0].v.join(' ') : b.p[0].pr); if (l && l.length > 35 && l.length < 200) pool.push({ l, s: b.s, ai, si, bi }); } })));
    if (k === 'who') { const pt = pool.filter(x => top.includes(x.s)); const q = pt[Math.floor(Math.random() * pt.length)]; if (!q) return next();
      ask({ p: `<span class="meta">${esc(PMETA[id].title)}</span><div class="line-card" style="font-family:var(--lit);font-size:20px">“${inl(q.l)}”</div>`, opts: shuffle([q.s].concat(shuffle(top.filter(x => x !== q.s)).slice(0, 3))), ans: q.s, src: source('See it in the scene', `goQuote('${id}',{a:${q.ai},s:${q.si},b:${q.bi}})`) }); return; }
    const cands = pool.filter((c, q) => pool[q + 1] && pool[q + 1].ai === c.ai && pool[q + 1].si === c.si && pool[q + 1].bi === c.bi + 1 && pool[q + 1].s !== c.s); const cue = cands[Math.floor(Math.random() * cands.length)]; const nx = cue && pool[pool.indexOf(cue) + 1]; if (!cue || !nx) return next();
    const wrong = shuffle(pool.filter(x => x !== nx && x !== cue)).slice(0, 2).map(x => x.l);
    ask({ p: `<span class="meta">${esc(PMETA[id].title)} · ${esc(cue.s)} says:</span><div class="line-card" style="font-family:var(--lit)">“${inl(cue.l)}”</div><p class="hint">What does ${esc(nx.s)} answer?</p>`, opts: shuffle([nx.l, ...wrong].map(plain)), ans: plain(nx.l), src: source('See it in the scene', `goQuote('${id}',{a:${cue.ai},s:${cue.si},b:${cue.bi}})`) }); return;
  }
  if (k === 'thou') {
    const F = [[/\bthou art\b/i, 'thou art', 'you are'], [/\bthou hast\b/i, 'thou hast', 'you have'], [/\bhath\b/i, 'hath', 'has'], [/\bdoth\b/i, 'doth', 'does'], [/\bthou wilt\b/i, 'thou wilt', 'you will'], [/\bthy\b/i, 'thy', 'your'], [/\bthee\b/i, 'thee', 'you (object)'], [/\bere\b/i, 'ere', 'before'], [/(?:^|\s)’tis\b/i, '’tis', 'it is'], [/\bwherefore\b/i, 'wherefore', 'why']];
    const f = F[Math.floor(Math.random() * F.length)]; const hits = corpus().filter(c => c.key.startsWith('p:') && f[0].test(c.t) && c.t.length < 120); const h = hits[Math.floor(Math.random() * hits.length)]; if (!h) return next();
    ask({ p: `<div class="line-card" style="font-family:var(--lit);font-size:20px">${esc(plain(h.t)).replace(new RegExp(f[0].source, 'i'), m => '<mark>' + m + '</mark>')}</div><span class="meta">${esc(h.title)} — ${esc(h.by)}</span><p class="hint">Modern English for the marked words:</p>`, opts: shuffle(F.map(x => x[2])).filter(x => x !== f[2]).slice(0, 3).concat(f[2]).sort(), ans: f[2], src: source('See it in the scene', h.go) }); return;
  }
  if (k === 'phr') { const p = PHRASES[Math.floor(Math.random() * PHRASES.length)]; ask({ p: `<div class="line-card" style="font-family:var(--lit)">${esc(plain(p.line))}</div><span class="meta">${esc(p.s)} · ${esc(PMETA[p.play].title)}</span>`, opts: shuffle([p.phrase].concat(shuffle(PHRASES.filter(x => x !== p)).slice(0, 3).map(x => x.phrase))), ans: p.phrase, ex: 'Meaning today: ' + p.meaning.en + '.', src: source('See it in the scene', `goQuote('${p.play}',{a:${p.a},s:${p.si},b:${p.b}})`) }); return; }
  if (k === 'ending') { const L = W.prose.filter(x => LIB.prose[x.id] && (!LEVEL || x.level === LEVEL)); const x = L[Math.floor(Math.random() * L.length)]; go('text', x.id); return; }
  if (k === 'opening') {
    const L = W.prose.filter(x => ['novel', 'novella', 'short', 'children', 'humour', 'gothic', 'scifi', 'detective'].includes(x.shelf) && (!/—/.test(x.title) || /—\s*(Chapter I\b|Letter 1\b|chapters I–II)/.test(x.title))); const x = L[Math.floor(Math.random() * L.length)]; const R = LIB.prose[x.id]; const first = R.body.find(p => typeof p === 'string' && p.length > 40); if (!first) return next();
    const sent = sentSplit(first)[0] || first;
    ask({ p: `<div class="line-card" style="font-family:var(--lit);font-size:20px">${inl(sent.trim())}</div><p class="hint">Who wrote this first sentence?</p>`, opts: shuffle([x.author].concat(shuffle([...new Set(L.map(y => y.author))].filter(a => a !== x.author)).slice(0, 3))), ans: x.author, ex: x.title + '.', src: source('Read it', `go('text','${x.id}')`) }); return;
  }
  if (k === 'halves') { const P = PROVERBS.filter(p => / /.test(p.text) && p.text.split(/[,;]/).length > 1 || p.text.split(' ').length > 5); const p = P[Math.floor(Math.random() * P.length)]; const ws = p.text.split(' '); const cut = p.text.includes(',') ? p.text.indexOf(',') + 1 : p.text.indexOf(' ', Math.floor(p.text.length / 2)); const a = p.text.slice(0, cut), b = p.text.slice(cut).trim();
    const others = shuffle(P.filter(x => x !== p)).slice(0, 3).map(x => { const c = x.text.includes(',') ? x.text.indexOf(',') + 1 : x.text.indexOf(' ', Math.floor(x.text.length / 2)); return x.text.slice(c).trim(); });
    ask({ p: `<div class="line-card" style="font-family:var(--lit);font-size:21px">${esc(a)} <span class="blank">…</span></div>`, opts: shuffle([b].concat(others)), ans: b, ex: p.meaning.en, src: source('Preston, entry ' + p.no, `go('item','${p.id}')`) }); return; }
  if (k === 'pmean') { const nk = x => x.toLowerCase().replace(/[^a-z ]/g, '').trim(); const seen = new Set(); const S2 = SAYINGS.concat(PROVERBS.map(p => ({ text: p.text, meaning: p.meaning, id: p.id }))).filter(x => !seen.has(nk(x.text)) && seen.add(nk(x.text)));
    const tk = m => new Set((m.toLowerCase().match(/[a-z]{4,}/g) || []).filter(w => !['that', 'this', 'with', 'they', 'them', 'what', 'when', 'your', 'have', 'something', 'someone', 'people', 'person', 'things', 'thing'].includes(w))); const near = (a, b) => { const A = tk(a), B = tk(b); let n = 0; A.forEach(w => B.has(w) && n++); return n / Math.max(1, Math.min(A.size, B.size)) >= 0.5; };
    const s = S2[Math.floor(Math.random() * S2.length)]; const ans = s.meaning.en.replace(/\s*(\(.*?\)|Also in Preston.*)$/, '');
    const dis = shuffle(S2.filter(x => x !== s && !near(x.meaning.en, s.meaning.en))).slice(0, 3).map(x => x.meaning.en.replace(/\s*(\(.*?\)|Also in Preston.*)$/, ''));
    ask({ p: `<div class="line-card" style="font-family:var(--lit);font-size:21px">“${esc(s.text)}”</div><p class="hint">What does it mean?</p>`, opts: shuffle([ans].concat(dis)), ans }); return; }
  if (k === 'gro') { const g = GROSE[Math.floor(Math.random() * GROSE.length)]; ask({ p: `<span class="meta">Grose, 1811</span><div class="line-card" style="font-family:var(--lit)">${esc(g.entry)}</div><p class="hint">Which note describes this word today?</p>`, opts: shuffle([g.note].concat(shuffle(GROSE.filter(x => x !== g)).slice(0, 2).map(x => x.note))), ans: g.note, src: source('All 1811 entries', `go('voices')`) }); return; }
  if (k === 'reg') { box.innerHTML = '<div id="regx"></div>'; voicesPractice(); return; }
  if (k === 'nb') { const L = WORDS.filter(w => NOTE[w.id]); if (!L.length) { box.innerHTML = `<p class="hint">Your notebook is empty. Open a word and tap “Save to my notebook”.</p><button class="btn sm" data-lw-onclick="go('words')">Go to Words →</button>`; return; } mcRun(box, shuffle(L).map(w => ({ p: `What does <b>${esc(w.word)}</b> mean?`, opts: shuffle([w.meaning.en].concat(shuffle([...new Set(WORDS.filter(x => x !== w && x.meaning.en !== w.meaning.en).map(x => x.meaning.en))]).slice(0, 3))), ans: w.meaning.en })), 0, () => workshopRun('nb')); return; }
}

/* ---------- SOURCES & RIGHTS REGISTER ---------- */
function sourcesPage() {
  const rows = [];
  ALL.forEach(i => { const s = SOURCES[i.src] || {}; rows.push([i.title, aut(i).name, i.form, (ERAS.find(e => e.id === i.era) || {}).name || '', s.work || '', s.url || '', i.rightsNote || '', (i.audio || []).map(a => a.reader + ' (' + a.lic + ')').join('; '), i.image ? i.image.credit : '', `go('item','${i.id}')`]); });
  W.prose.concat(W.poemsX).forEach(x => rows.push([x.title, x.author, (SHELF[x.shelf] || [])[1] || x.form || '', PERIOD_NAME[x.period] || '', x.edition, pgUrl((LIB.prose[x.id] || {}).pg), 'Public domain', '', ART[x.id] ? ART[x.id].credit : '', `go('text','${x.id}')`]));
  Object.keys(PLAYS).forEach(id => { const m = PMETA[id] || {}; rows.push([m.title || PLAYS[id].title, m.author || 'William Shakespeare', m.genre || m.form || '', PERIOD_NAME[m.period] || (W.plays[id] ? 'Renaissance & Jacobean' : ''), W.plays[id] ? 'The Complete Works of William Shakespeare (PG 100)' : m.edition, pgUrl(W.plays[id] ? 100 : m.pg), 'Public domain', '', ART[id] ? ART[id].credit : '', `go('play','${id}')`]); });
  GROSE.forEach(g => rows.push([g.head, 'Francis Grose', 'Slang dictionary entry', 'Georgian (1811)', '1811 Dictionary of the Vulgar Tongue', 'https://www.gutenberg.org/ebooks/5402', 'Public domain', '', '', `go('voices')`]));
  SAYINGS.filter(s => s.src === 'franklin').forEach(s => rows.push([s.text, 'Benjamin Franklin', 'Maxim', '18th century', 'Franklin’s Way to Wealth (1805)', 'https://www.gutenberg.org/ebooks/43855', 'Public domain', '', '', `go('proverbs')`]));
  const q = (S.f.q || '').toLowerCase(); const R = q ? rows.filter(r => r.slice(0, 5).join(' ').toLowerCase().includes(q)) : rows;
  return `<div><div class="wrap page-head"><div class="lw-over"><i></i>Curator’s register</div><h1 class="display" style="font-size:clamp(46px,5.6vw,84px);margin-top:18px">Sources <em>&</em> rights</h1>
    <p class="lede">Every literary text in the Literature World, the edition it was copied from, its rights status, and the recordings and images used beside it. ${rows.length} entries.</p></div>
    <div class="wrap"><div class="audit">${AUDIT.map(([h, p]) => `<div class="panel"><h3 class="h3" style="font-size:21px">${esc(h)}</h3>${p.map(x => `<p>${esc(x)}</p>`).join('')}</div>`).join('')}</div>
    <div class="filters" style="margin:26px 0 10px"><input class="srch" aria-label="Filter the register by title, author, form or edition" placeholder="Filter by title, author, form or edition" value="${esc(S.f.q || '')}" data-lw-oninput="S.f.q=this.value;clearTimeout(LW_SQ);LW_SQ=setTimeout(()=>{const p=this.selectionStart;render();const i=$('.srch');i.focus();i.setSelectionRange(p,p)},250)"></div>
    <div class="tbl"><table><thead><tr><th>Text</th><th>Author</th><th>Form</th><th>Period</th><th>Edition</th><th>Rights</th><th>Audio</th><th>Image</th></tr></thead><tbody>${R.map(r => `<tr><td><button data-lw-onclick="${r[9]}">${esc(r[0])}</button></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${r[5] ? `<a href="${r[5]}" target="_blank" rel="noopener">${esc(r[4])}</a>` : esc(r[4])}</td><td>${esc(r[6])}</td><td>${esc(r[7])}</td><td>${esc(r[8])}</td></tr>`).join('')}</tbody></table></div><div style="height:80px"></div></div></div>`;
}
const AUDIT = [
  ['How texts were added', ['Every new literary text was extracted by a script directly from a named Project Gutenberg edition (mirrored by the GITenberg project) and checked character by character against that file. Nothing was typed by hand, modernised or “simplified”. Editorial line numbers printed in the margins of two school editions (Arnold, Browning) were removed; editorial footnotes in the Oxford Book of English Verse ballads are shown separately as “Editor’s glosses”.']],
  ['What is platform-written', ['Glosses, translations (Russian, Kazakh), contexts, meanings of proverbs and phrases, register labels and all practice tasks are written by the platform and marked “Learner note”. They explain the literature; they never replace it.']],
  ['Copyright rule', ['Only works whose authors died before 1956 are reproduced (public domain under the life + 70 years rule used in Kazakhstan, the UK and the EU, and published before 1931 for the USA). Authors still in copyright — T. S. Eliot, George Orwell (in the USA), Aldous Huxley, Samuel Beckett, Seamus Heaney, Robert Frost — are described but not quoted.']],
  ['Editions not used', ['The Project Gutenberg text of the Gettysburg Address (eBook 4) is a 1970s re-transcription with non-authoritative punctuation, so it was not used. The available edition of Pope’s Essay on Criticism (eBook 7409) is a modernised school text whose line-end punctuation is unreliable, so Pope’s famous couplets were not added. Wilfred Owen’s poems are not in the mirrored collection and were not reproduced from a secondary copy.']],
  ['Media', ['Images and recordings come from Wikimedia Commons with their licences named. 18 new human recordings (LibriVox volunteers, Neil Carmichael and others) and 27 new portraits and artworks were checked on Commons on 13 November 2026: the file exists, the licence is public domain or Creative Commons, and the MP3 version used by Safari/iOS downloads. Images load from a local copy or from Wikimedia Commons with automatic retries; if every source fails, a labelled placeholder is shown instead of a broken image; the “🔊” buttons in Words are labelled as your device’s synthetic voice.', 'No new videos were added in this round: a video is only added after its channel and availability have been checked.']],
  ['Gap analysis — still missing', ['Old and Middle English beyond Beowulf and Chaucer (e.g. The Seafarer — modern translations are in copyright). War poetry by Wilfred Owen (needs a primary edition). Political speeches with an authoritative text (e.g. the Library of Congress copy of the Gettysburg Address). Modernist poetry (Eliot) and post-war writing: copyright allows only short quotation with links. Contemporary slang: deliberately left to a separate, updated language section.']],
  ['Existing material repaired', ['Academic audit, November 2026: rhyme schemes were checked line by line against the end words (Browning, Jonson, Blake, Keats, Kipling, Hopkins corrected); Hopkins’s long lines that the printed page had carried over are shown whole; page-break artefacts in two OBEV transcriptions (Gray’s Elegy, The Solitary Reaper) were removed; Blake’s “Dost thou know” replaces the misprint “Does thou” of the Gutenberg edition. No words of any other text were changed.', 'In Much Ado About Nothing, Act II Scene III, the song “Sigh no more, ladies” had been merged into Benedick’s speech by the original text parser; it is now given to Balthasar as two stanzas, with the same words.']]];

/* ---------- integration helpers ---------- */
function wordsFor(kind, id) { return WORDS.filter(w => w.anchor.kind === kind && w.anchor.id === id); }
function wordChips(kind, id) { const L = wordsFor(kind, id); return L.length ? `<div class="panel"><span class="learner">${t('wordsT')}</span><h2 class="h3">Words to take away</h2><div class="wchips">${L.map(w => `<button data-lw-onclick="go('word','${w.id}')">${esc(w.word)} <small>${esc(w.meaning.en)}</small></button>`).join('')}</div></div>` : ''; }
function sayingsFor(id) { const L = SAYINGS.filter(s => s.src === id); return L.length ? `<div class="panel"><span class="learner">Sayings born here</span><h2 class="h3">Lines that became everyday English</h2>${L.map(s => `<div class="callout c"><b>“${esc(s.text)}”</b>${esc(s.meaning.en)}</div>`).join('')}</div>` : ''; }
function glossSrcPanel(it) { return it.glossSrc ? `<div class="panel"><h3 class="h3" style="font-size:20px">Editor’s glosses</h3><p class="hint">Arthur Quiller-Couch’s own footnotes in the Oxford Book of English Verse (1900).</p><div class="words">${Object.entries(it.glossSrc).map(([w, g]) => `<div><b>${esc(w)}</b><span>${esc(g)}</span></div>`).join('')}</div></div>` : ''; }
function playExtras(id) {
  const ph = PHRASES.filter(p => p.play === id), sp = SHAKESPEARE.filter(s => s.playId === id || (PMETA[id] && s.play === PMETA[id].title));
  return (sp.length ? `<div class="watch" style="margin-top:30px"><h2 class="h3" style="margin-bottom:12px">Famous passages from this play</h2><div class="wchips">${sp.map(s => `<button data-lw-onclick="go('item','${s.id}')">${esc(s.title)} <small>${esc(s.speaker || '')} · ${s.level}</small></button>`).join('')}</div></div>` : '') +
    (ph.length ? `<div class="watch" style="margin-top:26px"><h2 class="h3" style="margin-bottom:12px">Everyday English from this play</h2><div class="themes">${ph.map(p => `<div>${quoteBtn(id, { a: p.a, s: p.si, b: p.b, q: plain(p.line), who: p.s, ref: 'Act ' + p.act + ', Scene ' + p.sc, note: p.phrase + ' = ' + p.meaning.en })}</div>`).join('')}</div></div>` : '');
}
/* old silent-hiding image error handler removed: see lwImgError() */
function riddleAct(it, box) {
  box.innerHTML = `<p class="hint">Read the riddle aloud. What is it? Type your guess, then compare with the answer printed in the 1842 book.</p><div class="line-card" style="font-family:var(--lit);white-space:pre-line">${esc(it.text)}</div><div class="rid"><input id="rg" placeholder="Your guess…" aria-label="Your guess"><button class="btn sm" id="rb">Show the answer</button></div><div class="fb" id="rf"></div>`;
  $('#rb').onclick = () => { const g = $('#rg').value.trim().toLowerCase(); const ans = it.answer.replace(/^(A|An|The)\s+/i, '').toLowerCase(); const ok = g && ans.split(/[\s,.-]+/).some(w => w.length > 2 && g.includes(w)); if (g) lwOnce(box, 0, 'reading', !!ok); $('#rf').innerHTML = `${ok ? 'Yes! ' : ''}Halliwell’s answer: <b>${esc(it.answer)}</b>${it.footnote ? ` · Footnote in the book: <i>${esc(it.footnote)}</i>` : ''}`; };
}

/* ============================================================
   v6 · THE LITERATURE WORLD — "The Violet Book"
   Four friends from Just To Study open a violet book whose clasp is
   the brand's speech bubble — and fall into English literature.
   · Generated scenes (SCN) show our characters in imagined places and
     are ALWAYS labelled as illustrations.
   · Every painting, manuscript, photograph and text beside them is
     authentic, credited and taken from the collection data above.
   ============================================================ */

/* ---------- short interface labels (English / Kazakh / Russian) ----------
   Navigation, tabs and buttons say what they do in a word or two. Only interface
   wording changes here — never a literary text, a quotation or a learner note. */
Object.assign(UI.en, { navProse: 'Stories', prose: 'Stories', navRhymes: 'Rhymes', rhymesay: 'Rhymes', rhymes: 'Rhymes',
  read: 'Read', readFull: 'Read the play', story: 'The story', watch: 'Watch', useIt: 'Use it', rebuild: 'Rebuild it', meaning: 'Meaning', think: 'Think',
  featured: 'Listen first', chooseLevel: 'Choose level', about: 'About', tapWord: 'Tap a dotted word', wordsT: 'Words', everyday: 'Everyday Shakespeare',
  sources: 'Sources', find: 'Find a word', ending: 'Which ending is real?', moralMatch: 'Match the moral' });
Object.assign(UI.kz, { read: 'Оқу', readFull: 'Пьесаны оқу', story: 'Тарихы', watch: 'Көру', useIt: 'Қолдан', featured: 'Алдымен тыңда',
  wordsT: 'Сөздер', sources: 'Дереккөздер', find: 'Сөз іздеу', ending: 'Қай соңы шын?', moralMatch: 'Түйінін тап' });
Object.assign(UI.ru, { read: 'Читать', readFull: 'Читать пьесу', story: 'История', watch: 'Смотреть', useIt: 'Используй', featured: 'Сначала послушай',
  about: 'О текстах', wordsT: 'Слова', everyday: 'Шекспир каждый день', sources: 'Источники', find: 'Найти слово', ending: 'Какой конец настоящий?', moralMatch: 'Найди мораль' });
function lwBlob(u) {
  try { const i = u.indexOf(','); const mime = u.slice(5, u.indexOf(';')); const bin = atob(u.slice(i + 1)); const a = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k); return URL.createObjectURL(new Blob([a], { type: mime })); }
  catch (e) { return u; }
}
const SCN = (() => { let d = {}; try { d = lwData('scenes'); } catch (e) { } const o = {}; for (const k in d) o[k] = lwMedia(d[k]); return o; })();
const ENTRANCE_VIDEO = SCN.entrance_video || 'assets/entrance.mp4';   // a 5-second loop that fades in over the still
const MAS = { dexter: { n: 'Dexter', r: 'guide' }, luna: { n: 'Luna', r: 'poet' }, spark: { n: 'Spark', r: 'actor' }, aizere: { n: 'Aizere', r: 'storyteller' } };
const MIMG = lwData('mascots');
const cimg = k => SCN['c_' + k] || MIMG[k];
const sayHTML = (k, txt, cls) => `<div class="lw-say ${cls || ''}"><img src="${cimg(k)}" alt="${MAS[k].n}, our ${MAS[k].r}" draggable="false"><p><b>${MAS[k].n}</b>${esc(txt)}</p></div>`;
const marginHTML = (k, txt) => `<div class="lw-margin"><img src="${cimg(k)}" alt="${MAS[k].n}, our ${MAS[k].r}" draggable="false"><p><b>${MAS[k].n}</b>${esc(txt)}</p></div>`;
const ILLUS = place => `<span class="lw-tag" title="An illustration of our characters${place ? ' in ' + esc(place) : ''} — not a historical image.">Illustration</span>`;
const scnBg = (k, pos) => `background-image:url('${SCN[k] || ''}');${pos ? `--p:${pos};background-position:${pos}` : ''}`;
/* a door on the map: the seven chapters and the four more rooms are drawn the same way */
const doorHTML = (s, mark, label, cls) => `<button class="lw-door" data-lw-onclick="${s.go}" aria-label="${esc(label)}"><span class="arch"><span class="img" data-scn="${s.scn}" data-m="${s.m}" data-shape="arch" data-pos="${s.pos}" style="${scnBg(s.scn, s.pos)}"></span></span><span class="no${cls ? ' ' + cls : ''}">${mark}</span><b>${esc(s.world)}</b><small>${esc(s.short)} · ${esc(s.n())}</small></button>`;
function lwScroll(id) { const el = $id(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

/* authentic backdrops — every file verified on Wikimedia Commons */
const BD = {
  globe: A('The Globe Theatre from the Long Antwerp View of London.jpg', 'Wenceslaus Hollar, Long View of London, 1647 — detail: the Globe', 'Public domain', '50% 50%'),
  drury: A('Microcosm of London Plate 032 - Drury Lane Theatre (colour).jpg', 'Rowlandson & Pugin, Drury Lane Theatre, The Microcosm of London, 1808', 'Public domain', '50% 50%'),
  lakes: A('John Glover - Ullswater, early morning - Google Art Project.jpg', 'John Glover, Ullswater, Early Morning, c. 1824', 'Public domain', '45% 55%'),
  reading: A('Reading-room of the British Museum LCCN2007682650.jpg', 'The Reading Room of the British Museum — Library of Congress', 'Public domain', '50% 50%'),
  gothic: A('John Atkinson Grimshaw - Whitby - B2012.28 - Yale Center for British Art.jpg', 'John Atkinson Grimshaw, Whitby — Yale Center for British Art', 'Public domain', '50% 50%'),
  dickens: A('Dickens dream.jpg', 'Robert William Buss, Dickens’s Dream, 1875 — Charles Dickens Museum', 'Public domain', '50% 40%'),
  beowulf: A('Beowulf Cotton MS Vitellius A XV f. 132r (cropped).jpg', 'The first page of Beowulf, Cotton MS Vitellius A XV, f. 132r — British Library', 'Public domain', '50% 30%'),
  nursery: A('Sing a sing of sixpence - illustration by Walter Crane - Project Gutenberg eText 18344.jpg', 'Walter Crane, “Sing a Song of Sixpence”, 1866', 'Public domain', '50% 40%'),
  library: A('Duke Humfrey\'s Library Interior 2, Bodleian Library, Oxford, UK - Diliff.jpg', 'Duke Humfrey’s Library, Bodleian Library, Oxford — photo David Iliff', 'CC BY-SA 3.0', '50% 50%'),
  london: A('Gustave Doré - Wentworth Street Whitechapel - London, a Pilgrimage.jpg', 'Gustave Doré, Wentworth Street, Whitechapel, London: A Pilgrimage, 1872', 'Public domain', '50% 40%'),
  caxton: A('Daniel Maclise - Caxton Showing the First Specimen of His Printing to King Edward IV at the Almonry, Westminster.jpg', 'Daniel Maclise, Caxton Showing the First Specimen of His Printing to King Edward IV, 1851', 'Public domain', '50% 45%')
};

/* ---------- the journey: seven chapters + four side streets ---------- */
const nOther = () => Object.keys(PLAYS).length - Object.keys(W.plays).length;
const WORLDS = [
  { id: 'globe', short: 'The Globe', v: 'shakespeare', go: "go('shakespeare')", scn: 'globe', pos: '58% 40%', m: 'spark', place: 'Shakespeare’s Globe', world: 'Shakespeare', when: 'London, 1600',
    q: 'Why is Spark holding a skull?', say: 'The flag is up: a play today!', hist: 'globe', n: () => Object.keys(W.plays).length + ' plays' },
  { id: 'theatre', short: 'The Theatre', v: 'drama', go: "go('drama')", scn: 'theatre', pos: '50% 45%', m: 'spark', place: 'The Theatre', world: 'Drama', when: 'Seven centuries of plays',
    q: 'What happens when the curtain rises?', say: 'Pick a play. I’ll take any part!', hist: 'drury', n: () => nOther() + ' more plays' },
  { id: 'poets', short: 'Poets’ Country', v: 'poetry', go: "go('poetry')", scn: 'poets', pos: '55% 60%', m: 'luna', place: 'The Poets’ Country', world: 'Poetry', when: 'The Lake District, at dawn',
    q: 'What did the poet see beside the lake?', say: 'Read it aloud first.', hist: 'lakes', n: () => (POEMS.length + W.poemsX.length) + ' poems' },
  { id: 'library', short: 'The Library', v: 'prose', go: "go('prose')", scn: 'library', pos: '50% 40%', m: 'dexter', place: 'The Victorian Library', world: 'Stories', when: 'London, by gaslight',
    q: 'Which book is Dexter reaching for?', say: 'Each story shows if it is complete.', hist: 'reading', n: () => W.prose.length + ' stories' },
  { id: 'gothic', short: 'Gothic Street', v: 'prose', sub: 'gothic', go: "go('prose','gothic')", scn: 'gothic', pos: '45% 50%', m: 'luna', place: 'The Gothic Street', world: 'Gothic tales', when: 'Whitby, a foggy night',
    q: 'Who left the old door open?', say: 'Fog, moonlight, an old door… Come and read.', hist: 'gothic', n: () => W.prose.filter(x => x.shelf === 'gothic').length + ' tales' },
  { id: 'writers', short: 'Writers’ Room', v: 'words', go: "go('words')", scn: 'writers', pos: '50% 40%', m: 'luna', place: 'The Writers’ Room', world: 'Words', when: 'By candlelight',
    q: 'Which word is Luna crossing out?', say: 'Every word here comes from a real line.', hist: 'dickens', n: () => WORDS.length + ' words' },
  { id: 'archive', short: 'The Archive', v: 'periods', go: "go('periods')", scn: 'archive', pos: '40% 45%', m: 'aizere', place: 'The Archive of Ages', world: 'Periods', when: 'From the 7th century',
    q: 'What is written on the oldest page?', say: 'Ретімен жүрейік — in order, from Beowulf.', hist: 'beowulf', n: () => W.periods.length + ' periods' }
];
const LANES = [
  { id: 'nursery', v: 'rhymes', go: "go('rhymes')", scn: 'nursery', pos: '50% 50%', m: 'aizere', place: 'The Nursery Corner', short: 'The Nursery', world: 'Rhymes', say: 'Жаңылтпаш! Slowly first, then faster.', hist: 'nursery', n: () => roomItems('rhymes').length + ' rhymes' },
  { id: 'sayings', v: 'proverbs', go: "go('proverbs')", scn: 'hall', pos: '60% 45%', m: 'aizere', place: 'The Hall of Sayings', short: 'The Hall', world: 'Proverbs', say: 'Which one is true for you?', hist: 'library', n: () => PROVERBS.length + ' proverbs' },
  { id: 'streets', v: 'voices', go: "go('voices')", scn: 'streets', pos: '45% 50%', m: 'spark', place: 'The Streets of London', short: 'The Streets', world: 'Voices', say: 'Listen: Cockney, Scots, Irish!', hist: 'london', n: () => 'Slang & dialect' },
  { id: 'press', v: 'workshop', go: "go('workshop')", scn: 'press', pos: '40% 45%', m: 'dexter', place: 'The Printing House', short: 'The Press', world: 'Practice', say: 'Caxton printed the first English books. Now it’s our turn.', hist: 'caxton', n: () => 'From real lines' }
];
const EVERYDAY = { id: 'everyday', parent: WORLDS[0], v: 'everyday', scn: 'globe', pos: '30% 45%', m: 'spark', place: 'Shakespeare’s Globe', world: 'Everyday English', say: '“In a pickle”? That’s Shakespeare!', hist: 'globe' };
const STOPS = WORLDS.concat(LANES);
function stopFor() {
  if (S.view === 'prose' && S.id === 'gothic') return WORLDS[4];
  if (S.view === 'everyday') return EVERYDAY;
  return STOPS.find(s => s.v === S.view && !s.sub) || null;
}
const chapOf = s => { const r = s.parent || s; const i = WORLDS.indexOf(r); return (i >= 0 ? 'Chapter ' + roman(i + 1) : 'Side street') + ' · ' + (r.short || r.place) + (LEVEL ? ' · Level ' + LEVEL : ''); };

/* ============================================================
   HOME · the entrance and the map
   ============================================================ */
function homePage() {
  const nPlays = Object.keys(PLAYS).length, nPoems = POEMS.length + W.poemsX.length, nProse = W.prose.length;
  const motes = Array.from({ length: 22 }, (_, i) => `<span style="left:${(i * 37 + 11) % 100}%;--s:${2 + (i % 4)}px;--d:${11 + (i * 7) % 13}s;--w:${(i * 1.7) % 12}s;--x:${((i % 5) - 2) * 26}px"></span>`).join('');
  const tiger = BY['po-tiger'];
  return `<div class="lw-home">
  <section class="lw-entry" id="entry" aria-label="Entrance">
    <div class="scene" data-scn="entrance" data-gap="1" style="${scnBg('entrance')}"></div>
    <video muted playsinline loop preload="none" aria-hidden="true" data-scn="entrance" data-gap="1"></video>
    <div class="motes" aria-hidden="true">${motes}</div>
    <div class="in">
      <div class="over"><i></i>Literature World</div>
      <h1>Open the book.<em>Step inside.</em></h1>
      <p class="lede">Real plays, poems and stories from thirteen centuries — in the authors’ own words.</p>
      <div class="ctas"><button class="btn" data-lw-onclick="lwScroll('worlds')">Explore →</button><button class="btn light" data-lw-onclick="lwScroll('levels')">${t('chooseLevel')}</button></div>
      <div class="facts"><div><b>${nPlays}</b><span>complete plays</span></div><div><b>${nPoems}</b><span>poems</span></div><div><b>${nProse}</b><span>stories</span></div><div><b>${W.periods.length}</b><span>periods</span></div></div>
    </div>
    ${ILLUS('an imagined library')}
  </section>

  <section class="lw-prologue" id="prologue"><div class="wrap">
    <div class="lw-tale">
      <div class="over">Prologue</div>
      <h2>Once upon a time, <em>in&nbsp;English…</em></h2>
      <p>Four friends from Just To Study found an old violet book. Its pages became doors — into real literature.</p>
      <p>The friends are imagined. Everything they find is real.</p>
    </div>
    <div class="lw-cast">
      <div class="lw-cast-h"><div class="orn">❦</div><h3>Meet the friends</h3></div>
      <div class="lw-roles">
        ${[['dexter', 'The guide. He knows the way.', 'Жолбасшы · guide'],
           ['luna', 'The poet. She reads every line aloud.', 'Ақын · poet'],
           ['spark', 'The actor. All energy and jokes.', 'Актер · actor'],
           ['aizere', 'The storyteller. She explains in Kazakh.', 'Қазақша сөйлейді · storyteller']]
          .map(([k, d, s]) => `<div class="lw-role"><div class="stage"><img src="${cimg(k)}" alt="${MAS[k].n}" loading="lazy" draggable="false"></div><b>${MAS[k].n}</b><i>${esc(d)}</i><small>${esc(s)}</small></div>`).join('')}
      </div>
    </div>
  </div></section>

  <section class="lw-map" id="worlds"><div class="wrap">
    <div class="lw-head"><div><div class="over">The journey</div><h2>The <em>Map</em></h2></div>
      <p>Each door opens a different century. Start anywhere.</p></div>
    <div style="position:relative">
      <svg class="lw-path" viewBox="0 0 1200 1000" preserveAspectRatio="none" aria-hidden="true"><path d="M40 470 C180 540 300 420 430 500 S 690 560 770 470 S 1010 420 1170 520 C 1210 640 1060 640 1000 760 S 760 980 600 960 S 260 900 40 990"/></svg>
      <div class="lw-doors">
        ${WORLDS.map((s, i) => doorHTML(s, roman(i + 1), `Chapter ${roman(i + 1)}: ${s.place} — ${s.world}`)).join('')}
        <div class="lw-door-note">${sayHTML('dexter', 'Not sure? Start at the Globe.')}</div>
      </div>
    </div>
    <div class="lw-rooms"><div class="lw-rooms-h"><h3>More rooms</h3></div>
      <div class="lw-doors lw-doors-more">${LANES.map(s => doorHTML(s, '✦', `${s.world} — ${s.place}`, 'orn')).join('')}</div>
    </div>
    <p class="meta" style="margin:26px 0 0;font-size:12px;color:#8E8070;position:relative">The door scenes are illustrations. The pictures inside each world are real and credited.</p>
  </div></section>

  <section class="lw-cabinet" id="cabinet"><div class="wrap">
    <div class="lw-head"><div><div class="over">Authentic objects</div><h2>Real <em>treasures</em></h2></div>
      <p>Manuscripts, first editions and drawings. Open one to read.</p></div>
    <div class="lw-curios">${CURIOS.map(c => `<button class="lw-curio" data-lw-onclick="${c.go}"><span class="fr"><span class="mat"><img src="${IMG(c.file, 700)}" alt="${esc(c.t)}" loading="lazy"></span></span><span class="plaque"><span class="lw-tag auth">Authentic</span><b>${esc(c.t)}</b><q>${esc(c.q)}</q><small>${esc(c.src)} · Public domain</small></span></button>`).join('')}</div>
  </div></section>

  <section class="lw-desk" id="desk"><div class="wrap lw-desk-in">
    <figure class="plate" style="margin:0"><img src="${img(tiger.image.file, 900)}" alt="${esc(tiger.image.credit)}" loading="lazy"><figcaption>${esc(tiger.image.credit)}</figcaption></figure>
    <div class="sheet">
      ${sayHTML('luna', 'Listen first, then read.', 'rev')}
      <div class="kicker">${t('featured')}</div>
      <h2>${esc(tiger.title)}</h2><div class="meta" style="font-size:14px">William Blake · Songs of Experience, 1794</div>
      <p class="q">“Tiger, tiger, burning bright<br>In the forests of the night”</p>
      ${voiceBlock(tiger, 'feat')}
      <button class="btn sm" style="margin-top:12px" data-lw-onclick="go('item','po-tiger')">Read →</button>
    </div>
  </div></section>

  <section class="lw-ages lw-paper" id="ages"><div class="wrap">
    <div class="lw-head"><div><div class="over">${t('periods')}</div><h2>Thirteen <em>centuries</em></h2></div>
      ${sayHTML('aizere', 'Ретімен жүрейік — in order, from Beowulf.', 'rev')}</div>
    <div class="lw-strip">${W.periods.map((p, i) => { const a = ART[PERIOD_ART[p.id]]; return `<button data-lw-onclick="go('periods')"><span class="fr" style="display:block"><span class="ph" style="display:block;${a ? `background-image:url('${IMG(a.file, 500)}');background-position:${a.pos}` : ''}"></span></span><span class="n">${roman(i + 1)}</span><b>${esc(p.name)}</b><small>${esc(p.dates)}</small></button>`; }).join('')}</div>
  </div></section>

  <section class="lw-study lw-paper" id="study"><div class="wrap">
    <div class="lw-head"><div><div class="over">Learn</div><h2>Learn <em>English</em></h2></div><p>From real lines, never simplified.</p></div>
    <div class="lw-desks">
      <button data-lw-onclick="go('words')"><span class="ph" data-scn="writers" data-pos="50% 40%" style="${scnBg('writers', '50% 40%')}"></span><span class="tx"><span class="kicker">The Writers’ Room</span><h3>Words</h3><p>${WORDS.length} words from real poems, plays and stories.</p><span class="go">Open →</span></span></button>
      <button data-lw-onclick="go('everyday')"><span class="ph" data-scn="globe" data-pos="50% 60%" style="${scnBg('globe', '50% 60%')}"></span><span class="tx"><span class="kicker">The Globe</span><h3>Everyday Shakespeare</h3><p>${PHRASES.length} phrases we still use.</p><span class="go">Open →</span></span></button>
      <button data-lw-onclick="go('voices')"><span class="ph" data-scn="streets" data-pos="45% 50%" style="${scnBg('streets', '45% 50%')}"></span><span class="tx"><span class="kicker">The Streets</span><h3>Voices</h3><p>Slang, dialect and old English.</p><span class="go">Open →</span></span></button>
      <button data-lw-onclick="go('workshop')"><span class="ph" data-scn="press" data-pos="50% 45%" style="${scnBg('press', '50% 45%')}"></span><span class="tx"><span class="kicker">The Press</span><h3>Practice</h3><p>Rhyme, voices, endings, proverbs.</p><span class="go">Open →</span></span></button>
    </div>
  </div></section>

  <section class="lw-levels lw-paper" id="levels"><div class="wrap">
    <div class="lw-head"><div><div class="over">Levels</div><h2>Choose your <em>level</em></h2></div><p>Texts are never simplified. Pick a level to see what fits.</p></div>
    <div class="lw-plates">${LEVELS.map(l => `<button class="${LEVEL === l ? 'on' : ''}" data-lw-onclick="LEVEL='${LEVEL === l ? '' : l}';render();setTimeout(()=>lwScroll('levels'),60)"><b>${l}</b><span>${LV_NOTE[l]}</span><em>${ALL.filter(i => i.level === l).length + W.prose.filter(i => i.level === l).length + W.poemsX.filter(i => i.level === l).length} texts</em></button>`).join('')}</div>
  </div></section>
  </div>`;
}
/* the cabinet: authentic artefacts only (files verified on Commons) */
const CURIOS = [
  { file: 'Beowulf Cotton MS Vitellius A XV f. 132r (cropped).jpg', t: 'Beowulf, the first page', q: 'The only copy survived a library fire in 1731. Can you read its first word?', src: 'Cotton MS Vitellius A XV — British Library', go: "go('text','beowulf-1')" },
  { file: 'Chaucer ellesmere.jpg', t: 'Chaucer on horseback', q: 'Painted into a manuscript of The Canterbury Tales around 1400. Where is he riding?', src: 'The Ellesmere Chaucer — Huntington Library', go: "go('text','chaucer-prologue')" },
  { file: 'Swan-theatre-johannes-de-witt-ms-842-f132r-1596.jpg', t: 'Inside a London playhouse, 1596', q: 'A visitor sketched this stage — the only surviving drawing of the inside of one. Where did the audience stand?', src: 'After Johannes de Witt, 1596 — Utrecht University Library, MS 842', go: "go('shakespeare')" },
  { file: 'Title page William Shakespeare\'s First Folio 1623.jpg', t: 'The First Folio, 1623', q: 'Collected by two of his fellow actors, seven years after his death. Which plays would we have lost without it?', src: 'Mr. William Shakespeares Comedies, Histories, & Tragedies', go: "go('shakespeare')" },
  { file: 'William Blake - Songs of Innocence, Plate 28, "Laughing Song" (Bentley 15) - Google Art Project.jpg', t: 'A page Blake made by hand', q: 'He wrote, engraved, printed and coloured it himself. Can you hear the laughter?', src: 'William Blake, Songs of Innocence, 1789', go: "go('item','po-laughing-song')" },
  { file: 'Marley\'s Ghost - A Christmas Carol (1843), opposite 25 - BL.jpg', t: 'Marley’s Ghost', q: '“Marley was dead: to begin with.” So who is this, rattling his chains?', src: 'John Leech, 1843 — British Library', go: "go('text','carol')" },
  { file: 'The White Rabbit (Tenniel) - The Nursery Alice (1890) - BL.jpg', t: 'The White Rabbit', q: '“Oh dear! Oh dear! I shall be late!” Late for what?', src: 'John Tenniel, The Nursery Alice, 1890 — British Library', go: "go('text','alice-ch1')" },
  { file: 'Sidney Paget - A Scandal in Bohemia 01.jpg', t: 'A Scandal in Bohemia', q: '“To Sherlock Holmes she is always the woman.” Who is she?', src: 'Sidney Paget, The Strand Magazine, 1891', go: "go('text','scandal')" }
];

/* ============================================================
   WORLD PAGES · arrival scene, authentic inset, chapter ribbon
   ============================================================ */
function histHTML(s) {
  const a = BD[s.hist]; if (!a) return '';
  return `<figure class="lw-hist"><div class="fr"><img src="${IMG(a.file, 500)}" alt="${esc(a.credit)}" loading="eager" fetchpriority="high" decoding="async" style="object-position:${a.pos}"></div><figcaption><b>In history</b>${esc(a.credit)} · ${esc(a.lic)}</figcaption></figure>`;
}
function routeHTML(cur) {
  const c = cur.parent || cur; const i = WORLDS.indexOf(c); const next = i >= 0 ? WORLDS[(i + 1) % WORLDS.length] : WORLDS[0];
  return `<nav class="lw-route" aria-label="The journey"><div class="wrap"><ol>${WORLDS.map((s, k) => `<li class="${s === c ? 'on' : ''}"><button data-lw-onclick="${s.go}"><i>${roman(k + 1)}</i><span>${esc(s.short)}</span></button></li>`).join('')}</ol><button class="next" data-lw-onclick="${next.go}">${i >= 0 ? 'Continue' : 'Start'} → <b>${esc(next.short)}</b></button></div></nav>`;
}
function arriveX() {
  const app = $('#app'); const s = stopFor(); if (!app || !s) return;
  const hero = $('.world-hero', app);
  if (hero) {
    if (hero.dataset.arr) return; hero.dataset.arr = 1; hero.classList.add('lw-scened');
    const bg = $('.bg', hero); if (bg) { bg.style.backgroundImage = `url('${SCN[s.scn]}')`; bg.style.backgroundPosition = s.pos; bg.dataset.scn = s.scn; bg.dataset.m = s.m; bg.dataset.pos = s.pos; }
    const w = $('.wrap', hero); const k = $('.kicker', w); if (k) k.innerHTML = esc(chapOf(s));
    w.insertAdjacentHTML('beforeend', sayHTML(s.m, s.say) + histHTML(s));
    hero.insertAdjacentHTML('beforeend', ILLUS(s.place));
    const tag = $('.lw-tag', hero); if (tag) { tag.style.position = 'absolute'; tag.style.right = '24px'; tag.style.top = '20px'; tag.style.zIndex = 3; }
    hero.insertAdjacentHTML('afterend', routeHTML(s));
    return;
  }
  const head = $('.page-head', app); if (!head || head.dataset.arr) return; head.dataset.arr = 1;
  const sec = document.createElement('section'); sec.className = 'lw-arrive'; sec.dataset.w = s.id;
  sec.innerHTML = `<div class="scene" data-scn="${s.scn}" data-m="${s.m}" data-pos="${s.pos}" style="${scnBg(s.scn, s.pos)}"></div>${ILLUS(s.place)}<div class="wrap in"><div class="ch"><i></i>${esc(chapOf(s))}</div></div>`;
  const inn = $('.in', sec);
  [...head.children].filter(el => el.matches('.kicker,.lw-over')).slice(0, 1).forEach(el => el.remove());
  const h1 = [...head.children].find(el => el.tagName === 'H1'); if (h1) inn.appendChild(h1);
  const lede = [...head.children].find(el => el.matches('p.lede')); if (lede) inn.appendChild(lede);
  inn.insertAdjacentHTML('beforeend', sayHTML(s.m, s.say) + histHTML(s));
  head.classList.add('lw-done'); if (!head.children.length) head.classList.add('lw-empty');
  head.parentElement.insertBefore(sec, head);
  sec.insertAdjacentHTML('afterend', routeHTML(s));
  if (S.view === 'prose' && S.id) setTimeout(() => { const t = $id('sh-' + S.id); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 400);
}

/* companions on reading pages */
function companionsX() {
  const app = $('#app'); if (!app || $('.lw-margin', app)) return;
  if (S.view === 'item' && BY[S.id]) {
    const it = BY[S.id]; const side = $('.exp-side', app); if (!side) return;
    const [m, line] = it.strand === 'shakespeare' ? ['spark', 'Say it standing up — Shakespeare wrote for the voice, not for the page.']
      : it.strand === 'wise' ? ['aizere', 'Think first: what could it mean? Then reveal the answer.']
      : (it.strand === 'rhymes' || it.strand === 'say') ? ['aizere', 'Clap the beat first, then say the words — slowly, then faster.']
      : ['luna', 'Read it aloud first. Tap a dotted word if you need help.'];
    side.insertAdjacentHTML('beforeend', marginHTML(m, line));
  }
  if (S.view === 'text' && TEXTS[S.id]) {
    const x = TEXTS[S.id], R = LIB.prose[S.id] || {}; const side = $('.reading .side', app); if (!side) return;
    const [m, line] = x.shelf === 'gothic' ? ['luna', 'Read it slowly, as if by lamplight. Notice how the author builds the fear.']
      : R.verse ? ['luna', 'Read a few lines aloud. Listen for the beat before you look for the meaning.']
      : ['dexter', x.complete ? 'This one is complete — read it from beginning to end.' : 'This is the opening chapter. If you like it, the whole book is in the public domain.'];
    side.insertAdjacentHTML('afterbegin', marginHTML(m, line));
  }
  if (S.view === 'play' && PMETA[S.id]) {
    const h = $('.play-head', app); if (!h || h.dataset.cur) return; h.dataset.cur = 1;
    h.insertAdjacentHTML('afterbegin', '<span class="lw-pelmet" aria-hidden="true"></span><span class="lw-curtain l" aria-hidden="true"></span><span class="lw-curtain r" aria-hidden="true"></span>');
    h.insertAdjacentHTML('beforeend', sayHTML('spark', W.plays[S.id] ? 'In “Read the play”, choose a role to rehearse — your lines hide until you say them aloud.' : 'Every scene is here, complete. Choose a role in the reader and rehearse it with me.', 'rev'));
  }
}

/* theme per world */
function themeFor() {
  const v = S.view;
  if (v === 'prose' && S.id === 'gothic') return 'gothic';
  if (v === 'rhymes' || v === 'proverbs') return 'nursery';
  if (v === 'workshop') return 'press';
  if (v === 'words' || v === 'word' || v === 'find') return 'writers';
  if (v === 'periods') return 'archive';
  if (v === 'voices') return 'victorian';
  if (v === 'home' || v === 'sources') return 'museum';
  if (v === 'everyday' || v === 'shakespeare') return 'renaissance';
  if (v === 'play') return W.plays[S.id] ? 'renaissance' : 'theatre';
  if (v === 'drama') return 'theatre';
  if (v === 'text') { const x = TEXTS[S.id]; if (x && x.shelf === 'gothic') return 'gothic'; return x ? (PERIOD_THEME[x.period] || 'museum') : 'museum'; }
  if (v === 'prose') return 'victorian';
  if (v === 'poetry') return 'romantic';
  if (v === 'item' && BY[S.id]) { const it = BY[S.id]; if (it.strand === 'shakespeare') return 'renaissance'; if (it.strand === 'wise' || it.strand === 'rhymes' || it.strand === 'say') return 'nursery'; return PERIOD_THEME[it.era] || 'romantic'; }
  return 'museum';
}

/* the entrance: optional moving picture over the still */
function entranceX() {
  if (S.view !== 'home') return;
  const v = $('.lw-entry video'); if (!v || v.dataset.on) return; v.dataset.on = 1;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  v.addEventListener('playing', () => v.classList.add('on'), { once: true });
  v.addEventListener('error', () => v.remove(), { once: true });
  v.src = ENTRANCE_VIDEO; const p = v.play(); if (p && p.catch) p.catch(() => { });
}

function sayingsWall() {
  const L = SAYINGS.filter(s => !LEVEL || s.level === LEVEL); if (!L.length) return '';
  const where = s => s.src === 'franklin' ? ['Benjamin Franklin, The Way to Wealth (1758; edition of 1805)', `go('workshop','pmean')`] : s.src === 'dorian-preface' ? ['Oscar Wilde, Preface to The Picture of Dorian Gray', `go('text','dorian-preface')`] : [BY[s.src].title + ' — ' + aut(BY[s.src]).name, `go('item','${s.src}')`];
  return `<div class="section-label"><h2 class="h3">Sayings born in books</h2><span class="meta">Lines from poems, plays and prose that became everyday English — quoted exactly from the source</span></div>
    <div class="sayx">${L.map(s => { const [w, g] = where(s); return `<button class="saying ${['v', 'c', ''][L.indexOf(s) % 3]}" data-lw-onclick="${g}"><q>${esc(s.text)}</q><div class="f"><span>${esc(w)}</span><span>${s.level}</span></div><small class="mm">${esc(s.meaning.en)}</small></button>`; }).join('')}</div>
    <p class="meta" style="margin:10px 0 30px">More: <button style="text-decoration:underline" data-lw-onclick="go('everyday')">${PHRASES.length} everyday phrases from Shakespeare</button></p>`;
}
function afterX() {
  arriveX(); companionsX(); entranceX(); frameScenes(); setTimeout(frameScenes, 1300);
  if (!$('footer .lw-colophon')) $('footer .wrap').insertAdjacentHTML('beforeend', '<p class="lw-colophon">The friends are imagined. Every text, picture and recording is real and credited.</p>');
  if (S.view === 'word' && WBY[S.id]) wordPractice(WBY[S.id]);
  if (S.view === 'everyday') everydayPractice();
  if (S.view === 'voices') voicesPractice();
  if (S.view === 'workshop' && S.id) workshopRun(S.id);
}

/* ============================================================
   SCENE FRAMING — keeps every character visible and uncovered.
   The scenes are wide illustrations shown through boxes whose
   shape changes with the screen (wide banners, tall arches, small
   circles). A fixed background-position cannot suit every size, so
   each scene is positioned from the measured boxes of its characters:
   they must sit clear of the text column, the soft edge fades, the
   illustration label and (on doors) the question band. The best
   placement is searched at every render and resize; the scene's own
   mascot counts double when not everyone fits.
   ============================================================ */
/* each mascot's whole outline (head, hat, raised arms, held props, feet) as fractions of its picture: [x0, x1, y0, y1].
   The Globe and the home entrance were extended downwards (outpainted, original pixels kept) so that no mascot
   is cut off by the picture itself; a mascot partly behind a desk or a carriage door is part of the scene. */
const CAST = {
  entrance: { aizere: [.333, .48, .424, .776], luna: [.521, .684, .435, .801], dexter: [.664, .812, .338, .745], spark: [.771, .929, .46, .806] },
  globe: { aizere: [.08, .335, .345, .88], dexter: [.27, .47, .37, .755], spark: [.495, .785, .19, .51], luna: [.64, .85, .385, .83] },
  theatre: { dexter: [.185, .46, .355, .93], spark: [.49, .645, .40, .88] },
  poets: { luna: [.435, .69, .285, .745], aizere: [.685, .89, .205, .70] },
  library: { dexter: [.125, .37, .20, .68], aizere: [.58, .70, .50, .81], spark: [.755, .90, .55, .885] },
  gothic: { luna: [.355, .61, .36, .88], spark: [.57, .685, .49, .85] },
  writers: { luna: [.415, .805, .11, .68] },
  archive: { aizere: [.34, .55, .375, .77], dexter: [.53, .77, .405, .72] },
  nursery: { spark: [.155, .385, .395, .815], aizere: [.37, .655, .19, .785], luna: [.67, .87, .365, .82] },
  streets: { spark: [.225, .39, .34, .63], aizere: [.62, .755, .515, .92] },
  press: { spark: [.20, .47, .465, .80], dexter: [.605, .925, .32, .975] },
  hall: { dexter: [.23, .365, .355, .885], aizere: [.35, .495, .445, .95], luna: [.485, .625, .435, .885], spark: [.63, .775, .515, .895] }
};
/* natural picture sizes (defaults; replaced by the embedded files' real sizes once read) */
const SCN_SIZE = {"archive": [1920, 1072], "entrance": [2355, 1325], "globe": [1920, 1436], "gothic": [1920, 1072], "hall": [1920, 823], "library": [1920, 1072], "nursery": [1920, 1072], "poets": [1920, 1072], "press": [1920, 1072], "streets": [1920, 1072], "theatre": [1920, 1072], "writers": [1920, 1072], "_": [1920, 1072], "video": [1280, 720]};  /* real sizes of the embedded scenes, so none has to be downloaded just to be measured */
/* (scenes are no longer all downloaded and decoded at start-up: their sizes are known above) */

/* tight boxes around what is actually printed or shown */
function textRects(el) {
  if (!el || !el.getBoundingClientRect || getComputedStyle(el).display === 'none') return [];
  if (el.matches('h1,p,.ch,.over,.kicker,figcaption')) {
    const r = document.createRange(); r.selectNodeContents(el);
    const L = [...r.getClientRects()].filter(q => q.width > 1 && q.height > 1); if (!L.length) return [];
    return [{ left: Math.min(...L.map(q => q.left)), top: Math.min(...L.map(q => q.top)), right: Math.max(...L.map(q => q.right)), bottom: Math.max(...L.map(q => q.bottom)) }];
  }
  if (el.matches('.lw-say')) return [...el.children].map(c => c.getBoundingClientRect());
  if (el.matches('.lw-hist')) return [...el.children].flatMap(textRects);   /* the framed picture and the words of its caption */
  return [el.getBoundingClientRect()];
}
/* Where a scene sits in its box. Each mascot's outline (plus a little breathing room) is sampled edge to edge.
   A mascot must be shown whole: every part cut off by the frame or the screen edge costs six times what it adds,
   every part under a soft edge fade or the text veil costs as much as it adds, and the exact area under text, a
   picture or a label costs three times. The search moves the picture within its box (cover); where allowed it
   may scale it down (ctx.zoom: the free edges fade into the page) or make a stacked stage shorter (ctx.heights,
   phones and tablets). In small windows (doors, medallions: ctx.crop) a neighbour is shown whole or not at all.
   Returns the height factor used. */
function frameOne(el, ctx) {
  const key = el.dataset.scn, cast = CAST[key]; if (!cast) return 1;
  const isVid = el.tagName === 'VIDEO';
  const [iw, ih] = isVid ? (el.videoWidth ? [el.videoWidth, el.videoHeight] : SCN_SIZE.video) : (SCN_SIZE[key] || SCN_SIZE._);
  const W0 = el.offsetWidth, HB = el.offsetHeight, par = el.offsetParent; if (W0 < 24 || HB < 24 || !par) return 1;
  const pr = par.getBoundingClientRect(), bx = pr.left + el.offsetLeft, by = pr.top + el.offsetTop;   /* box without animation transforms */
  const ex = (ctx.ex || []).map(r => [r.left - bx - 16, r.top - by - 16, r.right - bx + 16, r.bottom - by + 16]);
  /* only what is really on screen counts: the box may reach past its section (which clips it) or past the window */
  const cl = Math.max(0, pr.left) - bx, cr = Math.min(pr.right, innerWidth) - bx, ct = pr.top - by, cb = pr.bottom - by;
  const mx = .015, my = .015 * iw / ih;   /* breathing room around every outline */
  const boxes = Object.entries(cast).map(([m, c]) => [m, [Math.max(0, c[0] - mx), Math.min(1, c[1] + mx), Math.max(0, c[2] - my), Math.min(1, c[3] + my)]]);
  const dp = (el.dataset.pos || '50% 50%').split(' ').map(parseFloat), px = isNaN(dp[0]) ? 50 : dp[0], py = isNaN(dp[1]) ? 50 : dp[1];
  const N = 7, gap = Math.max(0, ctx.gap || 0);
  let best = null, bs = -Infinity;
  for (const f of ctx.heights || [1]) {
    const H0 = Math.round(HB * f), fadeB = (ctx.fadeB || 0) * f;
    const s = Math.max(W0 / iw, H0 / ih), W = iw * s, H = ih * s;
    let fl = 0, ft = 0;   /* soft left / top edges of a picture that does not reach the box edge */
    const point = (x, y) => {   /* 0 cut off · 1 under a fade · 2 clear */
      if (x < 0 || y < 0 || x > W0 || y > H0 || x < cl || x > cr || y < ct || y > cb) return 0;
      const r = W0 / 2;
      if (ctx.shape === 'arch' && y < r && (x - r) ** 2 + (r - y) ** 2 > r * r) return 0;
      if (ctx.shape === 'circle' && (x - r) ** 2 + (y - H0 / 2) ** 2 > r * r) return 0;
      if (x < fl || y < ft || y > H0 - fadeB || (ctx.clearX && x + bx < ctx.clearX)) return 1;
      return 2;
    };
    const score = (ix, iy, sw, sh, seen) => {
      let t = 0;
      for (const [m, c] of boxes) {
        let inn = 0, fad = 0, cnt = 0;
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          const u = i / (N - 1), v = j / (N - 1);
          /* in round windows (doors, medallions) a mascot's outline is round too: its box's empty outer corners do not count */
          if (ctx.round && (2 * u - 1) ** 4 + (2 * v - 1) ** 4 > 1.02) continue;
          cnt++;
          const p = point(ix + (c[0] + (c[1] - c[0]) * u) * sw, iy + (c[2] + (c[3] - c[2]) * v) * sh);
          if (p) { inn++; if (p === 1) fad++; }
        }
        inn /= cnt; fad /= cnt;
        /* the exact share of the outline under text, a picture or a label (no sampling gaps for thin labels) */
        let cov = 0;
        const x1 = ix + c[0] * sw, x2 = ix + c[1] * sw, y1 = iy + c[2] * sh, y2 = iy + c[3] * sh, A = (x2 - x1) * (y2 - y1);
        const vx1 = Math.max(x1, 0, cl), vx2 = Math.min(x2, W0, cr), vy1 = Math.max(y1, 0, ct), vy2 = Math.min(y2, H0, cb);
        if (vx2 > vx1 && vy2 > vy1) for (const e of ex) {
          const w = Math.min(vx2, e[2]) - Math.max(vx1, e[0]), h = Math.min(vy2, e[3]) - Math.max(vy1, e[1]);
          if (w > 0 && h > 0) cov += w * h / A;
        }
        const v = ctx.crop && m !== ctx.m
          ? (inn > .97 ? .5 - fad - 10 * cov : inn < .03 ? 0 : -2 * Math.min(inn, 1 - inn))   /* whole or not at all */
          : inn - 6 * (1 - inn) - fad - 10 * cov;
        t += m === ctx.m ? 2 * v : v;
        if (seen) seen[m] = inn;
      }
      return t;
    };
    const dx = (W0 - W) * px / 100, dy = (H0 - H) * py / 100;   /* the authored framing */
    const consider = (x, y, z) => {
      fl = Math.max(ctx.fadeL || 0, x > 0 ? x + Math.max(ctx.maskL || 0, 160) : 0); ft = y > 0 ? y + 150 : 0;
      const seen = {};
      const sc = score(x, y, W * z, H * z, seen) - .03 * (Math.abs(x - dx) / W0 + Math.abs(y - dy) / H0)
        - (z < 1 ? 1 - z : .5 * (z - 1)) - (f < 1 ? 1 - f : .6 * (f - 1));   /* stay close to the authored framing and size */
      if (sc > bs + 1e-6) { bs = sc; best = { x, y, z, f, W, H, seen }; }
    };
    consider(dx, dy, 1);
    /* zoom 1 = the picture fills the box (cover); below 1 a picture narrower or shorter than its box is anchored
       right / bottom and its free edges fade into the page */
    for (const z of ctx.zoom || [1]) {
      const sw = W * z, sh = H * z, lo = W0 - sw, hi = Math.max(lo, gap), yl = H0 - sh;
      const xs = hi - lo > 1 ? Array.from({ length: 41 }, (_, i) => lo + (hi - lo) * i / 40) : [lo];
      const ys = yl < -1 ? Array.from({ length: 17 }, (_, i) => yl - yl * i / 16) : [yl];
      for (const x of xs) for (const y of ys) consider(x, y, z);
    }
  }
  if (ctx.dry) return { score: bs, seen: best.seen };   /* only asked how good the best framing would be, and what it shows */
  const x = Math.round(best.x), y = Math.round(best.y), sw = Math.ceil(best.W * best.z), sh = Math.ceil(best.H * best.z);
  if (isVid) Object.assign(el.style, { left: x + 'px', top: y + 'px', width: sw + 'px', height: sh + 'px', right: 'auto', bottom: 'auto', objectFit: 'fill', objectPosition: '0 0' });
  else { el.style.backgroundSize = `${sw}px ${sh}px`; el.style.backgroundPosition = `${x}px ${y}px`; }
  if (el.dataset.gap || ctx.maskL) {   /* a picture moved right or scaled down leaves strips under the veil: soften its edges */
    const ox = isVid ? 0 : x, oy = isVid ? 0 : y, L = Math.max(0, ox), layers = [];
    if (x > 0 || ctx.maskL) layers.push(`linear-gradient(90deg,transparent ${L}px,#000 ${L + Math.max(ctx.maskL || 0, x > 0 ? 160 : 0)}px)`);
    if (y > 0) layers.push(`linear-gradient(180deg,transparent ${oy}px,#000 ${oy + 150}px)`);
    if (ctx.maskB) layers.push(`linear-gradient(0deg,transparent 0,#000 ${ctx.maskB}px)`);
    const m = layers.join(',');
    el.style.webkitMaskImage = m; el.style.maskImage = m;
    el.style.webkitMaskComposite = layers.length > 1 ? 'source-in' : ''; el.style.maskComposite = layers.length > 1 ? 'intersect' : '';
  }
  el.dataset.framed = `${x},${y},${sw},${sh}`;
  return best.f;
}
const STAGE_H = [1, 1.1, 1.2, 1.3, .94, .88, .82, .76, .7, .64];   /* a stacked stage may be shorter (wide group) or taller (tall picture) */
function frameScenes() {
  const app = $('#app'); if (!app) return;
  const small = lwNarrow(1100);   /* phones and tablets: the scene sits above the text */
  const tagsOf = sec => $$('.lw-tag', sec).map(t => t.getBoundingClientRect());
  /* a stacked stage is only as tall as its group of characters needs: --scene-h sizes the scene and where the text starts */
  const stage = (sec, el, ctx) => {
    const f = frameOne(el, Object.assign({ ex: tagsOf(sec), fadeB: el.offsetHeight * .16, heights: STAGE_H }, ctx));
    if (f !== 1) sec.style.setProperty('--scene-h', Math.round(el.offsetHeight * f) + 'px');
  };
  /* home entrance (still and video share one framing) */
  const entry = $('.lw-entry', app);
  if (entry) {
    entry.style.removeProperty('--scene-h');
    const vid = $('video', entry), still = $('.scene', entry);
    if (vid) Object.assign(vid.style, { left: '', top: '', width: '', height: '', right: '', bottom: '' });   /* measure the CSS box, not the last framing */
    if (small) {
      if (still) stage(entry, still, {});
      if (vid) frameOne(vid, { ex: tagsOf(entry), fadeB: vid.offsetHeight * .16 });
    } else {
      const er = entry.getBoundingClientRect();
      const ex = [...$$('.in > *', entry)].flatMap(c => c.matches('.ctas,.facts') ? [...c.children].map(k => k.getBoundingClientRect()) : textRects(c)).concat(tagsOf(entry));
      [still, vid].filter(Boolean).forEach(el => frameOne(el, { ex, gap: el.offsetWidth * .3, clearX: er.left + er.width * .5, fadeB: el.offsetHeight * .08, zoom: [1, .94, .88, .82, .76, .7, .64, .6] }));
    }
  }
  /* world arrivals and the Shakespeare / Everyday hero */
  $$('.lw-arrive .scene, .world-hero.lw-scened .bg', app).forEach(el => {
    const sec = el.closest('.lw-arrive,.world-hero'), copy = $('.in, .wrap', sec); if (!copy) return;
    sec.style.removeProperty('--scene-h');
    if (small) { stage(sec, el, { m: el.dataset.m }); return; }
    /* desktop: the copy column lies over the scene's left part; the left and bottom edges fade into the page, and a wide group may be scaled down a little */
    const sr = sec.getBoundingClientRect();
    const ex = [...copy.children].flatMap(c => c.matches('.stats,.hero-ctas') ? [...c.children].map(k => k.getBoundingClientRect()) : textRects(c)).concat(tagsOf(sec));
    frameOne(el, { ex, m: el.dataset.m, fadeL: el.offsetWidth * .1, fadeB: el.offsetHeight * .06, clearX: sr.left + sr.width * .48,
      maskL: el.offsetWidth * .12, maskB: el.offsetHeight * .06, gap: el.offsetWidth * .2, zoom: [1, .94, .88, .82, .76, .7, .64] });
  });
  /* the doors on the map (chapters and more rooms) and the Study cards. A door shows one mascot whole and its neighbours
     whole or not at all. It features the world's own mascot; only when that would leave a neighbour cut in half (mascots
     standing shoulder to shoulder) does it feature the mascot in the picture that gives the cleanest door */
  $$('.lw-door .arch .img', app).forEach(el => {
    const door = { shape: 'arch', crop: true, round: true, zoom: [1, 1.12, 1.25, 1.4] }, own = el.dataset.m, cast = CAST[el.dataset.scn] || {};
    const halfCut = (r, m) => Math.max(0, ...Object.entries(r.seen || {}).filter(([k]) => k !== m).map(([, v]) => Math.min(v, 1 - v)));
    let pick = own;
    const mine = cast[own] ? frameOne(el, Object.assign({ m: own, dry: true }, door)) : null;
    if (!mine || halfCut(mine, own) > .2) {
      let bestCut = mine ? halfCut(mine, own) : 1, bestScore = mine ? mine.score : -Infinity;
      for (const m of Object.keys(cast)) {
        if (m === own) continue;
        const r = frameOne(el, Object.assign({ m, dry: true }, door)), cut = halfCut(r, m);
        if (cut < bestCut - .05 || (Math.abs(cut - bestCut) <= .05 && r.score > bestScore)) { pick = m; bestCut = cut; bestScore = r.score; }
      }
    }
    el.dataset.fm = pick;
    frameOne(el, Object.assign({ m: pick }, door));
  });
  $$('.lw-desks .ph[data-scn]', app).forEach(el => frameOne(el, {}));
}
let FRAME_T = null;
function frameSoon() { clearTimeout(FRAME_T); FRAME_T = setTimeout(frameScenes, 80); }
on(window, 'resize', frameSoon);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(frameSoon);
lwOnRoot('loadedmetadata', e => { if (e.target.matches && e.target.matches('.lw-entry video')) frameSoon(); }, true);
/* the text, the guide's note and the history picture rise into place: measure them again where they come to rest */
lwOnRoot('animationend', e => { const t = e.target; if (t.closest && !t.matches('.scene,.bg,video') && t.closest('.lw-arrive,.world-hero,.lw-entry')) frameSoon(); }, true);


/* ===== WORDS FROM LITERATURE — expanded collection (360 words, every one anchored in a real line) ===== */
Object.assign(WTYPE, {
  shifted: ['Changed meaning', 'The word meant something else in the text. Compare then and now.'],
  coined: ['Coined by writers', 'Words that authors invented — and English kept.']
});
const WSRC = { shakespeare: ['Shakespeare', 'Plays, sonnets and speeches'], drama: ['Drama', 'From Everyman to Synge'], poetry: ['Poetry', 'From Chaucer to Yeats — and nursery rhymes'], prose: ['Prose', 'Novels, stories, fables, essays, letters'], proverbs: ['Proverbs & sayings', 'A Dictionary of English Proverbs'], slang: ['Slang dictionary', 'Francis Grose, 1811'] };
const WORDER = ['shakespeare', 'drama', 'poetry', 'prose', 'proverbs', 'slang'];
const TORDER = ['shifted', 'archaic', 'literary', 'figurative', 'idiom', 'collocation', 'coined', 'phrasal', 'slang', 'dialect'];
const wsrc = w => w.cat || 'prose';
const wsortKey = w => TORDER.indexOf(w.type) * 1000 + (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(w.level) * 10);
const WLIM = 12;

function wordsPage() {
  const f = S.f; const base = WORDS.filter(w => !LEVEL || w.level === LEVEL);
  const inSrc = f.ws ? base.filter(w => wsrc(w) === f.ws) : base;
  const list = f.wt ? inSrc.filter(w => w.type === f.wt) : inSrc;
  const srcs = WORDER.filter(k => base.some(w => wsrc(w) === k));
  const types = TORDER.filter(k => WTYPE[k] && inSrc.some(w => w.type === k));
  const saved = WORDS.filter(w => NOTE[w.id]);
  const groups = (f.ws ? [f.ws] : srcs).map(k => {
    const L = list.filter(w => wsrc(w) === k).sort((a, b) => wsortKey(a) - wsortKey(b)); if (!L.length) return '';
    const clip = !f.ws && L.length > WLIM;
    return `<section class="wsec ${clip ? 'clip' : ''}" data-src="${k}"><div class="section-label"><h2 class="h3">${esc(WSRC[k][0])} <small class="meta">${L.length}</small></h2><span class="meta">${esc(WSRC[k][1])}</span></div>
      <div class="wgrid">${L.map((w, i) => wcard(w, clip && i >= WLIM)).join('')}</div>${clip ? `<button class="btn sm ghost wmore" data-lw-onclick="this.closest('.wsec').classList.remove('clip');this.remove()">Show all ${L.length} →</button>` : ''}</section>`;
  }).join('');
  setTimeout(wordsLab, 0);
  return `<div><div class="wrap page-head"><div class="lw-over"><i></i>${t('wordsT')}</div><h1 class="display" style="font-size:clamp(50px,6vw,90px);margin-top:18px">Words</h1>
    <p class="lede">${WORDS.length} words, each from a real line in this collection. Meet it, understand it, use it.</p>
    <div class="path6">${['Encounter', 'Understand', 'Hear', 'Practise', 'Produce', 'Re-encounter'].map((s, i) => `<span><b>${i + 1}</b>${s}</span>`).join('')}</div>
    <div class="wfil"><span class="wfl">Source</span><div class="filters"><button class="chip ${f.ws ? '' : 'on'}" data-lw-onclick="S.f.ws=null;S.f.wt=null;render()">All · ${base.length}</button>${srcs.map(k => `<button class="chip ${f.ws === k ? 'on' : ''}" data-lw-onclick="S.f.ws='${k}';S.f.wt=null;render()">${esc(WSRC[k][0])} · ${base.filter(w => wsrc(w) === k).length}</button>`).join('')}</div></div>
    <div class="wfil"><span class="wfl">Kind</span><div class="filters"><button class="chip ${f.wt ? '' : 'on'}" data-lw-onclick="S.f.wt=null;render()">All</button>${types.map(k => `<button class="chip ${f.wt === k ? 'on' : ''}" data-lw-onclick="S.f.wt='${k}';render()" title="${esc(WTYPE[k][1])}">${esc(WTYPE[k][0])}</button>`).join('')}</div></div>
    <div class="wfind"><input type="search" id="wq" placeholder="Search these words, meanings or works…" aria-label="Search the words" data-lw-oninput="wfilter(this.value)"><span class="meta" id="wqn"></span><a class="btn sm ghost" href="#wlabp" data-lw-onclick="event.preventDefault();$id('wlabp').scrollIntoView({behavior:'smooth'})">Practise these words ↓</a></div></div>
    <div class="wrap">
      ${saved.length ? `<div class="panel nb"><h2 class="h3">${t('notebook')} <small class="meta">${saved.length} saved on this device</small></h2><div class="wchips">${saved.map(w => `<button data-lw-onclick="go('word','${w.id}')">${esc(w.word)}</button>`).join('')}</div></div>` : ''}
      ${groups || empty()}
      <p class="hint" id="wnone" hidden>No words match. Try a shorter search — or search every text below.</p>
      <div class="panel wlab" id="wlabp"><span class="learner">${t('learnerNote')}</span><h2 class="h3">Context lab</h2><p class="hint">Eight tasks from the words above. Every line is quoted from the collection.</p><div id="wlab"></div></div>
      ${findPanel()}
      <div style="height:70px"></div></div></div>`;
}
function wcard(w, hide) {
  const a = anchorOf(w);
  const s = [w.word, w.meaning.en, w.now || '', a ? a.title : '', a ? a.by : ''].join(' ').toLowerCase();
  return `<button class="wcard ${w.type}${hide ? ' x' : ''}" data-s="${esc(s)}" data-lw-onclick="go('word','${w.id}')"><span class="kicker" style="font-size:10.5px">${esc(w.pos)}${NOTE[w.id] ? ' · ★' : ''}</span><b>${esc(w.word)}</b><span class="m">${esc(w.meaning.en)}</span>${w.now ? `<span class="wnow">now: ${esc(w.now)}</span>` : ''}${a ? `<q>${markWord(a.line.length > 120 ? a.line.slice(0, 118) + '…' : a.line, hlOf(w))}</q><small>${esc(a.title.split(' (')[0])}</small>` : ''}<span class="wtags"><span class="pill lv">${w.level}</span><span class="wt">${esc(WTYPE[w.type][0])}</span></span></button>`;
}
function wfilter(q) {
  q = (q || '').trim().toLowerCase(); let n = 0;
  $$('.wsec').forEach(sec => {
    if (q) sec.classList.remove('clip');
    let k = 0; $$('.wcard', sec).forEach(c => { const ok = !q || c.dataset.s.includes(q); c.hidden = !ok; if (ok) k++; });
    sec.hidden = !k; n += k;
    const more = $('.wmore', sec); if (more) more.hidden = !!q;
  });
  const lab = $('#wqn'); if (lab) lab.textContent = q ? `${n} found` : '';
  const none = $('#wnone'); if (none) none.hidden = !!n || !q;
}

/* ---------- WORD: the six steps, with then/now and dictionary checks ---------- */
function wrefHTML(w) {
  const r = w.ref || {}; const parts = [];
  if (r.word) parts.push(`<a href="https://www.merriam-webster.com/dictionary/${encodeURIComponent(r.word)}" target="_blank" rel="noopener">Merriam-Webster: “${esc(r.word)}”</a>`);
  if (r.w13) parts.push(`Webster’s Revised Unabridged Dictionary (1913)${r.old ? ' — it records the older meaning' : ''}`);
  if (r.wn) parts.push('WordNet (Princeton University)');
  return parts.length ? `<p class="wref"><b>Meaning checked against:</b> ${parts.join(' · ')}. Definitions here are written for learners.</p>` : '';
}
function wordPage(id) {
  const w = WBY[id]; if (!w) return wordsPage(); const a = anchorOf(w); const it = a && a.it;
  const rec = it && it.audio && it.audio.length;
  const re = concord(w.search, 14, w.anchor.kind === 'item' ? 'i:' + w.anchor.id : w.anchor.kind === 'text' ? 't:' + w.anchor.id : w.anchor.kind === 'play' ? 'p:' + w.anchor.id : null);
  const step = (n, h, body) => `<section class="wstep"><div class="n">${n}</div><div><h2 class="h3">${h}</h2>${body}</div></section>`;
  const src = WSRC[wsrc(w)] || ['', ''];
  const L = WORDS.filter(x => wsrc(x) === wsrc(w)); const i = L.indexOf(w); const prev = L[(i - 1 + L.length) % L.length], next = L[(i + 1) % L.length];
  return `<div><div class="wrap"><div class="crumbs" style="padding-top:20px"><button data-lw-onclick="go('words')">← ${t('words')}</button><span>/</span><button data-lw-onclick="S.f.ws='${wsrc(w)}';S.f.wt=null;go('words')">${esc(src[0])}</button><span>/</span><span>${esc(w.word)}</span></div>
    <div class="whead"><div><div class="kicker">${esc(src[0])} · ${esc(WTYPE[w.type][0])} · ${esc(w.pos)}</div><h1 class="display" style="font-size:clamp(48px,6vw,92px);margin-top:12px">${esc(w.word)}</h1>${w.ipa ? `<div class="ipa">${esc(w.ipa)}</div>` : ''}<div class="pills" style="display:flex;gap:6px;margin-top:12px"><span class="pill lv">${w.level}</span><span class="pill">${esc(WTYPE[w.type][0])}</span></div></div>
      <button class="btn ${NOTE[w.id] ? 'ghost' : ''}" data-lw-onclick="NOTE[S.id]?delete NOTE[S.id]:NOTE[S.id]=Date.now();store.set('notebook',NOTE);render()">${NOTE[w.id] ? '★ In my notebook' : '☆ Save to my notebook'}</button></div>
    <div class="wsteps">
      ${step(1, 'Encounter — where the author used it', a ? `<blockquote class="enc">${markWord(a.line, hlOf(w))}</blockquote><div class="meta">${esc(a.title)} — ${esc(a.by)}</div><button class="btn sm ghost" style="margin-top:12px" data-lw-onclick="${a.go}">Read it in the text →</button>` : '<p class="hint">—</p>')}
      ${step(2, 'Understand', `<span class="learner">${t('learnerNote')}</span>${w.now ? `<div class="thennow"><div><b>In this text</b><p class="mean">${esc(w.meaning.en)}</p></div><div><b>Usual meaning today</b><p>${esc(w.now)}</p></div></div>` : `<p class="mean">${esc(w.meaning.en)}</p>`}<div class="seg"><button class="${SUP === 'ru' ? 'on' : ''}" data-lw-onclick="SUP='ru';render()">Русский</button><button class="${SUP === 'kz' ? 'on' : ''}" data-lw-onclick="SUP='kz';render()">Қазақша</button></div><p class="tr">${esc(w.meaning[SUP] || w.meaning.ru)}</p>${w.note ? `<div class="callout c">${esc(w.note)}</div>` : ''}${w.fig ? `<div class="callout"><b>Literal or figurative?</b>${esc(w.fig)}</div>` : ''}${wrefHTML(w)}`)}
      ${step(3, 'Hear', `${rec ? `<p class="hint">A human reading of the whole text — listen for the line.</p>${voiceBlock(it, 'w')}` : ''}${hasTTS() ? `<button class="btn sm ghost" data-lw-onclick="say(WBY[S.id].word.split(' / ')[0].split(' (')[0])">🔊 The word alone</button> <button class="btn sm ghost" data-lw-onclick="say(${esc(JSON.stringify(a ? plain(a.line) : ''))})">🔊 The line</button><p class="meta" style="margin-top:8px">These two buttons use a synthetic voice, not a human recording.${rec ? '' : ' No human recording of this text is available yet.'}</p>` : ''}`)}
      ${step(4, 'Practise', `<div id="wprac"></div>`)}
      ${step(5, 'Produce — your own sentence', `<p class="meta" style="margin:0 0 8px">Your sentence is your own — not a quotation from literature.</p><p style="font-family:var(--lit);font-size:20px;margin:0 0 10px">${esc(w.produce)}</p><textarea id="wprod" aria-label="Your sentence" placeholder="Write here…">${esc(store.get('prod.' + w.id, ''))}</textarea><div style="display:flex;gap:10px;align-items:center;margin-top:10px"><button class="btn sm" data-lw-onclick="checkProd()">Check & save</button><span class="fb" id="wpf"></span></div>`)}
      ${step(6, 'Re-encounter — the word in other works', re.hits.length ? `<p class="hint">“${esc(w.search)}” appears in <b>${re.works}</b> other works in this collection. Real lines only:</p><div class="hits">${re.hits.map(h => hitHTML(h, re.re)).join('')}</div><button class="btn sm ghost" data-lw-onclick="go('find','${esc(w.search).replace(/'/g, "\\'")}')">See every line →</button>` : `<p class="hint">This word does not appear anywhere else in the collection — a rare find.</p>`)}
    </div>
    <div class="wnav"><button class="btn sm ghost" data-lw-onclick="go('word','${prev.id}')">← ${esc(prev.word)}</button><span class="meta">${esc(src[0])} · ${i + 1} of ${L.length}</span><button class="btn sm ghost" data-lw-onclick="go('word','${next.id}')">${esc(next.word)} →</button></div>
    <div style="height:70px"></div></div></div>`;
}

/* ---------- practice built from the real lines ---------- */
const optsFrom = (right, pool, n) => shuffle([right].concat(shuffle([...new Set(pool.filter(x => x && x !== right))]).slice(0, n)));
function wordTasks(w, mixed) {
  const a = anchorOf(w); const T = [];
  const sameSrc = WORDS.filter(x => x.id !== w.id && wsrc(x) === wsrc(w)), other = WORDS.filter(x => x.id !== w.id);
  const line = a ? `<div class="line-card" style="font-family:var(--lit)">${markWord(a.line, hlOf(w))}</div><span class="meta">${esc(a.title)}</span>` : '';
  T.push({ k: 'meaning', p: `What does <b>${esc(w.word)}</b> mean in this line?${line}`, opts: optsFrom(w.meaning.en, sameSrc.filter(x => x.type === w.type).concat(sameSrc).map(x => x.meaning.en), 3), ans: w.meaning.en });
  if (w.now) T.push({ k: 'then', p: `Careful — this word has changed. In this line, <b>${esc(w.word)}</b> means:${line}`, opts: shuffle([w.meaning.en, w.now].concat(shuffle(WORDS.filter(x => x.now && x.id !== w.id).map(x => x.meaning.en)).slice(0, 2))), ans: w.meaning.en, ex: `Today it usually means: ${w.now}.` });
  if (a) { const pl = plain(a.line); const gapOf = x => { const t = plain(hlOf(x)); return t.split(' ').length <= 5 ? t : null; }; const nd = gapOf(w), j = nd ? pl.toLowerCase().indexOf(nd.toLowerCase()) : -1;
    if (j >= 0) { const ans = pl.slice(j, j + nd.length); T.push({ k: 'gap', p: `Complete the author’s line:<div class="line-card" style="font-family:var(--lit)">${esc(pl.slice(0, j))}<span class="blank">______</span>${esc(pl.slice(j + nd.length))}</div><span class="meta">${esc(a.title)}</span>`, opts: optsFrom(ans, (p => p.length >= 3 ? p : p.concat(other.map(gapOf).filter(Boolean)))(sameSrc.map(gapOf).filter(x => x && x.split(' ').length === nd.split(' ').length)), 3), ans }); }
    const titles = [...new Set(other.map(x => { const b = anchorOf(x); return b && b.title; }).filter(Boolean))];
    if (titles.length > 3) T.push({ k: 'source', p: `Which work is this line from?<div class="line-card" style="font-family:var(--lit)">${esc(plain(a.line))}</div>`, opts: optsFrom(a.title, titles.filter(x => x !== a.title), 3), ans: a.title, ex: `${a.title} — ${a.by}.` }); }
  if (w.fig) T.push({ k: 'fig', p: `In this text, is <b>${esc(w.word)}</b> used literally or figuratively?`, opts: ['literally', 'figuratively'], ans: 'figuratively', ex: w.fig });
  if (w.type === 'archaic') T.push({ k: 'modern', p: `Modern English for <b>${esc(w.word)}</b>:`, opts: optsFrom(w.meaning.en, WORDS.filter(x => x.type === 'archaic' && x.id !== w.id).map(x => x.meaning.en), 3), ans: w.meaning.en });
  if (!mixed && ['slang', 'dialect', 'archaic', 'literary'].includes(w.type)) T.push({ k: 'register', p: `Which register is <b>${esc(w.word)}</b>?`, opts: ['literary', 'archaic', 'slang', 'dialect'], ans: w.type, ex: WTYPE[w.type][1] });
  return T;
}
function wordPractice(w) { const box = $('#wprac'); if (!box) return; mcRun(box, wordTasks(w), 0, () => wordPractice(WBY[S.id])); }
function wordsLab() {
  const box = $('#wlab'); if (!box) return; const f = S.f;
  let L = WORDS.filter(w => (!LEVEL || w.level === LEVEL) && (!f.ws || wsrc(w) === f.ws) && (!f.wt || w.type === f.wt));
  if (L.length < 4) L = WORDS.filter(w => !f.ws || wsrc(w) === f.ws);
  const picked = shuffle(L).slice(0, 8);
  const tasks = picked.map((w, i) => { const T = wordTasks(w, true); const pref = T.filter(x => x.k === 'then' || x.k === 'source' || x.k === 'fig'); const q = i % 2 && pref.length ? shuffle(pref)[0] : shuffle(T)[0]; return q && Object.assign({}, q, { link: `<button class="lnk" data-lw-onclick="go('word','${w.id}')">Open “${esc(w.word)}” →</button>` }); }).filter(Boolean);
  mcRun(box, tasks, 0, wordsLab);
}
function mcRun(box, tasks, i, again) {
  const q = tasks[i]; again = again || (() => wordPractice(WBY[S.id])); box.dataset.lock = '';
  if (!q) { box.innerHTML = `<p class="fb">Done — ${tasks.length} tasks. <button class="btn sm ghost">Again</button></p>`; $('.fb button', box).onclick = again; return; }
  box.innerHTML = `<p class="hint">Task ${i + 1} of ${tasks.length}</p><div class="qp">${q.p}</div><div class="opts">${q.opts.map(o => `<button data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="fb"></div>`;
  $$('.opts button', box).forEach(b => b.onclick = () => { if (box.dataset.lock === '1') return; box.dataset.lock = '1'; const ok = b.dataset.o === q.ans; lwAnswer(lwKind(box), ok); b.classList.add(ok ? 'ok' : 'no'); if (!ok) $$('.opts button', box).find(x => x.dataset.o === q.ans)?.classList.add('ok'); $('.fb', box).innerHTML = (ok ? 'Yes.' : 'Not quite.') + (q.ex ? ' ' + esc(q.ex) : '') + (q.link ? ' ' + q.link : '') + ` <button class="btn sm ghost nx">Next →</button>`; $('.fb .nx', box).onclick = () => { box.dataset.lock = ''; mcRun(box, tasks, i + 1, again); }; });
}

route();


/* ===================== конец скрипта прототипа ===================== */

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

