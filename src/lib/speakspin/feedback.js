// Сборка ответа «SpeakSpin» по контракту прототипа v1 из сырого ответа
// грейдера и замера Azure. Чистые функции без сети — покрыты тестом отдельно
// от роута.
//
// Главное правило — цитаты. Клиент молча выбрасывает цитату, которой нет в
// транскрипте, а модель любит «чуть подправить» сказанное (поставить артикль,
// убрать «эээ»). Поэтому сверяем здесь же: цитата без учёта регистра и
// пробелов должна найтись в транскрипте, и в ответ уходит ИМЕННО кусок
// транскрипта (с его регистром), а не версия модели — тогда точная проверка
// на клиенте тоже проходит.

import { pronunciationBand } from './pronunciation.js'

export const SCHEMA_VERSION = '1.0'
export const RUBRIC_VERSION = 'jts-speaking-1'

// Меньше пяти слов — оценивать нечего: «yes», «I don't know». Грейдер на
// таком всё равно выставит баллы, и студент получит «разбор» пустоты.
export const MIN_WORDS = 5

export function countWords(text) {
  return String(text || '')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Точный кусок транскрипта под цитату модели или null. Регистр и пробелы не
// важны, остальное — да: перефраз цитатой не считается.
export function exactQuote(quote, transcript) {
  const words = String(quote || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return null
  const m = String(transcript || '').match(new RegExp(words.map(escapeRe).join('\\s+'), 'iu'))
  return m ? m[0] : null
}

const cap = (v, n) => String(v ?? '').trim().slice(0, n)

function evidenceOf(list, transcript, max = 2) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const q of list) {
    const quote = exactQuote(typeof q === 'string' ? q : q?.quote, transcript)
    if (quote && !out.some((e) => e.quote === quote)) out.push({ quote })
    if (out.length >= max) break
  }
  return out
}

function scoreOf(v) {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return null
  return Math.min(5, Math.max(1, n))
}

function criterionOf(raw, transcript, { nullScore = false } = {}) {
  return {
    score: nullScore ? null : scoreOf(raw?.score),
    explanation: cap(raw?.explanation, 600),
    evidence: evidenceOf(raw?.evidence, transcript),
  }
}

function fixesOf(list, transcript, max) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const f of list) {
    const quote = exactQuote(f?.quote, transcript)
    const better = cap(f?.better, 300)
    if (!quote || !better) continue
    out.push({ quote, better, why: cap(f?.why, 300) })
    if (out.length >= max) break
  }
  return out
}

// Тексты, которые роут пишет сам, без модели: язык — тот же, что у разбора.
const TEXT = {
  ru: {
    notAssessed: 'Произношение не оценено: анализ аудио сейчас недоступен.',
    pron: (s) => `Оценка по аудио: точность ${s.accuracy}, беглость ${s.fluency}, интонация ${s.prosody}, полнота ${s.completeness} из 100.`,
    weakest: { accuracy: 'Больше всего внимания — чёткости звуков.', fluency: 'Больше всего внимания — плавности речи.', prosody: 'Больше всего внимания — интонации и ударениям.' },
    noSpeech: 'Не удалось расслышать речь. Попытка не списана — попробуйте ещё раз ближе к микрофону.',
    tooFew: 'Ответ слишком короткий для разбора. Попытка не списана — скажите хотя бы пару предложений.',
  },
  en: {
    notAssessed: 'Pronunciation was not assessed: audio analysis is unavailable right now.',
    pron: (s) => `Audio scores: accuracy ${s.accuracy}, fluency ${s.fluency}, intonation ${s.prosody}, completeness ${s.completeness} out of 100.`,
    weakest: { accuracy: 'Focus most on clear sounds.', fluency: 'Focus most on smooth, connected speech.', prosody: 'Focus most on intonation and stress.' },
    noSpeech: 'We could not hear any speech. This attempt was not counted — try again closer to the microphone.',
    tooFew: 'The answer is too short to assess. This attempt was not counted — say at least a couple of sentences.',
  },
  kk: {
    notAssessed: 'Айтылым бағаланбады: аудионы талдау қазір қолжетімсіз.',
    pron: (s) => `Аудио бойынша баға: дәлдік ${s.accuracy}, еркіндік ${s.fluency}, интонация ${s.prosody}, толықтық ${s.completeness} (100-ден).`,
    weakest: { accuracy: 'Дыбыстарды анық айтуға көбірек көңіл бөліңіз.', fluency: 'Сөйлеудің бірқалыптылығына көбірек көңіл бөліңіз.', prosody: 'Интонация мен екпінге көбірек көңіл бөліңіз.' },
    noSpeech: 'Сөйлеу естілмеді. Әрекет есептелмеді — микрофонға жақынырақ қайталап көріңіз.',
    tooFew: 'Жауап талдау үшін тым қысқа. Әрекет есептелмеді — кемінде бір-екі сөйлем айтыңыз.',
  },
}

export function textFor(lang) {
  return TEXT[lang] || TEXT.ru
}

