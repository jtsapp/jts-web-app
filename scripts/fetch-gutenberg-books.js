// Дотягивает тексты книг каталога, которых нет в hosted-библиотеке books.html
// (она покрывает 25 книг, каталог dev-admin шире). Источник — Project
// Gutenberg (public domain) через gutendex.com: скачиваем plain text, режем на
// главы и кладём в тот же формат, что extract-books.js —
// public/practice/books/<id>.json. Словаря у таких книг нет (dict:{}) —
// тап-перевод работает через gtx-фолбэк читалки.
// Запуск: node scripts/fetch-gutenberg-books.js
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'public/practice/books')

// Книги каталога dev-admin без текста в books.html. queries — варианты поиска
// в gutendex (первый сработавший побеждает), mustContain — слово, обязанное
// быть в найденном названии, author — фамилия для отсечения одноимённых
// изданий. title должен совпадать с названием в каталоге админки (по нему
// BookDetail ищет контент).
const WANTED = [
  { id: 'blackbeauty', title: 'Black Beauty', queries: ['Black Beauty'], author: 'Sewell' },
  // У #49057 (адаптация Andrew Lang) в gutendex пустой список авторов — фильтруем только по названию.
  { id: 'kingarthur', title: 'Tales of King Arthur and the Round Table', queries: ['King Arthur Round Table Lang', 'Tales of King Arthur and the Round Table'], author: null, mustContain: 'tales of king arthur' },
  { id: 'bluebird', title: 'The Blue Bird for Children', queries: ['The Blue Bird for Children'], author: 'Leblanc' },
  { id: 'gulliver', title: "Gulliver's Travels", queries: ['Gulliver Travels'], author: 'Swift' },
  // «Stories of Beowulf» Маршалл на Gutenberg нет — берём ближайший прозаический
  // пересказ #50742 «The Story of Beowulf … in Modern English Prose».
  { id: 'beowulf', title: 'Stories of Beowulf', queries: ['The Story of Beowulf'], author: null, mustContain: 'story of beowulf' },
  { id: 'shakespearestories', title: 'Beautiful Stories from Shakespeare', queries: ['Beautiful Stories from Shakespeare'], author: 'Nesbit' },
  { id: 'montecristo', title: 'The Count of Monte Cristo', queries: ['The Count of Monte Cristo'], author: 'Dumas' },
  { id: 'sense', title: 'Sense and Sensibility', queries: ['Sense and Sensibility'], author: 'Austen' },
  { id: 'copperfield', title: 'David Copperfield', queries: ['David Copperfield'], author: 'Dickens' },
  { id: 'ladywithdog', title: 'The Lady with the Dog', queries: ['The Lady with the Dog'], author: 'Chekhov' },
  { id: 'captainsdaughter', title: 'The Daughter of the Commandant', queries: ['The Daughter of the Commandant'], author: 'Pushkin' },
  { id: 'heroofourtime', title: 'A Hero of Our Time', queries: ['A Hero of Our Time'], author: 'Lermontov' },
  // Поиск gutendex не нормализует акценты — ищем именно «Arsène».
  { id: 'lupin', title: 'The Confessions of Arsène Lupin', queries: ['Arsène Lupin'], author: 'Leblanc', mustContain: 'confessions' },
  { id: 'mylifeandwork', title: 'My Life and Work', queries: ['My Life and Work'], author: 'Ford' },
  { id: 'deadsouls', title: 'Dead Souls', queries: ['Dead Souls'], author: 'Gogol' },
  { id: 'crimeandpunishment', title: 'Crime and Punishment', queries: ['Crime and Punishment'], author: 'Dostoyevsky' },
  { id: 'financier', title: 'The Financier', queries: ['The Financier'], author: 'Dreiser' },
]

async function gutendexFind({ queries, author, mustContain }) {
  for (const query of queries) {
    // Обязателен слэш перед query: /books?search= отвечает 301 без параметров.
    const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`gutendex ${res.status}`)
    const { results } = await res.json()
    const hit = (results || []).find(
      (b) =>
        b.languages?.includes('en') &&
        (!author || b.authors?.some((a) => a.name.toLowerCase().includes(author.toLowerCase()))) &&
        (!mustContain || b.title.toLowerCase().includes(mustContain)),
    )
    if (!hit) continue
    const txt =
      hit.formats['text/plain; charset=us-ascii'] ||
      hit.formats['text/plain; charset=utf-8'] ||
      Object.entries(hit.formats).find(([k]) => k.startsWith('text/plain'))?.[1]
    if (!txt) continue
    return { gbId: hit.id, gbTitle: hit.title, txtUrl: txt }
  }
  throw new Error('не найдено в gutendex')
}

// Убирает лицензионные шапку/подвал Gutenberg.
function stripBoilerplate(raw) {
  let t = raw.replace(/\r\n/g, '\n')
  const start = t.match(/\*\*\* ?START OF[^\n]*\*\*\*/)
  if (start) t = t.slice(t.indexOf('\n', start.index) + 1)
  const end = t.match(/\*\*\* ?END OF[^\n]*\*\*\*/)
  if (end) t = t.slice(0, end.index)
  return t
}

