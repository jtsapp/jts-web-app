// Собирает спрайт шахматных фигур из исходных SVG набора Cburnett (data/chess-pieces/cburnett/).
// Набор — работа Colin M.L. Burnett, выпущен под тремя лицензиями (GFDL, BSD, GPL); мы берём его под BSD —
// текст и автор в public/chess/PIECES-LICENSE.txt. Файлы лежат как скачаны с Wikimedia Commons
// (Chess_<фигура><l|d>t45.svg): правка формы — это другой набор, а не «починка» этого.
//
// На выходе — src/screens/chess/piecesSprite.js: по фигуре на ключ (wp, bk…), внутренность её <svg>.
// Разметка только из этих файлов; сборка падает на всём, что умеет исполнять код или тянуть внешнее.
const fs = require('node:fs')
const path = require('node:path')

const SRC = path.join(__dirname, '..', 'data', 'chess-pieces', 'cburnett')
const OUT = path.join(__dirname, '..', 'src', 'screens', 'chess', 'piecesSprite.js')
const KEYS = ['wp', 'wn', 'wb', 'wr', 'wq', 'wk', 'bp', 'bn', 'bb', 'br', 'bq', 'bk']
const FORBIDDEN = /<script|<image|<foreignObject|\son\w+=|href=|url\(|<!ENTITY/i

const out = {}
for (const key of KEYS) {
  const raw = fs.readFileSync(path.join(SRC, `${key}.svg`), 'utf8')
  if (FORBIDDEN.test(raw)) throw new Error(`${key}.svg: в файле есть то, чего в фигуре быть не должно`)
  const m = /<svg\b([^>]*)>([\s\S]*)<\/svg>/.exec(raw)
  if (!m) throw new Error(`${key}.svg: не похоже на SVG`)
  const box = /viewBox="([^"]+)"/.exec(m[1])
  const size = /width="(\d+(?:\.\d+)?)"[^>]*height="(\d+(?:\.\d+)?)"/.exec(m[1])
  const viewBox = box ? box[1] : size ? `0 0 ${size[1]} ${size[2]}` : null
  if (viewBox !== '0 0 45 45') throw new Error(`${key}.svg: поле ${viewBox}, ждали 0 0 45 45`)
  out[key] = m[2].replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').replace(/> </g, '><').trim()
}

const body = KEYS.map((k) => `  ${k}: ${JSON.stringify(out[k])},`).join('\n')
fs.writeFileSync(OUT, `// Сгенерировано scripts/build-chess-pieces.js из data/chess-pieces/cburnett — руками не править.
// Фигуры — набор Cburnett (Colin M.L. Burnett), лицензия BSD: public/chess/PIECES-LICENSE.txt.
export const PIECE_VIEWBOX = '0 0 45 45'

export const PIECE_MARKUP = {
${body}
}
`)
console.log(`фигур: ${KEYS.length} → ${path.relative(process.cwd(), OUT)}`)
