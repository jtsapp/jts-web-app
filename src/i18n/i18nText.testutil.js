import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Текст всех словарей подряд — для тестов, которые сверяют их как текст: блоки ru, en, kk идут в прежнем порядке и прежней
 * форме. Концы строк приводит к LF.
 */
export function i18nText() {
  return [join(here, '..', 'i18n.jsx'), join(here, 'lang-en.js'), join(here, 'lang-kk.js')]
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n')
    .replace(/\r\n/g, '\n')
}
