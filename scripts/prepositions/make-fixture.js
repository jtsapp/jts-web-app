// Урезанная копия прототипа «Prepositions World» для тестов: вход оракула
// (scripts/prepositions/extract-oracle.js), бандл для vitest и e2e, файл для
// ручной проверки заливки в админке (движок тот же байт в байт — админка
// покажет «движок совпадает»).
//
// Сам прототип (23 МБ, почти всё — base64 картинок и записей) в git не кладём.
// Копия: категория place — два первых урока и все её общие вопросы; картинки
// — все ключи, но каждая 8×8 (движку нужны ключи и размеры из assets.size, а не
// пиксели); записи — все ключи одним 8-байтным mp3 (сигнатуру проверяет бэкенд,
// звук в тестах не играет).
//
// Запуск: node scripts/prepositions/make-fixture.js --html "<путь к прототипу>"

const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const OUT = path.join(__dirname, '..', '..', 'src', 'practice', 'prepositions', '__fixtures__')
const KEEP_CAT = 'place'
const KEEP_LESSONS = 2
const MP3 = Buffer.from([0xff, 0xfb, 0x90, 0xc0, 0, 0, 0, 0])

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

function block(html, id) {
  const open = html.indexOf(`<script type="application/json" id="${id}">`)
  if (open < 0) throw new Error(`нет блока ${id}`)
  const start = html.indexOf('>', open) + 1
  const end = html.indexOf('</script>', start)
  return JSON.parse(html.slice(start, end))
}

function engineScript(html) {
  // последний <script> без type — движок
  const open = html.lastIndexOf('<script>')
  const end = html.indexOf('</script>', open)
  return html.slice(open + '<script>'.length, end)
}

function styleBlock(html) {
  const open = html.indexOf('<style>')
  const end = html.indexOf('</style>', open)
  return html
    .slice(open + '<style>'.length, end)
    .split('\n')
    .filter((l) => !l.startsWith('@font-face'))
    .join('\n')
}

async function main() {
  const src = arg('--html')
  if (!src) throw new Error('--html <путь к прототипу Prepositions World>')
  const html = fs.readFileSync(src, 'utf8')
  const course = block(html, 'course')
  const pics = block(html, 'pics')
  const pcat = block(html, 'pcat')
  const assets = block(html, 'assets')
  const aud = block(html, 'aud')

  const cat = course.cats.find((c) => c.id === KEEP_CAT)
  if (!cat) throw new Error(`нет категории ${KEEP_CAT}`)
  cat.lessons = cat.lessons.slice(0, KEEP_LESSONS)
  const mini = { cats: [cat] }
  const keepPic = (k) => k.startsWith(`${KEEP_CAT}/int/`) || cat.lessons.some((l) => k.startsWith(`${KEEP_CAT}/${l.id}/`))
  const miniPics = Object.fromEntries(Object.entries(pics).filter(([k]) => keepPic(k)))

  const tiny = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 140, g: 110, b: 230, alpha: 1 } } })
    .webp({ quality: 50 })
    .toBuffer()
  const tinyUri = 'data:image/webp;base64,' + tiny.toString('base64')
  const mp3Uri = 'data:audio/mpeg;base64,' + MP3.toString('base64')
  const img = Object.fromEntries(Object.keys(assets.img).map((k) => [k, tinyUri]))
  const miniAssets = { img, size: assets.size, slots: assets.slots }
  const miniAud = Object.fromEntries(Object.keys(aud).map((k) => [k, mp3Uri]))

  const json = (id, data) => `<script type="application/json" id="${id}">${JSON.stringify(data)}</script>`
  const out = [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8"><title>Prepositions World (fixture)</title>',
    `<style>${styleBlock(html)}</style></head><body><div id="app"></div>`,
    json('assets', miniAssets),
    json('course', mini),
    json('aud', miniAud),
    json('pics', miniPics),
    json('pcat', pcat),
    `<script>${engineScript(html)}</script></body></html>`,
    '',
  ].join('\n')
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'prototype-mini.html'), out)

  // PDEF — литерал движка; в бандл бэкенд кладёт его объектом. Здесь — тем же
  // путём, что и прототип его видит: исполнить объявление.
  const pdefSrc = engineScript(html).match(/const PDEF=(\{.*?\});\n/s)
  if (!pdefSrc) throw new Error('нет const PDEF')
  const pdef = JSON.parse(pdefSrc[1])
  const media = (map, ext) => Object.fromEntries(Object.keys(map).map((k) => [k, `/__prep-media/${k}.${ext}`]))
  const bundle = {
    release: 1,
    uploadedAt: '2026-10-22T00:00:00',
    course: mini,
    pics: miniPics,
    pcat,
    pdef,
    assets: { img: media(assets.img, 'webp'), size: assets.size, slots: assets.slots },
    aud: media(aud, 'mp3'),
  }
  fs.writeFileSync(path.join(OUT, 'bundle.json'), JSON.stringify(bundle))
  const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024)
  console.log(`prototype-mini.html ${kb('prototype-mini.html')} КБ, bundle.json ${kb('bundle.json')} КБ; уроков ${cat.lessons.length}, общих ${cat.integrated.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
