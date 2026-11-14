// src/practice/chess/sound.test.js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { CHESS_CLIPS } from './sound.js'

const dir = path.join(process.cwd(), 'public/chess/sound')

describe('звуки шахмат', () => {
  it('у каждого сигнала с записью файл на месте', () => {
    for (const file of Object.values(CHESS_CLIPS)) {
      expect(fs.statSync(path.join(dir, `${file}.mp3`)).size, file).toBeGreaterThan(1000)
    }
  })
  it('рядом лежат лицензия набора и адрес исходников', () => {
    expect(fs.readFileSync(path.join(dir, 'LICENSE.txt'), 'utf8')).toContain('GNU AFFERO GENERAL PUBLIC LICENSE')
    expect(fs.readFileSync(path.join(dir, 'SOURCE.txt'), 'utf8')).toContain('lichess-org/lila')
  })
})
