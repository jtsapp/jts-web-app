'use client'

// Word Hunt — кроссворд и поиск слов над словарём курса A0–B2 и 16 станций
// лексики по специальности: карта миров (уровни) → секторы (юниты) → планеты
// (урок, до 12 слов), три шага-«луны» кроссворда по CEFR-политике подсказок,
// три сложности поиска и «на время», награды, серия дней, «кометы» (слова, где
// понадобилась подсказка), маскоты Dexter / Luna / Aizere / Spark.
//
// Оболочка (LX) и обе игры (LX.xw, LX.ws) перенесены из прототипа методиста
// почти дословно, как «Числа» и Prepositions World; ядра — дословно в cores.js
// (их сверяет оракул). Экран WordHuntPage монтирует движок в Shadow DOM:
// классы прототипа (.hero, .top, .btn…) совпадают с глобальными классами сайта.
//
// От прототипа отличается связь с приложением:
// - данные — cfg.bundle с бэкенда (/mobile/word-hunt): словарь, станции, аудит
//   подсказок как в файле, записи и картинки — ссылками MinIO;
// - корень — элемент в тени, а не документ: поиск элементов, окна, тосты,
//   конфетти и летящие буквы живут в нём; слушатели — на корне (клики, ввод,
//   указатель), на документе — только клавиатура (буквы кроссворда без фокуса,
//   Escape окна урока) и уход со страницы; цель клавиши — composedPath()[0],
//   а не ретаргетнутый хост тени;
// - язык — интерфейса приложения (kk → KZ, иначе RU), свой переключатель RU/KZ
//   и логотип шапки сняты; смена языка в приложении — api.setLang без
//   пересоздания (setLang прототипа перерисовывает текущий вид сам);
// - прогресс — cfg.progress (общее хранилище «Практики», progress.js), wip —
//   cfg.wip (устройство); запись прогресса сразу, а не через 300 мс, и перед
//   каждой правкой P перечитывается (reloadP) — см. блок «progress» ниже;
// - звук — cfg.say: запись A0 через общий <audio> приложения (iOS), без записи —
//   Soniox (/api/tts), голос устройства — только запасной (voice.js); колокольчик
//   верного ответа — Web Audio, как в прототипе, контекст закрывается в destroy;
// - каждое слово доигранной партии отдаётся в cfg.onWord (навык «Словарь»);
// - слушатели — через AbortController, таймеры и кадры — локальными обёртками
//   setTimeout/setInterval/requestAnimationFrame: destroy() снимает всё, и
//   отложенный колбэк после ухода с экрана не трогает снятую разметку;
// - у кнопки звезды в шапке подпись на казахском тоже (в прототипе — только «Собрано слов»);
// - в полях ввода вне тени (чат Луны) буквы кроссворд не перехватывает: к
//   INPUT/TEXTAREA прототипа добавлен contenteditable, у поиска слов — и TEXTAREA.
// - итог партии записывается отдельно от показа (LX.record): игру, покинутую в
//   паузе между последним словом и экраном итога (уход с экрана, выход из
//   аккаунта, «назад»), stop() записывает без отрисовки;
// - поля заливки, которые прототип вставлял в разметку как есть (id уровня,
//   полоса CEFR урока, ссылки картинок), экранируются: Shadow DOM скрипты не
//   изолирует, а прототип теперь приходит из админки;
// - в небе — последние собранные слова по времени сбора: порядок ключей
//   сервер (jsonb) не хранит.
// Починки прототипа (помечены «починка порта» на месте):
// - после решённого слова курсор вставал на ВТОРУЮ клетку следующего слова —
//   первая буква следующего ответа пропускалась (проверено на самом прототипе);
// - «последний урок» из прогресса, оставшийся от станции, которой в новой
//   заливке нет, ронял главную (planetByPid искал несуществующую область);
// - уход из решённого кроссворда в паузе до итога терял итог, а отложенный
//   finish падал на G = null.
// Правило переноса: правка поведения — здесь и в прототипе одновременно, иначе
// следующая заливка прототипа предупредит «другой движок» уже ложно.

import { createCores } from './cores.js'

const BACK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'

// Разметка <body> прототипа: шапка без логотипа и RU/KZ, пять видов. Небо — в
// обёртке .sky-clip (стили приложения): fixed-слой обрезан по разделу.
const MARKUP =
  '<div class="sky-clip"><div class="sky" id="sky" aria-hidden="true"></div></div>' +
  '<div class="app"><header class="top">' +
  '<button class="iconbtn" id="backBtn" aria-label="Back" style="display:none">' + BACK_SVG + '</button>' +
  '<button class="brand" id="brandBtn" aria-label="Word Hunt"><span class="desc">Word <b>Hunt</b></span></button>' +
  '<span class="sp"></span><span class="pill star" id="topStars"></span></header>' +
  '<main class="wrap"><section class="view" id="v-lobby"></section><section class="view" id="v-galaxy"></section>' +
  '<section class="view" id="v-xw"></section><section class="view" id="v-ws"></section><section class="view" id="v-result"></section></main></div>'

/**
 * @param {HTMLElement} root  корень раздела (в Shadow DOM экрана)
 * @param {object} cfg
 * @param {object} cfg.bundle  ответ /mobile/word-hunt: { db, fields, clueq, aud, pics, release }
 * @param {'ru'|'kk'} [cfg.lang]  язык интерфейса раздела
 * @param {{read: () => object, write: (state: object) => void}} cfg.progress  прогресс без wip
 * @param {{read: () => object, write: (wip: object) => void}} cfg.wip  недорешённые сетки (устройство)
 * @param {(o: {text: string, url: string, rate: number, done: () => void}) => void} [cfg.say]
 * @param {() => void} [cfg.stopAudio]
 * @param {(ok: boolean) => void} [cfg.onWord]  слово доигранной партии: собрано без подсказки или нет
 */
