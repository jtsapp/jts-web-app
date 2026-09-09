// Заливает книги из self-contained библиотеки «JTS Practice» (html с
// window.__JTS_DATA__) в каталог админки: POST /admin/audio-lessons/import.
// После этого книга видна в разделе «Книжки» и читается на фронте — главы
// приезжают с detail-эндпоинта /mobile/audio-lessons/{id} (см. loadBookContent
// в src/screens/BookDetail.jsx). Ничего в public/practice/books класть не надо.
//
// Обложки в html лежат как data:image/webp;base64 — сохранить их в поле
// coverImageUrl нельзя (это колонка со ссылкой), поэтому каждая уезжает через
// POST /media/upload и в каталог попадает уже ссылкой.
//
// Запуск:
//   JTS_ADMIN_TOKEN=... node scripts/import-practice-library.js <файл.html> [--dry-run] [--api URL] [--skip id,id]
//
// --dry-run ничего не отправляет: печатает, что улетело бы, и складывает тела
// запросов в scripts/.import-preview.json — им же удобно свериться глазами.
//
// --skip выкидывает книги по id из библиотеки. Нужен, когда название книги
// совпадает со статикой data/books: читалка отдаёт предпочтение статике
// (loadBookContent в src/screens/BookDetail.jsx ищет по нормализованному
// названию и только при промахе идёт на detail-эндпоинт), поэтому залитый
// текст такой книги всё равно не покажется, а в каталоге появится второй
// карточкой-дублем. На выгрузке от 26.08.2026 такое совпадение одно —
// `gatsby` (в библиотеке 24 главы, в статике 9).
const fs = require('fs')
const path = require('path')

const DEFAULT_API = 'https://dev-server.justtostudy.kz'
// Уровни каталога — enum LanguageLevel на бэкенде. Всё, что не совпало,
// отправляем как null: битое значение уронило бы импорт целиком (400).
const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Достаёт window.__JTS_DATA__ = {...} из html библиотеки. */
function parseLibraryData(html) {
  const m = /window\.__JTS_DATA__\s*=\s*/.exec(html)
  if (!m) throw new Error('window.__JTS_DATA__ не найден — это не библиотека JTS Practice')
  const start = m.index + m[0].length
  // Вырезаем сбалансированный {...} с учётом строк и экранирования: JSON тут
  // в одну строку на 9 МБ, регуляркой его не взять.
  let depth = 0
  let inStr = false
  for (let i = start; i < html.length; i++) {
    const c = html[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return JSON.parse(html.slice(start, i + 1))
  }
  throw new Error('window.__JTS_DATA__ оборван — файл повреждён')
}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }

/** Блок библиотеки → чистый текст: снимаем <span class="w" data-w="…"> и
 *  html-сущности. Лемма из data-w теряется намеренно — читалка её не
 *  использует, тап-перевод идёт по самому слову. */
