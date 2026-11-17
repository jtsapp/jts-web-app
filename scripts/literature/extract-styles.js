// CSS «Literature World» для Shadow DOM — из трёх <style> прототипа (основной,
// #words-x, #lw-img) правками PATCHES (каждая обязана найтись ровно столько
// раз, сколько указано: иначе прототип поменялся и правку надо пересмотреть, а
// не наложить вслепую). Пишет src/practice/literature/styles.js — руками его не
// правят — и следом тёмный слой styles.dark.js (scripts/practice/shadow-dark.js).
//
// Что меняется и почему:
// - Гарнитуры с Google Fonts (Onest, PT Root UI, SF Pro, Cormorant Garamond,
//   EB Garamond, Newsreader) не грузим. Интерфейс (--ui, --text) — шрифт сайта
//   --lit-font, который экран ставит из вычисленного шрифта страницы (Manrope,
//   на телефоне PT Root UI, в kk — Inter); литература (--lit, --display) —
//   системный serif (Georgia). Интерфейс раздела по-казахски (lang="kk" на
//   корне) — на Inter, как весь казахский сайт.
// - :root → :host (переменные видны в тени); body → .lw (корень раздела);
//   html{scroll-behavior}, html{background} из тени не дотянутся — выброшены.
// - Тема мира: [data-theme=…] → [data-lw-theme=…]: движок ставит её на корень
//   раздела (и на карточки «Периодов»), а data-theme на хосте — тема
//   приложения (watchAppTheme), её трогать нельзя.
// - Ширина: прототип — страница во весь экран, раскладка по @media ширины окна
//   и кегли по vw. У нас раздел — колонка рядом с сайдбаром, поэтому ширина
//   считается по ней (@container, cqw). Контейнер — ХОСТ тени, а не .lw: часть
//   правил красит сам корень, а контейнер не может спрашивать сам себя.
//   Высоты по окну (70vh у сцен) — как есть: окно у раздела то же. Только герой
//   входа (100svh − шапка раздела) ещё вычитает --lit-above — полосу приложения
//   над разделом («← В Практику»), её ставит экран: иначе ряд цифр героя уходил
//   под край окна.
//
// Fixed-слой (окно «About») остаётся position:fixed внутри корня: контейнер
// inline-size не держит его, оно считается от окна — как у Punctuation World.
//
// Запуск: node scripts/literature/extract-styles.js [--html "<путь к прототипу>"]
// (без --html — с копией из __fixtures__: стили в ней те же).

const fs = require('node:fs')
const path = require('node:path')
const P = require('./proto.js')

const ROOT = path.join(__dirname, '..', '..')
const FIXTURE = path.join(ROOT, 'src', 'practice', 'literature', '__fixtures__', 'prototype-mini.html')
const OUT = path.join(ROOT, 'src', 'practice', 'literature', 'styles.js')

const KK = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"
const SERIF = "Georgia,'Times New Roman',serif"

