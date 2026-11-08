// Оценка ответов Луны (ТЗ v2.0, 8.5; спека docs/superpowers/specs/2026-11-08-luna-answer-rating-design.md): форма
// записи журнала, общая у окна и роута /api/assistant/rating, и вычистка персональных данных.
//
// Окно шлёт одну и ту же запись несколько раз — когда ответ дописан, когда пришёл первый звук, когда ученик оценил
// или нажал кнопку под ответом, — всегда целиком, с растущим seq. Роут принимает только то, что здесь разобрано:
// лишние поля молча отбрасываются, длинное — обрезается (ответ не должен теряться из-за длины), неверное по сути
// (id, оценка, причина) — ошибка. Режим ответа и событие роут выводит из вопроса сам (ratingMode.js), у окна их не
// спрашивает.
//
// Модуль чистый и лёгкий: его тянет и окно, поэтому разбор режима ответа (он зовёт справку по грамматике) — отдельно,
// в ratingMode.js, только на сервере.

export const REASONS = ['wrong', 'offtarget', 'unclear', 'lang']
export const CHANNELS = ['text', 'voice', 'call']
export const MAX_QUESTION = 2000
export const MAX_ANSWER = 6000
export const MAX_COMMENT = 500
const MAX_ACTIONS = 4
const MAX_ACTION_KEY = 80
const MAX_MS = 10 * 60 * 1000
const ID_RE = /^[A-Za-z0-9_-]{8,48}$/
const SCREEN_RE = /^[A-Za-z0-9_.:-]{1,64}$/
const MODEL_RE = /^[A-Za-z0-9._:-]{1,64}$/

export class RatingRequestError extends Error {}

const str = (v) => (typeof v === 'string' ? v : '')
const cut = (v, n) => str(v).slice(0, n)
const ms = (v) => (Number.isInteger(v) && v >= 0 && v <= MAX_MS ? v : null)

/** Ключ кнопки под ответом для журнала: что предложила Луна и что нажал ученик. */
export function actionKey(action) {
  if (!action || typeof action !== 'object') return ''
  const kind = String(action.kind || '')
  // У нажатия target — номер кнопки в снимке, он ничего не говорит разбору; подпись — говорит.
  const what =
    kind === 'click'
      ? action.label
      : action.feedback
        ? `feedback:${action.feedback.category}`
        : kind === 'replan' || kind === 'break'
          ? action.minutes
          : kind === 'step'
            ? action.task?.kind || action.dest || action.target
            : action.target
  return `${kind}:${what ?? ''}`.replace(/\s+/g, ' ').trim().slice(0, MAX_ACTION_KEY)
}

/**
 * Тело POST /api/assistant/rating → запись или RatingRequestError.
 * @returns {{ id: string, chat: string, turn: number, seq: number, question: string, answer: string,
 *   screen: string|null, lang: 'ru'|'kk'|'en', model: string|null, channel: string, offtopic: boolean, firstMs: number|null, soundMs: number|null, actions: string[],
 *   clicked: string|null, rating: 1|-1|null, reasons: string[], comment: string }}
 */
export function parseRatingRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RatingRequestError('body')
  const id = str(body.id)
  const chat = str(body.chat)
  if (!ID_RE.test(id) || !ID_RE.test(chat)) throw new RatingRequestError('id')
  let rating = null
  if (body.rating === 'up') rating = 1
  else if (body.rating === 'down') rating = -1
  else if (body.rating != null) throw new RatingRequestError('rating')
  const reasons = Array.isArray(body.reasons) ? [...new Set(body.reasons.filter((r) => typeof r === 'string'))] : []
  if (reasons.some((r) => !REASONS.includes(r))) throw new RatingRequestError('reason')
  // Причина и комментарий — только к 👎: у 👍 их нет в окне, а пришедшие — мусор.
  const down = rating === -1
  const actions = (Array.isArray(body.actions) ? body.actions : [])
    .filter((a) => typeof a === 'string' && a.trim())
    .slice(0, MAX_ACTIONS)
    .map((a) => a.trim().slice(0, MAX_ACTION_KEY))
  const clicked = cut(body.clicked, MAX_ACTION_KEY).trim() || null
  const int = (v, max) => (Number.isInteger(v) && v >= 0 && v <= max ? v : 0)
  return {
    id,
    chat,
    turn: int(body.turn, 1000),
    seq: int(body.seq, 1_000_000),
    question: cut(body.question, MAX_QUESTION),
    answer: cut(body.answer, MAX_ANSWER),
    screen: SCREEN_RE.test(str(body.screen)) ? body.screen : null,
    lang: ['ru', 'kk', 'en'].includes(body.lang) ? body.lang : body.lang === 'kz' ? 'kk' : 'ru',
    model: MODEL_RE.test(str(body.model)) ? body.model : null,
    channel: CHANNELS.includes(body.channel) ? body.channel : 'text',
    offtopic: body.offtopic === true,
    firstMs: ms(body.firstMs),
    soundMs: ms(body.soundMs),
    actions,
    clicked,
    rating,
    reasons: down ? reasons : [],
    comment: down ? cut(body.comment, MAX_COMMENT).trim() : '',
  }
}

/** Есть ли в записи что-то от ученика, кроме самого ответа: оценка, комментарий или нажатая кнопка. */
export const hasFeedback = (entry) => Boolean(entry && (entry.rating != null || entry.comment || entry.clicked))

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Имя — со словоформой: «Айгерімге», «Толику», «Сапаровой». Окончание у русских и казахских имён — до четырёх букв,
// а конечная гласная склоняется («Сапарова» → «Сапаровой», «Мария» → «Марией»), поэтому ищем по основе без неё.
// Короче трёх букв основу не берём — «Ая» задело бы «Аяз» и полтекста.
const FINAL_VOWEL = /[аяыиеоуәіэюё]$/i
function nameRe(name) {
  const words = String(name || '')
    .split(/[\s,.-]+/)
    .map((w) => w.trim())
    .map((w) => (w.length >= 4 && FINAL_VOWEL.test(w) ? w.slice(0, -1) : w))
    .filter((w) => w.length >= 3)
  if (!words.length) return null
  // Граница слова слева — захватом, а не lookbehind: модуль едет и в браузер, а lookbehind Safari понимает только с
  // 16.4 (safariSyntax.test.js). Захваченный символ возвращается на место в scrubPersonal.
  return new RegExp(`(^|[^\\p{L}])(?:${words.map(escapeRe).join('|')})\\p{L}{0,4}(?!\\p{L})`, 'giu')
}

const EMAIL_RE = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu
// Номер — 10–15 цифр подряд, можно с пробелами, скобками и дефисами; даты («2026-11-08») и счёт короче.
const PHONE_RE = /\+?\d[\d\s()-]{8,20}\d/g

/**
 * Текст без имени, телефона и почты ученика: метки {имя}, {телефон}, {почта}. Почты и номера вычищаются любые —
 * ученик мог вписать чужие (ТЗ 8.5: логи без персональных данных).
 * @param {string} text
 * @param {{ name?: string|null, phone?: string|null, email?: string|null }} user
 */
export function scrubPersonal(text, user = {}) {
  let out = String(text ?? '')
  if (!out) return out
  out = out.replace(EMAIL_RE, '{почта}')
  out = out.replace(PHONE_RE, (m) => (m.replace(/\D/g, '').length >= 10 ? '{телефон}' : m))
  const re = nameRe(user?.name)
  if (re) out = out.replace(re, '$1{имя}')
  return out
}
