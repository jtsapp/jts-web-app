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
  // Запись слова (карточка, «выберите картинку») и материал задания могут
  // быть одним клипом — правка клипа для задания карточку трогать не должна
  // (clip-fixes.js, only: 'task'). Поэтому экстрактор говорит, зачем клип.
  it('запись слова просит клип с ролью word, задание — без роли', () => {
    const asked = []
    const c = { ...ctx, clip: (k, role) => (asked.push([k, role || 'task']), `/course/a0/audio/${k}.mp3`) }
    lessonSteps(
      {
        key: '6',
        no: 6,
        groups: [
          { t: 'cards', stage: 'vocab', items: [{ w: 'How are you?', wordClip: 'how' }] },
          { t: 'listen', stage: 'lisrd', items: [{ clip: 'how', q: { ru: 'Первый ответ:' }, opts: ['a', 'b'], a: 0 }] },
        ],
      },
      PER_ITEM,
      c,
    )
    expect(asked).toEqual([
      ['how', 'word'],
      ['how', 'task'],
    ])
  })

  it('карточки слов несут перевод, пример и озвучку', () => {
    const [card] = steps([
      { t: 'cards', stage: 'vocab', items: [{ w: 'like', ru: 'нравится', kk: 'ұнайды', use: 'I <em>like</em> tea.', wordClip: 'w1' }] },
    ])
    expect(card).toMatchObject({ type: 'cards', stage: 'Слова' })
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

  // «Послушайте. Выберите картинку.»: варианты в файле курса — имена иконок
  // (door, sun, clock). Без самих иконок студент видел слова «sun / door» под
  // записью «Good morning» — задание теряло смысл, а у урока 1 превращалось в
  // «выбери услышанное слово» (listen среди look/listen/answer).
  describe('«выберите картинку» (pic)', () => {
    const ICONS = { door: '<path d="M1"/>', sun: '<circle r="4"/>', clock: '<path d="M2"/>' }
    const icon = (name) => ICONS[name] || null
    const picSteps = (groups, extra = {}) =>
      lessonSteps({ key: '2', no: 2, groups }, { ...PER_ITEM, pic: 'pic' }, { ...ctx, icon, ...extra })
    const group = {
      t: 'pic',
      stage: 'lisrd',
      ins: { ru: 'Послушайте. Выберите картинку.' },
      items: [{ clip: 'h2_good_morning', w: 'Good morning.', opts: ['door', 'sun', 'clock'], a: 1 }],
    }

    it('несёт иконку каждого варианта в том же порядке', () => {
      const [s] = picSteps([group])
      expect(s).toMatchObject({ type: 'choice', options: ['door', 'sun', 'clock'], answer: 'sun' })
      expect(s.optionIcons).toEqual([ICONS.door, ICONS.sun, ICONS.clock])
    })

    // Движок курса у pic играет только слово (R.pic зовёт speak(sc.w)), а
    // клип на экране — запись того же слова. Клип как дорожка шага давал
    // вторую кнопку «послушать» над SayButton.
    it('звучит одной записью: клип слова уходит в sayTrack, дорожки нет', () => {
      const [s] = picSteps([group])
      expect(s.src).toBeUndefined()
      expect(s).toMatchObject({ say: 'Good morning.', sayTrack: '/course/a0/audio/h2_good_morning.mp3' })
    })

    it('без клипа берёт озвучку слова', () => {
      const [s] = picSteps([{ ...group, items: [{ w: 'listen', opts: ['door', 'sun', 'clock'], a: 1 }] }], {
        wordAudio: (w) => `/learning/audio/a0/${w}.mp3`,
      })
      expect(s.sayTrack).toBe('/learning/audio/a0/listen.mp3')
    })

    // Хоть одной иконки нет — картинки не рисуем вовсе: смесь картинок и
    // слов подсказала бы ответ.
    it('неполный набор иконок — без картинок', () => {
      const [s] = picSteps([{ ...group, items: [{ w: 'x', opts: ['door', 'moon', 'clock'], a: 0 }] }])
      expect(s.optionIcons).toBeUndefined()
    })
  })

  // У A0 (уроки 21 и 24) задание ссылается на клип, которого в банке курса
  // нет («AI-generated» дорожка), и несёт fallback — текст, который движок
  // курса в этом случае читает синтезом. Без него шаг выходил немым.
  it('нет клипа в банке — звучит озвучка fallback-текста', () => {
    const fallback = "Look outside. It's raining right now."
    const [s] = lessonSteps(
      { key: '21', no: 21, groups: [{ t: 'listen', stage: 'lisrd', items: [{ clip: 'pc_now', fallback, q: { ru: 'Что сейчас?' }, opts: ["It's raining.", "It's snowing."], a: 0 }] }] },
      PER_ITEM,
      { ...ctx, clip: () => null, wordAudio: (t) => (t === fallback ? '/learning/audio/a0/fb.mp3' : null) },
    )
    expect(s).toMatchObject({ type: 'listen', src: '/learning/audio/a0/fb.mp3' })
  })

  it('клип в банке важнее fallback-текста', () => {
    const [s] = lessonSteps(
      { key: '21', no: 21, groups: [{ t: 'listen', stage: 'lisrd', items: [{ clip: 'real', fallback: 'x', q: { ru: '?' }, opts: ['a', 'b'], a: 0 }] }] },
      PER_ITEM,
      { ...ctx, wordAudio: () => '/learning/audio/a0/fb.mp3' },
    )
    expect(s.src).toBe('/course/a0/audio/real.mp3')
  })

  it('вопрос на слух с картинками-вариантами несёт иконки', () => {
    const icon = (n) => ({ coffee: '<path d="C"/>', tea: '<path d="T"/>', water: '<path d="W"/>' })[n] || null
    const [s] = lessonSteps(
      { key: '1', no: 1, groups: [{ t: 'listen', stage: 'lisrd', items: [{ clip: 'l1', q: { ru: 'Что хочет мужчина?' }, pics: ['coffee', 'water', 'tea'], a: 0 }] }] },
      PER_ITEM,
      { ...ctx, icon },
    )
    expect(s).toMatchObject({ type: 'listen', options: ['coffee', 'water', 'tea'], answer: 'coffee' })
    expect(s.optionIcons).toEqual(['<path d="C"/>', '<path d="W"/>', '<path d="T"/>'])
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

  // Записи в файле курса есть не у всех фраз — остальные озвучены отдельно
  // (public/learning/audio/<level>/<хэш текста>.mp3, scripts/voice-step-cards.js).
  // Без запасного пути через wordAudio следующая выгрузка курса молча вернула
  // бы им src: null, и фразу снова читал бы браузерный синтез.
  describe('сгенерированная озвучка подхватывается по тексту', () => {
    const voiced = { 'I dont like rain.': '/learning/audio/a0/aaa.mp3', 'Say it.': '/learning/audio/a0/bbb.mp3' }
    const voicedCtx = { ...ctx, wordAudio: (text) => voiced[text] || null }
    const build = (groups) => lessonSteps({ key: '1', no: 1, groups }, PER_ITEM, voicedCtx)

    it('фраза без записи курса берёт сгенерированную, запись курса важнее', () => {
      const [phrases] = build([
        { t: 'chunk', stage: 'gram', ins: { en: 'Listen' }, items: [{ s: 'I like coffee.', clip: 'c1' }, { s: 'I dont like rain.' }, 'Say it.', { s: 'No audio.' }] },
      ])
      expect(phrases.items).toEqual([
        { text: 'I like coffee.', src: '/course/a0/audio/c1.mp3' },
        { text: 'I dont like rain.', src: '/learning/audio/a0/aaa.mp3' },
        { text: 'Say it.', src: '/learning/audio/a0/bbb.mp3' },
        { text: 'No audio.', src: null },
      ])
    })

    // «Послушайте, затем запишите себя»: образец раньше был строкой, и записи
    // прописать было некуда — его читал только браузерный синтез. С записью
    // строки остаются строками (их читает и старый плеер), записи — рядом,
    // параллельным itemAudio.
    it('образец для записи голоса несёт запись, когда она есть', () => {
      const [rec] = build([{ t: 'record', stage: 'speak', ins: { en: 'Say' }, lines: ['Say it.', 'No audio.'] }])
      expect(rec.type).toBe('record')
      expect(rec.items).toEqual(['Say it.', 'No audio.'])
      expect(rec.itemAudio).toEqual(['/learning/audio/a0/bbb.mp3', null])
    })

    it('«скажи вслух» (B1 say) — так же', () => {
      const [rec] = build([{ t: 'say', stage: 'speak', ins: { en: 'Say' }, prompts: ['Say it.', 'No audio.'] }])
      expect(rec.items).toEqual(['Say it.', 'No audio.'])
      expect(rec.itemAudio).toEqual(['/learning/audio/a0/bbb.mp3', null])
    })

    it('без единой записи itemAudio нет вовсе', () => {
      const [rec] = build([{ t: 'record', stage: 'speak', ins: { en: 'Say' }, lines: ['No audio.'] }])
      expect(rec.items).toEqual(['No audio.'])
      expect(rec).not.toHaveProperty('itemAudio')
    })
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
