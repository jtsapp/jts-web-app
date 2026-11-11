'use client'

// Tenses World — движок раздела 12 английских времён, перенесённый из прототипа
// методиста почти дословно (как Pronunciation World и «Числа»): карта времён,
// страница времени (видео-урок, правила, формулы, сигналы, ошибки, сравнения,
// Formula Lab, итог), путь практики в пять этапов и прохождение набора по
// одному заданию. Экран TensesPage монтирует его в Shadow DOM: классы прототипа
// (.btn, .card, .tile, .topbar) совпадают с глобальными классами сайта.
//
// Тело — пять блоков движка прототипа (языки, Formula Lab, схемы времени,
// практика, оболочка) в том же порядке и почти без правок, плюс TW.meta из
// блока конфигурации. Отличия — только связь с приложением (спека
// 2026-11-10-tenses-punctuation-world-design.md, «Сайт»):
// - данные — cfg.bundle с бэкенда (/mobile/tenses), а не глобальные TW и
//   TENSES_DATA из блоков данных; объект TW — свой у каждого монтажа;
// - роутер — переменная HASH вместо адреса страницы, клики по <a href="#…">
//   перехватываются в корне; stepnav и машина времени Formula Lab меняют HASH,
//   а не адрес страницы;
// - видео — <video src> по ссылке бакета (VIDEOS[id].src), постер — ссылкой;
//   записи нет (src: null) — сразу заглушка прототипа videoErr;
// - язык — атрибут lang и поиск [data-tr] на корне раздела, а не на <html> и
//   document; выбранный язык — cfg.lang / cfg.onLang (хранит экран);
// - прогресс {practice, last, visited} — cfg.progress() / cfg.onProgress(state)
//   (синк с аккаунтом), читается при каждом обращении, как хранилище прототипа;
// - звук — cfg.speak (Soniox, запасной — голос устройства) и cfg.stopSpeech
//   вместо speechSynthesis; остановка своей фразы — на каждой смене экрана и в
//   destroy() (чужой звук на общем <audio> — голос Луны — не трогаем);
// - уход со страницы времени отпускает <video> и наблюдатель секций; значок
//   «video» на карте — только у времени с роликом; повторный клик «Open the
//   map» снова прокручивает к карте; refresh() — перерисовка обзора на месте;
// - шапка без логотипа (у экрана своя шапка приложения); на хабе — «назад» из
//   раздела, если передан cfg.onExit;
// - ответ на задание (кроме «работы над ошибками») — в cfg.onAnswer(ok);
// - слушатели — через AbortController (шапки — свой на каждую отрисовку),
//   таймеры — через обёртку: destroy() снимает всё.
// Правило переноса: правка поведения — здесь и в прототипе одновременно, иначе
// следующая заливка прототипа предупредит «движок отличается» уже ложно.

/**
 * @param {HTMLElement} root  корень раздела (в Shadow DOM), внутри — <div id="tw-root">
 * @param {{ bundle: object, progress?: () => object, onProgress?: (state: object) => void,
 *   onAnswer?: (ok: boolean) => void, speak?: (text: string, opts: { onEnd: Function }) => void,
 *   stopSpeech?: () => void, lang?: string, onLang?: (lang: string) => void, onExit?: () => void }} cfg
 */
