import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Чек-лист §7 спеки «JTS Классрум — доска урока», превращённый в проверку.
//
// Экран уже один раз разъехался с макетом молча: значения подбирались на глаз,
// и расхождение (градиенты, ширины колонок, чужая палитра) заметили только
// глазами спустя время. Скриншот такое не ловит — он показывает, что «похоже»,
// а спека требует точных чисел. Здесь проверяется ровно то, что перечислено в
// чек-листе: токены, из которых экран собран.
//
// Тест намеренно читает CSS как текст, а не рендерит компоненты: предмет
// проверки — сами значения токенов, а не то, как их применили.

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, 'lessonWorkspace.css'), 'utf8')

/** Значение переменной из блока токенов. */
function token(name) {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`))
  return match ? match[1].trim() : null
}

describe('классрум — фон и поверхности', () => {
  it('фон страницы #f8f8f8, карточки #ffffff', () => {
    expect(token('lw-bg')).toBe('#f8f8f8')
    expect(token('lw-surface')).toBe('#ffffff')
  })

  // Правило №2 спеки. Градиент однажды уже жил инлайном в BannerBlock и
  // перебивал CSS, поэтому проверяем и стили, и разметку экрана.
  it('нигде нет градиентов', () => {
    expect(css).not.toMatch(/gradient/i)

    const workspace = join(here, 'screens', 'workspace')
    const files = []
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (/\.jsx?$/.test(entry.name) && !entry.name.includes('.test.')) files.push(path)
      }
    }
    walk(workspace)

    const withGradient = files.filter((f) => /gradient/i.test(readFileSync(f, 'utf8')))
    expect(withGradient).toEqual([])
  })
})

describe('классрум — шкала скруглений', () => {
  it('пилюли 999, карточки 24, шаг 32, блоки 16, баннер 20, инners 10', () => {
    expect(token('lw-r-pill')).toBe('999px')
    expect(token('lw-r-card')).toBe('24px')
    expect(token('lw-r-step')).toBe('32px')
    expect(token('lw-r-block')).toBe('16px')
    expect(token('lw-r-banner')).toBe('20px')
    expect(token('lw-r-inner')).toBe('10px')
  })
})

describe('классрум — палитра', () => {
  it('акцент один: #9047ff, тёмный вариант только для текста-акцента', () => {
    expect(token('lw-primary')).toBe('#9047ff')
    expect(token('lw-primary-ink')).toBe('#7a2fe6')
  })

  it('ответы: none #fafafa / ok #1acf1a / no #ff474a', () => {
    expect(token('lw-answer-bg')).toBe('#fafafa')
    expect(token('lw-ok')).toBe('#1acf1a')
    expect(token('lw-error')).toBe('#ff474a')
  })

  it('поля-пропуски: none #f4f1fb / ok #e3ffeb', () => {
    expect(token('lw-tint-3')).toBe('#f4f1fb')
    expect(token('lw-ok-bg')).toBe('#e3ffeb')
  })

  it('метка ученика голубая, онлайн-индикатор #00ea00', () => {
    expect(token('lw-student')).toBe('#00cbff')
    expect(token('lw-online')).toBe('#00ea00')
  })

  it('фон «частой ошибки» персиковый, а не жёлтый', () => {
    expect(token('lw-mistake-bg')).toBe('#fff1e6')
  })
})

describe('классрум — бегунки маршрута', () => {
  it('ученик голубой, тьютор фиолетовый, оба 24×24', () => {
    expect(css).toMatch(/\.lw-route__rider--student\s*{[^}]*background:\s*var\(--lw-student\)/)
    expect(css).toMatch(/\.lw-route__rider--teacher\s*{[^}]*background:\s*var\(--lw-primary\)/)

    // Селектор якорим на начало строки: иначе совпадёт правило пары
    // `.lw-route__rider + .lw-route__rider`, где размеров нет.
    const rider = css.match(/^\.lw-route__rider\s*{([^}]+)}/m)[1]
    expect(rider).toMatch(/width:\s*24px/)
    expect(rider).toMatch(/height:\s*24px/)
  })
})

describe('классрум — чат', () => {
  it('учитель фиолетовый слева, своё оранжевое справа', () => {
    const teacher = css.match(/\.lw-chat__msg\s*{([^}]+)}/)[1]
    expect(teacher).toMatch(/background:\s*var\(--lw-primary\)/)
    expect(teacher).toMatch(/align-self:\s*flex-start/)

    const own = css.match(/\.lw-chat__msg\.is-student\s*{([^}]+)}/)[1]
    expect(own).toMatch(/background:\s*var\(--lw-own\)/)
    expect(own).toMatch(/align-self:\s*flex-end/)
    expect(token('lw-own')).toBe('#ff7300')
  })
})

describe('классрум — сетка', () => {
  it('три колонки 329 / 678 / 328, хедер 64, поля 32', () => {
    expect(token('lw-col-left')).toBe('329px')
    expect(token('lw-col-center')).toBe('678px')
    expect(token('lw-col-right')).toBe('328px')
    expect(token('lw-header-h')).toBe('64px')
    expect(token('lw-page-x')).toBe('32px')
  })

  it('правая колонка — стек с gap 12', () => {
    const aside = css.match(/\.lw-aside\s*{([^}]+)}/)[1]
    expect(aside).toMatch(/flex-direction:\s*column/)
    expect(aside).toMatch(/gap:\s*12px/)
  })
})

describe('классрум — разметка урока каталога', () => {
  // Экстрактор отдаёт куски разметки файла урока (.vlist, .instruction, .gtable…).
  // Правил на них не было ни одного: словарь приезжал маркированным списком с
  // картинками 480×480 в колонке 678, а у преподавателя тот же урок открывается
  // файлом, где эти классы оформлены. Отсюда «разные картинки» на двух экранах.
  // Секция целиком: `.lw-info__body` объявлен и раньше — в типографике
  // info-блока, — поэтому искать по всему файлу нельзя, поймается не то правило.
  const section = css.slice(
    css.indexOf('==========  РАЗМЕТКА УРОКА КАТАЛОГА ВНУТРИ INFO-БЛОКА'),
    css.indexOf('/* Формула')
  )

  /** Тело правила по селектору внутри секции. */
  function rule(selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = section.match(new RegExp(`${escaped}\\s*{([^}]+)}`))
    return match ? match[1] : null
  }

  it('словарь — сетка карточек, а не маркированный список', () => {
    const vlist = rule('.lw-info__body .vlist')
    expect(vlist).toMatch(/display:\s*grid/)
    expect(vlist).toMatch(/list-style:\s*none/)
  })

  it('картинке словаря задана высота — иначе она приезжает 480×480', () => {
    const vimg = rule('.lw-info__body .vimg')
    expect(vimg).toMatch(/height:\s*\d+px/)
    expect(vimg).toMatch(/object-fit:\s*cover/)
    expect(vimg).toMatch(/width:\s*100%/)
  })

  it('любая картинка урока не шире колонки', () => {
    expect(section).toMatch(/\.lw-info__body img,[\s\S]{0,40}{[^}]*max-width:\s*100%/)
  })

  it('инструкция читается заголовком, подсказка — приглушённой', () => {
    expect(rule('.lw-info__body .instruction')).toMatch(/font-weight:\s*700/)
    expect(rule('.lw-info__body .subline,\n.lw-info__body .ohint')).toMatch(
      /color:\s*var\(--lw-muted\)/
    )
  })

  it('переменные исходного курса объявлены — иначе инлайн-стили пустые', () => {
    const body = rule('.lw-info__body')
    expect(body).toMatch(/--grey:\s*var\(--lw-muted\)/)
    expect(body).toMatch(/--violet-lt:\s*var\(--lw-tint-2\)/)
    expect(body).toMatch(/--cyan-lt:\s*var\(--lw-track\)/)
  })

  it('таблица разделяется фоном, а не рамками (правило §0.3)', () => {
    expect(rule('.lw-info__body th')).toMatch(/background:\s*var\(--lw-tint-3\)/)
    expect(section).toMatch(/\.lw-info__body tbody tr:nth-child\(even\) td\s*{[^}]*background:/)
    // Ни одной рамки во всей секции — разделение только фоном и отступами.
    // `border: 0` — снятие рамки с <button>, оно правилу не противоречит.
    expect(section).not.toMatch(/border:(?!\s*0;)/)
    expect(section).not.toMatch(/border-(top|right|bottom|left):/)
  })

  // §0.6: элемента, который выглядит рабочим и не работает, на экране нет.
  it('пустые контейнеры рантайма курса скрыты', () => {
    for (const cls of ['slide', 'dots', 'snav', 'seglist', 'wave', 'res']) {
      expect(section).toContain(`.lw-info__body .${cls}:empty`)
    }
    expect(section).toMatch(/\.lw-info__body \.res:empty\s*{\s*display:\s*none/)
  })

  it('мёртвые кнопки из файла урока не выглядят нажимаемыми', () => {
    const chip = rule('.lw-info__body .ochip,\n.lw-info__body .opt')
    expect(chip).toMatch(/pointer-events:\s*none/)
    expect(chip).toMatch(/cursor:\s*default/)
  })
})

describe('классрум — живой урок: колонки и переходы', () => {
  // sticky держит колонку, только пока она помещается в окно. Маршрут на десятке
  // шагов и колонка со звонком/темами/чатом окно перерастают — и дальше едут
  // вместе со страницей. Предел по высоте + своя прокрутка убирают причину.
  it('экран урока занимает окно, прокрутка уезжает внутрь колонок', () => {
    // Только там, где колонки действительно три: ниже 1420 правая уходит под
    // центр второй строкой сетки, и фиксированная высота делится между ними —
    // центр сжимается до полосы в пару абзацев.
    // calc(100dvh − chrome), не сырой 100dvh: экран внутри LearningLayout.
    expect(css).toMatch(
      /@media \(min-width: 1421px\) {[\s\S]*?\.live--wide\s*{[^}]*height:\s*calc\(100dvh/,
    )
    const columns = css.match(/\.lw-live-route,\n {2}\.lw-live-main,\n {2}\.lw-live-aside\s*{([^}]+)}/)[1]
    expect(columns).toMatch(/overflow-y:\s*auto/)
    // Без min-height:0 флекс-элемент не даёт детям стать меньше контента,
    // и прокрутка внутри колонок молча не включается.
    expect(columns).toMatch(/min-height:\s*0/)
  })

  it('в правой колонке топики ограничены по высоте, чат не схлопывается', () => {
    expect(css).toMatch(/\.lw-live-aside > \.lw-topics\s*{[^}]*max-height:\s*min\(220px/)
    expect(css).toMatch(/\.lw-live-aside \.lw-chat\s*{[^}]*min-height:\s*280px/)
  })

  it('sticky для колонок живого урока не используется — над экраном он не работает', () => {
    const live = css.slice(css.indexOf('.lw-live-body {'))
    expect(live).not.toMatch(/\.lw-live-(route|aside)[^{]*{[^}]*position:\s*sticky/)
  })

  it('кнопки шагов — пилюли из палитры спеки, без градиентов', () => {
    const btn = css.match(/\.lw-stepnav__btn\s*{([^}]+)}/)[1]
    expect(btn).toMatch(/border-radius:\s*var\(--lw-r-pill\)/)
    expect(btn).toMatch(/padding:\s*11px 22px/)

    expect(css).toMatch(/\.lw-stepnav__btn--primary\s*{[^}]*background:\s*var\(--lw-primary\)/)
    expect(css).toMatch(/\.lw-stepnav__btn--ghost\s*{[^}]*background:\s*var\(--lw-tint-1\)/)
    expect(css).toMatch(/\.lw-stepnav__btn:disabled\s*{[^}]*background:\s*var\(--lw-track\)/)
  })
})

describe('классрум — доступность', () => {
  // Спека молчит про фокус, но экран управляется с клавиатуры: без видимого
  // кольца шаги маршрута и варианты ответа не пройти табом.
  it('у интерактивных элементов есть видимый фокус', () => {
    for (const selector of [
      '.lw-header__exit',
      '.lw-route__step',
      '.lw-opt',
      '.lw-practice__check',
      '.lw-stepnav__btn',
      '.lw-chat__input',
      '.lw-chat__send',
    ]) {
      expect(css).toContain(`${selector}:focus-visible`)
    }
  })

  it('анимации выключаются при prefers-reduced-motion', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  })
})

describe('токены доступны там, где рисуется практика', () => {
  it('объявлены на всех корнях, включая задания домашней работы', () => {
    // Компоненты практики переиспользуются в «Домашней работе»: задание, взятое
    // с урока, должно выглядеть как на уроке. Токены объявлены на корнях, поэтому
    // новый корень обязан быть в том же объявлении — иначе карточка останется
    // без фона и отступов, а заметят это только глазами.
    const roots = css.match(/\.lw,\s*\.live,\s*\.hw-exercises\s*\{/)

    expect(roots).not.toBeNull()
  })
})
