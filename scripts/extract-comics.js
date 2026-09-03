// Режет комикс из PDF в постраничные WebP для раздела «Комиксы» Практики.
//
// Почему не рендерим страницы PDF, а достаём вшитый растр: в этих сборках
// (calibre) каждая страница PDF — это белый лист Letter, в который вставлена
// ровно одна JPEG-картинка самого комикса. Рендер листа дал бы белые поля и
// лишний ресемплинг; извлечённый JPEG — это исходный арт 1:1. Белую кайму
// внутри самой картинки (~40–56 px) снимаем сами, по яркости.
//
// Пишет staging в build/comics/<id>/ (в .gitignore) и пакует его в
// build/comics/<id>.zip:
//   pages/NNN.webp   страницы комикса
//   cover.webp       обложка каталога
//   index.json       каталог [{id,title,author,…}]
//   <id>.json        страницы: {id,…,pages:[{n,url,w,h}]}
//   README.txt       описание формата для контентщика
//
// Архив контентщик заливает через админку, бэкенд его распаковывает — см.
// docs/superpowers/specs/2026-08-31-comics-api-contract.md. В public/ материал
// больше не кладём: раздел берёт данные только из API.
//
// Запуск:
//   node --max-old-space-size=4096 scripts/extract-comics.js --id yellow --pdf <файл>
// (PDF читаем целиком, и буфером, и строкой — дефолтной кучи ноды на 79 МБ
// исходник не хватает.)
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const { stagingDir, packComic } = require('./lib/comic-pack.js')

// Поле url в манифесте — справочное: реальные адреса присваивает бэкенд при
// распаковке архива (он же кладёт файлы в MinIO). Оставлено, потому что по
// нему бэкенд сверяет номер страницы с её размерами.
const MEDIA_URL_BASE = 'https://files-dev.justtostudy.kz/development/comics'

// Метаданные каталога. Держим здесь, а не в PDF: в этих файлах /Info пустой
// («author: Unknown»), а уровень и описание всё равно проставляет методист.
const COMICS = {
  yellow: {
    title: 'Yellow',
    author: 'Jay Martin',
    level: 'B1',
    // Мат в баллонах и сцены войны: веб по этому флагу закрывает карточку.
    adultOnly: true,
    // Пропуск страниц PDF: 2 — дубль обложки, 3 — реклама сайта-источника,
    // 4–8 — титул/копирайт/пустые листы, 9 — газетная врезка до начала истории.
    skip: [[2, 9]],
    desc: {
      ru: 'Графический роман о второй гражданской войне в США: короткие реплики, живой разговорный английский.',
      en: 'A graphic novel about a second American civil war: short lines, natural spoken English.',
      kk: 'АҚШ-тағы екінші азаматтық соғыс туралы графикалық роман: қысқа реплика, тірі ағылшын тілі.',
    },
  },
}

// Качество WebP. 82 выбрано замером на этом комиксе: 78 уже мылит мелкий шрифт
// в баллонах, 88 даёт +30 % веса без видимой разницы.
const WEBP_QUALITY = 82
// Порог «это ещё белое поле»: пиксель ярче 245 считаем полем. Ниже — JPEG-шум
// вокруг рисунка начинает удерживать рамку, выше — срезается светлое небо.
const BLANK_MIN = 246

// ── Мини-парсер PDF ─────────────────────────────────────────────────────────
// Нам нужны только страницы в правильном порядке и вшитый в каждую JPEG.
// Полноценный pdf.js ради этого тянуть не стали: файлы — PDF 1.4 без сжатых
// объектов (/ObjStm), поэтому хватает таблицы «объект → смещение» и разбора
// словарей со сбалансированными << >>.
//
// Объект адресуем парой «номер поколение» («22 1»), а не одним номером: в этом
// PDF первая страница лежит в объекте поколения 1, и парсер, считавший
// поколение всегда нулевым, терял её — вместе с ней съезжала вся нумерация,
// и из начала вырезался не тот кусок.
function buildIndex(latin) {
  const offsets = new Map()
  const re = /(?:^|[\r\n\s])(\d+)\s+(\d+)\s+obj\b/g
  let m
  while ((m = re.exec(latin))) offsets.set(`${m[1]} ${m[2]}`, m.index + m[0].length)
  return offsets
}

