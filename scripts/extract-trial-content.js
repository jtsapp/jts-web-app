// Вытаскивает из бандла школы (index.html — тест + слой пробного урока)
// содержимое урока в src/trial/content.generated.js:
//   START_LEVELS / LEVEL_DESC — выбор стартовой точки и описания уровней
//   ROUTING_A1 / TOBE_MCQ     — задания разминки и мини-урока TO BE
//   VOCAB_MATCH / PREREAD_VOCAB — словарные пары по уровням
//   READING                   — тексты чтения с вопросами
//   VIDEO_FILL                — клипы с пропусками
//
// Движок и банк заданий берёт scripts/extract-placement.js — здесь только
// контент слоя урока, которого в тесте нет. Аудио и видео (jts-bank/) уже
// лежат в public/practice/placement и не трогаются.
//
// Запуск: node scripts/extract-trial-content.js [путь-к-index.html]
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = process.argv[2] || path.join(ROOT, '.trial-src/index.html')
const OUT = path.join(ROOT, 'src/trial/content.generated.js')

// Те же объявления, что в слое урока бандла (JTS TRIAL LESSON LAYER).
const DECLS = [
  'const START_LEVELS = ',
  'const LEVEL_DESC = ',
  'const ROUTING_A1 = ',
  'const VOCAB_MATCH = ',
  'const TOBE_MCQ = ',
  'const READING = ',
  'const PREREAD_VOCAB = ',
  'const VIDEO_FILL = ',
]

/** Вырезает сбалансированный литерал (объект или массив) после `имя = `.
 *  Копия helper'а из extract-placement.js: тот же бандл, тот же приём. */
function literalAfter(src, declaration) {
  const at = src.indexOf(declaration)
  if (at < 0) throw new Error(`не найдено объявление: ${declaration}`)
  // Массив или объект — решаем по тому, что стоит первым после `=`, а не по
  // тексту объявления: в слое урока есть и `const READING = {`, и
  // `const ROUTING_A1 = [`.
  const from = at + declaration.length - 1
  const sq = src.indexOf('[', from)
  const br = src.indexOf('{', from)
  const start = sq >= 0 && (br < 0 || sq < br) ? sq : br
  const open = src[start]
  const close = open === '[' ? ']' : '}'
  let depth = 0
  let inStr = null
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === inStr) inStr = null
    } else if (c === '"' || c === "'" || c === '`') inStr = c
    else if (c === open) depth++
    else if (c === close && --depth === 0) return src.slice(start, i + 1)
  }
  throw new Error(`литерал ${declaration} оборван`)
}

const html = fs.readFileSync(SRC, 'utf8')

const parts = DECLS.map((decl) => {
  const name = decl.replace('const ', '').replace(' = ', '')
  return `export const ${name} = ${literalAfter(html, decl)}\n`
})

const header = `// СГЕНЕРИРОВАНО scripts/extract-trial-content.js — не править руками.
// Источник: слой пробного урока в бандле школы (index.html). Меняется контент
// урока — правь бандл и прогоняй скрипт заново, иначе правка потеряется при
// следующей выгрузке.
/* eslint-disable */

`

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, header + parts.join('\n'))

const kb = Math.round(fs.statSync(OUT).size / 1024)
console.log(`content.generated.js — блоков ${DECLS.length} (${kb} KB)`)
