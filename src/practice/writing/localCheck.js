/* Ported from data/jtswriting.html — офлайн-проверка письма и разборщик
   ошибок в собственном тексте ученика. Регексы, пороги и веса оценок
   перенесены дословно: это поведенческий контракт с прототипом, «причёсывать»
   их нельзя. DOM и глобальные Pad/MyWords/RULES заменены параметрами
   (payload/ctx/opts.rules), чтобы модуль одинаково работал в браузере и на
   сервере API-роута. */

import { wordsOf, sentencesOf, plural } from "./textStats.js";

/* ── Встроенная проверка по правилам (офлайн) ─────────────────────────── */
export var L1_RULES = [
  { rx: /\bi am agree\b/gi, fix: "I agree", type: "grammar", sev: "high", why: "Agree is a verb: I agree. The 'am' comes from a direct translation." },
  { rx: /\bvery like\b/gi, fix: "really like", type: "grammar", sev: "medium", why: "Very does not strengthen a verb: really like, or like … very much." },
  { rx: /\binformations\b/gi, fix: "information", type: "grammar", sev: "high", why: "Information is uncountable and has no plural." },
  { rx: /\badvices\b/gi, fix: "advice", type: "grammar", sev: "high", why: "Advice is uncountable: a piece of advice, never advices." },
  { rx: /\bpeoples\b/gi, fix: "people", type: "grammar", sev: "medium", why: "People is already plural." },
  { rx: /\bi didn'?t saw\b/gi, fix: "I didn't see", type: "grammar", sev: "high", why: "After did the verb goes back to its base form." },
  { rx: /\bmore better\b/gi, fix: "better", type: "grammar", sev: "medium", why: "One comparative at a time: better, not more better." },
  { rx: /\bdon'?t have no\b/gi, fix: "don't have any", type: "grammar", sev: "high", why: "English does not use double negatives." },
  { rx: /\bi want that you\b/gi, fix: "I would like you to", type: "grammar", sev: "high", why: "After want and would like English uses to + verb, not that." },
  { rx: /\bi wait (your|the) answer\b/gi, fix: "I look forward to your answer", type: "register", sev: "medium", why: "The literal translation sounds abrupt in a letter." },
  { rx: /\bin the last time\b/gi, fix: "recently", type: "vocabulary", sev: "low", why: "A calque: English says recently." },
  { rx: /\bi feel myself\b/gi, fix: "I feel", type: "grammar", sev: "medium", why: "Feel takes no reflexive pronoun in English." },
  { rx: /\bcan to\b/gi, fix: "can", type: "grammar", sev: "high", why: "After a modal verb there is no to." },
  { rx: /\bvery bad\b/gi, fix: "unacceptable", type: "vocabulary", sev: "low", why: "In formal writing a precise adjective carries more weight than very + bad." },
  { rx: /\bvery good\b/gi, fix: "excellent", type: "vocabulary", sev: "low", why: "Very good is the palest praise available." },
  { rx: /\bwrite me\b/gi, fix: "write to me", type: "grammar", sev: "medium", why: "Write takes to before the person in British usage." },
  { rx: /\bi am writing you\b/gi, fix: "I am writing to you", type: "grammar", sev: "medium", why: "The preposition to is needed: writing to you." },
  { rx: /\bthanks a lot\b/gi, fix: "Thank you in advance", type: "register", sev: "medium", why: "Spoken thanks in a formal letter reads as careless." },
  { rx: /\bhi guys\b/gi, fix: "Dear Sir or Madam", type: "register", sev: "high", why: "An organisation is not addressed in spoken English." },
  { rx: /\bnowadays in the modern world\b/gi, fix: "today", type: "vocabulary", sev: "low", why: "Two ways of saying now, one after the other." }
];

/* goldHits из прототипа читал myWordList() из глобального состояния; здесь
   список приходит параметром — серверу неоткуда взять localStorage ученика. */
export function goldHits(low, list) {
  var n = 0;
  (list || []).forEach(function (w) { if (low.indexOf(w.toLowerCase()) >= 0) n++; });
  return n;
}

export function splitIntoParagraphs(txt) {
  var s = sentencesOf(txt);
  if (s.length < 4) return txt;
  var third = Math.ceil(s.length / 3);
  var out = [];
  for (var i = 0; i < s.length; i += third) out.push(s.slice(i, i + third).map(function (x) { return x.trim() + "."; }).join(" "));
  return out.join("\n\n");
}

/* Порт localCheck() из прототипа. payload = {level, genre, targetWords, task,
   text}; ctx = {wordlist?, checklist?, myWords?} — то, что прототип брал из
   Pad.genre и myWordList(). Без wordlist/checklist деградируем ровно как
   прототип без выбранного жанра: coverage 0.6, словарный бонус 0.5. */
export function localAssess(payload, ctx) {
  var p = payload, cx = ctx || {};
  var genre = (cx.wordlist || cx.checklist)
    ? { wordlist: cx.wordlist || [], checklist: cx.checklist || [] }
    : null;
  /* myWordList() прототипа: личные слова ученика + словарь жанра без дублей. */
  var myWords = (cx.myWords || []).slice();
  if (genre) genre.wordlist.forEach(function (w) { if (myWords.indexOf(w) < 0) myWords.push(w); });

  var text = p.text, low = text.toLowerCase();
  var words = wordsOf(text).length;
  var sents = sentencesOf(text);
  var paras = text.split(/\n{2,}/).filter(function (x) { return wordsOf(x).length > 3; }).length || 1;
  var avg = sents.length ? words / sents.length : 0;
  var corrections = [];

  L1_RULES.forEach(function (r) {
    var m, used = 0;
    r.rx.lastIndex = 0;
    while ((m = r.rx.exec(text)) && used < 3) {
      corrections.push({ original: m[0], corrected: r.fix, type: r.type, severity: r.sev, explanation: r.why });
      used++;
      if (!r.rx.global) break;
    }
  });

  var mi = /(^|\s)i(\s|')/.exec(text);
  if (mi) corrections.push({ original: mi[0], corrected: mi[0].replace(/i/, "I"), type: "spelling", severity: "medium", explanation: "The pronoun I is always a capital letter." });

  var genreWords = genre ? genre.wordlist : [];
  genreWords.slice(0, 6).forEach(function (w) {
    if (corrections.length >= 12) return;
    var rx = new RegExp("(^|[^\\w])(?!a |an |the |my |your |this |that |two |our )\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    var m2 = rx.exec(text);
    if (m2) {
      var frag = m2[0].trim();
      if (frag && !/^(a|an|the|my|your|our)\b/i.test(frag) && text.indexOf(frag) >= 0 && /^[a-z]/i.test(frag)) {
        corrections.push({ original: frag, corrected: "the " + w, type: "grammar", severity: "medium", explanation: "A specific countable noun needs an article: the " + w + "." });
      }
    }
  });

  corrections = corrections.slice(0, 12);

  var strengths = [];
  var CONN = ["however", "therefore", "in addition", "although", "as a result", "moreover", "due to", "despite", "nevertheless", "furthermore", "whereas", "consequently"];
  var connCount = 0;
  CONN.forEach(function (c) { if (low.indexOf(c) >= 0) connCount++; });
  sents.forEach(function (s) {
    if (strengths.length >= 3) return;
    var sl = s.toLowerCase();
    for (var i = 0; i < CONN.length; i++) {
      if (sl.indexOf(CONN[i]) >= 0 && text.indexOf(s.trim()) >= 0) {
        strengths.push({ quote: s.trim(), why: "The linking word “" + CONN[i] + "” holds two ideas together — this is what turns sentences into a text." });
        return;
      }
    }
  });
  ["would be grateful", "i am writing to", "look forward", "i would like to request", "in my opinion", "on balance"].forEach(function (ph) {
    if (strengths.length >= 3) return;
    var at = low.indexOf(ph);
    if (at >= 0) strengths.push({ quote: text.substr(at, ph.length), why: "Exactly the formula this genre expects at this point." });
  });

  var covered = 0, totalChecks = 0;
  if (genre) {
    genre.checklist.forEach(function (c) {
      if (!c.auto) return;
      totalChecks++;
      for (var i = 0; i < c.auto.length; i++) if (low.indexOf(c.auto[i]) >= 0) { covered++; return; }
    });
  }
  var coverage = totalChecks ? covered / totalChecks : 0.6;

  var high = corrections.filter(function (c) { return c.severity === "high"; }).length;
  var med = corrections.filter(function (c) { return c.severity === "medium"; }).length;
  var inRange = words >= p.targetWords[0] && words <= p.targetWords[1];
  function clamp(v) { return Math.max(0, Math.min(5, Math.round(v * 2) / 2)); }
  var sTask = clamp(1.5 + coverage * 3 + (inRange ? 0.5 : (words < p.targetWords[0] * 0.7 ? -1 : 0)));
  var sOrg = clamp(1.5 + Math.min(paras, 4) * 0.5 + Math.min(connCount, 3) * 0.4 + (avg > 28 ? -0.5 : 0));
  var sVoc = clamp(3 + (genre ? goldHits(low, myWords) * 0.25 : 0.5) - corrections.filter(function (c) { return c.type === "vocabulary"; }).length * 0.5);
  var sGr = clamp(4.5 - high * 0.8 - med * 0.4);
  var avgS = (sTask + sOrg + sVoc + sGr) / 4;
  var cefr = avgS >= 4.3 ? "B2" : avgS >= 3 ? "B1" : avgS >= 2 ? "A2" : "A1";

  var rewrite = text;
  corrections.forEach(function (c) { if (c.original && c.corrected) rewrite = rewrite.split(c.original).join(c.corrected); });
  if (paras < 3 && words > 60) rewrite = splitIntoParagraphs(rewrite);

  var steps = [];
  if (!inRange) steps.push(words < p.targetWords[0]
    ? "Get the length up to " + p.targetWords[0] + "–" + p.targetWords[1] + " words: you are at " + words + ". Add one more fact and its consequence."
    : "Cut the text down to " + p.targetWords[1] + " words: remove repetitions and openings like 'I would like to say that'.");
  if (paras < 3) steps.push("Split the text into at least three paragraphs: purpose → facts → what you want.");
  if (connCount < 2) steps.push("Use at least two linking words — one 'however' and one 'therefore', in different paragraphs.");
  if (high > 0) steps.push("Fix the " + high + " serious " + plural(high, "mistake", "mistakes") + " listed below and read the text out loud afterwards.");
  if (coverage < 0.8) steps.push("Check the list on the right: at least one required point of the task is not in your text.");
  if (avg > 28) steps.push("Split your sentences: you are averaging " + Math.round(avg) + " words per sentence.");
  while (steps.length < 3) steps.push("Replace the two palest words in the text with exact ones: good → reliable, bad → faulty.");
  steps = steps.slice(0, 3);

  var summary = "This is the offline checker: the AI checking service was not available, so the text was assessed against built-in rules. " +
    "It has " + words + " " + plural(words, "word", "words") + ", " + paras + " " + plural(paras, "paragraph", "paragraphs") +
    " and " + connCount + " " + plural(connCount, "linking word", "linking words") + ". " +
    (high ? "The main thing holding it back is the serious grammar mistakes listed below." : "There are no serious grammar mistakes — the work now is precision of vocabulary and structure.");

  return {
    scores: { task: sTask, organisation: sOrg, vocabulary: sVoc, grammar: sGr },
    cefr: cefr, wordCount: words, summary: summary,
    strengths: strengths, corrections: corrections, rewrite: rewrite, nextSteps: steps, mode: "offline"
  };
}

/* ════════════════════════════════════════════════════════════════════════
   РАЗБОР ОШИБОК В СОБСТВЕННОМ ТЕКСТЕ УЧЕНИКА.
   Один разборщик на все задания: ученик пишет своё, а система показывает,
   что именно не так и почему. Не отметка, а объяснение правила на его же
   строчке: было → стало → почему.
   ═══════════════════════════════════════════════════════════════════════ */

export var NOUN_ING = ["thing", "things", "king", "ring", "string", "morning", "evening", "meaning",
  "building", "something", "nothing", "anything", "everything", "feeling", "feelings",
  "during", "spring", "wing", "ceiling", "shopping", "clothing", "training", "wedding",
  "beginning", "warning", "booking", "meeting", "opening", "closing", "willing"];

export var BASE_VERBS = ["have", "do", "go", "want", "need", "take", "make", "get", "say", "come",
  "look", "work", "live", "write", "send", "buy", "cost", "seem", "feel", "know", "think",
  "like", "love", "hate", "use", "play", "study", "help", "start", "stop", "arrive",
  "answer", "cause", "mean", "keep", "give", "tell", "ask", "call", "try", "become",
  "hear", "meet", "receive", "see", "pay", "visit", "read", "speak", "talk", "sign", "join"];

export var COUNT_NOUNS = ["day", "week", "month", "year", "hour", "minute", "email", "letter",
  "word", "sentence", "problem", "question", "item", "product", "order", "photo", "book",
  "film", "ticket", "friend", "student", "teacher", "shop", "phone", "person", "time",
  "reason", "point", "step", "page", "line", "class", "lesson", "mistake"];

export var PAST_TO_BASE = {
  went: "go", saw: "see", took: "take", made: "make", bought: "buy", came: "come",
  got: "get", said: "say", had: "have", was: "be", were: "be", wrote: "write",
  sent: "send", knew: "know", thought: "think", gave: "give", told: "tell",
  found: "find", left: "leave", paid: "pay", spent: "spend", broke: "break"
};

export var E_VERBS = ["arrive", "use", "receive", "replace", "promise", "decide", "close",
  "invite", "provide", "include", "produce", "change", "charge", "damage", "manage",
  "move", "live", "like", "hope", "note", "quote", "refuse", "complete", "continue",
  "increase", "reduce", "require", "serve", "solve", "share", "care", "leave", "believe"];

export var A_VOWEL_EXCEPT = ["university", "universities", "useful", "user", "users", "unit",
  "uniform", "european", "one", "once", "usual", "usually"];
export var AN_CONS_EXCEPT = ["hour", "hours", "honest", "honestly", "honour", "honourable", "heir"];

/* Каждое правило: находит подстроку, предлагает замену и объясняет причину.
   Объяснения — целые строки без подстановок, чтобы их можно было перевести. */
export var ANALYSERS = [
  { id: "space-punct", rx: /\s+([,.;:!?])/g,
    fix: function (m, p1) { return p1; },
    why: "In English there is no space before a comma or a full stop — the space goes after it." },

  { id: "double-space", rx: /(\w+) {2,}(\w+)/g,
    fix: function (m, p1, p2) { return p1 + " " + p2; },
    why: "Two spaces in a row are a typing slip: one space between words is enough." },

  { id: "double-word", rx: /\b(\w+)\s+\1\b/gi,
    fix: function (m, p1) { return p1; },
    why: "The same word is written twice in a row." },

  { id: "a-vowel", rx: /\ba\s+([aeiou]\w+)/gi,
    skip: function (m, p1) { return A_VOWEL_EXCEPT.indexOf(p1.toLowerCase()) >= 0; },
    fix: function (m, p1) { return (/^A\s/.test(m) ? "An " : "an ") + p1; },
    why: "Before a vowel sound the article is an: an email, an hour, an answer." },

  { id: "an-cons", rx: /\ban\s+([bcdfgjklmnpqrstvwxyz]\w+)/gi,
    skip: function (m, p1) { return AN_CONS_EXCEPT.indexOf(p1.toLowerCase()) >= 0; },
    fix: function (m, p1) { return (/^An\s/.test(m) ? "A " : "a ") + p1; },
    why: "Before a consonant sound the article is a: a letter, a phone, a reason." },

  { id: "modal-to", rx: /\b(can|could|must|should|will|would|may|might)\s+to\s+(\w+)/gi,
    fix: function (m, p1, p2) { return p1 + " " + p2; },
    rule: "modal" },

  { id: "did-past", rx: /\b(did not|didn'?t|did)\s+(went|saw|took|made|bought|came|got|said|had|wrote|sent|knew|thought|gave|told|found|left|paid|spent|broke)\b/gi,
    fix: function (m, p1, p2) { return p1 + " " + (PAST_TO_BASE[p2.toLowerCase()] || p2); },
    rule: "past" },

  { id: "third-s", rx: /\b(he|she|it)\s+(have|do|go|want|need|take|make|get|say|come|look|work|live|write|send|buy|cost|seem|feel|know|think|like|love|hate|use|play|study|help|start|stop|arrive|answer|cause|mean|keep|give|tell|ask|call|try|become)\b/gi,
    fix: function (m, p1, p2) {
      var v = p2.toLowerCase(), s;
      if (v === "have") s = "has";
      else if (v === "do" || v === "go") s = v + "es";
      else if (/(ch|sh|ss|x|o)$/.test(v)) s = v + "es";
      else if (/[^aeiou]y$/.test(v)) s = v.slice(0, -1) + "ies";
      else s = v + "s";
      return p1 + " " + s;
    },
    rule: "present3" },

  { id: "third-dont", rx: /\b(he|she|it)\s+(don'?t|do not)\b/gi,
    fix: function (m, p1, p2) { return p1 + " " + (/ /.test(p2) ? "does not" : "doesn't"); },
    rule: "present3" },

  { id: "be-missing", rx: /\b(I|he|she|it|we|they|you)\s+(\w{4,}ing)\b/gi,
    skip: function (m, p1, p2) { return NOUN_ING.indexOf(p2.toLowerCase()) >= 0; },
    fix: function (m, p1, p2) {
      var p = p1.toLowerCase(), be = p === "i" ? "am" : (p === "he" || p === "she" || p === "it") ? "is" : "are";
      return (p === "i" ? "I" : p1) + " " + be + " " + p2;
    },
    rule: "be" },

  { id: "dbl-neg", rx: /\b(do not|don'?t|does not|doesn'?t|did not|didn'?t|cannot|can'?t)\s+((?:\w+\s+){0,2}?)(no|nothing|nobody|never)\b/gi,
    fix: function (m, p1, p2, p3) {
      var map = { no: "any", nothing: "anything", nobody: "anybody", never: "ever" };
      return p1 + " " + p2 + map[p3.toLowerCase()];
    },
    rule: "negative" },

  { id: "more-er", rx: /\bmore\s+(better|worse|cheaper|bigger|smaller|easier|harder|faster|slower|longer|shorter|higher|lower|nicer|older|younger)\b/gi,
    fix: function (m, p1) { return p1; },
    rule: "compare" },

  { id: "plural-num", rx: /\b(two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(day|week|month|year|hour|minute|email|letter|word|sentence|problem|question|item|product|order|photo|book|film|ticket|friend|student|teacher|shop|phone|reason|point|step|page|line|lesson|mistake)\b/gi,
    fix: function (m, p1, p2) { return p1 + " " + p2 + "s"; },
    rule: "plural" },

  { id: "much-count", rx: /\bmuch\s+(emails|people|problems|things|days|words|mistakes|students|items|letters|questions|reasons)\b/gi,
    fix: function (m, p1) { return "many " + p1; },
    rule: "quantifier" },

  { id: "many-uncount", rx: /\bmany\s+(information|advice|money|time|homework|furniture|news|luggage|equipment)\b/gi,
    fix: function (m, p1) { return "much " + p1; },
    rule: "quantifier" },

  { id: "if-will", rx: /\b(if|If|IF)\s+((?:\w+\s+){1,3}?)will\s+(\w+)/g,
    fix: function (m, p1, p2, p3) {
      var subj = p2.trim(), v = p3.toLowerCase();
      var third = /^(he|she|it|the|this|that|my|his|her|its|a|an)\b/i.test(subj) && !/\b(they|we|you|I)\b/i.test(subj);
      var form = !third ? v : (/(ch|sh|ss|x|o)$/.test(v) ? v + "es" : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + "ies" : v + "s");
      return p1 + " " + subj + " " + form;
    },
    rule: "conditional" },

  { id: "did-regular", rx: /\b(did not|didn'?t|did)\s+(\w{4,}ed)\b/gi,
    fix: function (m, p1, p2) {
      var v = p2.toLowerCase(), base;
      if (/ied$/.test(v)) base = v.slice(0, -3) + "y";
      else if (/([^aeiou])\1ed$/.test(v)) base = v.slice(0, -3);
      else if (E_VERBS.indexOf(v.slice(0, -1)) >= 0) base = v.slice(0, -1);
      else base = v.slice(0, -2);
      if (!/[aeiou]/.test(base)) base = v.slice(0, -1);
      return p1 + " " + base;
    },
    rule: "past" },

  { id: "linker-comma", rx: /(^|[.!?]\s+)(However|Therefore|Moreover|Furthermore|Nevertheless|In addition|In conclusion|For example)\s+(?=[a-zA-Z])/g,
    fix: function (m, p1, p2) { return p1 + p2 + ", "; },
    rule: "linker" },

  { id: "prep-ing", rx: /\b(look forward to|instead of|interested in|good at|before|after|without)\s+(?!being\b)(\w+)\b(?=\s)/gi,
    only: function (m, p1, p2) { return BASE_VERBS.indexOf(p2.toLowerCase()) >= 0; },
    fix: function (m, p1, p2) {
      var v = p2.toLowerCase();
      var ing = /e$/.test(v) && !/ee$/.test(v) ? v.slice(0, -1) + "ing" : v + "ing";
      return p1 + " " + ing;
    },
    rule: "gerund" },

  /* Заглавная I разбирается последней: структурные правила важнее и
     должны первыми забрать это место в строке. */
  { id: "cap-i", rx: /\bi\b/g,
    fix: function () { return "I"; },
    why: "The pronoun I is always a capital letter in English, anywhere in the sentence." }
];

/* Заглавная буква в начале каждого предложения — считается отдельно,
   потому что зависит от позиции, а не от подстроки. */
export function capitalStarts(text) {
  var out = [], re = /(^|[.!?]\s+)([a-z])/g, m;
  while ((m = re.exec(text)) !== null) {
    var at = m.index + m[1].length;
    out.push({ from: at, to: at + 1, original: m[2], corrected: m[2].toUpperCase(),
      why: "Every sentence starts with a capital letter — that is how the reader sees where it begins." });
    if (out.length > 4) break;
  }
  return out;
}

/* Разбор текста: список находок вида было → стало → почему.
   opts.rules = {тег: объяснение} — то, что прототип читал из глобального
   RULES: объяснения тянет вызывающая сторона (там же живёт их перевод). */
export function analyseText(text, opts) {
  var src = String(text || "");
  if (!src.trim()) return [];
  var o = opts || {};
  var rules = o.rules || {};
  var found = [], taken = [];

  function overlaps(from, to) {
    for (var i = 0; i < taken.length; i++) if (from < taken[i][1] && to > taken[i][0]) return true;
    return false;
  }
  function push(from, to, original, corrected, why, id) {
    if (original === corrected || overlaps(from, to)) return;
    taken.push([from, to]);
    found.push({ from: from, to: to, original: original, corrected: corrected, why: why, id: id });
  }

  /* Типовые кальки с русского и казахского разбираются первыми: у них
     объяснение конкретнее, чем у общих правил. */
  L1_RULES.forEach(function (r) {
    var re = new RegExp(r.rx.source, r.rx.flags);
    var m;
    while ((m = re.exec(src)) !== null) {
      if (m[0] === "") { re.lastIndex++; continue; }
      push(m.index, m.index + m[0].length, m[0], r.fix, r.why, "l1");
    }
  });

  ANALYSERS.forEach(function (rule) {
    var re = new RegExp(rule.rx.source, rule.rx.flags);
    var m;
    while ((m = re.exec(src)) !== null) {
      if (m[0] === "") { re.lastIndex++; continue; }
      if (rule.skip && rule.skip.apply(null, m)) continue;
      if (rule.only && !rule.only.apply(null, m)) continue;
      var fixed = rule.fix.apply(null, m);
      var why = rule.why || (rules[rule.rule] || "");
      push(m.index, m.index + m[0].length, m[0], fixed, why, rule.id);
      if (found.length > 12) break;
    }
  });

  capitalStarts(src).forEach(function (c) { push(c.from, c.to, c.original, c.corrected, c.why, "cap-start"); });

  /* Точка в конце — только если ученика просили написать целое предложение. */
  if (o.wholeSentence !== false) {
    var trimmed = src.replace(/\s+$/, "");
    if (trimmed && !/[.!?…]$/.test(trimmed) && wordsOf(trimmed).length >= 3) {
      found.push({ from: trimmed.length, to: trimmed.length, original: "", corrected: ".",
        why: "A sentence needs a full stop at the end — without it the reader does not know where it stops.",
        id: "end-stop" });
    }
  }

  found.sort(function (a, b) { return a.from - b.from; });
  return found.slice(0, 8);
}

/* Текст с применёнными правками — «как это выглядит без ошибок». */
export function applyFindings(text, findings) {
  var out = String(text), sorted = findings.slice().sort(function (a, b) { return b.from - a.from; });
  sorted.forEach(function (f) { out = out.slice(0, f.from) + f.corrected + out.slice(f.to); });
  return out;
}
