import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Регрессия на «планшет получает десктопную раскладку».
//
// До этого весь диапазон выше 760px считался десктопом: сайдбар 272px + контент.
// На iPad Air 11" (820pt в портрете) контенту оставалось 548px — меньше, чем
// закладывает даже мобильный макет, и карта уровней с карточками практики
// сжимались до нечитаемого. Проверено в Safari на симуляторе iPad Air 11".
//
// Тест читает CSS как текст: предмет проверки — сами условия @media и ширина
// колонки, а не то, как их посчитает jsdom (он медиа-запросы не применяет).

const here = dirname(fileURLToPath(import.meta.url))
const read = (name) => readFileSync(join(here, name), 'utf8')
const styles = read('styles.css')
const tutor = read('tutor.css')
const course = read('course.css')
const workspace = read('lessonWorkspace.css')

/** CSS без комментариев — иначе примеры из пояснений попадают в проверки. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Все блоки `@media <cond> { … }` целиком, склеенные. Блоков с одним и тем же
 *  условием в файле несколько (планшетная раскладка и страховка от бокового
 *  выпирания), поэтому вернуть первый попавшийся — значит проверять не то. */
function mediaBlock(condition) {
  const needle = `@media ${condition} {`
  // Условие ищется вместе с открывающей скобкой: те же строки встречаются в
  // комментариях («см. @media (max-width: 760px)»), и без скобки находился бы
  // комментарий, а не правило.
  const blocks = []
  let from = 0
  for (;;) {
    const start = styles.indexOf(needle, from)
    if (start === -1) break
    let depth = 0
    for (let i = styles.indexOf('{', start); i < styles.length; i += 1) {
      if (styles[i] === '{') depth += 1
      else if (styles[i] === '}') {
        depth -= 1
        if (depth === 0) {
          blocks.push(styles.slice(start, i + 1))
          from = i + 1
          break
        }
      }
    }
    if (from <= start) break
  }
  return blocks.length ? blocks.join('\n') : null
}

/** Тело правила `selector { … }` внутри произвольного куска CSS. */
function rule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`(^|[,{}\\s])${escaped}\\s*(,[^{]*)?\\{([^}]*)\\}`, 'm'))
  return match ? match[3] : null
}

const TABLET = '(min-width: 761px) and (max-width: 1023px),\n       (min-width: 761px) and (hover: none)'

