// CSS «Parts of Speech World» для Shadow DOM — из <style> прототипа, правками
// PATCHES (каждая обязана найтись ровно столько раз, сколько указано: иначе
// прототип поменялся и правку надо пересмотреть, а не наложить вслепую).
// Пишет src/practice/partsofspeech/styles.js — руками его не правят — и следом
// тёмный слой styles.dark.js (scripts/practice/shadow-dark.js).
//
// Что меняется и почему:
// - Гарнитуры (PT Root UI, Golos Text, SF Pro, Literata с Google Fonts) сняты:
//   раздел — на шрифте сайта. Все пять переменных гарнитур (--display, --sans,
//   --serif, --f-ui, --f-tl) берут --pos-font, который экран ставит из
//   вычисленного шрифта страницы (Manrope, на телефоне PT Root UI, в kk —
//   Inter). Перевод lang="kk" — на Inter, как у Punctuation World.
// - :root → :host (переменные видны в тени); body → .posw: классы страницы
//   (full, page-*, in-practice, show-labels) движок ставит на корень раздела;
//   main → .main (главный ориентир страницы уже есть у приложения);
//   html{scroll-behavior} из тени не дотянется — выброшен.
// - Ширина: прототип — страница во весь экран, раскладка по @media ширины окна
//   и кегли по vw. У нас раздел — колонка рядом с сайдбаром, поэтому ширина
//   считается по ней (@container, cqw). Контейнер — ХОСТ тени, а не .posw:
//   часть правил @media красит сам корень (.posw.full …), а контейнер не может
//   спрашивать сам себя.
// - Шторка карты (nav.side в режиме full и на узком экране) у прототипа
//   position:fixed от левого края окна под шапкой 68px и уезжает влево за
//   экран. У нас слева сайдбар приложения — закрытая шторка легла бы на него.
//   Поэтому место — от шапки раздела (--pos-x / --pos-y ставит движок), а
//   закрытая шторка не уезжает, а гаснет (APP_CSS).
//
// Fixed-слои движка (конфетти, искры, шторка) остаются position:fixed внутри
// корня: контейнер inline-size не держит их, они считаются от окна — как у
// Punctuation World.
//
// Запуск: node scripts/partsofspeech/extract-styles.js --html "<путь к прототипу>"
// (или без --html — с копией из __fixtures__: стили в ней те же).

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..', '..')
const FIXTURE = path.join(ROOT, 'src', 'practice', 'partsofspeech', '__fixtures__', 'prototype-mini.html')
const OUT = path.join(ROOT, 'src', 'practice', 'partsofspeech', 'styles.js')

const KK = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
const DRAWER = 'position:fixed;left:0;top:68px;'
const DRAWER_APP = 'position:fixed;left:var(--pos-x,0px);top:var(--pos-y,68px);'

// [что найти, на что заменить, сколько раз должно найтись]
const PATCHES = [
  // комментарии прототипа (бренд, версии слоёв) в тени не нужны
  [/\/\*[\s\S]*?\*\//g, '', null],
  [':root{', ':host{', 4],
  [/--(display|sans|serif|f-ui|f-tl):[^;]*;/g, '--$1:var(--pos-font,inherit);', 8],
  ['html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}', '', 1],
  [/(?<![-\w.#])body(?=[.:{\s,])/g, '.posw', 31],
  [/(?<![-\w.#])main(?=[\s{,>])/g, '.main', 7],
  [DRAWER + 'width:min(360px,88vw);height:calc(100vh - 68px);', DRAWER_APP + 'width:min(360px,88vw);height:calc(100vh - var(--pos-y,68px));', 1],
  [DRAWER + 'width:min(340px,88vw);height:calc(100vh - 68px);', DRAWER_APP + 'width:min(340px,88vw);height:calc(100vh - var(--pos-y,68px));', 1],
  // на телефоне прототип сдвигал шторку под шапку 60px — у нас её место уже считает движок
  ['nav.side,.posw.full nav.side{top:60px;height:calc(100vh - 60px)}', '', 1],
  [/@media \(((?:max|min)-width:\d+px)\)/g, '@container posw ($1)', 29],
  [/(\d)vw\b/g, '$1cqw', 59],
]

// Своё приложения: хост — контейнер ширины; казахский перевод — на Inter; закрытая шторка карты гаснет на месте,
// а не уезжает влево (там сайдбар приложения); кнопка «назад» из раздела — круглая, как «Map» на телефоне.
const APP_CSS = `
:host{display:block;container:posw/inline-size}
.posw{overflow-wrap:break-word}
.posw [lang="kk"]{font-family:${KK}}
.posw.full nav.side{transform:none;opacity:0;visibility:hidden;transition:opacity .2s var(--ease),visibility 0s .2s}
.posw.full nav.side.open{opacity:1;visibility:visible;transition:opacity .2s var(--ease)}
@container posw (max-width:980px){
  .posw nav.side{transform:none;opacity:0;visibility:hidden;transition:opacity .2s var(--ease),visibility 0s .2s}
  .posw nav.side.open{opacity:1;visibility:visible;transition:opacity .2s var(--ease)}
}
.posw .top .exit-btn{display:inline-flex;padding:8px}
.posw .top .exit-btn[hidden]{display:none!important}
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
  for (const bad of [/(^|[}\s,])(html|body|main)\s*[{.[:]/, /:root\b/, /@font-face/, /Golos|Literata|PT Root|SF Pro/, /\d(vw)\b/, /@media \((max|min)-width/]) {
    if (bad.test(css)) throw new Error(`после правок осталось ${bad}`)
  }
  if (/[`\\]|\$\{/.test(css)) throw new Error('в CSS обратная кавычка, \\ или ${ — шаблонная строка их не перенесёт')
  const out = `// CSS «Parts of Speech World» для Shadow DOM. СГЕНЕРИРОВАН
// scripts/partsofspeech/extract-styles.js из <style> прототипа — руками не
// править: правки — в PATCHES/APP_CSS генератора (там же — что и почему
// отличается от прототипа).

export const PARTSOFSPEECH_CSS = \`${css.trim()}
${APP_CSS.trim()}
\`
`
  fs.writeFileSync(OUT, out)
  console.log(`styles.js: ${Math.round(out.length / 1024)} КБ`)
}

main()
// Тёмная тема: своей у прототипа нет, глобальный слой в тень не проходит — тёмный слой собирается из только что
// записанных стилей тем же правилом брендбука, что и весь сайт (scripts/practice/shadow-dark.js → styles.dark.js).
// Иначе новая версия прототипа оставила бы тёмную тему старой.
require('../practice/shadow-dark').writeDark('partsofspeech').then((n) => console.log(`styles.dark.js: ${Math.round(n / 1024)} КБ`))
