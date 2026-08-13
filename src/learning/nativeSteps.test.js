import { describe, it, expect } from 'vitest'
import { tasksToSteps } from './nativeSteps.js'

// Уроки A0/A1 приходят кусками разметки исходного курса, и часть из них —
// не задания, а подписи к ним. Тесты держат именно эту границу: что становится
// экраном, что подписывает соседа, а что выбрасывается.
describe('nativeSteps — уроки A0/A1 в шаги', () => {
  it('инструкция перед заданием не даёт пустой экран, а подписывает его', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'info',
          sec: '1. Warm-up',
          html: '<div data-only="self"><div class="instruction">Tick the ones you like.</div><p class="subline">No right or wrong — just you.</p></div>',
        },
        { type: 'check', sec: '1. Warm-up', items: ['☕ coffee', '📅 Mondays'] },
      ],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({
      type: 'pick',
      stage: 'Warm-up',
      title: 'Tick the ones you like.',
      sub: 'No right or wrong — just you.',
    })
  })

  it('свой заголовок задания сильнее инструкции, подпись всё равно доезжает', () => {
    const steps = tasksToSteps({
      tasks: [
        { type: 'info', html: '<div class="instruction">Choose the right one.</div><p class="subline">Один вариант.</p>' },
        { type: 'choice', title: 'Своё название', options: ['a', 'b'], answer: 'a' },
      ],
    })

    expect(steps[0].title).toBe('Своё название')
    expect(steps[0].sub).toBe('Один вариант.')
  })

  it('блок с таблицей остаётся заметкой, а не подписью', () => {
    const steps = tasksToSteps({
      tasks: [{ type: 'info', html: '<div class="instruction">Form</div><table><tr><td>I like</td></tr></table>' }],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0].type).toBe('note')
  })

  it('плеер без звука выбрасывается: экстрактор потерял <audio>, осталась подпись дорожки', () => {
    const steps = tasksToSteps({
      tasks: [
        { type: 'info', html: '<div class="player"><div class="meta"><b>Track 6.2</b>Original coursebook recording</div></div>' },
        { type: 'choice', options: ['a', 'b'], answer: 'a' },
      ],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0].type).toBe('choice')
  })

  it('разминка с эмодзи идёт карточками, список «Я могу…» — строчками', () => {
    const warm = tasksToSteps({ tasks: [{ type: 'check', items: ['☕ coffee', '📅 Mondays'] }] })
    expect(warm[0]).toMatchObject({
      type: 'pick',
      options: [
        { emoji: '☕', label: 'coffee' },
        { emoji: '📅', label: 'Mondays' },
      ],
    })

    const canDo = tasksToSteps({ tasks: [{ type: 'check', items: ['say what I like', 'ask to repeat'] }] })
    expect(canDo[0].type).toBe('checklist')
  })

  it('у шага слушания остаётся абсолютный адрес дорожки — по нему играет плеер', () => {
    const steps = tasksToSteps({
      tasks: [{ type: 'listen', tracks: [{ src: 'https://files-dev.justtostudy.kz/a1/audio/A1_L1.mp3' }], options: ['a', 'b'], answer: 'a' }],
    })

    expect(steps[0]).toMatchObject({ type: 'listen', src: 'https://files-dev.justtostudy.kz/a1/audio/A1_L1.mp3' })
  })

  it('слово на слух доезжает до шага полем say — без него задание неразрешимо', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'choice',
          sec: '2. Vocabulary',
          title: 'Listen. Choose the word you hear.',
          options: ['repeat', 'listen', 'match', 'answer'],
          answer: 'repeat',
          say: 'repeat',
        },
      ],
    })

    expect(steps[0]).toMatchObject({ type: 'choice', say: 'repeat' })
  })

  it('словарь стадии Vocabulary становится карточками, а не заметкой', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'cards',
          sec: '2. Vocabulary',
          words: [
            { en: 'like', ru: 'нравится', kk: 'ұнайды', def: 'to feel good about', img: '/learning/img/a0/like-abc123.webp' },
            { en: 'again', ru: 'снова', kk: 'қайтадан', def: 'one more time', img: null },
          ],
        },
      ],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ type: 'cards', stage: 'Vocabulary' })
    expect(steps[0].words).toHaveLength(2)
    expect(steps[0].words[0].img).toBe('/learning/img/a0/like-abc123.webp')
  })

  it('пустой словарь не даёт экрана', () => {
    expect(tasksToSteps({ tasks: [{ type: 'cards', words: [] }] })).toHaveLength(0)
  })
})

