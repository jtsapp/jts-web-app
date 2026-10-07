// Сколько единиц модуля «Практики» пройдено — для квоты демо-аккаунтов
// (/api/practice/entitlement). Отдельным модулем, а не внутри route.js: файл
// роута Next может экспортировать только HTTP-методы, а счёт нужен тестам.

/** Уникальные слова «Словаря»: «изучено» по всем наборам + «хуже запомненные». */
function vocabSeen(state) {
  const keys = new Set()
  const scopes = state?.vocabLearned?.scopes
  if (scopes && typeof scopes === 'object') {
    for (const list of Object.values(scopes)) if (Array.isArray(list)) list.forEach((k) => keys.add(k))
  }
  const missed = state?.vocabMisses?.words
  if (missed && typeof missed === 'object') Object.keys(missed).forEach((k) => keys.add(k))
  return keys.size
}

export function completedCountFor(moduleName, state) {
  // Ревью 08.10.2026: раньше считался только state.vocab.seenCount, а его
  // писала старая сессия словаря, которую с 27.08.2026 никто не открывает —
  // живая практика пишет vocabLearned/vocabMisses. Счётчик стоял на нуле, и
  // положительный лимит не срабатывал никогда. Старый seenCount не выбрасываем:
  // берём больший, чтобы старым аккаунтам квота не обнулилась.
  if (moduleName === 'vocab') return Math.max(state?.vocab?.seenCount ?? 0, vocabSeen(state))
  // У writing state — объект {tasks, seen}, а не done-массив: единица счёта —
  // закрытое задание жанра.
  if (moduleName === 'writing') return Object.keys(state?.writing?.tasks ?? {}).length
  // books/memes/tales — нет done в practice state (см. CONTENT_TYPE_BY_MODULE).
  if (moduleName === 'books' || moduleName === 'memes' || moduleName === 'tales') return 0
  return state?.[moduleName]?.done?.length ?? 0
}
