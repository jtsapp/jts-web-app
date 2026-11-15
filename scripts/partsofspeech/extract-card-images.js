// Картинки для обложки карточки «Parts of Speech World» в «Практике»
// (scripts/build-practice-card-covers.js): материала раздела в репозитории нет
// (он на бэкенде), поэтому выбранные картинки прототипа — баннер мира с
// четырьмя маскотами и остров глаголов — лежат уменьшенными в
// data/practice-cards/pos-*.webp, как у Punctuation и Pronunciation World.
//
// Запуск: node scripts/partsofspeech/extract-card-images.js --html "<путь к прототипу>"
// затем   node scripts/build-practice-card-covers.js partsofspeech

const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const { imagesOf } = require('./make-fixture.js')

const OUT = path.join(__dirname, '..', '..', 'data', 'practice-cards')
// имя картинки прототипа → файл обложки; ширина — вдвое больше мини-карточки обложки (132 и 104 px)
const PICK = { hero: ['pos-hero.webp', 420], r_foundry: ['pos-foundry.webp', 320] }

async function main() {
  const i = process.argv.indexOf('--html')
  if (i < 0) throw new Error('--html <путь к прототипу Parts of Speech World>')
  const images = imagesOf(fs.readFileSync(process.argv[i + 1], 'utf8').replace(/\r\n?/g, '\n'))
  for (const [name, [file, width]] of Object.entries(PICK)) {
    const uri = images[name]
    if (!uri) throw new Error(`в прототипе нет картинки ${name}`)
    const out = await sharp(Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64')).resize({ width }).webp({ quality: 82 }).toBuffer()
    fs.writeFileSync(path.join(OUT, file), out)
    console.log(`${file}: ${Math.round(out.length / 1024)} КБ`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