// Текст словаря объекта: от первого << до парного ему >>.
function dictOf(latin, offsets, key) {
  const at = offsets.get(key)
  if (at == null) return null
  const start = latin.indexOf('<<', at)
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < latin.length - 1; i++) {
    if (latin[i] === '<' && latin[i + 1] === '<') {
      depth++
      i++
    } else if (latin[i] === '>' && latin[i + 1] === '>') {
      depth--
      i++
      if (depth === 0) return latin.slice(start, i + 1)
    }
  }
  return null
}

// Ссылка по имени ключа: «/Root 17 0 R» → «17 0».
function refOf(dict, key) {
  const m = new RegExp(`/${key}\\s+(\\d+)\\s+(\\d+)\\s+R`).exec(dict)
  return m ? `${m[1]} ${m[2]}` : null
}

// Числовое значение ключа — с оговоркой, что это не начало ссылки «N G R».
function numOf(dict, key) {
  const m = new RegExp(`/${key}\\s+(\\d+)(?!\\s+\\d+\\s+R)`).exec(dict)
  return m ? Number(m[1]) : null
}

function arrayRefs(text) {
  return [...text.matchAll(/(\d+)\s+(\d+)\s+R/g)].map((x) => `${x[1]} ${x[2]}`)
}

// «/Kids 26 0 R» и «/Kids [2 0 R 6 0 R]» — оба варианта живые, поэтому значение
// ключа сначала пробуем как косвенную ссылку, потом как встроенный массив.
function arrayOf(latin, offsets, dict, key) {
  const ref = refOf(dict, key)
  if (ref != null) {
    const at = offsets.get(ref)
    if (at == null) return []
    const open = latin.indexOf('[', at)
    const close = latin.indexOf(']', open)
    return open < 0 || close < 0 ? [] : arrayRefs(latin.slice(open + 1, close))
  }
  const m = new RegExp(`/${key}\\s*\\[([^\\]]*)\\]`).exec(dict)
  return m ? arrayRefs(m[1]) : []
}

// Дерево страниц бывает вложенным (/Type/Pages внутри /Kids), поэтому обходим
// рекурсивно и возвращаем только листья /Type/Page — в порядке чтения.
function collectPages(latin, offsets, node, acc = []) {
  const dict = dictOf(latin, offsets, node)
  if (!dict) return acc
  if (/\/Type\s*\/Pages\b/.test(dict)) {
    for (const kid of arrayOf(latin, offsets, dict, 'Kids')) collectPages(latin, offsets, kid, acc)
  } else if (/\/Type\s*\/Page\b/.test(dict)) {
    acc.push({ key: node, dict })
  }
  return acc
}

