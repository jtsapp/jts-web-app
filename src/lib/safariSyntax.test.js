import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Сторож против синтаксиса, который Safari не разбирает.
 *
 * Жалоба с iPhone: «в целом вообще не прогружается платформа, просто белый
 * экран», у других — «зависает на пол пути». iPhone 12 и 17, Safari.
 *
 * Причина такого класса — не ошибка выполнения, а ошибка РАЗБОРА. Браузер
 * спотыкается на самой записи, и файл не запускается целиком, а с ним не
 * запускается весь чанк. Ни try/catch, ни сборщик не помогают: до кода дело не
 * доходит, а в консоли видно только SyntaxError без внятного места.
 *
 * Поэтому запрет живёт тестом, а не договорённостью: заметить такое иначе
 * некому — ни в Chrome при разработке, ни в CI. Замечает преподаватель с
 * телефоном, посреди урока.
 *
 * Список намеренно короткий: только то, что ломает РАЗБОР. Отсутствующие
 * методы (`Object.hasOwn`, `.at()`) — другой случай: они падают на вызове, и
 * их лечит полифил, который сборка добавляет сама.
 */

/** Что ищем и с какой версии Safari это появилось. */
const FORBIDDEN = [
  { pattern: /\(\?<[=!]/, what: 'lookbehind в регулярке `(?<=…)`', since: 'Safari 16.4' },
  { pattern: /(^|[^\w$])static\s*\{/, what: 'static-блок класса', since: 'Safari 16.4' },
]

// Корень проекта, а не папка этого файла: vitest запускается из корня.
const ROOT = process.cwd()
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build'])

function sourceFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full))
      continue
    }
    if (!/\.(js|jsx)$/.test(entry)) continue
    // Тесты не уезжают в браузер — на них запрет не распространяется, и в этом
    // самом файле запрещённые записи присутствуют как образцы для поиска.
    if (/\.test\.(js|jsx)$/.test(entry)) continue
    out.push(full)
  }
  return out
}

/** Строки кода без комментариев: в пояснениях эти записи упоминать можно. */
function codeLines(source) {
  return source.split('\n').filter((line) => {
    const trimmed = line.trim()
    return trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')
  })
}

describe('исходники не содержат синтаксиса, который Safari не разбирает', () => {
  const files = sourceFiles(join(ROOT, 'src'))

  it('файлы для проверки найдены', () => {
    // Иначе тест зеленел бы, ничего не проверив, — самая тихая из поломок.
    expect(files.length).toBeGreaterThan(50)
  })

  for (const { pattern, what, since } of FORBIDDEN) {
    it(`нет: ${what} (нужен ${since})`, () => {
      const hits = []
      for (const file of files) {
        const lines = codeLines(readFileSync(file, 'utf8'))
        for (const line of lines) {
          if (pattern.test(line)) {
            hits.push(`${file.replace(ROOT, '')}: ${line.trim().slice(0, 100)}`)
          }
        }
      }
      expect(hits).toEqual([])
    })
  }
})
