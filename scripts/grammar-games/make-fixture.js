// Урезанная копия прототипа «Грамматики · игр» для тестов: вход оракула
// (scripts/grammar-games/extract-oracle.js) и ответы ручек бэкенда для vitest
// и e2e (bundle.json).
//
// Темы — по одной на уровень плюс особые случаи набора игр: L1-01, L1-10 (есть
// «Где это?»), L2-22 (нет «Разложи по корзинам»), L3-01, L4-01, L5-01 — у
// «Гонки» свой шаг на каждом уровне. Движок копируется байт в байт; маскоты и
// эмодзи — те же ключи с одной картинкой 8×8 (движку нужны ключи, а не
// пиксели); словарь и программа — целиком.
//
// После движка дописывается отдельный <script> с доступом для оракула:
// классические скрипты делят глобальную лексическую область, поэтому R, G и P
// движка видны второму скрипту, а сам движок остаётся нетронутым.
//
// Запуск: node scripts/grammar-games/make-fixture.js --html data/jtsgrammar-games.html

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const sharp = require('sharp')

const OUT = path.join(__dirname, '..', '..', 'src', 'practice', 'grammar-games', '__fixtures__')
const KEEP = ['L1-01', 'L1-10', 'L2-22', 'L3-01', 'L4-01', 'L5-01']

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

const at = (lines, name) => {
  const i = lines.findIndex((l) => l.startsWith(`const ${name}=`))
  if (i < 0) throw new Error(`в прототипе нет const ${name}`)
  return i
}
const value = (line, name) => line.slice(`const ${name}=`.length).replace(/;\s*$/, '')

// Набор игр темы — правилом самого прототипа (stagesOf), а не своей копией: бэкенд считает так же,
// и шапка темы в ответе /mobile/grammar-games несёт ровно этот список.
function stagesOfFrom(lines) {
  const src = lines.find((l) => l.startsWith('function stagesOf('))
  if (!src) throw new Error('в прототипе нет stagesOf')
  return vm.runInNewContext(`(${src.replace(/^function stagesOf/, 'function')})`)
}

async function main() {
  const src = arg('--html')
  if (!src) throw new Error('--html <путь к прототипу «Грамматики · игр»>')
  // рабочая копия в Windows приходит с CRLF (autocrlf) — строки режем по обоим, пишем LF
  const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/)
  const iLevels = at(lines, 'LEVELS')
  const iProgram = at(lines, 'PROGRAM')
  const iTopics = at(lines, 'TOPICS')
  const iGloss = at(lines, 'GLOSS')
  const iImg = at(lines, 'IMG')
  const iEmo = at(lines, 'EMO')
  if (!(iLevels < iProgram && iProgram < iTopics && iTopics < iGloss && iGloss < iImg && iImg < iEmo)) {
    throw new Error('порядок блоков данных в прототипе другой — проверьте раскладку')
  }

  const levels = JSON.parse(value(lines[iLevels], 'LEVELS'))
  const program = JSON.parse(value(lines[iProgram], 'PROGRAM'))
  const topics = JSON.parse(value(lines[iTopics], 'TOPICS'))
  const gloss = JSON.parse(value(lines[iGloss], 'GLOSS'))
  const img = vm.runInNewContext(`(${value(lines[iImg], 'IMG')})`)
  const emo = JSON.parse(value(lines[iEmo], 'EMO'))
  const stagesOf = stagesOfFrom(lines)

  const mini = KEEP.map((id) => {
    const tp = topics.find((t) => t.id === id)
    if (!tp) throw new Error(`нет темы ${id}`)
    return tp
  })

  const tiny = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 140, g: 110, b: 230, alpha: 1 } } })
    .webp({ quality: 50 })
    .toBuffer()
  const tinyUri = 'data:image/webp;base64,' + tiny.toString('base64')
  const tinyImg = Object.keys(img).map((k) => `${k}:'${tinyUri}'`).join(',')
  const tinyEmo = Object.fromEntries(Object.keys(emo).map((k) => [k, tinyUri]))

  const out = lines.map((line, i) => {
    if (i === iTopics) return `const TOPICS=${JSON.stringify(mini)};`
    if (i === iImg) return `const IMG={${tinyImg}};`
    if (i === iEmo) return `const EMO=${JSON.stringify(tinyEmo)};`
    // маскот шапки — base64 прямо в разметке; движку он не нужен
    if (i < iLevels && line.includes('class="mascot-top"')) return line.replace(/src="data:image\/webp;base64,[^"]+"/, `src="${tinyUri}"`)
    return line
  })
  const close = out.lastIndexOf('</body>')
  if (close < 0) throw new Error('нет </body>')
  out.splice(close, 0,
    '<script>window.__GG={get R(){return R},get G(){return G},get P(){return P},stagesOf,acc,look,wrapEN,norm,trail,go,TMAP};</script>')
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'prototype-mini.html'), out.join('\n'))

  // Ответы ручек бэкенда (контракт — backend docs/practice/GRAMMAR_GAMES.md): шапка темы — поля
  // id, lv, n, icon, color, title, sub и набор игр; тело темы — как в прототипе.
  const head = (tp) => ({ id: tp.id, lv: tp.lv, n: tp.n, icon: tp.icon, color: tp.color, title: tp.title, sub: tp.sub, games: stagesOf(tp) })
  const bundle = {
    index: { levels, program, topics: mini.map(head) },
    topics: Object.fromEntries(mini.map((tp) => [tp.id, tp])),
    gloss,
    progress: { stars: {} },
  }
  fs.writeFileSync(path.join(OUT, 'bundle.json'), JSON.stringify(bundle))
  const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024)
  console.log(`prototype-mini.html ${kb('prototype-mini.html')} КБ, bundle.json ${kb('bundle.json')} КБ; тем ${mini.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
