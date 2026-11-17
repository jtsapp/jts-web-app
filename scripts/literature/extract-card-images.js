// Картинки для обложки карточки «Literature World» в «Практике»
// (scripts/build-practice-card-covers.js): материала раздела в репозитории нет
// (он на бэкенде), поэтому выбранные сцены прототипа — вход в книгу с четырьмя
// маскотами, Глобус и библиотека — лежат уменьшенными в
// data/practice-cards/lit-*.webp, как у Parts of Speech World.
//
// Запуск: node scripts/literature/extract-card-images.js --html "<путь к прототипу>"
// затем   node scripts/build-practice-card-covers.js literature

const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const P = require('./proto.js')

const OUT = path.join(__dirname, '..', '..', 'data', 'practice-cards')
// сцена прототипа → файл обложки; ширина — вдвое больше мини-карточки обложки (132 и 104 px)
const PICK = { entrance: ['lit-entrance.webp', 420], globe: ['lit-globe.webp', 320], library: ['lit-library.webp', 320] }

async function main() {
  const i = process.argv.indexOf('--html')
  if (i < 0) throw new Error('--html <путь к прототипу Literature World>')
  const { scenes } = P.dataOf(P.readHtml(process.argv[i + 1]))
  for (const [name, [file, width]] of Object.entries(PICK)) {
    const uri = scenes[name]
    if (!uri) throw new Error(`в прототипе нет сцены ${name}`)
    const out = await sharp(Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64')).resize({ width }).webp({ quality: 82 }).toBuffer()
    fs.writeFileSync(path.join(OUT, file), out)
    console.log(`${file}: ${Math.round(out.length / 1024)} КБ`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
