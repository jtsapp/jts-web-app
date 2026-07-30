// Промпт короткого совета тренера Shadowing. Вынесен из route.js, чтобы язык
// вывода можно было покрыть детерминированным тестом.
//
// Модель (haiku) склонна «сползать» в английский: эталонная фраза и разбираемые
// слова — английские, поэтому слабую инструкцию «дай совет на русском» она
// игнорирует. Поэтому язык задаём жёстко и дублируем в user-сообщении: весь
// текст совета — на языке интерфейса, по-английски допустимы только сами
// отрабатываемые слова.

export const LANG_NAME = { ru: 'Russian', en: 'English', kk: 'Kazakh' }

// Неизвестный код языка → русский (совпадает с дефолтом i18n).
export function resolveLangName(lang) {
  return LANG_NAME[lang] || 'Russian'
}

// Слабые/ошибочные слова из послово-карты Azure (до 6 штук) — то, на что
// наводить совет.
function weakWords(score) {
  return (score.words || [])
    .filter((w) => w.error !== 'None' || w.accuracy < 70)
    .map((w) => w.word)
    .slice(0, 6)
}

// Возвращает { systemPrompt, userMessage } для structured().
export function buildTipPrompt(score, refText, lang) {
  const langName = resolveLangName(lang)
  const weak = weakWords(score)
  const systemPrompt =
    `You are a warm, concrete English-pronunciation coach. Give exactly ONE short, ` +
    `encouraging tip (max 2 sentences). Target the single biggest issue: ` +
    `prosody/intonation or the specific weak words. No preamble, no numbers, no scores.\n` +
    `Write the ENTIRE tip in ${langName} — this is required. The practice phrase and the ` +
    `drilled words are English, but every word of your explanation and encouragement must ` +
    `be in ${langName}; only the specific English words being practiced may appear in English.`
  const userMessage =
    `Reference phrase: "${refText}"\n` +
    `Scores (0-100): accuracy ${score.accuracy}, fluency ${score.fluency}, ` +
    `prosody ${score.prosody}, overall ${score.overall}.\n` +
    `Weak or incorrect words: ${weak.join(', ') || 'none'}.\n` +
    `Answer in ${langName}.`
  return { systemPrompt, userMessage }
}
