// Образец озвучки Скорочтения — ElevenLabs /with-timestamps (спека, часть B3, Д9).
//
// Образец создаётся один раз на пару «текст + голос» (бэкенд держит его в MinIO и выдаёт по sample-claim),
// поэтому здесь только синтез и разметка: mp3 и [слово, начало, конец] на КАЖДЫЙ пробельный кусок текста —
// ровно так режет текст телесуфлёр (rules.js srWords), и подсветка образца идёт по индексу слова, без поиска.
//
// Разметку берём из `alignment`, а не `normalized_alignment`: у нормализованной «512» уже «five hundred
// twelve», и с символами текста она не сходится. Сами символы `alignment` тоже местами расходятся с текстом
// (типографские кавычки, лишние пробелы), поэтому символы сопоставляются с подглядыванием вперёд, а не по
// номеру. Время слова — от первой до последней буквы или цифры: запятая и кавычка не сдвигают подсветку.

/**
 * Голоса образцов → id голосов ElevenLabs. Голос текста задаёт контент-менеджер (uk-female | uk-male), id
 * выбирает владелец на слух (этап 6.3 плана; образцы — scripts/speed-reading/voice-samples.js).
 */
export const SPEED_READING_VOICES = {
  'uk-female': 'Xb7hH8MSUJpSbSDYk0k2',
  'uk-male': 'JBFqnCBsd6RMkjVDRZzb',
}

export const DEFAULT_MODEL = 'eleven_multilingual_v2'

const clean = (v) => String(v || '').replace(/^﻿/, '').trim()

// env с Windows может прийти с BOM — как у остальных ключей веба.
export function elevenKey(env = process.env) {
  return clean(env.ELEVENLABS_API_KEY || env.ELEVEN_API_KEY)
}

/** Служебный ключ ручек образца на бэкенде; по умолчанию — IELTS_GRADER_KEY, как у GE_ACTIVITY_KEY. */
export function speedReadingKey(env = process.env) {
  return clean(env.SPEED_READING_KEY || env.IELTS_GRADER_KEY)
}

export function sampleModel(env = process.env) {
  return clean(env.SPEED_READING_MODEL) || DEFAULT_MODEL
}

export function voiceIdFor(voice) {
  return SPEED_READING_VOICES[voice] || SPEED_READING_VOICES['uk-female']
}

const canon = (c) => {
  if (/\s/.test(c)) return ' '
  if (c === '’' || c === '‘' || c === '`') return "'"
  if (c === '“' || c === '”' || c === '«' || c === '»') return '"'
  if (c === '–') return '—'
  return c
}
const SOUNDING = /[\p{L}\p{N}]/u
const ms = (x) => Math.round(Number(x) * 1000) / 1000
// Символ текста ищется в разметке не дальше LOOKAHEAD позиций: пропущенный пробел или лишний символ
// разметки не должен сбить сопоставление всего хвоста.
const LOOKAHEAD = 8

/**
 * Посимвольная разметка ElevenLabs → [слово, начало, конец] на каждый пробельный кусок текста.
 * @param {string} text
 * @param {{ characters: string[], character_start_times_seconds: number[], character_end_times_seconds: number[] } | null} alignment
 * @returns {[string, number, number][]}
 */
export function wordsFromAlignment(text, alignment) {
  const chars = alignment?.characters || []
  const starts = alignment?.character_start_times_seconds || []
  const ends = alignment?.character_end_times_seconds || []
  const src = String(text || '')
  const at = new Array(src.length).fill(-1)
  let j = 0
  for (let i = 0; i < src.length; i++) {
    const c = canon(src[i])
    if (c === ' ') continue
    for (let k = j; k < Math.min(chars.length, j + LOOKAHEAD); k++) {
      if (canon(chars[k]) === c) {
        at[i] = k
        j = k + 1
        break
      }
    }
  }
  const out = []
  let prevStart = 0
  let prevEnd = 0
  for (const m of src.matchAll(/\S+/g)) {
    const idx = []
    for (let i = m.index; i < m.index + m[0].length; i++) if (at[i] >= 0) idx.push(i)
    const sounding = idx.filter((i) => SOUNDING.test(src[i]))
    const use = sounding.length ? sounding : idx
    let start = prevEnd
    let end = prevEnd
    if (use.length) {
      start = Number(starts[at[use[0]]]) || 0
      end = Number(ends[at[use[use.length - 1]]]) || start
    }
    // Двоичный поиск подсветки (rules.js sampleIndexAt) требует неубывающих начал.
    start = Math.max(start, prevStart)
    end = Math.max(end, start)
    out.push([m[0], ms(start), ms(end)])
    prevStart = start
    prevEnd = end
  }
  return out
}

/** Темп образца, сл/мин: слова ко времени речи от начала первого слова до конца последнего. */
export function sampleWpm(words) {
  if (!Array.isArray(words) || !words.length) return 0
  const sec = words[words.length - 1][2] - words[0][1]
  return sec > 0 ? Math.round(words.length / (sec / 60)) : 0
}

/**
 * Синтез образца.
 * @returns {Promise<{ audio: Buffer, words: [string, number, number][], wpm: number }>}
 */
export async function synthSample({ text, voice, key, model = DEFAULT_MODEL, fetchImpl = fetch, signal }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceIdFor(voice))}/with-timestamps?output_format=mp3_44100_128`
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'xi-api-key': key },
    body: JSON.stringify({ text, model_id: model }),
    signal,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  if (!data?.audio_base64) throw new Error('ElevenLabs: в ответе нет audio_base64')
  const words = wordsFromAlignment(text, data.alignment)
  return { audio: Buffer.from(data.audio_base64, 'base64'), words, wpm: sampleWpm(words) }
}