// Произношение — только из Azure. Пояснение собираем сами из под-оценок:
// отдельный вызов модели ради одной фразы не окупается, а ждать Azure перед
// грейдером значит потерять параллельность звеньев.
export function pronunciationCriterion(pron, lang) {
  const t = textFor(lang)
  const band = pron ? pronunciationBand(pron.overall) : null
  if (band == null) return { score: null, explanation: t.notAssessed, evidence: [] }
  const s = {
    accuracy: Math.round(Number(pron.accuracy) || 0),
    fluency: Math.round(Number(pron.fluency) || 0),
    prosody: Math.round(Number(pron.prosody) || 0),
    completeness: Math.round(Number(pron.completeness) || 0),
  }
  const weakest = ['accuracy', 'fluency', 'prosody'].reduce((a, b) => (s[b] < s[a] ? b : a))
  const tail = band < 5 ? ` ${t.weakest[weakest]}` : ''
  return { score: band, explanation: t.pron(s) + tail, evidence: [] }
}

function emptyCriterion() {
  return { score: null, explanation: '', evidence: [] }
}

/**
 * Полный ответ контракта v1 для разобранной попытки.
 * @param {{ attemptId: string, transcript: string, graded: object, pron: object|null,
 *           lang: string, recordingDurationMs: number, budget: object|null,
 *           engines: object }} input
 */
export function composeAssessed({ attemptId, transcript, graded, pron, lang, recordingDurationMs, budget, engines }) {
  const audio = pronunciationBand(pron?.overall) != null
  const c = graded?.criteria || {}
  const strengths = (Array.isArray(graded?.strengths) ? graded.strengths : [])
    .map((s) => {
      const text = cap(s?.text, 400)
      if (!text) return null
      const evidence = evidenceOf(s?.evidence, transcript)
      return evidence.length ? { text, evidence } : { text }
    })
    .filter(Boolean)
    .slice(0, 2)

  return {
    schemaVersion: SCHEMA_VERSION,
    attemptId,
    rubricVersion: RUBRIC_VERSION,
    status: 'assessed',
    analysisScope: audio ? 'audio' : 'transcript_only',
    transcript: { text: transcript },
    summary: cap(graded?.summary, 800),
    criteria: {
      taskResponse: criterionOf(c.taskResponse, transcript),
      // Без аудио беглость не измерена: текст показывает связность, но не
      // паузы и темп. Балл снимаем, пояснение (про организацию) оставляем.
      fluencyCoherence: criterionOf(c.fluencyCoherence, transcript, { nullScore: !audio }),
      grammar: criterionOf(c.grammar, transcript),
      vocabulary: criterionOf(c.vocabulary, transcript),
      pronunciation: pronunciationCriterion(audio ? pron : null, lang),
    },
    strengths,
    priorityFixes: fixesOf(graded?.priorityFixes, transcript, 3),
    vocabularyUpgrades: fixesOf(graded?.vocabularyUpgrades, transcript, 2),
    improvedAnswer: cap(graded?.improvedAnswer, 1500),
    nextAttemptFocus: cap(graded?.nextAttemptFocus, 300),
    metrics: metricsOf(transcript, recordingDurationMs),
    // Экран прототипа печатает limitations и reasons как ТЕКСТ. Про разбор
    // без аудио он и так говорит своей строкой (textOnly по analysisScope),
    // а коды вроде pronunciation_not_assessed студент увидел бы буквально.
    limitations: [],
    reasons: [],
    budget,
    engines,
  }
}

// Длительность речи у нас не измерена (выравнивания по словам нет), поэтому
// speechDurationMs и темп — null, а не выдумка из длины файла.
function metricsOf(transcript, recordingDurationMs) {
  return {
    recordingDurationMs,
    speechDurationMs: null,
    wordCount: countWords(transcript),
    wordsPerMinute: null,
  }
}

/** Ответ без разбора: речи нет или её слишком мало. Попытка не списана. */
export function composeInsufficient({ attemptId, transcript, reason, lang, recordingDurationMs, budget, engines }) {
  const t = textFor(lang)
  return {
    schemaVersion: SCHEMA_VERSION,
    attemptId,
    rubricVersion: RUBRIC_VERSION,
    status: 'insufficient_audio',
    analysisScope: 'transcript_only',
    transcript: { text: transcript },
    summary: reason === 'no_speech' ? t.noSpeech : t.tooFew,
    criteria: {
      taskResponse: emptyCriterion(),
      fluencyCoherence: emptyCriterion(),
      grammar: emptyCriterion(),
      vocabulary: emptyCriterion(),
      pronunciation: emptyCriterion(),
    },
    strengths: [],
    priorityFixes: [],
    vocabularyUpgrades: [],
    improvedAnswer: '',
    nextAttemptFocus: '',
    metrics: metricsOf(transcript, recordingDurationMs),
    limitations: [],
    // Пусто намеренно: под заголовком экран покажет свою строку noSpeech, а
    // код причины (no_speech/too_few_words) студенту читать незачем — он в логе.
    reasons: [],
    budget,
    engines,
  }
}