// Строки-заголовки глав в текстах Gutenberg. Пробуем все шаблоны и выбираем
// лучший по скорингу (см. chapterize) — стили у книг разные.
const HEADING_PATTERNS = [
  /^\s{0,6}(CHAPTER|Chapter|LETTER|Letter|STAVE|PART|Part|BOOK|Book)\s+([IVXLCDM]+|[0-9]+)\b[^\n]*$/,
  /^\s{0,3}\d{1,3}\.?\s+[A-Z«"'][^\n]{2,58}$/, // «01 My Early Home»
  /^\s{0,40}[IVXLCDM]+\.?\s*$/, // «XII.» — главы одной римской цифрой
  // СТРОКА КАПСОМ (сборники рассказов, центрированные заголовки — до 40 пробелов отступа)
  /^\s{0,40}[A-Z][A-Z0-9 ,'’\-—:;!?.]{2,58}\s*$/,
]

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] || 0
}

// Абзацы Gutenberg разделены пустой строкой, внутри — жёсткая переноска ~70
// колонок. Склеиваем строки абзаца пробелом, абзацы соединяем через \n —
// toParas() читалки при наличии \n режет именно по ним.
function unwrap(body) {
  return body
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

// Служебные разделы изданий Gutenberg — читателю в «главах» не нужны.
const SKIP_TITLES =
  /^(contents|illustrations|list of|index|preface|translator|preparer|author[’']s preface|introduction|a brief life|dedication|to |lord |footnotes|notes|glossary|appendix|epilogue notes|the (first )?publisher)\b/i

// Нарезает одним шаблоном; главы короче 400 символов выбрасываются — так
// отпадают строки оглавления в начале файла (у них «тело» пустое до
// следующей строки-«заголовка»).
function splitBy(lines, re) {
  const idxs = []
  for (let i = 0; i < lines.length; i++) {
    // Заголовок — отдельная строка, окружённая пустыми (не строка абзаца).
    if (re.test(lines[i]) && !lines[i - 1]?.trim() && (!lines[i + 1]?.trim() || re === HEADING_PATTERNS[0])) {
      idxs.push(i)
    }
  }
  const chapters = []
  for (let c = 0; c < idxs.length; c++) {
    const from = idxs[c]
    const to = c + 1 < idxs.length ? idxs[c + 1] : lines.length
    let title = lines[from].trim().replace(/\s+/g, ' ')
    let bodyStart = from + 1
    // Подзаголовок сразу после «CHAPTER I» («The Cyclone») приклеиваем к названию.
    while (bodyStart < to && !lines[bodyStart].trim()) bodyStart++
    const sub = lines[bodyStart]?.trim()
    if (sub && sub.length < 60 && !lines[bodyStart + 1]?.trim() && /^[«"A-ZА-Я]/.test(sub)) {
      title += `: ${sub.replace(/\s+/g, ' ')}`
      bodyStart++
    }
    const body = unwrap(lines.slice(bodyStart, to).join('\n'))
    // /\d{2,}$/ — строка оглавления с номером страницы («X THE AWAKENING 169»)
    if (body.length >= 400 && !SKIP_TITLES.test(title) && !/\d{2,}\s*$/.test(title)) {
      chapters.push({ title, body })
    }
  }
  return chapters
}

// Пробует все шаблоны заголовков и выбирает лучший: валидна нарезка на 3..150
// глав с медианой > 2000 символов; среди валидных побеждает самая мелкая
// (CHAPTER бьёт PART), но нарезки с «безликими» повторами в названиях
// (I, II, I, II… у сборников) уступают нарезкам с уникальными названиями.
function chapterize(text) {
  const lines = text.split('\n')
  let best = null
  for (const re of HEADING_PATTERNS) {
    const chapters = splitBy(lines, re)
    if (chapters.length < 3 || chapters.length > 150) continue
    if (median(chapters.map((c) => c.body.length)) <= 2000) continue
    const uniq = new Set(chapters.map((c) => c.title.toLowerCase())).size / chapters.length
    const score = (uniq > 0.7 ? 1000 : 0) + chapters.length
    if (!best || score > best.score) best = { chapters, score }
  }
  return best?.chapters || null
}

async function run() {
  const report = []
  for (const w of WANTED) {
    try {
      const found = await gutendexFind(w)
      const res = await fetch(found.txtUrl)
      if (!res.ok) throw new Error(`text ${res.status}`)
      // Часть файлов Gutenberg лежит в latin-1: если после utf-8 остались
      // замены (�) — передекодируем.
      const buf = Buffer.from(await res.arrayBuffer())
      let raw = buf.toString('utf8')
      if (raw.includes('�')) raw = buf.toString('latin1')
      const chapters = chapterize(stripBoilerplate(raw))
      if (!chapters) throw new Error('не удалось нарезать на главы')
      const data = {
        book: { id: w.id, title: w.title, author: w.author, level: '' },
        chapters: chapters.map((c, i) => ({ num: i + 1, title: c.title, text: c.body })),
        dict: {},
      }
      fs.writeFileSync(path.join(OUT, `${w.id}.json`), JSON.stringify(data))
      report.push(`${w.id}: OK — ${chapters.length} глав (gutenberg#${found.gbId} «${found.gbTitle}»)`)
    } catch (e) {
      report.push(`${w.id}: ПРОПУЩЕНА — ${e.message}`)
    }
  }

  // Индекс пересобираем по факту: все <id>.json в каталоге (и извлечённые из
  // books.html, и загруженные отсюда) — так скрипты не затирают чужие книги.
  const index = fs
    .readdirSync(OUT)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => {
      const { book, chapters } = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'))
      return { id: book.id || path.basename(f, '.json'), title: book.title, author: book.author, level: book.level, chapters: chapters.length }
    })
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index))

  console.log(report.join('\n'))
  console.log(`\nВ индексе книг: ${index.length}`)
}

run()
