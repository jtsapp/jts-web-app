// Язык фразы для голоса Луны — один и в браузере (voiceQueue.js), и на сервере
// озвучки (/api/assistant/speak): разойдись они, клиент просил бы её голос, а
// сервер читал бы фразу казахским синтезом. Модуль чистый: серверу нельзя тянуть
// voiceQueue, а с ним и общий <audio> из speech.js.

const KK_LETTERS = /[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/
const CYRILLIC = /[а-яёәғқңөұүһі]/i
const CYRILLIC_WORDS = /[а-яёәғқңөұүһі]+/gi
// Казахская фраза — когда казахские буквы хотя бы в четверти слов. Одной буквы
// мало: первая реплика Луны начинается с имени ученика («Айгерім, вы на
// Главной…»), и русский ответ целиком уходил бы в казахский синтез — не её
// голосом. В казахской фразе таких слов обычно больше половины.
const KK_WORD_SHARE = 0.25

/** Казахские буквы в заметной доле слов — kk, кириллица — ru, иначе en. */
export function phraseLang(text) {
  const t = String(text || '')
  if (!CYRILLIC.test(t)) return 'en'
  const words = t.match(CYRILLIC_WORDS) || []
  const kk = words.filter((w) => KK_LETTERS.test(w)).length
  return kk / words.length >= KK_WORD_SHARE ? 'kk' : 'ru'
}
