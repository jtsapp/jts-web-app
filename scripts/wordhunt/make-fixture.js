// Урезанная копия прототипа Word Hunt для тестов: вход оракула
// (scripts/wordhunt/extract-oracle.js) и бандла vitest/e2e
// (scripts/wordhunt/make-bundle.js → __fixtures__/bundle.json).
//
// Сам прототип (11,7 МБ: словарь курса, записи и картинки в base64) в git не
// кладём. Копия — тот же файл, где скрипты движка байт в байт прежние, а данные
// урезаны: из каждого уровня A0–B2 и из одной станции (Business) — несколько
// уроков разной CEFR-политики (A0 с картинками и записями, A1 с переводом под
// подсказкой, B2 без перевода, станция — со своей полосой B1/B2 по юниту), все
// 16 станций в FIELDS (движок сам прячет станцию без области). Записи — один
// 8-байтный mp3 на все ключи, картинки слов и 26 картинок дизайна в CSS — одна
// webp 8×8: движку нужны ключи, а не пиксели.
//
// Хэш движка у копии другой (картинки в <style> входят в него), поэтому
// админка на эту копию скажет «другой движок» — это ожидаемо.
//
// Запуск: node scripts/wordhunt/make-fixture.js --html "<путь к прототипу>"

const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const { readPrototype } = require('./read-prototype.js')

const OUT = path.join(__dirname, '..', '..', 'src', 'practice', 'wordhunt', '__fixtures__')
const MP3 = Buffer.from([0xff, 0xfb, 0x90, 0xc0, 0, 0, 0, 0])
// Какие уроки оставить: область → номера уроков (порядок юнитов прототипа сохраняется).
const KEEP = {
  A0: [1, 2, 3, 4],
  A1: [1, 2],
  A2: [1],
  B1: [1],
  B2: [1, 2],
  'F:business': [1, 6],
}

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

function shrinkArea(area, keep) {
  const lessons = {}
  for (const n of keep) {
    const les = area.lessons[String(n)]
    if (!les) throw new Error(`нет урока ${n}`)
    lessons[String(n)] = les
  }
  const units = area.units
    .map((u) => ({ ...u, lessons: u.lessons.filter((n) => keep.includes(n)) }))
    .filter((u) => u.lessons.length)
  return { ...area, units, lessons }
}

async function main() {
  const src = arg('--html')
  if (!src) throw new Error('--html <путь к прототипу Word Hunt>')
  const html = fs.readFileSync(src, 'utf8')
  const proto = readPrototype(html)

  const db = { levels: proto.DB.levels }
  for (const [lv, keep] of Object.entries(KEEP)) {
    if (!proto.DB[lv]) throw new Error(`нет области ${lv}`)
    db[lv] = shrinkArea(proto.DB[lv], keep)
  }
  const atoms = new Set()
  const cards = new Set()
  const clueKeys = new Set()
  for (const lv of Object.keys(KEEP)) {
    for (const les of Object.values(db[lv].lessons)) {
      for (const a of les.atoms) {
        atoms.add(a.id)
        clueKeys.add(`${lv}|${a.id}`)
      }
      for (const c of les.cards) cards.add(c.id)
    }
  }

  const tiny = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 180, g: 140, b: 255, alpha: 1 } } })
    .webp({ quality: 50 })
    .toBuffer()
  const webpUri = 'data:image/webp;base64,' + tiny.toString('base64')
  const mp3Uri = 'data:audio/mpeg;base64,' + MP3.toString('base64')
  const data = {
    DB: db,
    FIELDS: proto.FIELDS,
    AUD: Object.fromEntries(Object.keys(proto.AUD).filter((k) => atoms.has(k)).map((k) => [k, mp3Uri])),
    PICS: Object.fromEntries(Object.keys(proto.PICS).filter((k) => cards.has(k)).map((k) => [k, webpUri])),
    CLUEQ: Object.fromEntries(Object.entries(proto.CLUEQ).filter(([k]) => clueKeys.has(k))),
  }

  // Скрипт данных: те же строки-комментарии, литералы — урезанные.
  const d = proto.dataBlock
  const dataBody = d.body
    .split('\n')
    .map((l) => {
      const m = l.match(/^var (DB|FIELDS|AUD|PICS|CLUEQ)=/)
      return m ? `var ${m[1]}=${JSON.stringify(data[m[1]])};` : l
    })
    .join('\n')
  // Стиль: картинки дизайна — той же крошечной webp, остальное байт в байт.
  const st = proto.styles[0]
  const style = st.body.replace(/url\(data:image\/webp;base64,[A-Za-z0-9+/=]+\)/g, `url(${webpUri})`)
  const parts = [[st, style], [d, dataBody]].sort((a, b) => a[0].start - b[0].start)
  let out = ''
  let at = 0
  for (const [b, body] of parts) {
    out += html.slice(at, b.start) + body
    at = b.end
  }
  out += html.slice(at)

  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'prototype-mini.html'), out)
  const kb = Math.round(fs.statSync(path.join(OUT, 'prototype-mini.html')).size / 1024)
  const nLessons = Object.values(KEEP).reduce((s, k) => s + k.length, 0)
  console.log(`prototype-mini.html ${kb} КБ; уроков ${nLessons}, атомов ${atoms.size}, записей ${Object.keys(data.AUD).length}, картинок ${Object.keys(data.PICS).length}, CLUEQ ${Object.keys(data.CLUEQ).length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
