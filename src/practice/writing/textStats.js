/* Ported from data/jtswriting.html — базовые текстовые метрики письма.
   Вынесены в общий модуль: офлайн-проверка и контракт оценки должны считать
   слова ОДНИМ регексом, иначе wordCount в отчёте разойдётся с порогами
   валидации и оценка длины начнёт «плавать» между клиентом и сервером. */

export function wordsOf(s) { var m = String(s || "").trim().match(/[A-Za-zЀ-ӿ0-9'’-]+/g); return m || []; }

export function sentencesOf(s) {
  var parts = String(s || "").split(/[.!?]+[\s ]+|[.!?]+$/);
  return parts.filter(function (p) { return wordsOf(p).length > 0; });
}

export function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

export function plural(n, one, many) { return n === 1 ? one : many; }
