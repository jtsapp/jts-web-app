import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { listenScreens, strip } = require('./build-course-steps.js')

// Дорожка в уроке одна на всю стадию, а вопросов к ней несколько. По одному
// вопросу на экран студент слушал запись заново на каждом — в B1 это пять
// экранов подряд на один и тот же трек.
describe('build-course-steps — вопросы к записи', () => {
  const q = (title, prompt, answer, options) => ({ stage: 'Listening', type: 'choice', title, prompt, options, answer })

  it('вопросы под одной инструкцией собираются в экран-список с дорожкой', () => {
    const out = listenScreens(
      [
        q('Listen once. Who says what?', 'The person with 150 friends is', 'S, the woman', ['J, the man', 'S, the woman']),
        q('Listen once. Who says what?', 'The two speakers', 'disagree', ['agree', 'disagree']),
      ],
      'Track_1.1.mp3',
    )

    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ type: 'rows', stage: 'Listening', title: 'Listen once. Who says what?', track: 'Track_1.1.mp3' })
    expect(out[0].items).toEqual([
      { q: 'The person with 150 friends is', options: ['J, the man', 'S, the woman'], answer: 'S, the woman' },
      { q: 'The two speakers', options: ['agree', 'disagree'], answer: 'disagree' },
    ])
  })

  // У одной записи бывает несколько разных заданий, и склеивать их под общим
  // заголовком нельзя: инструкция врёт про то, что надо сделать.
  it('смена инструкции рвёт серию', () => {
    const out = listenScreens(
      [
        q('Listen once.', 'a', '1', ['1', '2']),
        q('Listen once.', 'b', '2', ['1', '2']),
        q('Listen again. True or false?', 'c', 'True', ['True', 'False']),
        q('Listen again. True or false?', 'd', 'False', ['True', 'False']),
      ],
      'T.mp3',
    )

    expect(out.map((s) => s.title)).toEqual(['Listen once.', 'Listen again. True or false?'])
    expect(out.map((s) => s.items.length)).toEqual([2, 2])
  })

  it('одинокий вопрос остаётся обычным экраном слушания', () => {
    const out = listenScreens([q('Listen.', 'a', '1', ['1', '2'])], 'T.mp3')
    expect(out).toEqual([{ stage: 'Listening', type: 'listen', title: 'Listen.', prompt: 'a', options: ['1', '2'], answer: '1', track: 'T.mp3' }])
  })

  it('длинная серия режется по шесть, дорожка остаётся на каждом экране', () => {
    const many = Array.from({ length: 9 }, (_, i) => q('Listen.', `q${i}`, '1', ['1', '2']))
    const out = listenScreens(many, 'T.mp3')
    expect(out.map((s) => s.items.length)).toEqual([6, 3])
    out.forEach((s) => expect(s.track).toBe('T.mp3'))
  })
})

// Сущности раскрывались цепочкой replace, и список отставал от контента: в
// шагах осталось 248 неразобранных «&ldquo;» — студент читал их в вопросе.
describe('build-course-steps — html-сущности', () => {
  it('именованные и числовые сущности раскрываются', () => {
    expect(strip('&ldquo;We meet up&rdquo; &rarr; caf&eacute; &#9654;')).toBe('“We meet up” → café ▶')
  })

  it('неизвестная сущность остаётся как есть, а не пропадает', () => {
    expect(strip('a &zzz; b')).toBe('a &zzz; b')
  })
})

