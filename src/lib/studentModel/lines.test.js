// Строки профиля Луны из модели ученика: карта тем, повторение, журнал, поведение, темп и совет методики.
import { describe, expect, it } from 'vitest'
import { behaviorLine, journalLine, paceLine, plural, reviewAdvice, reviewLine, topicsLine } from './lines.js'
import { normalizeProgram, nextTopic } from './program.js'
import { buildJournal } from './journal.js'
import { behaviorOf } from './behavior.js'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-11-08T10:00:00Z')

// Программа в форме бэкенда (topics с title по языкам) — как отдаёт /mobile/grammar-games.
const PROGRAM = normalizeProgram({
  levels: [{ id: 'L3', range: 'A2 → B1' }],
  topics: [
    { id: 'L3-01', lv: 'L3', title: { ru: 'Question forms' } },
    { id: 'L3-02', lv: 'L3', title: { ru: 'Present Simple vs Present Continuous' } },
    { id: 'L3-07', lv: 'L3', title: { ru: 'Past Simple (правильные и неправильные глаголы)' } },
    { id: 'L3-08', lv: 'L3', title: { ru: 'Past Continuous + Past Simple' } },
  ],
})

const topic = (id, over = {}) => ({ item: `ggame:${id}`, kind: 'grammar', title: null, seen: 6, correct: 5, box: 1, dueAt: NOW + 2 * DAY, lastAt: NOW - DAY, ...over })
const word = (w, over = {}) => ({ item: `word:${w}`, kind: 'word', title: w, extra: { ru: 'перевод' }, seen: 2, correct: 1, box: 0, dueAt: NOW - 1000, lastAt: NOW - DAY, ...over })

describe('программа', () => {
  it('сводит бэкенд и прототип к одному виду; следующая неосвоенная тема', () => {
    const proto = normalizeProgram({ index: { levels: [], program: [{ id: 'L1-01', lv: 'L1', t: 'To be' }] } })
    expect(proto.topics).toEqual([{ id: 'L1-01', lv: 'L1', title: 'To be' }])
    expect(nextTopic(PROGRAM, 'L3-02', (id) => id === 'L3-07').id).toBe('L3-08')
    expect(normalizeProgram({ topics: [] })).toBeNull()
  })
})

