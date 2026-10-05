// Состояние прохождения вопросов SAT — общее для диагностики, учебного режима и пробника (фазы 4, 5, 7). Порт
// JTS.session и part 2 из прототипа jts-sat-platform (js/modules/question.js), но без ключей: верность решает сервер,
// здесь только то, что студент сделал на экране. Всё чистое, без React и без localStorage — под vitest.
//
// Почему всё в одном объекте и сохраняется после каждого действия: перезагрузка обязана вернуть ответы, отметки,
// зачёркивания, маркер, время и место (критерий приёмки прототипа §14), а то, что живёт только в замыкании, при
// перезагрузке теряется.

export const KEYS = ['A', 'B', 'C', 'D']

// Режимы прототипа: study — проверка по одному и помощь; diagnostic — без помощи, мягкий таймер; exam — без помощи,
// жёсткий таймер по стене часов.
export const MODES = ['study', 'diagnostic', 'exam']

/** Ответ на один вопрос до любых действий. Маркер живёт в двух корзинах: у текста и у вопроса свои смещения. */
export function blankAnswer() {
  return { value: null, struck: [], marked: false, hl: { p: [], s: [] }, timeMs: 0 }
}

/**
 * Новая сессия. questions — [{ id, section }] в порядке показа. timing:
 *  - durationSec: 0 — секундомер вверх (учебный режим), иначе обратный отсчёт;
 *  - soft: время вышло — ничего не происходит (диагностика: «мягкий таймер»);
 *  - wallClock: часы идут и при закрытой вкладке (модуль пробника: вышел из аудитории — время идёт). Тогда хранится
 *    endsAt, а не накопленное время, и паузы нет.
 */
export function createSession({ id, mode = 'study', questions, timing = {}, now = Date.now() }) {
  if (!MODES.includes(mode)) throw new Error(`unknown mode ${mode}`)
  if (!Array.isArray(questions) || !questions.length) throw new Error('no questions')
  const durationMs = Math.max(0, Math.round((timing.durationSec || 0) * 1000))
  const wallClock = !!timing.wallClock && durationMs > 0
  const answers = {}
  for (const q of questions) answers[q.id] = blankAnswer()
  return {
    v: 1,
    id,
    mode,
    questions: questions.map((q) => ({ id: q.id, section: q.section === 'math' ? 'math' : 'rw' })),
    index: 0,
    answers,
    scratch: '',
    // инструменты экрана тоже часть состояния: калькулятор в Math не закрывается сам между вопросами и после
    // перезагрузки (как в реальном тесте), маркер и скрытый таймер — тоже
    tools: { calc: false, highlight: false, timerHidden: false },
    clock: {
      durationMs,
      soft: !!timing.soft,
      wallClock,
      startedAt: now,
      endsAt: wallClock ? now + durationMs : null,
      elapsedMs: 0,
      runningSince: now,
      paused: false,
    },
    shownAt: now,
    finishedAt: null,
  }
}

/** Сколько прошло по часам сессии. */
export function elapsedMs(s, now = Date.now()) {
  const c = s.clock
  if (c.wallClock) return Math.min(c.durationMs, Math.max(0, now - c.startedAt))
  return c.elapsedMs + (c.runningSince != null ? Math.max(0, now - c.runningSince) : 0)
}

/** Остаток для обратного отсчёта; null — секундомер вверх. */
export function remainingMs(s, now = Date.now()) {
  const c = s.clock
  if (!c.durationMs) return null
  if (c.wallClock) return Math.max(0, c.endsAt - now)
  return Math.max(0, c.durationMs - elapsedMs(s, now))
}

/** Жёсткий таймер вышел — модуль закрывается сам. Мягкий не закрывает ничего. */
export function expired(s, now = Date.now()) {
  const r = remainingMs(s, now)
  return r !== null && r <= 0 && !s.clock.soft
}

// Время на вопросе копится, пока он на экране и сессия идёт; переход, пауза и уход с экрана его фиксируют.
function commitTime(s, now) {
  const qid = s.questions[s.index].id
  const a = s.answers[qid]
  const add = s.clock.paused || s.shownAt == null ? 0 : Math.max(0, now - s.shownAt)
  return { ...s, answers: { ...s.answers, [qid]: { ...a, timeMs: a.timeMs + add } }, shownAt: now }
}

/** Пауза — только у часов, которые считают время экрана; модуль пробника идёт по стене часов и не ждёт. */
export function setPaused(s, paused, now = Date.now()) {
  if (s.clock.wallClock || s.clock.paused === paused) return s
  const t = commitTime(s, now)
  const c = t.clock
  return {
    ...t,
    shownAt: paused ? null : now,
    clock: paused
      ? { ...c, paused: true, elapsedMs: elapsedMs(t, now), runningSince: null }
      : { ...c, paused: false, runningSince: now },
  }
}

/**
 * Стена часов модуля пробника принадлежит серверу: черновик устройства подстраивается под его конец (endsAt — уже в
 * часах устройства: «сейчас» + остаток сервера). Иначе черновик, открытый на другом устройстве или после сдвига
 * часов, жил бы своим концом модуля. Расхождение меньше двух секунд — задержка запроса, его не трогаем.
 */
export function syncWallClock(s, endsAt) {
  if (!s.clock.wallClock || endsAt == null || Math.abs(s.clock.endsAt - endsAt) < 2000) return s
  return { ...s, clock: { ...s.clock, endsAt, startedAt: endsAt - s.clock.durationMs } }
}

/** Экран закрыт (уход, перезагрузка): накопленное время фиксируется, часы экрана встают. */
export function suspend(s, now = Date.now()) {
  if (s.clock.runningSince == null) return s
  const t = commitTime(s, now)
  return { ...t, shownAt: null, clock: { ...t.clock, elapsedMs: elapsedMs(t, now), runningSince: null } }
}

