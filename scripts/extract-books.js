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

// Карта id → имя переменной с данными, из `const BOOKS = [ { id:"oz", data: X_DATA, ... } ]`
const booksArr = html.match(/const BOOKS = \[[\s\S]*?\];/)
if (!booksArr) throw new Error('const BOOKS не найден — структура books.html изменилась')
const mapping = [...booksArr[0].matchAll(/id:"([^"]+)",\s*data:\s*([A-Za-z0-9_.]+)/g)].map((m) => ({
  id: m[1],
  varName: m[2],
}))
if (mapping.length === 0) throw new Error('пустая карта BOOKS')

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

const index = []
for (const { id, varName } of mapping) {
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
  }
  fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify({ book, chapters, dict }))
  index.push({ ...book, chapters: chapters.length })
  console.log(`${id}: ${chapters.length} глав, ${Object.keys(dict).length} слов словаря`)
}

fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index))
console.log(`\nИтого книг: ${index.length} → ${OUT}`)
