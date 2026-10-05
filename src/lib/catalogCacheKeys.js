// Ключи кэша каталогов (cachedAuthGet в src/api.js) в localStorage и их уборка.
//
// Отдельным модулем, а не экспортом api.js: уборку зовёт выход из аккаунта
// (accountLeftovers.js), а тесты экранов мокают api.js частичным набором
// функций — новая функция там оказалась бы undefined и уронила бы «Выйти».

export const CATALOG_KEY_PREFIX = 'jts_catalog_'

/**
 * Больше этого (в символах JSON) ответ в localStorage не кладём — только в
 * память вкладки. Разделы «Словаря» по 170–550 КБ забивали квоту домена (~5 МБ
 * на всё приложение), и молча переставали записываться токен сессии, черновики
 * домашки и прогресс (05–06.10.2026). Кэш — копия сервера, её потеря стоит
 * одной загрузки; потеря остального — разлогина и пропавшего ответа.
 */
export const CATALOG_STORE_MAX_CHARS = 100_000

/** Стереть кэш каталогов всех учеников и поколений. Остальное не трогает. */
export function clearCatalogStorage() {
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(CATALOG_KEY_PREFIX)) keys.push(key)
    }
    // Вторым проходом: removeItem сдвигает индексы.
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* хранилище недоступно — убирать нечего */
  }
}
