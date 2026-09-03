// Превью книги: что именно уезжает клиенту демо-аккаунта.
//
// Проверяется числами, потому что цена ошибки несимметрична: лишняя открытая
// глава — это розданный платный текст, и увидеть её на экране нельзя, книга
// выглядит одинаково.
import { describe, it, expect } from 'vitest'
import {
  applyPreview,
  isValidBookId,
  chapterLimitOf,
  FALLBACK_PREVIEW_CHAPTERS,
  BOOKS_CONTENT_TYPE,
} from './books.js'

const book = {
  book: { title: 'Alice' },
  dict: { rabbit: 'кролик' },
  chapters: [
    { num: '1', title: 'Down the Rabbit-Hole', text: 'Alice was beginning…' },
    { num: '2', title: 'The Pool of Tears', text: 'Curiouser and curiouser!' },
    { num: '3', title: 'A Caucus-Race', text: 'They were indeed a queer-looking party.' },
    { num: '4', title: 'The Rabbit Sends', text: 'It was the White Rabbit.' },
  ],
}

describe('превью книги', () => {
  it('оставляет текст только у первых N глав', () => {
    const out = applyPreview(book, 2)

    expect(out.chapters[0].text).toBe('Alice was beginning…')
    expect(out.chapters[1].text).toBe('Curiouser and curiouser!')
    expect(out.chapters[2].text).toBe('')
    expect(out.chapters[3].text).toBe('')
  })

  it('помечает закрытые главы', () => {
    const out = applyPreview(book, 2)

    expect(out.chapters.map((c) => c.locked)).toEqual([false, false, true, true])
  })

  it('оглавление остаётся целиком — ученик видит, что книга больше', () => {
    const out = applyPreview(book, 2)

    expect(out.chapters).toHaveLength(4)
    expect(out.chapters.map((c) => c.title)).toEqual(book.chapters.map((c) => c.title))
    expect(out.preview).toEqual({ limit: 2, total: 4 })
  })

  it('не трогает исходный объект — он кэшируется на модуле', () => {
    applyPreview(book, 2)

    expect(book.chapters[3].text).toBe('It was the White Rabbit.')
    expect(book.chapters[3].locked).toBeUndefined()
  })

  it('лимита нет — книга отдаётся как есть', () => {
    expect(applyPreview(book, null)).toBe(book)
  })

  it('нулевой лимит закрывает всю книгу', () => {
    expect(applyPreview(book, 0).chapters.every((c) => c.locked && c.text === '')).toBe(true)
  })

  it('лимит больше числа глав ничего не ломает', () => {
    expect(applyPreview(book, 99).chapters.every((c) => !c.locked)).toBe(true)
  })

  it('фолбэк — превью, а не полная книга', () => {
    expect(FALLBACK_PREVIEW_CHAPTERS).toBe(2)
  })
})

/**
 * Кому сколько глав. Это решение о выдаче платного контента, и цена ошибки
 * несимметрична: лишняя открытая глава — розданный текст, лишняя закрытая —
 * жалоба оплатившего ученика.
 */
describe('сколько глав открыто запросу', () => {
  it('обычный ученик читает книгу целиком', () => {
    expect(chapterLimitOf({ authenticated: true, isDemoAccount: false, quota: null })).toBeNull()
  })

  it('демо-аккаунт — по квоте с бэкенда', () => {
    expect(chapterLimitOf({ authenticated: true, isDemoAccount: true, quota: 2 })).toBe(2)
    expect(chapterLimitOf({ authenticated: true, isDemoAccount: true, quota: 5 })).toBe(5)
  })

  // Квоту может настроить и тариф обычного ученика — тогда она сильнее.
  it('настроенная квота действует и для не-демо', () => {
    expect(chapterLimitOf({ authenticated: true, isDemoAccount: false, quota: 3 })).toBe(3)
  })

  it('нулевая квота закрывает книгу целиком, а не открывает её', () => {
    expect(chapterLimitOf({ authenticated: true, isDemoAccount: true, quota: 0 })).toBe(0)
  })

  // Сбой запроса квоты не должен раздавать платный текст: у практики fail-open
  // осознанный, здесь — наоборот.
  it('демо при недоступной квоте получает превью, а не полный доступ', () => {
    expect(chapterLimitOf({ authenticated: true, isDemoAccount: true, quota: null }))
      .toBe(FALLBACK_PREVIEW_CHAPTERS)
  })

  it('аноним и неопознанный токен — превью', () => {
    expect(chapterLimitOf({ authenticated: false, isDemoAccount: false, quota: null }))
      .toBe(FALLBACK_PREVIEW_CHAPTERS)
    expect(chapterLimitOf({ authenticated: false, isDemoAccount: false, quota: 99 }))
      .toBe(FALLBACK_PREVIEW_CHAPTERS)
  })

  // Регрессия: роут книг однажды передал сюда весь ответ бэкенда о квоте вместо
  // числа глав. Прежняя проверка `quota != null` возвращала объект, applyPreview
  // сравнивал `i < {объект}` — ложь для любой главы, — и книга приходила целиком
  // запертой КАЖДОМУ залогиненному, включая платящего.
  it('нечисловая квота не запирает книгу: платящий читает целиком', () => {
    expect(chapterLimitOf({
      authenticated: true,
      isDemoAccount: false,
      quota: { limit: 2, source: 'DEMO' },
    })).toBeNull()
  })

  it('нечисловая квота у демо даёт превью, а не пустую книгу', () => {
    expect(chapterLimitOf({
      authenticated: true,
      isDemoAccount: true,
      quota: { limit: 2, source: 'DEMO' },
    })).toBe(FALLBACK_PREVIEW_CHAPTERS)
  })

  it('мусор вместо числа тоже приравнен к «лимит неизвестен»', () => {
    for (const quota of ['2', NaN, 1.5, -1, [], true]) {
      expect(chapterLimitOf({ authenticated: true, isDemoAccount: false, quota })).toBeNull()
      expect(chapterLimitOf({ authenticated: true, isDemoAccount: true, quota }))
        .toBe(FALLBACK_PREVIEW_CHAPTERS)
    }
  })

  // Тип переименован миграцией V204 (BOOK → PRACTICE_BOOKS). Старое имя
  // эндпоинт квот не разбирает и отвечает ошибкой, а сбой запроса квоты
  // неотличим от «квота не настроена» — то есть промах читался бы как
  // «лимита нет», и демо-аккаунт получал бы книги целиком.
  it('спрашивает у бэкенда тот тип контента, который там есть', () => {
    expect(BOOKS_CONTENT_TYPE).toBe('PRACTICE_BOOKS')
  })
})

describe('идентификатор книги', () => {
  it('пропускает имена выгруженных файлов', () => {
    expect(isValidBookId('alice')).toBe(true)
    expect(isValidBookId('ageofinnocence')).toBe(true)
    expect(isValidBookId('war-and-peace_2')).toBe(true)
  })

  it('не пропускает попытки выйти из каталога книг', () => {
    expect(isValidBookId('../../.env')).toBe(false)
    expect(isValidBookId('alice/../../secret')).toBe(false)
    expect(isValidBookId('/etc/passwd')).toBe(false)
    expect(isValidBookId('')).toBe(false)
    expect(isValidBookId(undefined)).toBe(false)
  })
})
