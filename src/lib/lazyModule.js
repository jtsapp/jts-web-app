// Загрузка кусков приложения, которые тянутся по требованию (`import()`).
//
// Проблема, из-за которой это появилось: после выката старые чанки со сборки,
// которую держит открытая вкладка, с сервера исчезают. Вкладка продолжает
// просить файлы со старыми хешами, получает 404, и `import()` отклоняется. В
// коде это выглядело как `try { await import(...) } finally { ... }` — без
// catch, то есть промис отклонялся в никуда: человек нажимал на карточку, и не
// происходило ровно ничего, ни экрана, ни ошибки.
//
// То же самое и в той же формулировке чинится в админке (web-admin,
// stale-build.util.ts) — там это ловили на преподавателе, который не мог войти
// в класс.

/**
 * Отказ ленивой загрузки из-за устаревшей сборки.
 *
 * Текст ошибки у браузеров разный и не стандартизован, поэтому проверяем все
 * известные формулировки. Ошибиться в эту сторону дёшево: худшее, что делает
 * ложное срабатывание, — одна перезагрузка страницы.
 */
export function isStaleBuildError(error) {
  const message = String(error?.message ?? error ?? '')
  return (
    error?.name === 'ChunkLoadError' ||
    /Loading chunk \S+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  )
}

const RELOAD_MARK = 'jts_stale_build_reload'

/**
 * Разрешает одну перезагрузку.
 *
 * Отметка обязательна: если чанк не грузится не из-за выката, а, скажем,
 * из-за упавшей раздачи статики, перезагрузка не поможет — и без ограничителя
 * вкладка ушла бы в бесконечный цикл.
 *
 * @returns {boolean} можно ли перезагружаться
 */
export function allowStaleBuildReload(store = safeSession()) {
  if (!store) return false // приватный режим: цикл не отследить — не рискуем
  try {
    if (store.getItem(RELOAD_MARK)) return false
    store.setItem(RELOAD_MARK, '1')
    return true
  } catch {
    return false
  }
}

/** Удачная загрузка снимает отметку: следующий сбой снова заслуживает попытки. */
export function clearStaleBuildMark(store = safeSession()) {
  try {
    store?.removeItem(RELOAD_MARK)
  } catch {
    /* нечего чистить */
  }
}

/**
 * Грузит модуль по требованию.
 *
 * @param {() => Promise<any>} importer
 * @returns {Promise<any|null>} модуль либо null, если загрузить не удалось.
 *          При устаревшей сборке страница перезагружается и до `null` дело не
 *          доходит — после перезагрузки нажатие срабатывает уже нормально.
 */
export async function loadModule(importer) {
  try {
    const mod = await importer()
    clearStaleBuildMark()
    return mod
  } catch (error) {
    if (recoverFromStaleImport(error)) return null
    // Не устаревшая сборка (или перезагрузка уже была) — тихо не молчим хотя бы
    // в консоли: без этого разбирать такие жалобы не по чему.
    console.error('[lazy] не удалось загрузить модуль', error)
    return null
  }
}

/**
 * Общая реакция на отказ `import()`. Отдельно от {@link loadModule}, потому что
 * `next/dynamic` принимает свой импортёр и обрабатывать ошибку приходится
 * внутри него.
 *
 * @returns {boolean} перезагружаемся (значит вызывающему делать больше нечего)
 */
export function recoverFromStaleImport(error) {
  if (!isStaleBuildError(error)) return false
  if (!allowStaleBuildReload()) return false
  if (typeof location === 'undefined') return false
  location.reload()
  return true
}

function safeSession() {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}
