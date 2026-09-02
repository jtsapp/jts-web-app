import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { flattenGroups, lessonSteps, splitGap } = require('./steps.js')

const PER_ITEM = { cards: 'card', mcq: 'mcq', gap: 'gap', order: 'order', mistake: 'mistake', listen: 'listen', tf: 'tf', type: 'type', trans: 'trans' }
const ctx = { lang: 'ru', level: 'a0', clip: (k) => `/course/a0/audio/${k}.mp3`, img: () => null, wordAudio: () => null }
const steps = (groups) => lessonSteps({ key: '1', no: 1, groups }, PER_ITEM, ctx)

describe('selfstudy/steps — раскладка по экранам', () => {
  // Движок курса делает ровно это: у «поштучных» типов каждый элемент — свой
  // экран, и он наследует инструкцию группы.
  it('элементы поштучного типа разъезжаются по экранам с инструкцией группы', () => {
    const out = flattenGroups(
      [{ t: 'mcq', stage: 'prac', ins: { en: 'Choose' }, items: [{ opts: ['a', 'b'], a: 0 }, { opts: ['c', 'd'], a: 1 }] }],
      PER_ITEM,
    )
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ t: 'mcq', stage: 'prac', ins: { en: 'Choose' }, a: 0 })
  })

  // Стадия словаря в плеере — одна сетка карточек, а не стопка экранов по
  // слову: иначе одно и то же слово показывается дважды подряд.
  it('карточки слов остаются одной группой', () => {
    const out = flattenGroups([{ t: 'cards', stage: 'vocab', items: [{ w: 'like' }, { w: 'tea' }] }], PER_ITEM)
    expect(out).toHaveLength(1)
    expect(out[0].t).toBe('cards')
  })
})

