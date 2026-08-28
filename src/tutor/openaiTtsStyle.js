// Подача голоса у OpenAI TTS: характер персоны + живость + произношение.
//
// Отдельный модуль, потому что этот текст нужен ДВУМ местам сразу — живому
// превью (src/app/api/tutor-tts/route.js) и офлайн-генератору визиток
// (scripts/make-tutor-voice-samples.js). Разъехавшись, они дали бы ученику одну
// интонацию на кнопке «послушать» и другую в разговоре.
//
// Третья копия — питоновская, в agent/agent.py (OPENAI_TTS_PERSONA_STYLE /
// OPENAI_TTS_LIVENESS / OPENAI_TTS_PRONUNCIATION / OPENAI_TTS_SPEED). Её
// приходится держать руками: агент — отдельный процесс на Python, импортировать
// отсюда он не может. Правишь тут — правь и там.
//
// Почему вообще текстом: у OpenAI TTS нет ни stability, ни style, ни
// similarity_boost как у ElevenLabs. Голосов-пресетов десять, и ЕДИНСТВЕННАЯ
// ручка тембра — поле instructions. Плюс отдельный параметр speed.

// Характер — по ключу С УЧЁТОМ НРАВА (jarvis / jarvis-harsh). Голос при этом
// один на оба: 18+ меняет подачу, а не тембр.
//
// «Кто говорит» важнее любых слов о характере: пока в спокойной подаче стояло
// "English butler", модель тянула казахский к английской фонетике — диктор с
// британским ртом читал қазақша. Родной казахский голос описан прямым текстом.
export const OPENAI_PERSONA_STYLE = {
  jarvis:
    'You are a native Kazakh speaker from Almaty. Kazakh is your mother tongue, not a language ' +
    'you learned: nothing in your mouth is foreign to it. Calm, warm, unhurried but never slow. ' +
    'You are on the phone with someone you know and respect — friendly, low-key, quietly amused. ' +
    'Talk the way a person talks, not the way a newsreader reads. No English accent, no Russian ' +
    'accent, no theatricality, no servility.',
  'jarvis-harsh':
    'You are the same English butler, but the mask is off and you are done pretending. The ' +
    'courtesy is still there and that is what makes it cut: every polite phrase is loaded. ' +
    'Clipped, cold, openly irritated. Bite down on the sharp words, let contempt sit in the ' +
    'pauses, snap at the end of sentences. Raise your voice when you are fed up — but stay ' +
    'precise, this is a butler losing patience, not a drunk shouting.',
}

// Против роботизированности. Главная причина «неживого» звука — ровный темп и
// одинаково падающая интонация в каждой фразе: модель по умолчанию ЧИТАЕТ, а не
// говорит. Просить «будь эмоциональнее» бесполезно, это читается как
// театральность — тот же урок уже получен на Луне (TUNING.luna.prompt в
// scripts/make-tutor-voice-samples.js). Работают конкретные механики речи.
export const OPENAI_LIVENESS =
  'DELIVERY: sound like a person talking, not a narrator reading. Vary pitch and pace inside ' +
  'the sentence — hurry through the unimportant parts, slow down and lean on the words that ' +
  'carry the meaning. Do not end every sentence on the same falling note. Leave real ' +
  'micro-pauses where a person would think, and take an audible breath before the longer ones. ' +
  'Let small reactions colour the first word of a reply. Never sing-song, never drawn-out ' +
  'vowels, never breathy.'

// Произношение — по языку. Казахский блок работает на себя (KZ-стенд говорит
// по-казахски всегда) и готов для Спарка, если тот поедет на OpenAI. Модель
// казахский официально не знает и по умолчанию читает его как русский, поэтому
// мало назвать буквы в IPA: перечислены ещё и признаки русского акцента —
// редукция гласных, смягчение перед е/і, силовое ударение.
export const OPENAI_PRONUNCIATION = {
  kz:
    'PRONUNCIATION: the text is KAZAKH (qazaq tili), not Russian. Use Kazakh phonology: ә as an ' +
    'open front [æ], ө as [ø], ү as [y], ұ as [ʊ], і as a short [ɪ], қ as a deep uvular [q], ғ ' +
    'as [ʁ], ң as [ŋ], һ as [h]. Do NOT read it with a Russian accent: vowels are never ' +
    'reduced — an unstressed о stays [o] and an unstressed а stays [ɑ]; consonants are never ' +
    'palatalised before е and і; и is the diphthong [ɪj] and у is [ʊw], not the plain Russian ' +
    'vowels; word-initial е is [je]. Respect Kazakh vowel harmony — back words stay back, front ' +
    'words stay front. Word stress falls on the LAST syllable, and the phrase flows evenly ' +
    'instead of hammering the strong stress peaks of Russian. English words inside a Kazakh ' +
    'sentence keep their English pronunciation — do not read them letter by letter.',
  ru:
    'PRONUNCIATION: the text is RUSSIAN. Native Russian phonology, no English accent, no hard ' +
    'American r. Unstressed о reduces to [ɐ]. «сэр» is [sɛr], a Russian word, not the English ' +
    "'sir'. English terms inside a Russian sentence keep their English pronunciation.",
  en: '',
}

