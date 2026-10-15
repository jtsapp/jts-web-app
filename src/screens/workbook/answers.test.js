// Ключ экрана воркбука для помощника (answers.js) — на настоящих уроках всех пяти уровней: у каждого судимого экрана
// он непустой, иначе Луна после «Показать ответ» снова гадала бы, что было верным.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { isFree } from '../../practice/workbook/engine.js'
import { actAnswers } from './answers.js'

const ROOT = path.join(process.cwd(), 'public/practice/workbook')
const LEVELS = ['a0', 'a1', 'a2', 'b1', 'b2']
const lessonsOf = (level) =>
  fs
    .readdirSync(path.join(ROOT, level))
    .filter((f) => /^lesson-\d+\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, level, f), 'utf8')))

describe('ключ экрана воркбука', () => {
  it.each(LEVELS)('%s: у каждого судимого экрана ключ есть', (level) => {
    const empty = []
    const types = new Set()
    for (const lesson of lessonsOf(level)) {
      lesson.acts.forEach((act, k) => {
        const task = act.task || act
        if (isFree(task) || !task.t) return
        // Обёртки без задания (просто текст или запись) судить нечего.
        if (!task.items && !task.lines && !task.gaps && !task.rows && !task.pairs && !task.bad) return
        types.add(task.t)
        if (!actAnswers(act, { lang: 'ru' })) empty.push(`L${lesson.n}.${k} ${task.t}`)
      })
    }
    expect(empty).toEqual([])
    expect(types.size).toBeGreaterThan(5)
  })

  it('выбор, верно/неверно, пары, пропуски — в виде, который читается рядом с пунктами', () => {
    expect(actAnswers({ t: 'choose', items: [{ q: 'I ___ tea.', o: ['like', 'likes'], a: 0 }, { q: 'He ___ tea.', o: ['like', 'likes'], a: 1 }] }))
      .toBe('1) like; 2) likes')
    expect(actAnswers({ t: 'tf', items: [{ s: 'x', a: true }, { s: 'y', a: false }] }, { labels: { true: 'Верно', false: 'Неверно' } }))
      .toBe('1) Верно; 2) Неверно')
    expect(actAnswers({ t: 'match', items: [{ l: 'dog', r: 'собака' }] })).toBe('dog → собака')
    expect(actAnswers({ t: 'cloze', gaps: ['make', 'do'], text: [], bank: [] })).toBe('1) make; 2) do')
    expect(actAnswers({ t: 'fix', items: [{ w: ['He', 'go', 'home'], bad: 1, fix: 'goes' }] })).toBe('1) go → goes')
    expect(actAnswers({ t: 'drop', lines: ['I [am|is|are] here.'] })).toBe('1) am')
    expect(actAnswers({ t: 'sort', cols: [{ en: 'Do', ru: 'Делать' }], items: [{ x: 'listen', c: 0 }] }, { lang: 'ru' }))
      .toBe('listen → Делать')
    expect(actAnswers({ t: 'chain', items: [{ from: 'x', steps: [{ a: 'go' }, { a: 'went' }] }] })).toBe('1) go → went')
  })

  it('обёртка (аудио, текст) отдаёт ключ вложенного задания; свободные задания и пустое — без ключа', () => {
    expect(actAnswers({ t: 'listen', task: { t: 'type', items: [{ q: 'q', a: 'seven' }] } })).toBe('1) seven')
    expect(actAnswers({ t: 'write', write: { model: 'x' } })).toBe('')
    expect(actAnswers(null)).toBe('')
  })
})
