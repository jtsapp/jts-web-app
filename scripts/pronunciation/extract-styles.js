// CSS «Pronunciation World» для Shadow DOM — из <style> прототипа, правками
// PATCHES (каждая обязана найтись ровно столько раз, сколько указано: иначе
// прототип поменялся и правку надо пересмотреть, а не наложить вслепую).
// Пишет src/practice/pronunciation/styles.js — руками его не правят.
//
// Что меняется и почему:
// - @font-face (Onest, JTS IPA; 320 КБ base64) выброшены: раздел — на шрифте
//   сайта. Гарнитуры --head/--ui берут --pron-font, который экран ставит из
//   вычисленного шрифта страницы (Manrope, на телефоне PT Root UI, в kk —
//   Inter); транскрипции (--ipa) — системным шрифтом с засечками из того же
//   стека прототипа, без встроенного JTS IPA. Перевод lang="kk" — на Inter,
//   как у «Чисел» и Prepositions World.
// - :root → :host (переменные видны в тени), :root[data-tr|data-audio] →
//   .pron[…]: движок ставит эти атрибуты на корень раздела, а не на <html>
//   приложения; body → .pron.
// - Ширина: прототип — страница во весь экран, раскладка по @media ширины окна
//   и поля по 100vw. У нас раздел — колонка рядом с сайдбаром, поэтому корень
//   .pron — контейнер, и ширина считается по нему (@container, cqw).
// - .game: в прототипе position:fixed на весь экран; у нас игра — блок в
//   колонке высотой с окно (--pron-game-h ставит экран), иначе она легла бы
//   на сайдбар и шапку приложения.
//
// Запуск: node scripts/pronunciation/extract-styles.js --html "<путь к прототипу>"
// (или без --html — с урезанной копией из __fixtures__: стили в ней те же).

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..', '..')
const FIXTURE = path.join(ROOT, 'src', 'practice', 'pronunciation', '__fixtures__', 'prototype-mini.html')
const OUT = path.join(ROOT, 'src', 'practice', 'pronunciation', 'styles.js')

const KK = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"

// [что найти, на что заменить, сколько раз должно найтись]
const PATCHES = [
  // комментарии прототипа (про Onest и встроенные шрифты) в тени не нужны
  [/\/\*[\s\S]*?\*\//g, '', null],
  [/@font-face\{[^}]*\}/g, '', null],
  [':root{', ':host{', 2],
  [':root[', '.pron[', 8],
  ['html{-webkit-text-size-adjust:100%}', '', 1],
  ['body{margin:0;background:var(--paper)', '.pron{margin:0;background:var(--paper)', 1],
  ['body{background:var(--sky);background-color:var(--paper);min-height:100vh}', '.pron{background:var(--sky);background-color:var(--paper);min-height:100vh}', 1],
  ['--head:"Onest","JTS IPA",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;', '--head:var(--pron-font,inherit);', 1],
  ['--ui:"Onest","JTS IPA",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;', '--ui:var(--pron-font,inherit);', 1],
  ['--ipa:"JTS IPA","Charis SIL","Doulos SIL","Noto Serif",serif;', '--ipa:"Charis SIL","Doulos SIL","Noto Serif",serif;', 1],
  ['.game{position:fixed;inset:0;', '.game{position:relative;height:var(--pron-game-h,100dvh);', 1],
  ['@media (min-width:1000px) and (min-height:640px){ .g-mate.companion{opacity:1;transform:none} }', '@media (min-height:640px){@container pron (min-width:1000px){ .g-mate.companion{opacity:1;transform:none} }}', 1],
  [/@media \(((?:max|min)-width:\d+px)\)/g, '@container pron ($1)', 18],
  [/(\d+)vw\b/g, '$1cqw', 16],
]

// Своё приложения: корень — контейнер ширины, казахский перевод — на Inter.
const APP_CSS = `
.pron{container:pron/inline-size;overflow-wrap:break-word}
.pron [lang="kk"]{font-family:${KK}}
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
  for (const bad of [/(^|[}\s,])(html|body)\s*\{/, /:root\b/, /@font-face/, /Onest|JTS IPA/, /\d(vw)\b/, /@media \((max|min)-width/]) {
    if (bad.test(css)) throw new Error(`после правок осталось ${bad}`)
  }
  if (/[`\\]|\$\{/.test(css)) throw new Error('в CSS обратная кавычка, \\ или ${ — шаблонная строка их не перенесёт')
  const out = `// CSS «Pronunciation World» для Shadow DOM. СГЕНЕРИРОВАН
// scripts/pronunciation/extract-styles.js из <style> прототипа — руками не
// править: правки — в PATCHES/APP_CSS генератора (там же — что и почему
// отличается от прототипа).

export const PRONUNCIATION_CSS = \`${css.trim()}
${APP_CSS.trim()}
\`
`
  fs.writeFileSync(OUT, out)
  console.log(`styles.js: ${Math.round(out.length / 1024)} КБ`)
}

main()
