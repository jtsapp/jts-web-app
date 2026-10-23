// Пакет «Аудирования» для админки: задания public/practice/listening/content/<уровень>.json
// и их записи — в zip формата jts-practice-pack (контракт — backend
// docs/practice/PACK_FORMAT.md). Его заливают в дев-админку («Библиотека →
// Аудирование → Пакет»), проверяют дев-сайт, потом тот же zip — в прод-админку.
//
//   node scripts/practice-pack/build-listening.js [--out build/practice-packs/listening.zip]
//
// Имя записи — первые 24 hex sha256 содержимого: так админка ловит битый файл
// до заливки и не грузит повторно то, что на стенде уже лежит. Сам раздел
// данных не меняется — id, порядок и тексты заданий уходят как есть.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execSync } = require('child_process')
const { zipSync } = require('../lib/zip.js')

const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
const ROOT = path.resolve(__dirname, '..', '..')

function sha24(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 24)
}

function buildListeningPack({ root = ROOT, source = 'jts-web-app', now = new Date() } = {}) {
  const items = []
  const media = new Map()
  const counts = {}
  for (const level of LEVELS) {
    const file = path.join(root, 'public/practice/listening/content', `${level}.json`)
    if (!fs.existsSync(file)) continue
    const tasks = JSON.parse(fs.readFileSync(file, 'utf8'))
    counts[level] = tasks.length
    for (const task of tasks) {
      // readFileSync сам бросит с путём, если записи нет: дырявый пакет хуже упавшей сборки
      const bytes = fs.readFileSync(path.join(root, 'public/practice/listening/audio', level, task.audio))
      const name = `${sha24(bytes)}.mp3`
      media.set(name, bytes)
      items.push({ ...task, level, audio: `media/${name}` })
    }
  }
  const names = [...media.keys()].sort()
  const manifest = {
    format: 'jts-practice-pack',
    version: 1,
    section: 'listening',
    createdAt: now.toISOString(),
    source,
    counts: { ...counts, items: items.length },
    media: names.map((name) => ({ name, size: media.get(name).length })),
  }
  return { manifest, items, media }
}

function packZip({ manifest, items, media }) {
  return zipSync([
    { name: 'manifest.json', data: JSON.stringify(manifest, null, 2) },
    { name: 'items.json', data: JSON.stringify(items) },
    ...[...media.keys()].sort().map((name) => ({ name: `media/${name}`, data: media.get(name) })),
  ])
}

function gitSource(root) {
  try {
    return 'jts-web-app@' + execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
  } catch {
    return 'jts-web-app'
  }
}

module.exports = { LEVELS, sha24, buildListeningPack, packZip }

if (require.main === module) {
  const i = process.argv.indexOf('--out')
  const out = path.resolve(ROOT, i > 0 ? process.argv[i + 1] : 'build/practice-packs/listening.zip')
  const pack = buildListeningPack({ source: gitSource(ROOT) })
  fs.mkdirSync(path.dirname(out), { recursive: true })
  const zip = packZip(pack)
  fs.writeFileSync(out, zip)
  console.log(`Аудирование: ${pack.items.length} заданий, ${pack.media.size} записей, ${(zip.length / 1048576).toFixed(1)} МБ → ${out}`)
  console.log(JSON.stringify(pack.manifest.counts))
}
