import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Казахский интерфейс — на Inter (src/kk-font.css). Перекрывается каждое место,
 * где гарнитура задана явно; всё остальное наследует её от body. Новый раздел
 * со своим font-family молча остался бы на своём шрифте в казахском — этот тест
 * краснеет, пока такое место не перекрыто в kk-font.css или не объяснено ниже.
 */
const SRC = path.dirname(fileURLToPath(import.meta.url))
const KK = fs.readFileSync(path.join(SRC, 'kk-font.css'), 'utf8')

// Явная гарнитура → чем она перекрыта в kk-font.css.
const COVERED = {
  'styles.css | body': "html[data-ui-lang='kk'] body",
  'styles.css | .screen': "html[data-ui-lang='kk'] .screen",
  'mobile/base.css | body': "html[data-ui-lang='kk'] body",
  'mobile/home.css | .hm': "html[data-ui-lang='kk'] .hm",
  'trial.css | .trial': "html[data-ui-lang='kk'] .trial",
  'landing.css | .ld': ".ld[lang='kk']",
  'landing.css | .ld-tear': ".ld[lang='kk'] .ld-tear",
  'landing.css | .ld-footer': ".ld[lang='kk'] .ld-footer",
  'sat.css | .st-ref__f': "html[data-ui-lang='kk'] .st-ref__f",
  'sat.css | .st-wb__input': "html[data-ui-lang='kk'] .st-wb__input",
}

function cssFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return cssFiles(p)
    return p.endsWith('.css') ? [p] : []
  })
}

// Все правила с явной гарнитурой: font-family или шорткат font с названием.
function explicitFonts() {
  const found = []
  for (const file of cssFiles(SRC)) {
    const rel = path.relative(SRC, file).split(path.sep).join('/')
    if (rel === 'kk-font.css') continue
    // Комментарии заменяются пробелами, чтобы индексы не съезжали.
    const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
    const re = /(?<![-\w])font(-family)?\s*:\s*([^;}]+)/g
    let m
    while ((m = re.exec(css))) {
      const value = m[2].trim()
      if (/^(inherit|initial|unset)\b/.test(value)) continue
      if (!m[1] && !/['",]|var\(/.test(value)) continue
      // Моноширинные подписи «Глаголов» — стиль, а не язык.
      if (/var\(--vb-mono\)/.test(value)) continue
      const open = css.lastIndexOf('{', m.index)
      const start = Math.max(css.lastIndexOf('}', open - 1), css.lastIndexOf('{', open - 1)) + 1
      const selector = css.slice(start, open).replace(/\s+/g, ' ').trim()
      if (selector === '@font-face') continue
      found.push(`${rel} | ${selector}`)
    }
  }
  return found
}

// Перенесённые прототипы носят CSS строкой (src/practice/<раздел>/styles.js), и
// сканер выше их не видит. В Shadow DOM правило html[data-ui-lang] не
// дотягивается, поэтому у каждого движка своё решение — и проверка своя.
const PRACTICE = path.join(SRC, 'practice')
const ENGINES = {
  // Стили сказки вставляются в документ, а гарнитура — переменными на :root.
  fairytale: () => expect(KK).toMatch(/--ui:\s*var\(--kk-font\)[\s\S]*--body:\s*var\(--kk-font\)/),
  // Игра английская; казахский — только перевод с lang="kk", его и ловим.
  numbers: (css) => expect(css).toContain(`.nw [lang="kk"]{font-family:'Inter'`),
  // Прототип и так на Inter.
  speakspin: (css) => expect(css).toMatch(/font-family:Inter\b/),
}

describe('казахский интерфейс на Inter', () => {
  it('каждая явная гарнитура перекрыта в kk-font.css', () => {
    const missing = explicitFonts().filter((key) => !COVERED[key])
    expect(missing).toEqual([])
  })

  it('перекрытия из списка на месте в kk-font.css', () => {
    for (const selector of Object.values(COVERED)) expect(KK).toContain(selector)
  })

  it('каждый движок-прототип со своей гарнитурой знает про казахский', () => {
    const engines = fs
      .readdirSync(PRACTICE, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => {
        const file = path.join(PRACTICE, name, 'styles.js')
        return fs.existsSync(file) && /font-family\s*:/.test(fs.readFileSync(file, 'utf8'))
      })
    expect(engines.filter((name) => !ENGINES[name])).toEqual([])
    for (const name of engines) ENGINES[name](fs.readFileSync(path.join(PRACTICE, name, 'styles.js'), 'utf8'))
  })
})
