import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { readingSteps } = require('./reading-steps.js')
const { lessonSteps } = require('./steps.js')

const stage = (inner) => `<section class="stage" data-stage="Reading">${inner}</section>`
const TEXT = `<article class="reading"><h3>Why we spend</h3><p><span class="pmark">A</span>Every November the <b>shops</b> fill up.</p><p class="srcnote">Written for this course.</p></article>`
const steps = (inner) => readingSteps(stage(inner), { stage: 'Чтение' })

describe('reading-steps — разметка оригинального курса → шаги', () => {
  it('текст — карточка, буква абзаца и выделение сохраняются', () => {
    const [note] = steps(TEXT)
    expect(note).toMatchObject({ type: 'note', title: 'Why we spend', stage: 'Чтение' })
    expect(note.html).toContain('<b>A</b>')
    expect(note.html).toContain('<b>shops</b>')
    expect(note.html).toContain('class="cp-note__meta"')
  })

  it('вопрос с одним верным — choice, текст над вопросом, номер инструкции убран', () => {
    const out = steps(
      `${TEXT}<div class="instruction">1 · Read once.</div><div class="task" data-task=""><div class="row"><span class="num">1</span><span class="body">The text is about… <div class="opts" data-correct="b"><button class="opt" data-val="a">sport</button><button class="opt" data-val="b">shopping</button></div></span></div></div>`,
    )
    const q = out.find((s) => s.type === 'choice')
    expect(q).toMatchObject({ title: 'Read once.', prompt: 'The text is about…', options: ['sport', 'shopping'], answer: 'shopping' })
    expect(q.html).toContain('Every November')
  })

  // Заголовки к абзацам: список рядом с .body, ответ — value варианта.
  it('выпадающий список: ответ по value, заглушка «choose…» убрана', () => {
    const out = steps(
      `<div class="task" data-task=""><div class="row"><span class="body"><b>Paragraph 1</b></span><select data-answer="two"><option value="">choose…</option><option value="two">Two kinds of people</option><option value="one">One writer</option></select></div></div>`,
    )
    expect(out[0]).toMatchObject({ type: 'choice', prompt: 'Paragraph 1 ____', options: ['Two kinds of people', 'One writer'], answer: 'Two kinds of people' })
  })

  it('поле ввода — пропуск, варианты ответа через «|», разбор из data-why', () => {
    const [gap] = steps(
      `<div class="task" data-task=""><div class="row"><span class="body">How many minutes? → <input class="gap" data-answer="45|forty-five" data-why="Paragraph 1: &lt;b&gt;forty-five&lt;/b&gt;."></span></div></div>`,
    )
    expect(gap).toMatchObject({ type: 'gap', before: 'How many minutes? →', after: '', answers: ['45', 'forty-five'], why: 'Paragraph 1: forty-five.' })
  })

  it('несколько полей в строке — текст с пропусками', () => {
    const [cloze] = steps(`<div class="task" data-task=""><div class="row"><span class="body">Letters have <input data-answer="fallen|dropped"> by <input data-answer="half">.</span></div></div>`)
    expect(cloze.type).toBe('cloze')
    expect(cloze.answers).toEqual([['fallen', 'dropped'], ['half']])
    expect(cloze.html).toContain('<b>(1)</b>')
  })

  it('«отметьте все верные» — multi', () => {
    const [m] = steps(
      `<div class="task" data-task=""><div class="row"><span class="body"><div class="opts" data-multi="s1,s3"><button class="opt" data-val="s1">one</button><button class="opt" data-val="s2">two</button><button class="opt" data-val="s3">three</button></div></span></div></div>`,
    )
    expect(m).toMatchObject({ type: 'multi', options: ['one', 'two', 'three'], answers: ['one', 'three'] })
  })

  it('порядок событий — order', () => {
    const [o] = steps(
      `<div class="task" data-task=""><div class="order" data-order="e2,e1"><button class="ochip" data-val="e1">First met.</button><button class="ochip" data-val="e2">Put in a room.</button></div></div>`,
    )
    expect(o).toMatchObject({ type: 'order', words: ['First met.', 'Put in a room.'], answer: 'Put in a room. First met.' })
  })

  it('прогноз без ответа — pick', () => {
    const [p] = steps(`<div class="opentask" data-open=""><div class="row"><span class="body"><div class="opts"><button class="opt">Easily</button><button class="opt">No chance</button></div></span></div></div>`)
    expect(p).toMatchObject({ type: 'pick', single: true, options: [{ label: 'Easily' }, { label: 'No chance' }] })
  })

  it('подпись «Why» после задания — разбор к его экрану', () => {
    const [, q] = steps(
      `${TEXT}<div class="task" data-task=""><div class="row"><span class="body">Q <div class="opts" data-correct="a"><button class="opt" data-val="a">x</button><button class="opt" data-val="b">y</button></div></span></div></div><div class="bubble am"><div class="blab">Why</div><p>Because x.</p></div>`,
    )
    expect(q.why).toBe('Because x.')
  })

  // Аудирование внутри стадии чтения: записи учебника у нас нет, а своё
  // аудирование у урока на сайте остаётся.
  it('задания после записи учебника пропускаются до следующего текста', () => {
    const out = steps(
      `<div class="instruction">7 · Now listen.</div><div class="player">Original coursebook recording</div><div class="task" data-task=""><div class="row"><span class="body">Q <input data-answer="do"></span></div></div>${TEXT}<div class="task" data-task=""><div class="row"><span class="body">R <input data-answer="be"></span></div></div>`,
    )
    expect(out.filter((s) => s.type === 'gap').map((s) => s.answers[0])).toEqual(['be'])
  })

  // У A1 кнопка — «Read aloud by your device»: тот же текст вслух, задания за
  // ней к чтению.
  it('«Read aloud» — не аудирование', () => {
    const out = steps(`${TEXT}<div class="player">Read aloud by your device</div><div class="task" data-task=""><div class="row"><span class="body">Q <input data-answer="be"></span></div></div>`)
    expect(out.some((s) => s.type === 'gap')).toBe(true)
  })
})

