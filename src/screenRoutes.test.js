import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Навигация приложения — это state-машина `screen` внутри App.jsx (см. CLAUDE.md
// репозитория), и добавить экран в switch куда проще, чем довести до него
// пользователя. Так уже случилось с `tutor-level-offer`: экран был свёрстан по
// макету и смонтирован в switch, но `setScreen('tutor-level-offer')` не звал
// никто — из загрузки тьютора шли сразу в голосовой тест, а «сдать тест позже»
// у студента не было вовсе. Нашли это только сверкой с Figma.
//
// Тест ловит ровно такие сироты: каждое имя экрана должно встречаться в коде
// ещё где-то, кроме собственной ветки switch, — как аргумент setScreen, значение
// в карте переходов или элемент цепочки онбординга.

const src = dirname(fileURLToPath(import.meta.url))
const app = readFileSync(join(src, 'App.jsx'), 'utf8')

const screens = [...new Set([...app.matchAll(/case '([a-z0-9-]+)':/g)].map((m) => m[1]))]

/** Все исходники проекта, кроме тестов. */
function sources(dir = src, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) sources(path, acc)
    else if (/\.jsx?$/.test(entry.name) && !entry.name.includes('.test.')) acc.push(path)
  }
  return acc
}

const files = sources().map((path) => [path, readFileSync(path, 'utf8')])

/** Упоминания имени экрана вне его собственной строки `case '…':`. */
function referencesOutsideSwitch(screen) {
  const refs = []
  for (const [path, text] of files) {
    const lines = text.split('\n')
    lines.forEach((line, i) => {
      if (!line.includes(`'${screen}'`)) return
      if (path.endsWith('App.jsx') && line.trim().startsWith(`case '${screen}'`)) return
      refs.push(`${path.slice(src.length + 1)}:${i + 1}`)
    })
  }
  return refs
}

describe('навигация — недостижимых экранов нет', () => {
  it('в switch App.jsx есть все экраны приложения', () => {
    // Страховка от опечатки в самом тесте: если регулярка перестанет находить
    // ветки, остальные проверки станут пустыми и «зелёными».
    expect(screens.length).toBeGreaterThan(40)
  })

  it('к каждому экрану ведёт хотя бы один переход', () => {
    const orphans = screens.filter((s) => referencesOutsideSwitch(s).length === 0)
    expect(orphans, 'экран смонтирован, но попасть на него нечем').toEqual([])
  })

  // Точечная фиксация починенной цепочки: загрузка тьютора → предложение теста.
  it('после подстройки тьютора студент попадает на предложение теста', () => {
    expect(app).toMatch(/onDone=\{\(\) => goAfterTutorEdit\('tutor-level-offer', 'tutor-dashboard'\)\}/)
  })
})
