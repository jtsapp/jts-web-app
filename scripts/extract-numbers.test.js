// Тесты экстрактора «Чисел». Гоняются по настоящему прототипу
// (data/jtsnumbers.html): правка контента без перезапуска экстрактора или сдвиг
// структуры прототипа станут красными здесь, а не пустым экраном в проде.

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_OUT, SRC, extract } from './extract-numbers.js'
import { withGeneratedTours } from '../src/practice/numbers/logic.js'

const html = fs.readFileSync(SRC, 'utf8')
const { files, game } = extract(html)

describe('extract-numbers', () => {
  it('файлы в public/practice/numbers совпадают с тем, что режется из прототипа', () => {
    for (const [rel, buf] of Object.entries(files)) {
      const p = path.join(DEFAULT_OUT, rel)
      expect(fs.existsSync(p), `${rel} — перезапусти node scripts/extract-numbers.js`).toBe(true)
      expect(fs.readFileSync(p).equals(buf), `${rel} устарел — перезапусти экстрактор`).toBe(true)
    }
  })

  it('в данных 17 разделов, у каждого есть объяснение', () => {
    const data = JSON.parse(files['data.json'])
    expect(data.sections).toHaveLength(17)
    for (const s of data.sections) expect(data.lessons[s.id], s.id).toBeTruthy()
  })

  it('раунды боссов и Lab, собранные logic.js, — те же, что собрал прототип', () => {
    const data = JSON.parse(files['data.json'])
    const ours = withGeneratedTours(data.sections, data.tours)
    for (const id of ['boss1', 'boss2', 'boss3', 'lab']) {
      // JSON с обеих сторон: дыры массивов прототипа (c[8] = тема) становятся null.
      expect(JSON.parse(JSON.stringify(ours[id])), id).toEqual(JSON.parse(JSON.stringify(game.TOURS[id])))
    }
  })

  it('картинки и шрифты: 11 картинок, 8 начертаний', () => {
    const rels = Object.keys(files)
    expect(rels.filter((r) => r.startsWith('img/'))).toHaveLength(11)
    expect(rels.filter((r) => r.endsWith('.woff2'))).toHaveLength(8)
    expect(String(files['fonts/fonts.css'])).toMatch(/url\(\/practice\/numbers\/fonts\/literata-1\.woff2\)/)
  })
})
