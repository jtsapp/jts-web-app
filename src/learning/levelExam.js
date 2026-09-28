// Финальный экзамен уровня: данные и подсчёт (экран — LevelExam.jsx).
//
// Данные готовит scripts/extract-level-exams.js из data/jtsexam-<level>.html и
// кладёт в public/exam/<level>/exam.json. Экзамен есть не у всех уровней (у B1
// и C1 исходника нет) — тогда загрузчик отдаёт null и узла на тропе нет.
//
// Подсчёт — порт showResults прототипа, и сверяется он с ним же: оракул-фикстуры
// src/learning/__fixtures__/level-exam-oracle-<level>.json снимает сам
// прототип. Правка здесь, которая расходится с оракулом, — ошибка порта.

/** Код узла экзамена на тропе и в прогрессе бэкенда (рядом с L<n>/T<u>/X<id>). */
export const EXAM_CODE = 'EXAM'

export const SKILLS = ['grammar', 'vocabulary', 'reading', 'listening']

// Навык ниже этой доли прототип отправляет «повторить» (skillPct < 70).
export const WEAK_BELOW = 70

const cache = new Map() // level -> Promise<exam|null>

/**
 * exam.json уровня или null. Нет файла (404) — у уровня нет экзамена, это
 * запоминаем. Сеть упала или сервер ответил 5xx — не запоминаем: иначе одна
 * осечка прятала бы узел до перезагрузки страницы.
 */
export function loadLevelExam(level) {
  const code = String(level || '').toLowerCase()
  if (!code) return Promise.resolve(null)
  if (!cache.has(code)) {
    const forget = () => {
      cache.delete(code)
      return null
    }
    cache.set(
      code,
      fetch(`/exam/${code}/exam.json`)
        .then((r) => {
          if (r.ok) return r.json()
          return r.status === 404 ? null : forget()
        })
        .then((data) => (data && Array.isArray(data.sections) ? data : null))
        .catch(forget),
    )
  }
  return cache.get(code)
}

/** Вопросы раздела в порядке прототипа: пропуски диалога, вопросы, вопросы к текстам. */
export function sectionQuestions(section) {
  return [
    ...(section.dialogue ? section.dialogue.gaps : []),
    ...(section.questions || []),
    ...(section.passages || []).flatMap((p) => p.questions),
  ]
}

/** Все вопросы со сквозным номером 1…total — как их нумерует прототип. */
export function examQuestions(exam) {
  let num = 0
  const out = []
  for (const section of exam.sections) {
    for (const q of sectionQuestions(section)) out.push({ ...q, section: section.key, num: ++num })
  }
  return out
}

const isAnswer = (v) => Number.isInteger(v)

export function answeredCount(exam, answers) {
  return examQuestions(exam).filter((q) => isAnswer(answers?.[q.id])).length
}

/**
 * Итоги попытки. answers — { id вопроса: ИСХОДНЫЙ индекс варианта }: порядок на
 * экране перемешан (optionOrder), а считаем по данным, как прототип.
 * Вопрос без ответа — неверный (у прототипа `given !== undefined && …`).
 */
export function scoreExam(exam, answers = {}) {
  const skills = exam.sections.map((section) => {
    const qs = sectionQuestions(section)
    const correct = qs.filter((q) => answers[q.id] === q.answer).length
    const pct = Math.round((correct / qs.length) * 100)
    return { key: section.key, correct, total: qs.length, pct, weak: pct < WEAK_BELOW }
  })
  const correct = skills.reduce((n, s) => n + s.correct, 0)
  const total = skills.reduce((n, s) => n + s.total, 0)
  return { correct, total, pct: Math.round((correct / total) * 100), passed: correct >= exam.pass, skills }
}

// FNV-1a: из строки «уровень:id» — зерно перестановки. Своё, а не Math.random:
// порядок обязан совпадать у всех и при каждом заходе — иначе разбор ответов
// показывал бы варианты не там, где их выбирали.
function hash32(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/**
 * Порядок показа вариантов — список ИСХОДНЫХ индексов.
 *
 * Перемешиваем потому, что в исходниках правильный ответ почти всегда стоит в
 * одной позиции: у A1 и A2 все десять ответов «Слов» — первый вариант, в
 * аудировании на всех уровнях девять из десяти — второй. Показать как есть —
 * значит принимать экзамен у того, кто заметил закономерность.
 * True/False не трогаем: пара «True, False» читается только в этом порядке.
 */
export function optionOrder(level, q) {
  const idx = q.options.map((_, i) => i)
  if (q.tf) return idx
  let s = hash32(`${String(level).toLowerCase()}:${q.id}`) & 0x7fffffff
  for (let i = idx.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}
