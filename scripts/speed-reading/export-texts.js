// Тексты Скорочтения из прототипа кабинета → JSON для web-admin («Скорочтение» → «Импорт JSON»).
//
// Тексты живут на бэкенде (их правит контент-менеджер в админке), а первые восемь пришли в прототипе
// `data/jts-student-cabinet.html` литералом SR_TEXTS. Формат — как в прототипе ({id, lv, ic, t:{ru,kk,en}, x}):
// его же принимает импорт бэкенда, поэтому ничего не переименовываем — существующие id обновляются, новые
// создаются.
//
// Запуск: node scripts/speed-reading/export-texts.js [--html data/jts-student-cabinet.html] [--out build/speed-reading/texts.json]

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { sliceConst } = require('../lib/js-slice.js')

const ROOT = path.join(__dirname, '..', '..')

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

/** SR_TEXTS прототипа как массив; падает, если запись неполная — лучше упасть, чем залить брак. */
function readTexts(html) {
  const decl = sliceConst(html, 'SR_TEXTS')
  const list = vm.runInNewContext(`(${decl.replace(/^const\s+SR_TEXTS\s*=/, '')})`)
  if (!Array.isArray(list) || !list.length) throw new Error('SR_TEXTS пуст')
  for (const t of list) {
    const ok = t && t.id && t.lv && t.ic && t.t && t.t.ru && t.t.kk && t.t.en && typeof t.x === 'string' && t.x.trim()
    if (!ok) throw new Error(`неполный текст: ${JSON.stringify(t).slice(0, 120)}`)
  }
  return list.map((t) => ({ id: t.id, lv: t.lv, ic: t.ic, t: { ru: t.t.ru, kk: t.t.kk, en: t.t.en }, x: t.x }))
}

if (require.main === module) {
  const html = fs.readFileSync(path.resolve(ROOT, arg('--html', 'data/jts-student-cabinet.html')), 'utf8')
  const out = path.resolve(ROOT, arg('--out', 'build/speed-reading/texts.json'))
  const texts = readTexts(html)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(texts, null, 2) + '\n')
  console.log(`${texts.length} текстов → ${path.relative(ROOT, out)}`)
}

module.exports = { readTexts }
