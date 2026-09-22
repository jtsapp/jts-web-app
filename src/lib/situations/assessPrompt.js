// Промпт грейдера устного ответа в «Ситуациях». Вынесен из route.js, чтобы
// язык вывода и уровневую мерку можно было покрыть детерминированным тестом.
//
// Две вещи, на которых такой промпт ломается, если их не задать жёстко:
//
// 1. Язык. Транскрипт и задание английские, поэтому мягкую просьбу «отвечай
//    по-русски» модель игнорирует и сползает в английский (ровно это ловили в
//    Shadowing, см. lib/shadowing/tipPrompt.js). Язык задаём и в system, и в
//    user-сообщении.
// 2. Мерка. Без уровня в промпте модель судит всех по одной планке, и ответ A1
//    «Hello, I am Aida. I am from Astana.» получает 45 за грамматику — при том
//    что это ровно то, что задание и просило. Уровень идёт в промпт отдельной
//    строкой с расшифровкой, чего на нём достаточно.

export const LANG_NAME = { ru: 'Russian', en: 'English', kk: 'Kazakh', kz: 'Kazakh' }

// Неизвестный код языка → русский (дефолт i18n). 'kz' и 'kk' оба ведут в
// казахский: в приложении язык называется 'kz', в LANG_NAME Shadowing — 'kk',
// и разойтись тут значит молча отдать студенту русский совет вместо казахского.
export function resolveLangName(lang) {
  return LANG_NAME[String(lang || '').toLowerCase()] || 'Russian'
}

// Что мы считаем достаточным на каждом уровне. Формулировки короткие
// намеренно: длинный «портрет уровня» модель начинает пересказывать в feedback
// вместо разбора ответа.
const LEVEL_BAR = {
  a1: 'A1 (beginner): a couple of short, simple sentences is a full answer. Present simple, basic word order. Do not penalise missing articles, simple vocabulary or a heavy accent.',
  a2: 'A2 (elementary): a few connected sentences, past and future allowed. Simple linkers (and, but, because). Do not expect complex clauses.',
  b1: 'B1 (intermediate): a connected mini-narrative with reasons. Expect because/so/however, some tense variety, and a clear outcome.',
  b2: 'B2 (upper-intermediate): a structured argument with concession and negotiation. Expect range of tenses, hedging, and precise vocabulary.',
  c1: 'C1 (advanced): nuanced, well-organised discourse. Expect idiomatic phrasing, tone control and complex structures used naturally.',
}

export function levelBar(level) {
  return LEVEL_BAR[String(level || '').toLowerCase()] || LEVEL_BAR.b1
}

// Схема для structured(). Произношение модель НЕ выставляет: его считает Azure
// по аудио, а судить произношение по транскрипту — гадание.
export const ASSESS_SCHEMA = {
  type: 'object',
  properties: {
    grammar: { type: 'number' },
    vocabulary: { type: 'number' },
    fluency: { type: 'number' },
    coherence: { type: 'number' },
    taskAchieved: { type: 'boolean' },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bad: { type: 'string' },
          good: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['bad', 'good'],
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['grammar', 'vocabulary', 'fluency', 'coherence', 'summary'],
}

/**
 * @param {{ level: string, task: string, transcript: string, seconds: number,
 *           lang: string, title?: string }} input
 * @returns {{ systemPrompt: string, userMessage: string }}
 */
export function buildAssessPrompt({ level, task, transcript, seconds, lang, title = '' }) {
  const langName = resolveLangName(lang)
  const wpm = seconds > 0 ? Math.round((transcript.split(/\s+/).filter(Boolean).length / seconds) * 60) : 0

  const systemPrompt = [
    'You are a supportive speaking examiner in an English learning app.',
    'You grade ONE spoken answer, transcribed automatically, against the task the student was given.',
    '',
    `Student level: ${levelBar(level)}`,
    '',
    'Scores are 0–100 and judged AGAINST THAT LEVEL, not against a native speaker:',
    'a fully successful A1 answer scores 85+, even though it is simple.',
    '',
    'grammar — accuracy of forms expected at this level.',
    'vocabulary — range and precision for this task at this level.',
    'fluency — flow and length; the transcript has no pauses, so judge from length and speaking rate.',
    'coherence — order, linking and whether the answer actually does the task.',
    '',
    'The transcript comes from speech recognition, so it has no punctuation and may',
    'mis-hear names and rare words. Never grade punctuation, capitalisation or spelling,',
    'and never build an error out of a word that was obviously mis-heard.',
    '',
    'errors: at most 4, each a real spoken-language mistake — bad (what was said),',
    'good (the fix), note (one short clause on why).',
    'recommendations: 2–4 concrete next steps, not praise.',
    'summary: two sentences — what worked, what to fix next.',
    '',
    `WRITE every note, recommendation and the summary in ${langName}.`,
    'English is allowed ONLY inside "bad" and "good" (they quote the answer itself).',
  ].join('\n')

  const userMessage = [
    title ? `Situation: ${title}` : '',
    `Task the student was given: ${task}`,
    '',
    `What the student said (transcript): "${transcript}"`,
    `Length: ${Math.round(seconds)} s, about ${wpm} words per minute.`,
    '',
    `Remember: notes, recommendations and summary in ${langName}.`,
  ]
    .filter(Boolean)
    .join('\n')

  return { systemPrompt, userMessage }
}