/** Экран снова открыт: часы экрана идут дальше с того же места (если сессия не на паузе). */
export function resume(s, now = Date.now()) {
  if (s.clock.paused || s.clock.runningSince != null) return s
  return { ...s, shownAt: now, clock: { ...s.clock, runningSince: now } }
}

export function current(s) {
  return s.questions[s.index]
}

export function answerOf(s, qid = current(s).id) {
  return s.answers[qid] || blankAnswer()
}

function patch(s, qid, fn) {
  const a = answerOf(s, qid)
  return { ...s, answers: { ...s.answers, [qid]: { ...a, ...fn(a) } } }
}

export function isAnswered(a) {
  return !!a && a.value !== null && a.value !== undefined && String(a.value).trim() !== ''
}

/** Выбор варианта снимает с него зачёркивание: выбранное зачёркнутым не бывает. */
export function select(s, qid, key) {
  return patch(s, qid, (a) => ({ value: key, struck: a.struck.filter((k) => k !== key) }))
}

/** Зачеркнуть / вернуть вариант; зачёркнутый выбранный вариант перестаёт быть выбранным. */
export function toggleStrike(s, qid, key) {
  return patch(s, qid, (a) => {
    const on = a.struck.includes(key)
    return {
      struck: on ? a.struck.filter((k) => k !== key) : [...a.struck, key],
      value: !on && a.value === key ? null : a.value,
    }
  })
}

/** Ответ-число (SPR) пишется как набран; формат проверяет экран, верность — сервер. */
export function setValue(s, qid, value) {
  return patch(s, qid, () => ({ value: value === '' ? null : value }))
}

export function toggleMark(s, qid) {
  return patch(s, qid, (a) => ({ marked: !a.marked }))
}

export function setHighlights(s, qid, bucket, ranges) {
  return patch(s, qid, (a) => ({ hl: { ...a.hl, [bucket]: ranges } }))
}

export function setTool(s, tool, on) {
  return { ...s, tools: { ...s.tools, [tool]: on } }
}

export function setScratch(s, text) {
  return { ...s, scratch: text }
}

/** Переход на вопрос index (с фиксацией времени на уходящем). */
export function goTo(s, index, now = Date.now()) {
  const i = Math.max(0, Math.min(s.questions.length - 1, index))
  if (i === s.index) return s
  const t = commitTime(s, now)
  return { ...t, index: i, shownAt: t.clock.paused ? null : now }
}

export function finish(s, now = Date.now()) {
  const t = suspend(s, now)
  return { ...t, finishedAt: now }
}

/** Счётчики для навигатора и окна проверки модуля (Figma 30). */
export function counts(s) {
  let answered = 0
  let marked = 0
  for (const q of s.questions) {
    const a = s.answers[q.id]
    if (isAnswered(a)) answered++
    if (a?.marked) marked++
  }
  return { total: s.questions.length, answered, unanswered: s.questions.length - answered, marked }
}

/** Первый вопрос без ответа (для «К вопросу N» в проверке модуля); -1 — всё отвечено. */
export function firstUnanswered(s) {
  return s.questions.findIndex((q) => !isAnswered(s.answers[q.id]))
}

/**
 * Группы ленты навигатора: смена секции — разрыв и подпись «R&W 1–12 · Math 13–24» (Figma 8: диагностика идёт
 * обеими секциями одной сессией). У сессии одной секции группа одна и подписи нет.
 */
export function sectionGroups(s) {
  const groups = []
  s.questions.forEach((q, i) => {
    const last = groups[groups.length - 1]
    if (last && last.section === q.section) last.to = i + 1
    else groups.push({ section: q.section, from: i + 1, to: i + 1 })
  })
  return groups
}

/** Время для часов: «12:40», «1:02:05» — как в Bluebook, минуты без ведущего нуля только у часов. */
export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** Черновик с устройства подходит к этой сессии: та же версия, тот же набор вопросов в том же порядке. */
export function sameShape(saved, questions) {
  if (!saved || saved.v !== 1 || !Array.isArray(saved.questions)) return false
  if (saved.questions.length !== questions.length) return false
  return saved.questions.every((q, i) => q.id === questions[i].id)
}

/**
 * Дописать вопрос в конец («Похожее» учебного режима): ответы и место уже сделанного не трогаются. Уже есть — без
 * изменений.
 */
export function appendQuestion(s, q) {
  if (s.questions.some((x) => x.id === q.id)) return s
  return {
    ...s,
    questions: [...s.questions, { id: q.id, section: q.section === 'math' ? 'math' : 'rw' }],
    answers: { ...s.answers, [q.id]: blankAnswer() },
  }
}

/**
 * Черновик с устройства и набор с сервера: тот же набор — как есть; сервер дописал вопросы («Похожее» с другой
 * вкладки или до перезагрузки) — черновик продлевается; иначе черновик не подходит (null).
 */
export function reconcile(saved, questions) {
  if (sameShape(saved, questions)) return saved
  if (!saved || saved.v !== 1 || !Array.isArray(saved.questions) || saved.questions.length > questions.length) return null
  if (!saved.questions.every((q, i) => q.id === questions[i].id)) return null
  return questions.slice(saved.questions.length).reduce((s, q) => appendQuestion(s, q), saved)
}

/** Время на вопросе на эту минуту: накопленное плюс текущий показ (для timeSec при проверке, до перехода дальше). */
export function timeOn(s, qid, now = Date.now()) {
  const a = s.answers[qid]
  if (!a) return 0
  const live = current(s).id === qid && s.shownAt != null && !s.clock.paused ? Math.max(0, now - s.shownAt) : 0
  return a.timeMs + live
}
