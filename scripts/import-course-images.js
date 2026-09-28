// Докладывает фото слов из файла курса прошлого поколения
// (A0_Beginner_*.html, A1_Elementary_*.html…) в public/course/<level>/img/ и
// img-index.json — туда, откуда их берёт экстрактор шагов
// (scripts/extract-selfstudy-course.js → selfstudy/card-photos.js).
//
// Курс нового поколения (jts-<level>-course.html) картинок не везёт вовсе,
// только имена иконок. Фото живут в файлах прошлого поколения: у каждого урока
// своя карта IMG {«слово»: data:image/jpeg…}. У A1 её долго не было (в
// выгруженном когда-то файле IMG:{} пуст), и A1 стоял на иконках; методист
// дорисовал 452 картинки — этот скрипт их и забирает.
//
// Что делает:
//   - слово, которого в индексе нет, — новая картинка l<урок>-<слово>.webp
//     (ширина 400: карточка на телефоне ~130 px при плотности 3, а у
//     портретной картинки A1 на 480 выходило 48 КБ против 30 КБ у A2);
//   - слово уже есть, а картинка в файле другая (методист перерисовал) —
//     файл заменяется на месте, адрес в шагах не меняется;
//   - слово встречается в нескольких уроках — берётся первое: подпись на
//     картинке одна и та же («STAY | ҚАЛУ»).
// Ничего не удаляет. После прогона пересоберите ВСЕ уровни
// extract-selfstudy-course.js: перевод снимка чужой уровень читает из шагов.
//
// Запуск:
//   node --max-old-space-size=8192 scripts/import-course-images.js \
//     --level a1 --src ~/Downloads/A1_Elementary_final_.html
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const ROOT = path.join(__dirname, '..')
const WIDTH = 400
const QUALITY = 72

/**
 * Карты IMG уроков по порядку: у A0 ключ в кавычках ("IMG": {…}), у A1–B1 —
 * без (IMG:{…}). Внутри — JSON, но base64 длиной в сотни килобайт, поэтому
 * границу ищем обходом скобок с учётом строк, а не регуляркой.
 * @returns {Array<Record<string,string>>}
 */
function readImageMaps(html) {
  const re = /"?IMG"?\s*:\s*\{/g
  const maps = []
  let m
  while ((m = re.exec(html))) {
    const start = m.index + m[0].length - 1
    let depth = 0
    let inStr = false
    let j = start
    for (; j < html.length; j++) {
      const c = html[j]
      if (inStr) {
        if (c === '\\') j++
        else if (c === '"') inStr = false
        continue
      }
      if (c === '"') inStr = true
      else if (c === '{') depth++
      else if (c === '}' && --depth === 0) break
    }
    try {
      maps.push(JSON.parse(html.slice(start, j + 1)))
    } catch {
      // Не JSON — это не карта урока, а код движка (IMG:{} в шаблоне).
    }
    re.lastIndex = j
  }
  return maps
}

/** Имя файла по слову: «go → went» → go-went, «I'm…» → i-m. */
const imageSlug = (key) =>
  String(key)
    .toLowerCase()
    .replace(/[‘’']/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'img'

/** Картинка из data:-адреса; ссылки на внешние файлы (images/too.webp) — мимо. */
function dataImage(value) {
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/s.exec(String(value || ''))
  return m ? { ext: m[1], buf: Buffer.from(m[2], 'base64') } : null
}

const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex')

async function importImages({ level, html, courseDir, sharp }) {
  const indexFile = path.join(courseDir, 'img-index.json')
  const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : {}
  const imgDir = path.join(courseDir, 'img')
  fs.mkdirSync(imgDir, { recursive: true })
  const stats = { added: 0, replaced: 0, same: 0, repeated: 0, external: 0 }
  const taken = new Set(fs.readdirSync(imgDir))
  const seen = new Set()
  // Два ключа одного файла («Who?» и «Who…?» — старая выгрузка слила их по
  // имени): второй не должен перезаписать то, что положил первый.
  const written = new Set()
  const maps = readImageMaps(html)
  for (const [i, map] of maps.entries()) {
    for (const [key, value] of Object.entries(map)) {
      const img = dataImage(value)
      if (!img) {
        stats.external++
        continue
      }
      if (seen.has(key)) {
        stats.repeated++
        continue
      }
      seen.add(key)
      if (index[key]) {
        const file = path.join(ROOT, 'public', index[key])
        if (!fs.existsSync(file) || written.has(file)) continue
        const old = fs.readFileSync(file)
        // Лежащий файл — те же байты исходника (A0 хранит jpg как есть) или
        // его пережатая копия; перерисовку видно только по первому случаю.
        if (sha(old) === sha(img.buf)) {
          stats.same++
          continue
        }
        if (path.extname(file) === '.jpg' && img.ext === 'jpeg') {
          fs.writeFileSync(file, img.buf)
          written.add(file)
          stats.replaced++
        } else stats.same++
        continue
      }
      let name = `l${i + 1}-${imageSlug(key)}.webp`
      if (taken.has(name)) name = `l${i + 1}-${imageSlug(key)}-${sha(img.buf).slice(0, 6)}.webp`
      taken.add(name)
      const webp = await sharp(img.buf).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer()
      fs.writeFileSync(path.join(imgDir, name), webp)
      index[key] = `/course/${level}/img/${name}`
      stats.added++
    }
  }
  fs.writeFileSync(indexFile, `${JSON.stringify(index)}\n`)
  return { lessons: maps.length, ...stats }
}

module.exports = { readImageMaps, imageSlug, dataImage }

if (require.main === module) {
  const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`)
    return i > 0 ? process.argv[i + 1] : null
  }
  const level = arg('level')
  const src = arg('src')
  if (!level || !src) {
    console.error('нужны --level <a0|a1|…> и --src <файл курса.html>')
    process.exit(1)
  }
  const courseDir = path.join(ROOT, 'public/course', level)
  const catalog = JSON.parse(fs.readFileSync(path.join(courseDir, 'index.json'), 'utf8'))
  const html = fs.readFileSync(src, 'utf8')
  const maps = readImageMaps(html)
  // Номер урока в имени файла — порядковый номер карты; разошлось число
  // уроков — значит, это файл другого уровня или другой редакции.
  if (maps.length !== catalog.lessons.length) {
    console.error(`${level}: карт IMG ${maps.length}, а уроков в курсе ${catalog.lessons.length} — не тот файл?`)
    process.exit(1)
  }
  importImages({ level, html, courseDir, sharp: require('sharp') }).then((r) =>
    console.log(
      `${level}: уроков ${r.lessons}, новых картинок ${r.added}, перерисовано ${r.replaced}, без изменений ${r.same}, повторов слова ${r.repeated}, внешних ссылок ${r.external}`,
    ),
  )
}
