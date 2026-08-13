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
    // Банк — ответы этого экрана, а не весь набор вариантов задания: лишний
    // «отвечать» ломал бы обещание «каждый вариант используется один раз».
    expect(steps[0].options).toEqual(['слушать', 'повторять', 'соединять'])
  })

  // Десять пар одним экраном не помещались даже в 1440, а сердце снималось за
  // всё упражнение разом — одна ошибка стоила как десять.
  it('длинное упражнение режется на экраны и остаток делится поровну', () => {
    const answers = ['слушать', 'повторять', 'соединять', 'отвечать', 'спрашивать', 'понимать', 'закончить', 'работать', 'просить', 'извиняться']
    const steps = tasksToSteps({
      tasks: [
        matchLead(),
        ...answers.map((a, i) => ({ type: 'choice', sec: '2. Vocabulary', word: `w${i}`, options: answers, answer: a })),
      ],
    })

    expect(steps.map((s) => s.type)).toEqual(['match', 'match', 'match'])
    expect(steps.map((s) => s.pairs.length)).toEqual([4, 3, 3])
    // Заголовок из подписи достаётся всей серии, а не только первому экрану.
    expect(new Set(steps.map((s) => s.title))).toEqual(new Set(['Match the word to the picture.']))
    // Банк каждого экрана — его собственные ответы.
    steps.forEach((s) => expect(s.options).toEqual(s.pairs.map((p) => p.right)))
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

// Слайд правила в макете — карточка с фиолетовой шапкой таблицы, формулами
// вместо строк «Use X + Y» и каруселью примеров под ней. Плюс исходный курс
// печатает заголовок блока ещё и первой строкой его же списка.
describe('nativeSteps — слайд правила', () => {
  const grammar = (html) => tasksToSteps({ tasks: [{ type: 'info', sec: '3. Grammar', html }] })[0]

  it('строки «Use X + Y» становятся формулой, местоимение отделяется', () => {
    const s = grammar('<ul class="egs"><li>Use I like + a thing you enjoy.</li></ul>')
    expect(s.html).toContain('class="gf"')
    expect(s.html).toContain('<span class="gf__p">I</span>')
    expect(s.html).toContain('<span class="gf__p">like</span>')
    expect(s.html).toContain('<span class="gf__p">a thing you enjoy</span>')
    // Список с формулами теряет маркеры — на это и вешается стиль.
    expect(s.html).toMatch(/<ul[^>]*class="[^"]*has-gf/)
  })

  it('строка без плюса остаётся обычным пунктом', () => {
    const s = grammar('<ul class="egs"><li>It is a fixed phrase — just add the word.</li></ul>')
    expect(s.html).not.toContain('class="gf"')
  })

  it('заголовок, продублированный первым пунктом списка, печатается один раз', () => {
    const s = grammar(
      '<div class="instruction">I like / I don’t like</div>' +
        '<table class="gtable"><tbody><tr><th>Person</th><th>+</th></tr><tr><td>I</td><td>I like coffee.</td></tr></tbody></table>' +
        '<div class="instruction">🔧 Build it yourself</div><ul class="egs"><li>🔧 Build it yourself</li><li>Build it: like → I like coffee.</li></ul>',
    )
    // Заголовок остаётся заголовком, но из списка уходит.
    expect(s.html).toContain('>🔧 Build it yourself</div>')
    expect(s.html).not.toContain('<li>🔧 Build it yourself</li>')
  })

  it('примеры для карусели берутся из таблицы правила, без колонки лица', () => {
    const s = grammar(
      '<table class="gtable"><tbody><tr><th>Person</th><th>+</th><th>–</th></tr>' +
        '<tr><td>I</td><td>I like coffee.</td><td>I don’t like Mondays.</td></tr></tbody></table>',
    )
    expect(s.examples).toEqual(['I like coffee.', 'I don’t like Mondays.'])
  })
})

// Стадия Practice в источнике — десять однотипных вопросов подряд после одной
// инструкции. По одному на экран это давало хвост одинаковых экранов, а
// инструкция доставалась только первому.
describe('nativeSteps — серии заданий и инструкция стадии', () => {
  const lead = (text, sec = '4. Practice') => ({ type: 'info', sec, html: `<div class="instruction">${text}</div>` })

  it('пять утверждений «True / False» становятся одним экраном', () => {
    const say = (q, a) => ({ type: 'choice', sec: '4. Practice', word: q, options: ['True', 'False'], answer: a })
    const steps = tasksToSteps({
      tasks: [
        lead('Read. Then choose True or False.'),
        say('Listen means “use your ears”.', 'True'),
        say('Repeat means “say it again”.', 'True'),
        say('Answer means “ask a question”.', 'False'),
        say('Slowly means “very fast”.', 'False'),
        say('Look at means “use your eyes”.', 'True'),
      ],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ type: 'rows', title: 'Read. Then choose True or False.', options: ['True', 'False'] })
    expect(steps[0].items).toHaveLength(5)
    expect(steps[0].items[2]).toEqual({ q: 'Answer means “ask a question”.', answer: 'False' })
  })

  it('инструкция стадии доезжает до всей серии, а не только до первого задания', () => {
    const steps = tasksToSteps({
      tasks: [
        lead('Put the words in order.'),
        { type: 'order', sec: '4. Practice', answer: ['I', 'like', 'coffee'] },
        { type: 'order', sec: '4. Practice', answer: ['I', 'like', 'tea'] },
        { type: 'order', sec: '4. Practice', answer: ['I', 'like', 'music'] },
      ],
    })

    expect(steps.map((s) => s.title)).toEqual(['Put the words in order.', 'Put the words in order.', 'Put the words in order.'])
  })

  // Разбор ответов до самих ответов — спойлер, и он же мешал блоку стать
  // подписью: инструкция не доезжала до заданий.
  it('«Why these answers» уезжает в конец стадии и не съедает инструкцию', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'info',
          sec: '4. Practice',
          html: '<div class="instruction">Read. Then choose True or False.</div><details class="gref"><summary>Why these answers</summary><p>Because.</p></details>',
        },
        { type: 'choice', sec: '4. Practice', word: 'A means B.', options: ['True', 'False'], answer: 'True' },
        { type: 'choice', sec: '4. Practice', word: 'C means D.', options: ['True', 'False'], answer: 'False' },
      ],
    })

    expect(steps.map((s) => s.type)).toEqual(['rows', 'note'])
    expect(steps[0].title).toBe('Read. Then choose True or False.')
    expect(steps[1].html).toContain('Why these answers')
  })
})