// [что найти, на что заменить, сколько раз должно найтись]
const PATCHES = [
  // комментарии прототипа (версии слоёв, обоснования) в тени не нужны
  [/\/\*[\s\S]*?\*\//g, '', null],
  [':root{', ':host{', 4],
  [/--(ui|text):[^;]*;/g, '--$1:var(--lit-font,inherit);', 3],
  [/--(lit|display):[^;]*;/g, `--$1:${SERIF};`, 5],
  ['html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}', '', 1],
  ['html{background:var(--paper)}', '', 1],
  [/(?<![-\w.#])body(?=[.:{\s,[])/g, '.lw', 3],
  [/\[data-theme=/g, '[data-lw-theme=', 25],
  [/@media \(((?:max|min)-width:\d+px)\)(?: and \(((?:max|min)-width:\d+px)\))?/g, (m, a, b) => `@container lw (${a})${b ? ` and (${b})` : ''}`, 23],
  [/(\d)vw\b/g, '$1cqw', 39],
  ['height:calc(100svh - 62px)', 'height:calc(100svh - 62px - var(--lit-above,0px))', 1],
  ['min-height:calc(100svh - 58px)', 'min-height:calc(100svh - 58px - var(--lit-above,0px))', 1],
]

// Своё приложения: хост — контейнер ширины; корень — точка отсчёта для подсказки к слову (#pop: движок ставит её от
// корня раздела); казахский интерфейс — Inter; кнопка «назад» из раздела в шапке — круглая, как бургер; значок «на
// главную книги» вместо логотипа (подпись прототип прячет уже 1330 px); выбор уровня на телефоне — шире: логотипа нет,
// место освободилось, а «Все уровни» / «Барлық деңгей» в 86 px прототипа не влезали.
const APP_CSS = `
:host{display:block;container:lw/inline-size}
.lw{position:relative;overflow-wrap:break-word}
.lw[lang="kk"]{--ui:${KK};--text:${KK}}
.lw [lang="kk"]{font-family:${KK}}
.lw .lw-exit{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;flex:none;border:1px solid var(--line);border-radius:50%;background:none;color:inherit;cursor:pointer;padding:0}
.lw .lw-exit svg{width:20px;height:20px}
.lw .lw-exit[hidden]{display:none!important}
.lw .brand .lw-home{width:24px;height:24px;flex:none;color:var(--violet-ink)}
@container lw (max-width:640px){.lw #lvlSel{max-width:118px}}
`

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

const countOf = (css, find) => (typeof find === 'string' ? css.split(find).length - 1 : (css.match(find) || []).length)

/** CSS тени из трёх <style> прототипа. */
function extractStyles(html) {
  const styles = P.stylesOf(html)
  if (styles.length !== 3) throw new Error(`<style> в прототипе ${styles.length}, ждали 3`)
  let css = styles.map((s) => s.css).join('\n')
  for (const [find, repl, count] of PATCHES) {
    const n = countOf(css, find)
    if (count != null && n !== count) throw new Error(`правка «${find}» нашлась ${n} раз, ждали ${count}`)
    css = typeof find === 'string' ? css.split(find).join(repl) : css.replace(find, repl)
  }
  for (const bad of [/(^|[}\s,])(html|body|main)\s*[{.[:]/, /:root\b/, /@font-face|@import/, /Onest|PT Root|SF Pro|Cormorant|EB Garamond|Newsreader/, /\d(vw)\b/, /@media \((max|min)-width/, /data-theme=/]) {
    if (bad.test(css)) throw new Error(`после правок осталось ${bad}: ${css.match(bad)[0]}`)
  }
  if (/[`\\]|\$\{/.test(css)) throw new Error('в CSS обратная кавычка, \\ или ${ — шаблонная строка их не перенесёт')
  return `${css.replace(/\n{3,}/g, '\n\n').trim()}\n${APP_CSS.trim()}\n`
}

function main() {
  const css = extractStyles(P.readHtml(arg('--html') || FIXTURE))
  const out = `// CSS «Literature World» для Shadow DOM. СГЕНЕРИРОВАН
// scripts/literature/extract-styles.js из трёх <style> прототипа — руками не
// править: правки — в PATCHES/APP_CSS генератора (там же — что и почему
// отличается от прототипа).

export const LITERATURE_CSS = \`${css}\`
`
  fs.writeFileSync(OUT, out)
  console.log(`styles.js: ${Math.round(out.length / 1024)} КБ`)
  // Тёмная тема: своей у прототипа нет, глобальный слой в тень не проходит — тёмный слой собирается из только что
  // записанных стилей тем же правилом брендбука, что и весь сайт (scripts/practice/shadow-dark.js → styles.dark.js).
  return require('../practice/shadow-dark').writeDark('literature').then((n) => console.log(`styles.dark.js: ${Math.round(n / 1024)} КБ`))
}

module.exports = { PATCHES, APP_CSS, extractStyles }

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