function stripMarkup(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-zA-Z#0-9]+;/g, (e) => ENTITIES[e] ?? e)
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/** Главы приходят блоками {k,t}: p — абзац, h — подзаголовок, q — реплика,
 *  v — стих. Склеиваем через \n: читалка режет текст с переводами строк по
 *  ним (toParas), поэтому авторская разбивка на абзацы сохраняется как есть. */
function blocksToPlainText(blocks) {
  return (Array.isArray(blocks) ? blocks : [])
    .map((b) => stripMarkup(b?.t))
    .filter(Boolean)
    .join('\n')
}

/** Слова главы для поля vocab: бэкенд хранит их одной строкой через \n, а
 *  переводы в его модели места не имеют — кладём только сами слова. */
function chapterVocab(vocab) {
  const words = (Array.isArray(vocab) ? vocab : []).map((v) => String(v?.w || '').trim()).filter(Boolean)
  return [...new Set(words)]
}

function levelOf(book) {
  const lvl = String(book?.level || '').toUpperCase()
  return LEVELS.includes(lvl) ? lvl : null
}

/** Ключ идемпотентности импорта. Бэкенд ищет книгу по skyengId и без него
 *  всегда создаёт новую запись — второй прогон дал бы каталог из дублей.
 *  Свободного «внешнего id» в модели больше нет, поэтому кладём сюда
 *  стабильный хеш строкового id библиотеки (FNV-1a, всегда положительный). */
function externalId(id) {
  let h = 2166136261
  const s = `jts-practice:${id}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Разбор аргументов командной строки.
 *
 *  Отдельной чистой функцией, потому что здесь легче всего ошибиться молча:
 *  значение флага — такой же позиционный аргумент, как путь к файлу, и стоит
 *  перепутать порядок, как `--skip gatsby` уедет в путь к html. `taken`
 *  помечает индексы, уже съеденные флагами, — по ним и отсеиваем.
 *
 *  Флаг без значения — ошибка, а не пустая строка: раньше `--api` в конце
 *  строки давал адрес «undefined/media/upload», а `--skip` в конце тихо
 *  отключал фильтр, и книга уезжала на контур.
 */
function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : []
  const taken = new Set()
  const valueOf = (name) => {
    const i = args.indexOf(name)
    if (i < 0) return null
    const value = args[i + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`${name} требует значение`)
    taken.add(i + 1)
    return value
  }
  const api = valueOf('--api')
  const skip = valueOf('--skip')
  const src = args.find((a, i) => !a.startsWith('--') && !taken.has(i))
  if (!src) throw new Error('укажите путь к html библиотеки')
  return {
    src,
    api,
    dryRun: args.includes('--dry-run'),
    skipIds: skip ? skip.split(',').map((s) => s.trim()).filter(Boolean) : [],
  }
}

/** Отбор книг для заливки: всё, кроме перечисленных id.
 *
 *  Отдельной чистой функцией, потому что молчаливый пропуск здесь опаснее
 *  ошибки: опечатка в --skip не должна выглядеть как «книгу выкинули».
 *  Поэтому кроме отобранного отдаём и `missed` — запрошенные id, которых в
 *  библиотеке не нашлось: на них вызывающий останавливает импорт, иначе книга
 *  уехала бы на контур мимо фильтра.
 */
function selectBooks(books, skipIds) {
  const list = Array.isArray(books) ? books : []
  const wanted = (skipIds || []).map((id) => String(id).trim()).filter(Boolean)
  const skip = new Set(wanted.map((id) => id.toLowerCase()))
  const kept = []
  const skipped = []
  const hit = new Set()
  for (const book of list) {
    const id = String(book?.id || '').toLowerCase()
    if (skip.has(id)) {
      skipped.push(book?.id)
      hit.add(id)
    } else {
      kept.push(book)
    }
  }
  return { kept, skipped, missed: wanted.filter((id) => !hit.has(id.toLowerCase())) }
}

/** Книга библиотеки → тело AudioLessonRequest. coverUrl приходит снаружи:
 *  его отдаёт /media/upload, а в dry-run его просто нет. */
function toAudioLessonRequest(book, coverUrl) {
  const chapters = Array.isArray(book?.chapters) ? book.chapters : []
  return {
    title: String(book?.title || '').trim(),
    kind: 'BOOK',
    author: String(book?.author || '').trim() || null,
    description: String(book?.blurb || '').trim() || null,
    level: levelOf(book),
    skyengId: externalId(book?.id),
    topic: String(book?.category || '').trim() || null,
    genre: String(book?.category || '').trim() || null,
    coverImageUrl: coverUrl || null,
    isActive: true,
    orderIndex: 0,
    tracks: chapters.map((c, i) => ({
      trackIndex: Number.isFinite(c?.n) ? c.n : i + 1,
      title: String(c?.title || '').trim() || `Глава ${i + 1}`,
      text: blocksToPlainText(c?.blocks),
      vocab: chapterVocab(c?.vocab),
      orderIndex: i,
    })),
  }
}

/** data:image/…;base64,… → {buffer, filename}. Обложки в библиотеке webp. */
function decodeCover(dataUrl, id) {
  const m = /^data:image\/([a-z]+);base64,(.+)$/s.exec(String(dataUrl || ''))
  if (!m) return null
  return { buffer: Buffer.from(m[2], 'base64'), filename: `${id}.${m[1] === 'jpeg' ? 'jpg' : m[1]}` }
}

async function uploadCover(api, token, cover) {
  const form = new FormData()
  // Поле называется `material` — так его читает MediaController.
  form.append('material', new Blob([cover.buffer]), cover.filename)
  const res = await fetch(`${api}/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error(`/media/upload → ${res.status}`)
  const body = await res.json()
  return body?.url || body?.link || body?.path || ''
}

async function run() {
  const { src, api: apiArg, dryRun, skipIds } = parseArgs(process.argv.slice(2))
  const api = apiArg || process.env.JTS_API_URL || DEFAULT_API
  const token = process.env.JTS_ADMIN_TOKEN
  if (!token && !dryRun) throw new Error('нет JTS_ADMIN_TOKEN — токен админа обязателен')

  const data = parseLibraryData(fs.readFileSync(src, 'utf8'))
  const all = data.books
  // Раньше здесь стояло `data.books || []`, и сменившийся формат выгрузки
  // молча превращался в «заливаем: 0» плюс POST с пустым телом — оператор
  // читал это как «на контуре уже всё есть».
  if (!Array.isArray(all)) throw new Error('в библиотеке нет массива books — формат файла сменился')

  const { kept: books, skipped, missed } = selectBooks(all, skipIds)
  // Опечатка в id — не повод продолжать: --skip добавлен ровно затем, чтобы
  // конкретная книга НЕ уехала на контур, и «предупредили и залили» здесь
  // равно «не сработало».
  if (missed.length) {
    throw new Error(`--skip: в библиотеке нет книг с id ${missed.join(', ')} — проверьте написание`)
  }

  console.log(`${all.length} книг в файле, контур ${api}${dryRun ? ' (dry-run)' : ''}`)
  if (skipped.length) console.log(`пропускаем по --skip: ${skipped.join(', ')}`)
  console.log(`заливаем: ${books.length}\n`)

  const payload = []
  for (const book of books) {
    let coverUrl = ''
    const cover = decodeCover(book.cover, book.id)
    if (cover && !dryRun) coverUrl = await uploadCover(api, token, cover)
    const request = toAudioLessonRequest(book, coverUrl)
    const chars = request.tracks.reduce((a, t) => a + t.text.length, 0)
    console.log(
      `  ${book.id.padEnd(14)} ${String(request.level).padEnd(4)} глав ${String(request.tracks.length).padEnd(3)}` +
        ` текст ${String(Math.round(chars / 1024)).padStart(4)} КБ  обложка ${cover ? `${Math.round(cover.buffer.length / 1024)} КБ` : '—'}  ${request.title}`,
    )
    payload.push(request)
  }

  if (dryRun) {
    const out = path.join(__dirname, '.import-preview.json')
    fs.writeFileSync(out, JSON.stringify(payload, null, 1))
    console.log(`\ndry-run: ничего не отправлено, тела запросов → ${out}`)
    return
  }

  const res = await fetch(`${api}/admin/audio-lessons/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`импорт → ${res.status} ${await res.text()}`)
  const created = await res.json()
  console.log(`\nзалито книг: ${created.length}`)
  for (const b of created) console.log(`  #${b.id} ${b.title} — глав ${b.tracks?.length ?? 0}`)
}

if (require.main === module) {
  run().catch((e) => {
    console.error(String(e.message || e))
    process.exit(1)
  })
}

module.exports = {
  parseLibraryData,
  stripMarkup,
  blocksToPlainText,
  chapterVocab,
  toAudioLessonRequest,
  decodeCover,
  externalId,
  selectBooks,
  parseArgs,
}
