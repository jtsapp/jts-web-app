// Копия прототипа «Tenses World» для тестов: вход оракула
// (scripts/tenses/extract-oracle.js), бандл для vitest и e2e, файл для ручной
// проверки заливки в админке (движок тот же байт в байт — админка покажет
// «движок совпадает»).
//
// Сам прототип (64.7 МБ, почти всё — двенадцать mp4 в base64) в git не кладём.
// В копии ВСЕ блоки скрипта — и данных, и движка — те же байт в байт, кроме
// медиа: видео каждого времени — одно и то же крошечное mp4 (1.3 КБ, VP9 в
// MP4, сигнатура ftyp на смещении 4 — её проверяет бэкенд), постеры — один
// JPEG 16×9 (в блоке данных конфигурации меняются только сами data-URI). Тексты
// урока и банк практики целиком: оракул проходит все 12 времён и все 26 наборов.
//
// Крошечное mp4 записал Chrome (MediaRecorder, «video/mp4;codecs=vp9», холст
// 64×36, 1.2 с): ffmpeg на машине нет, а H.264 headless-Chrome не кодирует.
//
// Бандл — в форме контракта (спека 2026-11-10-tenses-punctuation-world-design.md,
// «Контракт: бандл»): блоки данных исполняются по порядку в песочнице с одним
// глобалом `window = {}` — как это делает бэкенд, — затем JSON.stringify внутри
// неё. Видео и постеры — ссылки /__tenses-media/<id>.mp4|jpg (e2e отдаёт их
// через page.route).
//
// Запуск: node scripts/tenses/make-fixture.js --html "<путь к прототипу>"

const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const sharp = require('sharp')

const OUT = path.join(__dirname, '..', '..', 'src', 'practice', 'tenses', '__fixtures__')
// sha256 движка файла 10.11.2026 (tenses.engine-sha бэкенда, спека «Хэш движка»).
const ENGINE_SHA = '1fb07b743713916486e4b4c922d851989499009b9fe6970ec09aa93c19c8edb0'
const SEP = '\n;\n'
const TINY_MP4 =
  'AAAAJGZ0eXBpc29tAAACAGlzb21pc282aXNvMnZwMDltcDQxAAACt21vb3YAAAB4bXZoZAEAAAAAAAAA5xiu0QAAAADnGK7RAAAD6AAAAAAAAARmAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAIPdHJhawAAAGh0a2hkAQAAAwAAAADnGK7RAAAAAOcYrtEAAAABAAAAAAAAAAAAAARmAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAABAAAAAJAAAAAABn21kaWEAAAAsbWRoZAEAAAAAAAAA5xiu0QAAAADnGK7RAAB1MAAAAAAAAARmVcQAAAAAAC1oZGxyAAAAAAAAAAB2aWRlAAAAAAAAAAAAAAAAVmlkZW9IYW5kbGVyAAAAAT5taW5mAAAAFHZtaGQAAAABAAAAAAAAAAAAAAAlZGluZgAAAB1kcmVmAAAAAAAAAAEAAAANdXJsIAAAAAEAAAAA/XN0YmwAAAAQc3RzYwAAAAAAAAAAAAAAEHN0dHMAAAAAAAAAAAAAABRzdHN6AAAAAAAAAAAAAAAAAAAAEHN0Y28AAAAAAAAAAAAAALFzdHNkAAAAAAAAAAEAAAChdnAwOQAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAABAACQASAAAAEgAAAAAAAAAAQpWUEMgQ29kaW5nAAAAAAAAAAAAAAAAAAAAAAAAAAAAABj//wAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAAAAAAAAAAAAAABR2cGNDAQAAAAAAgQENAQAAAAAAE2NvbHJuY2x4AAEADQABgAAAAChtdmV4AAAAIHRyZXgAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAADAbW9vZgAAABBtZmhkAAAAAAAAAAEAAACodHJhZgAAABR0ZmhkAAIAIAAAAAEBAQAAAAAAFHRmZHQBAAAAAAAAAAAAAAAAAAB4dHJ1bgEAAwUAAAAMAAAAyAIAAAAAAAZNAAAAUgAACrMAAAAhAAAHKgAAABIAAArVAAAAEgAACyYAAAATAAAMtgAAABQAAAqmAAAAEAAADRcAAAAQAAAK4wAAABAAAAz8AAAAEAAAFZoAAAAQAAAD5wAAABAAAAEmbWRhdIJJg0JQA/ACNho4JBwY/AAAIEAAa0P/2ZmouzaDbu3+1V8aOex9HzIHBhB/9mZqLs2g27t/tVfGjnsfR8yBwYP1Jg////5VY///8XB1BS1hKmCGAECSnKhXIAADcAAAdNI/zr/2i/5N8qm0WmSYPEuwWACGAECSnJxWgAADcAAAekLZHeCGAECSnHRUYAADcAAAfxes/iyGAECSnFhSAAADcAAAfujzcMAAhgBAkpxET8AAA3AAAH7o81G1WICGAECSnEBOwAADcAAAVAAAhgBAkpw4TcAAA3AAAFQAAIYAQJKcNE0AAANwAABUAACGAECSnDBMQAADcAAAVAAAhgBAkpwwS2AAA3AAAFQAAIYAQJKcLEpgAANwAABUAAAAAABMbWZyYQAAADR0ZnJhAQAAAAAAAAEAAAA/AAAAAQAAAAAAAAAAAAAAAAAAAtsAAAABAAAAAQAAAAEAAAAQbWZybwAAAAAAAABM'

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