export function mountWordHunt(root, cfg) {
  const { bundle, lang: INIT_LANG = 'ru', progress, wip: wipStore, say: sayCfg = () => {}, stopAudio = () => {}, onWord = () => {} } = cfg
  const DOC = root.getRootNode()
  const KDOC = root.ownerDocument
  const ac = new AbortController()
  function on(target, type, fn, opts) {
    const o = typeof opts === 'object' && opts ? opts : { capture: !!opts }
    target.addEventListener(type, fn, { ...o, signal: ac.signal })
  }
  // Настоящая цель события с документа: из тени она приходит хостом.
  function tgt(ev) {
    const path = ev.composedPath ? ev.composedPath() : null
    return (path && path[0]) || ev.target
  }
  function mk(tag) {
    return KDOC.createElement(tag)
  }
  let dead = false
  // Таймеры и кадры прототипа — через эти обёртки (имена те же, что у окна): destroy() снимает все разом.
  const timeouts = new Set()
  const intervals = new Set()
  const frames = new Set()
  function setTimeout(fn, ms) {
    const id = window.setTimeout(() => {
      timeouts.delete(id)
      if (!dead) fn()
    }, ms)
    timeouts.add(id)
    return id
  }
  function clearTimeout(id) {
    if (id == null) return
    timeouts.delete(id)
    window.clearTimeout(id)
  }
  function setInterval(fn, ms) {
    const id = window.setInterval(() => {
      if (!dead) fn()
    }, ms)
    intervals.add(id)
    return id
  }
  function clearInterval(id) {
    if (id == null) return
    intervals.delete(id)
    window.clearInterval(id)
  }
  function requestAnimationFrame(fn) {
    const id = window.requestAnimationFrame((ts) => {
      frames.delete(id)
      if (!dead) fn(ts)
    })
    frames.add(id)
    return id
  }

  const { XWCore, WSCore, LXClue } = createCores({ clueq: bundle.clueq, pics: bundle.pics })
  var DB = bundle.db
  var FIELDS = bundle.fields || []
  var AUD = bundle.aud || {}

  root.innerHTML = MARKUP

  /* =====================================================================
     WORD HUNT · app shell (formerly "Lexiverse"; internal names kept)
     data → collections · progress & achievements · world zones & guides ·
     lobby · level map · lesson sheet · results. The two games live in lexi-xw.js and
     lexi-ws.js and talk to this file only through LX.
     ===================================================================== */
  var LX = (function () {
    'use strict';
    var C = XWCore;
    var LANG = 'ru';
    function $(id) { return DOC.getElementById(id); }
    function esc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ------------------------------------------------------------- text --- */
    var TX = {
      tag:      { ru: 'Ищи слова своего курса среди звёзд — в кроссворде и поиске слов.', kk: 'Курс сөздерін жұлдыздар арасынан ізде — сөзжұмбақ пен сөз іздеуде.' },
      eyebrow:  { ru: 'Космос слов · just to study', kk: 'Сөздер ғарышы · just to study' },
      cont:     { ru: 'Продолжить', kk: 'Жалғастыру' },
      startJ:   { ru: 'Начать путешествие', kk: 'Саяхатты бастау' },
      lesson:   { ru: 'урок', kk: 'сабақ' },
      hi:       { ru: 'Привет! Я {m}. Начнём с урока {n}', kk: 'Сәлем! Мен {m}. {n}-сабақтан бастайық' },
      goal:     { ru: 'Следующая цель — урок {n}', kk: 'Келесі мақсат — {n}-сабақ' },
      allDone:  { ru: 'Все уроки открыты! Собери все звёзды шагов', kk: 'Барлық сабақ ашылды! Қадамдардың жұлдыздарын жина' },
      lgDone:   { ru: 'пройден', kk: 'өтілді' },
      lgNext:   { ru: 'следующая цель', kk: 'келесі мақсат' },
      lgNew:    { ru: 'ещё не исследован', kk: 'әлі зерттелмеген' },
      toNext:   { ru: 'К уроку', kk: 'Сабаққа' },
      lgStarted:{ ru: 'начат', kk: 'басталды' },
      aListen:  { ru: 'Послушать', kk: 'Тыңдау' }, aClose: { ru: 'Закрыть', kk: 'Жабу' }, aBack: { ru: 'Назад', kk: 'Артқа' },
      aPrev:    { ru: 'Предыдущее слово', kk: 'Алдыңғы сөз' }, aNext: { ru: 'Следующее слово', kk: 'Келесі сөз' }, aLang: { ru: 'Язык', kk: 'Тіл' },
      lvlW:     { ru: 'Уровень', kk: 'Деңгей' },
      stars:    { ru: 'слов собрано', kk: 'сөз жиналды' },
      planets:  { ru: 'уроков пройдено', kk: 'сабақ өтілді' },
      streak:   { ru: 'дней подряд', kk: 'күн қатарынан' },
      xwN:      { ru: 'Кроссворд', kk: 'Сөзжұмбақ' },
      xwD:      { ru: 'Разгадай подсказки и впиши слова в сетку', kk: 'Кілттерді шешіп, сөздерді торға жаз' },
      wsN:      { ru: 'Поиск слов', kk: 'Сөз іздеу' },
      wsD:      { ru: 'Узнай слово по подсказке и найди его среди букв', kk: 'Сөзді кілт бойынша таны да, әріптер арасынан тап' },
      galH:     { ru: 'Миры', kk: 'Әлемдер' },
      galD:     { ru: 'Каждый мир — уровень твоего курса', kk: 'Әр әлем — курсыңның деңгейі' },
      nebH:     { ru: 'Станции', kk: 'Станциялар' },
      nebD:     { ru: 'Лексика по специальности', kk: 'Мамандық лексикасы' },
      cat_tech: { ru: 'Технологии', kk: 'Технологиялар' },
      cat_biz:  { ru: 'Бизнес', kk: 'Бизнес' },
      cat_health:{ ru: 'Медицина', kk: 'Медицина' },
      cat_science:{ ru: 'Наука и инженерия', kk: 'Ғылым және инженерия' },
      achH:     { ru: 'Награды', kk: 'Марапаттар' },
      cometH:   { ru: 'Слова на повторение', kk: 'Қайталайтын сөздер' },
      cometD:   { ru: 'В них понадобилась подсказка. Реши их сам — и они попадут в собранные.', kk: 'Оларда кілт керек болды. Өзің шеш — жиналғандарға қосылады.' },
      words:    { ru: 'слов', kk: 'сөз' },
      worlds:   { ru: 'секторов', kk: 'сектор' },
      planetsN: { ru: 'уроков', kk: 'сабақ' },
      world:    { ru: 'Сектор', kk: 'Сектор' },
      tiersH:   { ru: 'Три шага, от простого к сложному', kk: 'Үш қадам, оңайдан қиынға' },
      lvlH:     { ru: 'Сложность поля', kk: 'Өріс қиындығы' },
      play:     { ru: 'Играть', kk: 'Ойнау' },
      locked:   { ru: 'Откроется после предыдущего шага', kk: 'Алдыңғы қадамнан кейін ашылады' },
      done:     { ru: 'пройдено', kk: 'өтілді' },
      easy:     { ru: 'Лёгкий', kk: 'Жеңіл' },
      medium:   { ru: 'Средний', kk: 'Орташа' },
      hard:     { ru: 'Сложный', kk: 'Күрделі' },
      easyD:    { ru: 'слова идут → и ↓', kk: 'сөздер → және ↓' },
      mediumD:  { ru: 'добавляются диагонали', kk: 'диагональдар қосылады' },
      hardD:    { ru: 'во все стороны и задом наперёд', kk: 'барлық бағытта, керісінше де' },
      timed:    { ru: 'На время', kk: 'Уақытқа' },
      clueLvl:  { ru: 'подсказки уровня', kk: 'кілт деңгейі' },
      best:     { ru: 'рекорд', kk: 'рекорд' },
      hidden:   { ru: 'спрятано', kk: 'жасырылған' },
      inGrid:   { ru: 'в сетке', kk: 'торда' },
      outGrid:  { ru: 'вне сетки', kk: 'тордан тыс' },
      huntOnly: { ru: 'Слова этого урока длиннее 14 букв — их собирают только в кроссворде.', kk: 'Бұл сабақ сөздері 14 әріптен ұзын — оларды тек сөзжұмбақта жинайды.' },
      resXw:    { ru: 'Кроссворд решён', kk: 'Сөзжұмбақ шешілді' },
      resWs:    { ru: 'Все слова найдены', kk: 'Барлық сөз табылды' },
      resTime:  { ru: 'Время вышло', kk: 'Уақыт бітті' },
      newStars: { ru: 'новых слов', kk: 'жаңа сөз' },
      comets:   { ru: 'на повторение', kk: 'қайталауға' },
      time:     { ru: 'время', kk: 'уақыт' },
      record:   { ru: 'новый рекорд', kk: 'жаңа рекорд' },
      starsL:   { ru: 'Собраны', kk: 'Жиналды' },
      cometsL:  { ru: 'На повторение', kk: 'Қайталауға' },
      next:     { ru: 'Дальше', kk: 'Әрі қарай' },
      again:    { ru: 'Ещё раз', kk: 'Тағы бір рет' },
      toMap:    { ru: 'К карте', kk: 'Картаға' },
      toLobby:  { ru: 'На главную', kk: 'Басты бетке' },
      unlocked: { ru: 'Открыто: ', kk: 'Ашылды: ' },
      achNew:   { ru: 'Новая награда', kk: 'Жаңа марапат' },
      cometPlay:{ ru: 'Кроссворд', kk: 'Сөзжұмбақ' },
      cometHunt:{ ru: 'Поиск слов', kk: 'Сөз іздеу' },
      cometT:   { ru: 'Слова на повторение', kk: 'Қайталайтын сөздер' },
      tier:     { ru: 'Шаг', kk: 'Қадам' },
      legXw:    { ru: 'шаги кроссворда', kk: 'сөзжұмбақ қадамдары' },
      legWs:    { ru: 'поиск слов: 3 уровня', kk: 'сөз іздеу: 3 деңгей' },
      lessonsWord:{ ru: 'уроков', kk: 'сабақ' },
      pick:     { ru: 'Выбрать уровень', kk: 'Деңгейді таңдау' },
      starsT:   { ru: 'Собрано слов', kk: 'Жиналған сөздер' }
    };
    function t(k) { return (TX[k] && (TX[k][LANG] || TX[k].ru)) || k; }
    var PL = { words: ['слово', 'слова', 'слов'], planetsN: ['урок', 'урока', 'уроков'], worlds: ['сектор', 'сектора', 'секторов'],
               stars: ['слово собрано', 'слова собрано', 'слов собрано'], planets: ['урок пройден', 'урока пройдено', 'уроков пройдено'],
               streak: ['день подряд', 'дня подряд', 'дней подряд'], newStars: ['новое слово', 'новых слова', 'новых слов'],
               comets: ['на повторение', 'на повторение', 'на повторение'] };
    function pf(n, k) {
      if (LANG !== 'ru' || !PL[k]) return t(k);
      var a = n % 10, b = n % 100, f = PL[k];
      return a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? f[1] : f[2];
    }
    function pl(n, k) { return n + ' ' + pf(n, k); }

    /* What each moon asks for. The kinds per band come from LXClue (the CEFR
       clue policy); here they only get their names. */
    var KIND = {
      tr:  { ru: 'Перевод', kk: 'Аударма', d: { ru: 'перевод — и картинка, где она есть', kk: 'аударма — суреті барда сурет' } },
      defL:{ ru: 'Описание', kk: 'Сипаттама', d: { ru: 'простое описание на английском', kk: 'ағылшынша қарапайым сипаттама' } },
      def: { ru: 'Определение', kk: 'Анықтама', d: { ru: 'определение на английском', kk: 'ағылшынша анықтама' } },
      defB2:{ ru: 'Значение', kk: 'Мағынасы', d: { ru: 'значение на английском', kk: 'ағылшынша мағынасы' } },
      ctx: { ru: 'Предложение', kk: 'Сөйлем', d: { ru: 'слово пропущено в предложении', kk: 'сөйлемде сөз түсіп қалған' } },
      col: { ru: 'Сочетания', kk: 'Тіркестер', d: { ru: 'в каких выражениях живёт слово', kk: 'сөз қай тіркестерде кездеседі' } },
      sup: { ru: ' + перевод', kk: ' + аударма' }
    };
    function kindName(k, band) {
      if (k === 'def') return band === 'B2' ? KIND.defB2 : /^A/.test(band) ? KIND.defL : KIND.def;
      return KIND[k];
    }
    function tiersOf(band) {
      return LXClue.tierKinds(band).map(function (k, i) {
        var n = kindName(k, band), sup = LXClue.tierSup(band, i) === 'show';
        return { m: k, ru: n.ru + (sup ? KIND.sup.ru : ''), kk: n.kk + (sup ? KIND.sup.kk : ''), d: n.d };
      });
    }
    var DIFFS = ['easy', 'medium', 'hard'];

    /* --------------------------------------------------------- galaxies --- */
    /* brand palette (Visual Guideline 2.1): colour = [main, light] */
    /* [colour for text and marks (≥3:1 on white), light tint] — the bright
       brand tones stay for fills; text uses the darker shade of the same hue */
    var BRAND = { violet: ['#874BF8', '#EFE7FE', '#874BF8'], cyan: ['#0079BF', '#E2F5FF', '#0AAFFF'], green: ['#008A2A', '#E1FAEB', '#00D441'],
                  orange: ['#C24A12', '#FFEBE2', '#FF631E'], amber: ['#8F6100', '#FFF4DC', '#FFAD00'] };
    var GAL = { A0: BRAND.violet, A1: BRAND.cyan, A2: BRAND.green, B1: BRAND.orange, B2: BRAND.amber };
    var FIELD_HUE = { tech: BRAND.cyan, biz: BRAND.amber, health: BRAND.green, science: BRAND.violet };
    var UNIT_HUES = [BRAND.violet, BRAND.cyan, BRAND.green, BRAND.orange, BRAND.amber];
    var PLANET_HUES = UNIT_HUES;
    function galOf(lv) {
      var f = FIELDS.filter(function (x) { return x.id === lv; })[0];
      if (f) return { id: lv, field: f, nm: f[LANG] || f.en, sub: t('cat_' + f.cat), h: FIELD_HUE[f.cat] || BRAND.violet, ic: f.ic };
      var m = DB.levels.filter(function (x) { return x.id === lv; })[0];
      return { id: lv, nm: (m ? m.name : lv) + (lv === 'A0' ? ' · pre-A1' : ''), sub: lv, h: GAL[lv] || BRAND.violet, code: lv };
    }

    /* ------------------------------------------------------ collections --- */
    /* galaxy (level or field) → worlds (the source's units: its own themes)
       → planets (a lesson's words, at most 12 per planet) */
    var PCACHE = {};
    function planetsOf(lv) {
      if (PCACHE[lv]) return PCACHE[lv];
      var L = DB[lv], worlds = [], flat = [];
      L.units.forEach(function (u, ui) {
        var w = { no: u.no, title: u.title, planets: [] };
        u.lessons.forEach(function (n) {
          var les = L.lessons[String(n)];
          if (!les) return;
          var parts = C.parts(C.lessonItems(DB, lv, n));
          parts.forEach(function (items, ix) {
            var p = { lv: lv, no: n, ix: ix, nParts: parts.length, items: items, world: w, wi: ui,
                      band: lv.indexOf('F:') === 0 ? String(u.title).slice(0, 2) : lv,
                      title: les.title + (parts.length > 1 ? ' · ' + ['I', 'II', 'III', 'IV', 'V', 'VI'][ix] : ''),
                      pid: lv + ':' + n + ':' + ix + ':' + C.hash(items.map(function (x) { return x.key; }).join(',')).toString(36),
                      hue: UNIT_HUES[ui % UNIT_HUES.length], seq: flat.length };
            w.planets.push(p);
            flat.push(p);
          });
        });
        if (w.planets.length) worlds.push(w);
      });
      PCACHE[lv] = { worlds: worlds, flat: flat };
      return PCACHE[lv];
    }
    function planetByPid(pid) {
      var lv = pid.split(':')[0] + (pid.indexOf('F:') === 0 ? ':' + pid.split(':')[1] : '');
      /* починка порта: «последний урок» из прогресса мог остаться от станции, которой в новой заливке нет */
      if (!DB[lv]) return null;
      var g = planetsOf(lv);
      for (var i = 0; i < g.flat.length; i++) if (g.flat[i].pid === pid) return g.flat[i];
      return null;
    }
    /* an item by its key, rebuilt from the source (comets store only keys) */
    var IKEY = null;
    function itemByKey(key) {
      if (!IKEY) IKEY = {};
      if (IKEY[key]) return IKEY[key];
      var lv = key.slice(0, key.lastIndexOf('|'));
      if (!DB[lv]) return null;
      planetsOf(lv).flat.forEach(function (p) { p.items.forEach(function (it) { IKEY[it.key] = it; }); });
      return IKEY[key] || null;
    }

    /* --------------------------------------------------------- progress --- */
    /* Порт: прогресс — общее хранилище «Практики» (cfg.progress: память, черновик и сервер, модуль синка
       wordhunt со сведением merge, ключ прототипа jts_lexiverse_v1). Недорешённые сетки (wip) — только
       устройство (cfg.wip): недописанные буквы на другое устройство не везём. Запись — сразу, а не через
       300 мс: экран перечитывает прогресс по событию хранилища (снимок сервера на новом устройстве), и
       отложенная запись затёрла бы сведённое. Отложена только запись wip — она идёт на каждую букву. */
    function loadP() {
      var x = null;
      try { x = progress.read(); } catch (e) {}
      /* своя копия верхнего уровня: reloadP чистит P на месте и не должен задеть объект хранилища */
      x = x && typeof x === 'object' ? Object.assign({}, x) : {};
      ['stars', 'pl', 'comets', 'ach', 'days', 'gals'].forEach(function (k) { if (!x[k] || typeof x[k] !== 'object') x[k] = {}; });
      ['games', 'cleared', 'pure'].forEach(function (k) { x[k] = +x[k] || 0; });
      var w = null;
      try { w = wipStore.read(); } catch (e) {}
      x.wip = w && typeof w === 'object' ? w : {};
      return x;
    }
    var P = loadP();
    var saveT = null, SAVING = false;
    function flushWip() { clearTimeout(saveT); saveT = null; try { wipStore.write(P.wip); } catch (e) {} }
    function saveWip(now) { clearTimeout(saveT); if (now) flushWip(); else saveT = setTimeout(flushWip, 300); }
    function save(now) {
      var o = {};
      Object.keys(P).forEach(function (k) { if (k !== 'wip') o[k] = P[k]; });
      SAVING = true;
      try { progress.write(o); } catch (e) {} finally { SAVING = false; }
      saveWip(now);
    }
    /* свежий прогресс из хранилища в тот же объект P (на него ссылаются игры); wip — свой, из памяти */
    function reloadP() {
      if (SAVING) return false;
      var fresh = loadP(), wip = P.wip;
      Object.keys(P).forEach(function (k) { delete P[k]; });
      Object.assign(P, fresh, { wip: wip });
      return true;
    }
    /* a pending save is written before the page goes away (tab closed,
       app switched): the last letters typed are never lost */
    on(window, 'pagehide', function () { if (saveT) flushWip(); });
    on(KDOC, 'visibilitychange', function () { if (KDOC.hidden && saveT) flushWip(); });
    function plRec(pid) {
      if (!P.pl[pid]) P.pl[pid] = { x: [0, 0, 0], h: {} };
      return P.pl[pid];
    }
    function dayKey(d) { var x = d || new Date(); return x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate(); }
    function streak() {
      var n = 0, d = new Date();
      if (!P.days[dayKey(d)]) d.setDate(d.getDate() - 1);    /* today not played yet: yesterday still counts */
      while (P.days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
      return n;
    }
    function starsN() { return Object.keys(P.stars).length; }
    function planetsDone() {
      var n = 0;
      Object.keys(P.pl).forEach(function (k) { var r = P.pl[k]; if (r.x.some(Boolean) || Object.keys(r.h).length) n++; });
      return n;
    }
    function cometItems() {
      return Object.keys(P.comets).sort(function (a, b) { return P.comets[b] - P.comets[a]; })
        .map(itemByKey).filter(Boolean);
    }

    /* ----------------------------------------------------- achievements --- */
    var ICON = {
      star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
      moon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
      eye:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
      bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
      comet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="16" cy="8" r="4" fill="currentColor"/><path d="M13 11L3 21M10 8L4 14M16 14l-6 6"/></svg>',
      fire: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-2.4 1.3-4 2.5-5 .2 1.8 1 3 2 3 0-3.5.5-5.5.5-8z"/></svg>',
      globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
      lang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 3-3 7-7 9"/><path d="M13 21l4-9 4 9M14.5 18h5"/></svg>',
      gem:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12l4 6-10 12L2 9z"/></svg>'
    };
    var ACH = [
      { id: 'first',  ic: 'star',  ru: ['Первый свет', 'Пройдите первую игру'], kk: ['Алғашқы жарық', 'Алғашқы ойынды өтіңіз'], ok: function () { return P.games >= 1; } },
      { id: 's50',    ic: 'star',  ru: ['Созвездие', '50 собранных слов'], kk: ['Шоқжұлдыз', '50 жиналған сөз'], ok: function () { return starsN() >= 50; } },
      { id: 's250',   ic: 'star',  ru: ['Млечный Путь', '250 собранных слов'], kk: ['Құс жолы', '250 жиналған сөз'], ok: function () { return starsN() >= 250; } },
      { id: 's1000',  ic: 'gem',   ru: ['Сверхновая', '1000 собранных слов'], kk: ['Аса жаңа жұлдыз', '1000 жиналған сөз'], ok: function () { return starsN() >= 1000; } },
      { id: 'pure',   ic: 'eye',   ru: ['Чистый курс', 'Кроссворд без единой подсказки'], kk: ['Таза бағыт', 'Бір кілтсіз сөзжұмбақ'], ok: function () { return P.pure >= 1; } },
      { id: 'moon',   ic: 'moon',  ru: ['Полнолуние', 'Три шага кроссворда в одном уроке'], kk: ['Толған ай', 'Бір сабақта сөзжұмбақтың үш қадамы'], ok: function () { return Object.keys(P.pl).some(function (k) { return P.pl[k].x.every(Boolean); }); } },
      { id: 'hard',   ic: 'eye',   ru: ['Зоркий глаз', 'Сложный поиск слов'], kk: ['Қырағы көз', 'Күрделі сөз іздеу'], ok: function () { return Object.keys(P.pl).some(function (k) { return P.pl[k].h.hard; }); } },
      { id: 'meteor', ic: 'bolt',  ru: ['Метеор', 'Поиск слов на время — успели'], kk: ['Метеор', 'Уақытқа сөз іздеу — үлгердіңіз'], ok: function () { return Object.keys(P.pl).some(function (k) { var h = P.pl[k].h; return DIFFS.some(function (d) { return h[d] && h[d].best; }); }); } },
      { id: 'clean',  ic: 'lang',  ru: ['Следопыт', 'Поиск слов без подсказок'], kk: ['Ізшіл', 'Кілтсіз сөз іздеу'], ok: function () { return !!P.cleanHunt; } },
      { id: 'comet',  ic: 'comet', ru: ['Укротитель комет', '10 слов с повторения собраны'], kk: ['Комета бағындырушы', 'Қайталаудағы 10 сөз жиналды'], ok: function () { return P.cleared >= 10; } },
      { id: 'str3',   ic: 'fire',  ru: ['На орбите', '3 дня подряд'], kk: ['Орбитада', '3 күн қатарынан'], ok: function () { return streak() >= 3; } },
      { id: 'str7',   ic: 'fire',  ru: ['Неделя в космосе', '7 дней подряд'], kk: ['Ғарыштағы апта', '7 күн қатарынан'], ok: function () { return streak() >= 7; } },
      { id: 'gal3',   ic: 'globe', ru: ['Путешественник', 'Игры в 3 мирах'], kk: ['Саяхатшы', '3 әлемде ойын'], ok: function () { return Object.keys(P.gals).length >= 3; } }
    ];
    function checkAch() {
      var fresh = [];
      ACH.forEach(function (a) { if (!P.ach[a.id] && a.ok()) { P.ach[a.id] = Date.now(); fresh.push(a); } });
      return fresh;
    }
    function toast(a) {
      var d = mk('div');
      d.className = 'toast';
      d.innerHTML = '<span class="bd">' + ICON[a.ic] + '</span><span><small>' + esc(t('achNew')) + '</small><b>' + esc((a[LANG] || a.ru)[0]) + '</b></span>';
      root.appendChild(d);
      setTimeout(function () { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; }, 3200);
      setTimeout(function () { d.remove(); }, 3700);
    }

    /* ------------------------------------------------------------ audio --- */
    /* Порт: запись курса (A0, cfg.say со ссылкой бандла) — тем же элементом, что вся озвучка приложения;
       без записи — Soniox через /api/tts, голос устройства — только запасной (voice.js). */
    function say(it, rate, done) {
      if (!it) return;
      var fin = false, end = function () { if (fin) return; fin = true; if (done) done(); };
      var src = it.src !== 'MY' && AUD[it.id];
      sayCfg({ text: C.core(it.en).replace(/[…_]/g, ' '), url: src || '', rate: rate || 1, done: end });
    }

    /* A short "right!" chime, synthesised (no file): two soft bell notes.
       The audio context starts on the first tap or key press, as browsers require. */
    var ACX = null;
    function actx() {
      if (!ACX) { var K = window.AudioContext || window.webkitAudioContext; if (!K) return null; try { ACX = new K(); } catch (e) { return null; } }
      if (ACX.state === 'suspended') { try { ACX.resume(); } catch (e) {} }
      return ACX;
    }
    ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { on(root, ev, function () { actx(); }, { capture: true, passive: true }); });
    var CHIMED = 0;
    function chime() {
      var c = actx(), now = Date.now();
      if (!c || now - CHIMED < 120) return;          /* one event, one chime */
      CHIMED = now;
      try {
        var t0 = c.currentTime + 0.01, out = c.createGain();
        out.gain.value = 0.2; out.connect(c.destination);
        [[880, 0], [1318.5, 0.085]].forEach(function (n) {
          var g = c.createGain(), st = t0 + n[1];
          g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(1, st + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.42);
          g.connect(out);
          [[n[0], 1], [n[0] * 2, 0.18], [n[0] * 3, 0.06]].forEach(function (h) {
            var o = c.createOscillator(), hg = c.createGain();
            o.type = 'sine'; o.frequency.value = h[0]; hg.gain.value = h[1];
            o.connect(hg); hg.connect(g); o.start(st); o.stop(st + 0.45);
          });
        });
        LX.chimes = (LX.chimes || 0) + 1;
      } catch (e) {}
    }
    /* Crossword: chime, a short pause, then the word(s) just completed, one
       after another — never two voices at once. */
    var SQ = [], SQT = null;
    function rightWords(items) {
      chime();
      clearTimeout(SQT); SQ = items.slice();
      LX.said = LX.said || [];
      function next() {
        var it = SQ.shift(); if (!it) return;
        LX.said.push(it.en);
        say(it, 1, function () { if (SQ.length) SQT = setTimeout(next, 280); });
      }
      SQT = setTimeout(next, 450);
    }

    /* Confetti for a finished game: brand colours, falls once and clears itself.
       One celebration at a time; a gentle, short version for reduced motion. */
    var CONF = 0;
    function confetti() {
      if (CONF) return;
      CONF = 1; LX.confettis = (LX.confettis || 0) + 1;
      var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      var cv = mk('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
      cv.className = 'confetti'; cv.width = W * dpr; cv.height = H * dpr; cv.setAttribute('aria-hidden', 'true');
      root.appendChild(cv);
      var cx = cv.getContext('2d'); cx.scale(dpr, dpr);
      var COL = ['#FFD84D', '#FFAD00', '#0AC7FF', '#7B5CFF', '#B48CFF', '#FF6FB5', '#3DDC97', '#FFFFFF'];
      var N = still ? 36 : Math.round(Math.min(170, Math.max(90, W / 7))), ps = [];
      for (var i = 0; i < N; i++) {
        var side = i % 3, x = side === 0 ? -10 : side === 1 ? W + 10 : Math.random() * W, y = side === 2 ? -20 - Math.random() * H * 0.3 : H * (0.55 + Math.random() * 0.25);
        var vx = side === 0 ? 3 + Math.random() * 6 : side === 1 ? -3 - Math.random() * 6 : (Math.random() - 0.5) * 2;
        var vy = side === 2 ? 1 + Math.random() * 2 : -9 - Math.random() * 7;
        if (still) { x = Math.random() * W; y = -10 - Math.random() * 80; vx = (Math.random() - 0.5); vy = 1 + Math.random(); }
        ps.push({ x: x, y: y, vx: vx * (W < 500 ? 0.75 : 1), vy: vy * (H < 700 ? 0.85 : 1), r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
          w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, c: COL[i % COL.length], star: i % 7 === 0, sw: Math.random() * 6.28 });
      }
      var t0 = performance.now(), LIFE = still ? 1800 : 2800;
      function star(r) { cx.beginPath(); for (var k = 0; k < 10; k++) { var a = k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } cx.closePath(); cx.fill(); }
      function step(now) {
        var el = now - t0, fade = el > LIFE - 700 ? Math.max(0, (LIFE - el) / 700) : 1;
        cx.clearRect(0, 0, W, H);
        ps.forEach(function (p) {
          p.vy += still ? 0.02 : 0.28; p.vx *= 0.99; p.vy = Math.min(p.vy, still ? 2.2 : 6); p.sw += 0.12;
          p.x += p.vx + Math.sin(p.sw) * 0.6; p.y += p.vy; p.r += p.vr;
          cx.save(); cx.globalAlpha = fade; cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
          if (p.star) star(p.w * 0.8); else cx.fillRect(-p.w / 2, -p.h / 2 * Math.abs(Math.cos(p.sw)), p.w, p.h * Math.abs(Math.cos(p.sw)) + 1);
          cx.restore();
        });
        if (el < LIFE) requestAnimationFrame(step); else { cv.remove(); CONF = 0; }
      }
      requestAnimationFrame(step);
    }
    var SPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    function sndBtn(it) { return '<button class="snd" type="button" data-say="' + esc(it.key) + '" aria-label="' + esc(t('aListen')) + '">' + SPK + '</button>'; }
    var SAYMAP = {};
    function regSay(list) { list.forEach(function (it) { SAYMAP[it.key] = it; }); }
    on(root, 'click', function (e) {
      var b = e.target.closest && e.target.closest('[data-say]');
      if (!b) return;
      e.stopPropagation();
      say(SAYMAP[b.getAttribute('data-say')] || itemByKey(b.getAttribute('data-say')));
    }, true);
    function trOf(it) { return it[LANG] || it.ru || it.kk || it.clue.def || ''; }

    /* -------------------------------------------------------------- sky --- */
    /* The air of Word Hunt: a fixed layer behind every screen. In a game it
       shows the zone's own sky; everywhere, words the learner has collected
       drift slowly across it — never a word of the puzzle being played. */
    var STILL = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var SKYW = ['hello', 'star', 'moon', 'friend', 'planet', 'galaxy', 'word', 'journey', 'light', 'dream'];
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
    function setSky(zone, avoid) {
      var el = $('sky');
      if (!el) return;
      el.className = 'sky' + (zone ? ' stage z-' + zone : '');
      el.style.setProperty('--zc', zone ? ZONES[zone].c : '#B48CFF');
      /* never a word of the puzzle in play — compared by spelling, so the same
         word met in another lesson is kept out too */
      var bad = {};
      (avoid || []).forEach(function (it) { bad[C.core(it.en).toLowerCase()] = 1; });
      /* порт: последние собранные — по времени сбора, а не по порядку ключей: сервер (jsonb) их пересортировывает */
      var got = Object.keys(P.stars).sort(function (a, b) { return P.stars[a] - P.stars[b]; }).slice(-80).map(itemByKey).filter(Boolean).map(function (it) { return C.core(it.en); })
        .filter(function (w) { return !bad[w.toLowerCase()]; });
      var n = innerWidth <= 700 ? 5 : 9, list = shuffle(got).slice(0, n);
      if (list.length < n && !(avoid && avoid.length)) list = list.concat(shuffle(SKYW).slice(0, n - list.length));
      var h = '';
      list.forEach(function (w, i) { h += skyWord(w, i, n); });
      /* in a game, letters fly through the sky with glowing trails — behind
         the boards, never over them */
      if (zone) {
        var AB = 'ABCDEFGHIJKLMNOPRSTUVWY', nl = innerWidth <= 700 ? 7 : 16;
        for (var q = 0; q < nl; q++) {
          var up = q % 3 === 2, dur = (up ? 16 : 22) + (q * 7) % 18;
          h += '<span class="fl' + (up ? ' up' : '') + '" style="' + (up ? 'left:' + (4 + (q * 37) % 92) + '%' : 'top:' + (5 + (q * 29) % 90) + '%') +
            ';--t:' + dur + 's;--dl:-' + Math.round(Math.random() * dur) + 's;--z:' + (0.7 + (q % 4) * 0.25).toFixed(2) + '">' + AB.charAt(Math.floor(Math.random() * AB.length)) + '</span>';
        }
      }
      for (var k = 0; k < (innerWidth <= 700 ? 7 : 14); k++) {
        h += '<i class="spk" style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;--d:' + (2 + Math.random() * 4).toFixed(1) + 's;--s:' + (0.5 + Math.random() * .9).toFixed(2) + '"></i>';
      }
      el.innerHTML = h;
    }
    function skyWord(w, i, n) {
      var top = 6 + ((i * 83) % 88), dur = 46 + (i * 17) % 40;
      return '<span class="fw" style="top:' + top + '%;--t:' + dur + 's;--dl:-' + Math.round(Math.random() * dur) + 's;--z:' + (0.75 + (i % 4) * 0.22).toFixed(2) + '">' + esc(w) + '</span>';
    }
    /* a word just found joins the sky */
    function skyAdd(w) {
      var el = $('sky');
      if (!el) return;
      var span = mk('div');
      span.innerHTML = skyWord(w, Math.floor(Math.random() * 9), 9);
      var f = span.firstChild;
      f.style.setProperty('--dl', '0s');
      f.classList.add('new');
      el.appendChild(f);
      var all = el.querySelectorAll('.fw');
      if (all.length > 16) all[0].remove();
    }
    /* a word flies from where it was found to where it is listed, then rises */
    function flyWord(text, from, to, color) {
      if (STILL || !from) return;
      var a = from.getBoundingClientRect(), b = to ? to.getBoundingClientRect() : null;
      var d = mk('div');
      d.className = 'flyword'; d.textContent = text;
      d.style.left = (a.left + a.width / 2) + 'px'; d.style.top = (a.top + a.height / 2) + 'px';
      if (color) d.style.setProperty('--fc', color);
      root.appendChild(d);
      var dx = 0, dy = -140;
      if (b && b.top < innerHeight && b.bottom > 0) { dx = b.left + 60 - (a.left + a.width / 2); dy = b.top + b.height / 2 - (a.top + a.height / 2); }
      var an = d.animate([
        { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 1, offset: .25 },
        { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(.8)', opacity: 0 }
      ], { duration: 1100, easing: 'cubic-bezier(.3,.7,.3,1)' });
      an.onfinish = function () { d.remove(); };
    }
    /* the letters of a solved word rise from their tiles into the sky */
    function riseLetters(nodes, color) {
      if (STILL) return;
      nodes.forEach(function (n, i) {
        if (!n) return;
        var r = n.getBoundingClientRect(), ch = (n.querySelector('.v') || n).textContent.trim().charAt(0);
        if (!ch) return;
        var d = mk('span');
        d.className = 'risel'; d.textContent = ch;
        d.style.left = (r.left + r.width / 2) + 'px'; d.style.top = (r.top + r.height / 2) + 'px';
        d.style.setProperty('--fc', color || '#FFC93D');
        root.appendChild(d);
        var dx = (i - nodes.length / 2) * 10 + (Math.random() * 30 - 15), dy = -(90 + Math.random() * 60);
        var an = d.animate([
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 },
          { transform: 'translate(-50%,-50%) scale(1.35)', opacity: 1, offset: .2 },
          { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(.6) rotate(' + (dx > 0 ? 25 : -25) + 'deg)', opacity: 0 }
        ], { duration: 800 + i * 25, delay: i * 50, easing: 'cubic-bezier(.25,.7,.3,1)', fill: 'backwards' });
        an.onfinish = function () { d.remove(); };
      });
    }
    /* little stars along a line of tiles */
    function sparkleCells(nodes) {
      if (STILL) return;
      nodes.forEach(function (n, i) {
        if (!n) return;
        var r = n.getBoundingClientRect(), s = mk('i');
        s.className = 'twk';
        s.style.left = (r.left + r.width * (0.2 + Math.random() * 0.6)) + 'px';
        s.style.top = (r.top + r.height * (0.1 + Math.random() * 0.5)) + 'px';
        s.style.animationDelay = (i * 55) + 'ms';
        root.appendChild(s);
        setTimeout(function () { s.remove(); }, 1200 + i * 55);
      });
    }
    /* a small burst of light from an element: discoveries feel like events */
    function burst(el, color) {
      if (!el || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
      var r = el.getBoundingClientRect(), cv = mk('canvas');
      cv.className = 'burst'; cv.width = innerWidth; cv.height = innerHeight;
      root.appendChild(cv);
      var cx = cv.getContext('2d'), ps = [], x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
      for (var i = 0; i < 26; i++) {
        var a = Math.random() * 6.283, v = 2 + Math.random() * 4;
        ps.push({ x: x0, y: y0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, l: 1 });
      }
      function step() {
        cx.clearRect(0, 0, cv.width, cv.height);
        var alive = false;
        ps.forEach(function (p) {
          p.x += p.vx; p.y += p.vy; p.vy += .12; p.l -= .025;
          if (p.l <= 0) return;
          alive = true;
          cx.globalAlpha = p.l; cx.fillStyle = color || '#FFAD00';
          cx.beginPath(); cx.arc(p.x, p.y, 2.4, 0, 6.283); cx.fill();
        });
        if (alive) requestAnimationFrame(step); else cv.remove();
      }
      step();
    }

    /* -------------------------------------------------------- navigation --- */
    var NAV = { view: 'lobby', lv: null, pref: 'xw' };
    var BACK = null;
    function go(view, back) {
      var vs = root.querySelectorAll('.view');
      for (var i = 0; i < vs.length; i++) vs[i].classList.toggle('on', vs[i].id === 'v-' + view);
      NAV.view = view;
      BACK = back || null;
      hush();
      if (view !== 'result') { clearTimeout(SQT); SQ = []; }   /* leaving a game: no queued words afterwards */
      if (view === 'lobby' || view === 'galaxy') setSky('', null);
      $('backBtn').style.display = BACK ? '' : 'none';
      root.classList.toggle('inner', !!BACK);
      window.scrollTo(0, 0);
      topStats();
    }
    function topStats() {
      $('topStars').innerHTML = ICON.star + starsN();
    }

    /* ------------------------------------------------------------ world --- */
    /* Word Hunt is one world: each CEFR level is a region of the sky with its
       own marker and its own guide — one of the four JTS tutors. The
       professional vocabulary lives on orbital stations. */
    /* c = glow / fill on the bright sky, d = the same hue dark enough for text;
       mk = flat icon; sp = the 3D markers of the zone, dc = its scenery */
    var ZONES = {
      A0: { ru: 'Звёзды', kk: 'Жұлдыздар', mk: 'star', m: 'dexter', c: '#FFC93D', d: '#8F6100', sp: ['star'], dc: ['cloud', 'comet', 'asteroids', 'star'] },
      A1: { ru: 'Луны', kk: 'Айлар', mk: 'moon', m: 'luna', c: '#4FD2FF', d: '#0068A6', sp: ['crescent', 'fullmoon'], dc: ['fullmoon', 'cloud', 'asteroids', 'comet'] },
      A2: { ru: 'Планеты', kk: 'Ғаламшарлар', mk: 'planet', m: 'aizere', c: '#46E583', d: '#0E7A38', sp: ['ringcyan', 'green', 'orange', 'ringpink'], dc: ['ringpink', 'island', 'green', 'rocket'] },
      B1: { ru: 'Созвездия', kk: 'Шоқжұлдыздар', mk: 'const', m: 'spark', c: '#FF9350', d: '#B23F0B', sp: ['star'], dc: ['portal', 'comet', 'asteroids', 'cloud'] },
      B2: { ru: 'Галактики', kk: 'Галактикалар', mk: 'galaxy', m: 'dexter', c: '#B48CFF', d: '#6A2FE3', sp: ['galaxy'], dc: ['galaxy', 'portal', 'ringcyan', 'comet'] },
      ST: { ru: 'Станции', kk: 'Станциялар', mk: 'station', m: 'spark', c: '#4FD2FF', d: '#0068A6', sp: ['station', 'rocket'], dc: ['rocket', 'station', 'asteroids', 'comet'] }
    };
    var FIELD_C = { tech: '#4FD2FF', biz: '#FFC93D', health: '#46E583', science: '#B48CFF' };
    var FIELD_D = { tech: '#0068A6', biz: '#8F6100', health: '#0E7A38', science: '#6A2FE3' };
    var MASCOT = { dexter: 'Декстер', luna: 'Луна', aizere: 'Айзере', spark: 'Спарк' };
    function zoneKey(lv) { return String(lv).indexOf('F:') === 0 ? 'ST' : ZONES[lv] ? lv : 'A0'; }
    function zoneName(k) { var z = ZONES[k]; return z[LANG] || z.ru; }
    function zoneColor(lv) {
      if (zoneKey(lv) !== 'ST') return ZONES[zoneKey(lv)].c;
      var f = FIELDS.filter(function (x) { return x.id === lv; })[0];
      return (f && FIELD_C[f.cat]) || ZONES.ST.c;
    }
    function zoneDark(lv) {
      if (zoneKey(lv) !== 'ST') return ZONES[zoneKey(lv)].d;
      var f = FIELDS.filter(function (x) { return x.id === lv; })[0];
      return (f && FIELD_D[f.cat]) || ZONES.ST.d;
    }
    function guideOf(lv) { return lv ? ZONES[zoneKey(lv)].m : 'luna'; }
    var MK = {
      star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
      moon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 15.2A8.4 8.4 0 0 1 8.8 4.5a8.4 8.4 0 1 0 10.7 10.7z"/></svg>',
      planet: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="10.4" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.7" transform="rotate(-22 12 12)"/></svg>',
      const: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3.5 17.5L9 8.5l6 5 5.5-8"/><g fill="currentColor" stroke="none"><circle cx="3.5" cy="17.5" r="2.2"/><circle cx="9" cy="8.5" r="2.4"/><circle cx="15" cy="13.5" r="2"/><circle cx="20.5" cy="5.5" r="2.4"/></g></svg>',
      galaxy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/><path d="M14.4 11.2c1.4 3.6-1.7 6.9-5.3 6.1-2.6-.6-4.2-3-4-5.6"/><path d="M9.6 12.8c-1.4-3.6 1.7-6.9 5.3-6.1 2.6.6 4.2 3 4 5.6"/></svg>',
      station: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="9" y="9" width="6" height="6" rx="1.6" fill="currentColor"/><path d="M6.2 12H9M15 12h2.8M12 9V5.4M10.4 4.2h3.2"/><rect x="1.8" y="9.3" width="4.4" height="5.4" rx="1"/><rect x="17.8" y="9.3" width="4.4" height="5.4" rx="1"/></svg>'
    };
    function mkOf(lv) { return MK[ZONES[zoneKey(lv)].mk]; }
    function fill(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }

    /* ----------------------------------------------------------- buddy --- */
    /* the zone's guide stands in the corner of every game: praise when a word
       falls, an offer of help when the learner is stuck — never more */
    function buddy(lv) {
      var m = guideOf(lv);
      return '<span class="buddy m-' + m + '" title="' + esc(MASCOT[m]) + '"><span class="av m-' + m + '" aria-hidden="true"></span><span class="bub" role="status"></span></span>';
    }
    var BT = null, OFFER = null;
    function buddyBig(lv) {
      var m = guideOf(lv);
      return '<div class="buddy big m-' + m + '" title="' + esc(MASCOT[m]) + '"><span class="mz m-' + m + '" aria-hidden="true"></span><span class="bub" role="status"></span></div>';
    }
    /* the guide that is on screen: the big one on wide screens, the HUD one on phones */
    function buddyEl() {
      var all = root.querySelectorAll('.view.on .buddy');
      for (var i = 0; i < all.length; i++) if (all[i].offsetParent) return all[i];
      return all[0] || null;
    }
    function cheer(html, ms, cls, extra) {
      var b = buddyEl();
      if (!b) return;
      var bb = b.querySelector('.bub');
      bb.innerHTML = '<span class="bt">' + html + '</span>' + (extra || '');
      bb.className = 'bub show' + (cls ? ' ' + cls : '');
      b.classList.remove('hop'); void b.offsetWidth; b.classList.add('hop');
      clearTimeout(BT);
      if (cls !== 'ask') OFFER = null;
      if (ms !== 0) BT = setTimeout(function () { bb.className = 'bub'; }, ms || 2200);
    }
    function offer(text, label, fn) {
      OFFER = fn;
      cheer(esc(text), 0, 'ask', '<span class="bub-acts"><button type="button" class="bub-b" data-buddy="yes">' + esc(label) + '</button>' +
        '<button type="button" class="bub-x" data-buddy="no" aria-label="' + esc(t('aClose')) + '">×</button></span>');
    }
    function hush() {
      clearTimeout(BT); OFFER = null;
      var bs = root.querySelectorAll('.buddy .bub');
      for (var i = 0; i < bs.length; i++) bs[i].className = 'bub';
    }
    on(root, 'click', function (e) {
      var b = e.target.closest && e.target.closest('[data-buddy]');
      if (!b) return;
      e.stopPropagation();
      var f = b.getAttribute('data-buddy') === 'yes' ? OFFER : null;
      hush();
      if (f) f();
    }, true);
    var PRAISE = { ru: ['Отлично!', 'Верно!', 'Супер!', 'Так держать!', 'Есть!'], kk: ['Керемет!', 'Дұрыс!', 'Супер!', 'Жарайсың!', 'Бар!'] };
    function praise() { var a = PRAISE[LANG] || PRAISE.ru; return a[Math.floor(Math.random() * a.length)]; }

    /* ------------------------------------------------------------- lobby --- */
    function lobby() {
      if (LX.stopGames) LX.stopGames();
      renderLobby();
      go('lobby', null);
    }
    var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    /* the brand speech bubble (Visual Guideline, cover), as a vector */
    var BUBBLE = '<svg viewBox="299 173 242 232" aria-hidden="true"><path fill="currentColor" d="M 422.7 404.5 L 307.8 404.5 C 302.0 404.5 299.3 397.3 303.6 393.5 L 326.8 373.3 C 330.9 369.8 331.2 363.8 327.8 359.6 C 311.9 339.4 303.6 315.8 303.6 288.7 C 303.6 256.4 315.2 229.1 337.5 206.8 C 360.7 184.4 388.8 173.7 422.7 173.7 C 455.0 173.7 483.1 184.4 505.5 206.8 C 528.7 229.1 540.2 256.4 540.2 288.7 C 540.2 321.0 528.7 348.3 505.5 370.6 C 483.1 393.0 455.0 404.5 422.7 404.5"/></svg>';
    var GI = {
      xw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2.5" y="9" width="6.3" height="6.3" rx="1.6"/><rect x="8.85" y="9" width="6.3" height="6.3" rx="1.6" fill="currentColor"/><rect x="15.2" y="9" width="6.3" height="6.3" rx="1.6"/><rect x="8.85" y="2.6" width="6.3" height="6.3" rx="1.6"/><rect x="8.85" y="15.4" width="6.3" height="6.3" rx="1.6"/></svg>',
      ws: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l5.5 5.5"/><path d="M7.5 10.5h6" stroke-width="2.6"/></svg>'
    };
    var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    /* where "Continue" leads: the last lesson played, else the first lesson */
    function continueTarget() {
      var p = P.last ? planetByPid(P.last) : null;
      if (p) return { p: p, resume: true };
      var g = planetsOf(DB.levels[0].id);
      return { p: g.flat[0], resume: false };
    }
    function lessonLabel(p) {
      var zk = zoneKey(p.lv);
      return (zk === 'ST' ? galOf(p.lv).nm : zoneName(zk) + ' · ' + p.lv) + ' · ' + t('lesson') + ' ' + (p.seq + 1);
    }
    function renderLobby() {
      var ct = continueTarget();
      var h = '<section class="hero"><div class="hero-art" role="img" aria-label="' + esc(MASCOT.dexter + ', ' + MASCOT.luna + ', ' + MASCOT.aizere + ', ' + MASCOT.spark) + '"></div>' +
        '<div class="hero-in"><span class="eyebrow">' + esc(t('eyebrow')) + '</span>' +
        '<h1>Word <b>Hunt</b></h1><p>' + esc(t('tag')) + '</p>' +
        '<div class="hero-acts"><button class="cta big" data-a="continue">' + esc(ct.resume ? t('cont') : t('startJ')) + ARROW + '</button>' +
        '<span class="nextl">' + esc(lessonLabel(ct.p)) + '</span></div></div></section>';
      var cm = cometItems();
      if (cm.length) {
        h += '<div class="comet"><span class="mz m-luna" aria-hidden="true"></span><span class="t"><b>' + esc(t('cometH')) + ' · ' + cm.length +
          '</b><span>' + esc(t('cometD')) + '</span></span><span class="acts">' +
          '<button class="cta sm" data-a="comet" data-m="xw">' + GI.xw + esc(t('cometPlay')) + '</button>' +
          (cm.filter(function (it) { return !WSCore.huntReason(it); }).length >= 2
            ? '<button class="ghost sm" data-a="comet" data-m="ws">' + GI.ws + esc(t('cometHunt')) + '</button>' : '') + '</span></div>';
      }
      h += '<section class="sec" id="galSec"><div class="sec-h"><h2>' + esc(t('galH')) + '</h2><p>' + esc(t('galD')) + '</p></div><div class="levels">';
      DB.levels.forEach(function (l) { if (DB[l.id]) h += galCard(l.id); });
      h += '</div></section><section class="sec"><div class="sec-h"><h2>' + esc(t('nebH')) + '</h2><p>' + esc(t('nebD')) + '</p></div><div class="cats">';
      var fh = '';
      ['tech', 'biz', 'health', 'science'].forEach(function (cat) {
        var fs = FIELDS.filter(function (f) { return f.cat === cat && DB[f.id]; });
        if (!fs.length) return;
        h += '<span class="cat-h" style="--zc:' + FIELD_C[cat] + '"><i></i>' + esc(t('cat_' + cat)) + '</span>';
        fs.forEach(function (f) { fh += galCard(f.id); });
      });
      h += '</div><div class="fields">' + fh + '</div></section>';
      $('v-lobby').innerHTML = h;
    }
    function galStat(lv) {
      var g = planetsOf(lv), lit = 0, words = 0, done = 0;
      g.flat.forEach(function (p) {
        words += p.items.length;
        p.items.forEach(function (it) { if (P.stars[it.key]) lit++; });
        var r = P.pl[p.pid];
        if (r && (r.x.some(Boolean) || Object.keys(r.h).length)) done++;
      });
      return { words: words, lit: lit, done: done, planets: g.flat.length, worlds: g.worlds.length };
    }
    function galCard(lv) {
      var g = galOf(lv), s = galStat(lv), pct = s.words ? Math.round(100 * s.lit / s.words) : 0, zc = zoneColor(lv), zd = zoneDark(lv);
      if (g.field) {
        return '<button class="fld" data-a="gal" data-lv="' + esc(lv) + '" style="--zc:' + zc + ';--zd:' + zd + '"><span class="fi">' + esc(g.ic) + '</span><span><b>' + esc(g.nm) +
          '</b><small>' + s.lit + ' / ' + s.words + ' ' + esc(t('words')) + '</small></span><i class="ring2" style="--p:' + pct + '"></i></button>';
      }
      var zk = zoneKey(lv);
      return '<button class="lvl z-' + zk + '" data-a="gal" data-lv="' + esc(lv) + '" style="--zc:' + zc + ';--zd:' + zd + '"><span class="art" aria-hidden="true"><span class="code">' + esc(lv) + '</span></span>' +
        '<span class="info"><span class="spr s-' + ZONES[zk].sp[0] + '" aria-hidden="true"></span><span class="nm"><b>' + esc(zoneName(zk)) + '</b>' + esc(g.nm) + '</span>' +
        '<span class="pct">' + pct + '%</span></span><span class="bar"><i style="width:' + pct + '%"></i></span><span class="meta">' + s.lit + ' / ' + s.words + ' ' + esc(t('words')) +
        ' · ' + esc(pl(s.planets, 'planetsN')) + '</span></button>';
    }

    /* -------------------------------------------------------- level map --- */
    function galaxy(lv, p) {
      if (LX.stopGames) LX.stopGames();
      NAV.focus = p ? p.pid : null;
      NAV.lv = lv;
      renderGalaxy();
      go('galaxy', lobby);
      requestAnimationFrame(layoutMap);
    }
    function nodeState(p) {
      var r = P.pl[p.pid] || { x: [0, 0, 0], h: {} };
      return { x: r.x, h: DIFFS.filter(function (d) { return r.h[d]; }).length, any: r.x.some(Boolean) || Object.keys(r.h).length > 0 };
    }
    var STAR = '<svg class="s__ON__" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>';
    function starIcon(on) { return STAR.replace('__ON__', on ? ' on' : ''); }
    function nextOfLevel(lv) {
      var next = null;
      planetsOf(lv).flat.some(function (p) { if (!nodeState(p).any) { next = p; return true; } return false; });
      return next;
    }
    /* The level map is a journey: the zone's sky in full at the top, then a
       glowing trail winding down through the zone's scenery. Each lesson is a
       celestial body of that zone; its guide waits at the next one.
       A sticky bar keeps every sector and the next lesson one tap away. */
    function worldState(w) {
      var all = 0, any = 0;
      w.planets.forEach(function (p) { var st = nodeState(p); if (st.any) any++; if (st.x.every(Boolean) && st.h === 3) all++; });
      return { all: all === w.planets.length, any: any, n: w.planets.length };
    }
    function renderGalaxy() {
      var lv = NAV.lv, g = galOf(lv), s = galStat(lv), data = planetsOf(lv), zk = zoneKey(lv), zc = zoneColor(lv), zd = zoneDark(lv), m = guideOf(lv), Z = ZONES[zk];
      var next = nextOfLevel(lv), pct = s.words ? Math.round(100 * s.lit / s.words) : 0;
      var say = !next ? t('allDone') : s.done ? fill(t('goal'), { n: next.seq + 1 }) : fill(t('hi'), { m: MASCOT[m], n: next.seq + 1 });
      var h = '<div class="zhead z-' + zk + '" style="--zc:' + zc + ';--zd:' + zd + '"><div class="zart" aria-hidden="true"></div>' +
        '<div class="zcap"><span class="zmk">' + (g.field ? '<span class="fi">' + esc(g.ic) + '</span>' : '<span class="spr s-' + Z.sp[0] + '"></span>') + '</span><div class="mt">' +
        '<small>' + esc(g.field ? zoneName('ST') + ' · ' + g.sub : zoneName(zk) + ' · ' + lv) + '</small><h1>' + esc(g.nm) + '</h1>' +
        '<p>' + esc(pl(s.worlds, 'worlds')) + ' · ' + esc(pl(s.planets, 'planetsN')) + ' · ' + s.lit + ' / ' + s.words + ' ' + esc(t('words')) + '</p>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div></div></div>' +
        '<div class="guide"><span class="cb">' + esc(say) + '</span><span class="mz m-' + m + '" aria-hidden="true"></span></div></div>';
      /* the bar: sectors at a glance + the way to the next lesson */
      h += '<div class="mapbar" style="--zc:' + zc + ';--zd:' + zd + '"><div class="sectabs" role="navigation" aria-label="' + esc(t('world')) + '">';
      data.worlds.forEach(function (w, wi) {
        var ws = worldState(w), here = next && w.planets.indexOf(next) >= 0;
        h += '<button class="stab' + (ws.all ? ' done' : '') + (here ? ' here' : '') + '" data-a="jump" data-wi="' + wi + '" title="' + esc(w.title) + '">' +
          '<span class="n">' + (ws.all ? CHECK : wi + 1) + '</span><span class="tt">' + esc(w.title) + '</span><span class="cnt">' + ws.any + '/' + ws.n + '</span></button>';
      });
      h += '</div>' + (next ? '<button class="cta sm gonext" data-a="jumpNext">' + esc(t('toNext')) + ' ' + (next.seq + 1) + '</button>' : '') + '</div>' +
        '<div class="legend"><span class="lg"><i class="lg-d"></i>' + esc(t('lgDone')) + '</span><span class="lg"><i class="lg-n"></i>' + esc(t('lgNext')) + '</span>' +
        '<span class="lg"><i class="lg-s"></i>' + esc(t('lgStarted')) + '</span><span class="lg"><i class="lg-u"></i>' + esc(t('lgNew')) + '</span>' +
        '<span class="lg"><span class="marks">' + starIcon(1) + starIcon(0) + starIcon(0) + '</span>' + esc(t('legXw')) + '</span>' +
        '<span class="lg"><span class="marks"><i class="h on"></i><i class="h"></i><i class="h"></i></span>' + esc(t('legWs')) + '</span></div>' +
        '<div class="journey z-' + zk + '" id="journey" style="--zc:' + zc + ';--zd:' + zd + '"><svg class="jpath" aria-hidden="true"></svg>';
      var k = 0;
      data.worlds.forEach(function (w, wi) {
        h += '<div class="sector" id="sec' + wi + '" data-wi="' + wi + '"><span class="n">' + (wi + 1) + '</span><span><small>' + esc(t('world')) + ' ' + (wi + 1) + ' · ' + esc(pl(w.planets.length, 'planetsN')) + '</small><b>' + esc(w.title) + '</b></span></div>';
        for (var d = 0; d < 2; d++) h += '<span class="deco spr s-' + Z.dc[(wi * 2 + d) % Z.dc.length] + '" data-wi="' + wi + '" data-d="' + d + '" aria-hidden="true"></span>';
        w.planets.forEach(function (p) {
          var st = nodeState(p), all = st.x.every(Boolean) && st.h === 3, sp = g.field ? (k % 3 === 2 ? 'rocket' : 'station') : Z.sp[k % Z.sp.length];
          h += '<button class="node' + (p === next ? ' next' : '') + (st.any ? ' any' : ' new') + (all ? ' done' : '') + '" data-a="planet" data-pid="' + esc(p.pid) + '" data-k="' + k + '"' +
            ' aria-label="' + esc(t('lesson') + ' ' + (p.seq + 1) + ': ' + p.title + ' — ' + (all ? t('lgDone') : p === next ? t('lgNext') : st.any ? t('lgStarted') : t('lgNew'))) + '">' +
            '<span class="orb"><span class="spr s-' + sp + '"></span><span class="num">' + (p.seq + 1) + '</span>' + (all ? '<span class="ck">' + CHECK + '</span>' : '') + '</span>' +
            '<span class="lab">' + (p === next ? '<em>' + esc(t('lgNext')) + '</em>' : '') + '<b>' + esc(p.title) + '</b><span class="marks" aria-hidden="true">' + st.x.map(function (x) { return starIcon(x); }).join('') + '<i class="sp"></i>' +
            [0, 1, 2].map(function (q) { return '<i class="h' + (q < st.h ? ' on' : '') + '"></i>'; }).join('') + '</span></span>' +
            (p === next ? '<span class="trav mz m-' + m + '" aria-hidden="true"></span>' : '') + '</button>';
          k++;
        });
      });
      h += '</div>';
      $('v-galaxy').innerHTML = h;
    }
    /* places signs, markers and scenery along a gentle S-curve and draws the
       trail: faint stardust ahead, a glowing line over the explored part */
    function layoutMap() {
      var J = $('journey');
      if (!J) return;
      var W = J.clientWidth, narrow = W < 640, amp = narrow ? Math.min(W * 0.2, 86) : Math.min(W * 0.19, 200);
      var gap = narrow ? 100 : 98, signH = narrow ? 70 : 76, y = 34, cx = W / 2, k = 0, pts = [], lastLit = -1, waves = [];
      var kids = J.children;
      for (var i = 0; i < kids.length; i++) {
        var el = kids[i];
        if (el.classList.contains('sector')) {
          if (k) y += narrow ? 26 : 18;
          el.style.top = y + 'px';
          waves.push({ wi: +el.getAttribute('data-wi'), y0: y });
          y += signH;
        } else if (el.classList.contains('node')) {
          /* the guide stands on the next marker: give it head room */
          if (el.classList.contains('next')) y += narrow ? 66 : 70;
          var x = cx + amp * Math.sin(k * 0.95 + 0.4), ny = y + gap / 2;
          el.style.left = x + 'px'; el.style.top = ny + 'px';
          el.classList.toggle('lr', x < cx);
          pts.push([x, ny]);
          if (el.classList.contains('any')) lastLit = k;
          y += gap; k++;
        }
      }
      J.style.height = (y + 30) + 'px';
      /* scenery: two pieces per sector, in the margins, never on the trail */
      var decos = J.querySelectorAll('.deco');
      for (i = 0; i < decos.length; i++) {
        var dd = decos[i], wi = +dd.getAttribute('data-wi'), side = (+dd.getAttribute('data-d') + wi) % 2;
        var w0 = waves.filter(function (q) { return q.wi === wi; })[0], w1 = waves.filter(function (q) { return q.wi === wi + 1; })[0];
        var top = w0 ? w0.y0 : 0, bot = w1 ? w1.y0 : y, room = (W - 2 * amp - 440) / 2;
        var sz = narrow ? 0 : Math.min(160, Math.max(0, room));
        dd.style.display = sz < 70 ? 'none' : '';
        if (sz < 70) continue;
        dd.style.width = dd.style.height = sz + 'px';
        dd.style.top = (top + (bot - top) * (side ? 0.62 : 0.28) - sz / 2) + 'px';
        dd.style.left = side ? '' : '0px';
        dd.style.right = side ? '0px' : '';
        dd.style.animationDelay = (-(i * 1.7) % 7) + 's';
      }
      function curve(list) {
        if (list.length < 2) return '';
        var d = 'M' + list[0][0].toFixed(1) + ' ' + list[0][1].toFixed(1);
        for (var q = 0; q < list.length - 1; q++) {
          var p0 = list[Math.max(0, q - 1)], p1 = list[q], p2 = list[q + 1], p3 = list[Math.min(list.length - 1, q + 2)];
          d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' +
            (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
        }
        return d;
      }
      var svg = J.querySelector('svg.jpath');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (y + 30));
      svg.innerHTML = '<defs><linearGradient id="jg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE27A"/><stop offset="1" stop-color="#FFC93D"/></linearGradient></defs>' +
        '<path class="j-base" d="' + curve(pts) + '"/><path class="j-dust" d="' + curve(pts) + '"/>' +
        (lastLit > 0 ? '<path class="j-lit" d="' + curve(pts.slice(0, lastLit + 1)) + '" stroke="url(#jg)"/>' : '');
      if (NAV.focus) { var f = NAV.focus; NAV.focus = null; scrollToNode(f, false); }
    }
    /* bring a lesson (or a sector sign) into view below the sticky bars */
    function scrollToEl(el, smooth) {
      if (!el) return;
      var bar = root.querySelector('.mapbar'), off = (parseFloat(getComputedStyle(root).getPropertyValue('--top')) || 60) + (bar ? bar.offsetHeight : 0) + 20;
      var y = el.getBoundingClientRect().top + window.pageYOffset - off;
      window.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
    }
    function scrollToNode(pid, smooth) {
      var n = root.querySelector('#journey .node[data-pid="' + pid + '"]');
      if (!n) return;
      var bar = root.querySelector('.mapbar'), r = n.getBoundingClientRect();
      var top = (bar ? bar.getBoundingClientRect().bottom : 120);
      if (r.top > top + 30 && r.bottom < innerHeight - 30) return;
      window.scrollTo({ top: Math.max(0, r.top + window.pageYOffset - (innerHeight + top) / 2 + 20), behavior: smooth ? 'smooth' : 'auto' });
    }
    var LT = null;
    on(window, 'resize', function () { if (NAV.view === 'galaxy') { clearTimeout(LT); LT = setTimeout(layoutMap, 80); } });

    /* ------------------------------------------------------ lesson sheet --- */
    var SHEET = null;
    function openSheet(p) {
      var r = plRec(p.pid);
      var defTier = 0;
      while (defTier < 2 && r.x[defTier]) defTier++;
      var defDiff = 0;
      while (defDiff < 2 && r.h[DIFFS[defDiff]]) defDiff++;
      SHEET = { p: p, tier: defTier, diff: defDiff, timed: !!P.optTimed };
      renderSheet();
    }
    function renderSheet() {
      var S = SHEET, p = S.p, r = plRec(p.pid), tiers = tiersOf(p.band), huntable = WSCore.pick(p.items, 'hard').length >= 2;
      var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
      var X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      var grid = p.items.filter(function (x) { return x.fit === 'grid'; }).length, m = guideOf(p.lv), zc = zoneColor(p.lv);
      var mode = NAV.pref === 'ws' && huntable ? 'ws' : 'xw';
      var h = '<div class="sheet ' + mode + '" role="dialog" aria-modal="true" aria-label="' + esc(p.title) + '" style="--zc:' + zc + '">' +
        '<span class="sheet-m mz m-' + m + '" aria-hidden="true"></span>' +
        '<div class="sheet-h" style="--zd:' + zoneDark(p.lv) + '"><span class="orb"><span class="spr s-' + (zoneKey(p.lv) === 'ST' ? 'station' : ZONES[zoneKey(p.lv)].sp[p.seq % ZONES[zoneKey(p.lv)].sp.length]) + '"></span><span class="num">' + (p.seq + 1) + '</span></span>' +
        '<div><small>' + esc(lessonLabel(p)) + '</small><h3>' + esc(p.title) + '</h3><p>' + esc(p.world.title) + ' · ' + pl(p.items.length, 'words') + '</p></div>' +
        '<button class="iconbtn" data-a="close" aria-label="' + esc(t('aClose')) + '">' + X + '</button></div>' +
        '<div class="tabs" role="tablist"><button class="tab' + (mode === 'xw' ? ' on' : '') + '" role="tab" aria-selected="' + (mode === 'xw') + '" data-a="tab" data-m="xw">' + GI.xw + esc(t('xwN')) + '</button>' +
        '<button class="tab ws' + (mode === 'ws' ? ' on' : '') + '" role="tab" aria-selected="' + (mode === 'ws') + '" data-a="tab" data-m="ws"' + (huntable ? '' : ' disabled title="' + esc(t('huntOnly')) + '"') + '>' + GI.ws + esc(t('wsN')) + '</button></div>';
      if (mode === 'xw') {
        h += '<div class="game"><p class="gd">' + esc(t('xwD')) + ' · ' + esc(t('clueLvl')) + ' ' + esc(p.band) + '</p><div class="chips">';
        tiers.forEach(function (tr, i) {
          var open = i === 0 || r.x[i - 1], on = S.tier === i;
          h += '<button class="chip' + (on ? ' on' : '') + (r.x[i] ? ' dn' : '') + '" data-a="tier" data-i="' + i + '"' + (open ? '' : ' disabled title="' + esc(t('locked')) + '"') + '>' +
            '<span class="st">' + (open ? '' : LOCK) + esc(t('tier')) + ' ' + (i + 1) + (r.x[i] ? '<span class="ok">' + starIcon(1) + '</span>' : '') + '</span><b>' + esc(tr[LANG] || tr.ru) +
            '</b><span>' + esc(tr.d[LANG] || tr.d.ru) + '</span></button>';
        });
        h += '</div><div class="row"><small>' + esc(pl(p.items.length, 'words')) + (grid < p.items.length ? ' · ' + grid + ' ' + esc(t('inGrid')) + ', ' + (p.items.length - grid) + ' ' + esc(t('outGrid')) : '') +
          (huntable ? '' : '<br>' + esc(t('huntOnly'))) + '</small><button class="cta" data-a="playXw">' + esc(t('play')) + ARROW + '</button></div></div>';
      } else {
        h += '<div class="game hunt"><p class="gd">' + esc(t('wsD')) + '</p><div class="chips">';
        DIFFS.forEach(function (d, i) {
          var open = i === 0 || r.h[DIFFS[i - 1]], on = S.diff === i, rec = r.h[d];
          h += '<button class="chip' + (on ? ' on' : '') + (rec ? ' dn' : '') + '" data-a="diff" data-i="' + i + '"' + (open ? '' : ' disabled title="' + esc(t('locked')) + '"') + '>' +
            '<span class="st">' + (open ? '' : LOCK) + esc(t('lvlW')) + ' ' + (i + 1) + (rec ? '<span class="ok">' + CHECK + '</span>' : '') + '</span><b>' + esc(t(d)) + '</b><span>' + esc(t(d + 'D')) +
            (rec && rec.best ? ' · ' + esc(t('best')) + ' ' + fmtTime(rec.best) : '') + '</span></button>';
        });
        h += '</div><div class="row"><button class="tog' + (S.timed ? ' on' : '') + '" data-a="timed" aria-pressed="' + S.timed + '"><i></i>' + esc(t('timed')) + '</button>' +
          '<small>' + esc(pl(WSCore.pick(p.items, DIFFS[S.diff]).length, 'words')) + ' · ' + esc(t('hidden')) + '</small><button class="cta cy" data-a="playWs">' +
          esc(t('play')) + ARROW + '</button></div></div>';
      }
      h += '</div>';
      var sc = $('scrim');
      if (!sc) {
        sc = mk('div'); sc.id = 'scrim'; sc.className = 'scrim';
        root.appendChild(sc);
        on(sc, 'click', function (e) { if (e.target === sc) closeSheet(); });
      }
      sc.innerHTML = h;
      var b = sc.querySelector('[data-a=' + (mode === 'ws' ? 'playWs' : 'playXw') + ']');
      if (b) try { b.focus({ preventScroll: true }); } catch (e) {}
    }
    function closeSheet() { var s = $('scrim'); if (s) s.remove(); SHEET = null; }
    on(KDOC, 'keydown', function (e) {
      if (!SHEET) return;
      if (e.key === 'Escape') { closeSheet(); return; }
      /* the lesson window is modal: Tab cycles inside it */
      if (e.key === 'Tab') {
        var f = [].filter.call(root.querySelectorAll('#scrim button:not([disabled])'), function (b) { return b.offsetParent; });
        if (!f.length) return;
        var i = f.indexOf(DOC.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
      }
    });
    function fmtTime(ms) {
      var s = Math.round(ms / 1000);
      return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
    }

    /* ---------------------------------------------------- game launching --- */
    function playXw(p, tier, items, comet) {
      closeSheet();
      if (p && !comet) { reloadP(); P.last = p.pid; save(); }
      var tiers = tiersOf(p ? p.band : 'A0');
      /* comets: every word gets the first moon's clue of its own band */
      var src = comet
        ? { comet: true, items: items, mode: 'pol0', chooser: LXClue.xwChooser(0), title: t('cometT'), tierName: '' }
        : { p: p, tier: tier, items: p.items, mode: 'pol' + tier, chooser: LXClue.xwChooser(tier), title: p.title,
            tierName: t('tier') + ' ' + (tier + 1) + ' · ' + (tiers[tier][LANG] || tiers[tier].ru) };
      LX.xw.start(src);
      setSky(p && !comet ? zoneKey(p.lv) : 'A1', src.items);
      go('xw', function () { if (LX.stopGames) LX.stopGames(); if (src.comet) lobby(); else galaxy(src.p.lv, src.p); });
    }
    function playWs(p, diff, opts, items, comet) {
      closeSheet();
      if (p && !comet) { reloadP(); P.last = p.pid; save(); }
      var src = comet
        ? { comet: true, items: items, diff: 'medium', timed: false, title: t('cometT') }
        : { p: p, items: p.items, diff: DIFFS[diff], timed: opts.timed, title: p.title };
      LX.ws.start(src);
      setSky(p && !comet ? zoneKey(p.lv) : 'A1', src.items);
      go('ws', function () { if (LX.stopGames) LX.stopGames(); if (src.comet) lobby(); else galaxy(src.p.lv, src.p); });
    }

    /* ------------------------------------------------- finishing a game --- */
    /* res: { type, src, words:[{it, ok}], time, timedOut, record } */
    /* порт: запись итога (record) отделена от показа (finish) — игра, которую ученик покинул в паузе между
       последним словом и экраном итога, записывается из stop() без отрисовки */
    function record(res) {
      var src = res.src, fresh = 0, comets = 0, unlocked = '';
      reloadP();
      P.games++;
      P.days[dayKey()] = 1;
      res.words.forEach(function (w) {
        var k = w.it.key;
        if (w.ok) {
          if (!P.stars[k]) { P.stars[k] = Date.now(); fresh++; }
          if (P.comets[k]) { delete P.comets[k]; P.cleared++; }
        } else {
          P.comets[k] = Date.now();
          comets++;
        }
      });
      /* порт: каждое слово партии — в навык «Словарь» приложения */
      res.words.forEach(function (w) { onWord(!!w.ok); });
      if (src.p) {
        P.gals[src.p.lv] = 1;
        var r = plRec(src.p.pid);
        if (res.type === 'xw') {
          var was = r.x[src.tier];
          r.x[src.tier] = 1;
          if (!was && src.tier < 2) unlocked = t('xwN') + ' · ' + t('tier') + ' ' + (src.tier + 2) + ' · ' + (tiersOf(src.p.band)[src.tier + 1][LANG]);
          if (res.words.every(function (w) { return w.ok; })) P.pure++;
        } else if (!res.timedOut) {
          var di = DIFFS.indexOf(src.diff), prev = r.h[src.diff];
          r.h[src.diff] = r.h[src.diff] || {};
          if (!prev && di < 2) unlocked = t('wsN') + ' · ' + t(DIFFS[di + 1]);
          if (src.timed && (!r.h[src.diff].best || res.time < r.h[src.diff].best)) { r.h[src.diff].best = res.time; res.record = !!(prev && prev.best); }
          if (res.words.every(function (w) { return w.ok; })) P.cleanHunt = 1;
        }
      }
      var ach = checkAch();
      save(true);
      return { fresh: fresh, comets: comets, unlocked: unlocked };
    }
    function finish(res) {
      var src = res.src, o = record(res);
      renderResult(res, o.fresh, o.comets, o.unlocked);
      if (res.complete) confetti();
      go('result', src.comet ? lobby : function () { galaxy(src.p.lv, src.p); });
    }
    function renderResult(res, fresh, comets, unlocked) {
      var src = res.src, p = src.p, r = p ? plRec(p.pid) : null, m = guideOf(p ? p.lv : null);
      var marks = '';
      if (r && res.type === 'xw') marks = r.x.map(function (x) { return starIcon(x); }).join('');
      else if (r) marks = DIFFS.map(function (d) { return '<i class="h' + (r.h[d] ? ' on' : '') + '"></i>'; }).join('');
      var h = '<div class="res ' + (res.timedOut ? 'to' : res.type) + '"><div class="res-top">' +
        '<span class="mz m-' + m + (res.timedOut ? '' : ' cele') + '" aria-hidden="true"></span>' +
        '<div class="big">' + BUBBLE + '<span class="num" id="gainN">+0</span><span class="lbl">' + esc(pf(fresh, 'newStars')) + '</span></div></div>' +
        '<h1>' + esc(res.timedOut ? t('resTime') : res.type === 'xw' ? t('resXw') : t('resWs')) + '</h1>' +
        '<p class="sub">' + esc(src.title) + (src.tierName ? ' · ' + esc(src.tierName) : src.diff && !src.comet ? ' · ' + esc(t(src.diff)) : '') + '</p>' +
        '<div class="gain">' + (marks ? '<span class="steps">' + marks + '</span>' : '') + (comets ? '<span><b>' + comets + '</b> ' + esc(pf(comets, 'comets')) + '</span>' : '') +
        (res.time ? '<span><b>' + fmtTime(res.time) + '</b> ' + esc(res.record ? t('record') : t('time')) + '</span>' : '') + '</div>';
      if (unlocked) h += '<div class="unlock"><span class="cb l gr">' + esc(t('unlocked') + unlocked) + '</span></div>';
      h += '<div class="acts">';
      var nx = nextOf(res);
      if (nx) h += '<button class="cta' + (res.type === 'ws' && !nx.sheet ? ' cy' : '') + '" data-a="next">' + esc(t('next')) + ARROW + '</button>';
      h += '<button class="ghost" data-a="again">' + esc(t('again')) + '</button>' +
        '<button class="ghost" data-a="' + (src.comet ? 'lobby' : 'map') + '">' + esc(src.comet ? t('toLobby') : t('toMap')) + '</button></div>';
      var ok = res.words.filter(function (w) { return w.ok; }), bad = res.words.filter(function (w) { return !w.ok; });
      regSay(res.words.map(function (w) { return w.it; }));
      function row(w) {
        return '<div class="rw">' + sndBtn(w.it) + '<b>' + esc(w.it.en) + '</b><span>' + esc(trOf(w.it)) + '</span></div>';
      }
      h += '<div class="lists">';
      if (bad.length) h += '<div class="reslist cm"><h4>' + esc(t('cometsL')) + ' · ' + bad.length + '</h4>' + bad.map(row).join('') + '</div>';
      if (ok.length) h += '<div class="reslist"><h4>' + esc(t('starsL')) + ' · ' + ok.length + '</h4>' + ok.map(row).join('') + '</div>';
      h += '</div></div>';
      $('v-result').innerHTML = h;
      LX.lastRes = res;
      /* the counter counts up: the reward is seen, not just read */
      var el = $('gainN'), n = 0, step = Math.max(1, Math.ceil(fresh / 24));
      (function tick() { el.textContent = '+' + n; if (n < fresh) { n = Math.min(fresh, n + step); setTimeout(tick, 40); } else if (fresh) burst(el, res.type === 'ws' ? '#0AC7FF' : '#FFD84D'); })();
    }
    /* what comes next: the next moon or difficulty here, then the next planet */
    function nextOf(res) {
      var src = res.src;
      if (src.comet) return cometItems().length ? { comet: true, type: res.type } : null;
      var p = src.p, r = plRec(p.pid);
      if (res.type === 'xw' && src.tier < 2) return { p: p, type: 'xw', tier: src.tier + 1 };
      if (res.type === 'ws' && !res.timedOut && DIFFS.indexOf(src.diff) < 2) return { p: p, type: 'ws', diff: DIFFS.indexOf(src.diff) + 1 };
      var flat = planetsOf(p.lv).flat, np = flat[p.seq + 1];
      if (!np) return null;
      return { p: np, sheet: true };
    }

    /* ----------------------------------------------------------- clicks --- */
    on(root, 'click', function (e) {
      var b = e.target.closest && e.target.closest('[data-a]');
      if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'portal') {
        NAV.pref = b.getAttribute('data-m');
        var cards = root.querySelectorAll('.gcard');
        for (var gi = 0; gi < cards.length; gi++) cards[gi].classList.toggle('on', cards[gi] === b);
        var gs = $('galSec'); if (gs) gs.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (a === 'gal') { galaxy(b.getAttribute('data-lv')); return; }
      if (a === 'jump') { scrollToEl($('sec' + b.getAttribute('data-wi')), true); return; }
      if (a === 'jumpNext') { var nn = nextOfLevel(NAV.lv); if (nn) scrollToNode(nn.pid, true); return; }
      if (a === 'continue') { var ct = continueTarget(); galaxy(ct.p.lv, ct.p); openSheet(ct.p); return; }
      if (a === 'tab') { if (b.disabled) return; NAV.pref = b.getAttribute('data-m'); renderSheet(); return; }
      if (a === 'planet') { openSheet(planetByPid(b.getAttribute('data-pid'))); return; }
      if (a === 'close') { closeSheet(); return; }
      if (a === 'tier') { SHEET.tier = +b.getAttribute('data-i'); NAV.pref = 'xw'; renderSheet(); return; }
      if (a === 'diff') { SHEET.diff = +b.getAttribute('data-i'); NAV.pref = 'ws'; renderSheet(); return; }
      if (a === 'timed') { SHEET.timed = !SHEET.timed; reloadP(); P.optTimed = SHEET.timed; save(); NAV.pref = 'ws'; renderSheet(); return; }
      if (a === 'playXw') { NAV.pref = 'xw'; playXw(SHEET.p, SHEET.tier); return; }
      if (a === 'playWs') { NAV.pref = 'ws'; playWs(SHEET.p, SHEET.diff, { timed: SHEET.timed }); return; }
      if (a === 'comet') {
        var its = cometItems();
        if (b.getAttribute('data-m') === 'ws') playWs(null, 1, {}, its.filter(function (it) { return !WSCore.huntReason(it); }).slice(0, 10), true);
        else playXw(null, 0, its.slice(0, 12), true);
        return;
      }
      if (a === 'lobby') { lobby(); return; }
      if (a === 'map') { galaxy(LX.lastRes.src.p.lv, LX.lastRes.src.p); return; }
      if (a === 'again') {
        var s = LX.lastRes.src;
        if (s.comet) { if (LX.lastRes.type === 'xw') playXw(null, 0, cometItems().slice(0, 12), true); else playWs(null, 1, {}, cometItems().filter(function (it) { return !WSCore.huntReason(it); }).slice(0, 10), true); }
        else if (LX.lastRes.type === 'xw') playXw(s.p, s.tier);
        else playWs(s.p, DIFFS.indexOf(s.diff), { timed: s.timed });
        return;
      }
      if (a === 'next') {
        var nx = nextOf(LX.lastRes);
        if (!nx) return;
        if (nx.comet) { b.setAttribute('data-a', 'again'); b.click(); return; }
        if (nx.sheet) { galaxy(nx.p.lv, nx.p); openSheet(nx.p); return; }
        if (nx.type === 'xw') playXw(nx.p, nx.tier);
        else playWs(nx.p, nx.diff, { timed: LX.lastRes.src.timed });
      }
    });

    function setLang(l) {
      LANG = l === 'kk' ? 'kk' : 'ru';
      $('backBtn').setAttribute('aria-label', t('aBack'));
      $('topStars').title = t('starsT');
      root.setAttribute('lang', LANG);
      if (NAV.view === 'lobby') renderLobby();
      else if (NAV.view === 'galaxy') { renderGalaxy(); requestAnimationFrame(layoutMap); }
      else if (NAV.view === 'xw' && LX.xw) LX.xw.relang();
      else if (NAV.view === 'ws' && LX.ws) LX.ws.relang();
      if (SHEET) renderSheet();
    }

    function boot() {
      on($('backBtn'), 'click', function () { if (BACK) BACK(); });
      on($('brandBtn'), 'click', lobby);
      LANG = INIT_LANG === 'kk' ? 'kk' : 'ru';
      setLang(LANG);
      lobby();
    }

    return {
      get LANG() { return LANG; }, t: t, pl: pl, pf: pf, esc: esc, $: $, P: P, save: save, saveWip: saveWip, flushWip: flushWip, reloadP: reloadP, say: say, sndBtn: sndBtn, regSay: regSay,
      trOf: trOf, burst: burst, chime: chime, rightWords: rightWords, confetti: confetti, finish: finish, record: record, fmtTime: fmtTime, tiersOf: tiersOf, lobby: lobby, galaxy: galaxy, boot: boot,
      planetsOf: planetsOf, itemByKey: itemByKey, ICON: ICON, ACH: ACH, topStats: topStats, nav: NAV,
      buddy: buddy, buddyBig: buddyBig, cheer: cheer, offer: offer, hush: hush, praise: praise, guideOf: guideOf,
      setSky: setSky, skyAdd: skyAdd, flyWord: flyWord, riseLetters: riseLetters, sparkleCells: sparkleCells, zoneKey: zoneKey,
      setLang: setLang, renderLobby: renderLobby, renderGalaxy: renderGalaxy, layoutMap: layoutMap, renderSheet: renderSheet,
      sheet: function () { return SHEET; }, actx: function () { return ACX; }
    };
  })();

  /* =====================================================================
     WORD HUNT · Crossword
     Grid generation and validation: XWCore (every grid is proved valid
     before it is shown). This file is play only: model, input, hints,
     rendering. A replay builds a different valid layout of the same words.
     ===================================================================== */
  LX.xw = (function () {
    'use strict';
    var C = XWCore, $ = LX.$, esc = LX.esc, t = LX.t;
    var G = null;
    var TX = {
      across: { ru: 'По горизонтали', kk: 'Көлденеңінен' }, down: { ru: 'По вертикали', kk: 'Тігінен' },
      strips: { ru: 'Вне сетки', kk: 'Тордан тыс' },
      hint: { ru: 'Подсказка', kk: 'Кілт' }, listen: { ru: 'Звук', kk: 'Дыбыс' }, letter: { ru: 'Буква', kk: 'Әріп' },
      word: { ru: 'Ответ', kk: 'Жауап' }, check: { ru: 'Проверить', kk: 'Тексеру' },
      keys: { ru: 'Стрелки — по сетке · Пробел — направление · Enter — следующее слово', kk: 'Бағыттауыштар — тор бойынша · Бос орын — бағыт · Enter — келесі сөз' },
      notYet: { ru: 'Не то слово — попробуй ещё или возьми подсказку', kk: 'Бұл сөз емес — тағы байқап көр не кілт ал' },
      right: { ru: 'верно', kk: 'дұрыс' }, noErr: { ru: 'Ошибок нет — так держать', kk: 'Қате жоқ — осылай жалғастыр' },
      errN: { ru: 'Неверных букв: ', kk: 'Қате әріп: ' }, empty: { ru: 'Пока нечего проверять', kk: 'Әзірге тексеретін ештеңе жоқ' },
      noHint: { ru: 'Другой подсказки нет — попробуй «Звук» или «Буква»', kk: 'Басқа кілт жоқ — «Дыбыс» не «Әріп» байқап көр' },
      letters: { ru: 'букв', kk: 'әріп' },
      lab_tr: { ru: 'Перевод', kk: 'Аударма' }, lab_ctx: { ru: 'Предложение', kk: 'Сөйлем' }, lab_def: { ru: 'Определение', kk: 'Анықтама' },
      lab_defL: { ru: 'Описание', kk: 'Сипаттама' }, lab_mean: { ru: 'Значение', kk: 'Мағынасы' }, lab_col: { ru: 'Сочетания', kk: 'Тіркестер' },
      shown: { ru: 'показано', kk: 'көрсетілді' }, mode: { ru: 'Кроссворд', kk: 'Сөзжұмбақ' },
      stuckH: { ru: 'Застрял? Открою ещё одну подсказку', kk: 'Қиын ба? Тағы бір кілт ашайын' },
      stuckL: { ru: 'Застрял? Открою одну букву', kk: 'Қиын ба? Бір әріп ашайын' },
      yes: { ru: 'Давай', kk: 'Иә' }, allDone: { ru: 'Кроссворд решён!', kk: 'Сөзжұмбақ шешілді!' }
    };
    function x(k) { return TX[k][LX.LANG] || TX[k].ru; }
    var IC = {
      hint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
      listen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
      letter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 16l3-8 3 8M10.2 13h3.6"/></svg>',
      word: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
      check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
      l: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
      r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>'
    };

    /* -------------------------------------------------------------- model --- */
    function letterMap(en) {
      var s = C.core(en), out = [];
      for (var i = 0; i < s.length; i++) if (C.lettersOf(s.charAt(i))) out.push(i);
      return out;
    }
    /* -ise / -ize, -yse / -yze: both spellings count where no word crosses */
    function altLetters(en) {
      var s = C.core(en), m = letterMap(en), alt = {}, re = /([iy])([sz])(e|ed|es|ing|ation|ations|er|ers|able|ability)?\b/gi, mm;
      while ((mm = re.exec(s))) {
        var li = m.indexOf(mm.index + 1);
        if (li >= 0) alt[li] = mm[2].toLowerCase() === 's' ? 'Z' : 'S';
        if (!mm[0].length) re.lastIndex++;
      }
      return alt;
    }
    function wipKey(src) { return src.comet ? 'comet' : src.p.pid + ':' + src.tier; }
    function start(src) {
      stop();
      var wk = wipKey(src), w = LX.P.wip[wk];
      if (w && src.comet && w.keys !== src.items.map(function (i) { return i.key; }).join(',')) w = null;
      var seed = w ? w.seed : (wk + ':' + Date.now().toString(36));
      var P = C.build(src.items, seed, src.mode, src.chooser);
      var cells = [], map = {}, ents = [];
      function cell(sol, r, c) { var o = { ix: cells.length, sol: sol, alt: '', val: '', st: '', rv: false, lock: false, ents: [], r: r, c: c }; cells.push(o); return o; }
      P.entries.forEach(function (e) {
        var en = { ix: ents.length, num: e.num, dir: e.dir, it: e.it, kind: e.kind, hint: e.hint, amb: !!e.amb, refs: e.refs || {}, pol: e.pol || {}, cells: [], help: 0, hintOn: false, solved: false, shown: false };
        var alt = altLetters(e.it.en);
        for (var k = 0; k < e.len; k++) {
          var r = e.r + (e.dir === 'd' ? k : 0), c = e.c + (e.dir === 'a' ? k : 0), mk = r + ',' + c;
          var o = map[mk] || (map[mk] = cell(e.it.ans.charAt(k), r, c));
          if (alt[k]) o.alt = alt[k];
          o.ents.push(en.ix); en.cells.push(o);
        }
        ents.push(en);
      });
      P.strips.forEach(function (s) {
        var en = { ix: ents.length, num: s.num, dir: 's', it: s.it, kind: s.kind, hint: s.hint, amb: !!s.amb, refs: s.refs || {}, pol: s.pol || {}, cells: [], toks: [], help: 0, hintOn: false, solved: false, shown: false };
        var str = String(s.it.en), depth = 0, word = [];
        for (var i = 0; i < str.length; i++) {
          var ch = str.charAt(i);
          if (ch === '(') depth++;
          if (ch === ' ') { if (word.length) en.toks.push(word); word = []; continue; }
          if (!depth && C.lettersOf(ch)) { var o = cell(C.lettersOf(ch), -1, -1); o.ents.push(en.ix); en.cells.push(o); word.push({ c: o }); }
          else word.push({ t: ch, p: depth > 0 });
          if (ch === ')') depth = Math.max(0, depth - 1);
        }
        if (word.length) en.toks.push(word);
        var alt = altLetters(s.it.en);
        Object.keys(alt).forEach(function (k) { if (en.cells[k]) en.cells[k].alt = alt[k]; });
        ents.push(en);
      });
      G = { src: src, P: P, seed: seed, wk: wk, cells: cells, map: map, ents: ents, cur: null, msg: '', mc: '', over: false, idle: null };
      LX.regSay(src.items);
      if (w && w.v && w.v.length === cells.length && w.h && w.h.length === ents.length) {
        cells.forEach(function (o, i) { var ch = w.v.charAt(i); o.val = ch === '.' ? '' : ch; o.rv = w.r.charAt(i) === '1'; });
        ents.forEach(function (e, i) { var h = w.h[i] || 0; e.help = h & 3; e.hintOn = !!(h & 4); e.shown = !!(h & 8); if (e.cells.every(okCell)) markSolved(e); });
      }
      var first = ents.filter(function (e) { return !e.solved; })[0] || ents[0];
      G.cur = { e: first.ix, i: firstOpen(first) };
      render();
      requestAnimationFrame(function () { size(); placeKey(); });
      focusKey();
      poke();
    }
    function stop() {
      if (G) clearTimeout(G.idle);
      /* починка порта: решённую сетку покинули до экрана итога (1,1 с) — итог записывается без показа; в
         прототипе он терялся, а отложенный finish падал на G = null */
      if (G && G.over && !G.done) { G.done = true; delete LX.P.wip[G.wk]; LX.record(resultOf(G)); }
      else if (G && !G.over) saveWip();
      G = null;
    }
    /* the guide notices a learner who is stuck on one word: after 30 s without
       progress, or after a second wrong answer, it offers help — once a word */
    function poke() { if (!G || G.over) return; clearTimeout(G.idle); G.idle = setTimeout(stuck, 30000); }
    function stuck() {
      if (!G || G.over) return;
      var e = curEnt();
      if (!e || e.solved || e.offered) return;
      e.offered = true;
      if (e.hint && !e.amb && !e.hintOn) LX.offer(x('stuckH'), x('yes'), function () { doHint(); focusKey(); });
      else LX.offer(x('stuckL'), x('yes'), function () { doLetter(); focusKey(); });
    }
    function okCell(o) { return o.val && (o.val === o.sol || (o.alt && o.val === o.alt && o.ents.length === 1)); }
    function firstOpen(en) {
      for (var i = 0; i < en.cells.length; i++) if (!en.cells[i].val && !en.cells[i].lock) return i;
      for (i = 0; i < en.cells.length; i++) if (!en.cells[i].lock) return i;
      return 0;
    }
    function saveWip() {
      if (!G || G.over) return;
      var any = G.cells.some(function (o) { return o.val; });
      if (!any) { delete LX.P.wip[G.wk]; LX.saveWip(); return; }
      LX.P.wip[G.wk] = { seed: G.seed, keys: G.src.items.map(function (i) { return i.key; }).join(','),
        v: G.cells.map(function (o) { return o.val || '.'; }).join(''), r: G.cells.map(function (o) { return o.rv ? 1 : 0; }).join(''),
        h: G.ents.map(function (e) { return e.help + (e.hintOn ? 4 : 0) + (e.shown ? 8 : 0); }) };
      LX.saveWip();
    }

    /* ------------------------------------------------------------ render --- */
    function dirLabel(e) { return e.dir === 'a' ? x('across') : e.dir === 'd' ? x('down') : x('strips'); }
    function trText(it) { return LXClue.trText(it, LX.LANG); }
    function clueHTML(en, kind) {
      var it = en.it;
      if (kind === 'tr') return esc(trText(it)) + (it.form ? '<span class="form">' + esc(it.form) + '</span>' : '');
      var s = it.clue[kind] || '', refs = en.refs[kind] || [], out = '', at = 0;
      function seg(z) { return esc(z).replace(/___/g, '<span class="gap" aria-label="gap"></span>'); }
      refs.forEach(function (r) {
        var o = G.ents[r.to];
        out += seg(s.slice(at, r.s));
        out += o && o.solved ? '<b class="refw">' + esc(s.slice(r.s, r.e)) + '</b>'
          : '<span class="ref">' + (o ? o.num : '') + (o && o.dir === 'a' ? '→' : o && o.dir === 'd' ? '↓' : '') + '</span>';
        at = r.e;
      });
      return out + seg(s.slice(at));
    }
    /* the clue as the CEFR policy chose it: its kind named, a picture at A0,
       the translation printed under it where the band gives that support */
    function kindTag(en, k) {
      var b = en.pol.band || '';
      var key = k === 'def' ? (b === 'B2' ? 'lab_mean' : /^A/.test(b) ? 'lab_defL' : 'lab_def') : 'lab_' + k;
      return '<span class="ktag k-' + k + '">' + esc(x(key)) + '</span>';
    }
    function clueText(en, compact) {
      var it = en.it, pic = en.pol.pic && en.kind === 'tr' ? LXClue.picOf(it) : '';
      return (pic ? '<img class="cpic" src="' + esc(pic) + '" alt="">' : '') + (compact ? '' : kindTag(en, en.kind)) +
        clueHTML(en, en.kind) + ' <span class="enum">(' + esc(it.enumr) + ')</span>' +
        (en.pol.sup === 'show' ? '<span class="supl">' + esc(trText(it)) + '</span>' : '') +
        ((en.hintOn || en.amb) && en.hint ? '<span class="hint2"><b>' + esc(x('lab_' + (en.hint === 'def' ? (en.pol.band === 'B2' ? 'mean' : /^A/.test(en.pol.band) ? 'defL' : 'def') : en.hint))) + ':</b> ' + clueHTML(en, en.hint) + '</span>' : '');
    }
    function render() {
      var P = G.P, src = G.src, hasGrid = P.entries.length > 0;
      var h = '<div class="hud">' + LX.buddy(src.p ? src.p.lv : null) + '<div class="t"><small>' + esc(x('mode')) + (src.tierName ? ' · ' + esc(src.tierName) : '') + '</small><b>' + esc(src.title) + '</b></div>' +
        '<div class="prog"><div class="ring" id="xwRing"></div></div></div>' +
        '<div class="xp" id="xwHost"><input class="key" id="xwKey" type="text" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" enterkeyhint="next" aria-label="">' +
        '<div class="xp-main"><div class="clue" id="xwClue"></div>';
      if (hasGrid) {
        h += '<div class="board-w" id="xwWrap"><div class="board" id="xwBoard" style="--w:' + P.w + '">';
        for (var r = 0; r < P.h; r++) for (var c = 0; c < P.w; c++) {
          var o = G.map[r + ',' + c];
          if (!o) { h += '<div class="tl"></div>'; continue; }
          var num = P.nums[r + ',' + c];
          h += '<div class="tl L" data-cell="' + o.ix + '">' + (num ? '<span class="n">' + num + '</span>' : '') + '<span class="v"></span></div>';
        }
        h += '</div></div>';
      }
      h += '<div class="dock">' +
        '<button class="tool" data-x="hint">' + IC.hint + esc(x('hint')) + '</button>' +
        '<button class="tool" data-x="listen">' + IC.listen + esc(x('listen')) + '</button>' +
        '<button class="tool" data-x="letter">' + IC.letter + esc(x('letter')) + '</button>' +
        '<button class="tool" data-x="word">' + IC.word + esc(x('word')) + '</button><span class="sp"></span>' +
        '<button class="cta sm" data-x="check">' + IC.check + esc(x('check')) + '</button></div>' +
        '<p class="keys">' + esc(x('keys')) + '</p></div><div class="side">' + LX.buddyBig(src.p ? src.p.lv : null) + '<aside class="clues" id="xwSide">';
      [['a', 'across'], ['d', 'down'], ['s', 'strips']].forEach(function (g) {
        var list = G.ents.filter(function (e) { return e.dir === g[0]; });
        if (!list.length) return;
        h += '<h4>' + esc(x(g[1])) + '</h4><ol>';
        list.forEach(function (e) { h += '<li class="cl" data-ent="' + e.ix + '" id="xwCl' + e.ix + '"></li>'; });
        h += '</ol>';
      });
      h += '</aside></div></div><div class="sr" aria-live="polite" id="xwLive"></div>';
      $('v-xw').innerHTML = h;
      G.ents.forEach(renderClue);
      paint();
    }
    function renderClue(e) {
      var li = $('xwCl' + e.ix);
      if (!li) return;
      var h = '<span class="no">' + e.num + '</span><span class="ct">' + clueText(e) + '</span>';
      if (e.dir === 's') {
        h += '<div class="strip">';
        e.toks.forEach(function (w) {
          h += '<span class="wd">';
          w.forEach(function (tk) {
            h += tk.c ? '<span class="tl L" data-cell="' + tk.c.ix + '"><span class="v"></span></span>' : '<span class="fx' + (tk.p ? ' p' : '') + '">' + esc(tk.t) + '</span>';
          });
          h += '</span>';
        });
        h += '</div>';
      }
      if (e.solved) h += '<span class="ans">' + LX.sndBtn(e.it) + (e.dir === 's' ? '' : esc(e.it.en)) + (e.shown ? '<em>' + esc(x('shown')) + '</em>' : '') + '</span>';
      li.innerHTML = h;
      li.classList.toggle('ok', e.solved);
    }
    function size() {
      if (!G) return;
      var wrap = $('xwWrap'), b = $('xwBoard');
      if (wrap && b) {
        var n = G.P.w, narrow = innerWidth <= 700, gap = narrow ? (n >= 12 ? 2 : 3) : 4;
        var cs = getComputedStyle(wrap), avail = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var s = Math.max(18, Math.min(44, Math.floor((avail - gap * (n - 1)) / n)));
        b.style.setProperty('--cs', s + 'px'); b.style.gap = gap + 'px';
      }
      var strips = root.querySelectorAll('#v-xw .strip');
      for (var i = 0; i < strips.length; i++) {
        var st = strips[i], w = st.clientWidth, most = 1;
        if (!w) continue;
        st.style.removeProperty('--ss');
        var wds = st.querySelectorAll('.wd');
        for (var j = 0; j < wds.length; j++) most = Math.max(most, wds[j].children.length);
        var ss = Math.floor((w - 3 * (most - 1)) / most);
        if (ss < 28) st.style.setProperty('--ss', Math.max(16, ss) + 'px');
      }
    }
    on(window, 'resize', function () { if (G && !G.over) { size(); placeKey(); } });
    function curEnt() { return G && G.cur ? G.ents[G.cur.e] : null; }
    function curCell() { var e = curEnt(); return e ? e.cells[G.cur.i] : null; }
    function paint() {
      if (!G || G.over) return;
      var e = curEnt(), cc = curCell(), on = {};
      e.cells.forEach(function (o) { on[o.ix] = 1; });
      var nodes = root.querySelectorAll('#v-xw [data-cell]');
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i], o = G.cells[+n.getAttribute('data-cell')], pop = n.classList.contains('pop'), sw = n.classList.contains('sweep');
        n.className = 'tl L' + (on[o.ix] ? ' hl' : '') + (cc === o ? ' cur' : '') + (o.lock ? ' ok' : o.st === 'bad' ? ' bad' : '') + (o.rv ? ' rv' : '') + (pop ? ' pop' : '') + (sw ? ' sweep' : '') + (o.val && !o.lock ? ' f' : '');
        n.querySelector('.v').textContent = o.val;
      }
      var cross = cc.ents.length > 1 ? cc.ents.filter(function (z) { return z !== e.ix; })[0] : -1;
      G.ents.forEach(function (z) {
        var li = $('xwCl' + z.ix);
        if (!li) return;
        li.classList.toggle('on', z.ix === e.ix);
        li.classList.toggle('x', z.ix === cross);
      });
      var done = G.ents.filter(function (z) { return z.solved; }).length, tot = G.ents.length, r = 18, cf = 2 * Math.PI * r;
      $('xwRing').innerHTML = '<svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="' + r + '" fill="none" stroke="rgba(135,75,248,.16)" stroke-width="4"/>' +
        '<circle cx="22" cy="22" r="' + r + '" fill="none" stroke="#874BF8" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + cf + '" stroke-dashoffset="' + (cf * (1 - done / tot)) + '"/></svg><span>' + done + '/' + tot + '</span>';
      renderBar();
    }
    function renderBar() {
      var e = curEnt(), bar = $('xwClue');
      if (!e || !bar) return;
      bar.className = 'clue' + (e.solved ? ' ok' : '');
      bar.innerHTML = '<button class="nav" data-x="prev" aria-label="' + esc(LX.t('aPrev')) + '">' + IC.l + '</button><div class="bd"><div class="lab">' + e.num + ' · ' + esc(dirLabel(e)) +
        '</div><div class="tx">' + clueText(e) + '</div>' + (G.msg ? '<div class="msg ' + G.mc + '">' + esc(G.msg) + '</div>' : '') + '</div>' +
        '<button class="nav" data-x="next" aria-label="' + esc(LX.t('aNext')) + '">' + IC.r + '</button>';
      var k = $('xwKey');
      if (k) k.setAttribute('aria-label', e.num + ' ' + dirLabel(e) + ', ' + e.it.ans.length + ' ' + x('letters') + ': ' + bar.querySelector('.tx').textContent);
    }
    function live(s) { var l = $('xwLive'); if (l) l.textContent = s; }

    /* -------------------------------------------------------------- focus --- */
    function placeKey() {
      var k = $('xwKey'), cc = curCell(), host = $('xwHost');
      if (!k || !cc || !host) return;
      var node = root.querySelector('#v-xw [data-cell="' + cc.ix + '"]');
      if (!node) return;
      var a = node.getBoundingClientRect(), b = host.getBoundingClientRect();
      k.style.left = (a.left - b.left) + 'px'; k.style.top = (a.top - b.top) + 'px';
    }
    function focusKey() {
      var k = $('xwKey');
      if (!k || !G || G.over) return;
      placeKey();
      if (DOC.activeElement !== k) { try { k.focus({ preventScroll: true }); } catch (e) { k.focus(); } }
      k.value = ' ';
      try { k.setSelectionRange(1, 1); } catch (e) {}
    }
    function activate(ei, ci, keep) {
      var e = G.ents[ei];
      if (!e) return;
      if (ci == null) ci = firstOpen(e);
      G.cur = { e: ei, i: Math.max(0, Math.min(e.cells.length - 1, ci)) };
      if (!keep) { G.msg = ''; G.mc = ''; }
      poke();
      paint(); placeKey();
      var node = root.querySelector('#v-xw [data-cell="' + curCell().ix + '"]');
      if (node && e.dir === 's') {
        var r = node.getBoundingClientRect();
        if (r.top < 90 || r.bottom > innerHeight - 40) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      var side = $('xwSide'), li = $('xwCl' + ei);
      if (side && li && side.scrollHeight > side.clientHeight + 4 && getComputedStyle(side).overflowY === 'auto') {
        var st = li.offsetTop - side.offsetTop;
        if (st < side.scrollTop || st + li.offsetHeight > side.scrollTop + side.clientHeight) side.scrollTop = st - 40;
      }
    }

    /* ------------------------------------------------------------- moving --- */
    function nextEnt(step, open) {
      var n = G.ents.length, at = G.cur ? G.cur.e : 0;
      for (var k = 1; k <= n; k++) { var e = G.ents[((at + step * k) % n + n) % n]; if (!open || !e.solved) return e; }
      return null;
    }
    function gridStep(dr, dc) {
      var cc = curCell(), e = curEnt();
      if (e.dir === 's') return;
      var want = dc ? 'a' : 'd';
      if (e.dir !== want) {
        var other = cc.ents.filter(function (z) { return G.ents[z].dir === want; })[0];
        if (other != null) { activate(other, G.ents[other].cells.indexOf(cc), true); return; }
      }
      var r = cc.r, c = cc.c;
      for (var k = 0; k < Math.max(G.P.h, G.P.w); k++) {
        r += dr; c += dc;
        if (r < 0 || c < 0 || r >= G.P.h || c >= G.P.w) return;
        var o = G.map[r + ',' + c];
        if (o) {
          var en = o.ents.filter(function (z) { return G.ents[z].dir === want; })[0];
          if (en == null) en = o.ents[0];
          activate(en, G.ents[en].cells.indexOf(o), true);
          return;
        }
      }
    }
    function stepIn(d) { var e = curEnt(), i = G.cur.i + d; if (i >= 0 && i < e.cells.length) activate(e.ix, i, true); }
    function advance() {
      var e = curEnt();
      for (var i = G.cur.i + 1; i < e.cells.length; i++) if (!e.cells[i].lock) { activate(e.ix, i, true); return; }
      paint(); placeKey();
    }

    /* ------------------------------------------------------------- typing --- */
    function type(ch) {
      var o = curCell();
      if (!o || G.over) return;
      if (o.lock) { advance(); o = curCell(); if (o.lock) return; }
      o.val = ch; o.st = ''; G.msg = ''; G.mc = '';
      poke();
      /* починка порта: решённое слово само переводит курсор на первую пустую клетку следующего, и шаг
         advance() после этого пропускал её — следующее слово начинало печататься со второй буквы */
      var was = G.cur.e;
      evaluate([o]);
      if (G && !G.over && !curEnt().solved && G.cur.e === was) advance();
      saveWip();
    }
    function erase() {
      var e = curEnt(), o = curCell();
      if (!e || G.over) return;
      if (o.val && !o.lock) { o.val = ''; o.st = ''; o.rv = false; }
      else for (var i = G.cur.i - 1; i >= 0; i--) if (!e.cells[i].lock) { G.cur.i = i; e.cells[i].val = ''; e.cells[i].st = ''; e.cells[i].rv = false; break; }
      G.msg = '';
      paint(); placeKey(); saveWip();
    }
    function evaluate(list) {
      var hit = {};
      list.forEach(function (o) { o.ents.forEach(function (z) { hit[z] = 1; }); });
      var solved = [], wrong = null;
      Object.keys(hit).forEach(function (z) {
        var e = G.ents[z];
        if (e.solved || !e.cells.every(function (o) { return o.val; })) return;
        if (e.cells.every(okCell)) { markSolved(e); solved.push(e); }
        else if (+z === G.cur.e) wrong = e;
      });
      var cur = curEnt();
      if (solved.length) {
        /* the right-answer chime and the word itself — once, at the moment it
           is completed; an answer the learner asked to be shown gets neither */
        var heard = solved.filter(function (e) { return !e.shown; });
        heard.sort(function (p, q) { return (q === cur) - (p === cur); });
        if (heard.length) LX.rightWords(heard.map(function (e) { return e.it; }));
        G.ents.forEach(renderClue);
        /* a solved word lights up tile by tile; where two solved words cross,
           the shared tile flares; the word flies to its clue and into the sky */
        solved.forEach(function (e) {
          var nodes = e.cells.map(function (o) { return root.querySelector('#v-xw .board [data-cell="' + o.ix + '"]') || root.querySelector('#v-xw [data-cell="' + o.ix + '"]'); });
          nodes.forEach(function (n, i) { if (n) { n.classList.remove('pop', 'sweep'); void n.offsetWidth; n.style.setProperty('--i', i); n.classList.add('sweep'); } });
          e.cells.forEach(function (o, i) { if (o.ents.length > 1 && o.ents.every(function (z) { return G.ents[z].solved; })) setTimeout(function () { LX.burst(nodes[i], '#FFC93D'); }, i * 60 + 200); });
          var word = C.core(e.it.en);
          LX.riseLetters(nodes, e.shown ? '#B48CFF' : '#FFC93D');
          LX.skyAdd(word);
        });
        if (cur.solved) {
          G.msg = '✓ ' + C.core(cur.it.en) + ' — ' + x('right'); G.mc = 'ok';
          live(G.msg);
          if (!cur.help) { LX.burst(root.querySelector('#v-xw [data-cell="' + cur.cells[cur.cells.length - 1].ix + '"]'), '#FFD84D'); LX.cheer(LX.esc(LX.praise())); }
        }
        if (G.ents.every(function (e) { return e.solved; })) { paint(); G.over = true; clearTimeout(G.idle); LX.cheer(LX.esc(x('allDone')), 1500); setTimeout(finish, 1100); return; }
        if (cur.solved) {
          var nx = nextEnt(1, true);
          if (nx) { var m = G.msg, mc = G.mc; activate(nx.ix, null, true); G.msg = m; G.mc = mc; renderBar(); return; }
        }
      } else if (wrong) {
        G.msg = x('notYet'); G.mc = 'bad'; live(G.msg);
        wrong.wrong = (wrong.wrong || 0) + 1;
        if (wrong.wrong >= 2) stuck();
      }
      paint(); placeKey();
    }
    function markSolved(e) {
      e.solved = true;
      e.cells.forEach(function (o) { o.lock = true; o.st = ''; if (o.val !== o.sol && !(o.alt && o.val === o.alt)) o.val = o.sol; });
    }

    /* --------------------------------------------------------------- help --- */
    function help(e, l) { e.help = Math.max(e.help, l); e.offered = true; poke(); }
    function doHint() {
      var e = curEnt();
      if (e.solved) return;
      if (!e.hint || e.amb) { G.msg = x('noHint'); G.mc = ''; renderBar(); return; }
      e.hintOn = true; help(e, 1); renderClue(e); renderBar(); saveWip();
    }
    function doListen() { var e = curEnt(); if (!e.solved) help(e, 1); LX.say(e.it, .9); saveWip(); }
    function doLetter() {
      var e = curEnt();
      if (e.solved) return;
      var o = curCell();
      if (o.lock || okCell(o)) { o = null; for (var i = 0; i < e.cells.length; i++) if (!e.cells[i].lock && !okCell(e.cells[i])) { o = e.cells[i]; G.cur.i = i; break; } }
      if (!o) return;
      o.val = o.sol; o.rv = true; o.st = ''; help(e, 2);
      evaluate([o]);
      if (G && !G.over && !e.solved) advance();
      saveWip();
    }
    function doWord() {
      var e = curEnt();
      if (e.solved) return;
      e.cells.forEach(function (o) { if (!okCell(o)) { o.val = o.sol; o.rv = true; o.st = ''; } });
      e.shown = true; help(e, 3);
      evaluate(e.cells);
      saveWip();
    }
    function doCheck() {
      var bad = 0, filled = 0;
      G.cells.forEach(function (o) { if (!o.val || o.lock) return; filled++; if (!okCell(o)) { o.st = 'bad'; bad++; } });
      G.msg = !filled ? x('empty') : bad ? x('errN') + bad : x('noErr');
      G.mc = !filled ? '' : bad ? 'bad' : 'ok';
      live(G.msg); paint();
    }
    function resultOf(g) {
      return { type: 'xw', src: g.src, complete: g.ents.every(function (e) { return e.solved; }), words: g.ents.map(function (e) { return { it: e.it, ok: !e.help && !e.shown }; }) };
    }
    function finish() {
      var g = G;
      if (!g || g.done) return;
      g.done = true;
      delete LX.P.wip[g.wk];
      LX.finish(resultOf(g));
    }

    /* ----------------------------------------------------------- keyboard --- */
    function playing() { return G && !G.over && $('v-xw').classList.contains('on'); }
    function handleKey(ev) {
      var k = ev.key, e = curEnt(), stop = true;
      if (k === 'ArrowRight') { if (e.dir === 's') stepIn(1); else gridStep(0, 1); }
      else if (k === 'ArrowLeft') { if (e.dir === 's') stepIn(-1); else gridStep(0, -1); }
      else if (k === 'ArrowDown') { if (e.dir === 's') activate(nextEnt(1).ix); else gridStep(1, 0); }
      else if (k === 'ArrowUp') { if (e.dir === 's') activate(nextEnt(-1).ix); else gridStep(-1, 0); }
      else if (k === 'Backspace' || k === 'Delete') erase();
      else if (k === 'Enter' || (k === 'Tab' && !ev.shiftKey)) { var n = nextEnt(1, true) || nextEnt(1); activate(n.ix); }
      else if (k === 'Tab' && ev.shiftKey) { var p = nextEnt(-1, true) || nextEnt(-1); activate(p.ix); }
      else if (k === ' ') { var cc = curCell(), o = cc.ents.filter(function (z) { return z !== e.ix; })[0]; if (o != null) activate(o, G.ents[o].cells.indexOf(cc), true); }
      else stop = false;
      if (stop) ev.preventDefault();
    }
    on(KDOC, 'keydown', function (ev) {
      if (!playing()) return;
      if (tgt(ev).id === 'xwKey') { handleKey(ev); return; }
      var tg = tgt(ev).tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tgt(ev).isContentEditable || ev.ctrlKey || ev.metaKey || ev.altKey || $('scrim')) return;
      if (tg === 'BUTTON' && (ev.key === ' ' || ev.key === 'Enter')) return;
      if (/^[a-zA-Z]$/.test(ev.key)) { ev.preventDefault(); focusKey(); type(ev.key.toUpperCase()); return; }
      if (/^(Arrow|Backspace$|Delete$)/.test(ev.key)) { focusKey(); handleKey(ev); }
    });
    /* letters arrive through 'input' (phones send no usable key codes); the
       field keeps one space so a phone's backspace is seen as a deletion */
    on(root, 'input', function (ev) {
      if (!playing() || ev.target.id !== 'xwKey') return;
      var k = ev.target, v = k.value;
      if ((ev.inputType && ev.inputType.indexOf('delete') === 0) || v === '') erase();
      else { var L = C.lettersOf(v); for (var i = 0; i < L.length && G && !G.over; i++) type(L.charAt(i)); }
      if (G && !G.over) { k.value = ' '; try { k.setSelectionRange(1, 1); } catch (e) {} }
    });
    on(root, 'click', function (ev) {
      if (!playing()) return;
      var b = ev.target.closest && ev.target.closest('[data-x]');
      if (b) {
        var a = b.getAttribute('data-x');
        if (a === 'next') activate(nextEnt(1).ix);
        else if (a === 'prev') activate(nextEnt(-1).ix);
        else if (a === 'hint') doHint();
        else if (a === 'listen') doListen();
        else if (a === 'letter') doLetter();
        else if (a === 'word') doWord();
        else if (a === 'check') doCheck();
        focusKey();
        return;
      }
      var cn = ev.target.closest && ev.target.closest('#v-xw [data-cell]');
      if (cn) {
        var o = G.cells[+cn.getAttribute('data-cell')], e = curEnt();
        if (curCell() === o && o.ents.length > 1) { var ot = o.ents.filter(function (z) { return z !== e.ix; })[0]; activate(ot, G.ents[ot].cells.indexOf(o)); }
        else {
          var pick = o.ents.indexOf(e.ix) >= 0 ? e.ix : o.ents.filter(function (z) { return G.ents[z].dir === e.dir; })[0];
          if (pick == null) pick = o.ents[0];
          activate(pick, G.ents[pick].cells.indexOf(o));
        }
        focusKey();
        return;
      }
      var li = ev.target.closest && ev.target.closest('#v-xw [data-ent]');
      if (li && !ev.target.closest('[data-say]')) { activate(+li.getAttribute('data-ent')); focusKey(); }
    });

    function relang() { if (G && !G.over) { render(); size(); placeKey(); } }
    return { start: start, stop: stop, relang: relang, game: function () { return G; }, trText: trText };
  })();
  LX.stopGames = function () { if (LX.xw) LX.xw.stop(); if (LX.ws) LX.ws.stop(); };

  /* =====================================================================
     WORD HUNT · Word Search
     Board generation and validation: WSCore (every target is proved to be
     in place and nowhere else). This file is play only: drag / swipe / tap /
     keyboard selection, timer, hints, discovery feedback.
     ===================================================================== */
  LX.ws = (function () {
    'use strict';
    var $ = LX.$, esc = LX.esc;
    var G = null, TIMER = null;
    var COLORS = ['#874BF8', '#0AAFFF', '#00D441', '#FFAD00', '#FF631E', '#A87BFA'];
    var TX = {
      mode: { ru: 'Поиск слов', kk: 'Сөз іздеу' },
      list: { ru: 'Узнай слово — найди его', kk: 'Сөзді таны — тауып ал' },
      peekTr: { ru: 'Перевод', kk: 'Аударма' }, peekW: { ru: 'Слово', kk: 'Сөз' },
      lab_tr: { ru: 'Перевод', kk: 'Аударма' }, lab_ctx: { ru: 'Предложение', kk: 'Сөйлем' }, lab_def: { ru: 'Определение', kk: 'Анықтама' },
      lab_defL: { ru: 'Описание', kk: 'Сипаттама' }, lab_mean: { ru: 'Значение', kk: 'Мағынасы' }, lab_col: { ru: 'Сочетания', kk: 'Тіркестер' },
      how: { ru: 'Проведи пальцем или мышью по буквам слова. Можно и по-другому: нажми первую букву, затем последнюю.',
             kk: 'Сөздің әріптері бойымен саусақпен не тінтуірмен сыз. Немесе бірінші әріпті, сосын соңғысын бас.' },
      keys: { ru: 'Клавиатура: стрелки — курсор, Enter — начало и конец слова', kk: 'Пернетақта: бағыттауыштар — курсор, Enter — сөздің басы мен соңы' },
      flare: { ru: 'Подсветить', kk: 'Жарықтандыру' }, left: { ru: 'осталось', kk: 'қалды' },
      found: { ru: 'найдено', kk: 'табылды' }, easy: { ru: 'Лёгкий', kk: 'Жеңіл' }, medium: { ru: 'Средний', kk: 'Орташа' }, hard: { ru: 'Сложный', kk: 'Күрделі' },
      star: { ru: '+1 слово', kk: '+1 сөз' }, stuckF: { ru: 'Не видно слова? Подсвечу первую букву', kk: 'Сөз көрінбей ме? Бірінші әріпті жарықтандырайын' },
      yes: { ru: 'Давай', kk: 'Иә' }, nope: { ru: 'Такого слова здесь нет — ищи дальше', kk: 'Мұнда ондай сөз жоқ — іздей бер' }
    };
    function x(k) { return TX[k][LX.LANG] || TX[k].ru; }
    var FLARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>';

    function start(src) {
      stop();
      var seed = (src.comet ? 'comet' : src.p.pid) + ':' + src.diff + ':' + Date.now().toString(36);
      var B = WSCore.build(src.items, src.diff, seed);
      if (!B) { LX.lobby(); return; }
      var per = { easy: 14, medium: 16, hard: 18 }[src.diff];
      G = { src: src, B: B, found: {}, foundN: 0, sel: null, anchor: -1, kb: 0, helped: {}, peek: {}, flares: 3, color: 0,
            t0: Date.now(), limit: src.timed ? (B.words.length * per + 20) * 1000 : 0, over: false, timedOut: false, lines: [] };
      LX.regSay(B.words.map(function (w) { return w.it; }));
      render();
      requestAnimationFrame(size);
      TIMER = setInterval(tick, 250);
      tick();
      poke();
    }
    function stop() {
      clearInterval(TIMER); TIMER = null;
      if (G) clearTimeout(G.idle);
      /* починка порта: доску покинули в паузе до экрана итога — итог записывается без показа (как у кроссворда) */
      if (G && G.over && !G.done) { G.done = true; LX.record(resultOf(G)); }
      G = null;
    }
    /* stuck for 35 s without a find: the guide offers a flare (while any are left) */
    function poke() {
      if (!G || G.over) return;
      clearTimeout(G.idle);
      G.idle = setTimeout(function () { if (G && !G.over && G.flares) LX.offer(x('stuckF'), x('yes'), flare); }, 35000);
    }

    /* ------------------------------------------------------------ render --- */
    function render() {
      var B = G.B, src = G.src;
      var h = '<div class="hud cy">' + LX.buddy(src.p ? src.p.lv : null) + '<div class="t"><small>' + esc(x('mode')) + (src.comet ? '' : ' · ' + esc(x(src.diff))) + '</small><b>' + esc(src.title) + '</b></div>' +
        '<div class="prog"><div class="timer" id="wsTimer">0:00</div><div class="ring" id="wsRing"></div></div></div>' +
        '<div class="hp"><div><div class="hboard-w" id="wsWrap"><div class="hboard" id="wsBoard" style="--n:' + B.n + '" tabindex="0" role="grid" aria-label="' + esc(x('mode')) + '">' +
        '<svg class="caps" id="wsCaps"></svg>';
      for (var i = 0; i < B.grid.length; i++) h += '<div class="hc" data-c="' + i + '">' + B.grid[i] + '</div>';
      h += '</div></div><div class="dock" style="margin-top:12px"><button class="tool" data-w="flare" id="wsFlare">' + FLARE + esc(x('flare')) +
        ' · <span id="wsFl">' + G.flares + '</span></button><span class="sp"></span></div>' +
        '<p class="keys" style="margin-top:8px">' + esc(x('keys')) + '</p></div>' +
        '<div class="side">' + LX.buddyBig(src.p ? src.p.lv : null) + '<aside class="wlist"><h4><span>' + esc(x('list')) + '</span><span id="wsCount"></span></h4><div class="words cards" id="wsWords"></div>' +
        '<p class="note">' + esc(x('how')) + '</p></aside></div></div><div class="sr" aria-live="polite" id="wsLive"></div>';
      $('v-ws').innerHTML = h;
      renderWords(); paint(); drawCaps();
    }
    /* Each target is shown as a clue chosen by the CEFR policy for its band
       (translation + picture at A0; English descriptions, sentences and
       collocations above). The learner works out the word, then hunts it.
       Peeking at the translation or at the word itself is allowed — and
       counted as help, so that word comes back as a comet. */
    function clueOf(w) {
      if (!w.cl) w.cl = LXClue.wsClue(w.it);
      return w.cl;
    }
    function kindLab(k, band) {
      return x(k === 'def' ? (band === 'B2' ? 'lab_mean' : /^A/.test(band) ? 'lab_defL' : 'lab_def') : 'lab_' + k);
    }
    function clueBody(w) {
      var it = w.it, c = clueOf(w);
      if (c.kind === 'tr') return esc(LXClue.trText(it, LX.LANG)) + (it.form ? '<span class="form">' + esc(it.form) + '</span>' : '');
      /* the word's own form never shows inside its clue; other targets of the
         board are left as written — on a word-search board they are visible anyway */
      return esc(it.clue[c.kind] || '').replace(/___/g, '<span class="gap"></span>');
    }
    function renderWords() {
      var h = '';
      G.B.words.forEach(function (w, i) {
        var f = G.found[w.it.key], miss = G.over && !f, c = clueOf(w), peek = G.peek[w.it.key] || {};
        var pic = c.pic ? LXClue.picOf(w.it) : '';
        var showTr = (c.sup === 'show' || peek.tr) && c.kind !== 'tr';
        h += '<div class="wc' + (f ? ' fd' : '') + (miss ? ' miss' : '') + '" id="wsW' + i + '" style="--wc:' + (f ? f.color : 'transparent') + '">' +
          (pic ? '<img class="cpic" src="' + esc(pic) + '" alt="">' : '') +
          '<div class="wb"><span class="ktag k-' + c.kind + '">' + esc(kindLab(c.kind, c.band)) + '</span>' + clueBody(w) +
          ' <span class="enum">(' + esc(w.it.enumr) + ')</span>' +
          (showTr ? '<span class="supl">' + esc(LXClue.trText(w.it, LX.LANG)) + '</span>' : '');
        if (f || miss || peek.w) {
          h += '<div class="ans">' + LX.sndBtn(w.it) + '<b>' + esc(w.it.en) + '</b>' + (c.kind === 'tr' || showTr ? '' : '<small>' + esc(LX.trOf(w.it)) + '</small>') + '</div>';
        } else {
          h += '<div class="peeks">' + (c.kind !== 'tr' && !showTr && w.it.clue.tr && !LXClue.trGivesAway(w.it) ? '<button class="peek" data-pk="tr" data-i="' + i + '">' + esc(x('peekTr')) + '</button>' : '') +
            '<button class="peek" data-pk="w" data-i="' + i + '">' + esc(x('peekW')) + '</button></div>';
        }
        h += '</div></div>';
      });
      $('wsWords').innerHTML = h;
      $('wsCount').textContent = G.foundN + ' / ' + G.B.words.length;
    }
    function peek(i, what) {
      var w = G.B.words[i];
      if (!w || G.over) return;
      var p = G.peek[w.it.key] || (G.peek[w.it.key] = {});
      p[what] = 1;
      G.helped[w.it.key] = 1;
      if (what === 'w') LX.say(w.it);
      renderWords();
    }
    function size() {
      if (!G) return;
      var wrap = $('wsWrap'), b = $('wsBoard');
      if (!wrap || !b) return;
      var n = G.B.n, gap = innerWidth <= 700 ? 2 : 4;
      var cs = getComputedStyle(wrap), avail = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var hs = Math.max(19, Math.min(48, Math.floor((avail - gap * (n - 1)) / n)));
      b.style.setProperty('--hs', hs + 'px'); b.style.setProperty('--hg', gap + 'px');
      G.hs = hs; G.hg = gap;
      drawCaps();
    }
    on(window, 'resize', function () { if (G) size(); });
    function center(ix) {
      var n = G.B.n, s = G.hs + G.hg;
      return [(ix % n) * s + G.hs / 2, Math.floor(ix / n) * s + G.hs / 2];
    }
    function drawCaps() {
      var svg = $('wsCaps');
      if (!svg || !G || !G.hs) return;
      var h = '', sw = G.hs * 0.8;
      G.lines.forEach(function (l) {
        var a = center(l.cells[0]), b = center(l.cells[l.cells.length - 1]);
        h += '<line class="' + (l.cls || '') + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + l.color + '" stroke-width="' + sw + '"/>';
      });
      if (G.sel && G.sel.length > 1) {
        var a = center(G.sel[0]), b = center(G.sel[G.sel.length - 1]);
        h += '<line class="live" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#0AC7FF" stroke-width="' + sw + '"/>';
      }
      svg.innerHTML = h;
      G.lines.forEach(function (l) { l.cls = (l.cls || '').replace('new', '').trim(); });
    }
    function paint() {
      var on = {}, fd = {};
      (G.sel || []).forEach(function (i) { on[i] = 1; });
      G.lines.forEach(function (l) { l.cells.forEach(function (i) { fd[i] = l.miss ? 'm' : 1; }); });
      var cs = root.querySelectorAll('#wsBoard .hc');
      for (var i = 0; i < cs.length; i++) {
        cs[i].className = 'hc' + (cs[i].classList.contains('lit') ? ' lit' : '') + (on[i] ? ' sel' : '') + (fd[i] === 1 ? ' fd' : fd[i] === 'm' ? ' miss' : '') +
          (i === G.anchor ? ' anc' : '') + (G.kbOn && i === G.kb ? ' kb' : '');
      }
      var r = 18, cf = 2 * Math.PI * r, tot = G.B.words.length;
      $('wsRing').innerHTML = '<svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="' + r + '" fill="none" stroke="rgba(10,175,255,.18)" stroke-width="4"/>' +
        '<circle cx="22" cy="22" r="' + r + '" fill="none" stroke="#0AAFFF" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + cf + '" stroke-dashoffset="' + (cf * (1 - G.foundN / tot)) + '"/></svg><span>' + G.foundN + '/' + tot + '</span>';
    }
    function tick() {
      if (!G || G.over) return;
      var el = Date.now() - G.t0, tm = $('wsTimer');
      if (!tm) return;
      if (G.limit) {
        var left = Math.max(0, G.limit - el);
        tm.textContent = LX.fmtTime(left + 999);
        tm.classList.toggle('low', left < 15000);
        if (!left) timeout();
      } else tm.textContent = LX.fmtTime(el);
    }

    /* --------------------------------------------------------- selection --- */
    function cellAt(px, py) {
      var b = $('wsBoard').getBoundingClientRect(), s = G.hs + G.hg, n = G.B.n;
      var c = Math.floor((px - b.left) / s), r = Math.floor((py - b.top) / s);
      if (c < 0 || r < 0 || c >= n || r >= n) return -1;
      return r * n + c;
    }
    /* the line from the start cell toward the pointer, snapped to the nearest
       of the eight directions: a wobbly finger still draws a straight line */
    function snapLine(a, px, py) {
      var b = $('wsBoard').getBoundingClientRect(), n = G.B.n, s = G.hs + G.hg;
      var c0 = center(a), dx = px - b.left - c0[0], dy = py - b.top - c0[1];
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < s * 0.45) return [a];
      var ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)), dr = Math.round(Math.sin(ang * Math.PI / 4)), dc = Math.round(Math.cos(ang * Math.PI / 4));
      var step = (dr && dc) ? s * Math.SQRT2 : s, len = Math.round(dist / step);
      var r0 = Math.floor(a / n), c00 = a % n, out = [a];
      for (var k = 1; k <= len; k++) {
        var r = r0 + dr * k, c = c00 + dc * k;
        if (r < 0 || c < 0 || r >= n || c >= n) break;
        out.push(r * n + c);
      }
      return out;
    }
    var drag = null;
    function onDown(e) {
      if (!G || G.over || e.button > 0) return;
      var c = cellAt(e.clientX, e.clientY);
      if (c < 0) return;
      e.preventDefault();
      drag = { a: c, moved: false, id: e.pointerId };
      try { $('wsBoard').setPointerCapture(e.pointerId); } catch (er) {}
      G.sel = [c]; G.kbOn = false;
      poke();
      paint(); drawCaps();
    }
    function onMove(e) {
      if (!drag || !G || e.pointerId !== drag.id) return;
      var line = snapLine(drag.a, e.clientX, e.clientY);
      if (line.length > 1) drag.moved = true;
      if (!G.sel || line.length !== G.sel.length || line[line.length - 1] !== G.sel[G.sel.length - 1]) { G.sel = line; paint(); drawCaps(); }
    }
    function onUp(e) {
      if (!drag || !G || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      if (d.moved && G.sel.length > 1) { G.anchor = -1; tryLine(G.sel); return; }
      /* a tap: first tap anchors, second tap closes the line */
      tapCell(d.a);
    }
    function tapCell(c) {
      if (G.anchor >= 0 && G.anchor !== c) {
        var line = WSCore.lineCells(G.B.n, G.anchor, c);
        if (line) { G.anchor = -1; tryLine(line); return; }
      }
      G.anchor = G.anchor === c ? -1 : c;
      G.sel = null; paint(); drawCaps();
    }
    function tryLine(cells) {
      var w = WSCore.match(G.B, cells, G.found);
      G.sel = null;
      if (w) discover(w, cells);
      else {
        /* a near miss is not punished: the letters flash and the hunt goes on */
        if (cells.length >= 3) {
          cells.forEach(function (i) {
            var n = root.querySelector('#wsBoard .hc[data-c="' + i + '"]');
            if (n) { n.style.background = 'rgba(255,99,30,.35)'; setTimeout(function () { n.style.background = ''; }, 380); }
          });
          live(x('nope'));
        }
        paint(); drawCaps();
      }
    }
    function discover(w, cells) {
      var color = COLORS[G.color++ % COLORS.length];
      G.found[w.it.key] = { color: color };
      G.foundN++;
      G.lines.push({ cells: cells, color: color, cls: 'new' });
      renderWords(); paint(); drawCaps();
      poke();
      var i = G.B.words.indexOf(w), chip = $('wsW' + i);
      if (chip) { chip.classList.add('flash'); }
      var nodes = cells.map(function (c) { return root.querySelector('#wsBoard .hc[data-c="' + c + '"]'); });
      nodes.forEach(function (n, k) { if (n) { n.style.setProperty('--i', k); n.classList.remove('lit'); void n.offsetWidth; n.classList.add('lit'); } });
      LX.riseLetters(nodes, color);
      LX.flyWord(w.it.en, nodes[Math.floor(nodes.length / 2)], chip, color);
      LX.skyAdd(w.it.en);
      /* right-answer chime first, then the word's own audio exactly as before */
      LX.chime();
      var B = G.B;
      setTimeout(function () { if (G && G.B === B && $('v-ws').classList.contains('on')) LX.say(w.it); }, 420);
      LX.cheer('<b>' + esc(w.it.en) + '</b> <span class="tr">' + esc(LX.trOf(w.it)) + '</span>' + (G.helped[w.it.key] ? '' : ' <span class="plus">' + esc(x('star')) + '</span>'), 2400, 'found');
      live(w.it.en);
      if (G.foundN === G.B.words.length) { G.over = true; clearInterval(TIMER); setTimeout(finish, 1100); }
    }
    function live(s) { var l = $('wsLive'); if (l) l.textContent = s; }

    /* a flare lights the first letter of a word still hidden — 3 per hunt */
    function flare() {
      if (!G || G.over || !G.flares) return;
      var left = G.B.words.filter(function (w) { return !G.found[w.it.key] && !G.helped[w.it.key]; });
      if (!left.length) left = G.B.words.filter(function (w) { return !G.found[w.it.key]; });
      if (!left.length) return;
      var w = left[0];
      G.helped[w.it.key] = 1;
      G.flares--;
      LX.hush(); poke();
      $('wsFl').textContent = G.flares;
      if (!G.flares) $('wsFlare').disabled = true;
      var n = root.querySelector('#wsBoard .hc[data-c="' + w.cells[0] + '"]');
      if (n) {
        n.animate([{ boxShadow: '0 0 0 0 rgba(255,173,0,0)', background: 'rgba(255,173,0,.6)' }, { boxShadow: '0 0 0 10px rgba(255,173,0,0)', background: 'rgba(255,173,0,.15)' }],
          { duration: 700, iterations: 4 });
        LX.burst(n, '#FFAD00');
      }
    }

    function timeout() {
      G.over = true; G.timedOut = true;
      clearInterval(TIMER);
      G.B.words.forEach(function (w) { if (!G.found[w.it.key]) G.lines.push({ cells: w.cells, color: '#FF631E', cls: 'miss', miss: true }); });
      renderWords(); paint(); drawCaps();
      setTimeout(finish, 2200);
    }
    function resultOf(g) {
      return { type: 'ws', src: g.src, timedOut: g.timedOut, complete: !g.timedOut && g.foundN === g.B.words.length, time: Date.now() - g.t0,
        words: g.B.words.map(function (w) { return { it: w.it, ok: !!g.found[w.it.key] && !g.helped[w.it.key] }; }) };
    }
    function finish() {
      var g = G;
      if (!g || g.done) return;
      g.done = true;
      clearInterval(TIMER);
      LX.finish(resultOf(g));
      G = null;
    }

    /* ------------------------------------------------------------ events --- */
    on(root, 'pointerdown', function (e) { if (G && e.target.closest && e.target.closest('#wsBoard')) onDown(e); });
    on(window, 'pointermove', function (e) { if (drag) onMove(e); });
    on(window, 'pointerup', function (e) { if (drag) onUp(e); });
    on(window, 'pointercancel', function () { if (drag && G) { drag = null; G.sel = null; paint(); drawCaps(); } });
    on(root, 'click', function (e) {
      var b = e.target.closest && e.target.closest('[data-w]');
      if (b && b.getAttribute('data-w') === 'flare') flare();
      var pk = e.target.closest && e.target.closest('[data-pk]');
      if (pk && G) peek(+pk.getAttribute('data-i'), pk.getAttribute('data-pk'));
    });
    on(KDOC, 'keydown', function (e) {
      if (!G || G.over || !$('v-ws').classList.contains('on') || $('scrim')) return;
      var tg = tgt(e).tagName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tgt(e).isContentEditable || (tg === 'BUTTON' && (e.key === 'Enter' || e.key === ' '))) return;
      var n = G.B.n, r = Math.floor(G.kb / n), c = G.kb % n, handled = true;
      if (e.key === 'ArrowRight') c = Math.min(n - 1, c + 1);
      else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
      else if (e.key === 'ArrowDown') r = Math.min(n - 1, r + 1);
      else if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
      else if (e.key === 'Enter' || e.key === ' ') { G.kbOn = true; tapCell(G.kb); e.preventDefault(); return; }
      else if (e.key === 'Escape') { G.anchor = -1; G.sel = null; }
      else handled = false;
      if (!handled) return;
      e.preventDefault();
      G.kbOn = true; G.kb = r * n + c;
      if (G.anchor >= 0) { var l = WSCore.lineCells(n, G.anchor, G.kb); G.sel = l; } else G.sel = null;
      paint(); drawCaps();
    });

    function relang() { if (G) { var t = G.t0; render(); size(); G.t0 = t; } }
    return { start: start, stop: stop, relang: relang, game: function () { return G; } };
  })();

  LX.boot()

  function destroy() {
    if (dead) return
    // Недорешённая сетка сохраняется на уходе (stop кроссворда), отложенная запись wip — сразу.
    try {
      LX.stopGames()
      LX.flushWip()
    } catch {
      /* разметку уже сняли — сохранять нечего */
    }
    dead = true
    ac.abort()
    timeouts.forEach((id) => window.clearTimeout(id))
    intervals.forEach((id) => window.clearInterval(id))
    frames.forEach((id) => window.cancelAnimationFrame(id))
    timeouts.clear()
    intervals.clear()
    frames.clear()
    const cx = LX.actx()
    if (cx && cx.close) cx.close().catch(() => {})
    try {
      stopAudio()
    } catch {
      /* нечего глушить */
    }
    root.innerHTML = ''
  }

  return {
    destroy,
    /** Язык интерфейса приложения сменился: setLang прототипа перерисует текущий вид. */
    setLang(l) {
      if (!dead) LX.setLang(l)
    },
    /**
     * Прогресс в хранилище обновился (снимок сервера пришёл позже первого кадра): перечитать и перерисовать
     * главную и карту. Посреди партии вид не трогаем — новое увидится на итогах.
     */
    reload() {
      if (dead || !LX.reloadP()) return
      const v = LX.nav.view
      if (v === 'lobby') LX.renderLobby()
      else if (v === 'galaxy') {
        LX.renderGalaxy()
        requestAnimationFrame(LX.layoutMap)
      }
      if (LX.sheet()) LX.renderSheet()
      LX.topStats()
    },
    /** Для тестов и e2e: где ученик и что на экране. */
    snapshot() {
      const s = LX.sheet()
      return {
        view: LX.nav.view,
        lv: LX.nav.lv,
        lang: LX.LANG,
        sheet: s && { pid: s.p.pid, tier: s.tier, diff: s.diff, timed: s.timed },
        xw: LX.xw.game(),
        ws: LX.ws.game(),
        lastRes: LX.lastRes || null,
        said: LX.said || [],
        chimes: LX.chimes || 0,
        P: LX.P,
      }
    },
  }
}
