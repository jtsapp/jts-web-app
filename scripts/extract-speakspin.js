#!/usr/bin/env node
// SpeakSpin: режет прототип data/jts-speakspin.html в данные раздела.
//
// Прототип — один html со всем внутри: банк тем (`const CONTENT = {...}`, 90
// тем + словарик с переводами) и строки интерфейса на трёх языках (литерал
// `copy=String.raw\`key|en|ru|kk\``). Экран рисует React, поэтому из html берём
// только данные; вёрстку и движок переписали руками (src/screens/speakspin).
//
// Выход:
//   src/practice/speakspin/topics.json  — { topics, vocab } как в прототипе;
//   src/practice/speakspin/strings.json — { key: { en, ru, kk } }.
//
// Темы лежат в src, а не в public: их читает и сервер (разбор берёт текст
// темы по topicId сам, а не из запроса — иначе в промпт грейдера уходит
// произвольный текст клиента), и клиент — динамическим import(), отдельным
// чанком.
//
// Запуск: node scripts/extract-speakspin.js [путь к html]

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SRC = process.argv[2] || path.join(ROOT, 'data', 'jts-speakspin.html')
const OUT = path.join(ROOT, 'src', 'practice', 'speakspin')

function extractContent(html) {
  const start = html.indexOf('const CONTENT=')
  if (start < 0) throw new Error('CONTENT не найден')
  const from = html.indexOf('{', start)
  const lineEnd = html.indexOf('\n', from)
  const line = html.slice(from, lineEnd < 0 ? undefined : lineEnd)
  // Литерал — валидный JSON до последней закрывающей скобки строки (дальше
  // идёт `;`).
  const json = line.slice(0, line.lastIndexOf('}') + 1)
  const data = JSON.parse(json)
  if (!Array.isArray(data.topics) || !data.vocab) throw new Error('CONTENT без topics/vocab')
  return data
}

function extractStrings(html) {
  const marker = 'const copy=String.raw`'
  const start = html.indexOf(marker)
  if (start < 0) throw new Error('copy-литерал не найден')
  const end = html.indexOf('`;', start + marker.length)
  const body = html.slice(start + marker.length, end)
  const out = {}
  // \r?\n, а не '\n': на Windows git (core.autocrlf) отдаёт html с CRLF, и
  // \r прилипал к последней колонке — к kk.
  for (const line of body.trim().split(/\r?\n/)) {
    const [key, en, ru, kk] = line.split('|')
    if (!key || en == null) continue
    // В прототипе перенос строки внутри фразы записан как «\n» буквами
    // (String.raw его не раскрывает).
    const fix = (s) => (s == null ? s : s.replace(/\\n/g, '\n'))
    out[key] = { en: fix(en), ru: fix(ru) || fix(en), kk: fix(kk) || fix(en) }
  }
  return out
}

function main() {
  const html = fs.readFileSync(SRC, 'utf8')
  const content = extractContent(html)
  const strings = extractStrings(html)

  const byLevel = {}
  for (const t of content.topics) byLevel[t.difficulty] = (byLevel[t.difficulty] || 0) + 1
  // Сверка с тем, что обещает сам прототип («90 тем · 3 уровня»): лучше упасть,
  // чем тихо выложить половину банка.
  if (content.topics.length !== 90 || byLevel.easy !== 30 || byLevel.medium !== 30 || byLevel.hard !== 30) {
    throw new Error(`неожиданный банк тем: ${JSON.stringify(byLevel)}`)
  }

  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'topics.json'), JSON.stringify(content) + '\n')
  fs.writeFileSync(path.join(OUT, 'strings.json'), JSON.stringify(strings, null, 1) + '\n')
  console.log(`topics: ${content.topics.length}, vocab: ${Object.keys(content.vocab).length}, strings: ${Object.keys(strings).length}`)
}

if (require.main === module) main()

module.exports = { extractContent, extractStrings }
