// CSS «Punctuation World» для Shadow DOM — из <style> прототипа, правками
// PATCHES (каждая обязана найтись ровно столько раз, сколько указано: иначе
// прототип поменялся и правку надо пересмотреть, а не наложить вслепую).
// Пишет src/practice/punctuation/styles.js — руками его не правят.
//
// Что меняется и почему:
// - @font-face (Onest, 4 начертания base64) выброшены: раздел — на шрифте
//   сайта. Гарнитура --font берёт --punct-font, который экран ставит из
//   вычисленного шрифта страницы (Manrope, на телефоне PT Root UI, в kk —
//   Inter). Перевод lang="kk" — на Inter, как у Pronunciation World.
// - :root → :host (переменные видны в тени); html[data-tr=…] → .punct[…]:
//   движок ставит перевод на корень раздела, а не на <html> приложения;
//   body → .punct; body.in-game → .punct.in-game (корень игры тёмный, но
//   прокрутку страницы не запираем: игра у нас — блок в колонке, а не вся
//   страница). html{scroll-padding-top} не дотянется из тени — вместо него
//   scroll-margin у секций (APP_CSS).
// - Ширина: прототип — страница во весь экран, раскладка по @media ширины окна
//   и кегли по vw. У нас раздел — колонка рядом с сайдбаром, поэтому корень
//   .punct — контейнер, и ширина считается по нему (@container, cqw). Игра
//   (.adv) и так контейнер размера — её @container и cqw/cqh не трогаем.
// - .adv.game: в прототипе 100dvh на всю страницу без шапки сайта; у нас игра —
//   блок в колонке высотой с окно (--punct-game-h может задать экран).
// - Тёмная тема (10.11.2026, «включение там не работает»): своей у прототипа
//   нет, а глобальный слой src/theme-dark.generated.css в тень не проходит.
//   Тёмный слой собирается здесь тем же правилом брендбука, что и у всего
//   сайта (scripts/lib/dark-css.js → токены --dk-* из src/theme-dark.css), под
//   :host([data-theme="dark"]) — атрибут ставит экран по теме приложения
//   (src/practice/hostTheme.js).
//
// Fixed-слои движка (тост, вспышка портала, искры, выбор знака, летящий знак)
// остаются position:fixed внутри .punct: контейнер inline-size не держит их
// (только стиль и размер), они считаются от окна — проверено в Chrome 157.
//
// Запуск: node scripts/punctuation/extract-styles.js --html "<путь к прототипу>"
// (или без --html — с урезанной копией из __fixtures__: стили в ней те же).

const fs = require('node:fs')
const path = require('node:path')
const { darkShadowCss, HOST_DARK } = require('../lib/dark-css')

const ROOT = path.join(__dirname, '..', '..')
const FIXTURE = path.join(ROOT, 'src', 'practice', 'punctuation', '__fixtures__', 'prototype-mini.html')
const OUT = path.join(ROOT, 'src', 'practice', 'punctuation', 'styles.js')

const KK = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"

// [что найти, на что заменить, сколько раз должно найтись]
const PATCHES = [
  // комментарии прототипа (бренд, семьи знаков) в тени не нужны
  [/\/\*[\s\S]*?\*\//g, '', null],
  [/@font-face\{[^}]*\}/g, '', null],
  [':root{', ':host{', 1],
  ['--font:"Onest",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;', '--font:var(--punct-font,inherit);', 1],
  ['html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:84px}', '', 1],
  ['body{margin:0;font-family:var(--font);', '.punct{margin:0;font-family:var(--font);', 1],
  [' body{font-size:16px}', ' .punct{font-size:16px}', 1],
  ['body.in-game{background:#2B2450;overflow:hidden}', '.punct.in-game{background:#2B2450}', 1],
  [/html\[data-tr=(ru|kk)\]/g, '.punct[data-tr=$1]', 4],
  ['.adv.game{height:100vh;height:100dvh}', '.adv.game{height:var(--punct-game-h,100dvh)}', 1],
  [/@media \(((?:max|min)-width:\d+px)\)/g, '@container punct ($1)', 9],
  [/(\d)vw\b/g, '$1cqw', 11],
]

// Своё приложения: корень — контейнер ширины, казахский перевод — на Inter; секции урока и острова встают под
// липкую шапку раздела и полосу шагов (в прототипе это делал html{scroll-padding-top:84px}).
const APP_CSS = `
.punct{container:punct/inline-size;overflow-wrap:break-word}
.punct [lang="kk"]{font-family:${KK}}
.punct .lsec,.punct .gate,.punct .sec{scroll-margin-top:84px}
`

// Что правило тёмной темы по цвету не угадывает. --violet-d у прототипа — текстовый фиолетовый (ссылки, надзаголовки,
// знак урока): сплошной фиолетовый бренда мелким текстом на графите не читается (3.7:1), поэтому — его текстовая
// ступень, а единственная заливка им (наведение на главную кнопку) — тёмная ступень заливки. --line2 — рамка
// кнопок-плашек: палитра свела бы её к --line, и плашки слились бы с фоном.
// Светлые зоны тёмной темы (scripts/lib/dark-css.js, zoneGuards): баннер главной — картинка во весь блок, текст лежит
// на её светлом небе; приключение — сцена со своими табличками и фишками знаков. Обе нарисованы под иллюстрацию, а не
// под страницу, поэтому остаются в палитре прототипа, как картинка. Цвет текста .hero наследует от корня раздела
// (в тёмной теме — белый), поэтому ему он возвращается; у .adv свой (#fff).
const DARK_ZONES = { lightZones: ['.hero', '.adv'], zoneColor: { '.hero': 'var(--ink)' } }

const DARK_APP_CSS = `
${HOST_DARK}{color-scheme:dark;--violet-d:var(--dk-acc-text);--line2:var(--dk-line-strong)}
${HOST_DARK} .btn-p:hover{background:var(--dk-acc-strong)}
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
  for (const bad of [/(^|[}\s,])(html|body)\s*[{.[]/, /:root\b/, /@font-face/, /Onest/, /\d(vw)\b/, /@media \((max|min)-width/]) {
    if (bad.test(css)) throw new Error(`после правок осталось ${bad}`)
  }
  if (/[`\\]|\$\{/.test(css)) throw new Error('в CSS обратная кавычка, \\ или ${ — шаблонная строка их не перенесёт')
  const light = `${css.trim()}\n${APP_CSS.trim()}`
  const dark = `${darkShadowCss(light, DARK_ZONES).css}\n${DARK_APP_CSS.trim()}`
  if (/[`\\]|\$\{/.test(dark)) throw new Error('в тёмном слое обратная кавычка, \\ или ${ — шаблонная строка их не перенесёт')
  const out = `// CSS «Punctuation World» для Shadow DOM. СГЕНЕРИРОВАН
// scripts/punctuation/extract-styles.js из <style> прототипа — руками не
// править: правки — в PATCHES/APP_CSS/DARK_APP_CSS генератора (там же — что
// и почему отличается от прототипа).

export const PUNCTUATION_CSS = \`${light}
${dark}
\`
`
  fs.writeFileSync(OUT, out)
  console.log(`styles.js: ${Math.round(out.length / 1024)} КБ`)
}

main()
