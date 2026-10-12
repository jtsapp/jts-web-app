// Знак «да / нет» (👍 / 👎) у заданий, где файл курса его не ставит.
//
// Ключ такого задания зависит от того, утверждение в нём или отрицание, а сама
// строка этого не говорит: «I ___ at university in 2015.» с банком was / were /
// wasn't. Задание проверяет was при I, но про себя ученик честно выбирает и
// wasn't — и получает «Неверный ответ». Курс знает такой знак (поле cue у A0,
// урок 1 — см. CUE_SIGNS в steps.js), но в остальных уровнях его не поставил.
//
// Найдено перебором всех шагов A0–B2 (12.10.2026): верный ответ и неверный
// вариант отличаются только отрицанием (like / don't like, was / wasn't, can /
// can't, never…), а строка, текст или запись задания ключ не решают. Остальные
// такие пары решает контекст — «He ___ from Spain. He's from Brazil.», «— No,
// it ___.», «Make it negative.» — им знак не нужен.
//
// Шаги пересобираются из файла курса целиком, поэтому правка живёт здесь, а не
// в данных. Правка, которая не нашла своё задание, останавливает сборку: файл
// курса поменялся, и знак надо сверить заново (так же, как clip-fixes.js).
//
// lesson — ключ урока в файле курса (LESSONS[n]), line — строка задания как в
// файле, cue — yes (👍) или no (👎).
const CUE_FIXES = {
  a1: [{ lesson: '1', line: 'I ___ at university in 2015.', cue: 'yes' }],
}

/** Таблица знаков уровня: cue(lessonKey, sc) → yes / no / null; unused() — правки, не нашедшие задания. */
function cueFixer(level) {
  const fixes = (CUE_FIXES[level] || []).map((f) => ({ ...f, used: false }))
  return {
    cue(lessonKey, sc) {
      const fix = fixes.find((f) => f.lesson === String(lessonKey) && f.line === sc.line)
      if (!fix) return null
      fix.used = true
      return fix.cue
    },
    unused: () => fixes.filter((f) => !f.used).map((f) => `урок ${f.lesson}: «${f.line}» — задание не найдено`),
  }
}

module.exports = { CUE_FIXES, cueFixer }
