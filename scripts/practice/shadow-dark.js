// Тёмная тема разделов Практики, живущих в Shadow DOM: src/practice/<раздел>/styles.dark.js из светлых стилей раздела
// (styles.js). СГЕНЕРИРОВАН этим скриптом — руками не правят: правки — в SECTIONS ниже.
//
// Почему отдельный файл, а не правка styles.js (10.11.2026, «тёмная тема там не включается»). Глобальный тёмный слой
// src/theme-dark.generated.css в тень не проходит, а тень не видит атрибута на <html>, поэтому раздел оставался светлым
// при тёмном сайте. Тёмный слой считается тем же правилом брендбука, что и весь сайт (scripts/lib/dark-css.js →
// токены --dk-* из src/theme-dark.css), под :host([data-theme="dark"]) — атрибут ставит экран (src/practice/hostTheme.js).
// Ручная вторая палитра разошлась бы с сайтом (руководство отклонило первый набросок темы: «не сочетались цвета»).
// Стили этих разделов написаны руками (Prepositions, «Числа», SpeakSpin, Скорочтение, «Грамматика · игры») или их
// генератор требует прототип, которого в репозитории нет (Word Hunt; Pronunciation World собирается и из копии в
// __fixtures__) — поэтому слой пишется рядом, а генераторы Pronunciation и Word Hunt зовут этот скрипт сами.
// Tenses и Punctuation World (тот же механизм) пишут слой в свой styles.js — их генераторы работают без прототипа.
//
// Свежесть сверяет scripts/practice/shadow-dark.test.js: правка styles.js без перезапуска — красный тест.
//
// Запуск: node scripts/practice/shadow-dark.js [раздел…]   (без аргументов — все)

const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { darkShadowCss, HOST_DARK } = require('../lib/dark-css')

const ROOT = path.join(__dirname, '..', '..')
const D = HOST_DARK

// Раздел: папка в src/practice → имя экспорта светлых стилей; zones — светлые зоны (dark-css.js, zoneGuards): куски,
// нарисованные под иллюстрацию, а не под страницу, остаются в палитре прототипа; app — что правило по цвету не угадывает.
const SECTIONS = {
  // Pronunciation World: игра Echo Gates — нарисованное небо с воротами и словами прототипа. Баннер, плитки регионов и
  // шапки уроков — картинка мира под белой дымкой, текст лежит на дымке: в тёмной теме дымка — тёмное стекло той же
  // плотности (правило белого ореола в dark-css.js), так что текст читается на любой картинке, и зоны им не нужны.
  pronunciation: { css: 'PRONUNCIATION_CSS', zones: { lightZones: ['.game'] } },
  // Prepositions World: шапки главной, категории и урока — картинка мира под своей дымкой (картинку движок кладёт своим
  // <style>, .art-<категория>; тёмная копия правила .art-place прототипа с поднятой специфичностью её бы перебила),
  // сцена урока и практики — нарисованный мир с предметами.
  prepositions: { css: 'PREPOSITIONS_CSS', zones: { lightZones: ['.hero', '.cat-head', '.ls-head', '.scene'] } },
  // «Числа»: баннер, шапки миров, Lab и шапка объяснения — текст поверх картинки миров под своей тёмной дымкой;
  // обложки карточек и игровая сцена — остров с табличками и фишками числа на нарисованном небе; шапка итога —
  // картинка мира. Всё это — иллюстрация, а не страница. Цвет текста обложка и сцена наследуют от корня раздела.
  numbers: {
    css: 'NUMBERS_CSS',
    zones: {
      lightZones: ['.hero', '.world', '.lab-card', '.ls-head', '.cover', '.scene', '.banner'],
      zoneColor: { '.cover': 'var(--ink)', '.scene': 'var(--ink)' },
    },
  },
  speakspin: { css: 'SPEAKSPIN_CSS' },
  // Скорочтение: телесуфлёр тёмный и в светлой теме — сцена со своей палитрой; перекрась её, и белая кнопка «Стоп»
  // на тёмной полосе становится тёмной на тёмном.
  'speed-reading': { css: 'SPEED_READING_CSS', zones: { lightZones: ['.tele'] } },
  // Word Hunt: обложки уровней — картинка зоны с ярлыком уровня. Баннер главной зоной не сделать: на компьютере текст
  // лежит на картинке под своей фиолетовой дымкой (белый, правилом не меняется), а на телефоне подпись — карточка под
  // картинкой, и светлой зоной она осталась бы серо-белой плиткой на ночном небе. Ему нужна одна правка: --gold-lt по
  // имени — фон (тинт), а это золото букв «Hunt» и конца полосы прогресса — сплошной жёлтый бренда.
  wordhunt: {
    css: 'WORDHUNT_CSS',
    zones: { lightZones: ['.art'] },
    app: `${D}{--gold-lt:var(--dk-yellow)}`,
  },
  'grammar-games': { css: 'GRAMMAR_GAMES_CSS' },
}

const darkName = (name) => SECTIONS[name].css.replace(/_CSS$/, '_DARK_CSS')
const lightFile = (name) => path.join(ROOT, 'src', 'practice', name, 'styles.js')
const darkFile = (name) => path.join(ROOT, 'src', 'practice', name, 'styles.dark.js')

function renderDark(name, light) {
  const s = SECTIONS[name]
  if (!s) throw new Error(`нет раздела «${name}»`)
  if (typeof light !== 'string' || !light) throw new Error(`${name}: пустые светлые стили`)
  if (light.includes(D)) throw new Error(`${name}: в светлых стилях уже есть ${D} — тёмный слой пишется отдельно`)
  const dark = `${darkShadowCss(light, s.zones).css.trim()}\n${(s.app || '').trim()}`.trim()
  const lit = dark.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
  return `// Тёмный слой «${name}» для Shadow DOM. СГЕНЕРИРОВАН scripts/practice/shadow-dark.js из styles.js раздела —
// руками не править: правки — в SECTIONS генератора. Кладётся в тень ПОСЛЕ светлых стилей.

export const ${darkName(name)} = \`${lit}
\`
`
}

async function writeDark(name) {
  const mod = await import(pathToFileURL(lightFile(name)).href)
  const out = renderDark(name, mod[SECTIONS[name].css])
  fs.writeFileSync(darkFile(name), out)
  return out.length
}

module.exports = { SECTIONS, renderDark, writeDark, darkName, darkFile }

if (require.main === module) {
  const names = process.argv.slice(2)
  ;(async () => {
    for (const name of names.length ? names : Object.keys(SECTIONS)) {
      const n = await writeDark(name)
      console.log(`${path.relative(ROOT, darkFile(name))}: ${Math.round(n / 1024)} КБ`)
    }
  })().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
