// Счётчики речи ученика по транскрипту звонка — чистый модуль, без БД и сети.
//
// Считаем на чтении, а не храним в call_log: транскрипт и так лежит в строке,
// арифметика дешёвая, зато плитки появляются и у звонков, записанных до этой
// фичи, — у них выжимки нет, а посчитать слова есть по чему.
//
// Реплики тьютора в счётчики не идут: ученику показываем, сколько наговорил
// он сам, иначе цифра меряет болтливость модели.

// Слово = токен, в котором есть хоть одна буква или цифра. Внутренние апострофы
// и дефисы сохраняем («don't», «twenty-one» — по одному слову), кавычки и точки
// по краям срезаем.
const EDGE_PUNCT = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu
const HAS_ALNUM = /[\p{L}\p{N}]/u

function words(text) {
  const out = []
  for (const raw of String(text).split(/\s+/)) {
    const token = raw.replace(EDGE_PUNCT, '')
    if (token && HAS_ALNUM.test(token)) out.push(token)
  }
  return out
}

// Предложения. Транскрипт ученика — сырой STT: пунктуацию распознавалка ставит
// не всегда. Поэтому реплика без единой точки считается за одно предложение, а
// не за ноль — счётчик никогда не меньше числа реплик.
function sentencesIn(text) {
  const parts = String(text)
    .split(/[.!?…]+/)
    .filter((p) => HAS_ALNUM.test(p))
  return Math.max(1, parts.length)
}

export function learnerTurns(transcript) {
  if (!Array.isArray(transcript)) return []
  return transcript.filter(
    (turn) => turn && turn.role === 'learner' && typeof turn.text === 'string' && turn.text.trim(),
  )
}

/** @returns {{words:number, sentences:number, uniqueWords:number, turns:number}} */
export function callStats(transcript) {
  const turns = learnerTurns(transcript)
  const unique = new Set()
  let total = 0
  let sentences = 0
  for (const turn of turns) {
    const list = words(turn.text)
    total += list.length
    sentences += sentencesIn(turn.text)
    for (const w of list) unique.add(w.toLowerCase())
  }
  return { words: total, sentences, uniqueWords: unique.size, turns: turns.length }
}

/** Секунды → «m:ss» (или «h:mm:ss», если звонок вдруг перевалил за час). */
export function formatDuration(sec) {
  const total = Number.isFinite(sec) ? Math.max(0, Math.trunc(sec)) : 0
  const s = total % 60
  const m = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}
