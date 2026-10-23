'use client'

// Cartoon World — движок раздела мультфильмов, перенесённый из прототипа методиста
// почти дословно (как «Числа» и Prepositions World): библиотека с фильтрами и
// полками уровней, просмотр YouTube, письменная миссия-переписка под видео.
// Экран CartoonsPage монтирует его в Shadow DOM: классы прототипа совпадают с
// глобальными классами сайта.
//
// От прототипа отличается связь с приложением и одна починка (спека 2026-10-22-cartoon-world):
// - каталог — cfg.index с бэкенда (/mobile/cartoons), четыре источника сводятся как
//   в прототипе; миссия догружается cfg.loadMission(id) при открытии видео;
// - нерабочие видео отсекает бэкенд (index.unavailable), проверки 726 обложек в
//   браузере ученика больше нет;
// - плеер — youtube-nocookie.com, YT.Player получает элемент: в тени поиск по id не работает;
// - роутер — своя переменная HASH вместо адреса страницы, клики по карточкам
//   (#watch/<id>) перехватываются в корне; заголовок вкладки не трогаем;
// - язык — приложения (ru/kk/en; английские строки дописаны), своего переключателя нет;
// - прогресс — cfg.progress (общее хранилище «Практики»), черновик ответа — устройство;
// - пройденная миссия — cfg.onMissionDone; подсказка, переписанная дословно,
//   принимается и короче минимума слов (chat.js, isHintText).
// Чистая логика чата (выбор ответа персонажа) — в chat.js, под оракулом прототипа.

import { countWords, isHintText, pickPath, replyFor } from './chat.js'

/**
 * @param {HTMLElement} ROOT  корень раздела в Shadow DOM с разметкой markup.js
 * @param {{ index: object, loadMission: (id: string) => Promise<object|null>, lang?: string, draftKey: string,
 *   progress: { read: () => object, update: (fn: (state: object) => void) => void },
 *   onMissionDone?: (id: string) => void }} cfg
 * @returns {{ go(hash: string): void, snapshot(): object, destroy(): void }}
 */