// Плеер дорожки приезжает отдельным блоком, а задание к нему — следующим.
describe('nativeSteps — запись стадии', () => {
  it('пустой экран плеера исчезает, запись едет вместе с заданиями стадии', () => {
    const steps = tasksToSteps({
      tasks: [
        { type: 'listen', sec: '5. Listening', tracks: [{ src: 'https://x/a.mp3' }] },
        { type: 'info', sec: '5. Listening', html: '<div class="instruction">Listen. Tick what you hear.</div>' },
        { type: 'check', sec: '5. Listening', items: ['📖 read', '📺 watch TV'] },
      ],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ type: 'pick', title: 'Listen. Tick what you hear.', audio: 'https://x/a.mp3' })
  })

  it('запись без заданий остаётся своим экраном', () => {
    const steps = tasksToSteps({ tasks: [{ type: 'listen', sec: '5. Listening', tracks: [{ src: 'https://x/a.mp3' }] }] })
    expect(steps.map((s) => s.type)).toEqual(['listen'])
  })
})

// Плейсхолдер поля в макете — каркас будущего ответа, а не «Введите ответ».
describe('nativeSteps — каркас ответа', () => {
  const write = (model) =>
    tasksToSteps({
      tasks: [
        {
          type: 'info',
          sec: '6. Speaking',
          html: `<div class="opentask"><div class="instruction">Write two sentences.</div><div class="bubble am"><div class="blab">Model answer</div><p><i>${model}</i></p><p><b>Check yourself:</b> spelling counts.</p></div></div>`,
        },
      ],
    })[0]

  it('каркас строится по образцу ответа, связка держится при подлежащем', () => {
    expect(write('I like coffee and music. I don’t like Mondays.').placeholder).toBe('I like _____. I don’t like _____.')
  })

  it('вопрос или назывное предложение каркаса не дают — поле остаётся с обычной подсказкой', () => {
    expect(write('I’m a doctor. What do you do?').placeholder).toBe('')
    expect(write('My phone is old.').placeholder).toBe('')
  })
})

