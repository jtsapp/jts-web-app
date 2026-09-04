#!/usr/bin/env node
// Сборка разметки караоке из LRC.
//
//   node scripts/make-karaoke-lyrics.js --lrc song.lrc --audio song.mp3 \
//        [--ru song.ru.txt] [--vocab song.vocab.txt] [--slug rainy-monday] \
//        [--out build/karaoke/rainy-monday.json]
//
// Что делает и почему именно так:
//
//  • `duration` берётся из САМОГО mp3, а не из конца последней строки. По ней
//    строятся маски метрик, и на песне с длинным проигрышем в конце укороченная
//    шкала завысила бы и ритм, и покрытие.
//  • конец строки — начало следующей записи LRC (включая пустые метки пауз),
//    но не длиннее --max-line секунд: в LRC конца строк нет вовсе, а тянуть
//    строку через весь проигрыш нельзя — студент «не спел» её по покрытию.
//  • результат проверяется тем же кодом, что и в плеере (normalizeLyrics).
//    Файл, который не примет приложение, скрипт не запишет.
//
// Готовый json заливается в карточку трека (админка → Медиа → Караоке) или
// прямо ручкой POST /admin/karaoke/{id}/upload-lyrics.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, basename } from 'node:path'
import { buildLyrics, parseVocabFile, fillSkeleton, parseTextFile } from './lib/lrc.js'
import { mp3Info } from './lib/mp3-duration.js'
import { normalizeLyrics } from '../src/practice/karaoke/karaokeShape.js'

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function fail(message) {
  console.error(`\n  ✗ ${message}\n`)
  process.exit(1)
}

const lrcPath = arg('lrc')
const audioPath = arg('audio')
if (!lrcPath) fail('нужен --lrc <файл.lrc>')

let lrc = readFileSync(lrcPath, 'utf8')

// Скелет + отдельный файл с текстом. Так тайминги снимаются машинно из
// фонограммы, а слова берутся из источника, который есть у методиста, — и
// правятся они независимо друг от друга.
if (arg('text')) {
  const texts = parseTextFile(readFileSync(arg('text'), 'utf8'))
  try {
    lrc = fillSkeleton(lrc, texts)
  } catch (e) {
    fail(e.message)
  }
  console.log(`  текст: ${texts.length} строк подставлено в скелет`)
  if (arg('save-lrc')) {
    writeFileSync(arg('save-lrc'), lrc, 'utf8')
    console.log(`  собранный lrc: ${arg('save-lrc')}`)
  }
}
const ru = arg('ru') ? readFileSync(arg('ru'), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : []
const vocab = arg('vocab') ? parseVocabFile(readFileSync(arg('vocab'), 'utf8')) : []

let duration = Number(arg('duration', 0))
if (!duration && audioPath) {
  const info = mp3Info(readFileSync(audioPath))
  if (!info) fail(`не разобрать mp3: ${audioPath}`)
  duration = info.seconds
  console.log(
    `  фонограмма: ${fmt(info.seconds)} · ${info.bitrate} kbps${info.vbr ? ' VBR' : ''} · ${info.sampleRate} Гц`,
  )
}
if (!duration) fail('нужен --audio <файл.mp3> или --duration <секунды>')

const slug = arg('slug') || basename(lrcPath).replace(/\.lrc$/i, '')
const out = arg('out') || `build/karaoke/${slug}.json`

let doc
try {
  doc = buildLyrics({ lrc, duration, ru, vocab, slug, maxLineSec: Number(arg('max-line', 12)) })
} catch (e) {
  fail(e.message)
}

// Последнее слово за плеером: если он такую разметку не примет, писать её на
// диск незачем — она всё равно не доедет до студента.
const checked = normalizeLyrics(doc)
if (!checked) {
  fail('разметка не прошла проверку плеера: строки пересекаются или у строки start >= end')
}
for (const problem of checked.problems) console.log(`  ! ${problem}`)

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(doc, null, 2) + '\n', 'utf8')

const covered = checked.lines.reduce((sum, l) => sum + (l.end - l.start), 0)
console.log(`  строк: ${doc.lines.length}`)
console.log(`  слов в словаре: ${doc.vocab?.length || 0}`)
console.log(`  пословных таймкодов: ${doc.lines.filter((l) => l.words?.length).length} строк`)
console.log(`  под пение отдано: ${fmt(covered)} из ${fmt(doc.duration)}`)
console.log(`\n  → ${out}\n`)

function fmt(sec) {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
