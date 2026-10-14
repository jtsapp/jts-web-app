// Нарезка потока ответа помощника на фразы для озвучки. Синтез голоса Луны
// (Gemini) не потоковый — фраза приходит целиком, — поэтому первая фраза уходит,
// как только дописано первое предложение: чем она короче, тем раньше ученик
// услышит ответ. Дальше фразы крупнее — меньше вызовов синтеза и пауз между
// ними. Разметку (**…**, «- ») и служебные метки вслух не читаем.

export const FIRST_MIN = 30
export const NEXT_MIN = 120
// Gemini читает фразу целиком примерно за 1.5 с + 40 мс на символ (замер
// 14.10.2026): 300 символов — ~13 с, и такая фраза успевает готовиться, пока
// звучат две предыдущие (voiceQueue, LOOKAHEAD). Длиннее — ответ замолкает.
export const MAX_CHUNK = 300

// Конец предложения — знак и пробел/перевод строки после него: без пробела это
// может быть «5.5» или ещё не дописанное «…». Перевод строки — тоже конец.
const SENTENCE_END = /[.!?…]+[»"”)]*(?=\s)|\n/g

export function cleanForSpeech(text) {
  return String(text ?? '')
    .replace(/\[\[[A-Z_]+\]\]/g, '')
    .replace(/\*\*/g, '')
    .replace(/^[ \t]*[-•][ \t]+/gm, '')
    .replace(/[ \t]+/g, ' ')
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
 */
export function createSpeechChunker({ firstMin = FIRST_MIN, nextMin = NEXT_MIN, max = MAX_CHUNK } = {}) {
  let buf = ''
  let emitted = 0

  function take(final) {
    const out = []
    const emit = (raw) => {
      const t = cleanForSpeech(raw)
      if (t) {
        out.push(t)
        emitted++
      }
    }
    for (;;) {
      const min = emitted === 0 ? firstMin : nextMin
      const ends = sentenceEnds(buf)
      let cut = ends.find((e) => e >= min) ?? -1
      if (cut > max || (cut < 0 && buf.length > max)) {
        cut = ends.filter((e) => e <= max).pop() ?? softCut(buf, max)
      }
      if (cut < 0) break
      emit(buf.slice(0, cut))
      buf = buf.slice(cut)
    }
    if (final) {
      emit(buf)
      buf = ''
    }
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
  }
}
