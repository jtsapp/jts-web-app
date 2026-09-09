import { describe, it, expect } from 'vitest'
import { findCatalogLessonId } from './catalogLessonByUrl.js'

const CATALOG = [
  {
    id: 1,
    code: 'A2',
    units: [
      {
        id: 10,
        lessons: [
          { id: 100, code: 'L01-SELF', fileUrl: 'https://files/a2/lessons/L01.html?mode=self' },
          { id: 101, code: 'L01-1TO1', fileUrl: 'https://files/a2/lessons/L01.html?mode=solo' },
          { id: 102, code: 'L01-GROUP', fileUrl: 'https://files/a2/lessons/L01.html?mode=group' },
        ],
      },
    ],
  },
]

describe('findCatalogLessonId', () => {
  it('находит урок по ссылке на его файл', () => {
    expect(findCatalogLessonId(CATALOG, 'https://files/a2/lessons/L01.html?mode=solo')).toBe(101)
  })

  // Файл у трёх режимов общий, различает их только ?mode= — подменить один
  // другим значит показать ученику формулировки не того формата.
  it('различает режимы одного урока', () => {
    expect(findCatalogLessonId(CATALOG, 'https://files/a2/lessons/L01.html?mode=self')).toBe(100)
    expect(findCatalogLessonId(CATALOG, 'https://files/a2/lessons/L01.html?mode=group')).toBe(102)
  })

  it('якорь в ссылке ничего не меняет', () => {
    expect(findCatalogLessonId(CATALOG, 'https://files/a2/lessons/L01.html?mode=solo#s2')).toBe(101)
  })

  // Материал раздела часто приходит с подписью S3. Сравнивать строки целиком
  // не находило разбор — ученик видел одну «Section 1» вместо шагов урока.
  it('находит урок по подписанной ссылке S3 с тем же mode', () => {
    const signed =
      'https://files/a2/lessons/L01.html?mode=solo&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc'
    expect(findCatalogLessonId(CATALOG, signed)).toBe(101)
  })

  it('не путает режимы, когда подпись стоит первой в query', () => {
    const signed =
      'https://files/a2/lessons/L01.html?X-Amz-Expires=3600&mode=group&X-Amz-Signature=abc'
    expect(findCatalogLessonId(CATALOG, signed)).toBe(102)
  })

  // Уровень, залитый до появления режимов, ссылается на файл без ?mode=.
  it('без режима довольствуется совпадением файла', () => {
    expect(findCatalogLessonId(CATALOG, 'https://files/a2/lessons/L01.html')).toBe(100)
  })

  it('чужой материал остаётся без урока — покажем его как файл', () => {
    expect(findCatalogLessonId(CATALOG, 'https://files/uploads/my-homework.pdf')).toBeNull()
    expect(findCatalogLessonId(CATALOG, '')).toBeNull()
    expect(findCatalogLessonId([], 'https://files/a2/lessons/L01.html')).toBeNull()
  })
})