export function mountTenses(root, cfg) {
const { bundle, progress = () => null, onProgress = () => {}, onAnswer = () => {}, speak: sayText = null, stopSpeech: hush = () => {}, lang: startLang = 'en', onLang = () => {}, onExit = null } = cfg
const ROOT = root
if (!ROOT.querySelector('#tw-root')) ROOT.insertAdjacentHTML('beforeend', '<div id="tw-root"></div>')
let dead = false
const ac = new AbortController()
const on = (target, type, fn, opts = {}) => target.addEventListener(type, fn, { ...opts, signal: ac.signal })
let topAc = null // слушатели текущей шапки (bindTopbar)
const timers = new Set()
const setTimeout = (fn, ms) => { const id = globalThis.setTimeout(() => { timers.delete(id); if (!dead) fn() }, ms); timers.add(id); return id }
// id в тени: поиск по документу, как у прототипа, её не видит
const $id = (id) => ROOT.querySelector('[id="' + String(id).replace(/["\\]/g, '') + '"]')
const reportAnswer = (ok) => { try { onAnswer(!!ok) } catch (e) { /* навык — не повод ронять практику */ } }
let HASH = '#/'
function go(h) {
  h = String(h || '#/')
  if (dead) return
  if (h === HASH) {
    // прототип: повторный клик по #map снова прокручивал к карте (нативный якорь)
    if (h === '#map') { const m = $id('map'); if (m) m.scrollIntoView({ behavior: 'smooth' }) }
    return
  }
  HASH = h
  TW.route()
}
const copy = (x, empty) => (x == null ? empty : JSON.parse(JSON.stringify(x)))
const TW = copy(bundle.TW, {})
const TENSES_DATA = copy(bundle.TENSES_DATA, {})

TW.meta = function (id) {
  var parts = id.split("-");
  var group = parts[0];
  var aspect = parts.slice(1).join("-");
  var g = TW.GROUPS.filter(function (x) { return x.id === group; })[0];
  var a = TW.ASPECTS.filter(function (x) { return x.id === aspect; })[0];
  var name = g.name + " " + a.name;
  if (group === "future" && aspect === "simple") name = "Future Simple";
  return { id: id, group: group, aspect: aspect, groupInfo: g, aspectInfo: a, name: name, num: TW.ORDER.indexOf(id) + 1 };
};

/* Tenses World — languages: English (default) · Қазақша · Русский
   Text is rendered as <span data-tr> nodes; switching language rewrites them in place,
   so the video keeps playing and the game keeps its state. */
(function () {
  TW.LANGS = [["en", "EN", "English"], ["kz", "KZ", "Қазақша"], ["ru", "RU", "Русский"]];
  TW.lang = "en";
  var saved = startLang === "kk" ? "kz" : startLang; if (saved === "kz" || saved === "ru") TW.lang = saved;

  /* ---------- UI dictionary ---------- */
  var U = TW.UI = {
    brandSub: { en: "Tenses World", ru: "Мир времён", kz: "Шақтар әлемі" },
    map: { en: "Tense map", ru: "Карта времён", kz: "Шақтар картасы" },
    all12: { en: "All 12 tenses", ru: "Все 12 времён", kz: "Барлық 12 шақ" },
    prev: { en: "Previous", ru: "Предыдущее", kz: "Алдыңғы" },
    next: { en: "Next", ru: "Следующее", kz: "Келесі" },
    langHint: { en: "Translate", ru: "Перевод", kz: "Аударма" },
    // hub
    eyebrow: { en: "Grammar World · 12 tenses", ru: "Мир грамматики · 12 времён", kz: "Грамматика әлемі · 12 шақ" },
    heroTitleA: { en: "The World of English ", ru: "Мир английских ", kz: "Ағылшын " },
    heroTitleB: { en: "Tenses", ru: "времён", kz: "шақтарының әлемі" },
    heroLead: {
      en: "Three time zones, four ways to look at an action — twelve tenses on one clear map. Watch the video lesson, learn the rules, then practise step by step: from one tense at a time to all twelve together.",
      ru: "Три зоны времени, четыре взгляда на действие — двенадцать времён на одной понятной карте. Смотри видеоурок, разбирай правила и тренируйся шаг за шагом: от одного времени ко всем двенадцати.",
      kz: "Үш уақыт аймағы, әрекетке қараудың төрт тәсілі — бір түсінікті картадағы он екі шақ. Бейнесабақты көр, ережелерді түсін, сосын қадам-қадаммен жаттық: бір шақтан бастап он екі шаққа дейін."
    },
    startPS: { en: "Start with Present Simple", ru: "Начать с Present Simple", kz: "Present Simple-ден бастау" },
    continue: { en: "Continue: ", ru: "Продолжить: ", kz: "Жалғастыру: " },
    openMap: { en: "Open the map", ru: "Открыть карту", kz: "Картаны ашу" },
    howKicker: { en: "How it works", ru: "Как это устроено", kz: "Бұл қалай құрылған" },
    howTitle: { en: "Time × aspect", ru: "Время × вид действия", kz: "Уақыт × әрекет түрі" },
    howLead: {
      en: "Every tense answers two questions: **when?** and **how do we see the action?** Understand the system and all 12 names make sense.",
      ru: "Каждое время отвечает на два вопроса: **когда?** и **как мы смотрим на действие?** Пойми систему — и все 12 названий станут логичными.",
      kz: "Әр шақ екі сұраққа жауап береді: **қашан?** және **әрекетке қалай қараймыз?** Жүйені түсінсең, 12 атаудың бәрі қисынды бола бастайды."
    },
    how1t: { en: "Choose the time", ru: "Выбери время", kz: "Уақытты таңда" },
    how1: {
      en: "**Past**, **Present** or **Future** — these are the three columns of the map.",
      ru: "**Past** — прошлое, **Present** — настоящее, **Future** — будущее. Это три столбца карты.",
      kz: "**Past** — өткен, **Present** — осы, **Future** — келер уақыт. Бұл — картаның үш бағаны."
    },
    how2t: { en: "Choose the aspect", ru: "Выбери вид действия", kz: "Әрекет түрін таңда" },
    how2: {
      en: "**Simple** — a fact, **Continuous** — a process, **Perfect** — a result by a moment, **Perfect Continuous** — a process that lasted up to a moment.",
      ru: "**Simple** — факт, **Continuous** — процесс, **Perfect** — результат к моменту, **Perfect Continuous** — процесс, длившийся до момента.",
      kz: "**Simple** — дерек, **Continuous** — процесс, **Perfect** — белгілі сәтке дейінгі нәтиже, **Perfect Continuous** — белгілі сәтке дейін созылған процесс."
    },
    how3t: { en: "Follow the route", ru: "Пройди маршрут", kz: "Бағытпен жүр" },
    how3: {
      en: "Video lesson → grammar → formula lab → practice → summary. Then follow the practice path across all 12 tenses. Your progress is saved.",
      ru: "Видеоурок → грамматика → лаборатория формул → практика → итог. Затем — путь практики по всем 12 временам. Прогресс сохраняется.",
      kz: "Бейнесабақ → грамматика → формула зертханасы → жаттығу → қорытынды. Сосын — барлық 12 шақ бойынша жаттығу жолы. Прогресің сақталады."
    },
    mapKicker: { en: "Tense map", ru: "Карта времён", kz: "Шақтар картасы" },
    mapTitle: { en: "12 tenses on one map", ru: "12 времён на одной карте", kz: "Бір картадағы 12 шақ" },
    mapLead: {
      en: "Tap any tense. The colour shows the time zone; the line shows how the action looks on the timeline.",
      ru: "Нажми на любое время. Цвет — зона времени, линия — как действие выглядит на шкале.",
      kz: "Кез келген шақты бас. Түсі — уақыт аймағы, сызық — әрекеттің уақыт сызығында қалай көрінетіні."
    },
    videoBadge: { en: "▶ video", ru: "▶ видео", kz: "▶ бейне" },
    hubPrKicker: { en: "Practice", ru: "Практика", kz: "Жаттығу" },
    hubPrTitle: { en: "From one tense to all twelve", ru: "От одного времени ко всем двенадцати", kz: "Бір шақтан он екі шаққа дейін" },
    hubPrLead: { en: "Practice is kept separate from the lessons: short, focused sets with instant feedback, in five stages.", ru: "Практика отделена от уроков: короткие наборы заданий с мгновенной обратной связью, в пять этапов.", kz: "Жаттығу сабақтан бөлек: жылдам кері байланысы бар қысқа жиынтықтар, бес кезеңмен." },
    footer: {
      en: "Rules checked against Cambridge English Grammar Today, Swan's Practical English Usage, Oxford Learner's Grammar and British Council LearnEnglish.",
      ru: "Правила сверены с Cambridge English Grammar Today, Swan «Practical English Usage», Oxford Learner’s Grammar и British Council LearnEnglish.",
      kz: "Ережелер Cambridge English Grammar Today, Swan «Practical English Usage», Oxford Learner’s Grammar және British Council LearnEnglish бойынша тексерілді."
    },
    // tense page
    ofTwelve: { en: " of 12", ru: " из 12", kz: " / 12" },
    stepVideo: { en: "Video lesson", ru: "Видеоурок", kz: "Бейнесабақ" },
    stepGrammar: { en: "Grammar", ru: "Грамматика", kz: "Грамматика" },
    stepLab: { en: "Formula lab", ru: "Лаборатория", kz: "Зертхана" },
    stepPractice: { en: "Practice", ru: "Практика", kz: "Жаттығу" },
    stepReview: { en: "Summary", ru: "Итог", kz: "Қорытынды" },
    videoTitle: { en: "Video lesson", ru: "Видеоурок", kz: "Бейнесабақ" },
    videoSub: { en: "Start here: watch the whole video, then explore the rules below.", ru: "Начни отсюда: посмотри видео целиком, а потом переходи к правилам.", kz: "Осыдан баста: бейнені толық көріп, сосын төмендегі ережелерге өт." },
    videoSoonT: { en: "The video lesson is coming soon", ru: "Видеоурок скоро появится", kz: "Бейнесабақ жақында шығады" },
    videoSoon: {
      en: "Our team is preparing this video. Meanwhile, the rules, the formula lab and the practice are already waiting for you below.",
      ru: "Команда готовит это видео. А пока правила, лаборатория формул и практика уже ждут тебя ниже.",
      kz: "Команда бұл бейнені дайындап жатыр. Әзірге ережелер, формула зертханасы мен жаттығулар төменде күтіп тұр."
    },
    videoErr: { en: "The video could not be loaded.", ru: "Не удалось загрузить видео.", kz: "Бейнені жүктеу мүмкін болмады." },
    onTimeline: { en: "On the timeline", ru: "На линии времени", kz: "Уақыт сызығында" },
    past: { en: "past", ru: "прошлое", kz: "өткен" },
    now: { en: "now", ru: "сейчас", kz: "қазір" },
    future: { en: "future", ru: "будущее", kz: "келер" },
    grammarSub: { en: "Meaning, formulas, signal words, mistakes and comparison", ru: "Значение, формулы, сигналы, ошибки и сравнение", kz: "Мағынасы, формулалары, сигнал сөздер, қателер және салыстыру" },
    whenUse: { en: "When do we use it?", ru: "Когда используем", kz: "Қашан қолданамыз?" },
    formulas: { en: "Formulas", ru: "Формулы", kz: "Формулалар" },
    aff: { en: "Affirmative", ru: "Утверждение", kz: "Болымды" },
    neg: { en: "Negative", ru: "Отрицание", kz: "Болымсыз" },
    q: { en: "Question", ru: "Вопрос", kz: "Сұрақ" },
    lgS: { en: "subject", ru: "подлежащее", kz: "бастауыш" },
    lgA: { en: "helper verb", ru: "вспомогательный глагол", kz: "көмекші етістік" },
    lgV: { en: "main verb", ru: "смысловой глагол", kz: "негізгі етістік" },
    lgT: { en: "time", ru: "время", kz: "уақыт" },
    goodToKnow: { en: "Good to know", ru: "Важно знать", kz: "Білген жөн" },
    signalWords: { en: "Signal words", ru: "Слова-подсказки", kz: "Сигнал сөздер" },
    commonMistakes: { en: "Common mistakes", ru: "Частые ошибки", kz: "Жиі кездесетін қателер" },
    dontMix: { en: "Don't mix them up", ru: "Не перепутай", kz: "Шатастырма" },
    or: { en: " or ", ru: " или ", kz: " әлде " },
    sources: { en: "Sources", ru: "Источники", kz: "Дереккөздер" },
    labTitle: { en: "Formula lab", ru: "Лаборатория формул", kz: "Формула зертханасы" },
    labSub: { en: "Build a sentence yourself and see how it works", ru: "Собери предложение сам и посмотри, как оно устроено", kz: "Сөйлемді өзің құрап, қалай жасалатынын көр" },
    labTip: {
      en: "Pick who, the action and the form — the sentence builds itself and the colours show each part. Below is the time machine: the same action in all 12 tenses.",
      ru: "Выбери, кто, действие и форму — предложение соберётся само, а цвета покажут части. Ниже — машина времени: то же действие во всех 12 временах.",
      kz: "Кім, қандай әрекет және қай түр екенін таңда — сөйлем өзі құралады, ал түстер әр бөлігін көрсетеді. Төменде — уақыт машинасы: бір әрекет 12 шақтың бәрінде."
    },
    labWho: { en: "Who", ru: "Кто", kz: "Кім" },
    labAction: { en: "Action", ru: "Действие", kz: "Әрекет" },
    labForm: { en: "Form", ru: "Форма", kz: "Түрі" },
    labSpoken: { en: "In everyday speech: ", ru: "В разговорной речи: ", kz: "Ауызекі сөйлеуде: " },
    machine: { en: "Time machine — the same action in every tense", ru: "Машина времени — то же действие во всех временах", kz: "Уақыт машинасы — бір әрекет барлық шақта" },
    liveEx: { en: "Real-life examples", ru: "Живые примеры", kz: "Өмірлік мысалдар" },
    reviewTitle: { en: "Summary", ru: "Итог", kz: "Қорытынды" },
    reviewSub: { en: "The essentials in a nutshell", ru: "Самое главное — коротко", kz: "Ең бастысы — қысқаша" },
    backMap: { en: "Back to", ru: "Назад", kz: "Артқа" },
    notLoaded: { en: "The content for this tense is not loaded.", ru: "Материалы для этого времени не загружены.", kz: "Бұл шақтың материалдары жүктелмеді." }
  };

  /* ---------- rendering helpers ---------- */
  var reg = [];
  function pickText(obj) {
    if (obj == null) return "";
    if (typeof obj === "string") return U[obj] ? (U[obj][TW.lang] || U[obj].en) : obj;
    return obj[TW.lang] || obj.en || "";
  }
  TW.L = pickText; // plain text in current language
  TW.esc = TW.esc || function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  TW.md = TW.md || function (s) { return TW.esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, '<em class="en">$1</em>'); };
  // attribute form, for SVG <text> and similar: returns ' data-tr="i">text'
  TW.TA = function (obj) {
    if (typeof obj === "string" && U[obj]) obj = U[obj];
    var i = reg.push({ o: obj }) - 1;
    return ' data-tr="' + i + '">' + TW.esc(pickText(obj));
  };
  TW.T = function (obj, md) {
    if (typeof obj === "string" && U[obj]) obj = U[obj];
    var i = reg.push({ o: obj, md: !!md }) - 1;
    var s = pickText(obj);
    return '<span data-tr="' + i + '">' + (md ? TW.md(s) : TW.esc(s)) + "</span>";
  };
  // translation line for an English learning sentence — invisible in English mode
  TW.X = function (obj, cls) {
    var i = reg.push({ o: obj, x: true }) - 1;
    var s = TW.lang === "en" || !obj ? "" : (obj[TW.lang] || "");
    return '<span class="xlat ' + (cls || "") + '" data-tr="' + i + '"' + (s ? "" : " hidden") + ">" + TW.esc(s) + "</span>";
  };
  TW.setLang = function (l) {
    if (l === TW.lang) return;
    TW.lang = l;
    try { onLang(l); } catch (e) {}
    ROOT.setAttribute("lang", l === "kz" ? "kk" : l);
    ROOT.querySelectorAll("[data-tr]").forEach(function (el) {
      var r = reg[+el.getAttribute("data-tr")]; if (!r) return;
      if (r.x) { var s = l === "en" ? "" : (r.o && r.o[l]) || ""; el.textContent = s; el.hidden = !s; return; }
      var t = pickText(r.o); el.innerHTML = r.md ? TW.md(t) : TW.esc(t);
    });
    ROOT.querySelectorAll("[data-lang]").forEach(function (b) {
      var on = b.getAttribute("data-lang") === l; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
    });
    ROOT.dispatchEvent(new CustomEvent("tw:lang", { detail: l }));
  };
  TW.langSwitch = function (extra) {
    return '<div class="langs ' + (extra || "") + '" role="group" aria-label="Language / Тіл / Язык">' + TW.LANGS.map(function (x) {
      return '<button type="button" data-lang="' + x[0] + '" title="' + x[2] + '" aria-pressed="' + (TW.lang === x[0]) + '" class="' + (TW.lang === x[0] ? "on" : "") + '">' + x[1] + "</button>";
    }).join("") + "</div>";
  };
  on(ROOT, "click", function (e) {
    var b = e.target.closest && e.target.closest("[data-lang]");
    if (b) TW.setLang(b.getAttribute("data-lang"));
  });
  ROOT.setAttribute("lang", TW.lang === "kz" ? "kk" : TW.lang);
})();

/* Tenses World — sentence engine (Formula Lab) + answer normaliser */
(function () {

  TW.SUBJECTS = [
    { id: "I", t: "I", p: 1, pl: false },
    { id: "you", t: "you", p: 2, pl: false },
    { id: "he", t: "he", p: 3, pl: false },
    { id: "she", t: "she", p: 3, pl: false },
    { id: "we", t: "we", p: 1, pl: true },
    { id: "they", t: "they", p: 3, pl: true }
  ];

  // Dynamic (action) verbs only — they work naturally in all 12 tenses.
  TW.VERBS = [
    { id: "cook", v1: "cook", s: "cooks", ing: "cooking", v2: "cooked", v3: "cooked", obj: "dinner", ru: "готовить ужин" },
    { id: "play", v1: "play", s: "plays", ing: "playing", v2: "played", v3: "played", obj: "football", ru: "играть в футбол" },
    { id: "study", v1: "study", s: "studies", ing: "studying", v2: "studied", v3: "studied", obj: "English", ru: "учить английский" },
    { id: "read", v1: "read", s: "reads", ing: "reading", v2: "read", v3: "read", obj: "the news", ru: "читать новости" },
    { id: "write", v1: "write", s: "writes", ing: "writing", v2: "wrote", v3: "written", obj: "emails", ru: "писать письма" },
    { id: "clean", v1: "clean", s: "cleans", ing: "cleaning", v2: "cleaned", v3: "cleaned", obj: "the room", ru: "убирать комнату" }
  ];

  // Time expressions chosen so each sentence sounds natural in every form.
  TW.LAB_TIME = {
    "present-simple": { all: "every day" },
    "present-continuous": { all: "now" },
    "present-perfect": { aff: "already", neg: "yet", q: "yet", affMid: true },
    "present-perfect-continuous": { all: "for two hours" },
    "past-simple": { all: "yesterday" },
    "past-continuous": { all: "at 8 pm yesterday" },
    "past-perfect": { all: "before you called" },
    "past-perfect-continuous": { all: "for two hours when you called" },
    "future-simple": { all: "tomorrow" },
    "future-continuous": { all: "at 8 pm tomorrow" },
    "future-perfect": { all: "by 8 pm" },
    "future-perfect-continuous": { all: "for two hours by 8 pm" }
  };

  function third(s) { return s.p === 3 && !s.pl; }
  function be(s, past) {
    if (past) return (s.id === "I" || third(s)) ? "was" : "were";
    if (s.id === "I") return "am";
    return third(s) ? "is" : "are";
  }
  var NEG_C = { am: "'m not", is: "isn't", are: "aren't", was: "wasn't", were: "weren't", do: "don't", does: "doesn't", did: "didn't",
    have: "haven't", has: "hasn't", had: "hadn't", will: "won't" };

  /* Build a sentence as an array of parts: {w, k} where k = s|a|n|v|o|t.
     form: "aff" | "neg" | "q" */
  TW.buildSentence = function (tenseId, subj, verb, form) {
    var m = TW.meta(tenseId), g = m.group, a = m.aspect;
    var S = { w: subj.t, k: "s" };
    var aux = [];   // auxiliaries in order; first one moves in questions
    var main;
    if (a === "simple") {
      if (g === "present") {
        if (form === "aff") main = third(subj) ? verb.s : verb.v1; else { aux = [third(subj) ? "does" : "do"]; main = verb.v1; }
      } else if (g === "past") {
        if (form === "aff") main = verb.v2; else { aux = ["did"]; main = verb.v1; }
      } else { aux = ["will"]; main = verb.v1; }
    } else if (a === "continuous") {
      aux = g === "future" ? ["will", "be"] : [be(subj, g === "past")]; main = verb.ing;
    } else if (a === "perfect") {
      aux = g === "future" ? ["will", "have"] : [g === "past" ? "had" : (third(subj) ? "has" : "have")]; main = verb.v3;
    } else {
      aux = g === "future" ? ["will", "have", "been"] : [g === "past" ? "had" : (third(subj) ? "has" : "have"), "been"]; main = verb.ing;
    }
    var time = TW.LAB_TIME[tenseId];
    var t = time.all || time[form];
    var parts = [];
    var O = { w: verb.obj, k: "o" };
    if (form === "q") {
      var first = aux[0];
      parts.push({ w: cap(first), k: "a" }, S);
      aux.slice(1).forEach(function (x) { parts.push({ w: x, k: "a" }); });
      parts.push({ w: main, k: "v" }, O);
      if (t) parts.push({ w: t, k: "t" });
      parts.push({ w: "?", k: "p" });
    } else {
      parts.push({ w: cap(subj.t), k: "s" });
      if (aux.length) {
        parts.push({ w: aux[0], k: "a" });
        if (form === "neg") parts.push({ w: "not", k: "n" });
        aux.slice(1).forEach(function (x) { parts.push({ w: x, k: "a" }); });
      }
      if (form === "aff" && time.affMid && t) parts.push({ w: t, k: "t" });
      parts.push({ w: main, k: "v" }, O);
      if (t && !(form === "aff" && time.affMid)) parts.push({ w: t, k: "t" });
      parts.push({ w: ".", k: "p" });
    }
    return parts;
  };

  /* Contracted variant of the same sentence (or null if none). */
  TW.contract = function (parts, form) {
    if (form === "q") return null;
    var out = parts.map(function (p) { return { w: p.w, k: p.k }; });
    var sIdx = 0, aIdx = 1;
    if (!out[aIdx] || out[aIdx].k !== "a") return null;
    var auxW = out[aIdx].w;
    if (form === "neg") {
      if (auxW === "am") { out[sIdx].w = out[sIdx].w + "'m"; out.splice(aIdx, 2, { w: "not", k: "n" }); return out; }
      var c = NEG_C[auxW]; if (!c) return null;
      out.splice(aIdx, 2, { w: c, k: "an" }); return out;
    }
    var map = { am: "'m", is: "'s", are: "'re", have: "'ve", has: "'s", had: "'d", will: "'ll" };
    if (!map[auxW]) return null;
    out[sIdx].w = out[sIdx].w + map[auxW];
    out.splice(aIdx, 1);
    return out;
  };

  TW.partsToText = function (parts) {
    var s = "";
    parts.forEach(function (p) { s += (p.k === "p" || !s) ? p.w : " " + p.w; });
    return s;
  };

  function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
  TW.cap = cap;

  /* ---------------- answer normalisation ---------------- */
  var EXP = [
    [/\bwon't\b/g, "will not"], [/\bshan't\b/g, "shall not"], [/\bcan't\b/g, "can not"], [/\bcannot\b/g, "can not"],
    [/\bain't\b/g, "is not"], [/n't\b/g, " not"],
    // forgiving: contractions typed without an apostrophe (doesnt, wont, havent …)
    [/\bwont\b/g, "will not"], [/\bcant\b/g, "can not"],
    [/\b(do|does|did|is|are|was|were|have|has|had|could|would|should|must)nt\b/g, "$1 not"], [/'m\b/g, " am"], [/'re\b/g, " are"], [/'ve\b/g, " have"], [/'ll\b/g, " will"]
  ];
  function base(s) {
    s = String(s).toLowerCase().replace(/[‘’ʼ`´]/g, "'").replace(/[“”"]/g, "");
    s = s.replace(/[.,!?;:]+/g, " ").replace(/\s+/g, " ").trim();
    EXP.forEach(function (r) { s = s.replace(r[0], r[1]); });
    return s.replace(/\s+/g, " ").trim();
  }
  // 's and 'd are ambiguous → produce all expansions
  function variants(s) {
    var out = [base(s)];
    [["'s", ["is", "has", "'s"]], ["'d", ["had", "would"]]].forEach(function (pair) {
      var next = [];
      out.forEach(function (v) {
        if (v.indexOf(pair[0]) === -1) { next.push(v); return; }
        pair[1].forEach(function (rep) {
          next.push(v.replace(new RegExp("(\\w)" + pair[0] + "\\b", "g"), rep.charAt(0) === "'" ? "$1" + rep : "$1 " + rep));
        });
      });
      out = next;
    });
    return out;
  }
  TW.sameAnswer = function (input, answers) {
    var iv = variants(input);
    return answers.some(function (a) {
      var av = variants(a);
      return iv.some(function (x) { return av.indexOf(x) !== -1; });
    });
  };
})();

/* Tenses World — timeline diagrams (SVG) */
(function () {
  var REF = { past: 92, present: 170, future: 250 };
  var Y = 74;

  function wave(x1, x2, y, color, arrow) {
    var d = "M" + x1 + " " + y, step = 10, up = true;
    for (var x = x1; x < x2 - 1; x += step) {
      var nx = Math.min(x + step, x2);
      d += " Q" + (x + (nx - x) / 2) + " " + (y + (up ? -9 : 9)) + " " + nx + " " + y;
      up = !up;
    }
    var s = '<path class="tl-draw" d="' + d + '" fill="none" stroke="' + color + '" stroke-width="3.2" stroke-linecap="round"/>';
    if (arrow) s += '<path d="M' + (x2 - 7) + " " + (y - 6) + " L" + x2 + " " + y + " L" + (x2 - 7) + " " + (y + 6) + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="tl-pop"/>';
    return s;
  }
  function dot(x, color, op) {
    return '<circle class="tl-pop" cx="' + x + '" cy="' + Y + '" r="7.5" fill="' + color + '"' + (op ? ' opacity="' + op + '"' : "") + "/>";
  }
  function arc(x1, x2, color) {
    var mid = (x1 + x2) / 2;
    return '<path class="tl-draw" d="M' + x1 + " " + (Y - 10) + " Q" + mid + " " + (Y - 48) + " " + (x2 - 2) + " " + (Y - 12) + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 0"/>' +
      '<path class="tl-pop" d="M' + (x2 - 12) + " " + (Y - 18) + " L" + (x2 - 1) + " " + (Y - 11) + " L" + (x2 - 8) + " " + (Y - 1) + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  }

  /* opts: {labels:true, color:"#..."}  */
  TW.timelineSVG = function (id, opts) {
    opts = opts || {};
    var m = TW.meta(id), g = m.group, a = m.aspect;
    var color = opts.color || "var(--g-" + g + ")";
    var R = REF[g];
    var body = "";
    if (a === "simple") {
      if (g === "present") {
        [40, 92, 144, 196, 248, 300].forEach(function (x, i) { body += dot(x, color, (x === 144 || x === 196) ? null : 0.45); });
      } else body += dot(R, color);
    } else if (a === "continuous") {
      body += wave(R - 50, R + 50, Y, color, false) + '<circle cx="' + R + '" cy="' + Y + '" r="5" fill="var(--ink)" class="tl-pop"/>';
    } else if (a === "perfect") {
      body += dot(R - 62, color) + arc(R - 58, R, color);
    } else {
      body += wave(R - 82, R, Y, color, true);
    }
    var refMark = "";
    if (g !== "present") {
      refMark = '<line x1="' + R + '" y1="' + (Y - 40) + '" x2="' + R + '" y2="' + (Y + 22) + '" stroke="var(--ink-3)" stroke-width="1.6" stroke-dasharray="3 4"/>';
      if (opts.labels !== false) refMark += '<text x="' + R + '" y="' + (Y + 38) + '" text-anchor="middle" class="tl-t"' + TW.TA(g === "past" ? { en: "a past moment", ru: "момент в прошлом", kz: "өткендегі сәт" } : { en: "a future moment", ru: "момент в будущем", kz: "келешектегі сәт" }) + "</text>";
    }
    var now = '<line x1="170" y1="' + (Y - 44) + '" x2="170" y2="' + (Y + 24) + '" stroke="var(--ink)" stroke-width="2"/>' +
      '<rect x="146" y="' + (Y - 62) + '" width="48" height="20" rx="10" fill="var(--ink)"/>' +
      '<text x="170" y="' + (Y - 48) + '" text-anchor="middle" class="tl-now">NOW</text>';
    var axis = '<line x1="12" y1="' + Y + '" x2="326" y2="' + Y + '" stroke="var(--line-strong)" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M320 ' + (Y - 6) + " L328 " + Y + " L320 " + (Y + 6) + '" fill="none" stroke="var(--line-strong)" stroke-width="2.4" stroke-linecap="round"/>';
    var lbl = opts.labels === false ? "" :
      '<text x="14" y="' + (Y + 38) + '" class="tl-t"' + TW.TA("past") + '</text><text x="326" y="' + (Y + 38) + '" text-anchor="end" class="tl-t"' + TW.TA("future") + "</text>";
    if (g === "present" && opts.labels !== false) lbl += '<text x="170" y="' + (Y + 38) + '" text-anchor="middle" class="tl-t tl-strong"' + TW.TA("now") + "</text>";
    return '<svg class="tl" viewBox="0 0 340 120" role="img" aria-label="Timeline: ' + m.name + '">' + axis + lbl + refMark + now + body + "</svg>";
  };
})();

/* Tenses World — PRACTICE engine
   A focused practice mode: one task at a time, concise feedback linked to the rule card,
   a summary with the learner's mistakes, and a 5-stage path across all 12 tenses.
   Routes: #/practice (path) · #/practice/<setId> (runner) */
(function () {
  var P = TW.PRACTICE;
  var T = TW.T, L = TW.L, esc = TW.esc;

  /* ---------- UI strings ---------- */
  var U = {
    pr_title: { en: "Practice", ru: "Практика", kz: "Жаттығу" },
    pr_lead: { en: "Five stages — from recognising each tense to using all twelve together. Learn the rules in the lessons; come here to apply them.", ru: "Пять этапов — от узнавания каждого времени до использования всех двенадцати вместе. Правила — в уроках, здесь — применение.", kz: "Бес кезең — әр шақты танудан бастап он екі шақты бірге қолдануға дейін. Ережелер — сабақтарда, мұнда — қолдану." },
    pr_stage: { en: "Stage", ru: "Этап", kz: "Кезең" },
    pr_tasks: { en: "tasks", ru: "заданий", kz: "тапсырма" },
    pr_start: { en: "Start", ru: "Начать", kz: "Бастау" },
    pr_again: { en: "Practise again", ru: "Ещё раз", kz: "Қайталау" },
    pr_best: { en: "Best: ", ru: "Лучший результат: ", kz: "Үздік нәтиже: " },
    pr_next: { en: "Up next", ru: "Далее", kz: "Келесі" },
    pr_vs: { en: " vs ", ru: " или ", kz: " әлде " },
    pr_exit: { en: "Exit practice", ru: "Выйти из практики", kz: "Жаттығудан шығу" },
    pr_check: { en: "Check", ru: "Проверить", kz: "Тексеру" },
    pr_continue: { en: "Continue", ru: "Дальше", kz: "Әрі қарай" },
    pr_finish: { en: "See results", ru: "Результаты", kz: "Нәтиже" },
    pr_ok: [{ en: "Correct", ru: "Верно", kz: "Дұрыс" }, { en: "Exactly", ru: "Именно так", kz: "Дәл солай" }, { en: "Well done", ru: "Отлично", kz: "Жарайсың" }],
    pr_bad: { en: "Not quite", ru: "Не совсем", kz: "Дұрыс емес" },
    pr_answer: { en: "Correct answer: ", ru: "Правильный ответ: ", kz: "Дұрыс жауап: " },
    pr_rule: { en: "Review the rule", ru: "Повторить правило", kz: "Ережені қайталау" },
    pr_listen: { en: "Listen", ru: "Слушать", kz: "Тыңдау" },
    pr_typeHere: { en: "Type your answer…", ru: "Введите ответ…", kz: "Жауабыңды жаз…" },
    pr_tapWords: { en: "Tap the words in order", ru: "Нажимайте на слова по порядку", kz: "Сөздерді ретімен бас" },
    pr_clear: { en: "Clear", ru: "Очистить", kz: "Тазалау" },
    // task instructions
    i_choice: { en: "Choose the correct option.", ru: "Выберите правильный вариант.", kz: "Дұрыс нұсқаны таңда." },
    i_gap: { en: "Write the verb in the correct form.", ru: "Напишите глагол в правильной форме.", kz: "Етістікті дұрыс түрде жаз." },
    i_neg: { en: "Make the sentence negative.", ru: "Сделайте предложение отрицательным.", kz: "Сөйлемді болымсыз түрге айналдыр." },
    i_negyet: { en: "Make the sentence negative and add yet.", ru: "Сделайте отрицание и добавьте yet.", kz: "Болымсыз түрге айналдырып, yet қос." },
    i_q: { en: "Make a yes/no question.", ru: "Задайте общий вопрос.", kz: "Жалпы сұрақ қой." },
    i_how: { en: "Ask about the duration with How long…?", ru: "Спросите о длительности: How long…?", kz: "Ұзақтығын сұра: How long…?" },
    i_order: { en: "Put the words in the correct order.", ru: "Расставьте слова в правильном порядке.", kz: "Сөздерді дұрыс ретке қой." },
    i_error1: { en: "There is one mistake. Tap it.", ru: "Здесь одна ошибка. Нажмите на неё.", kz: "Мұнда бір қате бар. Соны бас." },
    i_error2: { en: "Now choose the correction.", ru: "Теперь выберите исправление.", kz: "Енді дұрыс нұсқаны таңда." },
    i_meaning: { en: "What does the sentence mean?", ru: "Что означает предложение?", kz: "Сөйлем нені білдіреді?" },
    i_timeline: { en: "Which timeline matches the sentence?", ru: "Какая линия времени подходит к предложению?", kz: "Сөйлемге қай уақыт сызығы сәйкес келеді?" },
    i_name: { en: "Which tense is the highlighted verb?", ru: "Какое время у выделенного глагола?", kz: "Белгіленген етістік қай шақта тұр?" },
    i_text: { en: "Complete the text. Write each verb in the correct form.", ru: "Дополните текст: поставьте глаголы в правильную форму.", kz: "Мәтінді толықтыр: етістіктерді дұрыс түрде жаз." },
    pr_youTapped: { en: "The mistake was here: ", ru: "Ошибка была здесь: ", kz: "Қате мына жерде еді: " },
    // results
    pr_done: { en: "Set complete", ru: "Набор пройден", kz: "Жиынтық аяқталды" },
    pr_score: { en: "{a} of {b} correct", ru: "Верно: {a} из {b}", kz: "Дұрысы: {b}-дан {a}" },
    pr_perfect: { en: "No mistakes — you're ready for the next set.", ru: "Без ошибок — можно переходить дальше.", kz: "Қатесіз — келесі жиынтыққа өтуге болады." },
    pr_review: { en: "Your mistakes", ru: "Ваши ошибки", kz: "Сіздің қателеріңіз" },
    pr_retryMiss: { en: "Practise my mistakes", ru: "Проработать ошибки", kz: "Қателерді пысықтау" },
    pr_toPath: { en: "Practice path", ru: "Путь практики", kz: "Жаттығу жолы" },
    pr_toLesson: { en: "Back to the lesson", ru: "Вернуться к уроку", kz: "Сабаққа оралу" },
    pr_nextSet: { en: "Next set →", ru: "Следующий набор →", kz: "Келесі жиынтық →" },
    pr_mistakesRound: { en: "Mistakes round", ru: "Работа над ошибками", kz: "Қатемен жұмыс" },
    // lesson block
    pr_blockSub: { en: "Apply this tense — one focused task at a time", ru: "Примени это время — по одному заданию", kz: "Осы шақты қолдан — бір уақытта бір тапсырма" },
    pr_blockCovers: { en: "Form · negatives & questions · word order · meaning · typical mistakes", ru: "Форма · отрицания и вопросы · порядок слов · значение · типичные ошибки", kz: "Форма · болымсыз және сұраулы түр · сөз тәртібі · мағына · жиі қателер" },
    pr_compare: { en: "Then compare it with:", ru: "Затем сравни с:", kz: "Содан кейін салыстыр:" },
    pr_allPath: { en: "Full practice path", ru: "Весь путь практики", kz: "Толық жаттығу жолы" },
    pr_practised: { en: "practised", ru: "отработано", kz: "пысықталды" },
    pr_sources: { en: "How these exercises were made", ru: "Как составлены упражнения", kz: "Жаттығулар қалай құрастырылды" },
    pr_sourcesNote: {
      en: "All tasks are original. Each one is modelled on the rules and exercise formats of the sources below and checked against them; no exercise text is copied.",
      ru: "Все задания оригинальные. Каждое построено по правилам и форматам упражнений из источников ниже и сверено с ними; тексты упражнений не скопированы.",
      kz: "Барлық тапсырма — түпнұсқа. Әрқайсысы төмендегі дереккөздердің ережелері мен жаттығу форматтары бойынша құрастырылып, солармен тексерілді; жаттығу мәтіндері көшірілмеген."
    },
    pr_notFound: { en: "This practice set doesn't exist.", ru: "Такого набора нет.", kz: "Мұндай жиынтық жоқ." }
  };
  for (var k in U) TW.UI[k] = U[k];

  /* ---------- helpers ---------- */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(obj, vars) { var o = {}; ["en", "ru", "kz"].forEach(function (l) { var s = obj[l] || obj.en; for (var v in vars) s = s.split("{" + v + "}").join(vars[v]); o[l] = s; }); return o; }
  function tname(id) { return TW.meta(id).name; }
  function setTitle(id) {
    var s = P.SETS[id]; if (!s) return { en: id };
    if (s.title) return s.title;
    if (s.tense) return { en: tname(s.tense) };
    if (s.pair) { var n = s.pair.map(tname); return { en: n.join(" vs "), ru: n.join(" / "), kz: n.join(" / ") }; }
    return { en: id };
  }
  P.setTitle = setTitle;
  function setGroup(id) { var s = P.SETS[id]; if (s.tense) return TW.meta(s.tense).group; if (s.pair) return TW.meta(s.pair[0]).group; if (s.zone) return s.zone; return "present"; }
  function countPoints(items) { return items.reduce(function (n, it) { return n + (it.t === "text" ? it.parts.filter(function (x) { return typeof x === "object"; }).length : 1); }, 0); }
  P.countPoints = countPoints;
  function progress() { return (TW.store().practice) || {}; }
  P.progress = progress;
  function saveResult(id, a, b) {
    var all = progress(); var cur = all[id] || {};
    all[id] = { done: true, best: Math.max(cur.best || 0, a), total: b };
    TW.store({ practice: all });
  }
  function allSetIds() { var out = []; P.STAGES.forEach(function (s) { out = out.concat(s.sets); }); return out; }
  P.allSetIds = allSetIds;
  function nextSet(id) { var all = allSetIds(); return all[all.indexOf(id) + 1] || null; }
  function md(s) { return TW.md(s); }
  // "*verb*" → highlighted
  function hl(s) { return esc(s).replace(/\*(.+?)\*/g, '<mark>$1</mark>'); }
  function fillGaps(q, answers) { var i = 0; return q.replace(/___/g, function () { var a = answers[Math.min(i, answers.length - 1)]; i++; return a; }); }
  function splitOpt(o) { return o.split(" … "); }
  function fullSentence(it) {
    switch (it.t) {
      case "choice": return fillGaps(it.q, splitOpt(it.o[0]));
      case "gap": return fillGaps(it.q, [it.a[0]]);
      case "rewrite": return it.a[0];
      case "order": return it.a;
      case "error": return replaceErr(it.q, it.err, it.o[0]);
      case "meaning": case "timeline": case "name": return it.q.replace(/\*/g, "");
      case "text": return it.parts.map(function (p) { return typeof p === "string" ? p : p.a[0]; }).join("");
    }
    return "";
  }
  P.fullSentence = fullSentence;
  function errRe(err) { return new RegExp("(^|[^A-Za-z'])(" + err.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?![A-Za-z])"); }
  function replaceErr(q, err, fix) { return q.replace(errRe(err), function (m, a) { return a + fix; }); }

  /* ---------- audio: cfg.speak (Soniox, запасной — голос устройства) вместо speechSynthesis ---------- */
  var canSpeak = typeof sayText === "function";
  // speaking — номер звучащей фразы (ss.speaking прототипа). «Горит» ли кнопка, смотрим ДО остановки: у
  // speechSynthesis конец оборванной фразы приходил позже, а cfg.speak гасит кнопку сразу.
  var speaking = 0, speakSeq = 0;
  function speak(text, btn) {
    if (!canSpeak) return;
    if (speaking) { var wasOn = btn && btn.classList.contains("on"); stopSpeech(); if (wasOn) { btn.classList.remove("on"); return; } }
    var my = (speaking = ++speakSeq);
    if (btn) btn.classList.add("on");
    sayText(text, { onEnd: function () { if (speaking === my) speaking = 0; if (btn) btn.classList.remove("on"); } });
  }
  // Порт: глушим только свою фразу. hush() останавливает общий <audio> приложения — на нём же голосовой ответ Луны,
  // и «Continue» или любая ссылка раздела обрывали бы её (ревью 10.11.2026). Своя фраза держит speaking до onEnd.
  function stopSpeech() { if (canSpeak && speaking) { speaking = 0; try { hush(); } catch (e) {} } }
  P.stopSpeech = stopSpeech;
  function listenBtn() {
    return canSpeak ? '<button type="button" class="pr-listen" data-a="listen" aria-label="' + esc(L("pr_listen")) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      T("pr_listen") + "</button>" : "";
  }

  /* ---------- feedback ---------- */
  function ruleTag(tn, r) {
    if (!tn || TW.ORDER.indexOf(tn) === -1) return "";
    var d = (TENSES_DATA || {})[tn], u = d && r != null && d.usage[r];
    var m = TW.meta(tn);
    return '<a class="pr-rule" data-g="' + m.group + '" href="#/t/' + tn + '/grammar"><span class="tn">' + m.name + "</span>" + (u ? '<span class="ru">' + T(u.title) + "</span>" : "") +
      '<span class="go">' + T("pr_rule") + " →</span></a>";
  }
  function feedback(ok, it, answerHTML) {
    var tl = it.tn && TW.ORDER.indexOf(it.tn) !== -1 ? '<div class="pr-fb-tl" data-g="' + TW.meta(it.tn).group + '">' + TW.timelineSVG(it.tn, { labels: false }) + "</div>" : "";
    var okT = U.pr_ok[Math.floor(Math.random() * U.pr_ok.length)];
    return '<div class="pr-fb ' + (ok ? "ok" : "bad") + '"><div class="pr-fb-main"><div class="pr-fb-h"><span class="ic" aria-hidden="true">' + (ok ? "✓" : "✕") + "</span><b>" + T(ok ? okT : "pr_bad") + "</b>" + listenBtn() + "</div>" +
      (!ok && answerHTML ? '<p class="pr-fb-ans">' + T("pr_answer") + "<b>" + answerHTML + "</b></p>" : "") +
      (it.why ? '<p class="pr-fb-why">' + md(it.why) + "</p>" : "") + ruleTag(it.tn, it.r) + "</div>" + tl + "</div>";
  }

  /* =================================================================
     RUNNER
     ================================================================= */
  var RUN = null; // current run state

  function renderRunner(root, setId, opts) {
    var set = P.SETS[setId];
    stopSpeech();
    if (!set) { root.innerHTML = '<main class="tw"><div class="card" style="padding:32px;margin-top:24px">' + T("pr_notFound") + ' <a href="#/practice">' + T("pr_toPath") + "</a></div></main>"; return; }
    var items = opts && opts.items ? opts.items : set.items.slice();
    var g = setGroup(setId);
    var back = set.tense ? "#/t/" + set.tense + "/practice" : "#/practice";
    RUN = { id: setId, items: items, i: 0, pts: 0, total: countPoints(items), missed: [], log: [], retry: !!(opts && opts.retry), back: back };

    root.innerHTML = '<div class="pr-shell" data-g="' + g + '"><header class="pr-top"><a class="pr-x" href="' + back + '" aria-label="' + esc(L("pr_exit")) + '" title="' + esc(L("pr_exit")) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></a>' +
      '<div class="pr-top-mid"><div class="pr-set">' + (RUN.retry ? T("pr_mistakesRound") + " · " : "") + T(setTitle(setId)) + '</div><div class="pr-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + items.length + '" aria-valuenow="0"><i></i></div></div>' +
      '<span class="pr-count" aria-live="off"></span>' + TW.langSwitch("pr-langs") + "</header>" +
      '<main class="pr-stage"><div class="pr-card" id="pr-card"></div></main></div>';
    window.scrollTo(0, 0);
    showItem();
  }

  function bar() {
    var b = ROOT.querySelector(".pr-bar"); if (!b) return;
    b.querySelector("i").style.width = (RUN.i / RUN.items.length * 100) + "%";
    b.setAttribute("aria-valuenow", RUN.i);
    var c = ROOT.querySelector(".pr-count"); if (c) c.textContent = Math.min(RUN.i + 1, RUN.items.length) + " / " + RUN.items.length;
  }

  function showItem() {
    bar();
    var card = $id("pr-card");
    if (RUN.i >= RUN.items.length) return results(card);
    var it = RUN.items[RUN.i];
    delete card.dataset.locked;
    card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
    var r = TASKS[it.t](it);
    card.innerHTML = '<p class="pr-instr">' + T(r.instr) + "</p>" + r.html + '<div class="pr-fb-slot" aria-live="polite"></div><div class="pr-actions"></div>';
    r.bind(card, function (ok, answerHTML, pts) { answered(card, it, ok, answerHTML, pts); });
  }

  function answered(card, it, ok, answerHTML, pts) {
    var got = pts != null ? pts : (ok ? 1 : 0);
    if (!RUN.retry) reportAnswer(ok);
    RUN.pts += got;
    if (!ok) RUN.missed.push(it);
    card.querySelector(".pr-fb-slot").innerHTML = feedback(ok, it, answerHTML);
    var last = RUN.i === RUN.items.length - 1;
    var act = card.querySelector(".pr-actions");
    act.innerHTML = '<button type="button" class="btn primary pr-go" data-a="next">' + T(last ? "pr_finish" : "pr_continue") + "</button>";
    var go = act.querySelector("[data-a=next]");
    go.onclick = function () { stopSpeech(); RUN.i++; showItem(); };
    var ls = card.querySelector("[data-a=listen]");
    if (ls) ls.onclick = function () { speak(fullSentence(it), ls); };
    go.focus({ preventScroll: true });
    var fb = card.querySelector(".pr-fb"); if (fb && fb.getBoundingClientRect().bottom > window.innerHeight) fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function results(card) {
    stopSpeech();
    var id = RUN.id, a = RUN.pts, b = RUN.total;
    if (!RUN.retry) saveResult(id, a, b);
    var nx = nextSet(id), set = P.SETS[id];
    var h = '<div class="pr-results"><div class="pr-ring" style="--p:' + Math.round(a / b * 100) + '"><span>' + a + "<small>/" + b + "</small></span></div>" +
      "<h2>" + T(RUN.retry ? "pr_mistakesRound" : "pr_done") + "</h2><p>" + T(fmt(U.pr_score, { a: a, b: b })) + "</p>";
    if (!RUN.missed.length) h += '<p class="pr-muted">' + T("pr_perfect") + "</p>";
    else {
      h += '<h3 class="pr-rev-h">' + T("pr_review") + '</h3><ul class="pr-rev">' + RUN.missed.map(function (it) {
        return "<li><span class=\"s\">" + esc(fullSentence(it)) + "</span>" + ruleTag(it.tn, it.r) + "</li>";
      }).join("") + "</ul>";
    }
    h += '<div class="pr-actions center">' +
      (RUN.missed.length ? '<button type="button" class="btn primary" data-a="retry">' + T("pr_retryMiss") + "</button>" : "") +
      (nx ? '<a class="btn ' + (RUN.missed.length ? "" : "primary") + '" href="#/practice/' + nx + '">' + T("pr_nextSet") + "</a>" : "") +
      '<a class="btn ghost" href="' + (set.tense ? "#/t/" + set.tense + "/practice" : "#/practice") + '">' + T(set.tense ? "pr_toLesson" : "pr_toPath") + "</a></div></div>";
    card.innerHTML = h;
    var missed = RUN.missed.slice();
    var rb = card.querySelector("[data-a=retry]");
    if (rb) { rb.onclick = function () { renderRunner($id("tw-root"), id, { items: missed, retry: true }); }; rb.focus({ preventScroll: true }); }
    else { var f = card.querySelector(".pr-actions .btn"); if (f) f.focus({ preventScroll: true }); }
  }

  /* ---------- task renderers ---------- */
  function sentenceHTML(q) {
    return esc(q).replace(/___/g, '<span class="pr-blank">&nbsp;</span>');
  }
  function optsHTML(list, cls) {
    return '<div class="pr-opts ' + (cls || "") + '">' + list.map(function (o, i) {
      return '<button type="button" class="pr-opt" data-i="' + i + '"><kbd>' + (i + 1) + "</kbd><span>" + o.html + "</span></button>";
    }).join("") + "</div>";
  }
  // choice-like: options array with .correct
  function bindOpts(card, list, done, onPick) {
    var btns = card.querySelectorAll(".pr-opt");
    btns.forEach(function (b) {
      b.onclick = function () {
        if (card.dataset.locked) return; card.dataset.locked = "1";
        var o = list[+b.dataset.i];
        btns.forEach(function (x) { x.disabled = true; if (list[+x.dataset.i].correct) x.classList.add("ok"); });
        if (!o.correct) b.classList.add("bad");
        if (onPick) onPick(o);
        done(o.correct, list.filter(function (x) { return x.correct; })[0].text);
      };
    });
    if (btns[0]) btns[0].focus({ preventScroll: true });
  }
  function mkList(arr, correctIdx, toHTML) {
    return shuffle(arr.map(function (o, i) { return { text: o, html: toHTML ? toHTML(o) : esc(o), correct: i === correctIdx }; }));
  }
  function inputHTML(id, ph) {
    return '<input class="pr-input" id="' + id + '" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '">';
  }
  function checkBtn() { return '<button type="button" class="btn primary pr-check" data-a="check" disabled>' + T("pr_check") + "</button>"; }

  var TASKS = {
    choice: function (it) {
      var list = mkList(it.o, 0);
      return { instr: "i_choice", html: '<p class="pr-q">' + sentenceHTML(it.q) + "</p>" + optsHTML(list),
        bind: function (card, done) {
          bindOpts(card, list, function (ok, txt) {
            var parts = splitOpt(it.o[0]), i = 0;
            card.querySelectorAll(".pr-blank").forEach(function (s) { s.textContent = parts[Math.min(i++, parts.length - 1)]; s.classList.add(ok ? "ok" : "fix"); });
            done(ok, esc(it.o[0]));
          });
        } };
    },
    meaning: function (it) {
      var list = mkList(it.o, 0);
      return { instr: "i_meaning", html: '<p class="pr-q">' + hl(it.q) + "</p>" + optsHTML(list, "col"),
        bind: function (card, done) { bindOpts(card, list, function (ok) { done(ok, esc(it.o[0])); }); } };
    },
    name: function (it) {
      var list = mkList(it.o.map(tname), 0);
      return { instr: "i_name", html: '<p class="pr-q">' + hl(it.q) + "</p>" + optsHTML(list, "grid2"),
        bind: function (card, done) { bindOpts(card, list, function (ok) { done(ok, esc(tname(it.o[0]))); }); } };
    },
    timeline: function (it) {
      var list = shuffle(it.o.map(function (id, i) { return { id: id, text: tname(id), html: '<span class="tlw" data-g="' + TW.meta(id).group + '">' + TW.timelineSVG(id, { labels: false }) + '</span><span class="tln">' + tname(id) + "</span>", correct: i === 0 }; }));
      return { instr: "i_timeline", html: '<p class="pr-q">' + hl(it.q) + "</p>" + optsHTML(list, "tls"),
        bind: function (card, done) { bindOpts(card, list, function (ok) { done(ok, esc(tname(it.o[0]))); }); } };
    },
    gap: function (it) {
      return { instr: "i_gap", html: '<p class="pr-q">' + sentenceHTML(it.q).replace('<span class="pr-blank">&nbsp;</span>', '<span class="pr-blank wide" data-slot></span>') + ' <span class="pr-hint">(' + esc(it.v) + ")</span></p>" +
          '<div class="pr-type">' + inputHTML("pr-in", L("pr_typeHere")) + checkBtn() + "</div>",
        bind: function (card, done) { bindTyped(card, it.a, function (ok) { var s = card.querySelector("[data-slot]"); s.textContent = it.a[0]; s.classList.add(ok ? "ok" : "fix"); done(ok, esc(it.a[0])); }); } };
    },
    rewrite: function (it) {
      return { instr: "i_" + it.m, html: '<p class="pr-q pr-src">' + esc(it.q) + "</p>" + '<div class="pr-type col">' + inputHTML("pr-in", L("pr_typeHere")) + checkBtn() + "</div>",
        bind: function (card, done) { bindTyped(card, it.a, function (ok) { done(ok, esc(it.a[0])); }); } };
    },
    order: function (it) {
      var punct = (it.a.match(/[.?!]$/) || [""])[0];
      var words = it.a.replace(/[.?!]$/, "").split(" ");
      var tiles = shuffle(words.map(function (w, i) { return { w: w, id: i }; }));
      // avoid presenting the tiles already in the right order
      if (tiles.map(function (t) { return t.w; }).join(" ") === words.join(" ") && tiles.length > 1) tiles.push(tiles.shift());
      return { instr: "i_order", html: '<div class="pr-build" aria-label="' + esc(L("pr_tapWords")) + '"><div class="pr-slot" data-ph="' + esc(L("pr_tapWords")) + '"></div><span class="pr-punct">' + esc(punct) + "</span></div>" +
          '<div class="pr-bank"></div><div class="pr-type"><button type="button" class="btn ghost sm" data-a="clear">' + T("pr_clear") + "</button>" + checkBtn() + "</div>",
        bind: function (card, done) {
          var placed = [], locked = false;
          var slot = card.querySelector(".pr-slot"), bank = card.querySelector(".pr-bank"), chk = card.querySelector("[data-a=check]");
          function draw() {
            slot.innerHTML = placed.map(function (t) { return '<button type="button" class="pr-tile in" data-id="' + t.id + '">' + esc(t.w) + "</button>"; }).join("");
            slot.classList.toggle("empty", !placed.length);
            bank.innerHTML = tiles.map(function (t) { var used = placed.indexOf(t) !== -1; return '<button type="button" class="pr-tile' + (used ? " used" : "") + '" data-id="' + t.id + '"' + (used ? ' disabled aria-hidden="true"' : "") + ">" + esc(t.w) + "</button>"; }).join("");
            chk.disabled = placed.length !== tiles.length || locked;
            slot.querySelectorAll(".pr-tile").forEach(function (b) { b.onclick = function () { if (locked) return; placed = placed.filter(function (t) { return String(t.id) !== b.dataset.id; }); draw(); var f = bank.querySelector(".pr-tile:not(.used)"); if (f) f.focus(); }; });
            bank.querySelectorAll(".pr-tile:not(.used)").forEach(function (b) { b.onclick = function () { if (locked) return; placed.push(tiles.filter(function (t) { return String(t.id) === b.dataset.id; })[0]); draw(); var f = bank.querySelector(".pr-tile:not(.used)") || chk; f.focus(); }; });
          }
          draw();
          card.querySelector("[data-a=clear]").onclick = function () { if (!locked) { placed = []; draw(); } };
          chk.onclick = function () {
            if (chk.disabled) return; locked = true; chk.disabled = true; card.querySelector("[data-a=clear]").disabled = true;
            var ok = placed.map(function (t) { return t.w; }).join(" ") === words.join(" ");
            slot.classList.add(ok ? "ok" : "bad"); draw();
            done(ok, esc(it.a));
          };
          var f = bank.querySelector(".pr-tile"); if (f) f.focus({ preventScroll: true });
        } };
    },
    error: function (it) {
      // chunk the sentence: the error chunk is one token, the rest are words
      var m = it.q.match(errRe(it.err)), start = m.index + m[1].length, end = start + it.err.length;
      var before = it.q.slice(0, start), after = it.q.slice(end);
      function words(s) { return (s.match(/\S+/g) || []).map(function (w) { return { w: w, err: false }; }); }
      var toks = words(before).concat([{ w: it.err, err: true }]).concat(words(after));
      // keep trailing punctuation off tappable words
      var html = '<p class="pr-q pr-err-q">' + toks.map(function (t, i) {
        var mm = t.err ? [t.w, t.w, ""] : t.w.match(/^(.*?)([.,!?]*)$/);
        return '<button type="button" class="pr-tok" data-i="' + i + '">' + esc(mm[1]) + "</button>" + esc(mm[2]);
      }).join(" ") + "</p>";
      var list = mkList(it.o, 0);
      return { instr: "i_error1", html: html + '<div class="pr-err2" hidden><p class="pr-instr sub">' + T("i_error2") + "</p>" + optsHTML(list) + "</div>",
        bind: function (card, done) {
          var toksB = card.querySelectorAll(".pr-tok"), found = null;
          toksB.forEach(function (b) {
            b.onclick = function () {
              if (found !== null) return;
              found = toks[+b.dataset.i].err;
              toksB.forEach(function (x) { x.disabled = true; if (toks[+x.dataset.i].err) x.classList.add("err"); });
              if (!found) b.classList.add("miss");
              var s2 = card.querySelector(".pr-err2"); s2.hidden = false;
              bindOpts(s2, list, function (ok) {
                var errB = card.querySelector(".pr-tok.err"); errB.textContent = it.o[0]; errB.classList.add(ok && found ? "fixed" : "fix");
                done(ok && found, esc(replaceErr(it.q, it.err, it.o[0])));
              });
            };
          });
          if (toksB[0]) toksB[0].focus({ preventScroll: true });
        } };
    },
    text: function (it) {
      var n = 0, html = '<div class="pr-text"><p class="pr-text-h">' + T(it.intro) + "</p><p>" + it.parts.map(function (p) {
        if (typeof p === "string") return esc(p);
        var i = n++;
        return '<span class="pr-tgap"><input class="pr-input sm" data-g="' + i + '" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="' + esc(p.v) + '" size="' + Math.max(8, p.a[0].length + 1) + '"><small>' + esc(p.v) + "</small></span>";
      }).join("") + "</p></div>";
      var gaps = it.parts.filter(function (p) { return typeof p === "object"; });
      return { instr: "i_text", html: html + '<div class="pr-type">' + checkBtn() + "</div>",
        bind: function (card, done) {
          var ins = card.querySelectorAll(".pr-text input"), chk = card.querySelector("[data-a=check]");
          function upd() { chk.disabled = Array.prototype.some.call(ins, function (x) { return !x.value.trim(); }); }
          ins.forEach(function (x, i) {
            x.addEventListener("input", upd);
            x.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (i < ins.length - 1) ins[i + 1].focus(); else if (!chk.disabled) chk.click(); } });
          });
          chk.onclick = function () {
            if (chk.disabled) return; chk.disabled = true;
            var right = 0, wrongs = [];
            ins.forEach(function (x, i) {
              var gp = gaps[i], ok = TW.sameAnswer(x.value, gp.a); x.readOnly = true;
              x.classList.add(ok ? "ok" : "bad");
              if (ok) right++; else { wrongs.push(gp); var s = document.createElement("b"); s.className = "pr-tfix"; s.textContent = gp.a[0]; x.parentNode.appendChild(s); }
            });
            var all = right === gaps.length;
            if (!RUN.retry) reportAnswer(all);
            RUN.pts += right; // one point per gap
            textDone(card, it, all, right, gaps.length, wrongs);
          };
          if (ins[0]) ins[0].focus({ preventScroll: true });
        } };
    }
  };

  // typed answers (gap / rewrite)
  function bindTyped(card, answers, cb) {
    var inp = card.querySelector(".pr-input"), chk = card.querySelector("[data-a=check]");
    inp.addEventListener("input", function () { chk.disabled = !inp.value.trim(); });
    function go() {
      if (chk.disabled) return; chk.disabled = true; inp.readOnly = true;
      var ok = TW.sameAnswer(inp.value, answers);
      inp.classList.add(ok ? "ok" : "bad");
      cb(ok);
    }
    chk.onclick = go;
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } });
    inp.focus({ preventScroll: true });
  }

  // texts score per gap; feedback lists the gaps that were wrong with their rule
  function textDone(card, it, all, right, total, wrongs) {
    if (!all) RUN.missed.push(it);
    var fb = '<div class="pr-fb ' + (all ? "ok" : "bad") + '"><div class="pr-fb-main"><div class="pr-fb-h"><span class="ic" aria-hidden="true">' + (all ? "✓" : "✕") + "</span><b>" +
      T(all ? U.pr_ok[0] : "pr_bad") + " · " + right + " / " + total + "</b>" + listenBtn() + "</div>" +
      (wrongs.length ? '<ul class="pr-fb-list">' + wrongs.map(function (gp) { return "<li><b>" + esc(gp.a[0]) + "</b>" + ruleTag(gp.tn, gp.r) + "</li>"; }).join("") + "</ul>" : "") + "</div></div>";
    card.querySelector(".pr-fb-slot").innerHTML = fb;
    var last = RUN.i === RUN.items.length - 1;
    var act = card.querySelector(".pr-actions");
    act.innerHTML = '<button type="button" class="btn primary pr-go" data-a="next">' + T(last ? "pr_finish" : "pr_continue") + "</button>";
    var go = act.querySelector("[data-a=next]");
    go.onclick = function () { stopSpeech(); RUN.i++; showItem(); };
    var ls = card.querySelector("[data-a=listen]"); if (ls) ls.onclick = function () { speak(fullSentence(it), ls); };
    go.focus({ preventScroll: true });
  }

  // keyboard: 1–4 pick an option; Enter continues
  on(window, "keydown", function (e) {
    var tg = (e.composedPath && e.composedPath()[0]) || e.target; // из тени событие приходит с хостом в target
    if (!RUN || !ROOT.querySelector(".pr-shell")) return;
    if (tg && /INPUT|TEXTAREA/.test(tg.tagName)) return;
    if (/^[1-4]$/.test(e.key)) {
      var scope = ROOT.querySelector(".pr-err2:not([hidden])") || $id("pr-card");
      var b = scope && scope.querySelectorAll(".pr-opt:not([disabled])")[+e.key - 1];
      if (b) { e.preventDefault(); b.click(); }
    }
  });

  /* =================================================================
     PATH (#/practice)
     ================================================================= */
  function setCard(id, cur) {
    var s = P.SETS[id], pr = progress()[id], g = setGroup(id);
    var n = s.items.length;
    var sub = s.sub ? T(s.sub) : s.tense ? X2(TW.LOCAL_NAMES[s.tense]) : "";
    return '<a class="pr-setcard' + (pr ? " done" : "") + (cur ? " cur" : "") + '" data-g="' + g + '" href="#/practice/' + id + '">' +
      (s.tense ? '<span class="pr-tl">' + TW.timelineSVG(s.tense, { labels: false }) + "</span>" : "") +
      "<b>" + T(setTitle(id)) + "</b>" + (sub ? "<small>" + sub + "</small>" : "") +
      '<span class="pr-meta">' + n + " " + T("pr_tasks") + (pr ? ' · <span class="best">✓ ' + T("pr_best") + pr.best + "/" + pr.total + "</span>" : "") + "</span>" +
      (cur ? '<span class="pr-next">' + T("pr_next") + " →</span>" : "") + "</a>";
  }
  function X2(o) { return TW.X(o, "x2"); }
  function firstOpen() { var pr = progress(); var all = allSetIds(); for (var i = 0; i < all.length; i++) if (!pr[all[i]]) return all[i]; return null; }
  P.firstOpen = firstOpen;

  function renderPath(root, topbar, bindTopbar) {
    stopSpeech();
    var cur = firstOpen(), pr = progress();
    var h = topbar("practice") + '<main class="tw pr-path">';
    h += '<section class="pr-hero"><span class="kicker">' + T("pr_title") + "</span><h1>" + T("pr_title") + " · 12 tenses</h1><p>" + T("pr_lead") + "</p>" +
      '<ol class="pr-steps">' + P.STAGES.map(function (st) {
        var d = st.sets.filter(function (x) { return pr[x]; }).length;
        return '<li class="' + (d === st.sets.length ? "full" : d ? "part" : "") + '"><a href="#stage-' + st.n + '"><i>' + st.n + "</i><span>" + T(st.title) + "</span><small>" + d + "/" + st.sets.length + "</small></a></li>";
      }).join("") + "</ol>" +
      (cur ? '<a class="btn primary" href="#/practice/' + cur + '">' + TW.ico("play") + "<span>" + esc(L("pr_next") + ": " + L(setTitle(cur))) + "</span></a>" : "") + "</section>";
    P.STAGES.forEach(function (st) {
      h += '<section class="pr-stage-sec" id="stage-' + st.n + '"><div class="block-head"><div class="n">' + st.n + "</div><div><h2>" + T(st.title) + "</h2><p>" + T(st.purpose) + "</p></div></div>" +
        '<div class="pr-grid' + (st.sets.length === 12 ? " twelve" : "") + '">' + st.sets.map(function (id) { return setCard(id, id === cur); }).join("") + "</div></section>";
    });
    h += '<details class="pr-sources card"><summary>' + T("pr_sources") + "</summary><p>" + T("pr_sourcesNote") + '</p><ul>' +
      Object.keys(P.SOURCES).map(function (k) { var s = P.SOURCES[k]; return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + "</a><span>" + esc(s.use) + " — " + esc(s.lic) + "</span></li>"; }).join("") +
      "</ul></details>";
    h += '<p class="footer-note">Just to Study · Tenses World</p></main>';
    root.innerHTML = h;
    bindTopbar();
    window.scrollTo(0, 0);
    root.querySelectorAll('.pr-steps a').forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); var el = ROOT.querySelector(a.getAttribute("href")); if (el) el.scrollIntoView({ behavior: "smooth" }); });
    });
  }

  /* ---------- the block on each tense page ---------- */
  P.lessonBlock = function (id) {
    var s = P.SETS[id], pr = progress()[id];
    var contrasts = P.STAGES[2].sets.filter(function (c) { return (P.SETS[c].pair || []).indexOf(id) !== -1; });
    return '<div class="card pr-lesson" data-g="' + TW.meta(id).group + '"><div class="pl-main"><div class="pl-tl">' + TW.timelineSVG(id, { labels: false }) + "</div><div>" +
      "<h3>" + TW.meta(id).name + '</h3><p class="pl-covers">' + T("pr_blockCovers") + '</p><p class="pl-meta">' + s.items.length + " " + T("pr_tasks") +
      (pr ? ' · <span class="best">✓ ' + T("pr_best") + pr.best + "/" + pr.total + "</span>" : "") + "</p></div>" +
      '<a class="btn primary pl-start" href="#/practice/' + id + '">' + TW.ico("play") + T(pr ? "pr_again" : "pr_start") + "</a></div>" +
      (contrasts.length ? '<div class="pl-more"><span>' + T("pr_compare") + "</span>" + contrasts.map(function (c) { return '<a class="pl-chip" href="#/practice/' + c + '">' + T(setTitle(c)) + (progress()[c] ? " ✓" : "") + "</a>"; }).join("") +
        '<a class="pl-all" href="#/practice">' + T("pr_allPath") + " →</a></div>" : '<div class="pl-more"><a class="pl-all" href="#/practice">' + T("pr_allPath") + " →</a></div>") + "</div>";
  };

  P.renderRunner = renderRunner;
  P.renderPath = renderPath;
  P.leave = function () { RUN = null; stopSpeech(); };
})();

/* Tenses World — app shell, routing, rendering (English by default, KZ / RU on request) */
(function () {
  var DATA = TENSES_DATA;
  var root = $id("tw-root");
  var T = TW.T, X = TW.X, L = TW.L;

  /* ---------- helpers ---------- */
  function esc(s) { return TW.esc(s); }
  function store(patch) {
    try {
      var cur = JSON.parse(JSON.stringify(progress() || {}));
      if (patch) { for (var k in patch) cur[k] = patch[k]; onProgress(JSON.parse(JSON.stringify(cur))); }
      return cur;
    } catch (e) { return {}; }
  }
  TW.store = store;
  function ico(name) {
    var p = {
      back: '<path d="M15 18l-6-6 6-6"/>', next: '<path d="M9 18l6-6-6-6"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
      play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>', map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
      bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>'
    }[name];
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";
  }
  TW.ico = ico;
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; ROOT.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }
  TW.toast = toast;

  /* ---------- top bar ---------- */
  function topbar(curId) {
    var mm = '<div class="mini-map"><div></div>' + TW.GROUPS.map(function (g) { return '<div class="h">' + g.name + "</div>"; }).join("");
    TW.ASPECTS.forEach(function (a) {
      mm += '<div class="rl">' + a.name + "</div>";
      TW.GROUPS.forEach(function (g) {
        var id = g.id + "-" + a.id, m = TW.meta(id);
        mm += '<a href="#/t/' + id + '" data-g="' + g.id + '" class="' + (id === curId ? "cur" : "") + '">' + m.name + "</a>";
      });
    });
    mm += "</div>";
    var nav = "", isTense = curId && TW.ORDER.indexOf(curId) !== -1;
    if (isTense) {
      var i = TW.ORDER.indexOf(curId);
      var prev = TW.ORDER[i - 1], next = TW.ORDER[i + 1];
      nav = '<a class="btn icon-btn ghost nav-arrow" ' + (prev ? 'href="#/t/' + prev + '" title="' + TW.meta(prev).name + '"' : 'aria-disabled="true" style="opacity:.35;pointer-events:none"') + ' aria-label="Previous tense">' + ico("back") + "</a>" +
        '<a class="btn icon-btn ghost nav-arrow" ' + (next ? 'href="#/t/' + next + '" title="' + TW.meta(next).name + '"' : 'aria-disabled="true" style="opacity:.35;pointer-events:none"') + ' aria-label="Next tense">' + ico("next") + "</a>";
    }
    return '<header class="topbar"><div class="topbar-in">' +
      (curId == null && onExit ? '<button type="button" class="btn icon-btn ghost tw-exit" data-act="exit" aria-label="Back">' + ico("back") + "</button>" : "") + '<div class="spacer"></div>' +
      TW.langSwitch() +
      (curId !== "practice" ? '<a class="btn sm pr-btn" href="#/practice">' + ico("target") + '<span class="lbl">' + T("pr_title") + "</span></a>" : "") +
      (curId ? '<a class="btn sm map-btn" href="#/">' + ico("map") + '<span class="lbl">' + T("map") + "</span></a>" : "") + nav +
      '<div class="switcher"><button class="btn sm primary" data-act="switch" aria-expanded="false">' + ico("grid") + '<span class="lbl">' + T("all12") + "</span></button>" +
      '<div class="switcher-pop" role="dialog" aria-label="Choose a tense">' + mm + "</div></div>" +
      "</div></header>";
  }

  function bindTopbar() {
    var sw = root.querySelector(".switcher");
    var btn = sw.querySelector("[data-act=switch]");
    btn.addEventListener("click", function (e) { e.stopPropagation(); var o = sw.classList.toggle("open"); btn.setAttribute("aria-expanded", o); });
    if (topAc) topAc.abort(); // слушатели прошлой шапки — с ней и уходят (у прототипа копились с каждой отрисовкой)
    topAc = new AbortController();
    window.addEventListener("click", function (e) { var tg = (e.composedPath && e.composedPath()[0]) || e.target; if (!sw.contains(tg)) { sw.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); } }, { signal: topAc.signal });
    sw.querySelectorAll(".mini-map a").forEach(function (a) { a.addEventListener("click", function () { sw.classList.remove("open"); }); });
    var bar = root.querySelector(".topbar");
    var onScroll = function () { bar.classList.toggle("scrolled", window.scrollY > 4); };
    window.addEventListener("scroll", onScroll, { passive: true, signal: topAc.signal }); onScroll();
  }

  /* ---------- HUB ---------- */
  function renderHub() {
    var st = store();
    var visited = st.visited || {};
    var prac = TW.PRACTICE.progress();
    var cont = st.last && TW.ORDER.indexOf(st.last) !== -1 ? st.last : null;
    var h = topbar(null) + '<main class="tw">';
    h += '<section class="hub-hero"><span class="eyebrow">✦ ' + T("eyebrow") + "</span>" +
      "<h1>" + T("heroTitleA") + "<span>" + T("heroTitleB") + "</span></h1>" +
      '<p class="lead">' + T("heroLead") + "</p>" +
      '<div class="hero-actions">' + (cont ? '<a class="btn" href="#/t/' + cont + '">' + ico("play") + T("continue") + TW.meta(cont).name + "</a>" : '<a class="btn" href="#/t/present-simple">' + ico("play") + T("startPS") + "</a>") +
      '<a class="btn alt" href="#/practice">' + T("pr_title") + '</a><a class="btn alt" href="#map">' + T("openMap") + "</a></div></section>";

    h += '<div class="section-title"><div><span class="kicker">' + T("howKicker") + "</span><h2>" + T("howTitle") + "</h2></div><p>" + T("howLead", true) + "</p></div>";
    h += '<div class="how">' +
      '<div class="card"><div class="step-n">1</div><h3>' + T("how1t") + "</h3><p>" + T("how1", true) + "</p></div>" +
      '<div class="card"><div class="step-n">2</div><h3>' + T("how2t") + "</h3><p>" + T("how2", true) + "</p></div>" +
      '<div class="card"><div class="step-n">3</div><h3>' + T("how3t") + "</h3><p>" + T("how3", true) + "</p></div></div>";

    h += '<div class="section-title" id="map"><div><span class="kicker">' + T("mapKicker") + "</span><h2>" + T("mapTitle") + "</h2></div><p>" + T("mapLead") + "</p></div>";
    h += '<div class="time-axis"><div class="corner"></div>' + TW.GROUPS.map(function (g) {
      return '<div class="zone ' + g.id + '"><b>' + g.name + "</b><span>" + T(g.hint) + "</span></div>";
    }).join("") + "</div>";
    h += '<div class="map">';
    TW.ASPECTS.forEach(function (a) {
      h += '<div class="aspect-label"><b>' + a.name + "</b><span>" + T(a.idea) + "</span></div>";
      h += '<div class="row-h"><span class="kicker" style="margin:0">' + a.name + "</span></div>";
      TW.GROUPS.forEach(function (g) {
        var id = g.id + "-" + a.id, m = TW.meta(id), d = DATA[id];
        var done = prac[id];
        h += '<a class="tile' + (visited[id] ? " visited" : "") + '" data-g="' + g.id + '" href="#/t/' + id + '"><span class="num">' + String(m.num).padStart(2, "0") + "</span>" +
          "<h3>" + m.name + "</h3>" + X(TW.LOCAL_NAMES[id], "tile-local") + '<p class="tg">' + (d ? T(d.tagline) : "") + "</p>" + TW.timelineSVG(id, { labels: false }) +
          '<span class="badges">' + (TW.VIDEOS[id] && TW.VIDEOS[id].src ? '<span class="badge-video">' + T("videoBadge") + "</span>" : "") + (done ? '<span class="badge-prac">✓ ' + T("pr_practised") + "</span>" : "") + "</span></a>";
      });
    });
    h += "</div>";

    h += '<div class="section-title" id="practice"><div><span class="kicker">' + T("hubPrKicker") + "</span><h2>" + T("hubPrTitle") + "</h2></div><p>" + T("hubPrLead") + "</p></div>";
    h += '<div class="hub-practice">' + TW.PRACTICE.STAGES.map(function (st) {
      return '<a href="#/practice"><i>' + st.n + "</i><b>" + T(st.title) + "</b><span>" + T(st.purpose) + "</span></a>";
    }).join("") + "</div>";
    h += '<p class="footer-note">Just to Study · Tenses World · ' + T("footer") + "</p>";
    h += "</main>";
    root.innerHTML = h;
    bindTopbar();
    if (HASH === "#map") $id("map").scrollIntoView();
  }

  /* ---------- TENSE PAGE ---------- */
  var SECTIONS = [["video", "stepVideo"], ["grammar", "stepGrammar"], ["lab", "stepLab"], ["practice", "stepPractice"], ["review", "stepReview"]];

  function formulaHTML(f) {
    return '<div class="formula">' + f.map(function (t, i) { return (i ? '<span class="plus">+</span>' : "") + '<span class="chipk ' + t.k + '">' + esc(L(t.t)) + "</span>"; }).join("") + "</div>";
  }
  function exHTML(list) {
    return (list || []).map(function (e) { return '<div class="ex"><div class="e">' + esc(e.en) + "</div>" + X(e, "r") + "</div>"; }).join("");
  }

  function videoBlock(id, d) {
    var vid = TW.VIDEOS[id];
    if (!vid) {
      return '<div class="cinema pending"><div class="cinema-screen"><div class="pending-in">' +
        '<div class="play">' + ico("play") + "</div><h3>" + T("videoSoonT") + "</h3><p>" + T("videoSoon") + "</p></div></div></div>";
    }
    return '<div class="cinema"><div class="cinema-screen"><video controls playsinline preload="metadata"' + (vid.poster ? ' poster="' + esc(vid.poster) + '"' : "") +
      ' aria-label="Video lesson: ' + esc(d.name) + '">' + (vid.src ? '<source src="' + esc(vid.src) + '" type="video/mp4">' : "") + "</video></div></div>";
  }

  function renderTense(id, section) {
    var m = TW.meta(id), d = DATA[id];
    store({ last: id });
    var v = store().visited || {}; v[id] = 1; store({ visited: v });
    if (!d) { root.innerHTML = topbar(id) + '<main class="tw"><div class="card" style="padding:40px;margin-top:24px">' + T("notLoaded") + "</div></main>"; bindTopbar(); return; }

    var h = topbar(id) + '<main class="tw" data-g="' + m.group + '">';

    // 1. lesson head + video (the centrepiece)
    h += '<section class="lesson block" id="video" data-g="' + m.group + '">' +
      '<div class="lesson-head"><div class="lh-left"><div class="chips"><span class="chip g">' + m.groupInfo.name + '</span><span class="chip">' + m.aspectInfo.name + '</span><span class="chip n">' + m.num + T("ofTwelve") + "</span></div>" +
      "<h1>" + esc(d.name) + "</h1>" + X(TW.LOCAL_NAMES[id], "local-name") + "</div>" +
      '<p class="key">' + T(d.keyIdea, true) + "</p></div>" +
      videoBlock(id, d) +
      '<div class="lesson-below">' +
      '<div class="card tl-card anim"><div class="cap">' + T("onTimeline") + "</div>" + TW.timelineSVG(id) + '<p class="intro">' + T(d.intro, true) + "</p></div>" +
      "</div></section>";

    h += '<nav class="stepnav" data-g="' + m.group + '" aria-label="Lesson steps">' + SECTIONS.map(function (s, i) { return '<a href="#/t/' + id + "/" + s[0] + '" data-sec="' + s[0] + '"><i>' + (i + 1) + "</i>" + T(s[1]) + "</a>"; }).join("") + "</nav>";

    // 2. grammar
    h += '<section class="block" id="grammar"><div class="block-head"><div class="n">2</div><div><h2>' + T("stepGrammar") + "</h2><p>" + T("grammarSub") + "</p></div></div>";
    h += '<h3 class="sub-h">' + T("whenUse") + '</h3><div class="usage-grid">' + d.usage.map(function (u, i) {
      return '<article class="card usage"><div class="ic">' + (i + 1) + "</div><h4>" + T(u.title, true) + "</h4><p>" + T(u.text, true) + "</p>" + exHTML(u.ex) + "</article>";
    }).join("") + "</div>";

    h += '<h3 class="sub-h">' + T("formulas") + '</h3><div class="forms-tabs" role="tablist">' +
      [["affirmative", "+", "aff"], ["negative", "−", "neg"], ["question", "?", "q"]].map(function (f, i) {
        return '<button role="tab" data-form="' + f[0] + '" class="' + (i ? "" : "on") + '" aria-selected="' + (i ? "false" : "true") + '"><span class="sg">' + f[1] + "</span>" + T(f[2]) + "</button>";
      }).join("") + '</div><div id="formula-slot"></div>' +
      '<div class="legend"><span><i style="background:var(--k-s)"></i>' + T("lgS") + '</span><span><i style="background:var(--k-a)"></i>' + T("lgA") + '</span><span><i style="background:var(--k-n)"></i>not</span><span><i style="background:var(--k-v)"></i>' + T("lgV") + "</span></div>";

    if (d.extras && d.extras.length) {
      h += '<h3 class="sub-h">' + T("goodToKnow") + '</h3><div class="extras">' + d.extras.map(function (x) {
        return '<div class="card extra"><h4>' + T(x.title, true) + "</h4><ul>" + x.items.map(function (it) { return "<li>" + T(it, true) + "</li>"; }).join("") + "</ul></div>";
      }).join("") + "</div>";
    }
    h += '<h3 class="sub-h">' + T("signalWords") + '</h3><div class="card signals"><div class="signal-words">' + d.signals.words.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("") +
      '</div><div class="note">' + ico("bulb") + "<span>" + T(d.signals.note, true) + "</span></div></div>";

    h += '<h3 class="sub-h">' + T("commonMistakes") + "</h3>" + '<div class="mistakes">' + d.mistakes.map(function (x) {
      return '<div class="card mistake"><div class="w">' + esc(x.wrong) + '</div><div class="c">' + esc(x.right) + "</div><p>" + T(x.why, true) + "</p></div>";
    }).join("") + "</div>";

    if (d.compare && d.compare.length) {
      h += '<h3 class="sub-h">' + T("dontMix") + "</h3>" + d.compare.map(function (c) {
        var om = TW.meta(c.with);
        return '<div class="card compare"><h4>' + esc(d.name) + T("or") + '<a href="#/t/' + c.with + '">' + om.name + "</a>?</h4><p>" + T(c.text, true) + '</p><div class="cmp-cols">' +
          '<div class="cmp-col" data-g="' + m.group + '"><div class="lbl" style="color:var(--gc)">' + esc(d.name) + "</div>" + TW.timelineSVG(id, { labels: false }) + '<div class="e">' + esc(c.a.en) + "</div>" + X(c.a, "r") + "</div>" +
          '<div class="cmp-col" data-g="' + om.group + '"><div class="lbl" style="color:var(--gc)">' + om.name + "</div>" + TW.timelineSVG(c.with, { labels: false }) + '<div class="e">' + esc(c.b.en) + "</div>" + X(c.b, "r") + "</div></div></div>";
      }).join("");
    }
    h += '<p class="sources">' + T("sources") + ": Cambridge Dictionary — <i>English Grammar Today</i>; M. Swan — <i>Practical English Usage</i> (4th ed.); Oxford Learner’s Dictionaries — Grammar; British Council — <i>LearnEnglish Grammar</i>.</p></section>";

    // 3. lab
    h += '<section class="block" id="lab"><div class="block-head"><div class="n">3</div><div><h2>' + T("labTitle") + "</h2><p>" + T("labSub") + "</p></div></div>" +
      '<p class="lab-tip">' + T("labTip") + '</p><div class="card lab" id="lab-box"></div>' +
      '<h3 class="sub-h">' + T("liveEx") + '</h3><div class="usage-grid live">' + d.timeline.map(function (e) {
        return '<div class="card usage"><div class="ex"><div class="e">' + esc(e.en) + "</div>" + X(e, "r") + "</div></div>";
      }).join("") + "</div></section>";

    // 4. practice (the focused practice mode opens on its own screen)
    h += '<section class="block" id="practice"><div class="block-head"><div class="n">4</div><div><h2>' + T("stepPractice") + "</h2><p>" + T("pr_blockSub") + "</p></div></div>" + TW.PRACTICE.lessonBlock(id) + "</section>";

    // 5. review
    var i = TW.ORDER.indexOf(id), prev = TW.ORDER[i - 1], next = TW.ORDER[i + 1];
    h += '<section class="block" id="review"><div class="block-head"><div class="n">5</div><div><h2>' + T("reviewTitle") + "</h2><p>" + T("reviewSub") + "</p></div></div>" +
      '<div class="card review"><ol>' + d.review.map(function (r) { return "<li>" + T(r, true) + "</li>"; }).join("") + "</ol>" +
      '<div class="recap"><div class="lbl">+ ' + T("aff") + "</div>" + formulaHTML(d.forms.affirmative.formula) +
      '<div class="lbl">− ' + T("neg") + "</div>" + formulaHTML(d.forms.negative.formula) +
      '<div class="lbl">? ' + T("q") + "</div>" + formulaHTML(d.forms.question.formula) + "</div></div>" +
      '<div class="next-tense">' + (prev ? '<a href="#/t/' + prev + '"><small>← ' + T("prev") + "</small><b>" + TW.meta(prev).name + "</b></a>" : '<a href="#/"><small>← ' + T("backMap") + "</small><b>" + T("map") + "</b></a>") +
      (next ? '<a class="nx" href="#/t/' + next + '"><small>' + T("next") + " →</small><b>" + TW.meta(next).name + "</b></a>" : '<a class="nx" href="#/"><small>' + T("map") + " →</small><b>Tenses World</b></a>") + "</div></section>";
    h += '<p class="footer-note">Just to Study · Tenses World</p></main>';

    root.innerHTML = h;
    bindTopbar();

    // formula tabs
    var slot = $id("formula-slot");
    function showForm(key) {
      var f = d.forms[key];
      slot.innerHTML = '<div class="card formula-card"><div>' + formulaHTML(f.formula) + '<p class="note">' + T(f.note, true) + "</p>" +
        (f.short ? '<div class="short">' + f.short.map(function (s) { return "<span>" + esc(s) + "</span>"; }).join("") + "</div>" : "") + "</div><div>" + exHTML(f.ex) + "</div></div>";
    }
    root.querySelectorAll(".forms-tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        root.querySelectorAll(".forms-tabs button").forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-selected", "false"); });
        b.classList.add("on"); b.setAttribute("aria-selected", "true"); showForm(b.dataset.form);
      });
    });
    showForm("affirmative");

    renderLab($id("lab-box"), id);
    setupSpy(id);
    setupVideo(id);

    if (section) {
      var el = $id(section);
      if (el) setTimeout(function () { el.scrollIntoView({ behavior: "auto" }); }, 30);
    } else window.scrollTo(0, 0);
  }

  function setupVideo(id) {
    var vid = TW.VIDEOS[id];
    var vEl = root.querySelector(".cinema video");
    if (!vEl || !vid) return;
    var fail = function () {
      var w = root.querySelector(".cinema-screen");
      if (w) w.innerHTML = '<div class="pending-in"><h3>' + T("videoErr") + "</h3><p>" + esc(vid.src || "") + "</p></div>";
    };
    if (!vid.src) { fail(); return; } // у времени нет записи в бакете (бандл: src = null)
    vEl.addEventListener("error", fail);
    var src = vEl.querySelector("source"); if (src) src.addEventListener("error", fail);
  }

  function setupSpy(id) {
    var links = root.querySelectorAll(".stepnav a");
    var map = {}; links.forEach(function (a) { map[a.dataset.sec] = a; });
    links.forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var el = $id(a.dataset.sec);
        if (el) el.scrollIntoView({ behavior: "smooth" });
        HASH = "#/t/" + id + "/" + a.dataset.sec;
      });
    });
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.classList.remove("on"); });
          var a = map[en.target.id]; if (a) { a.classList.add("on"); var nav = a.parentNode; nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2, behavior: "smooth" }); }
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    SECTIONS.forEach(function (s) { var el = $id(s[0]); if (el) io.observe(el); });
    if (TW._io) TW._io.disconnect(); TW._io = io;
  }

  /* ---------- Formula Lab ---------- */
  TW.labState = TW.labState || { subj: "she", verb: "cook", form: "aff" };
  function renderLab(el, id) {
    var S = TW.labState;
    function pills(list, key, label, fmt) {
      return '<div class="lab-row"><span class="lab-lbl">' + T(label) + "</span>" + list.map(function (x) {
        return '<button class="pill' + (S[key] === x.id ? " on" : "") + '" data-k="' + key + '" data-v="' + x.id + '">' + fmt(x) + "</button>";
      }).join("") + "</div>";
    }
    function draw() {
      var subj = TW.SUBJECTS.filter(function (s) { return s.id === S.subj; })[0];
      var verb = TW.VERBS.filter(function (v) { return v.id === S.verb; })[0];
      var parts = TW.buildSentence(id, subj, verb, S.form);
      var c = TW.contract(parts, S.form);
      var html = pills(TW.SUBJECTS.slice(0, 6), "subj", "labWho", function (s) { return s.t; }) +
        pills(TW.VERBS, "verb", "labAction", function (v) { return v.v1 + " " + v.obj; }) +
        pills([{ id: "aff", k: "aff", s: "+" }, { id: "neg", k: "neg", s: "−" }, { id: "q", k: "q", s: "?" }], "form", "labForm", function (f) { return f.s + " " + T(f.k); });
      html += '<div class="lab-out"><div class="lab-sentence">' + parts.map(function (p) {
        return '<span class="' + (p.k === "p" ? "p" : "k-" + p.k) + '">' + esc(p.w) + "</span>";
      }).join("") + "</div>" + (c ? '<div class="lab-contr">' + T("labSpoken") + "<b>" + esc(TW.partsToText(c)) + "</b></div>" : "") + "</div>";
      html += '<div class="machine"><h3 class="sub-h" style="margin:22px 0 10px;font-size:18px">' + T("machine") + '</h3><div class="machine-grid">' +
        TW.ORDER.map(function (tid) {
          var mm = TW.meta(tid);
          return '<button data-g="' + mm.group + '" data-go="' + tid + '" class="' + (tid === id ? "cur" : "") + '"><small>' + mm.name + "</small><span>" + esc(TW.partsToText(TW.buildSentence(tid, subj, verb, S.form))) + "</span></button>";
        }).join("") + "</div></div>";
      el.innerHTML = html;
      el.querySelectorAll(".pill").forEach(function (b) { b.addEventListener("click", function () { S[b.dataset.k] = b.dataset.v; draw(); }); });
      el.querySelectorAll("[data-go]").forEach(function (b) {
        b.addEventListener("click", function () { if (b.dataset.go !== id) go("#/t/" + b.dataset.go + "/lab"); });
      });
    }
    draw();
  }

  /* ---------- router ---------- */
  // Порт: прототип при уходе со страницы времени ничего не отпускал (страница уходила целиком). У нас раздел живёт
  // дальше: наблюдатель держал бы секции прошлой страницы, а <video> — буфер ролика из MinIO.
  function releaseTense() {
    try { if (TW._io) { TW._io.disconnect(); TW._io = null; } } catch (e) { /* наблюдателя нет */ }
    var v = root.querySelector(".cinema video");
    if (v) { try { v.pause(); v.removeAttribute("src"); v.querySelectorAll("source").forEach(function (x) { x.remove(); }); v.load(); } catch (e) { /* нечего отпускать */ } }
  }

  function route() {
    var hash = HASH || "#/";
    TW.PRACTICE.leave();
    var stay = hash.match(/^#\/t\/([a-z-]+?)\/(video|grammar|lab|practice|review)$/);
    if (!(stay && root.getAttribute("data-cur") === stay[1])) releaseTense();
    var pm = hash.match(/^#\/practice(?:\/([a-z0-9-]+))?$/);
    if (pm) {
      root.setAttribute("data-cur", "");
      if (pm[1]) TW.PRACTICE.renderRunner(root, pm[1]);
      else TW.PRACTICE.renderPath(root, topbar, bindTopbar);
      return;
    }
    hash = hash.replace(/\/quest$/, "/practice"); // old links to the removed quest
    if (hash === "#map") { if (!root.querySelector(".map")) renderHub(); else $id("map").scrollIntoView({ behavior: "smooth" }); return; }
    var mt = hash.match(/^#\/t\/([a-z-]+?)(?:\/(video|grammar|lab|practice|review))?$/);
    if (mt && TW.ORDER.indexOf(mt[1]) !== -1) {
      var cur = root.getAttribute("data-cur");
      if (cur === mt[1] && mt[2]) { var el = $id(mt[2]); if (el) el.scrollIntoView({ behavior: "smooth" }); return; }
      root.setAttribute("data-cur", mt[1]); renderTense(mt[1], mt[2]); return;
    }
    root.setAttribute("data-cur", "");
    renderHub(); window.scrollTo(0, 0);
  }
  TW.route = route;
  route();
})();

// «назад» из раздела и ссылки прототипа (#/…, #map): роутер движка вместо адреса страницы. Ссылки со своим
// обработчиком (stepnav, этапы пути) уже отменили переход — их не трогаем.
on(ROOT, 'click', (ev) => {
  if (ev.defaultPrevented) return
  const t = ev.target && ev.target.closest ? ev.target : null
  const exit = t && t.closest('[data-act="exit"]')
  if (exit && ROOT.contains(exit)) {
    ev.preventDefault()
    if (onExit) onExit()
    return
  }
  const a = t && t.closest('a[href^="#"]')
  if (!a || !ROOT.contains(a)) return
  ev.preventDefault()
  go(a.getAttribute('href'))
})
return {
  go,
  TW,
  /** Для экрана и тестов: адрес движка. */
  snapshot: () => ({ hash: HASH }),
  /**
   * Перерисовать обзор (карта, путь) по свежему прогрессу на месте: route() на #map при готовой карте только
   * прокручивает к ней, а на #/ — наверх, и снимок сервера дёргал бы ученика (ревью 10.11.2026).
   */
  refresh() {
    if (dead) return
    const y = window.scrollY
    const keep = HASH
    if (keep === '#map') HASH = '#/'
    try { TW.route() } finally { HASH = keep }
    window.scrollTo(0, y)
  },
  destroy() {
    if (dead) return
    try { TW.PRACTICE.leave() } catch (e) { /* практики нет */ }
    dead = true
    ac.abort()
    if (topAc) topAc.abort()
    for (const id of timers) globalThis.clearTimeout(id)
    timers.clear()
    try { if (TW._io) TW._io.disconnect() } catch (e) { /* наблюдателя нет */ }
    ROOT.innerHTML = ''
    ROOT.removeAttribute('lang')
  },
}
}
