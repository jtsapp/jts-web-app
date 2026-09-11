import { describe, it, expect } from 'vitest'
import { findCardById, lessonCardIds } from './lessonCardId.js'

/**
 * Адрес карточки урока — вторая копия, и главное здесь не логика, а СОГЛАСИЕ.
 *
 * Админка кладёт адрес в выдачу, кабинет по нему ищет карточку. Разъедутся —
 * задание перестанет находиться, и молча: ученик увидит «этого задания больше
 * нет» на существующей карточке. Поэтому обе стороны прогоняют ОДНУ фикстуру с
 * одними и теми же ожидаемыми значениями. Тот же файл и те же строки лежат в
 * web-admin, card-id.spec.ts, блок «Согласие копий».
 *
 * Меняешь подпись карточки — правь ОБЕ копии и обнови ожидаемые значения в
 * обоих тестах. Красный тест здесь и значит, что копии разошлись.
 */
export const FIXTURE = {
  unit: 'U1',
  title: 'The best time to visit my country',
  level: 'A2',
  topics: [],
  steps: [
    {
      id: 's1',
      order: 1,
      title: 'Four seasons, one favourite',
      blocks: [
        { type: 'info', html: '<p>Hold on to your two answers.</p><ul><li>Ask your teacher</li></ul>' },
        {
          type: 'practice',
          title: 'Warm-up',
          questions: [{ id: 's1-c0', type: 'pick', prompt: 'I look forward to…', options: ['spring', 'summer'] }],
        },
        { type: 'vocab', cards: [{ word: 'season', translationRu: 'время года' }] },
        // Незнакомый обеим сторонам тип: ⋮ стоит и на нём, значит и адрес у него
        // должен получаться одинаковый. `id` и `audio` в подпись не входят —
        // кабинет абсолютизирует путь к аудио при загрузке урока, админка нет.
        { type: 'theory', id: 's1-t0', title: 'Правило', text: 'Present Simple: привычки.',
          audio: { src: 'audio/rule.mp3' } },
        // ДВА вопроса — единственное, чем проверяется разделитель между ними
        // (\x1d). С одним вопросом его в подписи просто нет, и разъедься копии
        // по нему — обе остались бы зелёными.
        {
          type: 'practice',
          title: 'Слова и пропуски',
          questions: [
            { id: 's1-c1', type: 'match', prompt: 'Сопоставь',
              pairs: [{ left: 'spring', right: 'весна' }, { left: 'autumn', right: 'осень' }] },
            { id: 's1-c2', type: 'gap', prompt: 'Допиши',
              gapBefore: 'It ', gapAfter: ' cold in winter.', words: ['is', 'are'] },
          ],
        },
        { type: 'writing', title: 'Напиши абзац', html: '<p>Describe your favourite season.</p>',
          placeholder: 'Not less than 60 words' },
        { type: 'grammar_concept', title: 'Present Simple', leadText: 'Правило коротко',
          html: '<p>He <b>works</b>.</p>' },
      ],
    },
    {
      id: 's2',
      order: 2,
      title: 'You can now…',
      blocks: [
        { type: 'checklist', items: ['I can name the seasons'] },
        { type: 'speaking', taskDescription: 'Tell your teacher about your favourite season', hasRecorder: true },
      ],
    },
  ],
}

/** Ожидаемые адреса фикстуры. ТЕ ЖЕ значения обязаны получаться в админке. */
export const EXPECTED = [
  'ce37fee00', // s1 / info
  'c8aa84c76', // s1 / practice — один вопрос
  'cc9a9577a', // s1 / vocab
  'cad401560', // s1 / theory — незнакомый тип
  'cf48bd802', // s1 / practice — ДВА вопроса, pairs и gap
  'c7d964c1f', // s1 / writing
  'c44d863d1', // s1 / grammar_concept
  'c2e34941a', // s2 / checklist
  'cb1602305', // s2 / speaking
]

function адреса(lesson) {
  const ids = lessonCardIds(lesson)
  return (lesson.steps ?? []).flatMap((s) => (s.blocks ?? []).map((b) => ids.get(b)))
}

describe('Согласие копий: адрес карточки', () => {
  it('фикстура даёт ровно те адреса, что и в админке', () => {
    expect(адреса(FIXTURE)).toEqual(EXPECTED)
  })
})