// Темп — отдельный параметр API (0.25–4.0), а не просьба внутри instructions:
// параметр честнее, текстовую просьбу «говори быстрее» модель то слышит, то нет.
// Спокойный чуть медленнее единицы: на казахском қ, ғ, ң и долгие гласные на
// 1.0 смазываются в русское «кх/г/н». Зеркало OPENAI_TTS_SPEED в agent.py.
export const OPENAI_SPEED = { jarvis: 0.97, 'jarvis-harsh': 1.08 }
export const DEFAULT_OPENAI_SPEED = 1.0

// "kk" (ISO языка) и "kz" (код языка приложения) — один и тот же казахский.
// Генератор визиток ходит сюда с ISO, роут превью — с кодом приложения.
const LANG_ALIAS = { kk: 'kz' }

/**
 * Инструкция диктору для одной озвучки.
 *
 * OPENAI_TTS_INSTRUCTIONS_<КЛЮЧ> заменяет ВСЮ сборку целиком, а не дописывает
 * слой: переменная нужна, чтобы перебирать формулировки на живом стенде, и
 * склейка с непонятно чем этому мешает. Дефис в ключе → подчёркивание
 * (jarvis-harsh → OPENAI_TTS_INSTRUCTIONS_JARVIS_HARSH).
 */
export function openaiInstructions(key, lang) {
  const envName = `OPENAI_TTS_INSTRUCTIONS_${String(key || '').toUpperCase().replace(/-/g, '_')}`
  const env = process.env[envName]
  if (env) return env
  const l = LANG_ALIAS[lang] || lang
  return [OPENAI_PERSONA_STYLE[key] || '', OPENAI_LIVENESS, OPENAI_PRONUNCIATION[l] || '']
    .filter(Boolean)
    .join('\n')
}

export function openaiSpeed(key) {
  return OPENAI_SPEED[key] ?? DEFAULT_OPENAI_SPEED
}

// ── Что уходит в синтез вместо того, что видит ученик ───────────────────────
// Зеркало normalize_for_speech в agent.py, но НЕ полное, и это осознанно.
//
// Здесь только два детерминированных шага: снять разметку и развернуть цифры
// словами. Словарь отдельных слов (data/pronunciation-kk.tsv) остаётся на
// стороне агента: его ведёт человек, дописывая строки по мере того, как слышит
// ошибки, а копия в JS гарантированно отстала бы от него на следующей же
// правке. Превью и визитки — короткие фиксированные фразы, слов из словаря в
// них нет; если появятся, честнее будет читать сам файл, чем держать копию.
const SPEECH_MARKUP_RE = /[*_`#]+/g

// Казахские числительные. Цифра посреди казахской фразы читается на языке,
// который провайдер угадал сам, — «20» звучит по-русски или по-английски.
const KK_ONES = ['', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз']
const KK_TENS = ['', 'он', 'жиырма', 'отыз', 'қырық', 'елу', 'алпыс', 'жетпіс', 'сексен', 'тоқсан']

export function numberToKazakh(n) {
  if (n === 0) return 'нөл'
  if (n < 0) return `минус ${numberToKazakh(-n)}`
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000)
    const rest = n % 1000
    // «мың», а не «бір мың»: единица перед «мың» в казахском не ставится.
    const head = thousands === 1 ? 'мың' : `${numberToKazakh(thousands)} мың`
    return rest === 0 ? head : `${head} ${numberToKazakh(rest)}`
  }
  const parts = []
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  if (hundreds) parts.push(hundreds === 1 ? 'жүз' : `${KK_ONES[hundreds]} жүз`)
  const tens = Math.floor(rest / 10)
  const ones = rest % 10
  if (tens) parts.push(KK_TENS[tens])
  if (ones) parts.push(KK_ONES[ones])
  return parts.join(' ')
}

const NUMBER_TO_WORDS = { kz: numberToKazakh }
const LETTER_RE = /\p{L}/u

export function normalizeForSpeech(text, lang) {
  if (!text) return text
  let out = text.replace(SPEECH_MARKUP_RE, '')
  const toWords = NUMBER_TO_WORDS[LANG_ALIAS[lang] || lang]
  if (toWords) {
    out = out.replace(/\d+/g, (m, at, src) => {
      let words = toWords(Number(m))
      // Пробел, если цифра приклеена к букве: «A1» иначе становится «Aбір»
      // одним словом. Перед точкой и запятой пробел не ставим — там своя пауза.
      if (at > 0 && LETTER_RE.test(src[at - 1])) words = ` ${words}`
      const after = src[at + m.length]
      if (after && LETTER_RE.test(after)) words = `${words} `
      return words
    })
  }
  return out
}
