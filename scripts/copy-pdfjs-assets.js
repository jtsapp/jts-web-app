// Ресурсы pdf.js для просмотрщика PDF урока: node_modules/pdfjs-dist → public/pdfjs/.
//
// pdf.js догружает их по ходу документа (адреса передаёт src/screens/live/pdf/pdfLoader.js):
// wasm — декодеры картинок (без него страницы с JPEG 2000 пустые), standard_fonts —
// стандартные шрифты PDF, которых нет в системе, cmaps — кодировки CJK-шрифтов,
// iccs — профиль для картинок в CMYK.
//
// Копия лежит в репозитории, а не собирается на лету: public отдаётся как есть и в
// `next dev`, и в Playwright, и в Docker (runner берёт public прямо из исходников),
// без хуков сборки, которые легко обойти запуском `next dev` напрямую.
// Файлы должны быть той же версии, что и pdfjs-dist: тест рядом сверяет копию с
// установленным пакетом, и после обновления pdfjs-dist он красный, пока не
// перезапустишь этот скрипт.
//
// Запуск: node scripts/copy-pdfjs-assets.js

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const SOURCE = path.dirname(require.resolve('pdfjs-dist/package.json', { paths: [ROOT] }))
const OUT = path.join(ROOT, 'public', 'pdfjs')
const FOLDERS = ['wasm', 'standard_fonts', 'cmaps', 'iccs']

/** Файлы папки — пути относительно неё, по алфавиту. */
function listFiles(dir) {
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .sort()
}

function copy() {
  fs.rmSync(OUT, { recursive: true, force: true })
  for (const folder of FOLDERS) {
    fs.cpSync(path.join(SOURCE, folder), path.join(OUT, folder), { recursive: true })
  }
}

module.exports = { FOLDERS, OUT, SOURCE, listFiles }

if (require.main === module) {
  copy()
  const { version } = require(path.join(SOURCE, 'package.json'))
  const count = FOLDERS.reduce((sum, folder) => sum + listFiles(path.join(OUT, folder)).length, 0)
  console.log(`pdfjs-dist ${version}: ${count} файлов → ${path.relative(ROOT, OUT)}`)
}
