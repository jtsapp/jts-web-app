// Собирает уроки Shadowing из подборки в Notion: страница → public/shadowing/<id>.json.
//
// Страница Notion — это ссылка на YouTube плюс транскрипт панели «Показать текст
// видео», то есть куски по ~2 секунды, рвущие предложение пополам. Склейку в
// фразы уже умеет parseCaptions (src/practice/shadowing/engine.js) — его и
// зовём, своего парсера тут нет: две расходящиеся реализации одной склейки
// быстро разъедутся, а по ней выверены тайминги всех уроков.
//
// engine.js — ESM, а в package.json нет "type": "module", поэтому Node читает
// .js как CommonJS и падает на export. Обходим копией во временный .mjs.
//
// Что делает скрипт:
//   1. срезает шапку страницы Notion (заголовок + подпись закладки на ролик) —
//      без этого parseCaptions припишет им метку 0:00 и первой «фразой» урока
//      станет название страницы;
//   2. чистит пометки расшифровки и метки говорящих (см. normalizeCaptions);
//   3. режет на фразы и лечит склейку (см. rejoinFragments);
//   4. пишет public/shadowing/<id>.json — но НИКОГДА не поверх готового урока
//      (нужен --force: в файле лежит выверенная нарезка);
//   5. печатает строки для индекса src/practice/shadowing/lessons.js.
//
// Тайминги в Notion — реальные времена ролика, поэтому «Подогнать под видео» из
// авторского режима (?dev=1) не нужна: конец последней фразы расходится с
// длительностью на секунды. Если материал придёт с чужой шкалой — досбор руками
// через ?screen=shadowing&dev=1 (вставить captions.txt → «Разобрать» →
// «Подогнать под видео» → «Экспорт»).
//
// Вход (не коммитим, см. .gitignore): scripts/shadowing-src/<id>.txt — текст
// страницы Notion как есть. Метаданные — scripts/shadowing-src/sources.json.
//
// Запуск:  node scripts/extract-shadowing.js [id …] [--force]

const fs = require('fs')
const os = require('os')
const path = require('path')

const SRC_DIR = path.join(__dirname, 'shadowing-src')
const OUT_DIR = path.join(__dirname, '..', 'public', 'shadowing')
const SOURCES = path.join(SRC_DIR, 'sources.json')

// Метка времени панели транскрипта: «0:04», «12:07». С неё начинается материал —
// всё, что выше, это шапка страницы Notion.
const STAMP = /^\s*\d{1,2}:\d{2}\s*$/

// Пометки редактора расшифровки TED: их никто не произносит. Оставить их в
// эталоне нельзя — текст фразы уходит в Azure как образец, и ученик получает
// «пропуск» за каждое слово, которого в речи не было.
const MARKER = /\((?:laughter|applause|music|video|stage|cheers|cheering|singing|sighs|beat)\)/gi

// Кандидат в метку говорящего: «Mother:», «JH:», «Jenny Hoyos:» в начале строки.
const LABEL = /^([A-Z][A-Za-z.'-]*(?: [A-Z][A-Za-z.'-]*){0,2}):\s+/

function stripNotionHeader(raw) {
  const lines = raw.replace(/\r/g, '').split('\n')
  const first = lines.findIndex((l) => STAMP.test(l))
  if (first < 0) return null // страница без таймкодов — не транскрипт
  return lines.slice(first).join('\n').trim() + '\n'
}

// Метки говорящих собираем по всему транскрипту, а не режем первую попавшуюся
// «Слово:» — иначе под нож попадёт обычная речь вроде «Remember: …». Метка —
// это либо инициалы (JH:), либо имя из двух слов (Jenny Hoyos:), либо то, что
// повторяется в расшифровке хотя бы дважды (Mother:).
function speakerLabels(lines) {
  const seen = new Map()
  for (const ln of lines) {
    const m = ln.match(LABEL)
    if (m) seen.set(m[1], (seen.get(m[1]) || 0) + 1)
  }
  const labels = new Set()
  for (const [name, n] of seen) {
    if (n >= 2 || /^[A-Z]{2,4}$/.test(name) || name.includes(' ')) labels.add(name)
  }
  return labels
}

// Чистим текст реплик: пометки и метки говорящих вон. Строку, от которой ничего
// не осталось (реплика была ТОЛЬКО из пометки), не удаляем, а опустошаем — её
// метка времени тогда не даёт фразы, и следующая фраза стартует со своего
// таймкода. Иначе сегмент начинался бы за 4–5 секунд до речи, на музыке.
function normalizeCaptions(body) {
  const lines = body.split('\n')
  const labels = speakerLabels(lines)
  return lines
    .map((ln) => {
      if (STAMP.test(ln)) return ln
      let out = ln.replace(MARKER, ' ')
      const m = out.match(LABEL)
      if (m && labels.has(m[1])) out = out.slice(m[0].length)
      return out.replace(/\s+/g, ' ').trim()
    })
    .join('\n')
}

// Тот же parseCaptions, что и в браузере. Копия во временный .mjs — иначе Node
// прочитает engine.js как CommonJS и упадёт на export (см. шапку файла).
async function loadParser() {
  const src = path.join(__dirname, '..', 'src', 'practice', 'shadowing', 'engine.js')
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shadowing-')), 'engine.mjs')
  fs.copyFileSync(src, tmp)
  const mod = await import(require('url').pathToFileURL(tmp).href)
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true })
  return mod.parseCaptions
}

