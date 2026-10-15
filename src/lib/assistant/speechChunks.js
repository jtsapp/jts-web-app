// Нарезка потока ответа помощника на фразы для озвучки. Синтез голоса Луны
// (Gemini) не потоковый — фраза приходит целиком, — поэтому первая фраза уходит,
// как только дописано первое предложение: чем она короче, тем раньше ученик
// услышит ответ. Дальше фразы крупнее — меньше вызовов синтеза и пауз между
// ними. Разметку (**…**, «- ») и служебные метки вслух не читаем.

export const FIRST_MIN = 30
// Первая фраза — не длиннее этого: пока она синтезируется, Луна молчит, а
// ученик смотрит на «Сейчас скажу…» (живой прогон 15.10.2026: первое
// предложение в 100+ символов — 5–6 с тишины). Длиннее — режем по запятой.
export const FIRST_MAX = 90
export const NEXT_MIN = 120
// Gemini читает фразу целиком примерно за 1.5 с + 40 мс на символ (замер
// 14.10.2026): 300 символов — ~13 с, и такая фраза успевает готовиться, пока
// звучат две предыдущие (voiceQueue, LOOKAHEAD). Длиннее — ответ замолкает.
export const MAX_CHUNK = 300

// Конец предложения — знак и пробел/перевод строки после него: без пробела это
// может быть «5.5» или ещё не дописанное «…». Перевод строки — тоже конец.
const SENTENCE_END = /[.!?…]+[»"”)]*(?=\s)|\n/g

// Эмодзи синтез читает вслух («smiling face» — живой прогон 14.10.2026).
// Последовательность целиком: цифра-клавиша (1️⃣), флаг из двух букв-регионов,
// пиктограмма с оттенком кожи и склейки через ZWJ (👨‍👩‍👧). Флаг /v с вычитанием
// классов не берём — старый Safari на нём падает при загрузке модуля; ©, ® и ™
// Юникод тоже относит к пиктограммам, их оставляем проверкой в колбэке.
const EMOJI_RE =
  /[0-9#*]️?⃣|[\u{1F1E6}-\u{1F1FF}]{2}|\p{Extended_Pictographic}[️\u{1F3FB}-\u{1F3FF}]*(?:‍\p{Extended_Pictographic}[️\u{1F3FB}-\u{1F3FF}]*)*|[️‍]/gu
const KEEP_SYMBOLS = new Set(['©', '®', '™'])

export function stripEmoji(text) {
  return String(text ?? '').replace(EMOJI_RE, (m) => (KEEP_SYMBOLS.has(m) ? m : ''))
}

export function cleanForSpeech(text) {
  return stripEmoji(text)
    .replace(/\[\[[A-Z_]+\]\]/g, '')
    .replace(/\*\*/g, '')
    .replace(/^[ \t]*[-•][ \t]+/gm, '')
    .replace(/[ \t]+/g, ' ')
    // эмодзи перед точкой оставлял «работа» .» — пробел перед знаком убираем
    .replace(/ ([.,!?:;…])/g, '$1')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
}

function sentenceEnds(buf) {
  const out = []
  SENTENCE_END.lastIndex = 0
  let m
  while ((m = SENTENCE_END.exec(buf))) out.push(m.index + m[0].length)
  return out
}

// Режем длинный кусок без конца предложения: лучше по запятой во второй
// половине, иначе по последнему пробелу — слово пополам не рвём.
function softCut(buf, max) {
  const head = buf.slice(0, max)
  const comma = head.lastIndexOf(', ')
  if (comma > max / 2) return comma + 1
  const space = head.lastIndexOf(' ')
  return space > 0 ? space : max
}

/**
 * push(кусок потока) → готовые фразы; flush() в конце ответа отдаёт остаток.
 * ends[i] — где в исходном потоке (с разметкой) кончается i-я фраза: по нему
 * виджет показывает текст ровно до того места, которое Луна сейчас говорит.
 * Кусок без слов для речи (одни эмодзи) своей фразы не даёт и уходит со следующей.
 */
export function createSpeechChunker({ firstMin = FIRST_MIN, firstMax = FIRST_MAX, nextMin = NEXT_MIN, max = MAX_CHUNK } = {}) {
  let buf = ''
  let emitted = 0
  let consumed = 0 // символов потока до начала buf
  const ends = []

  function take(final) {
    const out = []
    const emit = (len) => {
      const t = cleanForSpeech(buf.slice(0, len))
      buf = buf.slice(len)
      consumed += len
      if (t) {
        out.push(t)
        ends.push(consumed)
        emitted++
      }
    }
    for (;;) {
      const min = emitted === 0 ? firstMin : nextMin
      const lim = emitted === 0 ? firstMax : max
      const sentences = sentenceEnds(buf)
      let cut = sentences.find((e) => e >= min) ?? -1
      if (cut > lim || (cut < 0 && buf.length > lim)) {
        cut = sentences.filter((e) => e <= lim).pop() ?? softCut(buf, lim)
      }
      if (cut < 0) break
      emit(cut)
    }
    if (final) emit(buf.length)
    return out
  }

  return {
    push(chunk) {
      buf += String(chunk ?? '')
      return take(false)
    },
    flush() {
      return take(true)
    },
    ends,
  }
}
