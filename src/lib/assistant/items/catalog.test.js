import { describe, it, expect } from 'vitest'
import { buildItemCatalog, resolveItem } from './catalog.js'

// Курс B1 на три урока и тест юнита; прогресс бэкенда — пройден L1.
const FILES = {
  'course/b1/index.json': {
    level: 'B1',
    units: [],
    lessons: [
      { n: 1, unit: 1, no: 1, title: 'How many friends', blurb: 'Говорить о дружбе' },
      { n: 2, unit: 1, no: 2, title: 'Why we spend', blurb: 'Говорить о тратах' },
      { n: 3, unit: 1, no: 3, title: 'In my opinion', blurb: 'Высказывать мнение' },
    ],
    tests: [{ unit: 1, title: 'Unit 1 test', items: 10, pass: 7 }],
  },
  'practice/grammar/index.json': {
    levels: [{ code: 'b1', label: 'B1' }],
    b1: { units: [{ id: 7, title: 'Present perfect 1 (I <em>have</em> done)', secName: 'Present perfect and past' }] },
  },
  'practice/situations/a2.json': { items: [{ id: 1, title: { ru: 'Вы опоздали на поезд', en: 'You Missed Your Train' } }] },
  'practice/words/meta.json': { sections: [{ id: 'animals', name: 'Animals', scenes: [{ id: 'farm', name: 'Farm' }] }] },
  'practice/reading/b1.json': { texts: [{ id: 'b1-sci-tickle', title: "Why You Can't Tickle Yourself", genre: 'science' }] },
}

function fakeDeps({ backend = {}, files = FILES } = {}) {
  const asked = []
  return {
    asked,
    readJson: async (rel) => {
      if (!(rel in files)) throw new Error('ENOENT ' + rel)
      return files[rel]
    },
    listDirs: async () => ['a1', 'b1', 'shared'],
    getJson: async (p, token) => {
      asked.push({ p, token })
      return p in backend ? backend[p] : null
    },
  }
}

const COURSE_BACKEND = {
  '/mobile/lesson-modules': [{ id: 9, level: 'B1', orderIndex: 0, locked: false }],
  '/mobile/content-quota?contentType=LESSON_MODULE&contentId=9': { limit: null },
  '/mobile/lesson-modules/9/progress': { done: ['L1'] },
}