describe('selfstudy/steps — типы заданий', () => {
  it('карточки слов несут перевод, пример и озвучку', () => {
    const [card] = steps([
      { t: 'cards', stage: 'vocab', items: [{ w: 'like', ru: 'нравится', kk: 'ұнайды', use: 'I <em>like</em> tea.', wordClip: 'w1' }] },
    ])
    expect(card).toMatchObject({ type: 'cards', stage: 'Vocabulary' })
    expect(card.words[0]).toMatchObject({ en: 'like', ru: 'нравится', kk: 'ұнайды', def: 'I like tea.', audio: '/course/a0/audio/w1.mp3' })
  })

  it('выбор варианта переносит вопрос, ответ и разбор', () => {
    const [choice] = steps([
      {
        t: 'mcq',
        stage: 'prac',
        ins: { en: 'Choose the correct word.', ru: 'Выберите слово.' },
        items: [{ line: 'I <u></u> coffee.', opts: ['like', "don't like"], a: 0, why: { ru: 'like — про то, что нравится' } }],
      },
    ])
    expect(choice).toMatchObject({
      type: 'choice',
      title: 'Выберите слово.',
      prompt: 'I ___ coffee.',
      answer: 'like',
      why: 'like — про то, что нравится',
    })
  })

  it('пропуск режется на половинки, банк слов остаётся', () => {
    const [gap] = steps([
      { t: 'gap', stage: 'vocab', ins: { ru: 'Дополните' }, items: [{ line: 'Answer the ___.', bank: ['question', 'partner'], a: 'question' }] },
    ])
    expect(gap).toMatchObject({ type: 'gap', before: 'Answer the', after: '.', answers: ['question'] })
    expect(gap.bank.slice().sort()).toEqual(['partner', 'question'])
  })

  // Печатный ответ у нового курса — отдельный тип задания, но проверяется так
  // же, как пропуск, поэтому и шаг тот же.
  it('печатный ответ становится пропуском без банка', () => {
    const [typed] = steps([
      { t: 'type', stage: 'prac', ins: { en: 'Complete' }, items: [{ line: 'She ___ at home.', a: ['was'] }] },
    ])
    expect(typed).toMatchObject({ type: 'gap', answers: ['was'], bank: [] })
  })

  it('«найди ошибку» читает разметку обоих поколений файла', () => {
    const [a0] = steps([{ t: 'mistake', stage: 'prac', ins: { en: 'Tap' }, items: [{ tok: ['I', 'are', 'happy'], bad: 1, fix: 'am' }] }])
    const [a1] = steps([{ t: 'mistake', stage: 'prac', ins: { en: 'Tap' }, items: [{ words: ['I', 'were', 'here'], bad: 1, fix: 'was' }] }])
    expect(a0).toMatchObject({ type: 'mistake', tokens: ['I', 'are', 'happy'], bad: 1, answer: 'am' })
    expect(a1).toMatchObject({ type: 'mistake', tokens: ['I', 'were', 'here'], bad: 1, answer: 'was' })
  })

  it('колонки читаются и строкой, и объектом с иконкой', () => {
    const [plainCols] = steps([{ t: 'cols', stage: 'prac', ins: { en: 'Sort' }, cols: ['was', 'were'], items: [{ w: 'I', c: 0 }] }])
    const [richCols] = steps([{ t: 'cols', stage: 'prac', ins: { en: 'Sort' }, cols: [{ icon: 'x', t: { ru: 'Люди' } }], items: [{ w: 'brother', c: 0 }] }])
    expect(plainCols).toMatchObject({ type: 'cols', columns: ['was', 'were'], items: [{ text: 'I', col: 0 }] })
    expect(richCols.columns).toEqual(['Люди'])
  })

  // У A0 правая половина пары — картинка, а картинок в источнике нет вовсе.
  // Перевод из карточек того же урока спасает упражнение; без него экран
  // выродился бы в «listen ↔ listen», и его лучше не показывать.
  it('соединение достраивает правую половину переводом из карточек урока', () => {
    const withCards = steps([
      { t: 'cards', stage: 'vocab', items: [{ w: 'listen', ru: 'слушать' }, { w: 'repeat', ru: 'повторять' }] },
      { t: 'match', stage: 'vocab', ins: { en: 'Match' }, pairs: [{ w: 'listen', icon: 'listen' }, { w: 'repeat', icon: 'repeat' }] },
    ])
    expect(withCards[1]).toMatchObject({ type: 'match', pairs: [{ left: 'listen', right: 'слушать' }, { left: 'repeat', right: 'повторять' }] })

    const withoutCards = steps([{ t: 'match', stage: 'vocab', ins: { en: 'Match' }, pairs: [{ w: 'listen', icon: 'listen' }] }])
    expect(withoutCards).toEqual([])
  })

  it('порядок слов отдаёт эталон и перемешанный банк', () => {
    const [order] = steps([{ t: 'order', stage: 'prac', ins: { en: 'Order' }, items: [{ a: 'I like tea' }] }])
    expect(order).toMatchObject({ type: 'order', answer: 'I like tea' })
    expect(order.words.slice().sort()).toEqual(['I', 'like', 'tea'])
  })

  it('фразы для повтора собирают запись, где она есть', () => {
    const [phrases] = steps([
      { t: 'chunk', stage: 'gram', ins: { en: 'Listen' }, items: [{ s: 'I like coffee.', clip: 'c1' }, { s: 'I dont like rain.' }] },
    ])
    expect(phrases).toMatchObject({ type: 'phrases' })
    expect(phrases.items).toEqual([
      { text: 'I like coffee.', src: '/course/a0/audio/c1.mp3' },
      { text: 'I dont like rain.', src: null },
    ])
  })

  it('таблица правила уходит в заметку разметкой', () => {
    const [note] = steps([
      {
        t: 'table',
        stage: 'gram',
        ins: { ru: 'I like / I don’t like' },
        head: { ru: ['Лицо', 'Плюс', 'Минус'] },
        rows: [['I', 'I like tea.', "I don't like tea."]],
        explain: [{ ru: 'like + предмет' }],
      },
    ])
    expect(note.type).toBe('note')
    expect(note.html).toContain('<table class="cp-table">')
    expect(note.html).toContain('like + предмет')
  })

  // Обложка и итог теста рисуются самим приложением, в шаги не переносятся.
  it('экраны обложки и результата теста пропускаются', () => {
    expect(steps([{ t: 'tcover', stage: 'warm', title: 'Test', covers: [] }, { t: 'tresult', stage: 'wrap', total: 10, pass: 7 }])).toEqual([])
  })

  it('неизвестный тип задания роняет сборку, а не молча пропадает', () => {
    expect(() => steps([{ t: 'sudoku', stage: 'prac' }])).toThrow(/неизвестный тип/)
  })
})

describe('selfstudy/steps — splitGap', () => {
  it('делит по подчёркиваниям и по <u>', () => {
    expect(splitGap('I ___ coffee.')).toEqual({ before: 'I', after: 'coffee.' })
    expect(splitGap('I <u></u> coffee.')).toEqual({ before: 'I', after: 'coffee.' })
  })
  it('строка без пропуска целиком уходит в начало', () => {
    expect(splitGap('Write the sentence.')).toEqual({ before: 'Write the sentence.', after: '' })
  })
})
