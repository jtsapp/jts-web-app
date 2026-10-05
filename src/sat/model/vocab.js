// Словарь SAT (фаза 9): колода, очередь дня, подписи кнопок оценки и раунды игр — порт JTS.vocab прототипа
// (js/modules/vocab.js) без хранилища. Расписание SM-2 считает и хранит сервер (SatVocabRules); здесь — его копия
// только для подписей «через 6 дней» на кнопках до нажатия (тест сверяет те же примеры, что SatVocabRulesTest).

export const GOALS = [5, 10, 20]
export const GRADES = [
  { id: 'again', q: 0 },
  { id: 'hard', q: 3 },
  { id: 'good', q: 4 },
  { id: 'easy', q: 5 },
]
export const MASTERED_DAYS = 21
const DAY = 86400000
const AGAIN_MS = 10 * 60000

/** Слова JTS плюс свои; своё слово — категория custom. Слово в колоде пишется со строчной: «Abate» → «abate». */
export function buildDeck(base = [], custom = []) {
  const own = custom.map((w) => ({ id: w.id, word: w.word, pos: [], category: 'custom', definition: w.definition, example: w.example || null, ru: w.ru || null, own: true }))
  return [...own, ...base]
}

export function displayWord(w) {
  const s = String(w || '')
  // имена собственные в колоде не встречаются: заглавная — только начало строки в таблице источника
  return s && s === s[0].toUpperCase() + s.slice(1) && s.slice(1) === s.slice(1).toLowerCase() ? s.toLowerCase() : s
}

/** new — ни разу не оценено; mastered — интервал больше трёх недель; иначе learning. */
export function status(card) {
  if (!card) return 'new'
  return card.interval >= MASTERED_DAYS ? 'mastered' : 'learning'
}

export function counts(deck, cards = {}, now = Date.now()) {
  const out = { new: 0, learning: 0, mastered: 0, due: 0 }
  for (const w of deck) {
    const c = cards[w.id]
    out[status(c)]++
    if (c && c.dueAt <= now) out.due++
  }
  return out
}

/**
 * Очередь дня: сначала всё просроченное (забытое слово стоит дороже, чем не увиденное), потом новые — до цели.
 * Новых — столько, сколько осталось до цели с учётом уже оценённого сегодня: у прототипа новые добавлялись снова
 * после каждой оценки, и цель «10» никогда не заканчивалась.
 */
export function queue(deck, cards = {}, goal = 10, today = 0, now = Date.now()) {
  const due = deck.filter((w) => cards[w.id] && cards[w.id].dueAt <= now).sort((a, b) => cards[a.id].dueAt - cards[b.id].dueAt)
  const room = Math.max(0, goal - today - due.length)
  const fresh = deck.filter((w) => !cards[w.id]).slice(0, room)
  return { items: [...due, ...fresh], due: due.length, fresh: fresh.length }
}

/**
 * Карточка «Словарь» на «Сегодня» (Figma 11: «Словарь · 10 карточек», «0 из 10 на сегодня») — по одному состоянию с
 * сервера, без колоды: просроченные плюс новые до цели. Колода (514 слов) больше любой цели, поэтому новых хватает
 * всегда; тянуть 170 КБ ради одной цифры на главном экране незачем.
 */
export function todayLoad(state, now = Date.now()) {
  const due = Object.values(state.cards || {}).filter((c) => c.dueAt <= now).length
  const total = state.today + due + Math.max(0, state.goal - state.today - due)
  return { done: state.today, total }
}

/** SM-2 — та же формула, что на сервере; здесь только для подписей кнопок до нажатия. */
export function grade(card, q, now = Date.now()) {
  const c = card || { ef: 2.5, interval: 0, reps: 0, lapses: 0 }
  let reps, interval, lapses = c.lapses, dueAt
  if (q < 3) {
    reps = 0
    interval = 0
    lapses += 1
    dueAt = now + AGAIN_MS
  } else {
    reps = c.reps + 1
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(c.interval * c.ef)
    dueAt = now + interval * DAY
  }
  const ef = Math.max(1.3, c.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  return { ef, interval, reps, lapses, dueAt, lastAt: now }
}

/** Через сколько вернётся карточка: { n, unit: 'min' | 'day' } — для подписи кнопки. */
export function nextIn(card, q, now = Date.now()) {
  const g = grade(card, q, now)
  return g.interval ? { n: g.interval, unit: 'day' } : { n: Math.round((g.dueAt - now) / 60000), unit: 'min' }
}

/** Короткое определение для пар: до первой точки с запятой или «, or». */
export function shortDef(w) {
  return String(w.definition || '').split(/;|, or /)[0].trim()
}

/** Детерминированная перетасовка: тот же seed — тот же порядок (тесты и повтор раунда). */
export function shuffle(list, seed = 1) {
  const a = list.slice()
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Раунд «Пары»: шесть слов с непохожими короткими определениями; определения — в другом порядке. */
export function matchRound(deck, seed, n = 6) {
  const pool = deck.filter((w) => shortDef(w).length > 3)
  const words = []
  const defs = new Set()
  for (const w of shuffle(pool, seed)) {
    const d = shortDef(w).toLowerCase()
    if (defs.has(d)) continue
    defs.add(d)
    words.push(w)
    if (words.length === n) break
  }
  return { words, defs: shuffle(words, seed + 7) }
}

/** Игры словаря на устройстве: только счёт, расписание карточек они не трогают. */
const GAMES_KEY = 'jts_sat_vocab_games'

export function readGames() {
  try {
    const g = JSON.parse(window.localStorage.getItem(GAMES_KEY) || '{}')
    return {
      match: g.match || { plays: 0, bestMs: null },
      cloze: g.cloze || { asked: 0, correct: 0 },
      register: g.register || { asked: 0, correct: 0 },
    }
  } catch {
    return { match: { plays: 0, bestMs: null }, cloze: { asked: 0, correct: 0 }, register: { asked: 0, correct: 0 } }
  }
}

export function saveGame(kind, patch) {
  const all = readGames()
  all[kind] = { ...all[kind], ...patch }
  try {
    window.localStorage.setItem(GAMES_KEY, JSON.stringify(all))
  } catch {
    /* счёт игры не сохранится — не беда */
  }
  return all
}
