// Бандл Word Hunt ровно по контракту /mobile/word-hunt (docs/superpowers/specs/
// 2026-10-25-word-hunt-design.md, «Бандл») — до выката бэкенда: для e2e
// (page.route('**/mobile/word-hunt**')) и локального просмотра экрана.
//
// db, fields, clueq — как в файле; aud и pics — те же ключи, а медиа остаются
// data-URI (у бэкенда на их месте ссылки MinIO — движку всё равно, что лежит в
// src). Бэкенд собирает бандл тем же разбором литералов, без исполнения JS.
//
// Запуск: node scripts/wordhunt/make-bundle.js "<прототип или prototype-mini.html>" "<out.json>" [--release N]

const fs = require('node:fs')
const path = require('node:path')
const { readPrototype, engineSha } = require('./read-prototype.js')

function main() {
  const [src, out] = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--release')
  if (!src || !out) throw new Error('node scripts/wordhunt/make-bundle.js <прототип.html> <out.json> [--release N]')
  const ri = process.argv.indexOf('--release')
  const release = ri > 0 ? Number(process.argv[ri + 1]) : 1
  const html = fs.readFileSync(src, 'utf8')
  const p = readPrototype(html)
  const bundle = {
    release,
    uploadedAt: '2026-10-25T00:00:00Z',
    engineSha: engineSha(html),
    db: p.DB,
    fields: p.FIELDS,
    clueq: p.CLUEQ,
    aud: p.AUD,
    pics: p.PICS,
  }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(bundle))
  const kb = Math.round(fs.statSync(out).size / 1024)
  console.log(`${out}: ${kb} КБ, release ${release}, engineSha ${bundle.engineSha.slice(0, 16)}…`)
}

main()