// Ссылки на XObject-картинки страницы. /Resources бывает и косвенным.
function imageRefs(latin, offsets, pageDict) {
  const resRef = refOf(pageDict, 'Resources')
  const res = resRef != null ? dictOf(latin, offsets, resRef) : pageDict
  if (!res) return []
  const xi = res.indexOf('/XObject')
  if (xi < 0) return []
  const open = res.indexOf('<<', xi)
  if (open < 0) return []
  let depth = 0
  let end = open
  for (let i = open; i < res.length - 1; i++) {
    if (res[i] === '<' && res[i + 1] === '<') {
      depth++
      i++
    } else if (res[i] === '>' && res[i + 1] === '>') {
      depth--
      i++
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  return arrayRefs(res.slice(open, end))
}

// Сырые байты JPEG из объекта-картинки. /Length бывает косвенным, поэтому при
// его отсутствии ищем «endstream» — у DCTDecode внутри потока его быть не может.
function imageStream(buf, latin, offsets, key) {
  const dict = dictOf(latin, offsets, key)
  if (!dict || !/\/Subtype\s*\/Image\b/.test(dict)) return null
  if (!/\/Filter\s*\/DCTDecode\b/.test(dict)) return null
  const at = latin.indexOf('stream', offsets.get(key) + dict.length - 2)
  if (at < 0) return null
  let start = at + 'stream'.length
  if (latin[start] === '\r') start++
  if (latin[start] === '\n') start++
  let len = numOf(dict, 'Length')
  if (len == null) {
    const lenRef = refOf(dict, 'Length')
    if (lenRef != null) {
      const lat = offsets.get(lenRef)
      const lm = lat != null ? /\s*(\d+)/.exec(latin.slice(lat, lat + 32)) : null
      if (lm) len = Number(lm[1])
    }
  }
  if (len == null) {
    const end = latin.indexOf('endstream', start)
    if (end < 0) return null
    len = end - start
  }
  return buf.subarray(start, start + len)
}

// ── Обрезка белого поля ─────────────────────────────────────────────────────
// Рамку считаем сами, а не sharp.trim(): у trim() порог меряется расстоянием в
// RGB, и на этих страницах он срезал живой рисунок сверху, оставляя белое
// слева. Здесь критерий — яркость, то же самое, чем поле видно глазом.
function boundsOf(gray, w, h, thr) {
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      if (gray[row + x] >= thr) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      y1 = y
    }
  }
  return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

async function toPage(jpeg) {
  const { data, info } = await sharp(jpeg).greyscale().raw().toBuffer({ resolveWithObject: true })
  const box = boundsOf(data, info.width, info.height, BLANK_MIN)
  // Разделительные листы целиком белые — из них вышла бы пустая картинка.
  if (!box) return null
  const out = await sharp(jpeg)
    .extract(box)
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toBuffer({ resolveWithObject: true })
  return { buf: out.data, w: out.info.width, h: out.info.height }
}

// README едет внутрь архива: контентщик открывает его первым и должен понять,
// что за файлы у него в руках и чего в них ещё нет.
function readme(id, meta, pages, blanks) {
  const land = pages.filter((p) => p.w > p.h).length
  return [
    `${meta.title} — ${meta.author}. Материал раздела «Комиксы».`,
    `Собрано scripts/extract-comics.js из PDF.`,
    '',
    'СОДЕРЖИМОЕ',
    '  pages/NNN.webp   страницы комикса, WebP quality ' + WEBP_QUALITY,
    '  cover.webp       обложка каталога',
    '  index.json       карточка комикса для админки',
    `  ${id}.json        страницы: {n, url, w, h}`,
    `  text-${id}.json   реплики страниц — появляется после extract-comic-text.js`,
    '',
    'СТРАНИЦЫ',
    `  ${pages.length} файлов, портретных ${pages.length - land}, разворотов ${land}.`,
    '  001 — обложка книги, 002 — первая страница истории.',
    `  Пустых листов-разделителей пропущено: ${blanks}.`,
    '  Белое поле вокруг рисунка срезано.',
    '',
    'URL В МАНИФЕСТЕ',
    '  Поле url справочное. Реальные адреса присваивает бэкенд при распаковке',
    '  архива — он же кладёт файлы в MinIO.',
    '',
    meta.adultOnly ? 'СОДЕРЖАНИЕ 18+ — в репликах мат и сцены насилия.' : '',
    '',
  ].join('\n')
}

function skipped(page, ranges) {
  return ranges.some(([a, b]) => page >= a && page <= b)
}

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt
}

