// Какой CEFR показывать на «Главной» и в сайдбаре.
//
// Уровень живёт в двух местах, и путать их нельзя:
//   • профиль на бэкенде (`users.language_level`) — его ставит тест и правят
//     менеджер/преподаватель в админке;
//   • результат теста в профиле приложения (Neon) — снимок онбординга.
//
// Профиль главнее: если человеку после теста A1 поставили A2 руками, «Главная»
// должна показать A2. Пустой профиль не прячет тест: сдал A2, в карточке ещё
// пусто — на экране всё равно A2, а не «пройдите тест» и не дефолтный A1.

/** CEFR-код или null, если значения нет. */
export function normalizeCefr(level) {
  if (level == null) return null
  const s = String(level).trim().toUpperCase()
  if (!s || s === 'NULL' || s === 'UNDEFINED') return null
  return s
}

/**
 * Уровень для экрана: сначала профиль, иначе тест.
 * @returns {string|null} null — уровня нет ни там, ни там (нужен тест).
 */
export function resolveHomeLevel(profileLevel, testLevel) {
  return normalizeCefr(profileLevel) || normalizeCefr(testLevel) || null
}
