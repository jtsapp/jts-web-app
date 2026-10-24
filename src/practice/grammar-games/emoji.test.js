import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { EMOJI_IMAGES, EMOJI_LIST, MASCOTS, emojiFile, emojiUrl, mascotUrl } from './emoji.js'

const PUB = path.join(__dirname, '..', '..', '..', 'public', 'practice', 'grammar-games')
const index = JSON.parse(fs.readFileSync(path.join(PUB, 'emoji', 'index.json'), 'utf8'))

describe('статика «Грамматики · игр»', () => {
  it('имя файла — кодпоинты символа, ZWJ и FE0F сохраняются', () => {
    expect(emojiFile('👋')).toBe('1f44b.webp')
    expect(emojiFile('🙋‍♀️')).toBe('1f64b-200d-2640-fe0f.webp')
  })

  // Файл без символа в списке — мёртвый груз в репозитории, символ без файла — пустой квадрат на экране.
  it('у каждого символа из index.json есть файл, сирот нет', () => {
    const files = fs.readdirSync(path.join(PUB, 'emoji')).filter((f) => f.endsWith('.webp')).sort()
    expect(index.map(emojiFile).sort()).toEqual(files)
    expect(index.length).toBe(563)
  })

  it('маскоты на месте', () => {
    for (const m of MASCOTS) expect(fs.existsSync(path.join(PUB, 'img', `${m}.webp`)), m).toBe(true)
    expect(mascotUrl('dexter')).toBe('/practice/grammar-games/img/dexter.webp')
  })

  it('флаг включает картинки эмодзи (Д8)', () => {
    expect(EMOJI_IMAGES).toBe(true)
    expect(EMOJI_LIST).toEqual(index)
    expect(emojiUrl('👋')).toBe('/practice/grammar-games/emoji/1f44b.webp')
  })
})