describe('Адрес карточки', () => {
  it('перестановка шагов адреса не меняет', () => {
    const наоборот = { ...FIXTURE, steps: [FIXTURE.steps[1], FIXTURE.steps[0]] }
    expect(адреса(наоборот).sort()).toEqual([...EXPECTED].sort())
  })

  it('правка текста карточки адрес меняет', () => {
    const правленый = {
      ...FIXTURE,
      steps: [{ ...FIXTURE.steps[0], blocks: [{ type: 'info', html: '<p>Другой текст</p>' }] }],
    }
    expect(адреса(правленый)[0]).not.toBe(EXPECTED[0])
  })

  it('разметка не влияет, а текст влияет', () => {
    const один = { steps: [{ id: 's', blocks: [{ type: 'info', html: 'Hello world' }] }] }
    const другой = { steps: [{ id: 's', blocks: [{ type: 'info', html: '<p><b>Hello</b>&nbsp;world</p>' }] }] }
    expect(адреса(один)).toEqual(адреса(другой))
  })

  it('перекодированная картинка адрес не меняет', () => {
    const было = { steps: [{ id: 's', blocks: [{ type: 'info', html: '<p>A <img src="data:image/webp;base64,AAAA"> B</p>' }] }] }
    const стало = { steps: [{ id: 's', blocks: [{ type: 'info', html: '<p>A <img src="data:image/webp;base64,ZZZZZZ"> B</p>' }] }] }
    expect(адреса(было)).toEqual(адреса(стало))
  })

  it('две одинаковые карточки получают разные адреса', () => {
    const l = { steps: [{ id: 's', blocks: [{ type: 'info', html: '<p>Listen</p>' }, { type: 'info', html: '<p>Listen</p>' }] }] }
    const [первый, второй] = адреса(l)
    expect(первый).not.toBe(второй)
  })

  /**
   * У незнакомого типа подпись считается по всему содержимому — и служебное
   * обязано из неё выпасть. Путь к аудио относительный, и абсолютизирует его
   * ТОЛЬКО кабинет (rewriteMediaUrls при загрузке урока); собственный id блока
   * порядковый. Войди они в подпись — две копии считали бы разные адреса на
   * одном блоке, и задание перестало бы находиться, молча.
   */
  it('у незнакомого типа служебное в адрес не входит', () => {
    const было = { steps: [{ id: 's', blocks: [
      { type: 'theory', id: 's1-t0', title: 'Правило', text: 'Текст', audio: { src: 'audio/rule.mp3' } },
    ] }] }
    const стало = { steps: [{ id: 's', blocks: [
      { type: 'theory', id: 's1-t9', title: 'Правило', text: 'Текст', audio: { src: 'https://files/a2/L01/audio/rule.mp3' } },
    ] }] }
    expect(адреса(было)).toEqual(адреса(стало))
  })

  it('а содержимое незнакомого типа — входит', () => {
    const было = { steps: [{ id: 's', blocks: [{ type: 'theory', text: 'Правило A' }] }] }
    const стало = { steps: [{ id: 's', blocks: [{ type: 'theory', text: 'Правило B' }] }] }
    expect(адреса(было)[0]).not.toBe(адреса(стало)[0])
  })

  it('пустой урок адресов не даёт и не падает', () => {
    expect(адреса({ steps: [] })).toEqual([])
    expect(адреса({})).toEqual([])
  })
})

describe('Поиск карточки по адресу', () => {
  it('находит карточку и её место на момент открытия', () => {
    const найдено = findCardById(FIXTURE, EXPECTED[8])
    expect(найдено?.stepId).toBe('s2')
    expect(найдено?.blockIndex).toBe(1)
    expect(найдено?.block.type).toBe('speaking')
  })

  /**
   * Карточку переписали или удалили — честно отвечаем «нет». Показать ближайшую
   * значило бы открыть ученику не то, что задали; так же поступает и адрес
   * юнита «Практики».
   */
  it('пропавшая карточка не подменяется соседней', () => {
    expect(findCardById(FIXTURE, 'cdeadbeef')).toBeNull()
    expect(findCardById(FIXTURE, null)).toBeNull()
    expect(findCardById(null, EXPECTED[0])).toBeNull()
  })
})
