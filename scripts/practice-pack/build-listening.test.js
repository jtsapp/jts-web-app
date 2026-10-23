import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildListeningPack, packZip, sha24 } = require('./build-listening.js')
const { unzipSync } = require('../lib/zip.js')

// Мини-копия public/practice/listening: два задания одного уровня делят запись
// (так в данных у трёх пар), третье — своя запись; уровня b1 нет вовсе.
const MP3_A = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0, 1])
const MP3_B = Buffer.from([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0, 2])
let root

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-'))
  const content = path.join(root, 'public/practice/listening/content')
  fs.mkdirSync(content, { recursive: true })
  fs.mkdirSync(path.join(root, 'public/practice/listening/audio/a1'), { recursive: true })
  fs.mkdirSync(path.join(root, 'public/practice/listening/audio/a2'), { recursive: true })
  fs.writeFileSync(path.join(root, 'public/practice/listening/audio/a1/x.mp3'), MP3_A)
  fs.writeFileSync(path.join(root, 'public/practice/listening/audio/a2/y.mp3'), MP3_B)
  fs.writeFileSync(path.join(content, 'a1.json'), JSON.stringify([
    { id: 'a1_001', type: 'listen_type', audio: 'x.mp3', explanation: '', answer: 'Hi' },
    { id: 'a1_002', type: 'listen_type', audio: 'x.mp3', explanation: '', answer: 'Hello' },
  ]))
  fs.writeFileSync(path.join(content, 'a2.json'), JSON.stringify([
    { id: 'a2_001', type: 'listen_type', audio: 'y.mp3', explanation: '<b>b</b>', answer: 'Bye' },
  ]))
})

afterAll(() => fs.rmSync(root, { recursive: true, force: true }))

describe('build-listening', () => {
  it('задания всех уровней с level и ссылкой на запись по хэшу; общая запись — один файл', () => {
    const pack = buildListeningPack({ root, source: 'test', now: new Date('2026-10-21T00:00:00Z') })
    expect(pack.items.map((i) => [i.id, i.level])).toEqual([['a1_001', 'a1'], ['a1_002', 'a1'], ['a2_001', 'a2']])
    expect(pack.items[0].audio).toBe(`media/${sha24(MP3_A)}.mp3`)
    expect(pack.items[1].audio).toBe(pack.items[0].audio)
    expect(pack.media.size).toBe(2)
    expect(pack.manifest).toMatchObject({
      format: 'jts-practice-pack', version: 1, section: 'listening', source: 'test',
      counts: { a1: 2, a2: 1, items: 3 },
    })
  })

  it('zip: manifest, items и медиа под именами-хэшами', () => {
    const pack = buildListeningPack({ root, source: 'test' })
    const files = unzipSync(packZip(pack))
    expect(Object.keys(files).sort()).toEqual([
      'items.json', 'manifest.json', `media/${sha24(MP3_A)}.mp3`, `media/${sha24(MP3_B)}.mp3`,
    ].sort())
    expect(JSON.parse(files['items.json'].toString()).length).toBe(3)
    expect(Buffer.compare(files[`media/${sha24(MP3_B)}.mp3`], MP3_B)).toBe(0)
  })

  it('записи нет на диске — падает с путём, а не собирает дырявый пакет', () => {
    fs.writeFileSync(path.join(root, 'public/practice/listening/content/b1.json'),
      JSON.stringify([{ id: 'b1_001', type: 'listen_type', audio: 'nope.mp3', answer: 'x' }]))
    expect(() => buildListeningPack({ root, source: 'test' })).toThrow(/nope\.mp3/)
    fs.rmSync(path.join(root, 'public/practice/listening/content/b1.json'))
  })
})
