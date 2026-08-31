import { describe, it, expect } from 'vitest'
import { gradeAnswers, loadFullBank } from './placementScore.js'

const source = loadFullBank()
const byId = (id) => source.bank.items.find((i) => i.id === id)
const grade = (answer) => gradeAnswers([answer], source)[0].correct

// Проверка ответов живёт на сервере: в публичном банке ключей больше нет,
// клиент присылает выбор и получает долю верного.
describe('gradeAnswers', () => {
  it('вариант с ключом — 1, любой другой — 0', () => {
    const mcq = source.bank.items.find((i) => i.format === 'mcq4')
    expect(grade({ id: mcq.id, optIndex: mcq.key })).toBe(1)
    expect(grade({ id: mcq.id, optIndex: (mcq.key + 1) % 4 })).toBe(0)
    expect(grade({ id: mcq.id, optIndex: -1 })).toBe(0) // «не знаю»
  })

  it('открытый ответ сверяется с эталоном, регистр и пробелы не мешают', () => {
    const open = byId('u-a1-01') // «My sister ___ a doctor» → is
    expect(grade({ id: open.id, text: 'is' })).toBe(1)
    expect(grade({ id: open.id, text: '  IS ' })).toBe(1)
    expect(grade({ id: open.id, text: 'are' })).toBe(0)
    expect(grade({ id: open.id, text: '' })).toBe(0)
  })

  it('порядок слов: точное совпадение — 1, чужой порядок — меньше', () => {
    const order = source.bank.items.find((i) => i.type === 'order' && !i.steps)
    const truth = source.keys[order.id].answer.replace(/[.!?]$/, '').split(' ')
    expect(grade({ id: order.id, built: truth.join(' ') })).toBe(1)
    expect(grade({ id: order.id, built: [...truth].reverse().join(' ') })).toBeLessThan(1)
  })

  it('сопоставление считается по перемешанной колонке, а не по позициям', () => {
    const match = source.bank.items.find((i) => i.type === 'match')
    const map = source.keys[match.id].matchMap
    expect(grade({ id: match.id, map })).toBe(1)
    // Наивное «i-я слева = i-я справа» на перемешанной колонке верным не будет.
    expect(grade({ id: match.id, map: map.map((_, i) => i) })).toBeLessThan(1)
  })

  it('T/F/NS сверяются с ключами, которых у клиента нет', () => {
    const tfns = source.bank.items.find((i) => i.type === 'tfns')
    const truth = source.keys[tfns.id].statements
    expect(grade({ id: tfns.id, answers: truth })).toBe(1)
    expect(grade({ id: tfns.id, answers: truth.map(() => 'T') })).toBeLessThan(1)
  })

  it('минимальные пары проверяются по выбранному слову', () => {
    const mp = source.bank.items.find((i) => i.block === 'minpair')
    expect(grade({ id: mp.id, word: mp.word })).toBe(1)
    expect(grade({ id: mp.id, word: mp.distractor })).toBe(0)
  })

  it('незнакомое задание и говорение не оцениваются', () => {
    expect(grade({ id: 'no-such-item', optIndex: 0 })).toBeNull()
    const speaking = source.bank.items.find((i) => i.block === 'speaking')
    expect(grade({ id: speaking.id, text: 'anything' })).toBeNull()
  })

  it('порядок ответов сохраняется и id возвращается обратно', () => {
    const [a, b] = source.bank.items.filter((i) => i.format === 'mcq4').slice(0, 2)
    const scores = gradeAnswers([{ id: b.id, optIndex: b.key }, { id: a.id, optIndex: -1 }], source)

    expect(scores.map((s) => s.id)).toEqual([b.id, a.id])
    expect(scores.map((s) => s.correct)).toEqual([1, 0])
  })
})