// Подпись к чек-листу «Я могу…» стоит прямо перед списком, а за списком в том
// же блоке идёт ещё и список ключевых слов.
describe('nativeSteps — чек-лист Wrap', () => {
  it('заголовок и подпись берутся из курса, а не подставляются', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'info',
          sec: '7. Wrap',
          html:
            '<div class="done-card"><h3>🎉 Lesson 1 complete!</h3></div>' +
            '<div class="instruction">You can now…</div><p class="subline">Tap each one you can do.</p>' +
            '<ul class="can"><li><span class="tick">✓</span><span>say what I like</span></li><li><span>ask to repeat</span></li></ul>' +
            '<div class="instruction">🔑 KEY WORD LIST</div><div class="card"><ul class="mini"><li>like</li></ul></div>',
        },
      ],
    })

    const check = steps.find((s) => s.type === 'checklist')
    expect(check).toMatchObject({ title: 'You can now…', sub: 'Tap each one you can do.' })
    expect(check.items).toEqual(['say what I like', 'ask to repeat'])
  })
})

// Строки над словарём: крупной фиолетовой в макете идёт инструкция, мелкой —
// подпись стадии. У перенесённого курса (A2/B1) роли полей уже такие, у A0/A1
// инструкция приезжает подписью предыдущего блока — и попадала не в ту строку.
describe('nativeSteps — заголовки словаря', () => {
  it('инструкция уходит в крупную строку, подпись словаря — в мелкую', () => {
    const steps = tasksToSteps({
      tasks: [
        {
          type: 'info',
          sec: '2. Vocabulary',
          html: '<div class="instruction">Look and listen. Tap a picture to hear the word.</div><p class="subline">These are your words for this lesson.</p>',
        },
        { type: 'cards', sec: '2. Vocabulary', words: [{ en: 'like', ru: 'нравится' }] },
      ],
    })

    expect(steps[0]).toMatchObject({
      type: 'cards',
      title: 'These are your words for this lesson.',
      sub: 'Look and listen. Tap a picture to hear the word.',
    })
  })
})