async function main() {
  const id = arg('id', 'yellow')
  const meta = COMICS[id]
  if (!meta) throw new Error(`нет метаданных для комикса "${id}" — добавь его в COMICS`)
  const pdfPath = arg('pdf')
  if (!pdfPath) throw new Error('укажи PDF: --pdf <путь>')
  const base = arg('base', MEDIA_URL_BASE).replace(/\/+$/, '')

  const buf = fs.readFileSync(pdfPath)
  const latin = buf.toString('latin1')
  const offsets = buildIndex(latin)
  const trailer = latin.slice(latin.lastIndexOf('trailer'))
  const rootKey = refOf(trailer, 'Root')
  if (rootKey == null) throw new Error('в трейлере нет /Root — файл не похож на PDF 1.4')
  const pagesKey = refOf(dictOf(latin, offsets, rootKey), 'Pages')
  const pagesDict = dictOf(latin, offsets, pagesKey)
  const pages = collectPages(latin, offsets, pagesKey)
  const declared = numOf(pagesDict, 'Count')
  // Расхождение с /Count значит, что обход дерева потерял страницу, а с ней
  // съедет нумерация и вырежется не тот кусок — лучше упасть, чем залить брак.
  if (declared != null && declared !== pages.length)
    throw new Error(`обход дерева дал ${pages.length} страниц, а /Count обещает ${declared}`)
  console.log(`PDF: ${pages.length} страниц, объектов ${offsets.size}`)

  // Staging пересобираем с нуля: после смены диапазона пропуска в нём иначе
  // остались бы страницы со старой нумерацией, и они уехали бы в архив.
  const stage = stagingDir(id)
  fs.rmSync(stage, { recursive: true, force: true })
  const pagesDir = path.join(stage, 'pages')
  fs.mkdirSync(pagesDir, { recursive: true })

  const out = []
  let blanks = 0
  for (let i = 0; i < pages.length; i++) {
    const pageNo = i + 1
    if (skipped(pageNo, meta.skip || [])) continue
    let jpeg = null
    for (const r of imageRefs(latin, offsets, pages[i].dict)) {
      jpeg = imageStream(buf, latin, offsets, r)
      if (jpeg) break
    }
    if (!jpeg) continue
    const page = await toPage(jpeg)
    if (!page) {
      blanks++
      continue
    }
    const n = out.length + 1
    const file = `${String(n).padStart(3, '0')}.webp`
    fs.writeFileSync(path.join(pagesDir, file), page.buf)
    out.push({ n, url: `${base}/${id}/${file}`, w: page.w, h: page.h })
    if (n % 25 === 0) console.log(`  … ${n} страниц`)
  }
  if (!out.length) throw new Error('ни одной страницы не извлеклось — проверь --pdf')

  // Обложка каталога — первая страница, ужатая до ширины карточки (150 px @2x).
  await sharp(path.join(pagesDir, '001.webp'))
    .resize({ width: 360 })
    .webp({ quality: 80, effort: 6 })
    .toFile(path.join(stage, 'cover.webp'))

  const doc = {
    id,
    title: meta.title,
    author: meta.author,
    level: meta.level,
    cover: 'cover.webp',
    adultOnly: !!meta.adultOnly,
    pages: out,
  }
  fs.writeFileSync(path.join(stage, `${id}.json`), JSON.stringify(doc, null, 1))

  // index.json внутри архива описывает один комикс: каталог живёт в базе,
  // сводить несколько книг в один файл больше незачем.
  const entry = {
    id,
    title: meta.title,
    author: meta.author,
    level: meta.level,
    cover: 'cover.webp',
    adultOnly: !!meta.adultOnly,
    pages: out.length,
    desc: meta.desc,
  }
  fs.writeFileSync(path.join(stage, 'index.json'), JSON.stringify([entry], null, 1))
  fs.writeFileSync(path.join(stage, 'README.txt'), readme(id, meta, out, blanks))

  const zip = packComic(id)
  console.log(`OK: ${out.length} страниц, пустых пропущено ${blanks}`)
  console.log(`Архив: ${zip.path} — ${(zip.bytes / 1048576).toFixed(1)} МБ, файлов ${zip.files}`)
  console.log('Текст реплик: node scripts/extract-comic-text.js --id ' + id)
}

// Разбор PDF и обрезку экспортируем ради юнит-тестов; запуск — только из CLI.
module.exports = {
  buildIndex,
  dictOf,
  refOf,
  numOf,
  arrayOf,
  collectPages,
  imageRefs,
  imageStream,
  boundsOf,
  skipped,
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
