// Коды контракта Birge (спека 2026-11-11 §5.3) и ключи их подписей. API отдаёт темы и причины только кодами —
// подписи на трёх языках держит веб (src/i18n.jsx, lang-en.js, lang-kk.js), а web-admin — свои.

export const TOPICS = ['GRAMMAR', 'SPEAKING', 'VOCABULARY', 'MOTIVATION', 'QUESTION']

// Тема новой ветки по умолчанию — «Вопрос», как в прототипе.
export const DEFAULT_TOPIC = 'QUESTION'

export const REASON_CODES = [
  'PROFANITY',
  'IMAGE_UNSAFE',
  'INSULT',
  'HARASSMENT',
  'PLATFORM_COMPLAINT',
  'TOXICITY',
  'MASKED_SUSPECT',
  'LINK_OR_CONTACT',
  'SPAM',
  'SOFT_CRITICISM',
  'CAPS',
  'AI_UNAVAILABLE',
  'REPORTS',
]

// Вкладки панели смайликов — id для ключей подписей; имена вкладок прототипа и их наборы — в emoji.js.
export const EMOJI_CATEGORY_IDS = ['recent', 'emotions', 'hearts', 'gestures', 'study', 'nature', 'food', 'hobby', 'flags']

export const topicKey = (topic) => (TOPICS.includes(topic) ? `birge.topic.${topic}` : null)

// Новый код причины на бэкенде не должен показать ученику голый ключ — общая подпись «нарушение правил».
export const reasonKey = (code) => (REASON_CODES.includes(code) ? `birge.reason.${code}` : 'birge.reason.OTHER')