describe('каталог для Луны', () => {
  it('курс: адреса, названия, цель урока и статусы по прогрессу бэкенда', async () => {
    const deps = fakeDeps({ backend: COURSE_BACKEND })
    const { text, items } = await buildItemCatalog({ kinds: ['course'], level: 'B1', token: 't', deps })
    expect(text).toContain('Уроки курса B1:')
    expect(text).toContain('- course.B1.L1 — урок 1 «How many friends» (юнит 1): Говорить о дружбе · пройден')
    expect(text).toContain('- course.B1.L2 — урок 2 «Why we spend» (юнит 1): Говорить о тратах · следующий')
    expect(text).toContain('- course.B1.L3 — урок 3 «In my opinion» (юнит 1): Высказывать мнение · закрыт')
    expect(text).toContain('- course.B1.T1 — тест юнита 1 · закрыт')
    expect(items.get('course.B1.L3').locked).toBe(true)
    expect(items.get('course.B1.L2').locked).toBe(false)
    expect(deps.asked.every((a) => a.token === 't')).toBe(true)
  })

  it('бэкенд не ответил — статусов нет (тропа проверит сама), «закрыт» не выдумываем', async () => {
    const { text, items } = await buildItemCatalog({ kinds: ['course'], level: 'b1', token: 't', deps: fakeDeps() })
    expect(text).toContain('- course.B1.L3 — урок 3 «In my opinion» (юнит 1): Высказывать мнение\n')
    expect(text).not.toMatch(/закрыт|следующий|пройден/)
    expect(items.get('course.B1.L3').locked).toBe(false)
  })

  it('модуль уровня закрыт админом — закрыто всё', async () => {
    const backend = { ...COURSE_BACKEND, '/mobile/lesson-modules': [{ id: 9, level: 'B1', locked: true }] }
    const { items } = await buildItemCatalog({ kinds: ['course'], level: 'B1', token: 't', deps: fakeDeps({ backend }) })
    expect(items.get('course.B1.L2').locked).toBe(true)
  })

  it('грамматика, ситуации, слова, чтение (диск, когда бэкенд пуст), воркбуки', async () => {
    const { text, items } = await buildItemCatalog({
      kinds: ['grammar', 'situation', 'words', 'reading', 'workbook'],
      level: 'B1',
      deps: fakeDeps(),
    })
    expect(text).toContain('- grammar.b1.7 — «Present perfect 1 (I have done)» (Present perfect and past, B1)')
    expect(text).toContain('- words.farm — «Farm» (Animals)')
    expect(text).toContain("- reading.b1-sci-tickle — «Why You Can't Tickle Yourself» (science)")
    expect(text).toContain('- workbook.a1 — воркбук A1')
    expect(text).not.toContain('workbook.shared')
    // Ситуаций B1 в данных нет — вида в каталоге нет, остальное на месте.
    expect(text).not.toContain('Ситуации')
    expect(items.has('grammar.b1.7')).toBe(true)
  })

  it('домашка — только не сданная; живые уроки — ближайшие', async () => {
    const now = Date.parse('2026-10-29T08:00:00Z')
    const backend = {
      '/admin/homework/my': [
        { id: 5, title: 'Unit 4', status: 'ASSIGNED', dueDate: '2026-10-30T18:00:00Z' },
        { id: 6, title: 'Unit 3', status: 'CHECKED' },
      ],
      '/admin/lessons/occurrences': [
        { lessonId: 45, scheduledAt: '2026-10-30T10:00:00Z', teacherName: 'Алия' },
        { lessonId: 44, scheduledAt: '2026-10-20T10:00:00Z' },
      ],
    }
    const { text } = await buildItemCatalog({ kinds: ['homework', 'live'], level: null, token: 't', deps: fakeDeps({ backend }), now })
    expect(text).toContain('- homework.5 — «Unit 4» (до ')
    expect(text).not.toContain('homework.6')
    expect(text).toMatch(/- live\.45 — урок .* с Алия/)
    expect(text).not.toContain('live.44')
  })

  it('книжки: все уровни, автор, уровень и озвучка; ученический токен; скрытая — нет', async () => {
    const backend = {
      '/mobile/audio-lessons': [
        { id: 7, title: 'Peter Pan', author: 'J. M. Barrie', level: 'A2', tracks: [{ audioUrl: 'x.mp3' }] },
        { id: 8, title: 'Rich Dad Poor Dad', author: 'Robert T. Kiyosaki', level: 'B1', tracks: [] },
        { id: 9, title: 'Draft', level: 'A1', isActive: false },
      ],
    }
    const deps = fakeDeps({ backend })
    const { text, items } = await buildItemCatalog({ kinds: ['book'], level: 'A1', token: 't', deps })
    expect(text).toContain('[[OPEN_NOW books]]')
    expect(text).toContain('- book.7 — «Peter Pan» (J. M. Barrie, A2, есть аудио)')
    expect(text).toContain('- book.8 — «Rich Dad Poor Dad» (Robert T. Kiyosaki, B1)')
    expect(text).not.toContain('book.9')
    expect(items.get('book.7').label).toBe('книга “Peter Pan”')
    expect(deps.asked).toEqual([{ p: '/mobile/audio-lessons', token: 't' }])
    expect((await resolveItem('book.8', { token: 't', lang: 'kk', deps })).label).toBe('кітап “Rich Dad Poor Dad”')
  })

  it('комиксы, караоке, сказки, скорочтение, Just to Listen, предлоги, произношение, мультфильмы, аркада', async () => {
    const backend = {
      '/mobile/comics': [{ id: 3, slug: 'maus', title: 'Maus', author: 'Art Spiegelman' }, { id: 4, title: 'Adult', adultOnly: true }],
      '/mobile/karaoke': [{ id: 1, slug: 'believer', title: 'Believer', artist: 'Imagine Dragons', level: 'b1', audioUrl: 'x.mp3' }, { id: 2, title: 'Без фонограммы' }],
      '/mobile/speed-reading/texts': [{ id: 42, level: 'B1', title: { ru: 'Кофе', en: 'Coffee' } }],
      '/mobile/listen': { levels: [{ id: 'A1', name: 'A1' }], fields: [{ id: 'medicine', name: { ru: 'Медицина', en: 'Medicine' } }] },
      '/mobile/prepositions': { course: { cats: [{ id: 'place', title: { ru: 'Место' }, lessons: [{ id: 'in-on-at', title: { en: 'in / on / at', ru: 'в / на' } }] }] } },
      '/mobile/pronunciation': { levels: [{ id: 'A1', modules: [{ id: 'A1.3', title: 'The TH sound' }] }, { id: 'B1', modules: [{ id: 'B1.1', title: 'Stress' }] }] },
      '/mobile/cartoons': {
        library: { entries: [{ id: 'peppa-swimming', level: 'A1', series: 'Peppa Pig', title: 'Swimming' }, { id: 'gone-1', level: 'A1', series: 'X', title: 'Y' }] },
        catalog: { rows: [['A2', 'AbC123', 'Bluey', 'Keepy Uppy']] },
        unavailable: [{ id: 'gone-1' }],
      },
    }
    const kinds = ['comic', 'karaoke', 'tale', 'speedread', 'listen', 'prep', 'pron', 'cartoon', 'arcade']
    const { text, items } = await buildItemCatalog({ kinds, level: 'A1', token: 't', deps: fakeDeps({ backend }) })
    expect(text).toContain('- comic.maus — «Maus» (Art Spiegelman)')
    expect(text).not.toContain('Adult')
    expect(text).toContain('- karaoke.believer — «Believer» (Imagine Dragons, B1)')
    expect(text).not.toContain('Без фонограммы')
    expect(text).toContain('- tale.snow_queen — «The Snow Queen»')
    expect(text).toContain('- speedread.42 — «Кофе» (B1)')
    expect(text).toContain('- listen.medicine — «Медицина» (профессия)')
    expect(text).toContain('- prep.in-on-at — «in / on / at / в / на» (Место)')
    // Произношение — темы уровня ученика.
    expect(text).toContain('- pron.A1.3 — «The TH sound» (A1)')
    expect(text).not.toContain('pron.B1.1')
    expect(text).toContain('- cartoon.peppa-swimming — «Peppa Pig — Swimming» (A1)')
    expect(text).toContain('- cartoon.cat-AbC123 — «Bluey — Keepy Uppy» (A2)')
    expect(text).not.toContain('gone-1')
    expect(text).toContain('- arcade.runner — «Word Rush»')
    expect(items.get('karaoke.believer').label).toBe('караоке “Believer”')
  })

  it('письмо по шагам и уроки воркбука уровня', async () => {
    const files = {
      ...FILES,
      'practice/writing/b1.json': { seeds: [{ id: 'b1-complaint', title: 'A letter of complaint', sub: 'How to demand a solution politely' }] },
      'practice/workbook/b1/index.json': { lessons: { 5: { title: 'Why we spend', unit: 2 } } },
    }
    const { text, items } = await buildItemCatalog({ kinds: ['writing', 'workbook'], level: 'B1', deps: fakeDeps({ files }) })
    expect(text).toContain('- writing.b1.b1-complaint — «A letter of complaint»: How to demand a solution politely')
    expect(text).toContain('- workbook.b1 — воркбук B1')
    expect(text).toContain('- workbook.b1.5 — урок 5 «Why we spend» воркбука B1 (юнит 2)')
    expect(items.has('workbook.a1')).toBe(true)
    expect((await resolveItem('workbook.b1.5', { deps: fakeDeps({ files }) })).label).toBe('урок 5 “Why we spend”')
  })

  it('ничего не собралось — текста нет', async () => {
    const { text, items } = await buildItemCatalog({ kinds: ['ggame', 'homework'], level: 'B1', token: 't', deps: fakeDeps() })
    expect(text).toBe(null)
    expect(items.size).toBe(0)
  })

  it('resolveItem: вещь по адресу из её вида; мусор и неизвестное — null', async () => {
    const deps = fakeDeps({ backend: COURSE_BACKEND })
    expect((await resolveItem('course.B1.L2', { token: 't', deps })).title).toBe('урок 2 «Why we spend» (юнит 1): Говорить о тратах')
    expect((await resolveItem('course.B1.L3', { token: 't', deps })).locked).toBe(true)
    expect(await resolveItem('course.B1.L99', { token: 't', deps })).toBe(null)
    expect(await resolveItem('practice', { deps })).toBe(null)
    expect((await resolveItem('situation.a2.1', { deps: fakeDeps() })).title).toBe('«Вы опоздали на поезд»')
  })
})

describe('подпись кнопки «Открыть: …»', () => {
  it('на языке интерфейса, с номером и коротким названием', async () => {
    const deps = fakeDeps({ backend: COURSE_BACKEND })
    const ru = await buildItemCatalog({ kinds: ['course', 'situation'], level: 'B1', token: 't', deps })
    expect(ru.items.get('course.B1.L2').label).toBe('урок 2 “Why we spend”')
    expect(ru.items.get('course.B1.T1').label).toBe('тест “Unit 1”')
    const kk = await buildItemCatalog({ kinds: ['course'], level: 'B1', token: 't', lang: 'kk', deps })
    expect(kk.items.get('course.B1.L2').label).toBe('сабақ 2 “Why we spend”')
    const sit = await resolveItem('situation.a2.1', { lang: 'en', deps: fakeDeps() })
    expect(sit.label).toBe('situation “You Missed Your Train”')
  })
})