// Часть разминок приезжает не заданием, а вёрсткой: сетка карточек внутри
// info-блока. Экраном это печаталось серой заметкой, где значок стоял отдельной
// строкой над подписью и ничего не нажималось.
describe('nativeSteps — разминка из вёрстки', () => {
  const grid = (cards) => `<div class="grid3">${cards.map((c) => `<div class="card"><b>${c[0]}</b> &nbsp;${c[1]}</div>`).join('')}</div>`

  it('сетка карточек становится экраном выбора, а не заметкой', () => {
    const steps = tasksToSteps({
      tasks: [
        { type: 'info', sec: '2. Warm-up', html: '<div class="instruction">Where were you yesterday at 8 p.m.?</div>' },
        { type: 'info', sec: '2. Warm-up', html: '<p class="subline">Tap one. There is no wrong answer.</p>' },
        { type: 'info', sec: '2. Warm-up', html: grid([['🏠', 'at home'], ['💼', 'at work'], ['☕', 'in a café']]) },
      ],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({
      type: 'pick',
      title: 'Where were you yesterday at 8 p.m.?',
      // Вторая строка подписи приезжает отдельным блоком и раньше пропадала.
      sub: 'Tap one. There is no wrong answer.',
      // «Tap one» — выбор ровно один.
      single: true,
    })
    expect(steps[0].options).toEqual([
      { emoji: '🏠', label: 'at home' },
      { emoji: '💼', label: 'at work' },
      { emoji: '☕', label: 'in a café' },
    ])
  })

  it('«Tap the ones» оставляет выбор множественным', () => {
    const steps = tasksToSteps({
      tasks: [
        { type: 'info', sec: '2. Warm-up', html: '<div class="instruction">Tap the hellos you say.</div><p class="subline">No right or wrong — just you.</p>' + grid([['👋', 'Hi'], ['🤝', 'Hello']]) },
      ],
    })

    expect(steps[0]).toMatchObject({ type: 'pick', title: 'Tap the hellos you say.', sub: 'No right or wrong — just you.' })
    expect(steps[0].single).toBeUndefined()
  })

  // Цифры-клавиши и флаги — тоже значки, но \p{Extended_Pictographic} их не
  // знает: разминки «числа» и «страны» из-за этого шли строчками без картинки.
  it('цифры-клавиши и флаги отделяются как значки', () => {
    const steps = tasksToSteps({
      tasks: [{ type: 'info', sec: '2. Warm-up', html: '<div class="instruction">Tap the numbers.</div>' + grid([['1️⃣', 'one'], ['🇯🇵', 'Japan']]) }],
    })

    expect(steps[0].options).toEqual([
      { emoji: '1️⃣', label: 'one' },
      { emoji: '🇯🇵', label: 'Japan' },
    ])
  })

  it('сетка без значков остаётся вёрсткой заметки', () => {
    const steps = tasksToSteps({
      tasks: [{ type: 'info', sec: '3. Grammar', html: '<div class="grid3"><div class="card">was</div><div class="card">were</div></div>' }],
    })

    expect(steps.map((s) => s.type)).toEqual(['note'])
  })

  it('значок отделяется и у задания multi', () => {
    const steps = tasksToSteps({ tasks: [{ type: 'multi', sec: '5. Listening', options: ['📖 read', '📺 watch TV'] }] })
    expect(steps[0].options).toEqual([
      { emoji: '📖', label: 'read' },
      { emoji: '📺', label: 'watch TV' },
    ])
  })
})

// Стадия слушания в курсе — одна страница: плеер сверху, под ним все вопросы к
// записи. Разложенная по одному вопросу на экран, она заставляла слушать
// дорожку заново на каждом: записи по 50–90 секунд, вопросов до шестнадцати.
describe('nativeSteps — вопросы к одной записи', () => {
  const ask = (q, right, wrong) => ({ type: 'choice', sec: '4. Recall', word: q, options: [wrong, right], answer: right })
  const track = { type: 'listen', sec: '4. Recall', tracks: [{ src: 'https://x/t.mp3' }] }
  const lead = { type: 'info', sec: '4. Recall', html: '<div class="instruction">Listen, then complete each phrase.</div>' }

  it('серия вопросов к записи собирается в один экран со своим набором вариантов у каждого', () => {
    const steps = tasksToSteps({
      tasks: [track, lead, ask('post a ___', 'letter', 'meal'), ask('move ___', 'house', 'email'), ask('call a ___', 'taxi', 'letter')],
    })

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ type: 'rows', title: 'Listen, then complete each phrase.', audio: 'https://x/t.mp3' })
    expect(steps[0].items).toEqual([
      { q: 'post a ___', options: ['meal', 'letter'], answer: 'letter' },
      { q: 'move ___', options: ['email', 'house'], answer: 'house' },
      { q: 'call a ___', options: ['letter', 'taxi'], answer: 'taxi' },
    ])
  })

  it('длинная серия режется по шесть, запись остаётся на каждом экране', () => {
    const many = Array.from({ length: 16 }, (_, i) => ask(`q${i} ___`, `right${i}`, `wrong${i}`))
    const steps = tasksToSteps({ tasks: [track, lead, ...many] })

    expect(steps.map((s) => s.type)).toEqual(['rows', 'rows', 'rows'])
    expect(steps.map((s) => s.items.length)).toEqual([6, 5, 5])
    steps.forEach((s) => expect(s.audio).toBe('https://x/t.mp3'))
  })

  // Задания разного рода склеивать нельзя: свободный ответ и выбор из карточек —
  // это не строки одного упражнения.
  it('разнородные задания к записи остаются своими экранами, но с плеером', () => {
    const steps = tasksToSteps({
      tasks: [track, lead, { type: 'check', sec: '4. Recall', items: ['📖 read', '📺 watch TV'] }],
    })

    expect(steps.map((s) => s.type)).toEqual(['pick'])
    expect(steps[0].audio).toBe('https://x/t.mp3')
  })
})
