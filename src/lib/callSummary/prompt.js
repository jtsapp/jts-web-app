// Сборка промпта и разбор ответа для выжимки звонка — чистый модуль: ни БД, ни
// сети, ни env. Всё, что можно проверить тестом, живёт здесь; IO — в index.js.
// (Тот же приём, что с src/lib/shadowing/tipPrompt.js.)

// ~10k токенов. Типовой 20-минутный звонок — 15–25k символов, влезает целиком.
// На cleanTranscript как на границу ссылаться нельзя: его потолок 500 реплик ×
// 2000 символов = миллион символов ≈ 250k токенов, это больше окна Haiku.
export const TRANSCRIPT_BUDGET = 40000

// Короче — суммаризовать нечего, LLM не зовём вовсе («алло?» — «привет» — сброс).
export const MIN_TURNS = 6

// Режимы, из которых можно тащить факты в долгую память. В сценарии и дебатах
// ученик говорит от лица персонажа («I work for an oil company»), и такая
// реплика, принятая за биографию, поселится в SESSION MEMORY навсегда:
// delete from fact_log в коде не существует.
export const FACT_MODES = new Set(['free', 'placement'])

// Своя карта языков. resolveLangName из shadowing/tipPrompt.js переиспользовать
// НЕЛЬЗЯ: он собран под коды приложения (ru|en|kk) и на 'kz' зоны тьютора
// возвращает Russian — это зафиксировано тестом tests/shadowing-tip-prompt.spec.js.
const LANG_NAMES = { ru: 'Russian', kz: 'Kazakh', en: 'English' }

export function resolveSummaryLang(code) {
  const key = typeof code === 'string' ? code.trim().toLowerCase() : ''
  return LANG_NAMES[key] || LANG_NAMES.ru
}

function trim(value, max) {
  if (typeof value !== 'string') return null
  const t = value.trim().replace(/\s+/g, ' ')
  if (!t) return null
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}

function strList(value, { cap, max }) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value) {
    const t = trim(item, max)
    if (t) out.push(t)
    if (out.length >= cap) break
  }
  return out
}

function objList(value, { cap, fields, required }) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = {}
    for (const [key, max] of Object.entries(fields)) row[key] = trim(item[key], max)
    if (required.some((key) => !row[key])) continue
    out.push(row)
    if (out.length >= cap) break
  }
  return out
}

// Разметка ролями — не украшение: правило «новые слова только из реплик
// тьютора» держится именно на ней. Реплики тьютора — собственный текст модели,
// ушедший в TTS; реплики ученика — сырой STT со слипами.
function formatTurn(turn) {
  return `${turn.role === 'tutor' ? 'TUTOR' : 'LEARNER'}: ${turn.text}`
}

/**
 * Транскрипт под бюджет: если не влезает — выкидываем СЕРЕДИНУ, оставляя начало
 * и конец. Начало нужно потому, что личное всплывает в первых репликах; конец —
 * потому что там подводят итог.
 * @returns {{text: string, omitted: number}}
 */
export function budgetTranscript(transcript, budget = TRANSCRIPT_BUDGET) {
  const turns = (Array.isArray(transcript) ? transcript : []).filter(
    (t) => t && typeof t.text === 'string' && t.text.trim(),
  )
  const lines = turns.map(formatTurn)
  const total = lines.reduce((sum, l) => sum + l.length + 1, 0)
  if (total <= budget) return { text: lines.join('\n'), omitted: 0 }

  const half = Math.floor(budget / 2)
  const head = []
  let headLen = 0
  for (const l of lines) {
    if (headLen + l.length + 1 > half) break
    head.push(l)
    headLen += l.length + 1
  }
  const tail = []
  let tailLen = 0
  for (let i = lines.length - 1; i >= head.length; i -= 1) {
    if (tailLen + lines[i].length + 1 > half) break
    tail.unshift(lines[i])
    tailLen += lines[i].length + 1
  }
  const omitted = lines.length - head.length - tail.length
  return {
    text: [...head, `[… omitted ${omitted} turns …]`, ...tail].join('\n'),
    omitted,
  }
}

export function buildSummarySchema(wantFacts) {
  const properties = {
    recap: { type: 'STRING' },
    topics: { type: 'ARRAY', items: { type: 'STRING' } },
    wins: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, quote: { type: 'STRING' } },
        required: ['title', 'quote'],
      },
    },
    mistakes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          quote: { type: 'STRING' },
          fix: { type: 'STRING' },
        },
        required: ['title', 'quote', 'fix'],
      },
    },
    newWords: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          term: { type: 'STRING' },
          translation: { type: 'STRING' },
          example: { type: 'STRING' },
        },
        required: ['term', 'translation', 'example'],
      },
    },
    focus: { type: 'STRING' },
  }
  // Факты не просто «не просим» текстом, а вырезаем из схемы: инструкцию модель
  // может проигнорировать, отсутствующее поле — нет.
  if (wantFacts) properties.facts = { type: 'ARRAY', items: { type: 'STRING' } }
  return { type: 'OBJECT', properties, required: ['recap'] }
}

/**
 * @param {{transcript: {role:string,text:string}[], lang?: string, mode?: string,
 *          level?: string, knownFacts?: string[], knownTopics?: string[]}} call
 * @returns {{systemPrompt: string, userMessage: string, schema: object, omitted: number}}
 */