describe('планшетная раскладка кабинета', () => {
  const tablet = mediaBlock(TABLET)

  it('планшетный блок покрывает и портрет, и тач-экран любой ширины', () => {
    // Два условия: 761–1023px (портрет iPad, узкое окно на десктопе) и любой
    // тач-экран от 761px (ландшафт iPad — 1180pt). Без второго поворот
    // планшета перекладывал бы всю оболочку.
    expect(tablet).not.toBeNull()
  })

  it('сайдбар сжимается в рейл, а не занимает треть экрана', () => {
    const sb = rule(tablet, '.sb')
    const width = Number(sb.match(/width:\s*(\d+)px/)[1])
    expect(width).toBeLessThanOrEqual(96)
    // Рейл в потоке: раскрывать его нечем, а absolute уводил бы подвал под колонку.
    expect(sb).toMatch(/position:\s*sticky/)
  })

  it('подписи разделов остаются видимыми — на тач-экране их нечем раскрыть', () => {
    // Ровно то, чем планшетный рейл отличается от десктопного: там подписи
    // спрятаны и достаются наведением, здесь наведения нет.
    const hidden = rule(tablet, '.sb .sb__logo')
    expect(hidden).toMatch(/display:\s*none/)
    expect(tablet).not.toMatch(/\.sb\s+\.sb__item\s+span[^{]*\{[^}]*display:\s*none/)
    expect(rule(tablet, '.sb .sb__item span')).toMatch(/font-size/)
  })

  it('кнопка раздела не мельче 44px — попадание пальцем без прицеливания', () => {
    const item = rule(tablet, '.sb .sb__item')
    expect(Number(item.match(/width:\s*(\d+)px/)[1])).toBeGreaterThanOrEqual(44)
    // Иконка над подписью: в строку они в колонку 88px не помещаются.
    expect(item).toMatch(/flex-direction:\s*column/)
  })

  it('десктопный рейл с раскрытием по наведению — только для мыши', () => {
    // На тач-экране hover залипает после тапа, и раскрытие подписей работать
    // не может: первое касание по кнопке её же и нажимает.
    expect(mediaBlock('(min-width: 1024px) and (hover: hover)')).toContain('.learn--rail .sb--rail:hover')
    expect(styles).not.toMatch(/@media \(min-width: 761px\) \{\s*\.learn--rail/)
  })

  it('мобильный drawer остаётся ниже 761px и на планшет не заходит', () => {
    const mobile = mediaBlock('(max-width: 760px)')
    expect(mobile).toMatch(/\.mtop\s*\{\s*display:\s*flex/)
  })
})

describe('планшет: экраны, до которых не доходили медиазапросы', () => {
  // Каждая правка ниже закрывает одну и ту же дыру: фикс существовал только в
  // @media (max-width: 760px), а между 761px и десктопом экран оставался с
  // десктопной раскладкой. Проверено замерами в Safari на iPad Air 11" (820pt).

  it('подпись урока в шапке живого урока обрезается, а не лезет на соседа', () => {
    // .lv-top — сетка 1fr auto 1fr; на 820pt левой колонке достаётся 299px, и
    // подписи оставалось 61px при 98px текста. overflow у неё был visible,
    // поэтому лишние 37px рисовались поверх бейджа «Преподаватель не на связи».
    const base = stripComments(workspace).match(/\.lv-top__lesson-kind\s*\{([^}]*)\}/)[1]
    expect(base).toMatch(/overflow:\s*hidden/)
    expect(base).toMatch(/text-overflow:\s*ellipsis/)
    expect(base).toMatch(/white-space:\s*nowrap/)
  })

  it('на планшете бейдж связи уходит на свою строку, освобождая название', () => {
    // Одного обреза мало: название ужималось до 36px — буква с многоточием.
    const tablet = stripComments(workspace).match(
      /@media \(min-width: 761px\) and \(max-width: 1023px\),\s*\(min-width: 761px\) and \(hover: none\) \{([\s\S]*?)\n\}/
    )
    expect(tablet).not.toBeNull()
    expect(tablet[1]).toMatch(/\.lv-top__left\s*\{[^}]*flex-wrap:\s*wrap/)
    expect(tablet[1]).toMatch(/\.lv-top__offline\s*\{[^}]*flex-basis:\s*100%/)
  })

  it('календарь уходит в одну колонку раньше, чем клетка дня станет мельче 44px', () => {
    // При двух колонках панель дня забирает 340px; на 820pt месяцу оставалось
    // 312px и клетки выходили 34px. 44px — минимальная цель по HIG; чтобы её
    // удержать, месяцу нужно ≥384px, то есть сетке ≥740px и вьюпорту ≈892px.
    const breakpoint = Number(
      stripComments(styles).match(/@media \(max-width: (\d+)px\)\s*\{\s*\.cal-layout/)[1]
    )
    expect(breakpoint).toBeGreaterThanOrEqual(892)
  })

  it('сетки шага урока тянутся, а не стоят жёсткими треками', () => {
    // repeat(2, 370px) = 750px не влезали даже в свои 744px, а на планшете
    // коробка ужималась до 668px и треки резались с обеих сторон.
    const css = stripComments(course)
    for (const selector of ['\\.cp-check', '\\.cp-choices\\.is-grid']) {
      const rule = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))[1]
      expect(rule).toMatch(/grid-template-columns:\s*repeat\(auto-fit/)
      expect(rule).not.toMatch(/grid-template-columns:\s*repeat\(\d+,\s*\d+px/)
    }
  })

  it('планшетное правило дашборда стоит ПОСЛЕ базового, иначе не применится', () => {
    // Медиазапрос не добавляет специфичности: сначала правило лежало выше
    // .t-dash__panel и молча проигрывало ему — панель оставалась 378px.
    const css = stripComments(tutor)
    const base = css.indexOf('.t-dash__panel {')
    const tabletRule = css.search(/@media \(min-width: 761px\) and \(max-width: 900px\)/)
    expect(base).toBeGreaterThan(-1)
    expect(tabletRule).toBeGreaterThan(base)
  })

  it('страница не может поехать вбок и выше 760px', () => {
    // Страховка на случай, если фиксированная ширина заведётся снова: пусть
    // обрежется блок, а не поедет вся страница вместе с липким рейлом.
    const css = stripComments(styles)
    const tabletClip = css.match(
      /@media \(min-width: 761px\) and \(max-width: 1023px\),\s*\(min-width: 761px\) and \(hover: none\) \{\s*html,\s*body \{([^}]*)\}/
    )
    expect(tabletClip).not.toBeNull()
    expect(tabletClip[1]).toMatch(/overflow-x:\s*clip/)
  })

  it('жёстких ширин шире 600px вне медиазапросов не заводится', () => {
    // Ровно этот шаблон и ломал планшет: width: 744px без механизма сжатия.
    // Список исключений — те, у кого механизм есть; каждое новое имя здесь
    // должно появляться вместе с объяснением, почему оно безопасно.
    const allowed = {
      '.t-card': 'флекс-итем .t-content--center, сжимается через flex-shrink',
      '.cp-check': 'рядом стоит max-width: 100%, треки — auto-fit',
      '.cp-choices.is-grid': 'max-width: 100% наследуется от .cp-choices, треки — auto-fit',
    }
    const offenders = []
    for (const [name, css] of [['styles.css', styles], ['tutor.css', tutor], ['course.css', course]]) {
      const clean = stripComments(css)
      const ruleRe = /([^{}]+)\{([^{}]*)\}/g
      let match
      while ((match = ruleRe.exec(clean)) !== null) {
        const before = clean.slice(0, match.index)
        if (before.split('{').length - before.split('}').length > 0) continue // внутри @media
        const width = match[2].match(/(?<![-\w])width:\s*(\d{3,4})px/)
        if (!width || Number(width[1]) < 600) continue
        const selector = match[1].trim().split('\n').pop().trim()
        if (allowed[selector]) continue
        offenders.push(`${name}: ${selector} → ${width[0]}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
