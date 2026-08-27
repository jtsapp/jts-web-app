import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  parseLibraryData,
  stripMarkup,
  blocksToPlainText,
  chapterVocab,
  toAudioLessonRequest,
  decodeCover,
  externalId,
} = require('./import-practice-library.js')

describe('parseLibraryData', () => {
  it('вырезает сбалансированный JSON, не спотыкаясь о скобки внутри строк', () => {
    const html = `<script>window.__JTS_DATA__={"books":[{"id":"a","title":"Brace } inside"}]};</script>`
    expect(parseLibraryData(html).books[0].title).toBe('Brace } inside')
  })

  it('на чужом html падает понятной ошибкой, а не тихо', () => {
    expect(() => parseLibraryData('<html>ничего</html>')).toThrow(/не найден/)
  })
})

describe('stripMarkup', () => {
  it('снимает разметку слов, оставляя само слово', () => {
    expect(stripMarkup('the place was <span class="w" data-w="haunt">haunted</span>.')).toBe(
      'the place was haunted.',
    )
  })

  it('разворачивает html-сущности', () => {
    expect(stripMarkup('Bell &amp; Sons said &quot;no&quot;')).toBe('Bell & Sons said "no"')
  })
})

describe('blocksToPlainText', () => {
  // Читалка режет текст с переводами строк по ним (toParas), поэтому склейка
  // через \n — единственное, что сохраняет авторские абзацы.
  it('склеивает блоки в абзацы через перевод строки', () => {
    const text = blocksToPlainText([
      { k: 'h', t: 'Chapter One' },
      { k: 'p', t: 'It was <span class="w" data-w="cold">cold</span>.' },
      { k: 'q', t: '"Hello," he said.' },
    ])
    expect(text).toBe('Chapter One\nIt was cold.\n"Hello," he said.')
  })

  it('пустые блоки не оставляют висячих строк', () => {
    expect(blocksToPlainText([{ k: 'p', t: '' }, { k: 'p', t: 'Текст' }, { k: 'p', t: '<span></span>' }])).toBe(
      'Текст',
    )
  })

  it('без блоков даёт пустую строку, а не падает', () => {
    expect(blocksToPlainText(null)).toBe('')
  })
})

describe('chapterVocab', () => {
  it('оставляет только слова и убирает повторы', () => {
    expect(chapterVocab([{ w: 'haunt', ru: 'обитать' }, { w: 'haunt' }, { w: ' ghost ' }])).toEqual([
      'haunt',
      'ghost',
    ])
  })
})

describe('toAudioLessonRequest', () => {
  const book = {
    id: 'canterville',
    title: 'The Canterville Ghost',
    author: 'Oscar Wilde · 1887',
    level: 'B1',
    category: 'Classics & Ghost Stories',
    blurb: 'An American family buys an English house.',
    chapters: [
      { n: 1, title: 'The Otis Family', blocks: [{ k: 'p', t: 'Text one.' }], vocab: [{ w: 'haunt' }] },
      { n: 2, title: '', blocks: [{ k: 'p', t: 'Text two.' }], vocab: [] },
    ],
  }

  it('переносит карточку книги и главы в тело запроса каталога', () => {
    const req = toAudioLessonRequest(book, '/media/cover.webp')
    expect(req).toMatchObject({
      title: 'The Canterville Ghost',
      kind: 'BOOK',
      author: 'Oscar Wilde · 1887',
      level: 'B1',
      topic: 'Classics & Ghost Stories',
      coverImageUrl: '/media/cover.webp',
      isActive: true,
    })
    expect(req.tracks).toEqual([
      { trackIndex: 1, title: 'The Otis Family', text: 'Text one.', vocab: ['haunt'], orderIndex: 0 },
      { trackIndex: 2, title: 'Глава 2', text: 'Text two.', vocab: [], orderIndex: 1 },
    ])
  })

  // Уровень уходит в enum LanguageLevel: неизвестное значение уронило бы весь
  // импорт четырёхсоткой, поэтому оно превращается в null.
  it('незнакомый уровень отправляется как null', () => {
    expect(toAudioLessonRequest({ ...book, level: 'Upper-Int' }).level).toBeNull()
    expect(toAudioLessonRequest({ ...book, level: 'b2' }).level).toBe('B2')
  })

  it('без обложки поле остаётся пустым, а не строкой "undefined"', () => {
    expect(toAudioLessonRequest(book).coverImageUrl).toBeNull()
  })
})

describe('externalId', () => {
  // Второй прогон импорта должен обновить те же книги, а не наплодить дубли:
  // бэкенд ищет запись по skyengId, поэтому ключ обязан быть стабильным.
  it('для одного id даёт один и тот же ключ', () => {
    expect(externalId('canterville')).toBe(externalId('canterville'))
  })

  it('разные книги не сталкиваются', () => {
    const ids = ['canterville', 'forrest', 'cheese', 'gatsby', 'orient', 'sherlock']
    expect(new Set(ids.map(externalId)).size).toBe(ids.length)
  })

  it('ключ положительный — колонка хранит id, а не знаковый мусор', () => {
    for (const id of ['fivefeet', 'women', 'physics']) expect(externalId(id)).toBeGreaterThan(0)
  })
})

describe('decodeCover', () => {
  it('раскодирует data-url в файл с правильным расширением', () => {
    const cover = decodeCover('data:image/webp;base64,' + Buffer.from('bin').toString('base64'), 'oz')
    expect(cover.filename).toBe('oz.webp')
    expect(cover.buffer.toString()).toBe('bin')
  })

  it('jpeg сохраняется как .jpg', () => {
    expect(decodeCover('data:image/jpeg;base64,AAA=', 'alice').filename).toBe('alice.jpg')
  })

  it('обычная ссылка обложкой не считается', () => {
    expect(decodeCover('https://cdn/x.jpg', 'x')).toBeNull()
    expect(decodeCover('', 'x')).toBeNull()
  })
})
