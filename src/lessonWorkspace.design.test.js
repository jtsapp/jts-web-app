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

describe('классрум — доступность', () => {
  // Спека молчит про фокус, но экран управляется с клавиатуры: без видимого
  // кольца шаги маршрута и варианты ответа не пройти табом.
  it('у интерактивных элементов есть видимый фокус', () => {
    for (const selector of [
      '.lw-header__exit',
      '.lw-route__step',
      '.lw-opt',
      '.lw-practice__check',
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
