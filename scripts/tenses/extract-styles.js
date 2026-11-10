// CSS «Tenses World» для Shadow DOM — из <style> прототипа, правками PATCHES
// (каждая обязана найтись ровно столько раз, сколько указано: иначе прототип
// поменялся и правку надо пересмотреть, а не наложить вслепую).
// Пишет src/practice/tenses/styles.js — руками его не правят.
//
// Что меняется и почему:
// - шрифты прототипа (PT Root UI, Onest с Google Fonts, SF Pro) не переносятся:
//   --font-head/--font-body берут --tw-font, который экран ставит из
//   вычисленного шрифта страницы (Manrope, на телефоне PT Root UI, в kk —
//   Inter). Перевод на казахский (lang="kk" на корне раздела — движок ставит его
//   туда, где прототип ставил на <html>) — на Inter, как весь казахский
//   интерфейс приложения;
// - :root → :host (переменные видны в тени), body → .tws, html — без правил:
//   своего <html> и <body> у раздела нет;
// - ширина: прототип — страница во весь экран, раскладка по @media ширины окна
//   и кегли по vw. У нас раздел — колонка рядом с сайдбаром, поэтому корень .tws
//   — контейнер, и ширина считается по нему (@container, cqw).
//
// Запуск: node scripts/tenses/extract-styles.js --html "<путь к прототипу>"
// (или без --html — с копией из __fixtures__: стили в ней те же).

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..', '..')
const FIXTURE = path.join(ROOT, 'src', 'practice', 'tenses', '__fixtures__', 'prototype-mini.html')
const OUT = path.join(ROOT, 'src', 'practice', 'tenses', 'styles.js')

const KK = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"

// [что найти, на что заменить, сколько раз должно найтись]
const PATCHES = [
  // комментарии прототипа (бренд-цвета, «v2: languages») в тени не нужны
  [/\/\*[\s\S]*?\*\//g, '', null],
  [':root {', ':host {', 1],
  ['html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }', '', 1],
  ['body { margin: 0; background: var(--bg);', '.tws { margin: 0; background: var(--bg);', 1],
  ['--font-head: "PT Root UI", "Onest", "SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif;', '--font-head: var(--tw-font, inherit);', 1],
  ['--font-body: "SF Pro Display", "Onest", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;', '--font-body: var(--tw-font, inherit);', 1],
  [/@media \(((?:max|min)-width: ?\d+px)\)/g, '@container tws ($1)', 12],
  [/(\d+(?:\.\d+)?)vw\b/g, '$1cqw', 14],
]

// Своё приложения: корень — контейнер ширины, казахский — на Inter. На телефоне шрифт сайта (PT Root UI) шире Onest
// прототипа, и «Continuous» в плитке карты (три в ряд, ~75 px) не влезал — плитка его обрезала (overflow: hidden),
// а перенос рвал слово «Continuou-s»: в узкой колонке кегль названия на две ступени меньше.
const APP_CSS = `
.tws { container: tws / inline-size; overflow-wrap: break-word; }
.tws[lang="kk"] { --font-head: ${KK}; --font-body: ${KK}; }
@container tws (max-width: 400px) { .tile h3 { font-size: 13px; letter-spacing: -.01em; } }
`

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

function main() {
  const html = fs.readFileSync(arg('--html') || FIXTURE, 'utf8').replace(/\r\n?/g, '\n')
  const open = html.indexOf('<style>')
  const close = html.indexOf('</style>', open)
  if (open < 0 || close < 0) throw new Error('нет <style>')
  let css = html.slice(open + '<style>'.length, close)
  for (const [find, repl, count] of PATCHES) {
    const n = typeof find === 'string' ? css.split(find).length - 1 : (css.match(find) || []).length
    if (count != null && n !== count) throw new Error(`правка «${find}» нашлась ${n} раз, ждали ${count}`)
    css = typeof find === 'string' ? css.split(find).join(repl) : css.replace(find, repl)
  }
  for (const bad of [/(^|[}\s,])(html|body)\s*\{/, /:root\b/, /@font-face/, /Onest|PT Root UI|SF Pro/, /\d(vw)\b/, /@media \((max|min)-width/]) {
    if (bad.test(css)) throw new Error(`после правок осталось ${bad}`)
  }
  if (/[`\\]|\$\{/.test(css)) throw new Error('в CSS обратная кавычка, \\ или ${ — шаблонная строка их не перенесёт')
  css = css.replace(/\n{3,}/g, '\n\n').trim()
  const out = `// CSS «Tenses World» для Shadow DOM. СГЕНЕРИРОВАН scripts/tenses/extract-styles.js
// из <style> прототипа — руками не править: правки — в PATCHES/APP_CSS генератора
// (там же — что и почему отличается от прототипа).

export const TENSES_CSS = \`${css}
${APP_CSS.trim()}
\`
`
  fs.writeFileSync(OUT, out)
  console.log(`styles.js: ${Math.round(out.length / 1024)} КБ`)
}

main()
