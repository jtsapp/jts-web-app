// Пакет «Чтения» для админки: тексты public/practice/reading/<уровень>.json — в
// zip формата jts-practice-pack (контракт — backend docs/practice/PACK_FORMAT.md,
// раздел reading). Его заливают в дев-админку («Библиотека → Чтение → Перенос
// между стендами»), проверяют дев-сайт, потом тот же zip — в прод-админку.
//
//   node scripts/practice-pack/build-reading.js [--out build/practice-packs/reading.zip]
//
// Медиа у раздела нет (обложка — эмодзи), поэтому в zip только манифест и
// тексты. Тексты уходят как лежат в файлах сайта — id, порядок и level
// заглавными: бэкенд отдаёт их обратно ровно в этой форме.
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { zipSync } = require('../lib/zip.js')

const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
const ROOT = path.resolve(__dirname, '..', '..')

function buildReadingPack({ root = ROOT, source = 'jts-web-app', now = new Date() } = {}) {
  const items = []
  const counts = {}
  for (const level of LEVELS) {
    const file = path.join(root, 'public/practice/reading', `${level}.json`)
    if (!fs.existsSync(file)) continue
    const { texts } = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!Array.isArray(texts)) throw new Error(`${file}: нет массива texts`)
    counts[level] = texts.length
    items.push(...texts)
  }
  const manifest = {
    format: 'jts-practice-pack',
    version: 1,
    section: 'reading',
    createdAt: now.toISOString(),
    source,
    counts: { ...counts, items: items.length },
    media: [],
  }
  return { manifest, items }
}

function packZip({ manifest, items }) {
  return zipSync([
    { name: 'manifest.json', data: JSON.stringify(manifest, null, 2) },
    { name: 'items.json', data: JSON.stringify(items) },
  ])
}

function gitSource(root) {
  try {
    return 'jts-web-app@' + execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
  } catch {
    return 'jts-web-app'
  }
}

module.exports = { LEVELS, buildReadingPack, packZip }

if (require.main === module) {
  const i = process.argv.indexOf('--out')
  const out = path.resolve(ROOT, i > 0 ? process.argv[i + 1] : 'build/practice-packs/reading.zip')
  const pack = buildReadingPack({ source: gitSource(ROOT) })
  fs.mkdirSync(path.dirname(out), { recursive: true })
  const zip = packZip(pack)
  fs.writeFileSync(out, zip)
  console.log(`Чтение: ${pack.items.length} текстов, ${(zip.length / 1024).toFixed(0)} КБ → ${out}`)
  console.log(JSON.stringify(pack.manifest.counts))
}
