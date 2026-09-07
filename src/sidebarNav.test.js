import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Сайдбар сам никуда не ведёт: он зовёт `onNav`, а решает App.jsx. Экран, на
// котором сайдбар нарисован, а `onNav` ему не передали, выглядит совершенно
// рабочим — и не работает. Ровно это случилось с экраном урока: ученик заходил
// в самостоятельный урок, и ни одна кнопка меню слева не отзывалась. Заодно
// туда же не доехали `userName` и `userLevel`, поэтому в профиле стояло слово
// «Профиль», а уровень у всех был A1 — из значения по умолчанию.
//
// Тест читает исходники как текст, а не рендерит: предмет проверки — сама
// передача пропсов в App.jsx, и увидеть её надёжнее прямо в разметке.

const src = dirname(fileURLToPath(import.meta.url))
const app = readFileSync(join(src, 'App.jsx'), 'utf8')

/** Все исходники проекта, кроме тестов. */
function sources(dir = src, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) sources(path, acc)
    else if (/\.jsx?$/.test(entry.name) && !entry.name.includes('.test.')) acc.push(path)
  }
  return acc
}

// Экран «с сайдбаром» — тот, что рисует его сам или через оболочку обучения.
const withSidebar = sources()
  .filter((f) => /<(Sidebar|LearningLayout)\b/.test(readFileSync(f, 'utf8')))
  .map((f) => f.split(/[\\/]/).pop().replace(/\.jsx?$/, ''))

/** Тело объекта `const name = { … }` в App.jsx — источник для `{...name}`. */
function spreadBody(name) {
  const match = app.match(new RegExp(`const ${name}\\s*=\\s*\\{([\\s\\S]*?)\\n\\s*\\}`))
  return match ? match[1] : ''
}

/**
 * Пропсы всех вхождений `<Name ... />` в App.jsx.
 *
 * Границу тега ищем счётчиком фигурных скобок, а не регуляркой до `>`: в
 * пропсах сплошь стрелочные функции (`onProfile={() => setScreen('profile')}`),
 * и `[^>]*` обрывался на первой же из них. Тогда экран просто выпадал из
 * проверки — молча и как раз там, где пропсов больше всего.
 *
 * Разворачиваем `{...ieltsProps}`: экраны IELTS передают всё пачкой, и без
 * этого они выглядели бы сломанными, хотя пропсы у них есть.
 */
function mounts(name) {
  const out = []
  const open = new RegExp(`<${name}\\b`, 'g')
  let m
  while ((m = open.exec(app))) {
    let depth = 0
    let i = m.index + m[0].length
    for (; i < app.length; i += 1) {
      const c = app[i]
      if (c === '{') depth += 1
      else if (c === '}') depth -= 1
      else if (c === '>' && depth === 0) break
    }
    const props = app.slice(m.index + m[0].length, i)
    const spreads = [...props.matchAll(/\{\s*\.\.\.([A-Za-z_$][\w$]*)\s*\}/g)].map((s) => s[1])
    out.push(props + spreads.map(spreadBody).join('\n'))
  }
  return out
}

/**
 * Есть ли проп — в JSX (`onNav={…}`) или в объекте для spread, где он же
 * записан как `onNav: handleNav` либо сокращённо `userLevel,`.
 */
function has(props, prop) {
  return new RegExp(`\\b${prop}\\s*[:={,\\n]`).test(props)
}

describe('меню слева работает на каждом экране, где оно нарисовано', () => {
  const mounted = withSidebar.filter((name) => mounts(name).length > 0)

  it('такие экраны в App.jsx вообще есть — иначе проверка пустая', () => {
    expect(mounted.length).toBeGreaterThan(5)
    // Именно этот экран проверку однажды и обошёл: разбор тега спотыкался о
    // стрелочные функции в пропсах и не находил ни одного вхождения.
    expect(mounted).toContain('LessonWorkspacePage')
  })

  // Зона тьютора зовёт то же самое своими именами: `onNavigate` вместо `onNav`
  // и `user={{ name, level }}` вместо пары пропсов. Проверяем суть — что
  // переход и личность экрану вообще передали, — а не написание.
  const hasNav = (props) => has(props, 'onNav') || has(props, 'onNavigate')
  const hasIdentity = (props) => (has(props, 'userName') && has(props, 'userLevel')) || has(props, 'user')

  it('каждому передан onNav — без него кнопки меню молчат', () => {
    const broken = mounted.filter((name) => mounts(name).some((props) => !hasNav(props)))
    expect(broken).toEqual([])
  })

  it('каждому передано имя и уровень — иначе в профиле «Профиль», а уровень A1', () => {
    const broken = mounted.filter((name) => mounts(name).some((props) => !hasIdentity(props)))
    expect(broken).toEqual([])
  })
})
