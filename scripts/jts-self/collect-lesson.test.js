import { describe, it, expect } from 'vitest'
import { collectLesson } from './collect-lesson.js'

const stage = (name, inner) => `<section class="stage" data-stage="${name}">${inner}</section>`

describe('collectLesson', () => {
  it('оставляет только блоки режима self', () => {
    const html = stage('Warm-up', `
      <div data-only="self"><p>для себя</p></div>
      <div data-only="group"><p>для группы</p></div>
      <div data-only="group solo"><p>и для группы, и для пары</p></div>`)
    const [s] = collectLesson(html)
    expect(s.name).toBe('Warm-up')
    expect(s.blocks).toHaveLength(1)
    expect(s.blocks[0]).toMatchObject({ kind: 'info' })
    expect(s.blocks[0].html).toContain('для себя')
    expect(s.blocks[0].html).not.toContain('для группы')
  })

  it('строка с .opts[data-correct] → choice с индексом верного', () => {
    const html = stage('Grammar', `<div class="task" data-task data-tid="pr-quiz">
      <div class="row"><span class="num">1</span><span class="body">☕ coffee → ___ coffee.
        <div class="opts" data-correct="1">
          <button class="opt" data-val="0">I likes</button>
          <button class="opt" data-val="1">I like</button>
        </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks).toEqual([
      { kind: 'choice', prompt: '☕ coffee → ___ coffee.', options: ['I likes', 'I like'], correct: 1, why: '' },
    ])
  })

  it('строка с .opts[data-multi] → multi со списком верных', () => {
    const html = stage('Listening', `<div class="task" data-task>
      <div class="row"><span class="body">Отметь всё, что услышал
        <div class="opts" data-multi="0,2">
          <button class="opt" data-val="0">read</button>
          <button class="opt" data-val="1">cook</button>
          <button class="opt" data-val="2">travel</button>
        </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'multi', correct: [0, 2], options: ['read', 'cook', 'travel'] })
  })

  it('select → варианты из option, ответ из data-answer, пустой option отброшен', () => {
    const html = stage('Vocabulary', `<div class="task" data-task>
      <div class="row"><span class="body"><b>👂 listen</b>
        <select data-answer="слушать">
          <option value="">choose…</option><option>спрашивать</option><option>слушать</option>
        </select></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toEqual({ kind: 'select', prompt: '👂 listen', options: ['спрашивать', 'слушать'], answer: 'слушать', why: '' })
  })

  it('input[data-answer] → gap с текстом до и после и пояснением', () => {
    const html = stage('Practice', `<div class="task" data-task>
      <div class="row"><span class="body">I <input class="gap" data-answer="like|love" data-why="I like + вещь"> coffee.</span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toEqual({ kind: 'gap', before: 'I', after: 'coffee.', answer: 'like|love', why: 'I like + вещь' })
  })

  it('.order → слова в показанном порядке и эталонная перестановка', () => {
    const html = stage('Practice', `<div class="task" data-task>
      <div class="row"><span class="body"><div class="order" data-order="1,2,3">
        <button class="ochip" data-val="3"><span class="pin"></span><span class="txt">coffee</span></button>
        <button class="ochip" data-val="1"><span class="pin"></span><span class="txt">I</span></button>
        <button class="ochip" data-val="2"><span class="pin"></span><span class="txt">like</span></button>
      </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'order', words: ['coffee', 'I', 'like'], order: [3, 1, 2] })
  })

  it('кнопка аудио → блок audio с id трека (оба синтаксиса вызова)', () => {
    const a0 = stage('Listening', `<button class="btn btn-audio" onclick="playRange(A('a01cf00'),0,null,this,'Stop')">🔊 Слушать</button>`)
    const a1 = stage('Listen', `<button class="btn btn-audio segbtn" onclick="playTrack('6_1',this)">🔊 Track 1</button>`)
    expect(collectLesson(a0)[0].blocks[0]).toMatchObject({ kind: 'audio', trackId: 'a01cf00', label: '🔊 Слушать' })
    expect(collectLesson(a1)[0].blocks[0]).toMatchObject({ kind: 'audio', trackId: '6_1', label: '🔊 Track 1' })
  })

  it('несколько стадий сохраняют порядок', () => {
    const html = stage('Warm-up', '<div data-only="self">a</div>') + stage('Wrap', '<div data-only="self">b</div>')
    expect(collectLesson(html).map((s) => s.name)).toEqual(['Warm-up', 'Wrap'])
  })
})
