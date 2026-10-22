// Чистая логика миссии Cartoon World — вынесена из движка прототипа дословно
// (esc, pickPath, fillKw, replyFor, countWords), чтобы сверять с оракулом самого
// прототипа без DOM (engine.test.js → __fixtures__/oracle.json). Правки — здесь и
// в прототипе одновременно.
//
// Ответ персонажа заранее написан автором и выбирается по ключевым словам ответа
// ученика: побеждает ветка, чьих ключей (основ в начале слова) в тексте больше,
// при равенстве — первая, ни одного — запасной ответ `other`. ИИ нет.

export function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/* Choose the authored reply: the path whose keywords the learner's text hits most; -1 = fallback. */
export function pickPath(turn, text) {
  var low = String(text || "").toLowerCase(), best = -1, score = 0, word = "";
  (turn.paths || []).forEach(function (p, i) {
    var s = 0, w = "";
    (p.kw || []).forEach(function (k) {
      k = String(k).toLowerCase().trim(); if (k.length < 2) return;
      var m = new RegExp("(^|[^a-z])(" + esc(k) + "[a-z']*)").exec(low);
      if (m) { s++; if (!w) w = m[2]; }
    });
    if (s > score) { score = s; best = i; word = w; }
  });
  return { i: best, word: word };
}

export function fillKw(text, w) {
  return String(text).replace(/\{kw\}/g, function (m, off) { var s = w || "that"; return off === 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s; });
}

/* The character's reply to a recorded turn (also used to rebuild the log after a reload). */
export function replyFor(chat, idx, rec) {
  var turn = chat.turns[idx];
  if (idx >= chat.turns.length - 1) return turn.close || "";
  if (rec.p >= 0 && turn.paths && turn.paths[rec.p]) return fillKw(turn.paths[rec.p].say, rec.w);
  return turn.other || "";
}

export function countWords(s) { var m = String(s || "").trim().match(/\S+/g); return m ? m.length : 0; }

const norm = (s) => String(s || '').toLowerCase().replace(/(\.\.\.|…)\s*$/, '').replace(/[^a-z0-9'\s]+/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Ответ — дословно одна из подсказок хода (без учёта регистра и знаков). Прототип требовал минимум слов уровня и
 * у таких ответов: 7563 из 13641 подсказок короче минимума («Bye, Itsy!» при минимуме 3 на A0), и ученик,
 * переписавший подсказку слово в слово, получал отказ. Подсказку принимаем как есть.
 */
export function isHintText(turn, text) {
  const t = norm(text)
  if (!t) return false
  return (turn && Array.isArray(turn.hints) ? turn.hints : []).some((h) => norm(h) === t)
}