describe('lessonSteps — чтение из оригинала вместо self-study', () => {
  const PER_ITEM = { mcq: 'mcq', tf: 'tf' }
  const ctx = { lang: 'ru', level: 'a2', clip: (k) => `/a/${k}.mp3`, img: () => null, wordAudio: () => null }
  const lesson = (groups) => ({ key: '1', no: 1, groups })
  const READING = [{ stage: 'Чтение', type: 'note', title: 'ORIGINAL', html: '<p>orig</p>' }]
  const groups = [
    { t: 'tap', stage: 'lisrd', ins: 'You are going to read.', items: [{ w: 'a' }] },
    { t: 'read', stage: 'lisrd', ins: 'Read the text.', title: 'SELF', para: ['self text '.repeat(20)] },
    { t: 'mcq', stage: 'lisrd', ins: 'Read again.', items: [{ q: 'q', opts: ['a', 'b'], a: 0 }] },
    { t: 'mcq', stage: 'lisrd', ins: 'Listen.', clip: 'c1', items: [{ q: 'L?', opts: ['a', 'b'], a: 0 }] },
    { t: 'mcq', stage: 'freer', ins: 'Speak.', items: [{ q: 's', opts: ['a', 'b'], a: 0 }] },
  ]

  it('блок чтения заменён, аудирование и остальное на месте', () => {
    const out = lessonSteps(lesson(groups), PER_ITEM, { ...ctx, reading: READING })
    const titles = out.map((s) => s.title)
    expect(titles).toContain('ORIGINAL')
    expect(titles).not.toContain('SELF')
    expect(titles).not.toContain('You are going to read.')
    expect(titles).toContain('Listen.')
    expect(titles.indexOf('ORIGINAL')).toBeLessThan(titles.indexOf('Listen.'))
  })

  it('урок без чтения — оригинал встаёт в начало стадии', () => {
    const listenOnly = [groups[3], groups[4]]
    const out = lessonSteps(lesson(listenOnly), PER_ITEM, { ...ctx, reading: READING })
    expect(out[0].title).toBe('ORIGINAL')
    expect(out[1].title).toBe('Listen.')
  })

  // Раньше текст статьи висел над вопросами «Listen…» (85 экранов A1–B1).
  it('без замены вопрос на слух не несёт текст чтения', () => {
    const out = lessonSteps(lesson(groups), PER_ITEM, ctx)
    const listen = out.find((s) => s.title === 'Listen.')
    expect(listen.html || '').not.toContain('self text')
    expect(out.find((s) => s.title === 'Read again.').html).toContain('self text')
  })
})
