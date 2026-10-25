// Ядра Word Hunt — три чистых скрипта прототипа методиста без DOM, перенесённые
// ДОСЛОВНО: XWCore (слова урока → задания, раскладка и проверка кроссворда),
// WSCore (доска поиска слов) и LXClue (какая подсказка по CEFR-уровню слова).
// Прототип сам гонял их в Node на аудите — сетка, которую видит ученик, ровно
// та, что проверена. Поэтому здесь не правится ни одна строка логики: порт
// сверяется с оракулом, снятым с прототипа (scripts/wordhunt/extract-oracle.js →
// __fixtures__/oracle.json), и красный engine.test.js значит, что порт
// разъехался с исходником.
//
// Отличия — только связь с данными: глобалы CLUEQ и PICS прототипа приходят
// аргументами (бандл /mobile/word-hunt), LXClue берёт XWCore из замыкания, а не
// через typeof, диакритика в deacc записана экранированием ̀-ͯ вместо
// самих знаков (смысл тот же). У каждого экземпляра свой кэш сеток XWCore.build.

export function createCores({ clueq, pics } = {}) {
  var CLUEQ = clueq || {};
  var PICS = pics || {};

  /* =====================================================================
     just to study — Crosswords · core (data → items → puzzles)

     Pure logic, no DOM. The same file runs in the page and in the offline
     audit (Node), so the grids a learner sees are exactly the grids that
     were validated.

     Source of truth: the Vocabulary DB already embedded in this file. Every
     atom (the unit the trainer teaches — one word or one fixed phrase) of
     every lesson becomes one crossword item. Nothing is added, renamed or
     rewritten: the answer is the atom's own English form; clues are the
     atom's own translation, example sentence, definition or collocations.

     An item either goes into the grid, or — when a grid cannot hold it
     honestly (punctuation, digits, a frame like "This is…", fewer than three
     or more than fifteen letters, four words or more, no letter it can cross
     on) — it is practised in the same puzzle as a letter strip: the same
     clue, the same cells-and-typing interaction, the same hints and checks.
     So every vocabulary item of a lesson is practised in that lesson's
     crossword, and the grid itself never contains a forced or broken entry.
     ===================================================================== */
  var XWCore = (function () {
    'use strict';

    var MAXLEN = 15;          /* longest grid answer, letters */
    var MINLEN = 3;           /* shortest grid answer, letters */
    var MAXWORDS = 3;         /* a grid answer is a word or a short phrase */
    var BOUND = 15;           /* grid never exceeds BOUND × BOUND */
    var PART = 12;            /* items per puzzle: one screen of clues */
    var TRIES = 70;           /* layouts tried per puzzle, best one kept */

    /* ------------------------------------------------------ text tools -- */
    function deacc(s) {
      return String(s).normalize ? String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '') : String(s);
    }
    /* the letters a learner types for an English form */
    function lettersOf(s) { return deacc(s).toUpperCase().replace(/[^A-Z]/g, ''); }
    /* the form without its usage note: "consist (of)" -> "consist" */
    function core(en) { return String(en).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim(); }
    /* crossword enumeration, British convention: (4,5) words, (4-4) hyphens;
       apostrophes are not counted */
    function enumOf(en) {
      var s = deacc(core(en)).replace(/[’']/g, '');
      var out = '', run = 0;
      for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i);
        if (/[A-Za-z]/.test(ch)) run++;
        else if (ch === ' ' || ch === '-') {
          if (run) { out += run + (ch === ' ' ? ',' : '-'); run = 0; }
        }
      }
      if (run) out += run;
      return out.replace(/[,-]$/, '');
    }
    var STOP = { the: 1, and: 1, for: 1, with: 1, someone: 1, something: 1, somebody: 1,
                 your: 1, you: 1, are: 1, not: 1, from: 1, into: 1, of: 1, to: 1, in: 1,
                 on: 1, at: 1, by: 1, up: 1, out: 1, off: 1, a: 1, an: 1, it: 1, is: 1 };
    function toks(s) { return deacc(String(s).toLowerCase()).split(/[^a-z]+/).filter(Boolean); }
    /* Does a clue text give the answer away? A token of the clue that is a word
       of the answer, or shares its stem ("advertising" / "advertisements"),
       counts as a giveaway. False alarms only cost a fallback clue. */
    function leakSpans(text, en) {
      var out = [];
      if (!text) return out;
      var aw = toks(core(en)).filter(function (w) { return w.length >= 3 && !STOP[w]; });
      if (!aw.length) return out;
      var re = /[A-Za-z\u00C0-\u024F]+/g, m;
      while ((m = re.exec(String(text)))) {
        var t = deacc(m[0]).toLowerCase();
        for (var i = 0; i < aw.length; i++) {
          var w = aw[i];
          var stem = w.length >= 5 ? w.slice(0, Math.max(4, Math.min(6, w.length - 2))) : null;
          if (t === w || (stem && t.length >= 4 && t.indexOf(stem) === 0) ||
              (!stem && t.indexOf(w) === 0 && t.length <= w.length + 3)) {
            out.push({ s: m.index, e: m.index + m[0].length });
            break;
          }
        }
      }
      return out;
    }
    function leaks(text, en) { return leakSpans(text, en).length > 0; }

    /* ---------------------------------------------------- suitability -- */
    /* Why an item cannot sit in a grid ('' = it can). The reason is kept with
       the item so the inventory can say exactly what happened to every word. */
    function gridReason(en) {
      /* a closing question mark is punctuation of the phrase, not part of the
         word: "How many?" is the item HOW MANY */
      var s = String(en).trim().replace(/\s*\?$/, '');
      if (/[0-9]/.test(s)) return 'digits';
      if (/[…?!,()\/*–—.:;"]/.test(s)) return 'punct';
      var n = lettersOf(s).length;
      if (n < MINLEN) return 'short';
      if (n > MAXLEN) return 'long';
      if (s.trim().split(/\s+/).length > MAXWORDS) return 'phrase';
      return '';
    }

    /* --------------------------------------------------------- clues ---- */
    /* the example sentence, only when it is a clean single gap that the atom
       itself fills (the trainer's own 'nogap' flag marks the others) */
    function ctxClue(a) {
      var c = a && a.ctx;
      if (!c || a.nogap) return '';
      if ((c.match(/___/g) || []).length !== 1) return '';
      if (/\{\{/.test(c)) return '';
      if (/[A-Za-z]___|___[A-Za-z]/.test(c)) return '';      /* "___ed": inflected gap */
      if (leaks(c.replace('___', ' '), a.en)) return '';
      return c;
    }
    /* collocations with the word blanked: "an ___ silence · feel ___" */
    function colClue(colloc, en) {
      if (!colloc) return '';
      var w = core(en);
      if (!w) return '';
      var re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'ig');
      var out = [];
      String(colloc).split(/\s*[·;]\s*/).forEach(function (f) {
        if (!f || !re.test(f)) { re.lastIndex = 0; return; }
        re.lastIndex = 0;
        var g = f.replace(re, '___');
        if (leaks(g.replace(/___/g, ' '), en)) return;
        out.push(g);
      });
      return out.slice(0, 3).join(' · ');
    }
    function defClue(def, en) {
      if (!def) return '';
      var d = String(def).trim();
      if (leaks(d, en)) return '';
      return d;
    }

    /* ---------------------------------------------------------- items --- */
    /* One item per distinct answer in a lesson. Two atoms with the same id
       (spelling variants kept by the trainer) or the same letters ("see you
       later" taught twice) are one item that credits both. */
    function itemsFrom(list, src) {
      var out = [], seen = {};
      list.forEach(function (x) {
        var a = x.a, c = x.c;
        if (!a || !a.en || !String(a.en).trim()) return;
        var why = gridReason(a.en);
        var ans = lettersOf(core(a.en));
        /* hyphen and space spellings of one phrase are one item ("closed-loop
           control" = "closed loop control"), as grid words already are */
        var dk = why ? 's:' + String(a.en).toLowerCase().replace(/[’']/g, "'").replace(/[-‐–]/g, ' ').replace(/\s+/g, ' ').trim() : 'g:' + ans;
        if (seen[dk]) { seen[dk].ids.push(a.id); return; }
        var single = !c || !c.atoms || c.atoms.length <= 1;
        var dtext = a.mean || (single && c && c.def) || '';
        var it = {
          key: src + '|' + a.id, id: a.id, ids: [a.id], src: src,
          en: a.en, ans: ans, enumr: enumOf(a.en),
          fit: why ? 'strip' : 'grid', why: why,
          ipa: a.ipa || '',
          ru: a.ru || (single && c && c.ru) || '',
          kk: a.kk || (single && c && c.kk) || '',
          clue: {
            tr: (a.ru || a.kk || (single && c && (c.ru || c.kk))) ? 1 : 0,
            ctx: ctxClue(a),
            def: defClue(a.mean || (single && c && c.def) || '', a.en),
            col: single && c ? colClue(c.colloc, a.en) : ''
          },
          /* a translation names the dictionary form ("сказать"), but the item
             may be a form of it ("said"); the trainer's own definition says so
             ("the past of say") and travels with the translation */
          form: /^(the )?(past|past simple|past participle|plural|comparative|superlative|third person|-ing form)\b/i.test(dtext) ? dtext : '',
          full: a.ctx || '', card: a.card || ''
        };
        seen[dk] = it;
        out.push(it);
      });
      return out;
    }
    function lessonItems(DB, lv, no) {
      var L = DB[lv], les = L && L.lessons && L.lessons[String(no)];
      if (!les) return [];
      var cm = {};
      les.cards.forEach(function (c) { cm[c.id] = c; });
      return itemsFrom(les.atoms.map(function (a) { return { a: a, c: cm[a.card] }; }), lv);
    }

    /* ---------------------------------------------------------- modes --- */
    /* A mode is the kind of clue the learner retrieves the word from. Each mode
       lists its fallbacks in order: an item that has no clean clue of the mode's
       own kind gets the next kind it does have, so no clue is ever invented. */
    var MODES = {
      tr:  ['tr', 'ctx', 'def', 'col'],
      ctx: ['ctx', 'def', 'tr', 'col'],
      def: ['def', 'col', 'ctx', 'tr'],
      col: ['col', 'def', 'ctx', 'tr']
    };
    /* bilingual levels: translation → sentence → English definition.
       B2 is monolingual: meaning → sentence → collocations. */
    function modesFor(lv) {
      if (lv === 'B2') return ['def', 'ctx', 'col'];
      if (lv === 'MY') return ['tr', 'ctx', 'def'];
      return ['tr', 'ctx', 'def'];
    }
    function clueKind(it, mode) {
      var order = MODES[mode] || MODES.tr;
      for (var i = 0; i < order.length; i++) if (it.clue[order[i]]) return order[i];
      return '';
    }
    /* the second clue a hint opens: the first other kind the item has */
    function hintKind(it, shown) {
      var order = ['tr', 'def', 'ctx', 'col'];
      for (var i = 0; i < order.length; i++) {
        if (order[i] !== shown && it.clue[order[i]]) return order[i];
      }
      return '';
    }

    /* ---------------------------------------------------------- parts --- */
    /* Contiguous, balanced split: lesson order keeps lexical sets together
       (brother / sister, the days of the week), so a puzzle stays a topic. */
    function split(list, k) {
      var out = [], at = 0, n = list.length;
      for (var i = 0; i < k; i++) {
        var size = Math.floor(n / k) + (i < n % k ? 1 : 0);
        out.push(list.slice(at, at + size));
        at += size;
      }
      return out;
    }
    /* Grid words and strip items are shared out separately, so every part of a
       lesson gets its fair share of crossable words instead of one part ending
       up with all the long terms and no grid. Inside a part the lesson order is
       kept. */
    function parts(items) {
      var n = items.length;
      if (!n) return [];
      var k = Math.ceil(n / PART);
      var pos = {};
      items.forEach(function (it, i) { pos[it.key] = i; });
      var g = split(items.filter(function (it) { return it.fit === 'grid'; }), k);
      var s = split(items.filter(function (it) { return it.fit !== 'grid'; }), k);
      var out = [];
      for (var i = 0; i < k; i++) {
        out.push(g[i].concat(s[i]).sort(function (p, q) { return pos[p.key] - pos[q.key]; }));
      }
      return out.filter(function (p) { return p.length; });
    }

    /* ------------------------------------------------------------ rng --- */
    function hash(s) {
      var h = 2166136261 >>> 0;
      s = String(s);
      for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      return h >>> 0;
    }
    function rng(seed) {
      var a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    /* -------------------------------------------------------- layout ---- */
    /* Greedy constructive layout, many seeded attempts, best kept.
       A word may only be placed where it crosses an existing word on a shared
       letter, every new cell has empty side-neighbours, and the cells before
       and after it are empty — so the grid can never contain a run of letters
       that is not an entry. The box never grows past BOUND × BOUND. */
    function attempt(words, R) {
      var cells = {};                     /* "r,c" -> { ch, a: bool, d: bool } */
      var placed = [];
      var minR = 0, maxR = 0, minC = 0, maxC = 0;
      function at(r, c) { return cells[r + ',' + c]; }
      function fits(w, r, c, dir) {
        var L = w.length, dr = dir === 'd' ? 1 : 0, dc = dir === 'a' ? 1 : 0, cross = 0;
        var r0 = Math.min(minR, r), c0 = Math.min(minC, c);
        var r1 = Math.max(maxR, r + dr * (L - 1)), c1 = Math.max(maxC, c + dc * (L - 1));
        if (placed.length && (r1 - r0 + 1 > BOUND || c1 - c0 + 1 > BOUND)) return -1;
        if (at(r - dr, c - dc) || at(r + dr * L, c + dc * L)) return -1;
        for (var k = 0; k < L; k++) {
          var rr = r + dr * k, cc = c + dc * k, x = at(rr, cc);
          if (x) {
            if (x.ch !== w.charAt(k)) return -1;
            if (x[dir]) return -1;
            cross++;
          } else {
            if (dir === 'a' ? (at(rr - 1, cc) || at(rr + 1, cc)) : (at(rr, cc - 1) || at(rr, cc + 1))) return -1;
          }
        }
        if (placed.length && !cross) return -1;
        return cross;
      }
      function put(it, r, c, dir) {
        var w = it.ans, dr = dir === 'd' ? 1 : 0, dc = dir === 'a' ? 1 : 0;
        for (var k = 0; k < w.length; k++) {
          var rr = r + dr * k, cc = c + dc * k, key = rr + ',' + cc;
          if (!cells[key]) cells[key] = { ch: w.charAt(k), a: false, d: false };
          cells[key][dir] = true;
        }
        minR = Math.min(minR, r); minC = Math.min(minC, c);
        maxR = Math.max(maxR, r + dr * (w.length - 1)); maxC = Math.max(maxC, c + dc * (w.length - 1));
        placed.push({ it: it, r: r, c: c, dir: dir });
      }
      function best(it) {
        var w = it.ans, cand = [], seen = {};
        for (var key in cells) {
          var p = key.split(','), r = +p[0], c = +p[1], ch = cells[key].ch;
          for (var i = 0; i < w.length; i++) {
            if (w.charAt(i) !== ch) continue;
            ['a', 'd'].forEach(function (dir) {
              var sr = dir === 'd' ? r - i : r, sc = dir === 'a' ? c - i : c, k2 = sr + ',' + sc + dir;
              if (seen[k2]) return;
              seen[k2] = 1;
              var x = fits(w, sr, sc, dir);
              if (x < 1) return;
              var L = w.length;
              var r0 = Math.min(minR, sr), c0 = Math.min(minC, sc);
              var r1 = Math.max(maxR, sr + (dir === 'd' ? L - 1 : 0)), c1 = Math.max(maxC, sc + (dir === 'a' ? L - 1 : 0));
              var h = r1 - r0 + 1, wd = c1 - c0 + 1;
              /* crossings first, then a small, squarish box */
              var score = x * 12 - (h * wd) * 0.18 - Math.abs(h - wd) * 0.9 + R() * 3;
              cand.push({ r: sr, c: sc, dir: dir, s: score });
            });
          }
        }
        if (!cand.length) return null;
        cand.sort(function (p, q) { return q.s - p.s; });
        return cand[0];
      }
      if (!words.length) return { placed: [], cells: cells };
      put(words[0], 0, 0, R() < 0.5 ? 'a' : 'd');
      var pending = words.slice(1);
      for (var pass = 0; pass < 3 && pending.length; pass++) {
        var left = [];
        pending.forEach(function (it) {
          var b = best(it);
          if (b) put(it, b.r, b.c, b.dir); else left.push(it);
        });
        if (left.length === pending.length) { pending = left; break; }
        pending = left;
      }
      var cross = 0;
      for (var k in cells) if (cells[k].a && cells[k].d) cross++;
      return { placed: placed, left: pending, cross: cross,
               h: maxR - minR + 1, w: maxC - minC + 1, minR: minR, minC: minC };
    }

    function layout(items, seed) {
      var words = items.filter(function (it) { return it.ans.length >= MINLEN; });
      if (words.length < 2) return null;
      var bestL = null, bestS = -1e9;
      for (var t = 0; t < TRIES; t++) {
        var R = rng(seed + t * 7919);
        /* long words first — they are the hardest to fit — in a seeded order */
        var order = words.slice().sort(function (p, q) {
          return (q.ans.length - p.ans.length) + (R() - 0.5) * (t ? 5 : 1.2);
        });
        var L = attempt(order, R);
        var s = L.placed.length * 1000 + L.cross * 25 - L.h * L.w * 0.6 - Math.abs(L.h - L.w) * 4;
        if (s > bestS) { bestS = s; bestL = L; }
        if (bestL.placed.length === words.length && t >= 24) break;
      }
      return bestL;
    }

    /* ------------------------------------------------------ assemble ---- */
    /* Normalised puzzle: cells, entries with standard numbering, strips. */
    function assemble(L, items, mode, chooser) {
      var entries = [], used = {};
      var H = L ? L.h : 0, W = L ? L.w : 0;
      if (L) L.placed.forEach(function (p) {
        used[p.it.key] = 1;
        entries.push({ it: p.it, r: p.r - L.minR, c: p.c - L.minC, dir: p.dir, len: p.it.ans.length });
      });
      /* numbering in reading order, one number per starting cell */
      var starts = {};
      entries.forEach(function (e) { starts[e.r + ',' + e.c] = 1; });
      var nums = {}, n = 0;
      for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) if (starts[r + ',' + c]) nums[r + ',' + c] = ++n;
      entries.forEach(function (e) { e.num = nums[e.r + ',' + e.c]; });
      entries.sort(function (p, q) { return (p.dir === q.dir ? 0 : p.dir === 'a' ? -1 : 1) || p.num - q.num; });
      var strips = items.filter(function (it) { return !used[it.key]; }).map(function (it) {
        return { it: it, why: it.why || 'nofit' };
      });
      var all = entries.concat(strips);
      all.forEach(function (e) {
        /* a clue policy (level-dependent) may choose the clue per item */
        var ch = chooser ? chooser(e.it) : null;
        e.kind = ch ? ch.kind : clueKind(e.it, mode);
        e.hint = ch ? ch.hint : hintKind(e.it, e.kind);
        if (ch) e.pol = ch;
      });
      /* A clue may contain another answer of the same puzzle ("She asks a
         question and I ___." next to QUESTION). That word is not printed while
         its own entry is open: it shows as a cross-reference (→ 2↓) and turns
         into the word once that entry is solved. Nothing is given away, and
         nothing is rewritten. */
      var lastNum = 0;
      entries.forEach(function (e) { lastNum = Math.max(lastNum, e.num); });
      strips.forEach(function (e, i) { e.num = lastNum + i + 1; });
      all.forEach(function (e, ix) {
        e.refs = {};
        [e.kind, e.hint].forEach(function (k) {
          if (!k || k === 'tr' || e.refs[k]) return;
          var t = e.it.clue[k], spans = [];
          all.forEach(function (o, oi) {
            if (oi === ix || o.it.ans === e.it.ans) return;
            leakSpans(t, o.it.en).forEach(function (sp) { sp.to = oi; spans.push(sp); });
          });
          if (spans.length) {
            spans.sort(function (p, q) { return p.s - q.s; });
            var kept = [];
            spans.forEach(function (sp) {
              var last = kept[kept.length - 1];
              if (last && sp.s < last.e) return;
              /* "lost property" is one reference, not two */
              if (last && last.to === sp.to && /^[\s-]*$/.test(t.slice(last.e, sp.s))) { last.e = sp.e; return; }
              kept.push({ s: sp.s, e: sp.e, to: sp.to });
            });
            e.refs[k] = kept;
          }
        });
      });
      /* Two entries with the same clue text ("делать" for both MADE and DID)
         are ambiguous: both then show their second clue as well. */
      ['ru', 'kk', 'x'].forEach(function (lang) {
        var by = {};
        all.forEach(function (e) {
          var t = e.kind === 'tr' ? (lang === 'x' ? '' : (e.it[lang] || '') + '|' + e.it.form)
                                  : (lang === 'x' ? e.it.clue[e.kind] : '');
          t = String(t).toLowerCase().replace(/\s+/g, ' ').trim();
          if (!t || t === '|') return;
          (by[t] = by[t] || []).push(e);
        });
        Object.keys(by).forEach(function (t) {
          if (by[t].length > 1) by[t].forEach(function (e) { if (e.hint) e.amb = true; });
        });
      });
      return { h: H, w: W, entries: entries, strips: strips, nums: nums, mode: mode };
    }

    /* ------------------------------------------------------ validate ---- */
    /* Rebuilds the grid from the entries and proves it is a proper crossword.
       Returns '' when valid, otherwise what is wrong. A puzzle that fails is
       never shown — the caller tries other seeds, and in the end falls back to
       strips only, which are always valid. */
    function validate(P) {
      if (!P.entries.length) return '';
      if (P.h > BOUND || P.w > BOUND) return 'bound';
      var g = {};
      for (var i = 0; i < P.entries.length; i++) {
        var e = P.entries[i], dr = e.dir === 'd' ? 1 : 0, dc = e.dir === 'a' ? 1 : 0;
        if (e.len !== e.it.ans.length || e.len < MINLEN) return 'length:' + e.it.en;
        if (!e.kind) return 'noclue:' + e.it.en;
        for (var k = 0; k < e.len; k++) {
          var r = e.r + dr * k, c = e.c + dc * k;
          if (r < 0 || c < 0 || r >= P.h || c >= P.w) return 'outside:' + e.it.en;
          var key = r + ',' + c, ch = e.it.ans.charAt(k);
          if (g[key] && g[key] !== ch) return 'clash:' + e.it.en;
          g[key] = ch;
        }
      }
      /* every run of ≥2 letters is exactly one entry, and vice versa */
      var runs = {};
      function scan(dir) {
        for (var a = 0; a < (dir === 'a' ? P.h : P.w); a++) {
          var start = -1;
          for (var b = 0; b <= (dir === 'a' ? P.w : P.h); b++) {
            var key = dir === 'a' ? a + ',' + b : b + ',' + a;
            var on = b < (dir === 'a' ? P.w : P.h) && g[key];
            if (on && start < 0) start = b;
            if (!on && start >= 0) {
              if (b - start >= 2) runs[(dir === 'a' ? a + ',' + start : start + ',' + a) + dir] = b - start;
              start = -1;
            }
          }
        }
      }
      scan('a'); scan('d');
      var ek = {};
      for (i = 0; i < P.entries.length; i++) {
        e = P.entries[i];
        var id = e.r + ',' + e.c + e.dir;
        if (runs[id] !== e.len) return 'run:' + e.it.en;
        ek[id] = 1;
      }
      for (var rk in runs) if (!ek[rk]) return 'stray:' + rk;
      /* one connected grid */
      var seen = {}, stack = [Object.keys(g)[0]], cnt = 0;
      while (stack.length) {
        var cur = stack.pop();
        if (seen[cur] || !g[cur]) continue;
        seen[cur] = 1; cnt++;
        var p = cur.split(','), rr = +p[0], cc = +p[1];
        stack.push((rr + 1) + ',' + cc, (rr - 1) + ',' + cc, rr + ',' + (cc + 1), rr + ',' + (cc - 1));
      }
      if (cnt !== Object.keys(g).length) return 'disconnected';
      /* numbering and uniqueness */
      var nseen = {}, aseen = {};
      for (i = 0; i < P.entries.length; i++) {
        e = P.entries[i];
        if (!e.num || P.nums[e.r + ',' + e.c] !== e.num) return 'number:' + e.it.en;
        if (nseen[e.num + e.dir]) return 'dupnum:' + e.num + e.dir;
        nseen[e.num + e.dir] = 1;
        if (aseen[e.it.ans]) return 'dupans:' + e.it.en;
        aseen[e.it.ans] = 1;
      }
      for (i = 0; i < P.strips.length; i++) if (!P.strips[i].kind) return 'noclue:' + P.strips[i].it.en;
      var allE = P.entries.concat(P.strips);
      for (i = 0; i < allE.length; i++) {
        var rf = allE[i].refs || {};
        for (var kk in rf) for (var j = 0; j < rf[kk].length; j++) {
          if (!allE[rf[kk][j].to] || rf[kk][j].to === i) return 'ref:' + allE[i].it.en;
        }
      }
      return '';
    }

    /* --------------------------------------------------------- build ---- */
    var CACHE = {};
    function build(items, seedKey, mode, chooser) {
      var ck = seedKey + '|' + mode + '|' + items.map(function (x) { return x.key; }).join(',');
      if (CACHE[ck]) return CACHE[ck];
      var grid = items.filter(function (it) { return it.fit === 'grid'; });
      var P = null, err = 'none';
      for (var s = 0; s < 4; s++) {
        var L = grid.length >= 2 ? layout(grid, hash(seedKey + '|' + mode + '|' + s)) : null;
        /* a grid that holds fewer than 3 words is not a crossword */
        if (L && L.placed.length < 3) L = null;
        P = assemble(L, items, mode, chooser);
        err = validate(P);
        if (!err) break;
      }
      if (err) { P = assemble(null, items, mode, chooser); P.err = err; }
      P.seedKey = seedKey;
      CACHE[ck] = P;
      return P;
    }

    return {
      MAXLEN: MAXLEN, BOUND: BOUND, PART: PART,
      lettersOf: lettersOf, core: core, enumOf: enumOf, leaks: leaks, leakSpans: leakSpans,
      gridReason: gridReason, itemsFrom: itemsFrom, lessonItems: lessonItems,
      modesFor: modesFor, clueKind: clueKind, hintKind: hintKind,
      parts: parts, build: build, validate: validate, hash: hash
    };
  })();

  /* =====================================================================
     Lexiverse · Word Hunt engine (pure logic, no DOM — runs in the page and
     in the offline audit)

     Normalisation: a word is hidden as the letters of its English form,
     accents removed, upper case, without spaces, hyphens, apostrophes,
     punctuation or the bracketed usage note — "look at" → LOOKAT,
     "consist (of)" → CONSIST. The list always shows the form as written.

     Difficulty sets the directions a word may run in:
       easy   → right, down
       medium → right, down, both diagonals (forward)
       hard   → all eight directions, backwards included
     ===================================================================== */
  var WSCore = (function () {
    'use strict';
    var C = XWCore;
    var DIRS = {
      easy:   [[0, 1], [1, 0]],
      medium: [[0, 1], [1, 0], [1, 1], [-1, 1]],
      hard:   [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]]
    };
    var BASE = { easy: 9, medium: 11, hard: 13 };
    var MAXN = 14;                       /* largest board: still tappable on a phone */
    var MAXW = { easy: 8, medium: 12, hard: 12 };
    var MINLEN = 3;
    /* letter frequencies of English text, so the filler looks like words
       and hides the targets instead of framing them */
    var FREQ = 'EEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOIIIIIIINNNNNNNSSSSSSHHHHHHRRRRRRDDDDLLLLCCCUUUMMMWWFFGGYYPPBVKJXQZ';

    /* why an item is not hidden in a Word Hunt ('' = it can be) */
    function huntReason(it) {
      if (/[0-9]/.test(it.en)) return 'digits';
      var n = it.ans.length;
      if (n < MINLEN) return 'short';
      if (n > MAXN) return 'long';
      return '';
    }

    /* which of a planet's items go into a hunt of this difficulty: all that
       can be hidden, up to the difficulty's limit, in the planet's order */
    function pick(items, diff) {
      var seen = {}, out = [];
      items.forEach(function (it) {
        if (huntReason(it) || seen[it.ans]) return;
        seen[it.ans] = 1;
        out.push(it);
      });
      if (out.length > MAXW[diff]) {
        /* easy keeps the shortest words — a gentle board — in planet order */
        var keep = out.slice().sort(function (a, b) { return a.ans.length - b.ans.length; }).slice(0, MAXW[diff]);
        var k = {};
        keep.forEach(function (x) { k[x.key] = 1; });
        out = out.filter(function (x) { return k[x.key]; });
      }
      return out;
    }

    function sizeFor(words, diff) {
      var longest = 0;
      words.forEach(function (w) { longest = Math.max(longest, w.ans.length); });
      var letters = words.reduce(function (s, w) { return s + w.ans.length; }, 0);
      var n = Math.max(BASE[diff], longest);
      /* never fill more than about 60% of the board with words */
      while (n < MAXN && letters > n * n * 0.6) n++;
      return Math.min(MAXN, n);
    }

    function attempt(words, n, dirs, R) {
      var g = [];
      for (var i = 0; i < n * n; i++) g.push('');
      var placed = [];
      var order = words.slice().sort(function (a, b) { return b.ans.length - a.ans.length; });
      for (var w = 0; w < order.length; w++) {
        var word = order[w].ans, L = word.length, cand = [];
        for (var t = 0; t < 260; t++) {
          var d = dirs[Math.floor(R() * dirs.length)];
          var r0 = Math.floor(R() * n), c0 = Math.floor(R() * n);
          var r1 = r0 + d[0] * (L - 1), c1 = c0 + d[1] * (L - 1);
          if (r1 < 0 || r1 >= n || c1 < 0 || c1 >= n) continue;
          var ok = true, over = 0;
          for (var k = 0; k < L; k++) {
            var ch = g[(r0 + d[0] * k) * n + c0 + d[1] * k];
            if (ch && ch !== word.charAt(k)) { ok = false; break; }
            if (ch) over++;
          }
          if (!ok || over === L) continue;
          cand.push({ r: r0, c: c0, d: d, s: over * 2 + R() });
          if (cand.length > 24) break;
        }
        if (!cand.length) return null;
        cand.sort(function (a, b) { return b.s - a.s; });
        var p = cand[0];
        var cells = [];
        for (k = 0; k < L; k++) {
          var ix = (p.r + p.d[0] * k) * n + p.c + p.d[1] * k;
          g[ix] = word.charAt(k);
          cells.push(ix);
        }
        placed.push({ it: order[w], cells: cells, dir: p.d });
      }
      for (i = 0; i < g.length; i++) if (!g[i]) g[i] = FREQ.charAt(Math.floor(R() * FREQ.length));
      return { n: n, grid: g, words: placed };
    }

    /* every straight-line occurrence of a word, in any of the 8 directions */
    function occurrences(P, word) {
      var n = P.n, g = P.grid, L = word.length, out = [];
      var all = DIRS.hard;
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
        if (g[r * n + c] !== word.charAt(0)) continue;
        for (var di = 0; di < all.length; di++) {
          var d = all[di], r1 = r + d[0] * (L - 1), c1 = c + d[1] * (L - 1);
          if (r1 < 0 || r1 >= n || c1 < 0 || c1 >= n) continue;
          var ok = true, cells = [];
          for (var k = 0; k < L && ok; k++) {
            var ix = (r + d[0] * k) * n + c + d[1] * k;
            if (g[ix] !== word.charAt(k)) ok = false;
            cells.push(ix);
          }
          if (ok) out.push(cells);
        }
      }
      return out;
    }
    function sameCells(a, b) {
      if (a.length !== b.length) return false;
      var fw = true, bw = true;
      for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) fw = false;
        if (a[i] !== b[b.length - 1 - i]) bw = false;
      }
      return fw || bw;
    }

    /* Proves the board is fair: every target is in its place, letters match,
       and no target appears a second time anywhere — except inside another
       target ("son" inside "person"), which is unavoidable and harmless. */
    function validate(P) {
      if (!P || !P.words.length) return 'empty';
      var n = P.n;
      if (P.grid.length !== n * n) return 'size';
      for (var i = 0; i < P.grid.length; i++) if (!/^[A-Z]$/.test(P.grid[i])) return 'fill';
      var seen = {};
      for (i = 0; i < P.words.length; i++) {
        var w = P.words[i], word = w.it.ans;
        if (seen[word]) return 'dup:' + word;
        seen[word] = 1;
        if (w.cells.length !== word.length) return 'len:' + word;
        for (var k = 0; k < word.length; k++) if (P.grid[w.cells[k]] !== word.charAt(k)) return 'letter:' + word;
        /* the cells form one straight line in an allowed direction */
        for (k = 1; k < w.cells.length; k++) {
          var a = w.cells[k - 1], b = w.cells[k];
          var dr = Math.floor(b / n) - Math.floor(a / n), dc = (b % n) - (a % n);
          if (dr !== w.dir[0] || dc !== w.dir[1]) return 'line:' + word;
        }
        if (!P.dirs.some(function (d) { return d[0] === w.dir[0] && d[1] === w.dir[1]; })) return 'dir:' + word;
        var occ = occurrences(P, word), extra = 0;
        for (var o = 0; o < occ.length; o++) {
          if (sameCells(occ[o], w.cells)) continue;
          var inside = P.words.some(function (x) {
            return x !== w && occ[o].every(function (ix) { return x.cells.indexOf(ix) >= 0; });
          });
          if (!inside) extra++;
        }
        /* a palindrome reads the same backwards: its own reversal is not extra */
        if (extra) return 'twice:' + word;
      }
      return '';
    }

    /* Build a board. A seed gives a reproducible board (audit); the page
       passes a fresh seed per play, so every round is a new board. If a
       board cannot be made valid, the board grows, and as a last resort the
       longest word is set aside — reported, never silently lost. */
    function build(items, diff, seed) {
      var words = pick(items, diff), dirs = DIRS[diff];
      var aside = [];
      while (words.length >= 2) {
        var n = sizeFor(words, diff);
        for (; n <= MAXN; n++) {
          for (var t = 0; t < 60; t++) {
            var P = attempt(words, n, dirs, rngOf(seed + ':' + n + ':' + t));
            if (!P) continue;
            P.dirs = dirs; P.diff = diff;
            if (!validate(P)) {
              P.aside = aside;
              P.skipped = items.filter(function (it) { return huntReason(it); });
              return P;
            }
          }
        }
        words = words.slice().sort(function (a, b) { return b.ans.length - a.ans.length; });
        aside.push(words.shift());
      }
      return null;
    }
    function rngOf(s) {
      var a = C.hash(s) >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    /* What a selection from cell a to cell b means: the target it finds, or
       null. Any straight line counts, read in either direction, so dragging
       a word from its last letter still finds it. */
    function lineCells(n, a, b) {
      var r0 = Math.floor(a / n), c0 = a % n, r1 = Math.floor(b / n), c1 = b % n;
      var dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0);
      var len = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)) + 1;
      if (!(r0 === r1 || c0 === c1 || Math.abs(r1 - r0) === Math.abs(c1 - c0))) return null;
      var out = [];
      for (var k = 0; k < len; k++) out.push((r0 + dr * k) * n + c0 + dc * k);
      return out;
    }
    function match(P, cells, foundKeys) {
      if (!cells || cells.length < 2) return null;
      var s = cells.map(function (ix) { return P.grid[ix]; }).join('');
      var rs = s.split('').reverse().join('');
      var best = null;
      P.words.forEach(function (w) {
        if (foundKeys[w.it.key] || best) return;
        if (sameCells(w.cells, cells)) best = w;
      });
      if (best) return best;
      P.words.forEach(function (w) {
        if (foundKeys[w.it.key] || best) return;
        if (w.it.ans === s || w.it.ans === rs) best = w;
      });
      return best;
    }

    return { DIRS: DIRS, MAXN: MAXN, huntReason: huntReason, pick: pick, build: build,
             validate: validate, lineCells: lineCells, match: match, occurrences: occurrences };
  })();

  /* =====================================================================
     LEXIVERSE · CEFR clue policy (shared by both games)

     Which clue a learner sees is decided by the LEVEL BAND of the word,
     never by the grid. Band = the level of the source course (A0–B2), or for
     professional vocabulary the band of its unit (B1 / B2 / C1).

     Every English clue comes from the source vocabulary (the methodologist's
     definition, example sentence or collocations) — nothing is invented.
     Each one was checked offline for comprehensibility at its band
     (CLUEQ, built by the audit): at most one word outside the band's
     lexicon and within the band's length limit. A clue that fails is not
     shown as the primary clue; the next kind in the band's chain is used,
     and an item left without a level-appropriate English clue is flagged
     for review in the inventory.

     Kinds: tr  — translation (RU/KZ), with a picture at A0 where one exists
            def — description / definition (B2: the English meaning)
            ctx — the word's own example sentence, word removed
            col — collocations, word removed
     ===================================================================== */
  var LXClue = (function () {
    'use strict';
    var BANDS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1'];

    /* Crossword: three moons = three steps of increasing demand.
       sup: 'show' — translation printed under the English clue (support);
            otherwise translation is a hint the learner may open. */
    var XW = {
      A0: [{ c: ['tr'], pic: 1 },                 { c: ['ctx', 'def', 'tr'], sup: 'show' }, { c: ['def', 'ctx', 'tr'], sup: 'show' }],
      A1: [{ c: ['def', 'ctx', 'tr'], sup: 'show' }, { c: ['def', 'ctx', 'tr'] },      { c: ['ctx', 'def', 'tr'] }],
      A2: [{ c: ['def', 'ctx', 'tr'] },             { c: ['ctx', 'def', 'tr'] },        { c: ['col', 'ctx', 'def', 'tr'] }],
      B1: [{ c: ['def', 'ctx', 'col', 'tr'] },      { c: ['ctx', 'def', 'col', 'tr'] }, { c: ['col', 'ctx', 'def', 'tr'] }],
      B2: [{ c: ['def', 'ctx', 'col', 'tr'] },      { c: ['ctx', 'def', 'col', 'tr'] }, { c: ['col', 'ctx', 'def', 'tr'] }],
      C1: [{ c: ['def', 'col', 'ctx', 'tr'] },      { c: ['ctx', 'def', 'col', 'tr'] }, { c: ['col', 'def', 'ctx', 'tr'] }]
    };
    /* Word Hunt: one clue per word, short enough to read while searching */
    var WS = {
      A0: { c: ['tr'], pic: 1 },
      A1: { c: ['def', 'ctx', 'tr'], sup: 'show' },
      A2: { c: ['def', 'ctx', 'tr'] },
      B1: { c: ['def', 'ctx', 'col', 'tr'] },
      B2: { c: ['col', 'def', 'ctx', 'tr'] },
      C1: { c: ['def', 'col', 'ctx', 'tr'] }
    };
    /* the second clue a hint opens: L1 first where it helps most (A0–A2),
       another English clue first from B1 */
    var HINT = {
      A0: ['ctx', 'def', 'tr'], A1: ['tr', 'ctx', 'def'], A2: ['tr', 'ctx', 'def', 'col'],
      B1: ['ctx', 'def', 'col', 'tr'], B2: ['ctx', 'def', 'col', 'tr'], C1: ['ctx', 'def', 'col', 'tr']
    };
    var WS_MAXW = 16;   /* a Word Hunt clue longer than this is passed over when a shorter one fits */

    function q(it) {
      var s = CLUEQ[it.key] || '';
      return { band: s ? s.slice(0, 2) : (it.src === 'B2' ? 'B2' : /^A[0-2]|^B1/.test(it.src) ? it.src : 'B1'),
               def: s.charAt(2), ctx: s.charAt(3), col: s.charAt(4), ant: s.charAt(5) === '1' };
    }
    function bandOf(it) { return q(it).band; }
    /* a clue must say something: "___", "a ___" or "be ___" (240 collocation
       clues in the source) name nothing and are never used */
    function meaningful(t) {
      return String(t || '').replace(/___/g, ' ').replace(/\b(a|an|the|be|to|your|my|his|her|their|our|one's|someone|something|sb|sth)\b/gi, ' ')
        .replace(/[^A-Za-z\u00C0-\u024F]/g, '').length >= 3;
    }
    function has(it, k) { return k === 'tr' ? !!it.clue.tr : !!it.clue[k] && meaningful(it.clue[k]); }
    /* a "translation" that is the answer itself (HTTPS → «HTTPS», «протокол
       IPv4», «Fetch API») gives the word away: in the crossword it is not a clue */
    function trGivesAway(it) {
      if (!it.clue.tr || !it.ans) return false;
      var N = function (v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };
      if (N(it.en) && (N(it.ru) === N(it.en) || N(it.kk) === N(it.en))) return true;
      if (it.ans.length < 2) return false;
      var L = XWCore.lettersOf;
      return L(it.ru || '').indexOf(it.ans) >= 0 || L(it.kk || '').indexOf(it.ans) >= 0;
    }
    /* ok = present, meaningful and comprehensible at the band */
    function ok(it, k, Q) { return k === 'tr' ? !!it.clue.tr : has(it, k) && Q[k] === '1'; }
    function words(s) { return (String(s || '').match(/[A-Za-z’']+/g) || []).length; }
    function pick(it, chain, opts) {
      var Q = q(it), kind = '', fallback = false, noTr = opts && opts.xw && trGivesAway(it);
      for (var i = 0; i < chain.length && !kind; i++) {
        var k = chain[i];
        if (!ok(it, k, Q) || (k === 'tr' && noTr)) continue;
        if (opts && opts.short && k !== 'tr' && words(it.clue[k]) > WS_MAXW &&
            chain.slice(i + 1).some(function (z) { return z !== 'tr' && ok(it, z, Q) && words(it.clue[z]) <= WS_MAXW; })) continue;
        kind = k;
      }
      /* nothing comprehensible: the first clue that exists, flagged */
      /* nothing comprehensible: the translation if there is one (always
         understood), else the first clue that exists — and the item is flagged */
      if (!kind) {
        fallback = true;
        if (it.clue.tr && !noTr) kind = 'tr';
        else for (i = 0; i < chain.length && !kind; i++) if (chain[i] !== 'tr' && has(it, chain[i])) kind = chain[i];
        if (!kind && noTr) for (var kk = ['def', 'ctx', 'col'], j = 0; j < 3 && !kind; j++) if (has(it, kk[j])) kind = kk[j];
        if (!kind && it.clue.tr) kind = 'tr';
      }
      var review = fallback || (Q.band !== 'A0' && kind === 'tr');
      return { kind: kind, band: Q.band, ant: Q.ant && kind === 'def', review: review };
    }
    function hintFor(it, kind, sup, xw) {
      var Q = q(it), order = HINT[Q.band] || HINT.B1;
      for (var i = 0; i < order.length; i++) {
        var k = order[i];
        if (k === kind || (k === 'tr' && sup === 'show') || (k === 'tr' && xw && trGivesAway(it))) continue;
        /* a hint is optional support: from B1 it may be harder than the main clue */
        if (ok(it, k, Q) || (k !== 'tr' && has(it, k) && BANDS.indexOf(Q.band) >= 3)) return k;
      }
      return '';
    }
    /* chooser for XWCore.build: tier 0..2 of the crossword */
    function xwChooser(tier) {
      return function (it) {
        var pol = (XW[bandOf(it)] || XW.B1)[tier], r = pick(it, pol.c, { xw: true });
        r.sup = pol.sup && r.kind !== 'tr' && it.clue.tr && !trGivesAway(it) ? pol.sup : '';
        r.pic = !!pol.pic && r.kind === 'tr' && !!picOf(it);
        r.hint = hintFor(it, r.kind, r.sup, true);
        return r;
      };
    }
    function wsClue(it) {
      var pol = WS[bandOf(it)] || WS.B1, r = pick(it, pol.c, { short: true, xw: true });
      r.sup = pol.sup && r.kind !== 'tr' && it.clue.tr && !trGivesAway(it) ? pol.sup : '';
      r.pic = !!pol.pic && r.kind === 'tr' && !!picOf(it);
      r.hint = hintFor(it, r.kind, r.sup, true);
      return r;
    }
    /* Number words: the Vocabulary file translates "seven" as «7» and
       "first" as «1-й». A bare figure is not a clue a beginner can read as a
       translation, so the figure is shown with its word: «7 — семь». */
    var NUMW = {
      ru: { c: ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать',
                'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'],
            t: { 20: 'двадцать', 30: 'тридцать', 40: 'сорок', 50: 'пятьдесят', 60: 'шестьдесят', 70: 'семьдесят', 80: 'восемьдесят', 90: 'девяносто', 100: 'сто' },
            o: ['', 'первый', 'второй', 'третий', 'четвёртый', 'пятый', 'шестой', 'седьмой', 'восьмой', 'девятый', 'десятый'],
            ot: { 20: 'двадцатый', 30: 'тридцатый' } },
      kk: { c: ['нөл', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз', 'он'],
            t: { 10: 'он', 20: 'жиырма', 30: 'отыз', 40: 'қырық', 50: 'елу', 60: 'алпыс', 70: 'жетпіс', 80: 'сексен', 90: 'тоқсан', 100: 'жүз' },
            o: ['', 'бірінші', 'екінші', 'үшінші', 'төртінші', 'бесінші', 'алтыншы', 'жетінші', 'сегізінші', 'тоғызыншы', 'оныншы'],
            ot: { 20: 'жиырмасыншы', 30: 'отызыншы' } }
    };
    function numWord(n, lang) {
      var W = NUMW[lang];
      if (lang === 'ru' && n < 20) return W.c[n];
      if (lang === 'kk' && n <= 10) return W.c[n];
      if (W.t[n]) return W.t[n];
      var tens = Math.floor(n / 10) * 10, u = n % 10;
      return n < 100 && W.t[tens] ? W.t[tens] + ' ' + W.c[u] : '';
    }
    function ordWord(n, lang) {
      var W = NUMW[lang];
      if (n <= 10) return W.o[n];
      if (W.ot[n]) return W.ot[n];
      var tens = Math.floor(n / 10) * 10, u = n % 10;
      return n < 40 && W.t[tens] && u ? W.t[tens] + ' ' + W.o[u] : '';
    }
    function trText(it, want) {
      var lang = it[want] ? want : it.ru ? 'ru' : 'kk', v = String(it[lang] || '').trim(), m, w = '';
      if (/^\d{1,3}$/.test(v)) w = numWord(+v, lang);
      else if ((m = v.match(/^(\d{1,2})-(й|ші|шы|ыншы|інші)$/))) w = ordWord(+m[1], lang);
      return w ? v + ' — ' + w : v;
    }
    function picOf(it) { return (it.card && PICS[it.card]) || ''; }
    /* the name of a moon for a band: the kind its chain starts with */
    function tierKinds(band) { return (XW[band] || XW.B1).map(function (t) { return t.c[0]; }); }

    return { BANDS: BANDS, XW: XW, WS: WS, bandOf: bandOf, trGivesAway: trGivesAway, trText: trText, xwChooser: xwChooser, wsClue: wsClue, picOf: picOf,
             tierKinds: tierKinds, tierSup: function (band, i) { return (XW[band] || XW.B1)[i].sup || ''; } };
  })();

  return { XWCore: XWCore, WSCore: WSCore, LXClue: LXClue };
}
