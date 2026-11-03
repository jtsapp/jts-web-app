import en from './lang-en.js'
import kk from './lang-kk.js'

// Для vitest: все языки сразу (см. langTables.js и alias в vitest.config.js).
export const EAGER_LANGS = { en: en.en, kk: kk.kk }

export async function loadLangTable() {
  return null
}
