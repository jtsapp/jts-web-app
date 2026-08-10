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

  it('пустой или состоящий из пробелов data-only не режется — узел общий для всех режимов', () => {
    const html = stage('Warm-up', `
      <div data-only=""><p>общий блок 1</p></div>
      <div data-only="   "><p>общий блок 2</p></div>
      <div data-only="group"><p>только для группы</p></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks).toHaveLength(2)
    expect(s.blocks[0].html).toContain('общий блок 1')
    expect(s.blocks[1].html).toContain('общий блок 2')
    expect(s.blocks.some((b) => b.html.includes('только для группы'))).toBe(false)
  })

  it('кнопка .btn-audio с нераспознанным onclick не пропадает бесследно, а остаётся видимым info-контентом', () => {
    // onclick другой функции (не playTrack/playRange) — trackIdOf не разберёт
    // id, блока audio не будет; но кнопка была единственным содержимым узла,
    // поэтому безусловное удаление стёрло бы узел целиком.
    const html = stage('Wrap', `<button class="btn btn-audio" onclick="stopAudio(this)">⏹ Стоп</button>`)
    const [s] = collectLesson(html)
    expect(s.blocks).toHaveLength(1)
    expect(s.blocks[0]).toMatchObject({ kind: 'info' })
    expect(s.blocks[0].html).toContain('btn-audio')
    expect(s.blocks[0].html).toContain('Стоп')
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

  it('choice (A1, буквенный data-correct) → индекс кнопки с таким data-val, а не NaN', () => {
    // Формат ключа ответа у уровней разный: A0 пишет индекс ("1"), A1 — букву
    // ("c"), совпадающую с data-val нужной кнопки. Приведение к числу давало на
    // A1 NaN, normalize-task выбрасывал задание, и уровень остался без единого
    // choice — 1222 задания молча пропали.
    const html = stage('Recall', `<div class="task" data-task>
      <div class="row"><span class="num">1</span><span class="body">___ night I was at home.
        <div class="opts" data-correct="c">
          <button class="opt" data-val="a">Ago</button>
          <button class="opt" data-val="b">ago</button>
          <button class="opt" data-val="c">Last</button>
        </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'choice', options: ['Ago', 'ago', 'Last'], correct: 2 })
  })

  it('choice с data-correct, которого нет ни у одной кнопки, → -1 (задание отбракует normalize-task)', () => {
    const html = stage('Recall', `<div class="task" data-task>
      <div class="row"><span class="body">q
        <div class="opts" data-correct="z">
          <button class="opt" data-val="a">one</button>
          <button class="opt" data-val="b">two</button>
        </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'choice', correct: -1 })
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

  it('multi с буквенными значениями в data-multi → индексы кнопок с такими data-val', () => {
    // data-multi — тот же формат, что data-correct: список значений кнопок, а
    // не индексов. На числовых значениях A0 совпадает с индексами случайно.
    const html = stage('Listening', `<div class="task" data-task>
      <div class="row"><span class="body">Отметь всё верное
        <div class="opts" data-multi="a,c">
          <button class="opt" data-val="a">read</button>
          <button class="opt" data-val="b">cook</button>
          <button class="opt" data-val="c">travel</button>
        </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'multi', correct: [0, 2] })
  })

  it('multi со значением, которого нет ни у одной кнопки, → -1 в наборе (задание отбракует normalize-task)', () => {
    const html = stage('Listening', `<div class="task" data-task>
      <div class="row"><span class="body">Отметь всё верное
        <div class="opts" data-multi="a,z">
          <button class="opt" data-val="a">read</button>
          <button class="opt" data-val="b">cook</button>
        </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'multi', correct: [0, -1] })
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

  it('.order (A0, числовой data-val) → ранг чипа — позиция его value в data-order, а не само value', () => {
    // data-order="1,2,3" здесь совпадает по написанию с data-val, но семантика —
    // индекс в списке (0,1,2), а не число из data-val (1,2,3): это разные вещи,
    // которые на A0 просто визуально похожи, потому что value начинаются с 1.
    const html = stage('Practice', `<div class="task" data-task>
      <div class="row"><span class="body"><div class="order" data-order="1,2,3">
        <button class="ochip" data-val="3"><span class="pin"></span><span class="txt">coffee</span></button>
        <button class="ochip" data-val="1"><span class="pin"></span><span class="txt">I</span></button>
        <button class="ochip" data-val="2"><span class="pin"></span><span class="txt">like</span></button>
      </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'order', words: ['coffee', 'I', 'like'], order: [2, 0, 1] })
  })

  it('.order (A1, строковый data-val) → ранги по позиции в data-order, без приведения value к числу', () => {
    // Раньше data-val приводился к Number(...) — на строковых value ("w0","w1",…)
    // это давало NaN, и normalize-task тихо сортировал мусор. Value сравниваются
    // как строки, поэтому "w0" не должен случайно совпасть с числовым 0.
    const html = stage('Practice', `<div class="task" data-task>
      <div class="row"><span class="body"><div class="order" data-order="w0,w1,w2,w3,w4">
        <button class="ochip" data-val="w4"><span class="txt">early</span></button>
        <button class="ochip" data-val="w3"><span class="txt">up</span></button>
        <button class="ochip" data-val="w2"><span class="txt">get</span></button>
        <button class="ochip" data-val="w1"><span class="txt">always</span></button>
        <button class="ochip" data-val="w0"><span class="txt">I</span></button>
      </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({
      kind: 'order',
      words: ['early', 'up', 'get', 'always', 'I'],
      order: [4, 3, 2, 1, 0],
    })
  })

  it('.order с data-val, которого нет в data-order, → ранг -1 (невалидную перестановку отбраковывает normalize-task)', () => {
    // collectLesson не валидирует данные — это ответственность normalize-task
    // (см. normalize-task.test.js). Здесь проверяем только сырое извлечение.
    const html = stage('Practice', `<div class="task" data-task>
      <div class="row"><span class="body"><div class="order" data-order="w0,w1,w2">
        <button class="ochip" data-val="w0"><span class="txt">I</span></button>
        <button class="ochip" data-val="w9"><span class="txt">like</span></button>
        <button class="ochip" data-val="w2"><span class="txt">coffee</span></button>
      </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ order: [0, -1, 2] })
  })

  it('.order с повторяющимися data-val у разных чипов → повторяющийся ранг в сырых данных', () => {
    const html = stage('Practice', `<div class="task" data-task>
      <div class="row"><span class="body"><div class="order" data-order="w0,w1,w2">
        <button class="ochip" data-val="w0"><span class="txt">I</span></button>
        <button class="ochip" data-val="w0"><span class="txt">like</span></button>
        <button class="ochip" data-val="w2"><span class="txt">coffee</span></button>
      </div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ order: [0, 0, 2] })
  })

  it('кнопка аудио → блок audio с id трека (оба синтаксиса вызова)', () => {
    const a0 = stage('Listening', `<button class="btn btn-audio" onclick="playRange(A('a01cf00'),0,null,this,'Stop')">🔊 Слушать</button>`)
    const a1 = stage('Listen', `<button class="btn btn-audio segbtn" onclick="playTrack('6_1',this)">🔊 Track 1</button>`)
    expect(collectLesson(a0)[0].blocks[0]).toMatchObject({ kind: 'audio', trackId: 'a01cf00', label: '🔊 Слушать' })
    expect(collectLesson(a1)[0].blocks[0]).toMatchObject({ kind: 'audio', trackId: '6_1', label: '🔊 Track 1' })
  })

  it('аудио-кнопка внутри интро рядом с задачей извлекается в отдельный блок, а не остаётся мёртвым onclick в info', () => {
    // Реальная разметка A0 (стадия Listening): инструкция, кнопка плеера и
    // задание лежат в одном контейнере без .task-обёртки над кнопкой — в
    // отличие от синтетических фикстур выше, где аудио стоит отдельно.
    const html = stage('Listening', `<div data-only="self">
      <div class="instruction">Listen and answer.</div>
      <div class="player"><button class="btn btn-audio" onclick="playRange(A('a01cf00'),0,null,this,'Stop')">🔊 Play</button></div>
      <div class="task" data-task>
        <div class="row"><span class="body">Отметь всё, что услышал
          <div class="opts" data-multi="0,1">
            <button class="opt" data-val="0">read</button>
            <button class="opt" data-val="1">cook</button>
          </div></span></div>
      </div>
    </div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'audio', trackId: 'a01cf00', label: '🔊 Play' })
    expect(s.blocks[1]).toMatchObject({ kind: 'info' })
    expect(s.blocks[1].html).not.toContain('btn-audio')
    expect(s.blocks[2]).toMatchObject({ kind: 'multi' })
  })

  it('аудио-кнопка внутри инфо-блока без задачи тоже извлекается, без дублирования в html', () => {
    const html = stage('Wrap', `<div data-only="self">
      <p>Great job today!</p>
      <button class="btn btn-audio" onclick="playTrack('6_1',this)">🔊 Recap</button>
    </div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'audio', trackId: '6_1', label: '🔊 Recap' })
    expect(s.blocks[1]).toMatchObject({ kind: 'info' })
    expect(s.blocks[1].html).not.toContain('btn-audio')
  })

  it('несколько стадий сохраняют порядок', () => {
    const html = stage('Warm-up', '<div data-only="self">a</div>') + stage('Wrap', '<div data-only="self">b</div>')
    expect(collectLesson(html).map((s) => s.name)).toEqual(['Warm-up', 'Wrap'])
  })
})