export function buildSummaryPrompt(call) {
  const uiLang = resolveSummaryLang(call.lang)
  const mode = typeof call.mode === 'string' ? call.mode : 'free'
  const wantFacts = FACT_MODES.has(mode)
  const level = trim(call.level, 8) || 'A2'
  const { text, omitted } = budgetTranscript(call.transcript)
  const knownFacts = strList(call.knownFacts, { cap: 50, max: 240 })
  const knownTopics = strList(call.knownTopics, { cap: 50, max: 120 })

  const systemPrompt = [
    'You are an assistant that turns a finished English-lesson conversation into a short report for the learner and into memory notes for their tutor.',
    '',
    'The TRANSCRIPT is labelled by speaker. TUTOR lines are the tutor’s own generated text — clean and reliable. LEARNER lines came out of speech-to-text on live audio and CONTAIN RECOGNITION ERRORS: merged words, wrong homophones, missing punctuation, dropped articles.',
    '',
    'Hard rules:',
    '- Never invent anything that is not in the transcript.',
    '- Judge the LANGUAGE, not the recognition quality. If something reads like a speech-to-text slip rather than a real learner error, skip it silently. Never flag punctuation or capitalisation.',
    `- The learner is at CEFR level ${level}. Calibrate to that level.`,
    '',
    'Fields:',
    `- recap: 1–2 sentences in ${uiLang}, what the conversation was about. Warm, addressed to the learner.`,
    '- topics: up to 5 short topic labels, IN ENGLISH, noun phrases ("travel plans", "job interview").',
    `- wins: up to 3 genuinely good moments. title = short skill name in ${uiLang} ("Uses new vocabulary"). quote = the learner's own words, copied verbatim from a LEARNER line. Skip a win rather than pad the list.`,
    `- mistakes: up to 3 real language problems. title = short label in ${uiLang}. quote = the learner's words, verbatim from a LEARNER line. fix = the corrected version, in English, one line. If the transcript is too noisy to be sure, return fewer or none — an invented mistake is worse than an empty list.`,
    `- newWords: up to 8 words or expressions THE TUTOR USED that are likely new for a ${level} learner. Take them ONLY from lines labelled TUTOR — never from LEARNER lines, because learner lines are speech-to-text output and a misrecognised word is not a real word. term = the word or expression in English, base form. translation = its meaning in ${uiLang}. example = the tutor's own sentence containing it, copied verbatim from that TUTOR line. Skip words the learner clearly already uses.`,
    `- focus: one short sentence in ${uiLang} — what to work on next.`,
    ...(wantFacts
      ? [
          '- facts: up to 5 NEW durable facts about the learner (job, family, plans, preferences), IN ENGLISH, third person, in the same style as the KNOWN FACTS list ("works as a nurse", "planning a trip to London"). Only what the learner said about their real life — nothing already in KNOWN FACTS, nothing temporary ("is tired today").',
        ]
      : []),
    '',
    'Return every field. Empty arrays are fine and expected.',
  ].join('\n')

  const parts = []
  if (knownFacts.length)
    parts.push(`KNOWN FACTS (do not repeat these):\n${knownFacts.map((f) => `- ${f}`).join('\n')}`)
  if (knownTopics.length)
    parts.push(`RECENT TOPICS (prefer new ones):\n${knownTopics.map((t) => `- ${t}`).join('\n')}`)
  parts.push(`MODE: ${mode}`)
  parts.push(`TRANSCRIPT:\n${text}`)

  return {
    systemPrompt,
    userMessage: parts.join('\n\n'),
    schema: buildSummarySchema(wantFacts),
    omitted,
  }
}

/**
 * Обрезка и чистка ответа модели. Лимиты проверяем сами: toJsonSchema
 * (anthropic.js) копирует из схемы только type/enum/description/properties/
 * required/items — maxLength, maxItems и minItems молча теряются.
 */
export function validateSummary(raw, options = {}) {
  const data = raw && typeof raw === 'object' ? raw : {}
  const wantFacts = FACT_MODES.has(options.mode)
  return {
    recap: trim(data.recap, 240),
    topics: strList(data.topics, { cap: 5, max: 120 }),
    facts: wantFacts ? strList(data.facts, { cap: 5, max: 240 }) : [],
    wins: objList(data.wins, {
      cap: 3,
      fields: { title: 80, quote: 200 },
      required: ['title', 'quote'],
    }),
    mistakes: objList(data.mistakes, {
      cap: 3,
      fields: { title: 80, quote: 200, fix: 160 },
      required: ['title', 'quote', 'fix'],
    }),
    // example необязателен: слово полезно и без цитаты, а выкинуть его целиком
    // из-за отсутствующей фразы — потерять материал.
    newWords: objList(data.newWords, {
      cap: 8,
      fields: { term: 60, translation: 80, example: 200 },
      required: ['term', 'translation'],
    }),
    focus: trim(data.focus, 160),
  }
}

/** Пустая выжимка = модель вернула мусор; вызывающий поставит 'failed'. */
export function isEmptySummary(s) {
  return (
    !s.recap &&
    !s.focus &&
    s.topics.length === 0 &&
    s.facts.length === 0 &&
    s.wins.length === 0 &&
    s.mistakes.length === 0 &&
    s.newWords.length === 0
  )
}
