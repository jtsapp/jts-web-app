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

/**
 * Обратная сторона того же запаса: на планшете его быть не должно.
 *
 * Панель браузера поверх страницы — это телефон. У iPad адресная строка
 * сверху, снизу закрывать нечего, и 56px превращаются в пустую полосу под
 * кнопкой шага и под последней строкой выезжающего меню.
 *
 * Отличить одно от другого чистым CSS можно только геометрией, и по ОДНОЙ
 * ширине нельзя: iPhone 17 Pro Max в ландшафте (956pt) шире iPad mini в
 * портрете (744pt). Тест держит ровно то допущение, на котором стоит правка:
 * пороги обязаны отсекать КАЖДЫЙ iPhone в ОБЕИХ ориентациях и пропускать
 * КАЖДЫЙ iPad. Меняешь пороги — прогоняешь по этой таблице.
 */
describe('запас под панель браузера не достаётся планшету', () => {
  // Логические (CSS) пиксели в портрете.
  const IPHONES = {
    'SE 3': [320, 568],
    '8': [375, 667],
    '8 Plus': [414, 736],
    'X / XS / 11 Pro': [375, 812],
    'XR / 11': [414, 896],
    '12 mini': [360, 780],
    '12 / 13 / 14': [390, 844],
    '14 Plus / 15 Plus': [428, 926],
    '15 / 16': [393, 852],
    '16 Pro Max': [440, 956],
    '17 Pro Max': [440, 956],
  }
  const IPADS = {
    'mini 6/7': [744, 1133],
    '10.2"': [810, 1080],
    'Air 11" / A16': [820, 1180],
    'Pro 11"': [834, 1194],
    'Air 13" / Pro 12.9"': [1024, 1366],
  }

  const noComments = styles.replace(/\/\*[\s\S]*?\*\//g, '')
  const override = noComments.match(/@media \(pointer: coarse\)([^{]*)\{\s*:root \{([^}]*)\}/)
  const thresholds = () => ({
    minW: Number(override[1].match(/min-width:\s*(\d+)px/)[1]),
    minH: Number(override[1].match(/min-height:\s*(\d+)px/)[1]),
  })

  it('переопределение висит на (pointer: coarse) — десктоп не задет', () => {
    // .lv-modal и .cp-dict живут вне мобильных медиазапросов, и в обычном
    // браузере их вид меняться не должен.
    expect(override).not.toBeNull()
  })

  it('на планшете запас меньше базового, но не ноль', () => {
    const base = Number(noComments.match(/--safe-bottom:[^;]*\+\s*(\d+)px/)[1])
    const tablet = Number(override[2].match(/--safe-bottom:[^;]*\+\s*(\d+)px/)[1])
    expect(tablet).toBeLessThan(base)
    // Ноль нельзя: по бокам у тех же панелей 16px, а env(safe-area-inset-bottom)
    // на iPad с кнопкой Home равен нулю — контент лёг бы на самую кромку.
    expect(tablet).toBeGreaterThan(0)
  })

  // Медиазапрос меряет ВЬЮПОРТ, а не экран устройства. На симуляторе iPad mini
  // (744x1133) Safari отдаёт странице 744x1047: 86pt верхней панели с вкладками
  // он забирает себе. Планшету поэтому режем высоту на этот замер — правило
  // обязано поймать его даже так; телефону, наоборот, отдаём высоту экрана
  // целиком, без скидки: правило обязано промахнуться и в самом выгодном для
  // попадания случае.
  const SAFARI_CHROME = 86

  it('ни один iPhone не попадает под правило — ни в портрете, ни в ландшафте', () => {
    const { minW, minH } = thresholds()
    const hits = (w, h) => w >= minW && h >= minH
    const caught = Object.entries(IPHONES)
      .filter(([, [w, h]]) => hits(w, h) || hits(h, w))
      .map(([name]) => name)
    expect(caught).toEqual([])
  })

  it('каждый iPad попадает — и в портрете, и в ландшафте', () => {
    const { minW, minH } = thresholds()
    const hits = (w, h) => w >= minW && h - SAFARI_CHROME >= minH
    const missed = Object.entries(IPADS)
      .filter(([, [w, h]]) => !hits(w, h) || !hits(h, w))
      .map(([name]) => name)
    expect(missed).toEqual([])
  })
})
