// Ключ упражнения для помощника по сайту: формат по механикам и запас по длине на настоящих текстах A1–C1.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { exerciseAnswers } from './answers.js'
import { exTotal } from './engine.js'

const LABELS = { yes: 'Правда', no: 'Ложь', notGiven: 'Не сказано' }
const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
const load = (lv) =>
  JSON.parse(readFileSync(path.join(__dirname, '..', '..', '..', 'public', 'practice', 'reading', `${lv}.json`), 'utf8'))

describe('exerciseAnswers — формат по механикам', () => {
  it('выбор: текст верного варианта по номеру вопроса', () => {
    const ex = { type: 'mc', items: [{ q: 'Where?', o: ['home', 'on the mountain'], a: 1 }, { q: 'Who?', o: ['Bars', 'Dana'], a: 0 }] }
    expect(exerciseAnswers(ex, LABELS, 'ru')).toBe('1) on the mountain; 2) Bars')
  })

  it('true/false и true/false/not given — подписями кнопок экрана', () => {
    const tf = { type: 'tf', items: [{ s: 'A.', a: true }, { s: 'B.', a: false }] }
    expect(exerciseAnswers(tf, LABELS, 'ru')).toBe('1) Правда; 2) Ложь')
    const tfng = { type: 'tfng', items: [{ s: 'A.', a: 'F' }, { s: 'B.', a: 'NG' }, { s: 'C.', a: 'T' }] }
    expect(exerciseAnswers(tfng, LABELS, 'ru')).toBe('1) Ложь; 2) Не сказано; 3) Правда')
  })

  it('пары: слово → картинка с подписью на языке интерфейса; в английском подпись, равная слову, не дублируется', () => {
    const ex = { type: 'match', pairs: [{ l: 'honey', r: '🍯', alt: { en: 'honey', ru: 'мёд', kz: 'бал' } }, { l: 'bee', r: '🐝', alt: { en: 'bee', ru: 'пчела' } }] }
    expect(exerciseAnswers(ex, LABELS, 'ru')).toBe('honey → 🍯 (мёд); bee → 🐝 (пчела)')
    // У bee казахской подписи нет — loc берёт английскую, а она совпала со словом.
    expect(exerciseAnswers(ex, LABELS, 'kk')).toBe('honey → 🍯 (бал); bee → 🐝')
    expect(exerciseAnswers(ex, LABELS, 'en')).toBe('honey → 🍯; bee → 🐝')
  })

  it('заголовки абзацев: «Абзац N» переводится, заголовок — как в данных', () => {
    const ex = { type: 'headings', pairs: [{ l: { en: 'Paragraph 1', ru: 'Абзац 1' }, r: 'A test of patience' }] }
    expect(exerciseAnswers(ex, LABELS, 'ru')).toBe('Абзац 1 → A test of patience')
  })

  it('пропуски: слова по номеру пропуска', () => {
    const ex = { type: 'gap', text: 'Old {pots} with {honey}.', extra: ['bread'] }
    expect(exerciseAnswers(ex, LABELS, 'ru')).toBe('1) pots; 2) honey')
  })

  it('порядок: пункты по номеру; длинные предложения укорачиваются по словам', () => {
    expect(exerciseAnswers({ type: 'order', items: ['first', 'second'] }, LABELS, 'ru')).toBe('1. first; 2. second')
    const long = 'word '.repeat(40).trim()
    const key = exerciseAnswers({ type: 'summary', items: [long, long, long, long, long, long] }, LABELS, 'ru')
    expect(key.length).toBeLessThanOrEqual(800)
    expect(key.split('; ')).toHaveLength(6)
    expect(key.split('; ').every((s) => s.endsWith('word…'))).toBe(true)
  })

  it('у «мнения» ключа нет', () => {
    expect(exerciseAnswers({ type: 'reflection', q: 'Why?', keys: [['because']], model: 'x' }, LABELS, 'ru')).toBe('')
  })
})

describe('exerciseAnswers — настоящие тексты A1–C1', () => {
  it('у каждого упражнения с ключом — по пункту на очко; ключ влезает в 800 знаков снимка', () => {
    for (const lv of LEVELS) {
      for (const text of load(lv).texts) {
        text.exercises.forEach((ex) => {
          const key = exerciseAnswers(ex, LABELS, 'ru')
          if (ex.type === 'reflection') {
            expect(key).toBe('')
            return
          }
          // У пар перевод сам бывает с «; » («треск; трещина») — их считаем по стрелкам.
          // У пересказа «; » бывает внутри предложения — пункты считаем по номерам «N. ».
          const items = ['match', 'wwmatch', 'headings'].includes(ex.type)
            ? key.split(' → ').slice(1)
            : ['order', 'summary'].includes(ex.type)
              ? key.match(/(?:^|; )\d+\. /g)
              : key.split('; ')
          expect(items, `${text.id} ${ex.type}`).toHaveLength(exTotal(ex))
          expect(key, `${text.id} ${ex.type}`).not.toMatch(/undefined|null/)
          expect(key.length, `${text.id} ${ex.type}`).toBeLessThanOrEqual(800)
        })
      }
    }
  })
})