// У B2 три режима курса лежат в одной разметке, и сайт играет только self.
// Без фильтра в шаги уезжали задания для работы с преподавателем («Read your
// card. Do not show it to your partner»), а объяснение грамматики, которое
// написано как раз для самоучки, наоборот, терялось среди них.
describe('build-course-steps — режим self (B2)', () => {
  const { selfOnly, buildStepsNext } = require('./build-course-steps.js')

  it('чужие режимы вырезаются вместе с содержимым', () => {
    const html = '<div data-only="group solo"><p>для пары</p></div><div data-only="self"><p>для себя</p></div><p>для всех</p>'
    expect(selfOnly(html)).toBe('<div data-only="self"><p>для себя</p></div><p>для всех</p>')
  })

  it('вложенные одноимённые теги не обрывают блок раньше времени', () => {
    const html = '<div data-only="group"><div><b>чужое</b></div></div><p>своё</p>'
    expect(selfOnly(html)).toBe('<p>своё</p>')
  })

  it('урок собирается из self-части: слова, значение, видео стадии', () => {
    const lesson = {
      VOCAB: [
        ['awkward', 'adj', 'ˈɔːkwəd', 'making you feel uncomfortable', 'пример', 'колл', '😬', '/course/b2/img/l1-awkward.webp'],
        ['gesture', 'n', 'ˈdʒestʃə', 'a movement that carries meaning', 'пример', 'колл', '👋', '/course/b2/img/l1-gesture.webp'],
        ['offend', 'v', 'əˈfend', 'to upset somebody', 'пример', 'колл', '😐', '/course/b2/img/l1-offend.webp'],
      ],
      tids: ['voc-match'],
      videos: { v1: 'v1.mp4' },
      html: [
        '<section class="stage" data-stage="Vocabulary"></section>',
        '<section class="stage" data-stage="Production">',
        '<div data-only="group solo"><div class="instruction">Read your card.</div></div>',
        '<div class="instruction">Watch the report.</div>',
        '<video controls><source data-src="v1"></video>',
        '</section>',
      ].join('\n'),
    }
    const steps = buildStepsNext(lesson)

    expect(steps[0]).toMatchObject({ type: 'cards', stage: 'Vocabulary' })
    expect(steps[0].words[0]).toMatchObject({ en: 'awkward', def: 'making you feel uncomfortable', img: '/course/b2/img/l1-awkward.webp' })
    // Перевода в источнике нет, поэтому проверка — «слово ↔ определение».
    expect(steps[1]).toMatchObject({ type: 'choice', prompt: 'awkward', answer: 'making you feel uncomfortable' })
    const watch = steps.find((s) => s.type === 'watch')
    expect(watch).toMatchObject({ video: 'v1.mp4', title: 'Watch the report.' })
    expect(JSON.stringify(steps)).not.toContain('Read your card')
  })
})

// Большой тест уровня приходит банком вопросов: оригинал набирает сорок штук
// случайно на каждую попытку, у нас шаги статичные.
describe('build-course-steps — тест из банка (B2)', () => {
  const { buildExamSteps } = require('./build-course-steps.js')
  const bank = []
  for (let l = 1; l <= 4; l++) {
    for (const c of ['v', 'g', 'f']) bank.push({ l, c, q: `${c}${l}?`, a: `верно ${c}${l}`, d: ['мимо 1', 'мимо 2', 'мимо 3'] })
  }

  it('вопросы идут по кругу областей и не превышают лимит', () => {
    const built = buildExamSteps({ id: 't1', title: 'Test', items: 6, pass: 4, bank }, 6)
    expect(built.steps).toHaveLength(6)
    expect(built.steps.map((s) => s.title)).toEqual(['Vocabulary', 'Grammar', 'Function', 'Vocabulary', 'Grammar', 'Function'])
    expect(built.passRatio).toBe(0.67)
  })

  it('верный ответ не всегда стоит первым, но всегда есть среди вариантов', () => {
    const built = buildExamSteps({ id: 't1', title: 'Test', items: 6, pass: 4, bank }, 6)
    built.steps.forEach((s) => expect(s.options).toContain(s.answer))
    expect(new Set(built.steps.map((s) => s.options.indexOf(s.answer))).size).toBeGreaterThan(1)
  })
})

// Озвучка слов генерируется отдельным прогоном (scripts/make-lesson-audio.js),
// а имя файла — хэш самого слова. Если стороны разойдутся в нормализации
// текста, карточка молча уедет на браузерный синтез, и заметить это можно
// только на слух.
describe('build-course-steps — запись слова', () => {
  const { wordAudio } = require('./build-course-steps.js')

  it('слово с готовой записью получает путь к ней', () => {
    expect(wordAudio('b2', 'awkward')).toBe('/learning/audio/b2/f7d4c2e58cb8.mp3')
  })

  it('слова без записи остаются без поля — их читает синтез браузера', () => {
    expect(wordAudio('b2', 'слова-с-такой-записью-нет')).toBeNull()
    expect(wordAudio(null, 'awkward')).toBeNull()
  })
})
