// Оформление Word Hunt из прототипа: 26 картинок дизайна (обложка, шесть зон,
// четыре маскота, 15 спрайтов) — файлами в public/practice/wordhunt/img/, и CSS
// для Shadow DOM — src/practice/wordhunt/styles.js.
//
// Картинки в прототипе вшиты в CSS (`.hero{--hero:url(data:image/webp…)}`), и
// 0,9 МБ base64 в бандле сайта браузер разбирал бы на каждый заход. Файлы
// кэшируются и грузятся, только когда видны.
//
// styles.js ГЕНЕРИРУЕТСЯ этим скриптом — руками его не правят: новая версия
// прототипа = перезапуск. Все отличия от прототипа — правки ниже (PATCHES), и
// каждая обязана найтись ровно столько раз, сколько указано, иначе скрипт
// падает: молча не применившаяся правка вернула бы, например, чужой шрифт.
// Своё оформление приложения — слой APP_CSS в конце файла стилей.
//
// Запуск: node scripts/wordhunt/extract-assets.js "<путь к прототипу>"

const fs = require('node:fs')
const path = require('node:path')
const { readPrototype } = require('./read-prototype.js')

const ROOT = path.join(__dirname, '..', '..')
const IMG_DIR = path.join(ROOT, 'public', 'practice', 'wordhunt', 'img')
const STYLES = path.join(ROOT, 'src', 'practice', 'wordhunt', 'styles.js')
const IMG_URL = '/practice/wordhunt/img/'
const IMAGES = 26

// [что ищем, на что меняем, сколько раз обязано найтись, зачем]
const PATCHES = [
  // Переменные прототипа лежат на :root — внутри тени их не видно.
  [/:root\{/g, ':host{', 2, ':root → :host'],
  // Документ приложения прототипу не принадлежит: ни фон html, ни отступы body.
  [/^html\{[^}]*\}\n/gm, '', 1, 'правило html'],
  [/^html,body\{margin:0;padding:0\}\n/gm, '', 1, 'html,body'],
  // body прототипа — корень раздела .wh (фон неба, цвет текста).
  [/^body\{/gm, '.wh{', 1, 'body → .wh'],
  // Шрифт — сайта (Manrope, на телефоне PT Root UI, в казахском Inter): корень
  // наследует его у хоста тени. Свои PT Root UI / SF Pro прототипа выбили бы
  // раздел из приложения, а в казахском интерфейсе он остался бы не на Inter.
  [/^ {2}--f-d:[^\n]*\n {2}--f-b:[^\n]*\n/gm, '', 1, 'переменные шрифтов'],
  [/font-family:var\(--f-[db]\)/g, 'font-family:inherit', 43, 'гарнитуры'],
  // В шорткате font ключевое слово inherit недопустимо — раскладываем на свойства.
  [/font:(\d+) ([\d.]+px)\/([\d.]+px) var\(--f-[db]\)/g, 'font-weight:$1;font-size:$2;line-height:$3;font-family:inherit', 2, 'шорткаты font'],
]

// Слой приложения поверх стилей прототипа (не из прототипа).
const APP_CSS = `
/* ===================== слой приложения (scripts/wordhunt/extract-assets.js) ===================== */
/* Корень раздела — своя группа слоёв: z-index неба, шапки и окон не спорят со слоями приложения. */
.wh{position:relative;isolation:isolate;margin:0}
/* Небо прототипа — position:fixed на весь экран. В приложении слева сайдбар, и небо легло бы поверх
   него. Обёртка обрезает его по разделу (clip-path режет и fixed-потомков), а само небо остаётся
   неподвижным при прокрутке, как в прототипе. */
.sky-clip{position:absolute;inset:0;z-index:0;clip-path:inset(0);pointer-events:none}
/* Логотип и переключатель RU/KZ сняты (язык — интерфейса приложения): в шапке остаётся название. */
.brand .sep{display:none}
`

function main() {
  const src = process.argv[2]
  if (!src) throw new Error('путь к прототипу: node scripts/wordhunt/extract-assets.js "<jtswordhunt.html>"')
  const proto = readPrototype(fs.readFileSync(src, 'utf8'))
  if (proto.styles.length !== 1) throw new Error(`<style> ${proto.styles.length}, ждали один`)
  let css = proto.styles[0].body.replace(/\r\n?/g, '\n')

  fs.mkdirSync(IMG_DIR, { recursive: true })
  const written = []
  css = css.replace(/^\.([A-Za-z0-9-]+)\{--([a-z]+):url\(data:image\/webp;base64,([A-Za-z0-9+/=]+)\)\}$/gm, (m, cls, prop, b64) => {
    const file = `${cls}.webp`
    fs.writeFileSync(path.join(IMG_DIR, file), Buffer.from(b64, 'base64'))
    written.push(file)
    return `.${cls}{--${prop}:url("${IMG_URL}${file}")}`
  })
  if (written.length !== IMAGES) throw new Error(`картинок в CSS ${written.length}, ждали ${IMAGES}`)
  if (/data:image/.test(css)) throw new Error('в CSS остались data-URI картинок')

  for (const [re, to, count, what] of PATCHES) {
    const n = (css.match(re) || []).length
    if (n !== count) throw new Error(`правка «${what}»: найдено ${n}, ждали ${count}`)
    css = css.replace(re, to)
  }
  if (/var\(--f-[db]\)|@font-face|(?<![-\w])body\{/.test(css)) throw new Error('в CSS остались шрифты или body прототипа')

  css = css.trim() + '\n' + APP_CSS
  const lit = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
  const head = [
    '// CSS Word Hunt для Shadow DOM — СГЕНЕРИРОВАН scripts/wordhunt/extract-assets.js из прототипа',
    '// методиста, руками не править: новая версия прототипа = перезапуск скрипта, правки — в его PATCHES',
    '// и APP_CSS. Отличия от прототипа: :root → :host, body → корень .wh, картинки дизайна — файлами',
    '// /practice/wordhunt/img/, гарнитуры — inherit (шрифт сайта, в казахском — Inter), небо обрезано по',
    '// разделу (.sky-clip), логотип и RU/KZ сняты.',
    '',
  ].join('\n')
  fs.mkdirSync(path.dirname(STYLES), { recursive: true })
  fs.writeFileSync(STYLES, `${head}export const WORDHUNT_CSS = \`${lit}\`\n`)
  const kb = (n) => Math.round(n / 1024)
  const imgBytes = written.reduce((s, f) => s + fs.statSync(path.join(IMG_DIR, f)).size, 0)
  console.log(`картинок ${written.length} (${kb(imgBytes)} КБ) → ${path.relative(ROOT, IMG_DIR)}; styles.js ${kb(fs.statSync(STYLES).size)} КБ`)
}

main()
