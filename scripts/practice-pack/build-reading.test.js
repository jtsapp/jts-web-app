import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildReadingPack, packZip, LEVELS } = require('./build-reading.js')
const { unzipSync } = require('../lib/zip.js')

// Сборщик гоняется по настоящим файлам public/practice/reading: пакет обязан
// нести ровно то, что сейчас видит ученик, — это и проверяем.
const ROOT = path.resolve(__dirname, '..', '..')
const onDisk = LEVELS.flatMap((lv) => JSON.parse(fs.readFileSync(path.join(ROOT, 'public/practice/reading', `${lv}.json`), 'utf8')).texts)

describe('build-reading', () => {
  it('все 80 текстов как лежат на сайте, по порядку уровней; манифест сходится', () => {
    const pack = buildReadingPack({ source: 'test', now: new Date('2026-10-22T00:00:00Z') })
    expect(pack.items).toEqual(onDisk)
    expect(pack.items).toHaveLength(80)
    expect(pack.items.every((t) => /^[A-C][12]$/.test(t.level) && t.id.startsWith(t.level.toLowerCase() + '-'))).toBe(true)
    expect(pack.manifest).toEqual({
      format: 'jts-practice-pack', version: 1, section: 'reading', source: 'test',
      createdAt: '2026-10-22T00:00:00.000Z',
      counts: { a1: 16, a2: 16, b1: 16, b2: 16, c1: 16, items: 80 },
      media: [],
    })
  })

  it('zip — только manifest и items, папки media нет', () => {
    const files = unzipSync(packZip(buildReadingPack({ source: 'test' })))
    expect(Object.keys(files).sort()).toEqual(['items.json', 'manifest.json'])
    expect(JSON.parse(files['items.json'].toString())).toHaveLength(80)
  })
})