// Соединение пар в источнике — одно упражнение, но экстрактор разворачивает его
// в отдельные choice, и каждый несёт весь набор вариантов. На экране получалось
// N подряд вопросов «выбери 1 из N» вместо соединения.
describe('nativeSteps — соединение пар', () => {
  const pair = (word, answer, sec = '2. Vocabulary') => ({
    type: 'choice',
    sec,
    word,
    options: ['слушать', 'повторять', 'соединять', 'отвечать'],
    answer,
  })
  // Инструкция — обязательное условие: без неё та же форма встречается у
  // заданий на классификацию, и собирать из них соединение нельзя.
  const matchLead = (sec = '2. Vocabulary') => ({
    type: 'info',
    sec,
    html: '<div class="instruction">Match the word to the picture.</div>',
  })

  it('серия choice с одинаковым набором вариантов складывается в один экран', () => {
    const steps = tasksToSteps({
      tasks: [matchLead(), pair('👂 listen', 'слушать'), pair('🔁 repeat', 'повторять'), pair('🔗 match', 'соединять')],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ type: 'match', stage: 'Vocabulary' })
    expect(steps[0].pairs).toEqual([
      { left: '👂 listen', right: 'слушать' },
      { left: '🔁 repeat', right: 'повторять' },
      { left: '🔗 match', right: 'соединять' },
    ])
    expect(steps[0].options).toHaveLength(4)
  })

  it('двух пар мало — это честно два отдельных вопроса', () => {
    const steps = tasksToSteps({ tasks: [matchLead(), pair('👂 listen', 'слушать'), pair('🔁 repeat', 'повторять')] })
    expect(steps.map((s) => s.type)).toEqual(['choice', 'choice'])
  })

  // Повтор ответа означает, что это не пары, а несколько вопросов с общим
  // банком: соединение из них собирать нельзя — вариант в паре одноразовый.
  it('повторяющийся ответ разрывает серию', () => {
    const steps = tasksToSteps({
      tasks: [matchLead(), pair('a', 'слушать'), pair('b', 'слушать'), pair('c', 'повторять'), pair('d', 'соединять')],
    })
    expect(steps.map((s) => s.type)).toEqual(['choice', 'choice', 'choice', 'choice'])
  })

  it('смена стадии разрывает серию', () => {
    const steps = tasksToSteps({
      tasks: [
        matchLead(),
        pair('a', 'слушать'),
        pair('b', 'повторять'),
        matchLead('3. Grammar'),
        pair('c', 'соединять', '3. Grammar'),
        pair('d', 'отвечать', '3. Grammar'),
      ],
    })
    expect(steps.every((s) => s.type === 'choice')).toBe(true)
  })

  it('серия склеенных пропусков идёт одним экраном, но не длиннее четырёх', () => {
    const gap = (before) => ({ type: 'gap', sec: '4. Practice', gapBefore: before, gapAfter: '.', answer: 'am' })
    const steps = tasksToSteps({ tasks: [gap('I'), gap('You'), gap('He'), gap('She'), gap('We')] })

    expect(steps.map((s) => s.type)).toEqual(['group', 'gap'])
    expect(steps[0].items).toHaveLength(4)
  })

  it('смена стадии разрывает склейку пропусков', () => {
    const gap = (sec) => ({ type: 'gap', sec, gapBefore: 'I', gapAfter: '.', answer: 'am' })
    const steps = tasksToSteps({ tasks: [gap('4. Practice'), gap('5. Listening')] })
    expect(steps.map((s) => s.type)).toEqual(['gap', 'gap'])
  })


  // Находка при переносе правила на A2/B1: у заданий на классификацию («Now or
  // then?», «Who is each sentence about?») и у пропусков на артикли («Choose a,
  // the or nothing») ТА ЖЕ форма — общий банк вариантов, а неповторяющиеся
  // ответы выходят случайно. Собрав из них соединение, мы пообещали бы, что
  // каждый вариант используется ровно раз, и соврали бы.
  it('классификация с тем же набором вариантов соединением НЕ становится', () => {
    const q = (word, answer) => ({ type: 'choice', sec: '4. Practice', word, options: ['present', 'past', 'future'], answer })
    const steps = tasksToSteps({
      tasks: [
        { type: 'info', sec: '4. Practice', html: '<div class="instruction">Present or past? Read the sentence and choose the time.</div>' },
        q('What time do you finish work?', 'present'),
        q('Where did you meet her?', 'past'),
        q('What will you do tomorrow?', 'future'),
      ],
    })

    expect(steps.map((s) => s.type)).toEqual(['choice', 'choice', 'choice'])
  })

  it('инструкция «Match the word…» подписывает собранный экран', () => {
    const steps = tasksToSteps({
      tasks: [
        { type: 'info', sec: '2. Vocabulary', html: '<div class="instruction">Match the word to the picture.</div><p class="subline">Tap a word, then tap its picture.</p>' },
        pair('a', 'слушать'),
        pair('b', 'повторять'),
        pair('c', 'соединять'),
      ],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0].title).toBe('Match the word to the picture.')
    expect(steps[0].sub).toBe('Tap a word, then tap its picture.')
  })
})

