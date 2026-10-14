// Подсказка распознаванию для голосовых вопросов помощнику. Помощник —
// технический: его спрашивают про сайт по-русски и по-казахски, и чаще всего
// называют разделы и кнопки. Soniox с подсказкой терминов распознаёт казахские
// формы заметно лучше (замер #499: 78 → 93 %), а слова сайта вроде «Шэдоуинг»
// или «Speaking Buddy» без неё угадывает как попало.

import { SCREEN_NAMES } from './prompt.js'

// Лимит Soniox — 8000 токенов на весь context; берём с большим запасом:
// длинный список размывает подсказку не хуже, чем её отсутствие.
export const STT_CONTEXT_MAX_CHARS = 3000

// Первым — язык интерфейса: на нём ученик скорее всего и спросит. Английский
// у ru/kk последним, но в списке: «почему «don't like» не засчитали?».
const LANGS = { kk: ['kk', 'ru', 'en'], ru: ['ru', 'kk', 'en'], en: ['en', 'ru', 'kk'] }
const LOCALES = { kk: 'kk-KZ', ru: 'ru-RU', en: 'en-US' }

export const sttLanguages = (lang) => (Object.hasOwn(LANGS, lang) ? LANGS[lang] : LANGS.ru)
export const azureLocale = (lang) => (Object.hasOwn(LOCALES, lang) ? LOCALES[lang] : LOCALES.ru)

// Как разделы и действия названы в казахском интерфейсе (i18n.jsx, kk: nav.*,
// nav.back.*): «Практика» там — «Тәжірибе», а «Обучение» — «Қайталау».
const KK_TERMS = [
  'Басты бет', 'Тәжірибе', 'Сабақтар', 'Сөздік', 'Үй жұмысы', 'Қайталау', 'Оқу',
  'Жұмыс дәптері', 'Тыңдалым', 'Жазылым', 'Суреттегі сөздер', 'Тарифтер', 'Профиль',
  'Тапсырма', 'Жауап', 'Тексеру', 'Қате', 'Көмекші', 'Хабарламалар', 'Тьютор',
]

// Чего нет в именах экранов, но что ученик говорит вслух.
const RU_TERMS = [
  'Проверить', 'Неверный ответ', 'Подсказка', 'Монеты', 'Серия', 'Уведомления',
  'Менеджер', 'Преподаватель', 'Луна', 'Декстер', 'Спарк', 'Айзере', 'Воркбук',
]

function screenTerms() {
  return Object.values(SCREEN_NAMES)
    .flatMap((name) => name.split('→'))
    .map((s) => s.replace(/[«»()]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

/** Контекст Soniox: о чём разговор (general) и слова сайта (terms). */
export function sttContext({ screenId } = {}) {
  const terms = []
  let size = 0
  for (const t of [...screenTerms(), ...RU_TERMS, ...KK_TERMS]) {
    if (terms.includes(t) || size + t.length > STT_CONTEXT_MAX_CHARS) continue
    terms.push(t)
    size += t.length
  }
  const general = [
    { key: 'domain', value: 'Технический помощник сайта онлайн-школы английского языка JTS' },
    { key: 'topic', value: 'Ученик спрашивает про разделы сайта, задания, оценки, оплату и поломки' },
  ]
  const screen = typeof screenId === 'string' && Object.hasOwn(SCREEN_NAMES, screenId) ? SCREEN_NAMES[screenId] : null
  if (screen) general.push({ key: 'current_screen', value: screen })
  return { general, terms }
}
