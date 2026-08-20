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

describe('классрум — словарь', () => {
  // Кадр Vocabulary живых уроков (Figma 4065:9259): сетка 804 шириной, GRID на
  // 4 колонки, ячейка 192×275 — картинка 192×245 r12, под ней подпись 16/700
  // #181818, зазор 8. Зазоры сетки РАЗНЫЕ: 12 по горизонтали, 24 по вертикали.
  // До этого сетка была auto-fill от 150px — число колонок плавало вместе с
  // шириной центральной колонки, и ни на одной ширине их не было четыре.
  it('сетка — четыре колонки по 192px, а не auto-fill', () => {
    const grid = css.match(/\.lw-vocab__grid\s*{([^}]+)}/)[1]
    expect(grid).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/)
    expect(grid).not.toMatch(/auto-fill/)
    // 4×192 + 3×12 промежутка: предел ширины и держит колонку в 192px.
    expect(grid).toMatch(/gap:\s*24px 12px/)
    expect(grid).toMatch(/max-width:\s*804px/)
  })

  it('подпись со словом лежит под карточкой, а не на её лицевой стороне', () => {
    // Обёртка — колонка (карточка, затем подпись), иначе подпись легла бы
    // поверх карточки: у .lw-vcard-wrap есть position: relative под озвучку.
    const wrap = css.match(/\.lw-vcard-wrap\s*{([^}]+)}/)[1]
    expect(wrap).toMatch(/flex-direction:\s*column/)

    // 16/700 #181818 — из кадра словаря, а не 18/700 от карточек-вариантов:
    // набор похожий, но это соседний паттерн той же секции.
    const caption = css.match(/\.lw-vcard__caption\s*{([^}]+)}/)[1]
    expect(caption).toMatch(/font-size:\s*16px/)
    expect(caption).toMatch(/font-weight:\s*700/)
    expect(caption).toMatch(/color:\s*#181818/)
    expect(caption).toMatch(/text-align:\s*center/)

    // Картинка занимает лицевую сторону целиком — под ней в карточке уже
    // ничего не стоит.
    expect(css).toMatch(/\.lw-vcard__front img\s*{[^}]*height:\s*100%/)
  })

  it('пропорция карточки — 192/245 из макета, а не 3:4 на глаз', () => {
    expect(css).toMatch(/\.lw-vcard\s*{[^}]*aspect-ratio:\s*192 \/ 245/)
  })

  it('карточка без картинки держит ту же пропорцию, а не свою высоту', () => {
    // height: 170px на .is-noimg делал ряд рваным. Слово ушло под карточку —
    // ломать пропорцию больше незачем, лицевая сторона просто красится тинтом.
    expect(css).not.toMatch(/\.lw-vcard\.is-noimg\s*{[^}]*height:/)
    expect(css).toMatch(
      /\.lw-vcard\.is-noimg \.lw-vcard__front\s*{[^}]*background:\s*var\(--lw-tint-2/,
    )
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

  it('инструкция шага набрана по макету, подсказка — приглушённой', () => {
    // Макет «Онлайн-уроки»: шаг открывается крупной фиолетовой строкой с
    // подзаголовком под ней. Одинаково во всех уроках — рабочее пространство,
    // каталог и живой урок показывают шаг одним и тем же способом.
    const instruction = rule('.lw-info__body .instruction')
    expect(instruction).toMatch(/font-size:\s*32px/)
    expect(instruction).toMatch(/font-weight:\s*700/)
    expect(instruction).toMatch(/color:\s*var\(--lw-primary/)
    expect(instruction).toMatch(/text-align:\s*center/)

    const subline = rule('.lw-info__body .subline')
    expect(subline).toMatch(/font-size:\s*24px/)
    expect(subline).toMatch(/text-align:\s*center/)

    expect(rule('.lw-info__body .ohint')).toMatch(/color:\s*var\(--lw-muted\)/)
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
  // Макет «Онлайн-уроки»: на блоке 1168 ровно две колонки — контент 868 и
  // правая 300. Так во всех 39 экранах шести стадий (Warm-up, Grammar,
  // Practice, Listening, Speaking, Wrap), отдельной колонки под маршрут нет
  // ни на одном. Сам маршрут при этом остаётся в каждом уроке — карточкой
  // правой колонки: только через него переходят на произвольный шаг и видно,
  // где ученик, а где преподаватель.
  it('сетка урока — две колонки, контент и правая 300', () => {
    const body = css.match(/\.lw-live-body\s*{([^}]+)}/)[1]
    expect(body).toMatch(/--lw-col-right:\s*300px/)
    expect(body).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s*var\(--lw-col-right\)/)
    // Колонки под маршрут больше нет — вместе с ней ушёл и её токен ширины.
    expect(css).not.toMatch(/--lw-live-col-left/)
  })

  it('экран урока занимает окно, прокрутка уезжает внутрь колонок', () => {
    // Только там, где колонки действительно две: ниже 1420 правая уходит под
    // центр второй строкой сетки, и фиксированная высота делится между ними —
    // центр сжимается до полосы в пару абзацев.
    // calc(100dvh − chrome), не сырой 100dvh: экран внутри LearningLayout.
    expect(css).toMatch(
      /@media \(min-width: 1421px\) {[\s\S]*?\.live--wide\s*{[^}]*height:\s*calc\(100dvh/,
    )
    const columns = css.match(/\.lw-live-main,\n {2}\.lw-live-aside\s*{([^}]+)}/)[1]
    expect(columns).toMatch(/overflow-y:\s*auto/)
    // Без min-height:0 флекс-элемент не даёт детям стать меньше контента,
    // и прокрутка внутри колонок молча не включается.
    expect(columns).toMatch(/min-height:\s*0/)
  })

  it('в правой колонке ни одна карточка не схлопывается в ноль', () => {
    // Маршрут переехал в эту же колонку, карточек стало четыре. Пока колонка
    // стояла на overflow:hidden и делила высоту окна между карточками, лишнее
    // не пряталось, а схлопывалось: маршрут выходил 0px, топики — один
    // заголовок. Теперь высоту делить не надо — не влезшее уезжает в прокрутку
    // самой колонки, поэтому карточки объявлены flex: none.
    const aside = css.match(/\.lw-live-aside\s*{\s*\n\s*overflow-y:\s*auto;([^}]+)}/)
    expect(aside).not.toBeNull()
    expect(css).toMatch(
      /\.lw-live-aside > \.lw-meet,\n\s*\.lw-live-aside > \.lw-summary,\n\s*\.lw-live-aside > \.lw-live-route\s*{[^}]*flex:\s*none/,
    )
    // Свой предел у маршрута остаётся: десяток шагов не должен вытеснять
    // остальные карточки за один экран прокрутки.
    expect(css).toMatch(/\.lw-live-route\s*{[^}]*max-height:\s*min\(320px/)
    expect(css).toMatch(/\.lw-live-aside > \.lw-topics\s*{[^}]*max-height:\s*min\(220px/)
    // Чат добирает остаток, но ниже рабочей высоты не ужимается.
    expect(css).toMatch(/\.lw-live-aside \.lw-chat\s*{[^}]*flex:\s*1 0 auto;[^}]*min-height:\s*280px/)
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

// Слой заданий, снятый из макета «Онлайн-уроки». Раньше по макету был сделан
// только `pick` — остальные типы сидели на старой палитре классрума, и рядом с
// отредизайненными карточками выглядели как другое приложение. Значения ниже
// взяты из кадров Figma напрямую; тест держит их от сползания «на глаз».
describe('классрум — задания по макету', () => {
  /** Тело правила по селектору. */
  function rule(selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = css.match(new RegExp(`${escaped}\\s*{([^}]+)}`))
    return match ? match[1] : null
  }

  it('порядок слов: чип 65 r100, собранная строка отделена линией', () => {
    // Practice → 4065:18365 и соседние состояния: чип высотой 65, r100,
    // padding 24/13, текст 16/700; строка ответа над линией 1px #afafaf.
    const chip = rule('.lw-q--order .lw-ochip')
    expect(chip).toMatch(/min-height:\s*65px/)
    expect(chip).toMatch(/border-radius:\s*100px/)
    expect(chip).toMatch(/padding:\s*13px 24px/)
    expect(chip).toMatch(/font-size:\s*16px/)
    expect(chip).toMatch(/font-weight:\s*700/)

    const line = rule('.lw-q--order .lw-order__sentence')
    expect(line).toMatch(/border-bottom:\s*1px solid #afafaf/)
    expect(line).toMatch(/gap:\s*8px/)

    // Верный порядок — зелёный, неверный — красный; оба на всю строку.
    expect(css).toMatch(/\.lw-q--order \.lw-order__sentence\.is-correct \.lw-ochip\s*{[^}]*background:\s*#31b423/)
    expect(css).toMatch(/\.lw-q--order \.lw-order__sentence\.is-wrong \.lw-ochip\s*{[^}]*background:\s*var\(--fx-no\)/)
  })

  it('мультивыбор: сетка по три, карточка 96 r20, состояние обводкой', () => {
    // Listening → 4065:26472 и соседние: карточка 173×96 r20, заливка ВСЕГДА
    // белая, состояние несёт обводка 2px внутрь плюс цвет текста. Это же и
    // требование доступности — состояние не только цветом заливки.
    expect(rule('.lw-q--multi .lw-opts')).toMatch(/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/)

    const card = rule('.lw-q--multi .lw-opt')
    expect(card).toMatch(/min-height:\s*96px/)
    expect(card).toMatch(/border-radius:\s*20px/)
    expect(card).toMatch(/font-size:\s*18px/)

    expect(rule('.lw-q--multi .lw-opt.is-selected')).toMatch(/inset 0 0 0 2px var\(--lw-primary\)/)
    expect(css).toMatch(/\.lw-q--multi \.lw-opt\.is-ok,[\s\S]{0,160}inset 0 0 0 2px var\(--fx-ok\)/)
  })

  it('одиночный выбор: колонка 372, вариант 59 r999, текст 16/700', () => {
    // Grammar → 4065:13923 и соседние.
    const opts = rule('.lw-q--choice .lw-opts')
    expect(opts).toMatch(/flex-direction:\s*column/)
    expect(opts).toMatch(/max-width:\s*372px/)
    expect(opts).toMatch(/gap:\s*12px/)

    const opt = rule('.lw-q--choice .lw-opt')
    expect(opt).toMatch(/min-height:\s*59px/)
    expect(opt).toMatch(/padding:\s*20px 24px/)
    expect(opt).toMatch(/font-size:\s*16px/)
    expect(opt).toMatch(/font-weight:\s*700/)
  })

  it('сопоставление: строка-карточка 72 r20, слот ответа пилюлей 118×48', () => {
    // Задания на сопоставление в макете НЕТ — проверено программно по всем 39
    // экранам (CONNECTOR: 0, LINE: 6 и все в порядке слов, поиск по текстам и
    // именам слоёв дал ноль). Вид собран из соседнего паттерна той же секции —
    // строк «Read and choose True or False» (4065:17297).
    const row = rule('.lw-q--match .lw-match__left')
    expect(row).toMatch(/min-height:\s*72px/)
    expect(row).toMatch(/border-radius:\s*20px/)
    expect(row).toMatch(/justify-content:\s*space-between/)

    expect(rule('.lw-q--match .lw-match__left-label')).toMatch(/font-size:\s*20px/)

    const slot = rule('.lw-q--match .lw-match__chosen')
    expect(slot).toMatch(/min-width:\s*118px/)
    expect(slot).toMatch(/min-height:\s*48px/)
    expect(slot).toMatch(/border-radius:\s*30px/)
  })

  it('заголовок задания — 24/700, один для всех типов', () => {
    expect(css).toMatch(
      /\.lw-q--order \.lw-q__prompt,[\s\S]{0,180}font-size:\s*24px/,
    )
  })

  it('красный и зелёный сведены к паре токенов на секцию', () => {
    // В макете два красных (#ea4f4f, #ff4646) и четыре зелёных (#19c119,
    // #31b423, #1eb04b, #067a32) на одну и ту же семантику. Без сведения
    // при первой же правке разъедется.
    const tokens = css.match(/\.lw-q--order,\n\.lw-q--multi,\n\.lw-q--match,\n\.lw-q--choice\s*{([^}]+)}/)[1]
    expect(tokens).toMatch(/--fx-ok:\s*#19c119/)
    expect(tokens).toMatch(/--fx-no:\s*#ea4f4f/)
  })
})
