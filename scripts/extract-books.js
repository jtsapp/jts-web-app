// Вытаскивает из public/practice/books.html (hosted-библиотека «Книжек», в git
// не входит — 109 МБ) полные тексты глав и словари переводов в компактные JSON
// для нативной читалки (src/screens/BookDetail.jsx):
//   public/practice/books/index.json  — каталог [{id,title,author,level}]
//   public/practice/books/<id>.json   — {book,chapters:[{num,title,text}],dict}
// Из словаря оставляем только w/ru/kz (ipa/def/ex читалке не нужны — экономит
// ~80% веса). Запуск: node scripts/extract-books.js [путь-к-books.html]
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = process.argv[2] || path.join(ROOT, 'public/practice/books.html')
const OUT = path.join(ROOT, 'public/practice/books')

const html = fs.readFileSync(SRC, 'utf8')

// Карта id → имена переменных данных и арта, из
// `const BOOKS = [ { id:"oz", data: X_DATA, art: X_ART, ... } ]`
const booksArr = html.match(/const BOOKS = \[[\s\S]*?\];/)
if (!booksArr) throw new Error('const BOOKS не найден — структура books.html изменилась')
const mapping = [...booksArr[0].matchAll(/id:"([^"]+)",\s*data:\s*([A-Za-z0-9_.]+),\s*art:\s*([A-Za-z0-9_.]+)/g)].map(
  (m) => ({ id: m[1], varName: m[2], artVar: m[3] }),
)
if (mapping.length === 0) throw new Error('пустая карта BOOKS')

// Обложка книги: art.cover — base64-JPEG внутри books.html. Декодируем в
// обычный файл public/practice/covers/books/<id>.jpg — карточки каталога
// используют его, когда у книги бэкенда нет coverImageUrl.
const COVERS = path.join(ROOT, 'public/practice/covers/books')
function extractCover(artVar, id) {
  // cover — не всегда первый ключ объекта ({"audioSquare": true, "cover": …}),
  // поэтому находим объявление и берём ближайший "cover": "data:…" после него.
  const decl = new RegExp(artVar.replace(/[.$]/g, '\\$&') + '\\s*=\\s*\\{').exec(html)
  if (!decl) return ''
  const win = html.slice(decl.index, decl.index + 3_000_000)
  const m = /"?cover"?\s*:\s*"data:image\/(jpeg|png|webp);base64,([^"]+)"/.exec(win)
  if (!m) return ''
  fs.mkdirSync(COVERS, { recursive: true })
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1]
  const file = `${id}.${ext}`
  fs.writeFileSync(path.join(COVERS, file), Buffer.from(m[2], 'base64'))
  return `/practice/covers/books/${file}`
}

// Данные книги лежат как `VAR = {чистый JSON}` — находим объявление и вырезаем
// сбалансированный {...} с учётом строк/экранирования.
function extractJson(varName) {
  const decl = varName === 'window.__APP_DATA__' ? 'window.__APP_DATA__' : varName
  const re = new RegExp(decl.replace(/[.$]/g, '\\$&') + '\\s*=\\s*\\{')
  const m = re.exec(html)
  if (!m) throw new Error(`не найдено объявление ${varName}`)
  const start = m.index + m[0].length - 1
  let depth = 0
  let inStr = false
  for (let i = start; i < html.length; i++) {
    const c = html[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return JSON.parse(html.slice(start, i + 1))
    }
  }
  throw new Error(`не закрылся объект ${varName}`)
}

fs.mkdirSync(OUT, { recursive: true })

for (const { id, varName, artVar } of mapping) {
  const data = extractJson(varName)
  const chapters = (data.chapters || []).map((c) => ({
    num: c.num,
    title: c.title || `Chapter ${c.num}`,
    text: c.text || '',
  }))
  if (chapters.length === 0 || chapters.some((c) => !c.text)) {
    throw new Error(`${id}: пустые главы — проверь источник`)
  }
  const dict = {}
  for (const [k, v] of Object.entries(data.dict || {})) {
    dict[k] = { w: v.w || k, ru: v.ru || '', kz: v.kz || '' }
  }
  const book = {
    id,
    title: data.book?.title || id,
    author: data.book?.author || '',
    level: data.book?.level || '',
    cover: extractCover(artVar, id),
  }
  fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify({ book, chapters, dict }))
  console.log(`${id}: ${chapters.length} глав, ${Object.keys(dict).length} слов словаря, обложка: ${book.cover || 'нет'}`)
}

// Индекс пересобираем сканом каталога — здесь лежат и книги из books.html, и
// загруженные fetch-gutenberg-books.js; скрипты не затирают друг друга.
const index = fs
  .readdirSync(OUT)
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .map((f) => {
    const { book, chapters } = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'))
    return {
      id: book.id || path.basename(f, '.json'),
      title: book.title,
      author: book.author,
      level: book.level,
      cover: book.cover || '',
      chapters: chapters.length,
    }
  })
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index))
console.log(`\nВ индексе книг: ${index.length} → ${OUT}`)
