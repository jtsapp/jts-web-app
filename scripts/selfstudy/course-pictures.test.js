import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..', '..')
const steps = (level) => {
  const dir = path.join(ROOT, 'public/course', level)
  return fs
    .readdirSync(dir)
    .filter((f) => /^steps-.*\.json$/.test(f))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).steps.map((s, i) => ({ s, where: `${f}#${i}` })))
}

// A0 рисует картинки иконками самого курса: фото слов из прошлой выгрузки есть
// у 51 карточки из 267, остальные были пустой плашкой, «Выберите картинку»
// показывала имена иконок словами, а «Соедините слова и картинки» — перевод.
// Упадёт, если A0 пересоберут без набора иконок.
describe('A0: картинки на месте', () => {
  const a0 = steps('a0')

  it('у каждой карточки слова есть фото или иконка', () => {
    const bare = a0.flatMap(({ s, where }) => (s.type === 'cards' ? s.words.filter((w) => !w.img && !w.icon).map((w) => `${where} ${w.en}`) : []))
    expect(bare).toEqual([])
  })

  it('«Выберите картинку» — с иконками', () => {
    const pic = a0.filter(({ s }) => /Выберите картинку/.test(s.title || ''))
    expect(pic.length).toBeGreaterThan(0)
    expect(pic.filter(({ s }) => !s.optionIcons).map(({ where }) => where)).toEqual([])
  })

  it('«Соедините слова и картинки» — пары с иконками', () => {
    const match = a0.filter(({ s }) => s.type === 'match' && /картинки/.test(s.title || ''))
    expect(match.length).toBeGreaterThan(0)
    const bad = match.filter(({ s }) => s.pairs.some((p) => !s.rightIcons || !s.rightIcons[p.right]))
    expect(bad.map(({ where }) => where)).toEqual([])
  })
})