// Правила исходного курса, которые терялись при раскладке по одному заданию на
// экран: чужие мета-пометки, скрипт записи и образец ответа не должны
// показываться раньше времени, а стадия Wrap — дублировать экран итогов.
describe('nativeSteps — что не должно попадать на экран', () => {
  it('мета-комментарий с названием учебника-источника вырезан', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'info',
          sec: '5. Listening',
          html: '<div class="instruction">Listen. Tick what you hear.</div><div class="player"><div class="meta"><b>🔊 Free time — Oxford Navigate audio</b>listen, then answer</div></div>',
        },
        { type: 'choice', sec: '5. Listening', options: ['a', 'b'], answer: 'a' },
      ],
    })

    expect(JSON.stringify(steps)).not.toContain('Oxford Navigate')
    // Без блока источника осталась одна инструкция — она подписывает задание,
    // а не становится отдельным пустым экраном.
    expect(steps).toHaveLength(1)
    expect(steps[0].title).toBe('Listen. Tick what you hear.')
  })

  it('скрипт записи уезжает за задания своей стадии', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'info',
          sec: '5. Listening',
          html: '<div class="instruction">Listen.</div><details class="gref"><summary>What you heard</summary><div class="gref-body"><p>read, watch TV, travel</p></div></details>',
        },
        { type: 'choice', sec: '5. Listening', options: ['a', 'b'], answer: 'a' },
      ],
    })

    expect(steps.map((s) => s.type)).toEqual(['choice', 'note'])
    expect(steps[1].html).toContain('What you heard')
  })

  it('справочник грамматики остаётся на месте — прячем только скрипт', () => {
    const steps = tasksToSteps({
      tasks: [
        { type: 'info', sec: '3. Grammar', html: '<details class="gref"><summary>Full grammar reference</summary><div class="gref-body"><p>I am, you are</p></div></details>' },
        { type: 'choice', sec: '3. Grammar', options: ['a', 'b'], answer: 'a' },
      ],
    })

    expect(steps.map((s) => s.type)).toEqual(['note', 'choice'])
  })

  it('открытое задание на письмо становится шагом write, образец — за кнопкой', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'info',
          sec: '6. Speaking',
          html: '<div class="instruction">Write two sentences.</div><div class="opentask" data-tid="wr-1"><div class="bubble am"><div class="blab">Model answer</div><p><i>I like coffee.</i></p></div></div>',
        },
      ],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ type: 'write', title: 'Write two sentences.' })
    expect(steps[0].modelHtml).toContain('I like coffee.')
  })

  it('стадия Wrap: плашка «урок завершён» убрана, список «You can now…» стал чек-листом', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'info',
          sec: '7. Wrap',
          html:
            '<div class="done-card"><h3>🎉 Lesson 1 complete!</h3><p>⭐ 60 points</p></div>' +
            '<div class="instruction">You can now…</div><p class="subline">Tap each one you can do.</p>' +
            '<ul class="can"><li><span class="tick">✓</span><span>say what I like</span></li><li><span class="tick">✓</span><span>ask to repeat</span></li></ul>',
        },
      ],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ type: 'checklist', stage: 'Wrap', title: 'You can now…' })
    // Галочка из разметки в текст пункта не едет: у чек-листа своя отметка.
    expect(steps[0].items).toEqual(['say what I like', 'ask to repeat'])
    expect(JSON.stringify(steps)).not.toContain('complete')
  })
})

// Записанное слово: файл важнее синтеза браузера. Синтез — лотерея (голос
// зависит от системы, на Android для en-US его может не быть вовсе), а одно и
// то же слово звучит и на карточке словаря, и в задании на слух через
// несколько экранов.
describe('nativeSteps — записанное слово', () => {
  it('адрес записи доезжает до шага рядом с самим словом', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'choice',
          sec: '2. Vocabulary',
          title: 'Listen. Choose the word you hear.',
          options: ['repeat', 'listen'],
          answer: 'repeat',
          say: 'repeat',
          sayTrack: '/learning/audio/a0/c0ac48aa.mp3',
        },
      ],
    })

    expect(steps[0]).toMatchObject({ say: 'repeat', sayTrack: '/learning/audio/a0/c0ac48aa.mp3' })
  })

  it('без записи поле пустое — плеер договорит синтезом', () => {
    const steps = tasksToSteps({
      tasks: [{ type: 'choice', sec: '2. Vocabulary', options: ['a', 'b'], answer: 'a', say: 'a' }],
    })
    expect(steps[0].sayTrack).toBe('')
  })

  it('запись слова карточки едет вместе со словом', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'cards',
          sec: '2. Vocabulary',
          words: [{ en: 'like', ru: 'нравится', img: null, audio: '/learning/audio/a0/c4eb7d7f.mp3' }],
        },
      ],
    })
    expect(steps[0].words[0].audio).toBe('/learning/audio/a0/c4eb7d7f.mp3')
  })
})
