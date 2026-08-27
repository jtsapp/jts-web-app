// Writing trainer — чистая логика сборки жанра (без React и DOM).
// Портировано дословно из прототипа data/jtswriting.html: fixture-тесты
// сравнивают выход buildGenre с выходом самого прототипа, поэтому любая
// «чистка» (регэкспы, пороги, порядок проходов shuffle) ломает эталон.

/* Перемешивание, независимое от порядка ответов: детерминированный seed
   по идентификатору задания и запрет «всё осталось на местах». */
export function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) { var t = seed >>> 0; return function () { t += 0x6D2B79F5; var r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
export function shuffle(arr, seedStr) {
  var a = arr.slice();
  if (a.length < 2) return a;
  var rand = rng(hashStr(String(seedStr) + "|" + a.length));
  for (var pass = 0; pass < 6; pass++) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    var same = 0;
    for (var k = 0; k < a.length; k++) if (a[k] === arr[k]) same++;
    if (same * 2 <= a.length) break;
  }
  return a;
}

/* ── Детерминированный выбор n элементов: банк один, а подборка у каждого
      жанра своя, поэтому соседние жанры не повторяют друг друга. ──────── */
export function pickN(list, seedStr, n) {
  var order = shuffle(list.map(function (_, i) { return i; }), seedStr);
  var out = [];
  for (var i = 0; i < order.length && out.length < n; i++) out.push(list[order[i]]);
  return out;
}
export var STOPWORDS = ["a", "an", "the", "is", "am", "are", "was", "were", "be", "been", "to", "of", "in", "on",
  "at", "for", "with", "and", "or", "but", "my", "your", "our", "their", "his", "her", "its", "do", "does",
  "did", "have", "has", "had", "will", "would", "can", "could", "that", "this", "these", "those", "it", "from"];

/* Заметки для expand: оставляем только смысловые слова */
export function toNotes(sentence) {
  var words = sentence.replace(/[.,!?;:]/g, "").split(/\s+/);
  var keep = words.filter(function (w) { return STOPWORDS.indexOf(w.toLowerCase()) < 0; });
  if (keep.length < 3) keep = words.slice(0, 4);
  return keep.slice(0, 6).map(function (w) { return w.toLowerCase(); }).join(" / ");
}
export function keyWords(sentence, n) {
  var words = sentence.replace(/[.,!?;:]/g, "").split(/\s+/)
    .filter(function (w) { return w.length > 3 && STOPWORDS.indexOf(w.toLowerCase()) < 0; })
    .map(function (w) { return w.toLowerCase(); });
  return words.slice(0, n || 2);
}
export function stripPunct(sentence) {
  return sentence.replace(/[.,!?;:"']/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function norm(s) {
  return String(s || "").toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[.,!?;:()"'—–-]/g, " ")
    .replace(/\s+/g, " ").trim();
}
export function wordsOf(s) { var m = String(s || "").trim().match(/[A-Za-zЀ-ӿ0-9'’-]+/g); return m || []; }
export function sentencesOf(s) {
  var parts = String(s || "").split(/[.!?]+[\s ]+|[.!?]+$/);
  return parts.filter(function (p) { return wordsOf(p).length > 0; });
}
export function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

/* Проверка свободного ответа: точное совпадение с одним из answers либо
   все must-слова присутствуют и ни одного avoid-слова нет. Ответы короче
   двух слов не принимаются — иначе засчитывался бы обрывок. */
export function textMatch(val, item) {
  var v = norm(val);
  if (!v || wordsOf(v).length < 2) return false;
  var i;
  if (item.answers) for (i = 0; i < item.answers.length; i++) if (norm(item.answers[i]) === v) return true;
  if (item.must) {
    var ok = true;
    for (i = 0; i < item.must.length; i++) if (v.indexOf(norm(item.must[i])) < 0) ok = false;
    if (item.avoid) for (i = 0; i < item.avoid.length; i++) if (v.indexOf(norm(item.avoid[i])) >= 0) ok = false;
    if (ok) return true;
  }
  return false;
}

export var LEVEL_TITLES = {
  a1: ["A1 · Beginner", "Words and short sentences"],
  a2: ["A2 · Elementary", "One clear paragraph"],
  a2p: ["A2+ · Pre-Intermediate", "Two or three paragraphs that hold together"],
  b1: ["B1 · Intermediate", "A planned text with linking words"],
  b2: ["B2 · Upper-Intermediate", "Argument and structure"],
  c1: ["C1 · Advanced", "Nuance, register, criticism"]
};
export var LEVEL_TAG = { a1: "A1", a2: "A2", a2p: "A2+", b1: "B1", b2: "B2", c1: "C1" };

export var STEPS = [
  { n: 1, name: "Why this matters" },
  { n: 2, name: "Words and phrases" },
  { n: 3, name: "Linking words" },
  { n: 4, name: "Sentence practice" },
  { n: 5, name: "Planning" },
  { n: 6, name: "Your own text" }
];

export var TASKS_PER_GENRE = 11;

/* Правильный ответ не печатается нигде. Вместо него — объяснение правила и
   ещё одна попытка. После трёх попыток пункт закрывается, чтобы прогресс не
   блокировался, но ответ всё равно не показывается: упражнение можно открыть
   заново и попробовать снова. */
export var MAX_TRIES = 3;
export var TRY_AGAIN_NOTE = "Try again — the answer is not shown. The rule above tells you what to change.";
export var LAST_TRY_NOTE = "This one stays unsolved for now. Open the exercise again later and try it once more.";

export function genreTimerMinutes(g) {
  var fw = (g.tasks || []).filter(function (t) { return t.type === "free-write"; })[0];
  return (fw && fw.minutes) || g.timerMinutes || 25;
}
/* В прототипе диапазон брался из Pad.genre; здесь — чистая форма от жанра. */
export function padTargetRange(genre) {
  return (genre && genre.targetWords) || [120, 150];
}

/* ── Сборка жанра: посев + банк уровня → упражнения ────────────────────
   Отличие от прототипа единственное: RULES/TITLES/HOWTO/LEVEL_TAG были
   модульными глобалами, а тут приходят третьим параметром meta (это
   public/practice/writing/meta.json; лишние поля fnWhy/levelTitles не
   используются). Всё остальное — байт в байт, включая строки посева
   pickN (id+"wo" и т.д.): от них зависит детерминированная подборка. */
export function buildGenre(seed, bank, meta) {
  var RULES = meta.rules, TITLES = meta.titles, HOWTO = meta.howto;
  var id = seed.id, lvl = seed.level, tag = meta.levelTag[lvl];
  var flatPhrases = [];
  seed.phr.forEach(function (grp) { grp[1].forEach(function (p) { flatPhrases.push({ fn: grp[0], t: p[0], ru: p[1], kk: p[2] }); }); });
  var wordsEn = seed.words.map(function (w) { return w[0]; });

  /* --- 1. word-order --- */
  var wo = pickN(seed.sent, id + "wo", 8).map(function (s, i) {
    return { id: "wo" + i, words: s[0].split(/\s+/), why: RULES[s[1]] || RULES.svo };
  });
  /* --- 2. transform --- */
  var tr = pickN(bank.tr, id + "tr", 8).map(function (t, i) {
    return { id: "tr" + i, cue: t.cue, src: t.src, answers: t.ans, must: t.must, avoid: t.avoid, why: t.why };
  });
  /* --- 3. connectors --- */
  var conItems = pickN(bank.connItems, id + "cn", 8).map(function (c, i) {
    return { id: "cn" + i, before: c.a, gap: true, after: c.b, answer: c.ans, why: c.why };
  });
  var conBank = [];
  conItems.forEach(function (c) { if (conBank.indexOf(c.answer) < 0) conBank.push(c.answer); });
  bank.conn.forEach(function (c) {
    var cap = c.charAt(0).toUpperCase() + c.slice(1);
    if (conBank.length < 10 && conBank.indexOf(cap) < 0 && conBank.indexOf(c) < 0) conBank.push(cap);
  });
  /* --- 4. punctuation --- */
  var pu = pickN(seed.sent, id + "pu", 8).map(function (s, i) {
    return { id: "pu" + i, raw: stripPunct(s[0]), answer: s[0], why: RULES[s[1]] || RULES.svo };
  });
  /* --- 5. expand --- */
  var ex = pickN(seed.sent, id + "ex", 8).map(function (s, i) {
    return { id: "ex" + i, cue: toNotes(s[0]), answers: [s[0]], must: keyWords(s[0], 2), why: RULES[s[1]] || RULES.svo };
  });
  /* --- 6. register --- */
  var rg = pickN(bank.reg, id + "rg", 8).map(function (r, i) {
    return { id: "rg" + i, ctx: r.ctx, a: r.fm, b: r.inf, answer: r.ans === "fm" ? "a" : "b", why: r.why };
  });
  /* Шаг с упражнениями на уровне абзаца убран: эти восемь упражнений
     больше не собираются. */
  /* --- 7. idea-bank --- */
  var ideas = seed.ideas.map(function (it, i) {
    return { id: "ib" + i, text: it[0], side: it[1], strong: !!it[2],
      why: it[3] || (it[1] === "in"
        ? (it[2] ? "One of the three ideas that carry the whole text." : "A fact the reader needs in order to act.")
        : "Off the point: it tells the reader nothing about your case.") };
  });
  pickN(bank.offIdeas, id + "oi", 4).forEach(function (o, i) {
    ideas.push({ id: "ibx" + i, text: o[0], side: "out", strong: false, why: o[1] });
  });
  /* --- 8. outline-builder --- */
  var n = seed.model.length;
  var slotOf = function (i) {
    if (i <= 1) return "intro";
    if (i >= n - 2) return "conc";
    return i < Math.ceil((n - 2) / 2) + 1 ? "body1" : "body2";
  };
  var slotLabels = { intro: "1. Opening", body1: "2. Main part", body2: "3. Details", conc: "4. Closing" };
  var ob = seed.model.map(function (m, i) {
    return { id: "ob" + i, text: m[1], slot: slotOf(i),
      why: "“" + m[1] + "” is the job of the " + slotLabels[slotOf(i)].replace(/^\d\. /, "").toLowerCase() + " in this genre." };
  });
  /* --- 9. guided-write --- */
  var gw = seed.model.slice(0, 7).map(function (m, i) {
    var ph = flatPhrases[i % flatPhrases.length];
    return { id: "gw" + i, q: m[1] + ".", hint: "One or two sentences. A phrase you can use: " + ph.t };
  });
  /* --- чек-лист: часть пунктов проверяется автоматически по словам --- */
  var checklist = seed.phr.map(function (grp) {
    return { text: "I used a phrase for " + grp[0].toLowerCase(),
      auto: grp[1].map(function (p) { return p[0].toLowerCase().replace(/[….]+$/, "").split(/\s+/).slice(0, 3).join(" "); }) };
  });
  checklist.push({ text: "I used at least two linking words", auto: bank.conn });
  checklist.push({ text: "I used the topic words of this genre", auto: wordsEn.map(function (w) { return w.toLowerCase(); }) });
  checklist.push({ text: "I wrote in paragraphs, not one block", manual: true });
  checklist.push({ text: "I checked my verb tenses", manual: true });
  checklist.push({ text: "I checked articles a / an / the", manual: true });
  checklist.push({ text: "I read the text out loud before sending", manual: true });

  var tasks = [
    { id: "t1", step: 4, type: "word-order", items: wo },
    { id: "t2", step: 4, type: "transform", items: tr },
    { id: "t3", step: 4, type: "connectors", bank: conBank, items: conItems },
    { id: "t4", step: 4, type: "punctuation", items: pu },
    { id: "t5", step: 4, type: "expand", items: ex },
    { id: "t6", step: 4, type: "register", items: rg },
    { id: "t7", step: 5, type: "idea-bank", columns: [{ id: "in", label: "Goes into my text" }, { id: "out", label: "Leave it out" }], items: ideas, pickCount: 3 },
    { id: "t8", step: 5, type: "outline-builder",
      slots: [{ id: "intro", label: slotLabels.intro }, { id: "body1", label: slotLabels.body1 }, { id: "body2", label: slotLabels.body2 }, { id: "conc", label: slotLabels.conc }],
      items: ob, rules: bank.outlineRules },
    { id: "t9", step: 6, type: "guided-write", items: gw },
    { id: "t10", step: 6, type: "free-write", target: seed.tw, minutes: seed.mins, prompt: seed.task },
    { id: "t11", step: 6, type: "overall", items: [
      { id: "task", label: "Task achieved", hint: bank.rubric.task },
      { id: "organisation", label: "Organisation", hint: bank.rubric.organisation },
      { id: "vocabulary", label: "Vocabulary", hint: bank.rubric.vocabulary },
      { id: "grammar", label: "Grammar", hint: bank.rubric.grammar }
    ] }
  ];
  tasks.forEach(function (t) { t.title = TITLES[t.type]; t.howto = HOWTO[t.type]; });

  return {
    id: id, title: seed.title, subtitle: seed.sub, goal: seed.goal, why: seed.why, example: seed.ex,
    targetWords: seed.tw, register: seed.reg, timerMinutes: seed.mins,
    writeTask: seed.task, level: lvl,
    /* Готового модельного текста в жанре нет: ученик нигде его не видит.
       От разметки жанра остаются только названия частей — это план, а не текст. */
    outline: seed.model.map(function (m) { return { label: m[0], job: m[1] }; }),
    phrases: seed.phr.map(function (grp) {
      return { fn: grp[0], items: grp[1].map(function (p) { return { t: p[0], lv: tag, ru: p[1], kk: p[2] }; }) };
    }),
    connectors: bank.connTable,
    wordlist: wordsEn,
    gloss: seed.words,
    checklist: checklist,
    rubricHints: bank.rubric,
    tasks: tasks
  };
}
