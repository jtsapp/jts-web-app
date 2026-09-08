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
  selectBooks,
  parseArgs,
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

describe('selectBooks', () => {
  const BOOKS = [{ id: 'canterville' }, { id: 'gatsby' }, { id: 'sherlock' }]

  it('без --skip заливается всё', () => {
    expect(selectBooks(BOOKS, []).kept.map((b) => b.id)).toEqual(['canterville', 'gatsby', 'sherlock'])
  })

  // Gatsby выкидывают не «на всякий случай»: его название совпадает со статикой
  // data/books, а читалка предпочитает статику — залитый текст всё равно не
  // показался бы, зато в каталоге появился бы дубль.
  it('пропускает книгу по id и говорит, какую именно', () => {
    const { kept, skipped } = selectBooks(BOOKS, ['gatsby'])
    expect(kept.map((b) => b.id)).toEqual(['canterville', 'sherlock'])
    expect(skipped).toEqual(['gatsby'])
  })

  it('регистр и пробелы в id не мешают', () => {
    expect(selectBooks(BOOKS, [' Gatsby ']).skipped).toEqual(['gatsby'])
  })

  it('опечатка в id ничего не выкидывает и попадает в missed', () => {
    const { kept, skipped, missed } = selectBooks(BOOKS, ['gatsbi'])
    expect(kept).toHaveLength(3)
    expect(skipped).toEqual([])
    expect(missed).toEqual(['gatsbi'])
  })

  it('совпавшие id в missed не попадают', () => {
    expect(selectBooks(BOOKS, ['gatsby']).missed).toEqual([])
  })

  it('часть id с опечаткой видна отдельно от сработавших', () => {
    const { skipped, missed } = selectBooks(BOOKS, ['gatsby', 'sherlok'])
    expect(skipped).toEqual(['gatsby'])
    expect(missed).toEqual(['sherlok'])
  })

  it('несколько id разом', () => {
    expect(selectBooks(BOOKS, ['gatsby', 'sherlock']).kept.map((b) => b.id)).toEqual(['canterville'])
  })
})

describe('parseArgs', () => {
  it('берёт путь к файлу и флаги в любом порядке', () => {
    expect(parseArgs(['lib.html', '--dry-run'])).toEqual({
      src: 'lib.html', api: null, dryRun: true, skipIds: [],
    })
    expect(parseArgs(['--dry-run', 'lib.html'])).toMatchObject({ src: 'lib.html', dryRun: true })
  })

  // Ради этого разбор и вынесен: значение флага — такой же позиционный
  // аргумент, и `--skip gatsby lib.html` не должен принять `gatsby` за путь.
  it('значение --skip не становится путём к файлу', () => {
    expect(parseArgs(['--skip', 'gatsby', 'lib.html'])).toMatchObject({
      src: 'lib.html', skipIds: ['gatsby'],
    })
  })

  it('значение --api не становится путём к файлу', () => {
    expect(parseArgs(['--api', 'https://prod', 'lib.html'])).toMatchObject({
      src: 'lib.html', api: 'https://prod',
    })
  })

  it('оба флага со значениями плюс путь между ними', () => {
    expect(parseArgs(['--api', 'https://prod', 'lib.html', '--skip', 'gatsby,forrest'])).toEqual({
      src: 'lib.html', api: 'https://prod', dryRun: false, skipIds: ['gatsby', 'forrest'],
    })
  })

  it('пробелы вокруг id в списке не мешают', () => {
    expect(parseArgs(['lib.html', '--skip', ' gatsby , forrest ']).skipIds).toEqual(['gatsby', 'forrest'])
  })

  // Флаг без значения раньше молчал: --api давал адрес «undefined», --skip
  // просто не фильтровал, и книга уезжала на контур.
  it('флаг без значения — ошибка, а не тихий дефолт', () => {
    expect(() => parseArgs(['lib.html', '--skip'])).toThrow(/--skip требует значение/)
    expect(() => parseArgs(['lib.html', '--api'])).toThrow(/--api требует значение/)
    expect(() => parseArgs(['lib.html', '--skip', '--dry-run'])).toThrow(/--skip требует значение/)
  })

  it('без пути к файлу — понятная ошибка', () => {
    expect(() => parseArgs(['--dry-run'])).toThrow(/укажите путь/)
  })
})
