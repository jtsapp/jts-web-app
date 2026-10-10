// Состояние прохождения теста Reading — чистые функции без React (как движок прототипа 20-reading-engine).
// Проверка ответов здесь НЕ живёт: ключей у клиента нет, судит сервер (/check по вопросу, /attempts при сдаче).
import { PASSAGE_SEC, mechanicOf } from './meta.js'

export const MODES = ['exam', 'practice', 'study']

// Плоский список вопросов с номерами IELTS. У choose-TWO один вопрос занимает два номера (2–3), поэтому номер
// считается от range группы с шагом по числу верных букв — как сетка 1–40 на экзамене.
export function flattenItems(doc) {
  const out = []
  ;(doc?.groups || []).forEach((g, gi) => {
    let n = Array.isArray(g.range) ? g.range[0] : out.length ? out[out.length - 1].numbers.at(-1) + 1 : 1
    ;(g.items || []).forEach((it) => {
      const span = mechanicOf(g.type) === 'multi' ? Math.max(1, it.marks || 2) : 1
      const numbers = Array.from({ length: span }, (_, i) => n + i)
      n += span
      out.push({ id: it.id, type: g.type, groupIndex: gi, numbers, item: it, group: g })
    })
  })
  return out
}

export function isAnswered(given) {
  if (Array.isArray(given)) return given.length > 0
  return typeof given === 'string' && given.trim() !== ''
}

// Лимит режима «Экзамен»: из теста, иначе 20 минут на текст.
export function examSeconds(doc) {
  if (doc?.timeLimitSec > 0) return doc.timeLimitSec
  const texts = Math.max(1, (doc?.texts || []).length)
  return texts * PASSAGE_SEC
}

export function createRun(doc, mode, now = Date.now()) {
  const items = flattenItems(doc)
  return {
    testId: doc.id,
    mode,
    startedAt: new Date(now).toISOString(),
    endsAt: mode === 'exam' ? now + examSeconds(doc) * 1000 : null,
    current: items[0]?.id || null,
    answers: {},
    flags: {},
    checked: {},
    hinted: {},
    questionSec: {},
    highlights: [],
    shownAt: now,
  }
}

// Счёт идёт по НОМЕРАМ IELTS, а не по карточкам: choose-TWO «12–13» — два вопроса, как в итоге «8 из 13».
// Считай мы карточки, сетка писала бы «из 12», а результат той же попытки — «из 13».
export function markTotal(items) {
  return items.reduce((n, x) => n + x.numbers.length, 0)
}

export function answeredCount(run, items) {
  return items.reduce((n, x) => {
    const v = run.answers[x.id]
    if (!isAnswered(v)) return n
    // у choose-TWO одна выбранная буква закрывает один номер из двух
    return n + (Array.isArray(v) ? Math.min(v.length, x.numbers.length) : x.numbers.length)
  }, 0)
}

// Время на вопрос копится, пока он текущий: при уходе с вопроса добавляем прожитые секунды.
export function moveTo(run, itemId, now = Date.now()) {
  if (run.current === itemId) return run
  const spent = Math.max(0, Math.round((now - run.shownAt) / 1000))
  const questionSec = run.current ? { ...run.questionSec, [run.current]: (run.questionSec[run.current] || 0) + spent } : run.questionSec
  return { ...run, current: itemId, shownAt: now, questionSec }
}

export function setAnswer(run, itemId, given, now = Date.now()) {
  const moved = moveTo(run, itemId, now)
  // ответ поменялся — прежний вердикт «Тренировки» к нему больше не относится
  const checked = { ...moved.checked }
  delete checked[itemId]
  return { ...moved, answers: { ...moved.answers, [itemId]: given }, checked }
}

export function toggleFlag(run, itemId) {
  return { ...run, flags: { ...run.flags, [itemId]: !run.flags[itemId] } }
}

export function remainingSec(run, now = Date.now()) {
  if (!run.endsAt) return null
  return Math.max(0, Math.round((run.endsAt - now) / 1000))
}

export function formatClock(sec) {
  if (sec == null) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function submitBody(run, now = Date.now(), device = 'desktop') {
  const closed = moveTo(run, null, now)
  const answers = {}
  for (const [k, v] of Object.entries(run.answers)) if (isAnswered(v)) answers[k] = v
  return {
    mode: run.mode,
    answers,
    questionSec: closed.questionSec,
    timeSec: Math.max(0, Math.round((now - Date.parse(run.startedAt)) / 1000)),
    startedAt: run.startedAt,
    device,
    highlights: run.highlights.slice(0, 200),
  }
}

// Черновик попытки на устройстве: закрыл вкладку — вернулся к тем же ответам (Figma «Есть незаконченный тест»).
// Это удобство одного браузера, не статистика: сданная попытка живёт только на сервере.
const DRAFT_PREFIX = 'jts_ielts_reading_draft_'

export function saveDraft(run, now = Date.now()) {
  try {
    localStorage.setItem(DRAFT_PREFIX + run.testId, JSON.stringify({ ...run, savedAt: now }))
  } catch {
    /* приватный режим или полное хранилище — черновика просто не будет */
  }
}

// Часы экзамена стоят, пока тест закрыт: остаток считается на момент последнего сохранения черновика.
export function pausedLeftSec(draft) {
  if (!draft?.endsAt) return null
  return Math.max(0, Math.round((draft.endsAt - (draft.savedAt || Date.parse(draft.startedAt))) / 1000))
}

// Вернулись к черновику — сдвигаем срок на время отсутствия, чтобы осталось ровно столько, сколько было.
export function resumeDraft(draft, now = Date.now()) {
  if (!draft) return null
  const left = pausedLeftSec(draft)
  return { ...draft, endsAt: left == null ? null : now + left * 1000, shownAt: now }
}

export function loadDraft(testId) {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + testId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function dropDraft(testId) {
  try {
    localStorage.removeItem(DRAFT_PREFIX + testId)
  } catch {
    /* нечего чистить */
  }
}

export function listDrafts() {
  const out = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(DRAFT_PREFIX)) continue
      const d = JSON.parse(localStorage.getItem(k))
      if (d?.testId) out.push(d)
    }
  } catch {
    /* без хранилища черновиков нет */
  }
  return out
}
