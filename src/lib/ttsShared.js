// Общие для сервера и браузера правила озвучки через Soniox: роут /api/tts и
// клиентский src/lib/speech.js обязаны приводить текст и параметры к одному
// виду. На этом держатся оба кэша — HTTP-кэш браузера и дисковый на сервере:
// «Apple» с лишним пробелом или темп 0.96 вместо 0.95 — это уже другой адрес и
// новый платный синтез того же самого звука.

export const TTS_MAX_TEXT = 1000

// Диапазон провайдера (GET /v1/tts-models → speed_min / speed_max).
export const TTS_SPEED_MIN = 0.7
export const TTS_SPEED_MAX = 1.3

// Голоса — из каталога Soniox (GET https://api.soniox.com/v1/tts-models).
// Каждый голос говорит на всех языках модели, включая ru и kk, поэтому выбор
// тут про тембр и акцент, а не про язык.
export const VOICE = {
  // Американский, спокойный «голос уроков» — дефолт для одиночных слов и фраз.
  us: 'Grace',
  // Британский нейтральный и разборчивый — там, где прототип просил en-GB.
  gb: 'Freya',
  // Второй диктор британских диалогов (воркбук, чтение): мужской, без спешки.
  gbMale: 'Oliver',
  // Им озвучены записи курса «Обучения» (scripts/make-lesson-audio.js).
  // Слово без записи должно звучать тем же голосом, что и слово с записью.
  course: 'Owen',
}

// Состав Сказок (src/practice/fairytale/engine.js кастует персонажей из этих
// списков). Движок сказок — самостоятельный скрипт без импортов, поэтому имена
// там продублированы строками; здесь они нужны только для белого списка роута.
export const TALE_VOICES = [
  'Alistair',
  'Poppy', 'Isla', 'Piper', 'Nora',
  'Cordelia', 'Victoria', 'Juliet',
  'Freya', 'Iris', 'Colleen', 'Grace', 'Imogen',
  'Freddie', 'Mateo', 'Nigel',
  'Arthur', 'Sebastian', 'Wesley', 'Daniel',
  'Oliver', 'Adrian', 'Elliot', 'Owen',
]

// Белый список: на имя не из него роут отвечает 400. Опечатка в имени голоса
// должна падать сразу, а не молча синтезироваться дефолтным голосом.
export const TTS_VOICES = new Set([...Object.values(VOICE), ...TALE_VOICES])

// Язык приложения → код Soniox. «kz» — так казахский называется в интерфейсе.
const LANGS = { en: 'en', ru: 'ru', kk: 'kk', kz: 'kk' }

/**
 * Привести запрос к каноническому виду или вернуть null, если озвучивать нечего.
 * Темп округляется до 0.05: на слух разницы нет, а кэш не дробится на
 * 0.93/0.94/0.95 одного и того же слова.
 */
export function normalizeTts({ text, voice, lang, speed } = {}) {
  const t = String(text == null ? '' : text)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TTS_MAX_TEXT)
  if (!t) return null
  const v = TTS_VOICES.has(voice) ? voice : VOICE.us
  const l = LANGS[String(lang || 'en').toLowerCase()] || 'en'
  let s = Number(speed)
  if (!Number.isFinite(s)) s = 1
  s = Math.min(TTS_SPEED_MAX, Math.max(TTS_SPEED_MIN, s))
  s = Math.round(s * 20) / 20
  return { text: t, voice: v, lang: l, speed: s }
}

/** Адрес записи. Порядок параметров постоянный — это ключ HTTP-кэша. */
export function ttsUrl(opts) {
  const n = normalizeTts(opts)
  if (!n) return null
  return `/api/tts?v=${n.voice}&l=${n.lang}&s=${n.speed}&t=${encodeURIComponent(n.text)}`
}