// Потолок склейки в parseCaptions (11 с / 190 символов) режет длинное
// предложение на полуслове, и в уроке остаются огрызки вроде одного слова с
// точкой — для повторения за диктором это мусор. Дотягиваем такие куски до
// предыдущей фразы, пока укладываемся в пределы, за которыми ломается оценка:
// 25 с (выше Azure уходит в continuous) и 1000 символов (там режется эталон).
// Берём с запасом — фраза длиннее 20 секунд уже неповторима на слух.
const MAX_JOIN_SEC = 20
const MAX_JOIN_CHARS = 300

function rejoinFragments(segs) {
  const out = []
  for (const seg of segs) {
    const prev = out[out.length - 1]
    const startsMidSentence = /^[a-z]/.test(seg[2])
    if (
      prev &&
      startsMidSentence &&
      seg[1] - prev[0] <= MAX_JOIN_SEC &&
      prev[2].length + 1 + seg[2].length <= MAX_JOIN_CHARS
    ) {
      prev[1] = seg[1]
      prev[2] = `${prev[2]} ${seg[2]}`
      continue
    }
    out.push([seg[0], seg[1], seg[2]])
  }
  return out
}

// Сегменты пишем по одному в строку: правки текста фразы должны читаться в
// диффе, а не тонуть в переносах JSON.stringify.
function writeLesson(file, meta, segments) {
  const body = segments.map((s) => '    ' + JSON.stringify(s)).join(',\n')
  const head = JSON.stringify({ ...meta, segments: [] }, null, 2).replace(
    /\n  "segments": \[\]\n\}$/,
    '',
  )
  fs.writeFileSync(file, `${head}\n  "segments": [\n${body}\n  ]\n}\n`)
}

async function main() {
  if (!fs.existsSync(SOURCES)) {
    console.error(`нет ${path.relative(process.cwd(), SOURCES)} — описания уроков`)
    process.exit(1)
  }
  const sources = JSON.parse(fs.readFileSync(SOURCES, 'utf8'))
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const only = args.filter((a) => a !== '--force')
  const list = only.length ? sources.filter((s) => only.includes(s.id)) : sources
  if (!list.length) {
    console.error('ничего не выбрано: проверь id')
    process.exit(1)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const parseCaptions = await loadParser()
  const rows = []
  const held = []

  for (const s of list) {
    const inFile = path.join(SRC_DIR, `${s.id}.txt`)
    if (!fs.existsSync(inFile)) {
      console.warn(`· ${s.id}: нет ${path.relative(process.cwd(), inFile)} — пропуск`)
      continue
    }
    const head = stripNotionHeader(fs.readFileSync(inFile, 'utf8'))
    if (!head) {
      console.warn(`· ${s.id}: в тексте нет таймкодов — пропуск`)
      continue
    }
    const body = normalizeCaptions(head)
    const dropped = (head.match(MARKER) || []).length
    const capFile = path.join(SRC_DIR, `${s.id}.captions.txt`)
    fs.writeFileSync(capFile, body)
    if (dropped) console.log(`  вычищено пометок расшифровки: ${dropped}`)

    // Готовый урок не трогаем без --force: в его segments лежит выверенная
    // нарезка, и случайный прогон скрипта не должен её переписывать.
    const outFile = path.join(OUT_DIR, `${s.id}.json`)
    const exists = fs.existsSync(outFile)
    if (exists && !force) {
      const cur = JSON.parse(fs.readFileSync(outFile, 'utf8'))
      console.log(`· ${s.id}: captions.txt обновлён; json уже есть (${cur.segments.length} фраз) — нужен --force`)
      if (s.hold) held.push(`${s.id}: ${s.hold}`)
      else rows.push(indexRow(s, cur.segments.length))
      continue
    }

    const cut = parseCaptions(body)
    const segments = rejoinFragments(cut)
    const meta = exists
      ? JSON.parse(fs.readFileSync(outFile, 'utf8'))
      : {
          id: s.id,
          title: s.title,
          short: s.short,
          video: s.video,
          source: { channel: s.channel || null, url: `https://www.youtube.com/watch?v=${s.video}` },
          level: s.level || null,
        }
    writeLesson(outFile, { ...meta, segments: [] }, segments)

    const longest = segments.reduce((m, x) => Math.max(m, x[1] - x[0]), 0)
    const joined = cut.length - segments.length
    console.log(
      `· ${s.id}: ${segments.length} фраз (сшито ${joined}), конец ${segments.length ? segments[segments.length - 1][1] : 0}s, самая длинная ${longest.toFixed(1)}s`,
    )
    // hold — материал нарезан, но в индекс не идёт: см. поле в sources.json.
    // Файл всё равно пишем, чтобы решение можно было отменить одной строкой.
    if (s.hold) held.push(`${s.id}: ${s.hold}`)
    else rows.push(indexRow(s, segments.length))
  }

  if (held.length) {
    console.log('\nНе идут в индекс:')
    for (const h of held) console.log(`  ${h}`)
  }

  if (rows.length) {
    console.log('\nСтроки для src/practice/shadowing/lessons.js:')
    for (const r of rows) console.log(r)
  }
}

function indexRow(s, segCount) {
  return `  { id: '${s.id}', title: '${s.title.replace(/'/g, "\\'")}', short: '${s.short.replace(/'/g, "\\'")}', video: '${s.video}', segCount: ${segCount} },`
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
