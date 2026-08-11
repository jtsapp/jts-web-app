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

  it('кнопка .btn-audio с нераспознанным onclick не остаётся мёртвым контролом, но и не исчезает бесследно', () => {
    // onclick другой функции курса (не playTrack/playRange) — trackIdOf не
    // разберёт id, блока audio не будет. Раньше такая кнопка переносилась в
    // info как есть: в приложении скриптов курса нет, и она жалась впустую.
    // Теперь она уходит по общему правилу чистки, а блок остаётся пустым —
    // его посчитает сводка потерь экстрактора (normalize-task → info-empty).
    const html = stage('Wrap', `<button class="btn btn-audio" onclick="stopAudio(this)">⏹ Стоп</button>`)
    const [s] = collectLesson(html)
    expect(s.blocks).toEqual([{ kind: 'info', html: '' }])
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

  it('пустая группа вариантов → choice без вариантов (в исходнике A0 такие есть, задание отбракует normalize-task)', () => {
    // Реальная разметка A0, стадия Practice, задача «Listen. 13 or 30?»: у
    // группы есть ключ ответа, но ни одной кнопки .opt — и до отсечения чужих
    // режимов тоже. Скрипты курса `.opts` только читают, заполнить её было
    // нечем: задача не работала и в самом курсе. Придумывать варианты за
    // автора мы не будем, но и молча терять строку нельзя — она уходит в
    // сводку потерь как choice-no-answer.
    const html = stage('Practice', `<div class="task" data-task data-tid="voc-listen">
      <div class="row"><span class="num">1</span><span class="body">
        <button class="segbtn" onclick="sayWord('thirteen')">🔊 Number 1</button>
        <div class="opts" data-correct="0"></div></span></div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'choice', options: [], correct: -1, say: 'thirteen' })
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

// Находка ревью: разметка курса тащила в info контролы, которые работали
// только вместе со скриптами курса. В приложении этих скриптов нет, плеер
// печатает info через dangerouslySetInnerHTML — и в уроках оказались пустые
// слайдеры, пустые .words, кнопки sayWord/cardAdd/sayText, переключатели
// перевода и дублирующиеся id (slide, words, trToggle).
describe('collectLesson — чистка мёртвых контролов курса из info', () => {
  it('слайдер грамматики уходит целиком: стрелки со slide() и пустые контейнеры со своими id', () => {
    const html = stage('Grammar', `<div data-only="self">
      <p>I like coffee.</p>
      <div class="slider"><div class="slide" id="slide"></div>
        <div class="snav">
          <button class="btn btn-ghost btn-round" onclick="slide(-1)" aria-label="Previous">&lsaquo;</button>
          <button class="btn btn-ghost btn-round" onclick="slide(1)" aria-label="Next">&rsaquo;</button>
        </div>
        <div class="dots" id="dots"></div></div>
    </div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0].html).toContain('I like coffee.')
    expect(s.blocks[0].html).not.toContain('slide(')
    expect(s.blocks[0].html).not.toContain('id="slide"')
    expect(s.blocks[0].html).not.toContain('id="dots"')
    expect(s.blocks[0].html).not.toContain('slider')
  })

  it('пустой контейнер карточек .words#words уходит, инструкция рядом остаётся', () => {
    const html = stage('Vocabulary', `<div data-only="self">
      <p class="subline">These are your words for this lesson.</p>
      <div class="words" id="words"></div>
    </div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0].html).toContain('These are your words')
    expect(s.blocks[0].html).not.toContain('id="words"')
  })

  it('переключатель перевода уходит вместе со своей подписью, инструкция в том же блоке остаётся', () => {
    // input#trToggle курс подключал скриптом по id — inline-обработчика у него
    // нет, а <label> без своего контрола остался бы подписью к пустому месту.
    const html = stage('Vocabulary', `<div data-only="self">
      <div class="vbar"><div class="instruction">Look and listen.</div>
        <label class="switch"><input type="checkbox" id="trToggle"><span class="track"></span><span>Show translation</span></label>
      </div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0].html).toContain('Look and listen.')
    expect(s.blocks[0].html).not.toContain('trToggle')
    expect(s.blocks[0].html).not.toContain('Show translation')
  })

  it('кнопки sayWord и cardAdd уходят, а слово и перевод рядом с ними остаются', () => {
    const html = stage('Vocabulary', `<div data-only="self"><ul class="mini"><li>
      <span class="w">like <span class="wspk" role="button" tabindex="0" onclick="sayWord('like')">&#128266;</span></span>
      <span class="t">нравится · ұнайды</span>
      <button class="fc-add" data-w="like" onclick="cardAdd('like',this)">+ Add to My Dictionary</button>
    </li></ul></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0].html).toContain('like')
    expect(s.blocks[0].html).toContain('нравится')
    expect(s.blocks[0].html).not.toContain('sayWord')
    expect(s.blocks[0].html).not.toContain('cardAdd')
    expect(s.blocks[0].html).not.toContain('Add to My Dictionary')
  })

  it('кнопка sayText уходит: озвучка абзаца — тоже функция исходного курса', () => {
    const html = stage('Listen', `<div data-only="self">
      <div class="player">
        <button class="btn btn-audio segbtn" onclick="sayText(this)" data-say="I was born in Almaty.">Play</button>
        <div class="meta"><b>Listening</b> — послушай и ответь</div>
      </div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0].html).not.toContain('sayText')
    expect(s.blocks[0].html).toContain('послушай и ответь')
  })

  it('настоящий контент не трогаем: объяснения, таблицы, списки и картинки остаются', () => {
    const html = stage('Grammar', `<div data-only="self">
      <h4>Form</h4>
      <table class="gform"><tr><td>I</td><td>I like coffee.</td></tr></table>
      <ul class="egs"><li>Build it: like → I like coffee.</li></ul>
      <img src="/x.png" alt="схема">
      <details class="gref"><summary>Full grammar reference</summary><div class="gref-body">Правило целиком</div></details>
    </div>`)
    const [s] = collectLesson(html)
    const { html: out } = s.blocks[0]
    expect(out).toContain('<table')
    expect(out).toContain('I like coffee.')
    expect(out).toContain('<img')
    expect(out).toContain('Full grammar reference')
    expect(out).toContain('Правило целиком')
  })

  it('пустая ячейка таблицы остаётся — каркас таблицы не «пустой контейнер»', () => {
    const html = stage('Grammar', `<div data-only="self">
      <table class="gform"><tr><td>I</td><td></td></tr></table></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0].html.match(/<td/g)).toHaveLength(2)
  })

  it('svg-иконка внутри сохранённого контента не разбирается на части', () => {
    const html = stage('Wrap', `<div data-only="self"><b>Итог</b>
      <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0].html).toContain('<path')
  })

  it('в info не остаётся ни одной кнопки: .say в A1 не работала даже в исходнике', () => {
    // Кнопки <button class="say">🔊</button> курс подключал по классу — и не
    // подключил: обработчика на .say в a1.html нет вовсе. В приложении они тем
    // более мертвы, а классы .say в styles.css нет, поэтому рендерились
    // дефолтной кнопкой браузера внутри карточки урока. Текст рядом с ними —
    // не ответ, он остаётся на месте.
    const html = stage('Speaking', `<div data-only="self"><div class="bubble">
      <div class="blab">In other words</div>
      <div>• What time do you get up on weekdays?<button class="say" aria-label="listen">🔊</button></div>
      <div>• What do you do first in the morning?<button class="say" aria-label="listen">🔊</button></div>
    </div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0].html).not.toContain('<button')
    expect(s.blocks[0].html).toContain('What time do you get up on weekdays?')
    expect(s.blocks[0].html).toContain('What do you do first in the morning?')
  })

  it('несколько стадий с чисткой не оставляют дублирующихся id в разметке уроков', () => {
    const words = `<div data-only="self"><p>Words</p><div class="words" id="words"></div></div>`
    const html = stage('Vocabulary', words) + stage('Words', words)
    const blocks = collectLesson(html).flatMap((s) => s.blocks)
    expect(blocks.filter((b) => b.html.includes('id="words"'))).toHaveLength(0)
  })
})

// Находка ревью: 274 задания A0 «Listen. Choose the word you hear.» отвечать
// было нечем. Слово озвучивал синтезатор речи по кнопке sayWord('repeat'), а
// чистка мёртвых контролов убирала кнопку — на экране оставались только
// варианты, и задание превращалось в угадайку с ценой в сердце.
describe('collectLesson — слово для синтеза речи', () => {
  const listenRow = (word, correct) => stage('Vocabulary', `<div class="task" data-task data-tid="voc-listen">
    <div class="row"><span class="num">1</span><span class="body">
      <button class="segbtn" type="button" onclick="sayWord('${word}')"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> 🔊 Word 1</button>
      <div class="opts" data-correct="${correct}">
        <button class="opt" data-val="0">repeat</button>
        <button class="opt" data-val="1">listen</button>
      </div></span></div></div>`)

  it('слово из sayWord доезжает до блока choice отдельным полем', () => {
    const [s] = collectLesson(listenRow('repeat', 0))
    expect(s.blocks[0]).toMatchObject({ kind: 'choice', options: ['repeat', 'listen'], correct: 0, say: 'repeat' })
  })

  it('слово не подмешивается в текст задания — оно и есть ответ', () => {
    const [s] = collectLesson(listenRow('repeat', 0))
    expect(s.blocks[0].prompt).toBe('')
  })

  it('строка из двух слов («how often») переносится целиком', () => {
    const [s] = collectLesson(listenRow('how often', 1))
    expect(s.blocks[0].say).toBe('how often')
  })

  it('«13 or 30?» — тот же механизм на двух вариантах', () => {
    const html = stage('Numbers', `<div class="task" data-task>
      <div class="row"><span class="body">
        <button class="segbtn" onclick="sayWord('thirty')">🔊 Number</button>
        <div class="opts" data-correct="1"><button class="opt" data-val="0">13</button><button class="opt" data-val="1">30</button></div>
      </span></div></div>`)
    expect(collectLesson(html)[0].blocks[0]).toMatchObject({ kind: 'choice', say: 'thirty' })
  })

  it('у строки без sayWord поля say нет — пустое поле в каждом задании только раздувает json', () => {
    const html = stage('Grammar', `<div class="task" data-task>
      <div class="row"><span class="body">I ___ coffee.
        <div class="opts" data-correct="0"><button class="opt" data-val="0">like</button><button class="opt" data-val="1">likes</button></div>
      </span></div></div>`)
    expect(collectLesson(html)[0].blocks[0]).not.toHaveProperty('say')
  })

  it('сама кнопка синтезатора в разметку задания не попадает', () => {
    const [s] = collectLesson(listenRow('repeat', 0))
    expect(JSON.stringify(s.blocks)).not.toContain('sayWord')
  })
})

// Находка ревью: 122 мёртвые кнопки доезжали до info-разметки. Правило чистки
// ловило только inline-обработчики и поля формы, а кнопки .opt курс подключал
// делегированием по классу. В плеере они не делали ничего, а классов .opt/.opts
// в styles.css нет — внутри карточки урока рисовались дефолтные кнопки браузера.
describe('collectLesson — самооценка без правильного ответа → check', () => {
  it('разминка 👍/👎 становится чек-листом с подписями карточек, а не «👍»', () => {
    // Кнопки здесь — шкала оценки, смысл несёт подпись карточки: пункт
    // чек-листа это «☕ coffee», отметка = «👍».
    const html = stage('Warm-up', `<div data-only="self">
      <div class="instruction">Tap 👍 or 👎 for each one.</div>
      <p class="subline">No right or wrong — just you.</p>
      <div class="grid3">
        <div class="card"><span class="body"><b>☕</b> &nbsp;coffee</span><div class="opts"><button class="opt" data-val="y">👍</button><button class="opt" data-val="n">👎</button></div></div>
        <div class="card"><span class="body"><b>📅</b> &nbsp;Mondays</span><div class="opts"><button class="opt" data-val="y">👍</button><button class="opt" data-val="n">👎</button></div></div>
      </div></div>`)
    const [s] = collectLesson(html)
    expect(s.blocks[0]).toMatchObject({ kind: 'info' })
    expect(s.blocks[0].html).toContain('No right or wrong')
    expect(s.blocks[1]).toEqual({ kind: 'check', items: ['☕ coffee', '📅 Mondays'] })
  })

  it('реплики диалога без подписи становятся пунктами сами и стоят между кусками разговора', () => {
    // Порядок — часть методики: реплика отвечает на предыдущее сообщение, а не
    // на весь разговор целиком, поэтому контейнер режется по группам.
    const html = stage('Speaking', `<div data-only="self">
      <div class="instruction">Talk to Sam.</div>
      <div class="chat"><div class="msg"><p>Do you like coffee?</p></div></div>
      <div class="row"><span class="body"><div class="opts">
        <button class="opt" data-val="0">Yes, I like coffee.</button>
        <button class="opt" data-val="1">No, I don’t like coffee.</button>
      </div></span></div>
      <div class="chat"><div class="msg"><p>Me too!</p></div></div>
    </div>`)
    const [s] = collectLesson(html)
    expect(s.blocks.map((b) => b.kind)).toEqual(['info', 'check', 'info'])
    expect(s.blocks[0].html).toContain('Do you like coffee?')
    expect(s.blocks[1].items).toEqual(['Yes, I like coffee.', 'No, I don’t like coffee.'])
    expect(s.blocks[2].html).toContain('Me too!')
  })

  it('после разбора самооценки в info не остаётся ни одной кнопки', () => {
    const html = stage('Speaking', `<div data-only="self">
      <div class="row"><span class="body"><div class="opts">
        <button class="opt" data-val="0">Hello, I'm Anna.</button>
      </div></span></div></div>`)
    const blocks = collectLesson(html)[0].blocks
    expect(blocks.every((b) => b.kind !== 'info' || !b.html.includes('<button'))).toBe(true)
  })

  it('группа с ключом ответа в ту же ветку не уходит — это по-прежнему choice', () => {
    const html = stage('Grammar', `<div data-only="self"><div class="row"><span class="body">I ___ coffee.
      <div class="opts" data-correct="0"><button class="opt" data-val="0">like</button><button class="opt" data-val="1">likes</button></div>
    </span></div></div>`)
    // Строка вне .task в info-ветке: с ключом ответа она остаётся оценочной и
    // до чек-листа не доходит — иначе весь choice уровня стал бы самооценкой.
    const [s] = collectLesson(html)
    expect(s.blocks.some((b) => b.kind === 'check')).toBe(false)
  })

  it('строка внутри .task без ключа ответа тоже становится чек-листом, а не пропадает', () => {
    const html = stage('Speaking', `<div class="task" data-task>
      <div class="row"><span class="body"><div class="opts">
        <button class="opt" data-val="0">Yes, I do.</button>
        <button class="opt" data-val="1">No, I don’t.</button>
      </div></span></div></div>`)
    expect(collectLesson(html)[0].blocks[0]).toEqual({ kind: 'check', items: ['Yes, I do.', 'No, I don’t.'] })
  })
})

// Находка ревью: строка задания, из которой не вышло ни одного блока, исчезала
// молча — мимо сводки потерь, ради которой её и заводили.
describe('collectLesson — потерянные строки задания', () => {
  it('строка без интерактива уходит в сводку потерь с причиной row-no-block', () => {
    const html = stage('Practice', `<div class="task" data-task>
      <div class="row"><span class="num">1</span><span class="body">Say it out loud with your partner.</span></div></div>`)
    const dropped = []
    const [s] = collectLesson(html, (reason) => dropped.push(reason))
    expect(s.blocks).toHaveLength(0)
    expect(dropped).toEqual(['row-no-block'])
  })

  it('без обработчика потерь разбор не падает — модуль вызывается и из тестов', () => {
    const html = stage('Practice', `<div class="task" data-task>
      <div class="row"><span class="body">Say it out loud.</span></div></div>`)
    expect(() => collectLesson(html)).not.toThrow()
  })
})
