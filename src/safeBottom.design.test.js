import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Регрессия на «кнопка урока прячется под панелью браузера».
//
// Проверено на симуляторе iPhone 17 Pro Max, мобильный Safari: словарный шаг
// урока — это два десятка карточек, и, докрутив его до низа, «Продолжить»
// видно наполовину: поверх кнопки лежит свёрнутая панель браузера с адресом,
// нажимается только край. Панель рисуется НАД страницей, поэтому одной
// env(safe-area-inset-bottom) (34px на этом устройстве) не хватает — нужен
// запас на саму панель.
//
// Тест читает CSS как текст: предмет проверки — сами отступы, а не то, как
// jsdom их посчитает (env() он не умеет вовсе).

const here = dirname(fileURLToPath(import.meta.url))
const styles = readFileSync(join(here, 'styles.css'), 'utf8')
const course = readFileSync(join(here, 'course.css'), 'utf8')

/** Значение переменной из блока токенов styles.css. */
function token(name) {
  const match = styles.match(new RegExp(`--${name}:\\s*([^;]+);`))
  return match ? match[1].trim() : null
}

/** Тело правила `selector { … }` из файла. */
function rule(css, selector) {
  const match = css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))
  return match ? match[1] : null
}

describe('нижний край экрана в мобильном браузере', () => {
  it('--safe-bottom = safe-area плюс запас под панель браузера', () => {
    const value = token('safe-bottom')
    expect(value).toContain('env(safe-area-inset-bottom')
    // Запас сверх safe-area: без него кнопка снова уедет под панель.
    const extra = Number(value.match(/\+\s*(\d+)px/)?.[1])
    expect(extra).toBeGreaterThanOrEqual(48)
  })

  it('подвал шага урока отбит на --safe-bottom', () => {
    // Мобильный блок идёт в course.css последним и перекрывает остальные.
    const foot = course.slice(course.lastIndexOf('.cp-foot')).match(/\{([^}]*)\}/)[1]
    expect(foot).toMatch(/padding:[^;]*var\(--safe-bottom\)/)
  })

  it('подвал старого плеера B2/C1 отбит на --safe-bottom', () => {
    const mobile = styles.slice(styles.lastIndexOf('.kl-task__foot'))
    expect(mobile).toMatch(/padding-bottom:\s*var\(--safe-bottom\)/)
  })

  it('выезжающее меню не прячет последнюю строку под панелью браузера', () => {
    // Панель — 100dvh во всю высоту, значит её низ упирается в тот же край.
    const sb = styles.slice(styles.indexOf('.sb {', styles.indexOf('@media (max-width: 760px)')))
    expect(sb.slice(0, sb.indexOf('}'))).toMatch(/padding-bottom:\s*var\(--safe-bottom\)/)
  })
})

describe('токен объявлен до использования', () => {
  it('--safe-bottom лежит в :root styles.css, а не в мобильном блоке', () => {
    const root = styles.slice(0, styles.indexOf('}'))
    expect(root).toContain('--safe-bottom')
  })
})
