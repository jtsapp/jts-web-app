// Движок «Слушай и выбирай»: выборка заданий, раунд из двух попыток и счёт.
// Порт data/jtslistenchoose.html — там всё это вперемешку с DOM, здесь чистые
// функции без React и без хранилища. Выборку сверяет с прототипом оракул
// (__fixtures__/oracle.json), правила раунда — юнит-тесты: `answer()`
// прототипа не отделить от его DOM.

export const LEVELS = ['easy', 'medium', 'hard']
export const COUNT_PRESETS = [5, 10, 20, 30, 50]
export const MAX_COUNT = 50
export const DEFAULT_COUNT = 10
export const ATTEMPTS = 2

// Fisher–Yates ровно как shuffle прототипа: порядок обмена и вызовов random
// менять нельзя — от него зависит порядок картинок и очереди в тестах.
export function shuffled(items, random = Math.random) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Набор заданий: без повторов, неувиденные раньше увиденных, сцена не идёт
 * подряд, пока есть выбор. Из сцен берётся та, где ещё не бывших заданий
 * больше всего, — иначе набор на 10 заданий выбрал бы по одному из десяти
 * сцен и три оставил на потом. Когда всё уже было, цикл начинается заново, и
 * «уже было» становится текущим набором.
 *
 * Порт `sampleQuestions` прототипа без «улучшений»: два вызова random на шаг
 * (сцена, потом задание) — в этом порядке.
 */
export function sampleQuestions(bank, { level, count, seen = [], previousScene = null }, random = Math.random) {
  const pool = bank.filter((q) => q.level === level)
  if (!Number.isInteger(count) || count < 1 || count > pool.length) throw new RangeError('Invalid question count')
  let used = new Set(seen.filter((id) => pool.some((q) => q.id === id)))
  const selected = new Set()
  const queue = []
  let last = previousScene
  while (queue.length < count) {
    let available = pool.filter((q) => !selected.has(q.id) && !used.has(q.id))
    if (!available.length) {
      used = new Set(selected)
      available = pool.filter((q) => !selected.has(q.id))
    }
    const groups = new Map()
    for (const q of available) {
      if (!groups.has(q.scene)) groups.set(q.scene, [])
      groups.get(q.scene).push(q)
    }
    let choices = [...groups.keys()].filter((scene) => scene !== last)
    if (!choices.length) choices = [...groups.keys()]
    const max = Math.max(...choices.map((scene) => groups.get(scene).length))
    choices = choices.filter((scene) => groups.get(scene).length === max)
    const scene = choices[Math.floor(random() * choices.length)]
    const group = groups.get(scene)
    const q = group[Math.floor(random() * group.length)]
    queue.push(q.id)
    selected.add(q.id)
    used.add(q.id)
    last = q.scene
  }
  return { queue, seen: [...used] }
}

// ── Набор ────────────────────────────────────────────────────────────────
export function createRun(queue) {
  return { queue, index: 0, rounds: {}, complete: false }
}

/** «Повторить ошибки»: те же задания, но заново перемешанные. */
export function runFromIds(data, ids, level, random = Math.random) {
  const queue = shuffled(
    [...new Set(ids)].filter((id) => data.byId[id] && data.byId[id].level === level),
    random,
  )
  return createRun(queue)
}

/**
 * Набор из хранилища мог прийти от старой версии или быть побитым — принимаем
 * только целый набор ЭТОЙ сложности, остальное выкидываем и рисуем новый.
 */
export function isValidRun(run, data, level) {
  return (
    !!run &&
    Array.isArray(run.queue) &&
    run.queue.length > 0 &&
    run.queue.length <= MAX_COUNT &&
    new Set(run.queue).size === run.queue.length &&
    run.queue.every((id) => data.byId[id] && data.byId[id].level === level) &&
    Number.isInteger(run.index) &&
    run.index >= 0 &&
    run.index < run.queue.length &&
    !!run.rounds &&
    typeof run.rounds === 'object' &&
    !Array.isArray(run.rounds)
  )
}

// ── Раунд ────────────────────────────────────────────────────────────────
// order — в каком порядке показаны фото (номер на бейдже = позиция в order),
// wrong — какие фото уже названы неверно (индексы фото, а не позиции).
export function newRound(random = Math.random) {
  return { order: shuffled([0, 1, 2, 3], random), wrong: [], resolved: false, correct: false, attempts: 0 }
}

function isValidRound(r) {
  return (
    !!r &&
    Array.isArray(r.order) &&
    new Set(r.order).size === 4 &&
    r.order.every((i) => [0, 1, 2, 3].includes(i)) &&
    Array.isArray(r.wrong)
  )
}

/** Раунд задания; битый порядок из хранилища заменяется свежим. Набор не меняет. */
export function roundOf(run, id, random = Math.random) {
  const r = run.rounds[id]
  return isValidRound(r) ? r : newRound(random)
}

/** Отвечать можно только дослушав, при загруженных картинках и не в закрытый раунд. */
export function canAnswer(round, { heard, imagesReady }, optionIndex) {
  return !(round.resolved || !heard || !imagesReady || round.wrong.includes(optionIndex))
}

/**
 * Ответ: верное фото закрывает задание, вторая ошибка — тоже, но без очка.
 * Первая ошибка задание НЕ закрывает и верного ответа не открывает: студент
 * должен сам послушать ещё раз (сброс прослушанного — забота плеера).
 */
export function answerRound(round, question, optionIndex) {
  const next = { ...round, wrong: [...round.wrong], attempts: round.attempts + 1 }
  if (optionIndex === question.answer) {
    next.correct = true
    next.resolved = true
  } else {
    next.wrong.push(optionIndex)
    if (next.wrong.length >= ATTEMPTS) {
      next.correct = false
      next.resolved = true
    }
  }
  return next
}

// ── Счёт ─────────────────────────────────────────────────────────────────
export function scoreOf(run) {
  const rows = Object.values(run.rounds).filter((r) => r.resolved)
  return {
    first: rows.filter((r) => r.correct && r.attempts === 1).length,
    second: rows.filter((r) => r.correct && r.attempts === 2).length,
    missed: rows.filter((r) => !r.correct).length,
  }
}

/** Задания для «Повторить ошибки»: промах или верно только со второй попытки. */
export function retryIds(run) {
  return run.queue.filter((id) => {
    const r = run.rounds[id]
    return !r || !r.correct || r.attempts > 1
  })
}