describe('строки профиля', () => {
  it('карта тем: статусы ступени ученика (A2 → L3) и слабейшая тема', () => {
    const items = [topic('L3-01'), topic('L3-07', { seen: 11, correct: 6, dueAt: NOW - 1000 })]
    const line = topicsLine({ items, program: PROGRAM, level: 'A2', now: NOW })
    expect(line).toContain('ступень L3 «A2 → B1» — 4 темы')
    expect(line).toContain('освоено 0, изучается 1, пора повторить 1, не начато 2')
    expect(line).toContain('Слабее всего: «Past Simple (правильные и неправильные глаголы)» — 55 % верных (11 ответов)')
    expect(topicsLine({ items: [word('decide')], program: PROGRAM, level: 'A2', now: NOW })).toBeNull()
  })

  it('повторение: темы с меткой темы, слова — блоком «Словаря»; ничего не пора — строки нет', () => {
    const items = [topic('L3-07', { dueAt: NOW - 1000, lastAt: NOW - 3 * DAY }), word('decide'), word('borrow')]
    const line = reviewLine({ items, program: PROGRAM, now: NOW })
    expect(line).toContain('«Past Simple (правильные и неправильные глаголы)» (прошло 3 дн., метка [[OPEN ggame.L3-07]])')
    expect(line).toContain('слова — 2: decide, borrow')
    expect(line).toContain('[[OPEN vocab]]')
    expect(reviewLine({ items: [topic('L3-01')], program: PROGRAM, now: NOW })).toBeNull()
    expect(reviewAdvice({ items, program: PROGRAM, now: NOW })).toMatchObject({ id: 'ggame.L3-07' })
    expect(reviewAdvice({ items: [word('decide')], program: PROGRAM, now: NOW })).toMatchObject({ id: 'vocab', reason: 'пора повторить слов: 1' })
  })

  it('журнал: повторяющиеся первыми, источник, дата и пример', () => {
    const wrongs = [
      { source: 'ggame', item: 'ggame:L3-07', example: 'Yesterday I ___ (go). → went', at: NOW - DAY },
      { source: 'ggame', item: 'ggame:L3-07', example: null, at: NOW - 2 * DAY },
      { source: 'lesson', item: 'lesson:b1:5', title: 'B1 · Why we spend', example: 'I ___ (spend) → spent', at: NOW - 3 * DAY },
      { source: 'vocab', item: 'word:decide', title: 'decide', at: NOW - 4 * DAY },
    ]
    const j = buildJournal(wrongs, { titleOf: (item) => (item === 'ggame:L3-07' ? 'Past Simple' : null) })
    expect(j.map((g) => g.key)).toEqual(['ggame:L3-07', 'lesson:b1:5', 'vocab'])
    const line = journalLine(j)
    expect(line).toContain('«Past Simple» — 2 раза (Грамматика · игры, последняя 2026-11-07: «Yesterday I ___ (go). → went»)')
    expect(line).toContain('«B1 · Why we spend» — 1 раз (урок курса')
    expect(line).toContain('слова (decide) — 1 раз (Словарь')
  })

  it('поведение: дни, часы по Алматы, подряд обычно', () => {
    const at = (d, h, m) => Date.parse(`2026-11-0${d}T${String(h - 5).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`)
    const times = []
    for (const d of [3, 4, 5]) for (let m = 0; m < 20; m += 2) times.push(at(d, 19, m))
    const line = behaviorLine(behaviorOf(times))
    expect(line).toContain('дней с заданиями 3')
    expect(line).toContain('чаще всего с 19 до 22 ч (по Алматы)')
    expect(line).toContain('подряд обычно около 19 мин')
    expect(behaviorLine(behaviorOf([at(3, 19, 0)]))).toBeNull()
  })

  it('темп: 3 ошибки подряд — правило темы меткой; выше нормы — следующая тема; норма — без совета', () => {
    const streak = paceLine({ pace: { verdict: 'easier', why: 'streak', item: 'ggame:L3-07', n: 5, accuracy: 0.4, streak: 3 }, program: PROGRAM, now: NOW })
    expect(streak).toContain('3 ошибки подряд в теме «Past Simple (правильные и неправильные глаголы)»')
    expect(streak).toContain('[[OPEN ggame.L3-07]]')
    expect(streak).toContain('нового задания не придумывай')
    const lesson = paceLine({ pace: { verdict: 'easier', why: 'streak', item: 'lesson:b1:5', title: 'B1 · Why we spend', n: 5, accuracy: 0.4, streak: 5 }, program: PROGRAM, now: NOW })
    expect(lesson).toContain('5 ошибок подряд в уроке «B1 · Why we spend»')
    expect(lesson).not.toContain('[[OPEN')
    const harder = paceLine({ pace: { verdict: 'harder', why: 'high', item: 'ggame:L3-02', n: 12, accuracy: 0.92 }, program: PROGRAM, items: [], now: NOW })
    expect(harder).toContain('следующую тему «Past Simple (правильные и неправильные глаголы)» (метка [[OPEN ggame.L3-07]])')
    const hold = paceLine({ pace: { verdict: 'hold', n: 10, accuracy: 0.8 }, program: PROGRAM, now: NOW })
    expect(hold).toBe('Темп сейчас (последние 90 минут: 10 ответов, 80 % верных) — в норме: держим около 80 % верных.')
    expect(paceLine({ pace: { verdict: 'hold', n: 3, accuracy: 1 }, program: PROGRAM, now: NOW })).toBeNull()
  })

  it('русское число', () => {
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => plural(n, 'тема', 'темы', 'тем'))).toEqual(['1 тема', '2 темы', '5 тем', '11 тем', '21 тема', '22 темы', '25 тем'])
  })
})
