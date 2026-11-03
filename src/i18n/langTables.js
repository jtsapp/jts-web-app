import { loadModule } from '../lib/lazyModule.js'

// Словари языков, которые качаются по выбору. Отдельный файл, а не код внутри i18n.jsx, ради тестов: там его подменяет
// langTables.eager.js (vitest.config.js), и сотни проверок получают текст нужного языка сразу, как было до разделения.
export const EAGER_LANGS = {}

const LOADERS = {
  en: () => import('./lang-en.js'),
  kk: () => import('./lang-kk.js'),
}

/** Таблица строк языка или null: языка нет или чанк не загрузился (устаревшую сборку loadModule перезагрузит сам). */
export async function loadLangTable(lang) {
  const load = LOADERS[lang]
  if (!load) return null
  const mod = await loadModule(load)
  return mod?.default?.[lang] ?? null
}
