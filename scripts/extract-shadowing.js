// Готовит материалы Shadowing из подборки в Notion к нарезке на фразы.
//
// Зачем нужен: страница Notion — это ссылка на YouTube плюс транскрипт панели
// «Показать текст видео», то есть куски по ~2 секунды, рвущие предложение
// пополам. Склейку в фразы уже умеет parseCaptions (src/practice/shadowing/
// engine.js), а подгонку таймингов под реальную длину ролика — кнопка «Подогнать
// под видео» в авторском режиме (?dev=1). Обе живут в браузере: fit тянет
// getDuration() у плеера YouTube. Поэтому здесь НЕТ своего парсера — иначе в
// проекте было бы две расходящиеся реализации одной склейки.
//
// Что делает скрипт:
//   1. срезает шапку страницы Notion (заголовок + подпись закладки на ролик) —
//      без этого parseCaptions припишет им метку 0:00 и первой «фразой» урока
//      станет название страницы;
//   2. кладёт готовый к вставке текст в scripts/shadowing-src/<id>.captions.txt;
//   3. заводит болванку public/shadowing/<id>.json с метаданными и пустым
//      segments — чтобы урок открывался в ?dev=1 и было куда сложить нарезку;
//   4. печатает строку для индекса src/practice/shadowing/lessons.js.
//
// Дальше руками на каждый урок: ?screen=shadowing&dev=1 → вставить captions.txt
// → «Разобрать» → «Подогнать под видео» → «Экспорт» → положить файл в
// public/shadowing/ и обновить segCount в индексе.
//
// Вход (не коммитим, см. .gitignore): scripts/shadowing-src/<id>.txt — текст
// страницы Notion как есть. Метаданные — scripts/shadowing-src/sources.json.
//
// Запуск:  node scripts/extract-shadowing.js [id …]   (без аргументов — все)

const fs = require('fs')
const path = require('path')

const SRC_DIR = path.join(__dirname, 'shadowing-src')
const OUT_DIR = path.join(__dirname, '..', 'public', 'shadowing')
const SOURCES = path.join(SRC_DIR, 'sources.json')

// Метка времени панели транскрипта: «0:04», «12:07». С неё начинается материал —
// всё, что выше, это шапка страницы Notion.
const STAMP = /^\s*\d{1,2}:\d{2}\s*$/

function stripNotionHeader(raw) {
  const lines = raw.replace(/\r/g, '').split('\n')
  const first = lines.findIndex((l) => STAMP.test(l))
  if (first < 0) return null // страница без таймкодов — не транскрипт
  return lines.slice(first).join('\n').trim() + '\n'
}

function main() {
  if (!fs.existsSync(SOURCES)) {
    console.error(`нет ${path.relative(process.cwd(), SOURCES)} — описания уроков`)
    process.exit(1)
  }
  const sources = JSON.parse(fs.readFileSync(SOURCES, 'utf8'))
  const only = process.argv.slice(2)
  const list = only.length ? sources.filter((s) => only.includes(s.id)) : sources
  if (!list.length) {
    console.error('ничего не выбрано: проверь id')
    process.exit(1)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const rows = []

  for (const s of list) {
    const inFile = path.join(SRC_DIR, `${s.id}.txt`)
    if (!fs.existsSync(inFile)) {
      console.warn(`· ${s.id}: нет ${path.relative(process.cwd(), inFile)} — пропуск`)
      continue
    }
    const body = stripNotionHeader(fs.readFileSync(inFile, 'utf8'))
    if (!body) {
      console.warn(`· ${s.id}: в тексте нет таймкодов — пропуск`)
      continue
    }
    const capFile = path.join(SRC_DIR, `${s.id}.captions.txt`)
    fs.writeFileSync(capFile, body)

    // Болванку пишем ТОЛЬКО если файла ещё нет: у готового урока в segments
    // лежит выверенная нарезка, и затирать её прогоном скрипта нельзя.
    const outFile = path.join(OUT_DIR, `${s.id}.json`)
    if (fs.existsSync(outFile)) {
      const cur = JSON.parse(fs.readFileSync(outFile, 'utf8'))
      console.log(`· ${s.id}: ${body.split('\n').length} строк → captions.txt (json уже есть, ${cur.segments.length} фраз)`)
      rows.push(indexRow(s, cur.segments.length))
      continue
    }
    fs.writeFileSync(
      outFile,
      JSON.stringify(
        {
          id: s.id,
          title: s.title,
          short: s.short,
          video: s.video,
          source: { channel: s.channel || null, url: `https://www.youtube.com/watch?v=${s.video}` },
          level: s.level || null,
          segments: [],
        },
        null,
        2,
      ) + '\n',
    )
    console.log(`· ${s.id}: ${body.split('\n').length} строк → captions.txt + болванка json`)
    rows.push(indexRow(s, 0))
  }

  if (rows.length) {
    console.log('\nСтроки для src/practice/shadowing/lessons.js:')
    for (const r of rows) console.log(r)
  }
}

function indexRow(s, segCount) {
  return `  { id: '${s.id}', title: '${s.title.replace(/'/g, "\\'")}', short: '${s.short.replace(/'/g, "\\'")}', video: '${s.video}', segCount: ${segCount} },`
}

main()
