// Разбор результата письма — чистые порты из data/jtswriting.html.
// Прототип строил HTML-строки прямо в этих функциях; здесь те же алгоритмы
// отдают данные, а разметку рисует React-слой. Пороги, регексы и арифметика —
// дословно из прототипа: верность его поведению и есть критерий приёмки,
// «причёсывать» их нельзя.

// Порт highlightHtml (прототип 12767–12789). Совпадения ищутся indexOf'ом по
// первому вхождению — как в прототипе: цитата модели может встретиться в
// тексте не там, где имелась в виду, но менять поиск нельзя, иначе разъедемся
// с офлайн-чекером. Перекрывающиеся отметки пропускаются после сортировки
// «раньше — длиннее» (при равном старте выживает длинная). kind сегмента —
// это css-класс прототипа: severity "low" → 'imp', любая другая → 'err'
// (medium тоже err — так в исходнике). refKind/refIndex — то, что прототип
// писал в data-kind/data-i для клика по подсветке.
export function computeHighlights(text, a) {
  var src = String(text);
  var marks = [];
  (a.corrections || []).forEach(function (c, i) {
    var at = src.indexOf(c.original);
    if (at < 0) return;
    marks.push({ from: at, to: at + c.original.length, cls: c.severity === 'low' ? 'imp' : 'err', kind: 'corr', i: i });
  });
  (a.strengths || []).forEach(function (s, i) {
    var at = src.indexOf(s.quote);
    if (at < 0) return;
    marks.push({ from: at, to: at + s.quote.length, cls: 'good', kind: 'good', i: i });
  });
  marks.sort(function (x, y) { return x.from - y.from || (y.to - y.from) - (x.to - x.from); });
  var out = [], pos = 0;
  marks.forEach(function (m) {
    if (m.from < pos) return; // залезли в уже выданный кусок — прототип молча пропускает
    if (m.from > pos) out.push({ text: src.slice(pos, m.from), kind: 'plain' });
    out.push({ text: src.slice(m.from, m.to), kind: m.cls, refKind: m.kind, refIndex: m.i });
    pos = m.to;
  });
  if (pos < src.length) out.push({ text: src.slice(pos), kind: 'plain' });
  return out;
}

// Порт wordDiff (прототип 12791–12812): LCS по токенам, где пробельные
// прогоны — самостоятельные токены (split с захватом). Бюджет n*m > 400000 —
// защита от квадратичной таблицы на длинных текстах; прототип в этом случае
// просто показывал новый текст без диффа, поэтому и здесь весь newT уходит
// одним 'same'-сегментом (свойство реконструкции старого текста при этом не
// выполняется — так же, как в исходнике). В отличие от прототипа пробельные
// del/ins-токены НЕ выбрасываются, а честно помечаются op'ом — иначе из
// сегментов нельзя восстановить оба текста; рендер, чтобы совпасть с
// прототипом пиксель-в-пиксель, должен del-пробелы не показывать, а
// ins-пробелы показывать без подчёркивания.
export function wordDiff(oldT, newT) {
  var A = String(oldT).split(/(\s+)/), B = String(newT).split(/(\s+)/);
  var n = A.length, m = B.length;
  if (n * m > 400000) return [{ op: 'same', text: String(newT) }];
  var dp = [], i, j;
  for (i = 0; i <= n; i++) dp.push(new Array(m + 1).fill(0));
  for (i = n - 1; i >= 0; i--) {
    for (j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  var segs = [];
  // соседние токены одного op склеиваются — прототип конкатенировал строки,
  // так что один HTML-прогон и должен быть одним сегментом
  function push(op, t) {
    if (!t) return; // split даёт пустые крайние токены — в выводе они ничто
    var last = segs[segs.length - 1];
    if (last && last.op === op) last.text += t;
    else segs.push({ op: op, text: t });
  }
  i = 0; j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { push('same', A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push('del', A[i]); i++; } // при равенстве прототип удаляет первым
    else { push('ins', B[j]); j++; }
  }
  while (i < n) { push('del', A[i]); i++; }
  while (j < m) { push('ins', B[j]); j++; }
  return segs;
}

// Прототип 11923 — дословно.
export function avgScore(s) { return Math.round(((s.task + s.organisation + s.vocabulary + s.grammar) / 4) * 10) / 10; }

// В прототипе жанр всегда несёт ровно 11 упражнений — знаменатель итога.
export var TASKS_PER_GENRE = 11;

// В прототипе CRIT несёт ещё подписи и цвета для колец UI; движку итога
// нужны только id критериев (порядок не важен — их просто суммируют).
var CRIT_IDS = ['task', 'organisation', 'vocabulary', 'grammar'];

// Порт genreStats (прототип 11199–11210), очищенный от глобального Progress:
// прототип сканировал Progress.tasks по префиксу "<genreId>:", здесь та же
// сводка идёт по переданной карте taskId → {correct, total}. Каждая запись —
// сделанное упражнение (прототип писал их только по завершении).
export function genreStats(genre, taskStates) {
  var done = 0, correct = 0, total = 0;
  var map = taskStates || {};
  for (var k in map) {
    if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
    var rec = map[k];
    if (!rec) continue; // undefined-значение = упражнение не делалось
    done++;
    correct += rec.correct || 0;
    total += rec.total || 0;
  }
  return { done: done, correct: correct, total: total, accuracy: total ? Math.round((correct / total) * 100) : 0 };
}

// Порт overallBand (прототип 11214–11231). Итог 0–5: половина за упражнения,
// половина за проверенный текст; пока текста нет — считаем только упражнения,
// чтобы прогресс не блокировался. lastAssessment заменяет прототипный поиск
// оценки по черновикам (lastAssessmentFor) — вызывающий код достаёт её сам.
export function overallBand(genre, taskStates, lastAssessment) {
  var st = genreStats(genre, taskStates);
  var last = lastAssessment || null;
  var exercisePart = (st.done / TASKS_PER_GENRE) * 0.5 + (st.accuracy / 100) * 0.5;
  var textPart = null;
  if (last) {
    var sum = 0;
    CRIT_IDS.forEach(function (id) { sum += last.scores[id]; });
    textPart = sum / CRIT_IDS.length / 5;
  }
  var frac = textPart === null ? exercisePart : (exercisePart * 0.5 + textPart * 0.5);
  return {
    stats: st, last: last,
    score: Math.round(frac * 5 * 10) / 10,
    percent: Math.round(frac * 100),
    cefr: last ? last.cefr : null
  };
}

// Прототип 11233–11239 — дословно, включая тексты вердиктов.
export function overallVerdict(band) {
  if (band.score >= 4.3) return "Strong. This genre is under control — the shape, the phrases and the grammar all hold.";
  if (band.score >= 3.4) return "Solid. The text works; the gaps are in detail, not in the shape of the genre.";
  if (band.score >= 2.5) return "Getting there. The plan is right, the language still slips in places.";
  if (band.score > 0) return "Early days. Go back through the exercises you have not finished — they are what moves this number.";
  return "Nothing counted yet. Do the exercises and submit a text, and this fills in by itself.";
}
