/* Ported from data/jtswriting.html — контракт оценки письма.
   Модуль изоморфный: одна и та же валидация гоняется и в API-роуте (ответ
   модели нельзя отдавать клиенту как есть), и на клиенте (офлайн-оценка
   обязана проходить тот же контракт — иначе UI пришлось бы уметь два формата).
   Логика validateAssessment перенесена дословно; сверху добавлены только
   серверные потолки длины строк, чтобы раздутый ответ модели не улетал
   клиенту мегабайтами. */

import { wordsOf } from "./textStats.js";

export const CHECK_LEVELS = ["A1", "A2", "A2P", "B1", "B2", "C1"];

export function validateAssessment(raw, text) {
  if (!raw || typeof raw !== "object" || !raw.scores) return null;
  function s5(v) { var n = parseFloat(v); if (!isFinite(n)) return 0; return Math.max(0, Math.min(5, Math.round(n * 2) / 2)); }
  var out = {
    scores: {
      task: s5(raw.scores.task), organisation: s5(raw.scores.organisation),
      vocabulary: s5(raw.scores.vocabulary), grammar: s5(raw.scores.grammar)
    },
    cefr: typeof raw.cefr === "string" ? raw.cefr.toUpperCase().slice(0, 2) : "B1",
    wordCount: wordsOf(text).length,
    summary: typeof raw.summary === "string" ? raw.summary.slice(0, 600) : "",
    strengths: [], corrections: [],
    rewrite: typeof raw.rewrite === "string" ? raw.rewrite.slice(0, 8000) : "",
    nextSteps: []
  };
  (Array.isArray(raw.strengths) ? raw.strengths : []).forEach(function (s) {
    if (s && typeof s.quote === "string" && text.indexOf(s.quote) >= 0) out.strengths.push({ quote: s.quote, why: String(s.why || "").slice(0, 300) });
  });
  (Array.isArray(raw.corrections) ? raw.corrections : []).slice(0, 12).forEach(function (c) {
    if (!c || typeof c.original !== "string") return;
    if (text.indexOf(c.original) < 0) return;
    out.corrections.push({
      original: c.original, corrected: String(c.corrected || "").slice(0, 300),
      type: ["grammar", "vocabulary", "register", "cohesion", "spelling"].indexOf(c.type) >= 0 ? c.type : "grammar",
      severity: ["high", "medium", "low"].indexOf(c.severity) >= 0 ? c.severity : "medium",
      explanation: String(c.explanation || "").slice(0, 300)
    });
  });
  (Array.isArray(raw.nextSteps) ? raw.nextSteps : []).slice(0, 3).forEach(function (s) { if (typeof s === "string" && s.trim()) out.nextSteps.push(s.trim().slice(0, 200)); });
  if (!out.nextSteps.length || !out.summary) return null;
  return out;
}

/* Валидация тела запроса /api/writing/check. Возвращает {ok, value|error}
   вместо исключений: роуту нужен готовый 400-текст, а не стек-трейс. */
export function validateCheckRequest(body) {
  var b = body && typeof body === "object" ? body : {};

  var text = typeof b.text === "string" ? b.text.trim() : "";
  if (!text) return { ok: false, error: "text is required" };
  if (text.length > 6000) return { ok: false, error: "text is too long (max 6000 characters)" };
  /* Порог «есть что проверять» считается латинским регексом, а не wordsOf:
     кириллический текст не должен проходить как английское письмо. */
  var latinWords = text.match(/[A-Za-z0-9'-]+/g) || [];
  if (latinWords.length < 5) return { ok: false, error: "text is too short (min 5 words)" };

  var level = typeof b.level === "string" ? b.level.toUpperCase() : "";
  if (CHECK_LEVELS.indexOf(level) < 0) level = "B1";

  var genre = typeof b.genre === "string" && b.genre.trim() ? b.genre.slice(0, 120) : "Free writing";
  var task = typeof b.task === "string" && b.task.trim() ? b.task.slice(0, 600) : "Free writing with no set task.";

  var targetWords = [80, 180];
  if (Array.isArray(b.targetWords) && b.targetWords.length === 2) {
    var lo = parseInt(b.targetWords[0], 10), hi = parseInt(b.targetWords[1], 10);
    if (isFinite(lo) && isFinite(hi) && lo >= 1 && hi <= 2000 && lo < hi) targetWords = [lo, hi];
  }

  var uiLang = ["ru", "en", "kk"].indexOf(b.uiLang) >= 0 ? b.uiLang : "ru";

  return { ok: true, value: { text: text, level: level, genre: genre, task: task, targetWords: targetWords, uiLang: uiLang } };
}