// Блок данных — по признакам спеки (§«Хэш движка»); остальное — движок.
const isData = (c) => c.includes('TW.VIDEOS =') || c.includes('window.TENSES_DATA[') || c.includes('P.SETS =')

/** Inline-скрипты без атрибута type (в порядке файла) и видео-скрипты. */
function scriptsOf(html) {
  const out = []
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html))) out.push({ attrs: m[1], body: m[2], start: m.index, end: re.lastIndex })
  return out
}

const plain = (s) => !/\btype\s*=/.test(s.attrs) && !/\bsrc\s*=/.test(s.attrs)
const videoId = (s) => (s.attrs.match(/type="application\/octet-stream"/) && (s.attrs.match(/id="video-([a-z-]+)"/) || [])[1]) || null

/** sha256 движка по правилу спеки: блоки без type, переводы строк к \n, без блоков данных, склейка через «\n;\n». */
function engineSha(html) {
  const blocks = scriptsOf(html).filter(plain).map((s) => s.body.replace(/\r\n?/g, '\n'))
  const engine = blocks.filter((b) => !isData(b))
  return { sha: crypto.createHash('sha256').update(engine.join(SEP)).digest('hex'), count: engine.length }
}

/** Исполнить блоки данных так, как это делает бэкенд: один контекст, глобал только window = {}. */
function runData(html) {
  const box = vm.createContext({})
  vm.runInContext('var window = {};', box)
  const blocks = scriptsOf(html).filter(plain).map((s) => s.body.replace(/\r\n?/g, '\n')).filter(isData)
  if (!blocks.length) throw new Error('нет блоков данных')
  blocks.forEach((b, i) => vm.runInContext(b, box, { filename: `data-${i}.js`, timeout: 10000 }))
  const json = vm.runInContext(
    'JSON.stringify({TW: {VIDEOS: window.TW.VIDEOS, GROUPS: window.TW.GROUPS, ASPECTS: window.TW.ASPECTS, LOCAL_NAMES: window.TW.LOCAL_NAMES, ORDER: window.TW.ORDER, PRACTICE: window.TW.PRACTICE}, TENSES_DATA: window.TENSES_DATA})',
    box,
  )
  return JSON.parse(json)
}

async function main() {
  const src = arg('--html')
  if (!src) throw new Error('--html <путь к прототипу Tenses World>')
  const html = fs.readFileSync(src, 'utf8').replace(/\r\n?/g, '\n')
  const full = engineSha(html)
  if (full.count !== 5) throw new Error(`блоков движка ${full.count}, ждали 5`)
  if (full.sha !== ENGINE_SHA) console.warn(`ВНИМАНИЕ: движок прототипа ${full.sha} ≠ перенесённого на сайт ${ENGINE_SHA} — порт надо обновить`)

  const tinyJpeg = await sharp({ create: { width: 16, height: 9, channels: 3, background: { r: 135, g: 75, b: 248 } } })
    .jpeg({ quality: 40 })
    .toBuffer()
  const posterUri = 'data:image/jpeg;base64,' + tinyJpeg.toString('base64')

  // Сборка копии: меняем только тела видео-скриптов и data-URI постеров, остальное — как в файле.
  let out = ''
  let at = 0
  let videos = 0
  let posters = 0
  for (const s of scriptsOf(html)) {
    let body = s.body
    if (videoId(s)) {
      body = TINY_MP4
      videos++
    } else if (plain(s) && body.includes('TW.VIDEOS =')) {
      body = body.replace(/poster: "data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+"/g, () => {
        posters++
        return `poster: "${posterUri}"`
      })
    }
    out += html.slice(at, s.start) + `<script${s.attrs}>${body}</script>`
    at = s.end
  }
  out += html.slice(at)
  out = out.replace('<title>Tenses World — Just to Study</title>', '<title>Tenses World (fixture)</title>')
  if (videos !== 12 || posters !== 12) throw new Error(`видео ${videos}, постеров ${posters}, ждали по 12`)

  const mini = engineSha(out)
  if (mini.sha !== full.sha) throw new Error('движок копии разошёлся с прототипом')
  const before = runData(html)
  const data = runData(out)
  // Данные копии — те же, кроме постеров.
  for (const id of Object.keys(before.TW.VIDEOS)) before.TW.VIDEOS[id].poster = data.TW.VIDEOS[id].poster
  if (JSON.stringify(before) !== JSON.stringify(data)) throw new Error('данные копии разошлись с прототипом')

  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'prototype-mini.html'), out)

  const media = (id, ext) => `/__tenses-media/${id}.${ext}`
  const VIDEOS = {}
  for (const id of Object.keys(data.TW.VIDEOS)) VIDEOS[id] = { src: media(id, 'mp4'), embedded: false, poster: media(id, 'jpg') }
  const bundle = { release: 1, uploadedAt: '2026-11-10T00:00:00Z', TW: { ...data.TW, VIDEOS }, TENSES_DATA: data.TENSES_DATA }
  fs.writeFileSync(path.join(OUT, 'bundle.json'), JSON.stringify(bundle))

  const P = data.TW.PRACTICE
  const items = Object.values(P.SETS).reduce((n, s) => n + s.items.length, 0)
  const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024)
  console.log(
    `prototype-mini.html ${kb('prototype-mini.html')} КБ, bundle.json ${kb('bundle.json')} КБ; времён ${data.TW.ORDER.length}, ` +
      `наборов ${Object.keys(P.SETS).length}, заданий ${items}, этапов ${P.STAGES.length}; движок ${mini.sha}`,
  )
}

module.exports = { engineSha, runData, isData, ENGINE_SHA }

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