export function mountCartoons(ROOT, cfg) {
  var INDEX = cfg.index || {};
  var GONE = {};
  (INDEX.unavailable || []).forEach(function (v) { if (v && v.id) GONE[v.id] = true; });
  var onMissionDone = cfg.onMissionDone || function () {};
  var ac = new AbortController();
  var on = function (target, type, fn) { target.addEventListener(type, fn, { signal: ac.signal }); };
  var HASH = "";
  function go(h) { HASH = h || ""; route(); }
  /* ====================================================================
   * Cartoons for English Learning — library + watch + writing missions.
   *   Data      INDEX.library, CARTOON_DATA, CARTOON_CATALOG
   *   Library   search, filters, level shelves, cards
   *   Watch     YouTube player (official IFrame API) + the game panel under it
   *   Game      reusable engine + five game worlds (detective, map, cafe, story, magic)
   * After the video the learner plays; there is no reading task.
   * ==================================================================== */

  var LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1"];

  /* ------------------------------------------------------------------ */
  /* Data                                                                */
  /* ------------------------------------------------------------------ */
  function ytVideo(id, channel) {
    return { provider: "youtube", id: id, channel: channel, watchUrl: "https://www.youtube.com/watch?v=" + id, thumbnail: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg" };
  }
  function normalizeLibrary(e) {
    return { id: e.id, level: e.level, series: e.series, episodeTitle: e.title, title: e.series + " — " + e.title,
      studio: e.channel, ages: e.ages, audience: e.audience, topics: e.topics || [], durationSec: e.sec,
      description: e.desc, video: ytVideo(e.yt, e.channel) };
  }
  function normalizeFilm(e) {
    var v = ytVideo(e.video.id, e.video.channel);
    return { id: e.id, level: e.level, series: e.title, episodeTitle: e.title, title: e.title, studio: e.studio, year: e.year,
      ages: e.ages, audience: "teens", topics: e.topics || [], durationSec: e.durationSec, description: e.description,
      video: v, license: e.license };
  }
  function normalizeCatalog(r) {
    var lv = r[0], yt = r[1], series = r[2], title = r[3], channel = r[4], sec = r[5];
    var young = lv === "A0" || lv === "A1" || lv === "A2";
    return { id: "cat-" + yt, level: lv, series: series, episodeTitle: title, title: series + " — " + title,
      studio: channel, ages: "", audience: young ? "kids" : "teens", topics: [], durationSec: sec || 0, catalog: true,
      description: {
        ru: "«" + title + "» — " + series + ". Уровень " + lv + " назначен предварительно, по сериалу и названию: серию ещё не проверил преподаватель.",
        kk: "«" + title + "» — " + series + ". " + lv + " деңгейі алдын ала сериал мен атауына қарап берілген: мұғалім серияны әлі тексерген жоқ."
      },
      video: ytVideo(yt, channel) };
  }
  /* Added titles (CARTOON_EXTRA.rows): objects with an explicit audience (kids | teens | adults) and an optional content warning. */
  function normalizeExtra(e) {
    return { id: "ext-" + e.yt, level: e.level, series: e.series, episodeTitle: e.title, title: e.series + " — " + e.title,
      studio: e.channel, ages: e.ages || "", audience: e.audience, topics: e.topics || [], durationSec: e.sec || 0, added: true, catalog: true,
      description: { ru: e.desc_ru, kk: e.desc_kk || e.desc_ru },
      warning: e.warning_ru ? { ru: e.warning_ru, kk: e.warning_kk || e.warning_ru } : null,
      video: ytVideo(e.yt, e.channel) };
  }
  var DATA = ((INDEX.library && INDEX.library.entries) || []).map(normalizeLibrary)
    .concat(((INDEX.data && INDEX.data.episodes) || []).map(normalizeFilm))
    .concat(((INDEX.catalog && INDEX.catalog.rows) || []).map(normalizeCatalog))
    .concat(((INDEX.extra && INDEX.extra.rows) || []).map(normalizeExtra));
  var AUDIENCES = ["kids", "teens", "adults"];
  var ALL = DATA;

  /* ------------------------------------------------------------------ */
  /* Interface strings (the game's own dialogue is English by design)    */
  /* ------------------------------------------------------------------ */
  var I18N = {
    ru: {
      navLibrary: "Cartoon World", eyebrow: "Английский по мультфильмам", libTitle: "Cartoon World",
      libLead: "Популярные мультфильмы на шести уровнях — от A0 до C1. Посмотрите серию — и ответьте её героям в переписке по-английски.",
      searchLabel: "Поиск", searchPh: "Название или сериал", levelLegend: "Уровень CEFR", allLevels: "Все уровни",
      topicLabel: "Тема", audienceLabel: "Для кого", lengthLabel: "Длительность", any: "Любая",
      audAny: "Все", audKids: "Дети", audTeens: "Подростки", audAdults: "Взрослые", warnLabel: "Для зрелой аудитории",
      lenShort: "До 5 минут", lenMid: "5–10 минут", lenLong: "Больше 10 минут",
      count: function (n) { return plural(n, "мультфильм", "мультфильма", "мультфильмов"); },
      emptyTitle: "Ничего не нашлось", emptyText: "Попробуйте другой уровень или уберите часть фильтров.", resetFilters: "Сбросить фильтры",
      speed: "Скорость", openYoutube: "Открыть на YouTube", level: "Уровень", min: "мин",
      loading: "Загружаем видео…", apiFailed: "Не удалось загрузить плеер YouTube.",
      apiFailedHint: "Возможно, YouTube недоступен в вашей сети. Миссия под видео всё равно доступна.",
      videoError: "Это видео сейчас нельзя воспроизвести здесь.", videoErrorHint: "Владелец мог удалить его или запретить встраивание.",
      watchOnYoutube: "Смотреть на YouTube", notFound: "Такого мультфильма нет в библиотеке.", backToLibrary: "Вернуться к библиотеке",
      reportHint: "Если видео не открывается, сообщите менеджеру код записи — его заменят.",
      levelPrelim: "Уровень предварительный", doneBadge: "Миссия выполнена", license: "Лицензия",
      footYoutube: "Видео встроены из YouTube. Смотря их, вы соглашаетесь с <a href=\"https://www.youtube.com/t/terms\" target=\"_blank\" rel=\"noopener\">Условиями YouTube</a> и <a href=\"https://policies.google.com/privacy\" target=\"_blank\" rel=\"noopener\">Политикой конфиденциальности Google</a>.",
      topics: { emotions: "Эмоции", friendship: "Дружба", adventure: "Приключения", communication: "Общение", family: "Семья", school: "Школа", travel: "Путешествия", food: "Еда", work: "Работа", play: "Игры", sport: "Спорт", shopping: "Покупки", health: "Здоровье", animals: "Животные", nature: "Природа", science: "Наука", numbers: "Числа", letters: "Буквы", weather: "Погода", humor: "Юмор", home: "Дом", celebrations: "Праздники", transport: "Транспорт" },
      levelNames: { A0: "Pre-A1 · первые слова", A1: "Простые фразы", A2: "Повседневные ситуации", B1: "Живой разговор", B2: "Юмор, идиомы, быстрая речь", C1: "Сатира, подтекст, ирония" },
      msTag: "Миссия", msTeaserFrom: "Тебе пишет", msTeaserText: "Откроется само после видео.", msOpenNow: "Начать приключение",
      msGoal: "Цель", msDevice: "Переписка с персонажем", msLog: "История переписки", msReplies: "Ответы", msYourTurn: "Твой ход:", msReplyLabel: "Твой ответ",
      msNote: "Вымышленная история по мотивам мультфильма. Ответы героя написаны заранее.",
      msDevices: { control: "Пульт миссии", detective: "Блокнот детектива", fantasy: "Волшебный свиток", library: "Зачарованное письмо", underwater: "Морская почта", space: "Корабельная связь", forest: "Дневник путешественника", town: "Сообщения", cozy: "Письмо", office: "Рабочий чат" },
      msPh: "Напиши ответ по-английски…", msSend: "Отправить", msKey: "Ctrl+Enter — отправить", msHint: "Подсказка", msVocab: "Слова и фразы",
      msDone: "Миссия выполнена!", msCopy: "Скопировать диалог", msCopied: "Скопировано", msAgain: "Пройти заново", msAgainSure: "Точно заново?", msYou: "Вы",
      msProgress: function (i, n) { return "Отвечено " + i + " из " + n; },
      msTyping: function (name) { return name + " печатает…"; },
      msWords: function (n) { return plural(n, "слово", "слова", "слов"); },
      msNeed: function (n) { return "нужно хотя бы " + n; },
      msShort: function (n) { return "Напиши ещё немного: нужно хотя бы " + n + " слов."; }
    },
    kk: {
      navLibrary: "Cartoon World", eyebrow: "Мультфильм арқылы ағылшын тілі", libTitle: "Cartoon World",
      libLead: "Танымал мультфильмдер алты деңгейде — A0-ден C1-ге дейін. Серияны көріп, оның кейіпкерлеріне ағылшынша жауап жазыңыз.",
      searchLabel: "Іздеу", searchPh: "Атауы немесе сериал", levelLegend: "CEFR деңгейі", allLevels: "Барлық деңгей",
      topicLabel: "Тақырып", audienceLabel: "Кімге", lengthLabel: "Ұзақтығы", any: "Кез келген",
      audAny: "Барлығы", audKids: "Балалар", audTeens: "Жасөспірімдер", audAdults: "Ересектер", warnLabel: "Ересек аудиторияға",
      lenShort: "5 минутқа дейін", lenMid: "5–10 минут", lenLong: "10 минуттан көп",
      count: function (n) { return n + " мультфильм"; },
      emptyTitle: "Ештеңе табылмады", emptyText: "Басқа деңгейді таңдаңыз немесе кейбір сүзгілерді алып тастаңыз.", resetFilters: "Сүзгілерді тазалау",
      speed: "Жылдамдық", openYoutube: "YouTube-та ашу", level: "Деңгей", min: "мин",
      loading: "Бейне жүктелуде…", apiFailed: "YouTube ойнатқышы жүктелмеді.",
      apiFailedHint: "Желіңізде YouTube қолжетімсіз болуы мүмкін. Бейне астындағы миссия бәрібір қолжетімді.",
      videoError: "Бұл бейнені қазір мұнда ойнату мүмкін емес.", videoErrorHint: "Иесі оны өшіруі немесе ендіруге тыйым салуы мүмкін.",
      watchOnYoutube: "YouTube-та көру", notFound: "Кітапханада мұндай мультфильм жоқ.", backToLibrary: "Кітапханаға оралу",
      reportHint: "Бейне ашылмаса, менеджерге жазба кодын хабарлаңыз — оны ауыстырады.",
      levelPrelim: "Деңгейі алдын ала", doneBadge: "Миссия орындалды", license: "Лицензия",
      footYoutube: "Бейнелер YouTube-тан ендірілген. Оларды көре отырып, сіз <a href=\"https://www.youtube.com/t/terms\" target=\"_blank\" rel=\"noopener\">YouTube шарттарымен</a> және <a href=\"https://policies.google.com/privacy\" target=\"_blank\" rel=\"noopener\">Google құпиялылық саясатымен</a> келісесіз.",
      topics: { emotions: "Эмоциялар", friendship: "Достық", adventure: "Шытырман оқиға", communication: "Қарым-қатынас", family: "Отбасы", school: "Мектеп", travel: "Саяхат", food: "Тағам", work: "Жұмыс", play: "Ойын", sport: "Спорт", shopping: "Сауда", health: "Денсаулық", animals: "Жануарлар", nature: "Табиғат", science: "Ғылым", numbers: "Сандар", letters: "Әріптер", weather: "Ауа райы", humor: "Әзіл", home: "Үй", celebrations: "Мерекелер", transport: "Көлік" },
      levelNames: { A0: "Pre-A1 · алғашқы сөздер", A1: "Қарапайым сөйлемдер", A2: "Күнделікті жағдайлар", B1: "Жанды әңгіме", B2: "Әзіл, идиома, жылдам сөйлеу", C1: "Сатира, астарлы мағына, кекесін" },
      msTag: "Миссия", msTeaserFrom: "Саған жазады:", msTeaserText: "Бейне біткен соң өздігінен ашылады.", msOpenNow: "Шытырманды бастау",
      msGoal: "Мақсат", msDevice: "Кейіпкермен хат алмасу", msLog: "Хат алмасу тарихы", msReplies: "Жауаптар", msYourTurn: "Сенің кезегің:", msReplyLabel: "Сенің жауабың",
      msNote: "Мультфильм желісімен жазылған ойдан шығарылған оқиға. Кейіпкер жауаптары алдын ала жазылған.",
      msDevices: { control: "Миссия пульті", detective: "Детектив блокноты", fantasy: "Сиқырлы шиыршық", library: "Сиқырлы хат", underwater: "Теңіз поштасы", space: "Кеме байланысы", forest: "Саяхатшы күнделігі", town: "Хабарламалар", cozy: "Хат", office: "Жұмыс чаты" },
      msPh: "Жауабыңды ағылшынша жаз…", msSend: "Жіберу", msKey: "Ctrl+Enter — жіберу", msHint: "Кеңес", msVocab: "Сөздер мен тіркестер",
      msDone: "Миссия орындалды!", msCopy: "Диалогты көшіру", msCopied: "Көшірілді", msAgain: "Қайта өту", msAgainSure: "Расымен қайта?", msYou: "Сіз",
      msProgress: function (i, n) { return n + " жауаптың " + i + "-і берілді"; },
      msTyping: function (name) { return name + " жазып жатыр…"; },
      msWords: function (n) { return n + " сөз"; },
      msNeed: function (n) { return "кемінде " + n + " керек"; },
      msShort: function (n) { return "Тағы аздап жазыңыз: кемінде " + n + " сөз керек."; }
    },
    en: {
      navLibrary: "Cartoon World", eyebrow: "English through cartoons", libTitle: "Cartoon World",
      libLead: "Popular cartoons on six levels, from A0 to C1. Watch an episode and reply to its characters in English.",
      searchLabel: "Search", searchPh: "Title or series", levelLegend: "CEFR level", allLevels: "All levels",
      topicLabel: "Topic", audienceLabel: "For whom", lengthLabel: "Length", any: "Any",
      audAny: "All", audKids: "Kids", audTeens: "Teens", audAdults: "Adults", warnLabel: "Mature audience",
      lenShort: "Up to 5 minutes", lenMid: "5–10 minutes", lenLong: "Over 10 minutes",
      count: function (n) { return n + (n === 1 ? " cartoon" : " cartoons"); },
      emptyTitle: "Nothing found", emptyText: "Try another level or remove some filters.", resetFilters: "Reset filters",
      speed: "Speed", openYoutube: "Open on YouTube", level: "Level", min: "min",
      loading: "Loading the video…", apiFailed: "Couldn't load the YouTube player.",
      apiFailedHint: "YouTube may be blocked on your network. The mission under the video is still available.",
      videoError: "This video can't be played here right now.", videoErrorHint: "The owner may have removed it or disabled embedding.",
      watchOnYoutube: "Watch on YouTube", notFound: "This cartoon isn't in the library.", backToLibrary: "Back to the library",
      reportHint: "If the video doesn't open, tell your manager this code and it will be replaced.",
      levelPrelim: "Preliminary level", doneBadge: "Mission complete", license: "License",
      footYoutube: "Videos are embedded from YouTube. By watching them you agree to the <a href=\"https://www.youtube.com/t/terms\" target=\"_blank\" rel=\"noopener\">YouTube Terms of Service</a> and the <a href=\"https://policies.google.com/privacy\" target=\"_blank\" rel=\"noopener\">Google Privacy Policy</a>.",
      topics: { emotions: "Emotions", friendship: "Friendship", adventure: "Adventure", communication: "Communication", family: "Family", school: "School", travel: "Travel", food: "Food", work: "Work", play: "Play", sport: "Sport", shopping: "Shopping", health: "Health", animals: "Animals", nature: "Nature", science: "Science", numbers: "Numbers", letters: "Letters", weather: "Weather", humor: "Humour", home: "Home", celebrations: "Celebrations", transport: "Transport" },
      levelNames: { A0: "Pre-A1 · first words", A1: "Simple phrases", A2: "Everyday situations", B1: "Real conversation", B2: "Humour, idioms, fast speech", C1: "Satire, subtext, irony" },
      msTag: "Mission", msTeaserFrom: "A message from", msTeaserText: "Opens by itself after the video.", msOpenNow: "Start the adventure",
      msGoal: "Goal", msDevice: "Chat with the character", msLog: "Chat history", msReplies: "Replies", msYourTurn: "Your turn:", msReplyLabel: "Your reply",
      msNote: "A made-up story inspired by the cartoon. The character's replies are written in advance.",
      msDevices: { control: "Mission console", detective: "Detective's notebook", fantasy: "Magic scroll", library: "Enchanted letter", underwater: "Sea mail", space: "Ship comms", forest: "Traveller's diary", town: "Messages", cozy: "Letter", office: "Work chat" },
      msPh: "Write your reply in English…", msSend: "Send", msKey: "Ctrl+Enter to send", msHint: "Hint", msVocab: "Words and phrases",
      msDone: "Mission complete!", msCopy: "Copy the dialogue", msCopied: "Copied", msAgain: "Play again", msAgainSure: "Sure?", msYou: "You",
      msProgress: function (i, n) { return "Answered " + i + " of " + n; },
      msTyping: function (name) { return name + " is typing…"; },
      msWords: function (n) { return n + (n === 1 ? " word" : " words"); },
      msNeed: function (n) { return "at least " + n + " needed"; },
      msShort: function (n) { return "Write a little more: at least " + n + " words."; }
    }
  };
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    var w = (m10 === 1 && m100 !== 11) ? one : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? few : many;
    return n + " " + w;
  }

  /* ------------------------------------------------------------------ */
  /* Store + progress (per viewer, optional)                             */
  /* ------------------------------------------------------------------ */
  /* Прогресс — общий с аккаунтом (cfg.progress, cartoons/progress.js), черновик ответа — устройство (cfg.draftKey):
     недописанный текст на другое устройство не везём. */
  var Drafts = {
    read: function () { try { return JSON.parse(localStorage.getItem(cfg.draftKey)) || {}; } catch (e) { return {}; } },
    get: function (id) { return this.read()[id] || ""; },
    set: function (id, v) { try { var d = this.read(); if (v) d[id] = v; else delete d[id]; localStorage.setItem(cfg.draftKey, JSON.stringify(d)); } catch (e) { /* not remembered */ } }
  };
  var Progress = {
    all: function () { return cfg.progress.read().missions || {}; },
    get: function (id) { var r = Object.assign({}, this.all()[id] || {}); r.draft = Drafts.get(id); return r; },
    set: function (id, patch) {
      var p = Object.assign({}, patch);
      if ("draft" in p) { Drafts.set(id, p.draft); delete p.draft; }
      if (!Object.keys(p).length) return;
      cfg.progress.update(function (st) { var r = st.missions[id] || (st.missions[id] = { turns: [] }); for (var k in p) r[k] = p[k]; r.u = Date.now(); });
    },
    reset: function (id) { Drafts.set(id, ""); cfg.progress.update(function (st) { delete st.missions[id]; }); },
    done: function (id) { var r = this.all()[id] || {}; return !!(r.done && r.turns && r.turns.length); }
  };
  /* язык интерфейса — приложения; своего переключателя RU/KZ нет */
  var state = { ui: cfg.lang === "kk" || cfg.lang === "en" ? cfg.lang : "ru", filters: emptyFilters() };
  function t(key) { var v = I18N[state.ui][key]; return v === undefined ? I18N.ru[key] : v; }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */
  function $(sel, root) { return (root || ROOT).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || ROOT).querySelectorAll(sel)); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function fmtTime(sec) { sec = Math.max(0, Math.floor(sec)); var m = Math.floor(sec / 60), s = sec % 60; return m + ":" + (s < 10 ? "0" : "") + s; }
  function findEpisode(id) { for (var i = 0; i < DATA.length; i++) if (DATA[i].id === id) return DATA[i]; return null; }
  function shuffle(a) { var b = a.slice(); for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = b[i]; b[i] = b[j]; b[j] = x; } return b; }
  function sample(a, n) { return shuffle(a).slice(0, n); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function article(w) { return /^[aeiou]/i.test(w) ? "an" : "a"; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function badge(text, mod) { return el("span", { class: "ct-badge" + (mod ? " ct-badge--" + mod : ""), text: text }); }
  function audLabel(a) { return a === "kids" ? t("audKids") : a === "adults" ? t("audAdults") : t("audTeens"); }
  function topicName(tp) { return (t("topics") || {})[tp] || tp; }
  function emptyFilters() { return { q: "", levels: [], topic: "", audience: "", length: "" }; }
  function levelBand(lv) { return (lv === "A0" || lv === "A1") ? 0 : (lv === "A2" || lv === "B1") ? 1 : 2; }

  function applyStaticText() {
    ROOT.setAttribute("lang", state.ui);
    $all("[data-i18n]").forEach(function (n) { n.textContent = t(n.getAttribute("data-i18n")); });
    $all("[data-i18n-placeholder]").forEach(function (n) { n.setAttribute("placeholder", t(n.getAttribute("data-i18n-placeholder"))); });
    $all("[data-i18n-html]").forEach(function (n) { n.innerHTML = t(n.getAttribute("data-i18n-html")); });
  }

  /* ------------------------------------------------------------------ */
  /* Library                                                             */
  /* ------------------------------------------------------------------ */
  var Library = {
    init: function () {
      var self = this;
      $("#ct-q").addEventListener("input", function (e) { state.filters.q = e.target.value; self.render(); });
      $("#ct-topic").addEventListener("change", function (e) { state.filters.topic = e.target.value; self.render(); });
      $("#ct-length").addEventListener("change", function (e) { state.filters.length = e.target.value; self.render(); });
      $("#ct-filters").addEventListener("submit", function (e) { e.preventDefault(); });
      $("#ct-reset").addEventListener("click", function () { self.reset(); });
      $("#ct-clear").addEventListener("click", function () { self.reset(); $("#ct-q").focus(); });
    },
    reset: function () { state.filters = emptyFilters(); $("#ct-q").value = ""; this.buildControls(); this.render(); },
    buildControls: function () {
      var f = state.filters, chips = $("#ct-level-chips"), audBox = $("#ct-aud-chips");
      audBox.innerHTML = "";
      var audNames = { "": t("audAny"), kids: t("audKids"), teens: t("audTeens"), adults: t("audAdults") };
      [""].concat(AUDIENCES).forEach(function (a) {
        var n = live().filter(function (e) { return (!a || e.audience === a) && (!f.levels.length || f.levels.indexOf(e.level) >= 0); }).length;
        var b = el("button", { type: "button", class: "ct-seg__btn", "aria-pressed": String(f.audience === a), "data-aud": a }, [audNames[a], el("small", { text: String(n) })]);
        b.addEventListener("click", function () { f.audience = a; Library.buildControls(); Library.render(); });
        audBox.appendChild(b);
      });
      chips.innerHTML = "";
      var allBtn = el("button", { type: "button", class: "ct-chip", "aria-pressed": String(f.levels.length === 0), text: t("allLevels") });
      allBtn.addEventListener("click", function () { f.levels = []; Library.buildControls(); Library.render(); });
      chips.appendChild(allBtn);
      LEVELS.forEach(function (lv) {
        var n = live().filter(function (e) { return e.level === lv && (!f.audience || e.audience === f.audience); }).length;
        var b = el("button", { type: "button", class: "ct-chip", "aria-pressed": String(f.levels.indexOf(lv) >= 0), "data-level": lv }, [lv, el("small", { text: String(n) })]);
        b.addEventListener("click", function () { var i = f.levels.indexOf(lv); if (i >= 0) f.levels.splice(i, 1); else f.levels.push(lv); Library.buildControls(); Library.render(); });
        chips.appendChild(b);
      });
      var topics = {}; live().forEach(function (e) { (e.topics || []).forEach(function (tp) { topics[tp] = true; }); });
      var topicSel = $("#ct-topic"); topicSel.innerHTML = "";
      topicSel.appendChild(el("option", { value: "", text: t("any") }));
      Object.keys(topics).sort(function (a, b) { return topicName(a).localeCompare(topicName(b)); }).forEach(function (tp) {
        topicSel.appendChild(el("option", { value: tp, text: topicName(tp), selected: f.topic === tp }));
      });
      var lenSel = $("#ct-length"); lenSel.innerHTML = "";
      [["", t("any")], ["short", t("lenShort")], ["mid", t("lenMid")], ["long", t("lenLong")]].forEach(function (o) { lenSel.appendChild(el("option", { value: o[0], text: o[1], selected: f.length === o[0] })); });
    },
    match: function (ep) {
      var f = state.filters;
      if (f.levels.length && f.levels.indexOf(ep.level) < 0) return false;
      if (f.topic && (ep.topics || []).indexOf(f.topic) < 0) return false;
      if (f.audience && ep.audience !== f.audience) return false;
      if (f.length) {
        if (!ep.durationSec) return false;
        var m = ep.durationSec / 60;
        if (f.length === "short" && m > 5) return false;
        if (f.length === "mid" && (m <= 5 || m > 10)) return false;
        if (f.length === "long" && m <= 10) return false;
      }
      var q = f.q.trim().toLowerCase();
      if (q) {
        var hay = [ep.title, ep.description.ru, ep.description.kk, ep.level, ep.video.channel].concat((ep.topics || []).map(function (tp) { return topicName(tp) + " " + tp; }));
        if (hay.join(" \u0001 ").toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    },
    render: function () {
      var list = live().filter(this.match), grid = $("#ct-grid");
      grid.innerHTML = "";
      LEVELS.forEach(function (lv) {
        var items = list.filter(function (e) { return e.level === lv; });
        if (!items.length) return;
        var ul = el("ul", { class: "ct-grid" });
        items.forEach(function (ep) { ul.appendChild(card(ep)); });
        grid.appendChild(el("section", { class: "ct-shelf", "data-shelf": lv, "aria-labelledby": "ct-shelf-" + lv }, [
          el("div", { class: "ct-shelf__head" }, [
            el("h2", { class: "ct-shelf__title", id: "ct-shelf-" + lv, text: lv }),
            el("span", { class: "ct-shelf__count", "aria-label": t("count")(items.length), text: String(items.length) })
          ]), ul]));
      });
      $("#ct-empty").hidden = list.length > 0;
      var f = state.filters;
      $("#ct-clear").hidden = !(f.q.trim() || f.levels.length || f.topic || f.audience || f.length);
    }
  };

  function card(ep) {
    var img = el("img", { src: ep.video.thumbnail, alt: "", loading: "lazy", width: "480", height: "360" });
    var thumb = el("div", { class: "ct-card__thumb" }, [img, el("span", { class: "ct-card__level", "data-lv": ep.level, text: ep.level }),
      ep.durationSec ? el("span", { class: "ct-card__dur", text: fmtTime(ep.durationSec) }) : null]);
    img.addEventListener("error", function () { img.remove(); thumb.insertBefore(el("span", { class: "ct-card__thumb-fallback", text: ep.series || ep.title }), thumb.firstChild); });
    var foot = el("div", { class: "ct-card__foot" });
    if (ep.warning) foot.appendChild(badge(t("warnLabel"), "warn"));
    if (Progress.done(ep.id)) foot.appendChild(badge(t("doneBadge"), "ok"));
    var meta = [ep.video.channel].concat((ep.topics || []).slice(0, 2).map(topicName)).concat([ep.ages]).filter(Boolean).join(" · ");
    var heading = ep.series && ep.series !== ep.episodeTitle
      ? el("h3", { class: "ct-card__title" }, [el("span", { class: "ct-card__series", text: ep.series }), el("span", { text: ep.episodeTitle })])
      : el("h3", { class: "ct-card__title", text: ep.title });
    return el("li", { class: "ct-card" }, [
      el("a", { class: "ct-card__link", href: "#watch/" + encodeURIComponent(ep.id), "aria-label": ep.title + ", " + ep.level + (ep.durationSec ? ", " + fmtTime(ep.durationSec) : "") }, [
        thumb, el("div", { class: "ct-card__body" }, [heading, (ep.catalog && !ep.added ? null : el("p", { class: "ct-card__desc", text: ep.description[state.ui] || ep.description.ru })), foot])])
    ]);
  }

  /* ------------------------------------------------------------------ */
  /* YouTube adapter (official IFrame Player API only)                   */
  /* ------------------------------------------------------------------ */
  var ytApiPromise = null;
  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise(function (resolve, reject) {
      var prev = window.onYouTubeIframeAPIReady;
      var timer = setTimeout(function () { reject(new Error("timeout")); }, 12000);
      window.onYouTubeIframeAPIReady = function () { clearTimeout(timer); if (typeof prev === "function") { try { prev(); } catch (e) { /* ignore */ } } resolve(window.YT); };
      var s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api"; s.async = true;
      s.onerror = function () { clearTimeout(timer); reject(new Error("network")); };
      document.head.appendChild(s);
    });
    ytApiPromise.catch(function () { ytApiPromise = null; });
    return ytApiPromise;
  }
  function YouTubeAdapter(mountId, video, handlers) {
    this.video = video; this.handlers = handlers; this.player = null; this.ready = false; this.destroyed = false;
    var self = this;
    loadYouTubeApi().then(function (YT) {
      if (self.destroyed) return;
      self.player = new YT.Player(mountId, {
        videoId: video.id, host: "https://www.youtube-nocookie.com",
        playerVars: { playsinline: 1, rel: 0, origin: location.protocol.indexOf("http") === 0 ? location.origin : undefined },
        events: {
          onReady: function () { if (self.destroyed) return; self.ready = true; handlers.onReady(self); },
          onStateChange: function (e) { if (handlers.onState) handlers.onState(e.data); },
          onError: function (e) { handlers.onError("video", e.data); }
        }
      });
    }).catch(function (err) { if (!self.destroyed) handlers.onError("api", err && err.message); });
  }
  YouTubeAdapter.prototype.rates = function () { try { return this.player.getAvailablePlaybackRates() || [1]; } catch (e) { return [1]; } };
  YouTubeAdapter.prototype.setRate = function (r) { try { this.player.setPlaybackRate(r); } catch (e) { /* unsupported */ } };
  YouTubeAdapter.prototype.destroy = function () { this.destroyed = true; try { if (this.player && this.player.destroy) this.player.destroy(); } catch (e) { /* ignore */ } this.player = null; };

  /* ==================================================================== */
  /* CONVERSATION MISSIONS — the post-cartoon activity                    */
  /* A character messages the learner; the learner writes back; the       */
  /* character answers; the story ends after 2-3 replies.                 */
  /* No AI at runtime: every character reply is authored in advance in    */
  /* the mission's chat (loaded per video) and chosen by simple keyword        */
  /* matching on what the learner wrote (stems at word starts), with an   */
  /* authored fallback. Animations are plain CSS + a little JS.           */
  /* ==================================================================== */
  /* Миссия приходит с бэкенда при открытии видео (~8 КБ), а не всем файлом (6 МБ). null — у видео миссии нет. */
  var MISSIONS = {};
  function loadMission(id) {
    if (Object.prototype.hasOwnProperty.call(MISSIONS, id)) return Promise.resolve(MISSIONS[id]);
    return Promise.resolve().then(function () { return cfg.loadMission(id); })
      .then(function (m) { MISSIONS[id] = m || null; return MISSIONS[id]; }, function () { return null; });
  }
  var MISSION_BG = INDEX.bg || {};
  /* the scene intro stays short: at most two sentences */
  function shortText(x) {
    x = String(x || "").replace(/\s+/g, " ").trim(); var p = x.match(/[^.!?]+[.!?]+(\s|$)/g);
    return p && p.length > 2 ? p.slice(0, 2).join("").trim() : x;
  }
  var MISSION_THEMES = ["control", "detective", "fantasy", "library", "underwater", "space", "forest", "town", "cozy", "office"];
  /* minimum words per reply (a soft floor so one-word answers are not sent) */
  var MIN_WORDS = { A0: 3, A1: 4, A2: 6, B1: 8, B2: 12, C1: 16 };

  function themeOf(m) { return MISSION_THEMES.indexOf(m.theme) >= 0 ? m.theme : "cozy"; }
  function reduced() { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function initialOf(name) {
    var n = String(name || "?").replace(/^(the|mr\.?|mrs\.?|ms\.?|dr\.?|miss|captain|professor|prof\.?|coach|editor|uncle|aunt|grandma|grandpa|king|queen|princess|prince|lord|lady)\s+/i, "");
    return (n.charAt(0) || "?").toUpperCase();
  }

  var Mission = {
    ep: null, m: null, chat: null, open: false, turns: [], idx: 0, busy: false, fast: false, cancel: null,
    hintsShown: 0, saveTimer: null, dirty: false, io: null, stage: null,
    host: function () { return $("#ct-mission"); },
    mount: function (ep) {
      this.destroy();
      var self = this, g = this.gen, host = this.host();
      this.ep = ep; if (!host) return;
      host.innerHTML = ""; host.hidden = true;
      loadMission(ep.id).then(function (m) {
        if (self.gen !== g || self.ep !== ep) return;
        self.m = m || null; self.chat = self.m && self.m.chat || null;
        if (!self.chat || !self.chat.turns || !self.chat.turns.length) { self.m = null; self.chat = null; return; }
        host.hidden = false;
        var saved = Progress.get(ep.id);
        if (saved.turns && saved.turns.length) { self.open = true; self.build(false); } else { self.open = false; self.renderTeaser(); }
        /* видео успело кончиться, пока миссия ехала */
        if (self.endedEarly && !self.open) self.show(true);
      });
    },
    destroy: function () {
      this.flush();
      this.gen = (this.gen || 0) + 1; if (this.cancel) this.cancel = null;
      if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
      if (this.io) { this.io.disconnect(); this.io = null; }
      var host = this.host(); if (host) { host.innerHTML = ""; host.hidden = true; }
      this.ep = null; this.m = null; this.chat = null; this.open = false; this.stage = null; this.busy = false; this.endedEarly = false;
    },
    /* Called when the video ends: the character's message arrives. */
    videoEnded: function () { if (this.chat && !this.open) this.show(true); else if (!this.chat) this.endedEarly = true; },
    show: function (focus) {
      if (!this.chat) return;
      var was = this.open;
      this.open = true; this.build(!was);
      if (focus && !was) {
        var host = this.host();
        try { host.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); } catch (e) { host.scrollIntoView(); }
        var h = $("#ct-ms-title"); if (h) h.focus({ preventScroll: true });
      }
    },
    /* Language switch: rebuild without replaying intro animations. */
    render: function () { this.flush(); this.build(false); },
    bg: function () { var m = this.m; return MISSION_BG[themeOf(m)] ? "url(\"" + MISSION_BG[themeOf(m)] + "\")" : ""; },
    renderTeaser: function () {
      var host = this.host(), m = this.m, who = this.chat.who || {}, theme = themeOf(m), tx = m[state.ui] || m.ru || {};
      host.innerHTML = "";
      var bgUrl = this.bg();
      var box = el("section", { class: "ct-portal", "data-theme": theme, "aria-label": m.title }, [
        el("div", { class: "ct-portal__bg", "aria-hidden": "true", style: bgUrl ? "background-image:" + bgUrl : null }),
        this.lettersLayer(),
        el("div", { class: "ct-portal__row" }, [
          el("div", { class: "ct-portal__ring", "aria-hidden": "true" }, [el("span", { class: "ct-av2", text: initialOf(who.name) })]),
          el("div", { class: "ct-portal__txt" }, [
            el("p", { class: "ct-portal__tag", text: who.name || "" }),
            el("h3", { class: "ct-portal__title", text: m.title }),
            el("button", { type: "button", class: "ct-btn ct-btn--lg", id: "ct-ms-open", text: t("msOpenNow"), onclick: function () { Mission.show(true); } })
          ])
        ])
      ]);
      host.appendChild(box);
    },

    /* ---------------- build the stage ---------------- */
    build: function (intro) {
      var self = this, m = this.m, chat = this.chat, ep = this.ep, host = this.host(), theme = themeOf(m), who = chat.who || {};
      host.innerHTML = "";
      if (this.io) { this.io.disconnect(); this.io = null; }
      var saved = Progress.get(ep.id), tx = m[state.ui] || m.ru || {};
      this.turns = (saved.turns || []).slice(); this.idx = this.turns.length; this.hintsShown = 0; this.busy = false; this.fast = false;
      var animate = !!intro && !reduced();

      var stage = el("section", { class: "ct-stage", "data-theme": theme, "aria-labelledby": "ct-ms-title" });
      if (animate) stage.classList.add("is-enter");
      var bgUrl = this.bg(); stage.appendChild(el("div", { class: "ct-stage__bg", "aria-hidden": "true", style: bgUrl ? "background-image:" + bgUrl : null }));
      stage.appendChild(this.lettersLayer());
      /* head */
      var title = el("h2", { class: "ct-stage__title", id: "ct-ms-title", tabindex: "-1", "aria-label": m.title });
      this.assemble(title, m.title, animate);
      var head = el("header", { class: "ct-stage__head" }, [
        title,
        el("p", { class: "ct-goal" }, [el("span", { class: "ct-goal__v", text: m.goal || "" }), (tx.goal && state.ui !== "en" && !/^(B2|C1)$/.test(ep.level)) ? el("span", { class: "ct-goal__tr", lang: state.ui, text: tx.goal }) : null])
      ]);
      stage.appendChild(head);
      /* device */
      var dev = el("section", { class: "ct-dev", "data-theme": theme, "aria-label": t("msDevice") });
      dev.appendChild(el("header", { class: "ct-dev__bar" }, [
        el("span", { class: "ct-av2 ct-av2--sm", "aria-hidden": "true", text: initialOf(who.name) }),
        el("div", { class: "ct-dev__id" }, [el("strong", { text: who.name || "" }), el("span", { id: "ct-ms-status", text: who.role || "" })]),
        this.pips()
      ]));
      var log = el("div", { class: "ct-dev__log", id: "ct-ms-log", role: "log", "aria-live": "polite", "aria-label": t("msLog"), tabindex: "0" });
      log.addEventListener("click", function () { self.skip(); });
      dev.appendChild(log);
      dev.appendChild(el("div", { id: "ct-ms-tools" }));
      dev.appendChild(el("div", { id: "ct-ms-bottom" }));
      stage.appendChild(dev);
      stage.appendChild(el("p", { class: "ct-stage__note", text: t("msNote") }));
      stage.appendChild(el("div", { class: "ct-fx", "aria-hidden": "true" }));
      host.appendChild(stage);
      this.stage = stage;
      if ("IntersectionObserver" in window) {
        this.io = new IntersectionObserver(function (es) { stage.classList.toggle("is-off", !es[0].isIntersecting); }, { threshold: 0 });
        this.io.observe(stage);
      }

      /* log: restore stored turns instantly, then (re)start the conversation */
      (chat.open || []).forEach(function (txt) { self.append("char", txt, true); });
      this.turns.forEach(function (rec, i) {
        self.append("me", rec.t, true);
        if (i < self.turns.length - 1 || rec.replied !== false) self.append("char", replyFor(chat, i, rec), true);
      });
      if (saved.done && this.idx >= chat.turns.length) { this.finish(true); return; }
      if (this.idx >= chat.turns.length) { this.finish(true); return; }
      if (!this.turns.length && animate) {
        /* the very first message arrives like an incoming card */
        log.innerHTML = "";
        this.say(chat.open || [], function () { self.showTurn(true); }, true);
      } else self.showTurn(false);
    },

    /* title letters fly in and assemble */
    assemble: function (h, text, animate) {
      var i = 0;
      String(text).split(/\s+/).forEach(function (w) {
        var word = el("span", { class: "ct-w", "aria-hidden": "true" });
        w.split("").forEach(function (ch) {
          var s = el("span", { class: "ct-ch", text: ch });
          if (animate) { s.style.setProperty("--i", String(i++)); s.style.setProperty("--dx", Math.round(rnd(-160, 160)) + "px"); s.style.setProperty("--dy", Math.round(rnd(-90, 90)) + "px"); s.style.setProperty("--dr", Math.round(rnd(-160, 160)) + "deg"); }
          else s.style.animation = "none";
          word.appendChild(s);
        });
        h.appendChild(word);
      });
    },
    /* slowly drifting glowing letters taken from this mission's own words */
    lettersLayer: function () {
      var m = this.m, pool = (String(m.title || "") + " " + (m.vocab || []).join(" ")).toUpperCase().match(/[A-Z]/g) || "ABCDEFGHIJKLMNOPRSTW".split("");
      var layer = el("div", { class: "ct-letters", "aria-hidden": "true" }), n = window.innerWidth < 640 ? 9 : 16, cols = ["#ffffff", "#ffe08a", "#ffffff", "#bff6ff"];
      for (var i = 0; i < n; i++) {
        var s = el("span", { text: pool[Math.floor(Math.random() * pool.length)] });
        s.style.setProperty("--l", Math.round(rnd(2, 96)) + "%"); s.style.setProperty("--s", Math.round(rnd(20, 46)) + "px");
        s.style.setProperty("--d", Math.round(rnd(16, 30)) + "s"); s.style.setProperty("--dl", "-" + Math.round(rnd(0, 28)) + "s");
        s.style.setProperty("--x", Math.round(rnd(-90, 90)) + "px"); s.style.setProperty("--r0", Math.round(rnd(-25, 25)) + "deg"); s.style.setProperty("--rr", Math.round(rnd(-120, 120)) + "deg");
        s.style.setProperty("--o", rnd(.22, .5).toFixed(2)); s.style.setProperty("--c", cols[i % cols.length]);
        layer.appendChild(s);
      }
      return layer;
    },
    pips: function () {
      var n = this.chat.turns.length, done = Math.min(this.turns.length, n), box = el("div", { class: "ct-pips", role: "img", "aria-label": t("msProgress")(done, n) });
      box.appendChild(el("span", { class: "ct-pips__n", "aria-hidden": "true", text: Math.min(done + 1, n) + " / " + n }));
      box.appendChild(el("span", { class: "ct-pips__bar", "aria-hidden": "true" }, [el("i", { style: "width:" + Math.round(done / n * 100) + "%" })]));
      return box;
    },
    updatePips: function (pulse) {
      var old = $(".ct-pips", this.stage); if (!old) return; var np = this.pips(); old.replaceWith(np);
      if (pulse) { var d = $(".ct-pips__n", np); if (d) this.burst(d, 12); }
    },

    /* ---------------- messages ---------------- */
    append: function (kind, text, instant) {
      var log = $("#ct-ms-log"), who = this.chat.who || {}, last = log.lastElementChild;
      var row = el("div", { class: "ct-msg ct-msg--" + kind + (instant ? "" : " is-in") });
      if (kind === "char" && (!last || !last.classList.contains("ct-msg--char") || last.classList.contains("ct-typing"))) row.appendChild(el("span", { class: "ct-msg__who", text: who.name || "" }));
      var bub = el("div", { class: "ct-msg__t" });
      if (instant || kind === "me") bub.textContent = text;
      else { bub.appendChild(el("span", { class: "ct-sr", text: text })); bub.appendChild(el("span", { class: "ct-reveal", "aria-hidden": "true" })); }
      row.appendChild(bub); log.appendChild(row); this.toBottom();
      return { row: row, bub: bub };
    },
    toBottom: function () { var log = $("#ct-ms-log"); if (log) log.scrollTop = log.scrollHeight; },
    setStatus: function (typing) {
      var s = $("#ct-ms-status"), who = this.chat && this.chat.who || {}; if (!s) return;
      s.className = typing ? "is-typing" : ""; s.textContent = typing ? t("msTyping")(who.name || "") : (who.role || "");
    },
    /* The character writes: typing dots, then the message appears word by word. Click or start typing to skip. */
    say: function (texts, done, first) {
      var self = this, i = 0, who = this.chat.who || {}, g = this.gen || 0;
      this.busy = true; this.fast = false; this.syncComposer(); this.setStatus(true);
      (function next() {
        if (!self.chat || (self.gen || 0) !== g) return;
        if (i >= texts.length) { self.busy = false; self.cancel = null; self.setStatus(false); self.syncComposer(); if (done) done(); return; }
        var txt = texts[i++];
        if (self.fast || reduced()) { self.append("char", txt, true); return next(); }
        var log = $("#ct-ms-log"), last = log.lastElementChild;
        var ty = el("div", { class: "ct-msg ct-msg--char ct-typing is-in" }, [
          (!last || !last.classList.contains("ct-msg--char")) ? el("span", { class: "ct-msg__who", text: who.name || "" }) : null,
          el("div", { class: "ct-msg__t", role: "img", "aria-label": t("msTyping")(who.name || "") }, [el("i"), el("i"), el("i")])]);
        log.appendChild(ty); self.toBottom();
        var tm = setTimeout(function () { if ((self.gen || 0) !== g) return; reveal(); }, Math.min(900, 350 + txt.length * 8));
        self.cancel = function () { clearTimeout(tm); reveal(); };
        function reveal() {
          if ((self.gen || 0) !== g || !self.chat) return;
          if (ty.parentNode) ty.remove();
          var node = self.append("char", txt, false), vis = $(".ct-reveal", node.bub), words = txt.split(/(\s+)/), k = 0;
          if (first && i === 1) { var h = $(".ct-msg--char", $("#ct-ms-log")); }
          var iv = setInterval(function () { if ((self.gen || 0) !== g || !self.chat) { clearInterval(iv); return; } k += 2; vis.textContent = words.slice(0, k).join(""); self.toBottom(); if (k >= words.length) stop(); }, 32);
          function stop() { clearInterval(iv); vis.textContent = txt; self.cancel = null; self.toBottom(); next(); }
          self.cancel = function () { clearInterval(iv); vis.textContent = txt; self.cancel = null; self.toBottom(); next(); };
        }
      })();
    },
    skip: function () { this.fast = true; if (this.cancel) { var c = this.cancel; this.cancel = null; c(); } },

    /* ---------------- one learner turn ---------------- */
    showTurn: function (focus) {
      var self = this, chat = this.chat, turn = chat.turns[this.idx], lv = this.ep.level, tools = $("#ct-ms-tools"), bottom = $("#ct-ms-bottom");
      if (!turn) return;
      this.hintsShown = 0;
      tools.innerHTML = ""; bottom.innerHTML = "";
      var wrap = el("div", { class: "ct-tools" });
      wrap.appendChild(el("p", { class: "ct-tools__ask" }, [turn.ask || ""]));
      if (turn.prompts && turn.prompts.length && !(turn.starters && turn.starters.length)) wrap.appendChild(el("p", { class: "ct-tools__prompts", text: turn.prompts.join(" · ") }));
      var tips = el("ul", { class: "ct-tips", "aria-live": "polite" });
      var hbtn = null;
      if (turn.hints && turn.hints.length) {
        hbtn = el("button", { type: "button", class: "ct-tbtn", id: "ct-ms-hint" });
        var upd = function () {
          tips.innerHTML = ""; turn.hints.slice(0, self.hintsShown).forEach(function (h) { tips.appendChild(el("li", { text: h })); });
          hbtn.textContent = t("msHint") + " (" + self.hintsShown + "/" + turn.hints.length + ")"; hbtn.hidden = self.hintsShown >= turn.hints.length;
        };
        hbtn.addEventListener("click", function () { if (self.hintsShown < turn.hints.length) { self.hintsShown++; upd(); } });
        upd();
      }
      var row = el("div", { class: "ct-tools__row" }); if (hbtn) row.appendChild(hbtn);
      if (this.m.vocab && this.m.vocab.length) row.appendChild(el("details", { class: "ct-vocab" }, [el("summary", { class: "ct-tbtn", text: t("msVocab") }), el("div", { class: "ct-vocab__chips" }, this.m.vocab.map(function (w) { return el("button", { type: "button", class: "ct-chip2", text: w, onclick: function () { self.insert(w); } }); }))]));
      wrap.appendChild(row); wrap.appendChild(tips);
      if (turn.starters && turn.starters.length) wrap.appendChild(el("div", { class: "ct-vocab__chips" }, turn.starters.map(function (s) { return el("button", { type: "button", class: "ct-chip2 ct-chip2--start", text: s, onclick: function () { self.insert(s.replace(/\s*(\.\.\.|…)\s*$/, "") + " "); } }); })));
      tools.appendChild(wrap);

      var ta = el("textarea", { class: "ct-composer__text", id: "ct-ms-text", rows: "2", placeholder: t("msPh"), spellcheck: "true", autocapitalize: "sentences", "aria-label": t("msReplyLabel") + ": " + (turn.ask || "") });
      var min = MIN_WORDS[lv] || 5, saved = Progress.get(this.ep.id);
      ta.value = saved.draft || "";
      var send = el("button", { type: "submit", class: "ct-send", id: "ct-ms-send", title: t("msKey"), text: t("msSend") });
      var count = el("span", { id: "ct-ms-count", "aria-live": "off" });
      var note = el("p", { class: "ct-composer__note", id: "ct-ms-note", role: "status", "aria-live": "polite" });
      var refresh = function () {
        var n = countWords(ta.value); count.textContent = t("msWords")(n) + (n < min ? " · " + t("msNeed")(min) : "");
        ta.style.height = "auto"; ta.style.height = Math.min(220, ta.scrollHeight + 2) + "px";
      };
      ta.addEventListener("input", function () { self.skip(); self.dirty = true; note.textContent = ""; refresh(); self.queueSave(); });
      ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); self.send(); } });
      var form = el("form", { class: "ct-composer", novalidate: "novalidate" }, [
        el("div", { class: "ct-composer__row" }, [ta, send]), note,
        el("div", { class: "ct-composer__foot" }, [count])]);
      form.addEventListener("submit", function (e) { e.preventDefault(); self.send(); });
      bottom.appendChild(form);
      this.syncComposer(); refresh();
      if (focus && !this.busy && window.innerWidth > 640) ta.focus({ preventScroll: true });
    },
    syncComposer: function () { var s = $("#ct-ms-send"), ta = $("#ct-ms-text"); if (s) s.disabled = this.busy; if (ta) ta.setAttribute("aria-busy", this.busy ? "true" : "false"); },
    insert: function (s) {
      var ta = $("#ct-ms-text"); if (!ta) return;
      var v = ta.value, a = ta.selectionStart == null ? v.length : ta.selectionStart, b = ta.selectionEnd == null ? v.length : ta.selectionEnd;
      var pre = v.slice(0, a), add = (pre && !/\s$/.test(pre) ? " " : "") + s;
      ta.value = pre + add + v.slice(b); var pos = (pre + add).length; ta.focus(); ta.setSelectionRange(pos, pos);
      this.dirty = true; ta.dispatchEvent(new Event("input", { bubbles: true }));
    },
    send: function () {
      var self = this, chat = this.chat, ep = this.ep;
      if (this.busy) return;
      var ta = $("#ct-ms-text"), note = $("#ct-ms-note"), text = ta.value.trim(), min = MIN_WORDS[ep.level] || 5;
      var turn = chat.turns[this.idx], last = this.idx >= chat.turns.length - 1, rec = { t: text, p: -1, w: "" };
      /* подсказка, переписанная дословно, проходит и короче минимума (chat.js, isHintText) */
      if (countWords(text) < min && !isHintText(turn, text)) { note.textContent = t("msShort")(min); ta.focus(); return; }
      if (!last) { var r = pickPath(turn, text); rec.p = r.i; rec.w = r.word; }
      this.turns.push(rec); this.idx = this.turns.length;
      if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
      Progress.set(ep.id, { turns: this.turns, draft: "" }); this.dirty = false;
      this.letterRise(ta, text);
      var mine = this.append("me", text, false);
      ta.value = ""; ta.style.height = "auto"; note.textContent = "";
      var reply = replyFor(chat, this.idx - 1, rec);
      this.say([reply], function () {
        self.updatePips(true);
        if (last) self.finish(false); else self.showTurn(true);
      });
    },
    queueSave: function () { var self = this; if (this.saveTimer) clearTimeout(this.saveTimer); this.saveTimer = setTimeout(function () { self.saveTimer = null; self.flush(); }, 500); },
    flush: function () {
      if (!this.ep || !this.dirty) return;
      var ta = $("#ct-ms-text"); if (!ta) { this.dirty = false; return; }
      Progress.set(this.ep.id, { draft: ta.value }); this.dirty = false;
    },

    /* ---------------- ending ---------------- */
    finish: function (instant) {
      var self = this, chat = this.chat, ep = this.ep, tools = $("#ct-ms-tools"), bottom = $("#ct-ms-bottom");
      if (!Progress.done(ep.id)) { Progress.set(ep.id, { done: true, at: Date.now() }); onMissionDone(ep.id); }
      tools.innerHTML = ""; bottom.innerHTML = ""; this.busy = false; this.setStatus(false);
      var head = el("h3", { class: "ct-done__h", tabindex: "-1", id: "ct-ms-done", "aria-label": t("msDone") });
      this.assemble(head, t("msDone"), !instant && !reduced());
      var note = el("p", { class: "ct-composer__note", id: "ct-ms-copied", role: "status", "aria-live": "polite" });
      var again = el("button", { type: "button", class: "ct-btn ct-btn--ghost", id: "ct-ms-again", text: t("msAgain") });
      var armed = false;
      again.addEventListener("click", function () {
        if (!armed) { armed = true; again.textContent = t("msAgainSure"); setTimeout(function () { armed = false; again.textContent = t("msAgain"); }, 3000); return; }
        Progress.reset(ep.id); self.build(true);
      });
      bottom.appendChild(el("div", { class: "ct-done" }, [head,
        chat.end ? el("p", { class: "ct-done__end", text: chat.end }) : null,
        el("div", { class: "ct-done__acts" }, [
          el("button", { type: "button", class: "ct-btn", id: "ct-ms-copy", text: t("msCopy"), onclick: function () { self.copy(self.transcript()); } }),
          again,
          el("a", { class: "ct-btn ct-btn--ghost", href: "#", text: t("backToLibrary"), onclick: function (e) { e.preventDefault(); go(""); } })]),
        note]));
      this.updatePips(false);
      if (!instant) {
        var h = $("#ct-ms-done"); if (h) { var self2 = this; setTimeout(function () { if (self2.stage) self2.burst(h, 26); }, 250); h.focus({ preventScroll: true }); }
        try { $("#ct-ms-done").scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) { /* ok */ }
      }
    },
    transcript: function () {
      var chat = this.chat, who = (chat.who && chat.who.name) || "Character", out = [];
      (chat.open || []).forEach(function (x) { out.push(who + ": " + x); });
      this.turns.forEach(function (rec, i) { out.push((t("msYou") || "You") + ": " + rec.t); out.push(who + ": " + replyFor(chat, i, rec)); });
      return out.join("\n\n");
    },
    copy: function (text) {
      var note = $("#ct-ms-copied"), ok = function () { if (note) note.textContent = t("msCopied"); };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(ok, function () { /* not copied */ }); return; }
      var ta = el("textarea", { "aria-hidden": "true", style: "position:fixed;opacity:0;left:-9999px" }); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { /* not copied */ } ta.remove();
    },

    /* ---------------- effects ---------------- */
    anchorXY: function (node) {
      var sr = this.stage.getBoundingClientRect(), r = node.getBoundingClientRect();
      return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, w: r.width };
    },
    burst: function (node, n) {
      if (reduced() || !this.stage || !node) return;
      var fx = $(".ct-fx", this.stage), p = this.anchorXY(node);
      for (var i = 0; i < n; i++) {
        var s = el("span", { class: "ct-spark" + (i % 3 === 0 ? " ct-spark--star" : "") }), a = rnd(0, 6.283), d = rnd(40, 120);
        s.style.left = p.x + "px"; s.style.top = p.y + "px"; s.style.setProperty("--tx", Math.round(Math.cos(a) * d) + "px"); s.style.setProperty("--ty", Math.round(Math.sin(a) * d - 20) + "px"); s.style.setProperty("--sz", Math.round(rnd(5, 11)) + "px");
        s.addEventListener("animationend", function (e) { e.target.remove(); }); fx.appendChild(s);
      }
    },
    /* the first letters of the sent message float up and away */
    letterRise: function (node, text) {
      if (reduced() || !this.stage || !node) return;
      var fx = $(".ct-fx", this.stage), p = this.anchorXY(node), ch = String(text).replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 10).split("");
      ch.forEach(function (c, i) {
        var s = el("span", { class: "ct-flyl", text: c });
        s.style.left = Math.round(p.x - p.w / 2 + 20 + (p.w - 40) * (i / Math.max(1, ch.length - 1))) + "px"; s.style.top = Math.round(p.y) + "px";
        s.style.setProperty("--tx", Math.round(rnd(-40, 40)) + "px"); s.style.setProperty("--ty", Math.round(-rnd(110, 220)) + "px"); s.style.setProperty("--rot", Math.round(rnd(-50, 50)) + "deg"); s.style.setProperty("--fs", Math.round(rnd(16, 26)) + "px");
        s.style.animationDelay = (i * 40) + "ms"; s.addEventListener("animationend", function (e) { e.target.remove(); }); fx.appendChild(s);
      });
    }
  };
  on(window, "pagehide", function () { Mission.flush(); });

  /* ------------------------------------------------------------------ */
  /* Watch: video on top, the game directly under it                     */
  /* ------------------------------------------------------------------ */
  var Watch = {
    ep: null, adapter: null,
    init: function () {
      $("#ct-rate").addEventListener("change", function (e) { if (Watch.adapter && Watch.adapter.ready) Watch.adapter.setRate(parseFloat(e.target.value)); });
    },
    open: function (id) {
      var ep = findEpisode(id);
      if (!ep) { this.close(); this.notFound(); return; }
      if (this.ep && this.ep.id === ep.id) return;
      this.close(); this.ep = ep;
      this.renderMeta(ep); this.mountPlayer(ep); Mission.mount(ep);
    },
    close: function () {
      if (this.adapter) { this.adapter.destroy(); this.adapter = null; }
      Mission.destroy();
      this.ep = null;
      var v = $("#ct-video"); if (v) v.innerHTML = "";
    },
    notFound: function () {
      $("#ct-ep-eyebrow").textContent = ""; $("#ct-ep-title").textContent = t("notFound");
      $("#ct-ep-tags").innerHTML = ""; $("#ct-credit").hidden = true; $("#ct-controls").hidden = true; $("#ct-mission").hidden = true;
      $("#ct-video").innerHTML = ""; $("#ct-video").appendChild(el("div", { class: "ct-video__state" }, [el("a", { class: "ct-btn", href: "#", "data-route": "library", text: t("backToLibrary"), onclick: function (e) { e.preventDefault(); go(""); } })]));
      $("#ct-crumb-current").textContent = "";
    },
    renderMeta: function (ep) {
      $("#ct-controls").hidden = false;
      $("#ct-ep-eyebrow").textContent = ep.series && ep.series !== ep.episodeTitle ? ep.series : "";
      $("#ct-ep-title").textContent = ep.episodeTitle || ep.title;
      var tags = $("#ct-ep-tags"); tags.innerHTML = "";
      var items = [badge(ep.level, "plain")];
      if (ep.warning) items.push(badge(ep.warning[state.ui] || ep.warning.ru, "warn"));
      if (ep.durationSec) items.push(badge(fmtTime(ep.durationSec), "plain"));
      items.forEach(function (b) { tags.appendChild(el("li", {}, [b])); });
      var link = $("#ct-yt-link"); link.href = ep.video.watchUrl; link.textContent = t("openYoutube");
      var credit = $("#ct-credit");
      if (ep.license) { credit.hidden = false; credit.innerHTML = ""; credit.appendChild(document.createTextNode(t("license") + ": ")); credit.appendChild(el("a", { href: ep.license.url, target: "_blank", rel: "noopener", text: ep.license.name })); credit.appendChild(document.createTextNode(" · " + ep.license.attribution)); }
      else credit.hidden = true;
      $("#ct-crumb-current").textContent = ep.title;
    },
    mountPlayer: function (ep) {
      var self = this, box = $("#ct-video");
      box.innerHTML = ""; var ytEl = el("div", { id: "ct-yt" }); box.appendChild(ytEl);
      var state = el("div", { class: "ct-video__state", id: "ct-video-state" }, [el("div", { class: "ct-spinner", role: "status", "aria-label": t("loading") })]);
      box.appendChild(state);
      var rate = $("#ct-rate"); rate.disabled = true; $("#ct-rate-box").hidden = true;
      this.adapter = new YouTubeAdapter(ytEl, ep.video, {
        onReady: function (a) {
          state.hidden = true;
          var rates = a.rates(); rate.innerHTML = "";
          rates.forEach(function (r) { rate.appendChild(el("option", { value: String(r), text: r + "×", selected: r === 1 })); });
          rate.disabled = rates.length < 2; $("#ct-rate-box").hidden = rates.length < 2;
        },
        onState: function (s) { if (s === 0) Mission.videoEnded(); },
        onError: function (kind) { self.showError(ep, kind); }
      });
    },
    showError: function (ep, kind) {
      var st = $("#ct-video-state"); if (!st) return;
      st.hidden = false; st.innerHTML = "";
      st.appendChild(el("p", {}, [el("strong", { text: kind === "api" ? t("apiFailed") : t("videoError") })]));
      st.appendChild(el("p", { text: kind === "api" ? t("apiFailedHint") : t("videoErrorHint") }));
      st.appendChild(el("a", { class: "ct-btn", href: ep.video.watchUrl, target: "_blank", rel: "noopener", text: t("watchOnYoutube") }));
      st.appendChild(el("p", { class: "ct-video__code" }, [t("reportHint") + " ", el("code", { text: ep.id })]));
    }
  };

  /* ------------------------------------------------------------------ */
  /* Router                                                              */
  /* ------------------------------------------------------------------ */
  function route() {
    var m = /^#watch\/(.+)$/.exec(HASH || "");
    var lib = $("#ct-library"), player = $("#ct-player-view");
    if (m) {
      lib.hidden = true; player.hidden = false;
      Watch.open(decodeURIComponent(m[1]));
      window.scrollTo(0, 0);
      $("#ct-main").focus({ preventScroll: true });
    } else {
      Watch.close();
      player.hidden = true; lib.hidden = false;
      Library.render();
      $("#ct-crumb-current").textContent = "";
    }
  }

  /* Нерабочие видео (удалены, закрыты, без встраивания) отсекает бэкенд при заливке (index.unavailable): прототип
     проверял 726 обложек в браузере ученика на каждом заходе, и сбой сети прятал рабочие видео на три дня. */
  function live() { return ALL.filter(function (e) { return !GONE[e.id]; }); }

  function boot() {
    if (!DATA.length) { $("#ct-count").textContent = "Cartoon list failed to load."; return; }
    applyStaticText();
    Library.init(); Library.buildControls(); Library.render();
    Watch.init();
    $all("[data-route='library']").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); go(""); });
    });
    /* свой роутер: карточки ведут на #watch/<id>, адрес приложения не трогаем */
    on(ROOT, "click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#watch/"]') : null;
      if (!a || !ROOT.contains(a)) return;
      e.preventDefault(); go(a.getAttribute("href"));
    });
    route();
  }

  boot();

  return {
    go: go,
    /** Для тестов: адрес движка, открытое видео и открыта ли миссия. */
    snapshot: function () { return { hash: HASH, ep: Watch.ep ? Watch.ep.id : null, missionOpen: !!Mission.open }; },
    /** Для тестов: поставить фильтры библиотеки, как прототипу через JTSCartoons.state (оракул). */
    filter: function (f) { state.filters = Object.assign(emptyFilters(), f); Library.buildControls(); Library.render(); },
    destroy: function () { Watch.close(); ac.abort(); ROOT.innerHTML = ""; }
  };
}
